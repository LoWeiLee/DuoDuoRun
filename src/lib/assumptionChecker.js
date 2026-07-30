/**
 * 假設前提檢查（Assumption Checker）
 *
 * 給定 analysisId + dataset + settings，回傳一組 check 結果，供 UI 紅綠燈呈現。
 *
 * 每個 check 結構：
 *   {
 *     id: string,
 *     label: string,                          // 已 i18n 過的標題
 *     status: 'ok' | 'warn' | 'fail' | 'info' | 'skip',
 *     detail: string,                         // 已 i18n 過的細節（含具體統計值）
 *   }
 *
 * 設計原則：
 *   - 只覆蓋常見分析的關鍵假設；其他 analysis 回 null（UI 顯示「無自動檢查」）
 *   - 不重複 Result 內已有的檢定（如 ANOVA 的 Levene 在 Result 已報，但這裡仍提前預警）
 *   - 邊界與資料量不足時 → status: 'skip'
 */
import { isMissing } from './variableTypes.js'
import { shapiroWilk } from './stats/normality.js'
import { levene } from './stats/levene.js'
import { fmtNum, fmtP, fillTemplate } from './format.js'

/* ─────────────────────  helpers  ───────────────────── */

function extractNumeric(rows, col) {
  const out = []
  for (const r of rows) {
    if (isMissing(r[col])) continue
    const v = Number(r[col])
    if (Number.isFinite(v)) out.push(v)
  }
  return out
}

function listwiseRows(rows, cols) {
  return rows.filter((r) => cols.every((c) => !isMissing(r[c])))
}

function extractGrouped(rows, depCol, groupCol) {
  const m = new Map()
  for (const r of rows) {
    const dv = r[depCol]
    const g = r[groupCol]
    if (isMissing(dv) || isMissing(g)) continue
    const v = Number(dv)
    if (!Number.isFinite(v)) continue
    const key = String(g)
    if (!m.has(key)) m.set(key, [])
    m.get(key).push(v)
  }
  return m
}

/** 常態性 status：W < 0.90 → fail；p < .05 → warn；其他 ok */
function normalityStatus(sw) {
  if (!sw || !Number.isFinite(sw.W) || !Number.isFinite(sw.p)) return 'skip'
  if (sw.W < 0.90 && sw.p < 0.01) return 'fail'
  if (sw.p < 0.05) return 'warn'
  return 'ok'
}

/** Levene status：p < .01 → fail；p < .05 → warn；其他 ok */
function leveneStatus(lev) {
  if (!lev || !Number.isFinite(lev.p)) return 'skip'
  if (lev.p < 0.01) return 'fail'
  if (lev.p < 0.05) return 'warn'
  return 'ok'
}

/** 樣本量 status：< minHard → fail；< minSoft → warn；其他 ok */
function nStatus(n, minHard, minSoft) {
  if (!Number.isInteger(n)) return 'skip'
  if (n < minHard) return 'fail'
  if (n < minSoft) return 'warn'
  return 'ok'
}

/* ─────────────────────  per-analysis  ───────────────────── */

function checkTTest(rows, settings, t) {
  const c = t.assumpChecks
  const type = settings?.type || 'independent'
  const checks = []

  if (type === 'independent') {
    const { depVar, groupVar } = settings
    if (!depVar || !groupVar) return null
    const groups = extractGrouped(rows, depVar, groupVar)
    const groupArrs = [...groups.entries()].slice(0, 2) // 取前兩組
    const totalN = groupArrs.reduce((s, [, arr]) => s + arr.length, 0)
    checks.push({
      id: 'n', label: c.sampleSize, status: nStatus(totalN, 10, 30),
      detail: fillTemplate(c.sampleSizeDetail, { n: totalN }),
    })
    for (const [name, arr] of groupArrs) {
      if (arr.length < 3) {
        checks.push({
          id: `norm-${name}`, label: fillTemplate(c.normalityGroup, { group: name }),
          status: 'skip', detail: c.tooFewForNormality,
        })
        continue
      }
      const sw = shapiroWilk(arr)
      checks.push({
        id: `norm-${name}`,
        label: fillTemplate(c.normalityGroup, { group: name }),
        status: normalityStatus(sw),
        detail: fillTemplate(c.normalityDetail, { n: arr.length, w: fmtNum(sw.W, 3), p: fmtP(sw.p) }),
      })
    }
    if (groupArrs.length === 2) {
      const lev = levene(groupArrs.map(([, a]) => a))
      checks.push({
        id: 'levene', label: c.varianceHomogeneity, status: leveneStatus(lev),
        // ★ 2026-07-30 紅隊 R66：原本任何 error 都印「組數或樣本不足以檢測」，
        //   而新增的 levene-all-constant 是完全不同的情形（各組皆為常數）。
        detail: lev.error
          ? (t.errors?.stats?.[lev.error] || c.tooFewForLevene)
          : fillTemplate(c.leveneDetail, {
              f: fmtNum(lev.F, 3), df1: lev.df1, df2: lev.df2, p: fmtP(lev.p),
            }),
      })
    }
    return checks
  }

  if (type === 'paired') {
    const { var1, var2 } = settings
    if (!var1 || !var2) return null
    const lwRows = listwiseRows(rows, [var1, var2])
    const diffs = lwRows.map((r) => Number(r[var1]) - Number(r[var2])).filter(Number.isFinite)
    checks.push({
      id: 'n', label: c.sampleSize, status: nStatus(diffs.length, 10, 30),
      detail: fillTemplate(c.sampleSizeDetail, { n: diffs.length }),
    })
    if (diffs.length >= 3) {
      const sw = shapiroWilk(diffs)
      checks.push({
        id: 'norm-diff', label: c.normalityDiff, status: normalityStatus(sw),
        detail: fillTemplate(c.normalityDetail, { n: diffs.length, w: fmtNum(sw.W, 3), p: fmtP(sw.p) }),
      })
    }
    return checks
  }

  if (type === 'oneSample') {
    const { var1 } = settings
    if (!var1) return null
    const arr = extractNumeric(rows, var1)
    checks.push({
      id: 'n', label: c.sampleSize, status: nStatus(arr.length, 10, 30),
      detail: fillTemplate(c.sampleSizeDetail, { n: arr.length }),
    })
    if (arr.length >= 3) {
      const sw = shapiroWilk(arr)
      checks.push({
        id: 'norm', label: c.normality, status: normalityStatus(sw),
        detail: fillTemplate(c.normalityDetail, { n: arr.length, w: fmtNum(sw.W, 3), p: fmtP(sw.p) }),
      })
    }
    return checks
  }
  return null
}

function checkOneWayAnova(rows, settings, t) {
  const c = t.assumpChecks
  const { depVar, factor } = settings
  if (!depVar || !factor) return null
  const checks = []
  const groups = extractGrouped(rows, depVar, factor)
  const arrs = [...groups.entries()]
  const totalN = arrs.reduce((s, [, a]) => s + a.length, 0)
  checks.push({
    id: 'n', label: c.sampleSize, status: nStatus(totalN, arrs.length * 5, arrs.length * 20),
    detail: fillTemplate(c.sampleSizeDetailGroups, { n: totalN, k: arrs.length }),
  })
  for (const [name, arr] of arrs) {
    if (arr.length < 3) {
      checks.push({
        id: `norm-${name}`, label: fillTemplate(c.normalityGroup, { group: name }),
        status: 'skip', detail: c.tooFewForNormality,
      })
      continue
    }
    const sw = shapiroWilk(arr)
    checks.push({
      id: `norm-${name}`,
      label: fillTemplate(c.normalityGroup, { group: name }),
      status: normalityStatus(sw),
      detail: fillTemplate(c.normalityDetail, { n: arr.length, w: fmtNum(sw.W, 3), p: fmtP(sw.p) }),
    })
  }
  if (arrs.length >= 2) {
    const lev = levene(arrs.map(([, a]) => a))
    checks.push({
      id: 'levene', label: c.varianceHomogeneity, status: leveneStatus(lev),
      // ★ R66：同上，區分 levene-all-constant 與樣本不足
      detail: lev.error
        ? (t.errors?.stats?.[lev.error] || c.tooFewForLevene)
        : fillTemplate(c.leveneDetail, {
            f: fmtNum(lev.F, 3), df1: lev.df1, df2: lev.df2, p: fmtP(lev.p),
          }),
    })
  }
  return checks
}

function checkCorrelation(rows, settings, t) {
  const c = t.assumpChecks
  const vars = settings?.selectedVars || []
  if (vars.length < 2) return null
  const checks = []
  const lwRows = listwiseRows(rows, vars)
  checks.push({
    id: 'n', label: c.sampleSize, status: nStatus(lwRows.length, 10, 30),
    detail: fillTemplate(c.sampleSizeDetail, { n: lwRows.length }),
  })
  for (const col of vars) {
    const arr = extractNumeric(rows, col)
    if (arr.length < 3) continue
    const sw = shapiroWilk(arr)
    checks.push({
      id: `norm-${col}`,
      label: fillTemplate(c.normalityVar, { var: col }),
      status: normalityStatus(sw),
      detail: fillTemplate(c.normalityDetail, { n: arr.length, w: fmtNum(sw.W, 3), p: fmtP(sw.p) }),
    })
  }
  // 提示：若任一變項常態違反 → 建議改 Spearman
  return checks
}

function checkSimpleRegression(rows, settings, t) {
  const c = t.assumpChecks
  const { xVar, yVar } = settings
  if (!xVar || !yVar) return null
  const lw = listwiseRows(rows, [xVar, yVar])
  return [{
    id: 'n', label: c.sampleSize, status: nStatus(lw.length, 10, 30),
    detail: fillTemplate(c.sampleSizeDetail, { n: lw.length }),
  }]
}

function checkMultipleRegression(rows, settings, t) {
  const c = t.assumpChecks
  const { yVar, xVars } = settings
  if (!yVar || !xVars || xVars.length === 0) return null
  const cols = [yVar, ...xVars]
  const lw = listwiseRows(rows, cols)
  const recommended = (xVars.length + 1) * 10
  return [{
    id: 'n', label: c.sampleSize,
    status: nStatus(lw.length, xVars.length + 2, recommended),
    detail: fillTemplate(c.sampleSizeDetailRatio, {
      n: lw.length, p: xVars.length, recommended,
    }),
  }]
}

function checkHierReg(rows, settings, t) {
  const c = t.assumpChecks
  const { yVar, blocks } = settings
  if (!yVar || !blocks) return null
  const allXs = blocks.flat()
  if (allXs.length === 0) return null
  const cols = [yVar, ...allXs]
  const lw = listwiseRows(rows, cols)
  const recommended = (allXs.length + 1) * 10
  return [{
    id: 'n', label: c.sampleSize,
    status: nStatus(lw.length, allXs.length + 2, recommended),
    detail: fillTemplate(c.sampleSizeDetailRatio, {
      n: lw.length, p: allXs.length, recommended,
    }),
  }]
}

/* ─────────────────────  dispatcher  ───────────────────── */

export function runAssumptionChecks(analysisId, dataset, settings, t) {
  if (!dataset || !settings) return null
  const rows = dataset.rows || []
  switch (analysisId) {
    case 't-test':                  return checkTTest(rows, settings, t)
    case 'one-way-anova':           return checkOneWayAnova(rows, settings, t)
    case 'correlation':             return checkCorrelation(rows, settings, t)
    case 'simple-regression':       return checkSimpleRegression(rows, settings, t)
    case 'multiple-regression':     return checkMultipleRegression(rows, settings, t)
    case 'hierarchical-regression': return checkHierReg(rows, settings, t)
    default:                        return null
  }
}
