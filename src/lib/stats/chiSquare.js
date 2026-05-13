/**
 * 卡方檢定（獨立性 / 適合度）+ 列聯表 + Cramer's V
 *
 * 對外 API：
 *   contingencyTable(rows, rowVar, colVar)
 *     → { rowLevels, colLevels, observed, rowTotals, colTotals, total, expected, n }
 *
 *   chiSquareIndependence(table)
 *     → { chi2, df, p, cramerV, chi2Yates, pYates, yatesApplied, suggestFisher,
 *         n, observed, expected, stdResiduals, minExpected, lowExpectedCells, totalCells }
 *     2x2 表會額外計算 Yates 連續性校正 chi²；
 *     2x2 且任一期望次數 <5 時 suggestFisher=true，UI 應建議改用 Fisher exact。
 *
 *   chiSquareGoodnessOfFit(observed, expected)
 *     → { chi2, df, p, n, observed, expected, stdResiduals }
 *
 * 公式：
 *   χ² = Σ ((O - E)² / E)
 *
 *   獨立性：
 *     E_ij = (row_i 總和 × col_j 總和) / N
 *     df = (#rows - 1) × (#cols - 1)
 *     Cramer's V = √(χ² / (N · min(r-1, c-1)))
 *     Cohen 慣例（df_min = min(r-1, c-1)）：
 *       V < 0.1   微弱
 *       V < 0.3   小  (df_min=1) / 中  (df_min=2)
 *       V < 0.5   中  (df_min=1) / 大  (df_min=2)
 *       這裡採用基本 Cohen 標準：< 0.10 微弱 / < 0.30 弱 / < 0.50 中 / >= 0.50 強
 *
 *   適合度：
 *     E_i = N · p_i（給定理論機率 p）；若未指定，預設均勻 1/k
 *     df = k - 1
 *
 *   標準化殘差（Pearson residual）：
 *     z_ij = (O_ij - E_ij) / √E_ij
 *     |z| ≥ 1.96 約對應雙尾 p < .05
 *
 * 假設前提：期望次數 ≥ 5 在 ≥ 80% 的 cell（Cochran's rule）。
 */
import { isMissing } from '../variableTypes.js'
import { pChiSq } from './pvalue.js'

/** 整理列聯表 */
export function contingencyTable(rows, rowVar, colVar) {
  // 收集每個 row/col 變數的所有出現值，保持出現順序
  const rowLevels = []
  const colLevels = []
  const rowSet = new Set()
  const colSet = new Set()
  const counts = new Map() // key: "rv__cv"

  for (const r of rows) {
    const rv = r[rowVar]
    const cv = r[colVar]
    if (isMissing(rv) || isMissing(cv)) continue
    const rk = String(rv)
    const ck = String(cv)
    if (!rowSet.has(rk)) { rowSet.add(rk); rowLevels.push(rk) }
    if (!colSet.has(ck)) { colSet.add(ck); colLevels.push(ck) }
    const key = `${rk}__${ck}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const R = rowLevels.length
  const C = colLevels.length
  const observed = []
  const rowTotals = new Array(R).fill(0)
  const colTotals = new Array(C).fill(0)
  let total = 0

  for (let i = 0; i < R; i++) {
    const row = new Array(C).fill(0)
    for (let j = 0; j < C; j++) {
      const v = counts.get(`${rowLevels[i]}__${colLevels[j]}`) || 0
      row[j] = v
      rowTotals[i] += v
      colTotals[j] += v
      total += v
    }
    observed.push(row)
  }

  // 期望次數 E_ij = (row_i 總和 × col_j 總和) / N
  const expected = []
  for (let i = 0; i < R; i++) {
    const row = new Array(C)
    for (let j = 0; j < C; j++) {
      row[j] = total > 0 ? (rowTotals[i] * colTotals[j]) / total : 0
    }
    expected.push(row)
  }

  return {
    rowLevels, colLevels,
    observed, rowTotals, colTotals,
    total, expected,
    n: total,
  }
}

/** 卡方獨立性檢定 */
export function chiSquareIndependence(rows, rowVar, colVar) {
  const t = contingencyTable(rows, rowVar, colVar)
  const R = t.rowLevels.length
  const C = t.colLevels.length
  if (R < 2 || C < 2) return { error: 'need->=2x2' }
  if (t.n === 0) return { error: 'no-data' }

  const df = (R - 1) * (C - 1)
  let chi2 = 0
  let chi2Yates = 0  // 僅 2x2 有意義
  const stdResiduals = []
  let minExpected = Infinity
  let lowExpectedCells = 0
  const isTwoByTwo = R === 2 && C === 2
  for (let i = 0; i < R; i++) {
    const row = []
    for (let j = 0; j < C; j++) {
      const O = t.observed[i][j]
      const E = t.expected[i][j]
      if (E > 0) {
        chi2 += ((O - E) * (O - E)) / E
        if (isTwoByTwo) {
          // Yates 連續性校正：(max(0, |O-E| - 0.5))² / E
          const d = Math.max(0, Math.abs(O - E) - 0.5)
          chi2Yates += (d * d) / E
        }
      }
      const z = E > 0 ? (O - E) / Math.sqrt(E) : NaN
      row.push(z)
      if (E < minExpected) minExpected = E
      if (E < 5) lowExpectedCells += 1
    }
    stdResiduals.push(row)
  }
  const totalCells = R * C
  const p = pChiSq(chi2, df)
  const pYates = isTwoByTwo ? pChiSq(chi2Yates, df) : NaN
  // Cramer's V（採未校正 chi2，與 SPSS 一致）
  const dfMin = Math.min(R - 1, C - 1)
  const cramerV = t.n > 0 && dfMin > 0 ? Math.sqrt(chi2 / (t.n * dfMin)) : NaN
  // 若 2x2 任一期望次數 < 5，建議改用 Fisher exact
  const suggestFisher = isTwoByTwo && lowExpectedCells > 0

  return {
    chi2, df, p, cramerV,
    chi2Yates: isTwoByTwo ? chi2Yates : NaN,
    pYates,
    yatesApplied: isTwoByTwo,
    suggestFisher,
    n: t.n,
    rowLevels: t.rowLevels,
    colLevels: t.colLevels,
    observed: t.observed,
    expected: t.expected,
    stdResiduals,
    rowTotals: t.rowTotals,
    colTotals: t.colTotals,
    minExpected,
    lowExpectedCells,
    totalCells,
  }
}

/**
 * 卡方適合度檢定
 *
 * @param {object[]} rows 資料列
 * @param {string} colVar 類別變項
 * @param {Record<string,number>=} expectedProps 給定理論機率（總和應為 1）；省略則預設均勻
 */
export function chiSquareGoodnessOfFit(rows, colVar, expectedProps) {
  // 計算觀察次數
  const obsMap = new Map()
  const levels = []
  for (const r of rows) {
    const v = r[colVar]
    if (isMissing(v)) continue
    const k = String(v)
    if (!obsMap.has(k)) { obsMap.set(k, 0); levels.push(k) }
    obsMap.set(k, obsMap.get(k) + 1)
  }
  const k = levels.length
  if (k < 2) return { error: 'need->=2-categories' }
  const n = Array.from(obsMap.values()).reduce((s, v) => s + v, 0)
  if (n === 0) return { error: 'no-data' }

  // 處理期望機率
  const probs = new Array(k)
  if (expectedProps && Object.keys(expectedProps).length > 0) {
    for (let i = 0; i < k; i++) {
      const p = expectedProps[levels[i]]
      probs[i] = typeof p === 'number' && Number.isFinite(p) && p >= 0 ? p : NaN
    }
  } else {
    for (let i = 0; i < k; i++) probs[i] = 1 / k
  }
  const propSum = probs.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)
  if (Math.abs(propSum - 1) > 1e-6) {
    // 自動 normalize
    for (let i = 0; i < k; i++) {
      probs[i] = Number.isFinite(probs[i]) && propSum > 0 ? probs[i] / propSum : NaN
    }
  }

  const observed = levels.map((lv) => obsMap.get(lv))
  const expected = probs.map((p) => p * n)

  let chi2 = 0
  const stdResiduals = []
  let minExpected = Infinity
  let lowExpectedCells = 0
  for (let i = 0; i < k; i++) {
    const O = observed[i]
    const E = expected[i]
    if (E > 0) chi2 += ((O - E) * (O - E)) / E
    stdResiduals.push(E > 0 ? (O - E) / Math.sqrt(E) : NaN)
    if (E < minExpected) minExpected = E
    if (E < 5) lowExpectedCells += 1
  }
  const df = k - 1
  const p = pChiSq(chi2, df)

  return {
    chi2, df, p,
    n,
    levels,
    observed,
    expected,
    probs,
    stdResiduals,
    minExpected,
    lowExpectedCells,
    totalCells: k,
  }
}
