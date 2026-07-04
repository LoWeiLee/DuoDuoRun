/**
 * PLS-SEM 核心引擎（Wave 1：反映型 Mode A ＋ path weighting scheme）
 *
 * 對外 API（純函式、無 UI 依賴，Node/Worker 雙環境同構）：
 *   PLS_SCHEMA_VERSION            — 模型 JSON schema 版本（目前 1）
 *   validatePLSModel(model)       — schema 驗證器 → { ok, model } | { ok:false, errors[] }
 *   runPLS(rows, model, options)  — 完整估計 → 結果物件 | { error, message }
 *   bootstrapPLS(rows, model, options) — bootstrap 重抽樣 → 摘要物件 | { error, message }
 *
 * 模型 JSON 格式見 docs/pls-model-schema.md。
 *
 * 演算法（Lohmöller 1989；對齊 SmartPLS 4 預設）：
 *   1. 指標 z-score 標準化（sample SD, n−1，與 descriptive.js 慣例一致）
 *   2. 外部權重初始化為 1 → 迭代：
 *      a. LV 分數 = 標準化(Σ w_h·z_h)（單位變異，ddof=1）
 *      b. 內部權重（path scheme）：前置 LV 用 OLS 迴歸係數、後繼 LV 用相關係數
 *      c. 內部代理 Z_j = Σ e_jk·Y_k
 *      d. Mode A（correlation weights）：w_h = corr(z_h, Z_j)
 *      e. 權重重新縮放使 LV 分數單位變異
 *   3. 收斂準則：外部權重最大絕對變化 < tolerance（預設 1e-7），
 *      最大迭代 300 次（SmartPLS 4 預設 stop criterion 10^-7 / 300）
 *   4. 符號定向：每個 LV 使其與所屬指標的相關總和為正（dominant orientation）
 *
 * 統計量公式出處：
 *   - 路徑係數/R²：LV 分數相關矩陣的 OLS（matrix.js inverse）
 *   - f²（Cohen 1988）：(R²_included − R²_excluded) / (1 − R²_included)
 *   - 內部 VIF：前置 LV 相關矩陣反矩陣的對角線
 *   - Cronbach's α：以指標「相關矩陣」計算（standardized alpha）——
 *     因 PLS 對標準化資料運算，此即 SmartPLS 報表的 α；
 *     注意與 alpha.js（原始分數共變異數版，對齊 SPSS）在原始資料上數值不同
 *   - rho_A（Dijkstra & Henseler 2015, Psychometrika 80(2)，式 (12)）：
 *     ρ_A = (ŵ'ŵ)² · ŵ'(S − diag S)ŵ / ŵ'(ŵŵ' − diag ŵŵ')ŵ，
 *     ŵ 正規化使 ŵ'Sŵ = 1（LV 分數單位變異）；單指標 LV 定義為 1
 *   - CR / rho_c（Jöreskog 1971）：(Σl)² / [(Σl)² + Σ(1−l²)]
 *   - AVE（Fornell & Larcker 1981）：mean(l²)
 *   - HTMT（Henseler, Ringle & Sarstedt 2015, JAMS 43）：
 *     異質-異法相關平均 / √(兩構念單質相關平均之幾何平均)；單指標 LV 為 null
 *
 * Bootstrap（預設 5,000 次、percentile CI、確定性 Mulberry32 PRNG）：
 *   - 逐次以放回抽樣重抽 n 列原始資料、完整重跑估計（含重新標準化）
 *   - 符號校正 signCorrection: 'construct'（預設）——
 *     SmartPLS 官方文件在本沙盒不可達（網路白名單），無法查證其預設
 *     individual sign change 的精確定義；依任務指示採用備援方案：
 *     「每次重抽中，若某 LV 的 loadings 與原始估計 loadings 的內積為負，
 *     則翻轉該 LV 的方向（loadings、weights、及所有觸及該 LV 的路徑係數）」。
 *     此即文獻中的 construct-level sign correction；'none' 可關閉。
 *   - SE = 重抽估計值的樣本標準差（ddof=1）；t = original/SE；
 *     p = 雙尾 t 分布（df = 有效重抽數 − 1，B=5000 時 ≈ 常態）；
 *     percentile CI 用線性內插分位數（R type 7）
 *   - 不收斂或退化（零變異）的重抽樣本剔除並計數（nSkipped）
 */
import { inverse } from './matrix.js'
import { pT } from './pvalue.js'
import { isMissing } from '../variableTypes.js'

export const PLS_SCHEMA_VERSION = 1

/* ─────────────────────────  PRNG（同 cluster.js 慣例）  ───────────────────────── */

function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─────────────────────────  基本數值工具  ───────────────────────── */

function meanOf(a) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]
  return s / a.length
}

function sdOf(a) {
  const m = meanOf(a)
  let ss = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - m; ss += d * d }
  return Math.sqrt(ss / (a.length - 1))
}

/** 兩個「已置中」向量的 Pearson 相關（呼叫者保證 mean=0 可省置中；此處通用版自行置中） */
function corrOf(x, y) {
  const n = x.length
  const mx = meanOf(x)
  const my = meanOf(y)
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy
  }
  const denom = Math.sqrt(sxx * syy)
  return denom === 0 ? NaN : sxy / denom
}

/** 分位數（線性內插，R type 7） */
function quantile(sorted, p) {
  const m = sorted.length
  if (m === 0) return NaN
  const h = (m - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

/* ─────────────────────────  模型驗證器  ───────────────────────── */

/**
 * 驗證模型 JSON（規則見 docs/pls-model-schema.md 第 2 節）。
 * @returns {{ok:true, model:object} | {ok:false, errors:string[]}}
 */
export function validatePLSModel(model) {
  const errors = []
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    return { ok: false, errors: ['模型必須是物件（見 docs/pls-model-schema.md）'] }
  }
  const ver = model.schemaVersion
  if (!Number.isInteger(ver) || ver < 1) {
    errors.push('schemaVersion 必須是正整數（目前版本為 1）')
  } else if (ver > PLS_SCHEMA_VERSION) {
    errors.push(`schemaVersion ${ver} 超過本引擎支援的版本（${PLS_SCHEMA_VERSION}）`)
  }

  const lvs = model.latentVariables
  if (!Array.isArray(lvs) || lvs.length < 2) {
    errors.push('latentVariables 必須是陣列且至少包含 2 個潛在變數')
    return { ok: false, errors }
  }

  const lvNames = new Set()
  const indicatorOwner = new Map() // indicator → lv name
  const normalizedLVs = []
  for (let i = 0; i < lvs.length; i++) {
    const lv = lvs[i]
    if (!lv || typeof lv !== 'object') {
      errors.push(`第 ${i + 1} 個潛在變數必須是物件`)
      continue
    }
    const name = lv.name
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push(`第 ${i + 1} 個潛在變數缺少有效名稱`)
      continue
    }
    if (lvNames.has(name)) errors.push(`潛在變數名稱重複：「${name}」`)
    lvNames.add(name)

    if (!Array.isArray(lv.indicators) || lv.indicators.length < 1) {
      errors.push(`潛在變數「${name}」的 indicators 必須是非空陣列`)
      continue
    }
    const seenInBlock = new Set()
    for (const ind of lv.indicators) {
      if (typeof ind !== 'string' || ind.trim() === '') {
        errors.push(`潛在變數「${name}」含無效指標名稱`)
        continue
      }
      if (seenInBlock.has(ind)) errors.push(`指標「${ind}」在潛在變數「${name}」內重複`)
      seenInBlock.add(ind)
      if (indicatorOwner.has(ind) && indicatorOwner.get(ind) !== name) {
        errors.push(`指標「${ind}」重複掛載於「${indicatorOwner.get(ind)}」與「${name}」（一個指標只能屬於一個潛在變數）`)
      }
      indicatorOwner.set(ind, name)
    }

    const mode = lv.mode ?? 'reflective'
    if (mode !== 'reflective' && mode !== 'formative') {
      errors.push(`潛在變數「${name}」的 mode 必須是 'reflective' 或 'formative'，收到「${lv.mode}」`)
    }
    normalizedLVs.push({ name, indicators: [...lv.indicators], mode })
  }

  for (const name of lvNames) {
    if (indicatorOwner.has(name)) {
      errors.push(`名稱「${name}」同時是潛在變數與指標，會造成報表歧義`)
    }
  }

  const paths = model.paths
  if (!Array.isArray(paths) || paths.length < 1) {
    errors.push('paths 必須是陣列且至少包含 1 條路徑')
    return { ok: false, errors }
  }
  const pathKeys = new Set()
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i]
    if (!p || typeof p.from !== 'string' || typeof p.to !== 'string') {
      errors.push(`第 ${i + 1} 條路徑必須含 from 與 to（字串）`)
      continue
    }
    if (!lvNames.has(p.from)) errors.push(`路徑 from「${p.from}」不是已宣告的潛在變數`)
    if (!lvNames.has(p.to)) errors.push(`路徑 to「${p.to}」不是已宣告的潛在變數`)
    if (p.from === p.to) errors.push(`路徑「${p.from} → ${p.to}」是自環，不允許`)
    const key = `${p.from}→${p.to}`
    if (pathKeys.has(key)) errors.push(`路徑「${key}」重複宣告`)
    pathKeys.add(key)
  }

  // 無環檢查（Kahn 拓撲排序）
  if (errors.length === 0) {
    const indeg = new Map([...lvNames].map((n) => [n, 0]))
    const adj = new Map([...lvNames].map((n) => [n, []]))
    for (const p of paths) {
      adj.get(p.from).push(p.to)
      indeg.set(p.to, indeg.get(p.to) + 1)
    }
    const queue = [...lvNames].filter((n) => indeg.get(n) === 0)
    let visited = 0
    while (queue.length) {
      const u = queue.shift()
      visited++
      for (const v of adj.get(u)) {
        indeg.set(v, indeg.get(v) - 1)
        if (indeg.get(v) === 0) queue.push(v)
      }
    }
    if (visited !== lvNames.size) {
      errors.push('結構模型含循環路徑（PLS-SEM 要求遞迴模型，路徑圖必須無環）')
    }
    // 孤立 LV
    const connected = new Set()
    for (const p of paths) { connected.add(p.from); connected.add(p.to) }
    for (const n of lvNames) {
      if (!connected.has(n)) errors.push(`潛在變數「${n}」未出現在任何路徑中（孤立 LV 無法估計內部權重）`)
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    model: { schemaVersion: ver, latentVariables: normalizedLVs, paths: paths.map((p) => ({ from: p.from, to: p.to })) },
  }
}

/* ─────────────────────────  資料前處理  ───────────────────────── */

/**
 * 從 rows 抽出指標矩陣（列 × 指標），處理缺失值。
 * @returns {{ X:number[][], n:number, nDropped:number } | { error, message }}
 */
function extractMatrix(rows, indicators, missing) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'no-data', message: '沒有資料列' }
  }
  const p = indicators.length
  const raw = []
  for (const r of rows) {
    const vec = new Array(p)
    for (let j = 0; j < p; j++) {
      const v = r?.[indicators[j]]
      vec[j] = isMissing(v) ? NaN : Number(v)
      if (!isMissing(v) && !Number.isFinite(vec[j])) vec[j] = NaN
    }
    raw.push(vec)
  }
  // 欄位存在性：某指標全缺 → 視為欄位不存在
  for (let j = 0; j < p; j++) {
    if (raw.every((vec) => Number.isNaN(vec[j]))) {
      return { error: 'missing-column', message: `資料中找不到可用的指標欄位「${indicators[j]}」（全部缺失或非數值）` }
    }
  }
  let X
  let nDropped = 0
  if (missing === 'mean') {
    const means = new Array(p)
    for (let j = 0; j < p; j++) {
      let s = 0, c = 0
      for (const vec of raw) if (!Number.isNaN(vec[j])) { s += vec[j]; c++ }
      means[j] = s / c
    }
    X = raw.map((vec) => vec.map((v, j) => (Number.isNaN(v) ? means[j] : v)))
  } else { // casewise（預設）
    X = raw.filter((vec) => vec.every((v) => !Number.isNaN(v)))
    nDropped = raw.length - X.length
  }
  return { X, n: X.length, nDropped }
}

/** 逐欄 z-score（ddof=1）。零變異回傳該欄 index。 */
function standardizeColumns(X) {
  const n = X.length
  const p = X[0].length
  const cols = []
  for (let j = 0; j < p; j++) {
    const col = new Float64Array(n)
    for (let i = 0; i < n; i++) col[i] = X[i][j]
    const m = meanOf(col)
    let ss = 0
    for (let i = 0; i < n; i++) { const d = col[i] - m; ss += d * d }
    const s = Math.sqrt(ss / (n - 1))
    if (!(s > 0)) return { zeroVarIndex: j }
    for (let i = 0; i < n; i++) col[i] = (col[i] - m) / s
    cols.push(col)
  }
  return { cols }
}

/* ─────────────────────────  核心迭代估計  ───────────────────────── */

/**
 * 對「已標準化欄位」執行 PLS 迭代（Mode A、path scheme）。
 * spec：{ blocks: number[][]（每個 LV 的欄位索引）, pred: number[][]（每個 LV 的前置 LV 索引）,
 *         succ: number[][], tolerance, maxIterations }
 * @returns { weights: Float64Array[], scores: Float64Array[], iterations, converged } | null（數值失敗）
 */
function estimateCore(cols, n, spec) {
  const { blocks, pred, succ, tolerance, maxIterations } = spec
  const L = blocks.length

  // 權重初始化為 1，並縮放為單位變異分數
  let W = blocks.map((b) => Float64Array.from({ length: b.length }, () => 1))
  const Y = blocks.map(() => new Float64Array(n))

  const computeScores = () => {
    for (let j = 0; j < L; j++) {
      const b = blocks[j]
      const y = Y[j]
      y.fill(0)
      for (let h = 0; h < b.length; h++) {
        const z = cols[b[h]]
        const w = W[j][h]
        for (let i = 0; i < n; i++) y[i] += w * z[i]
      }
      const s = sdOf(y)
      if (!(s > 0) || !Number.isFinite(s)) return false
      for (let i = 0; i < n; i++) y[i] /= s
      for (let h = 0; h < b.length; h++) W[j][h] /= s
    }
    return true
  }
  if (!computeScores()) return null

  let iterations = 0
  let converged = false
  const Zin = blocks.map(() => new Float64Array(n))

  while (iterations < maxIterations) {
    iterations++
    // 內部權重（path scheme）
    for (let j = 0; j < L; j++) {
      const zj = Zin[j]
      zj.fill(0)
      // 前置 LV：OLS 迴歸係數
      const P = pred[j]
      if (P.length > 0) {
        const Rpp = P.map((a) => P.map((b) => corrOf(Y[a], Y[b])))
        const rpy = P.map((a) => corrOf(Y[a], Y[j]))
        let bcoef
        if (P.length === 1) {
          bcoef = [rpy[0]]
        } else {
          const Rinv = inverse(Rpp)
          if (!Rinv) return null
          bcoef = Rinv.map((row) => row.reduce((s, v, k) => s + v * rpy[k], 0))
        }
        for (let k = 0; k < P.length; k++) {
          const yk = Y[P[k]]
          const e = bcoef[k]
          for (let i = 0; i < n; i++) zj[i] += e * yk[i]
        }
      }
      // 後繼 LV：相關係數
      for (const sIdx of succ[j]) {
        const e = corrOf(Y[j], Y[sIdx])
        const ys = Y[sIdx]
        for (let i = 0; i < n; i++) zj[i] += e * ys[i]
      }
    }
    // Mode A 外部權重：w_h = corr(z_h, Z_j)，再縮放為單位變異
    const Wnew = []
    for (let j = 0; j < L; j++) {
      const b = blocks[j]
      const w = new Float64Array(b.length)
      for (let h = 0; h < b.length; h++) w[h] = corrOf(cols[b[h]], Zin[j])
      // 縮放：Var(Σ w z) = 1
      const y = Y[j]
      y.fill(0)
      for (let h = 0; h < b.length; h++) {
        const z = cols[b[h]]
        for (let i = 0; i < n; i++) y[i] += w[h] * z[i]
      }
      const s = sdOf(y)
      if (!(s > 0) || !Number.isFinite(s)) return null
      for (let h = 0; h < b.length; h++) w[h] /= s
      for (let i = 0; i < n; i++) y[i] /= s
      Wnew.push(w)
    }
    // 收斂：外部權重最大絕對變化
    let maxDiff = 0
    for (let j = 0; j < L; j++) {
      for (let h = 0; h < W[j].length; h++) {
        const d = Math.abs(Wnew[j][h] - W[j][h])
        if (d > maxDiff) maxDiff = d
      }
    }
    W = Wnew
    if (maxDiff < tolerance) { converged = true; break }
  }

  // 符號定向：每個 LV 與所屬指標相關總和為正
  for (let j = 0; j < L; j++) {
    let s = 0
    for (const h of blocks[j]) s += corrOf(cols[h], Y[j])
    if (s < 0) {
      for (let i = 0; i < n; i++) Y[j][i] = -Y[j][i]
      for (let h = 0; h < W[j].length; h++) W[j][h] = -W[j][h]
    }
  }

  return { weights: W, scores: Y, iterations, converged }
}

/* ─────────────────────────  統計量  ───────────────────────── */

/** 由 LV 分數解結構模型：路徑係數、R²、adjR²、f²、內部 VIF */
function structuralModel(scores, pred, lvNames, n) {
  const L = lvNames.length
  const lvCorr = []
  for (let a = 0; a < L; a++) {
    lvCorr.push(new Array(L))
    for (let b = 0; b < L; b++) lvCorr[a][b] = a === b ? 1 : corrOf(scores[a], scores[b])
  }

  const regress = (P, j) => { // 回傳 { coefs, r2 }；P 為前置索引陣列
    if (P.length === 0) return { coefs: [], r2: 0 }
    const Rpp = P.map((a) => P.map((b) => lvCorr[a][b]))
    const rpy = P.map((a) => lvCorr[a][j])
    if (P.length === 1) return { coefs: [rpy[0]], r2: rpy[0] * rpy[0] }
    const Rinv = inverse(Rpp)
    if (!Rinv) return null
    const coefs = Rinv.map((row) => row.reduce((s, v, k) => s + v * rpy[k], 0))
    const r2 = coefs.reduce((s, b, k) => s + b * rpy[k], 0)
    return { coefs, r2 }
  }

  const pathCoefficients = []
  const structural = []
  for (let j = 0; j < L; j++) {
    const P = pred[j]
    if (P.length === 0) continue
    const full = regress(P, j)
    if (!full) return null
    const k = P.length
    const adjR2 = 1 - ((1 - full.r2) * (n - 1)) / (n - k - 1)
    // 內部 VIF：前置 LV 相關矩陣反矩陣對角線
    let vifs
    if (k === 1) {
      vifs = [1]
    } else {
      const Rpp = P.map((a) => P.map((b) => lvCorr[a][b]))
      const Rinv = inverse(Rpp)
      if (!Rinv) return null
      vifs = Rinv.map((row, i) => row[i])
    }
    const predictors = P.map((a, idx) => {
      // f²：移除該前置 LV 後的 R²
      const rest = P.filter((_, q) => q !== idx)
      const reduced = regress(rest, j)
      if (!reduced) return null
      const denom = 1 - full.r2
      const f2 = denom > 1e-12 ? (full.r2 - reduced.r2) / denom : null
      return { from: lvNames[a], coef: full.coefs[idx], vif: vifs[idx], f2 }
    })
    if (predictors.some((q) => q === null)) return null
    for (const q of predictors) pathCoefficients.push({ from: q.from, to: lvNames[j], coef: q.coef })
    structural.push({ lv: lvNames[j], r2: full.r2, adjR2, predictors })
  }
  return { pathCoefficients, structural, lvCorr }
}

/** 區塊信效度：α（標準化）、rho_A、rho_c、AVE */
function blockReliability(blockIdx, weights, loadings, indCorr) {
  const k = blockIdx.length
  if (k === 1) return { alpha: 1, rhoA: 1, rhoC: 1, ave: 1 }
  // 區塊相關子矩陣
  const S = blockIdx.map((a) => blockIdx.map((b) => indCorr[a][b]))
  // 標準化 α
  let sumR = 0
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) sumR += S[a][b]
  const alpha = (k / (k - 1)) * (1 - k / sumR)
  // rho_A（Dijkstra-Henseler 2015）：w 正規化使 w'Sw = 1
  let wSw = 0
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) wSw += weights[a] * S[a][b] * weights[b]
  const w = weights.map((v) => v / Math.sqrt(wSw))
  let ww = 0
  for (let a = 0; a < k; a++) ww += w[a] * w[a]
  let num = 0, den = 0
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      if (a === b) continue
      num += w[a] * S[a][b] * w[b]
      den += w[a] * w[a] * w[b] * w[b]
    }
  }
  const rhoA = den > 1e-12 ? (ww * ww * num) / den : 1
  // rho_c 與 AVE
  const sumL = loadings.reduce((s, l) => s + l, 0)
  const sumL2 = loadings.reduce((s, l) => s + l * l, 0)
  const sumErr = loadings.reduce((s, l) => s + (1 - l * l), 0)
  const rhoC = (sumL * sumL) / (sumL * sumL + sumErr)
  const ave = sumL2 / k
  return { alpha, rhoA, rhoC, ave }
}

/** HTMT 矩陣（Henseler et al. 2015）；單指標 LV 的配對為 null */
function htmtMatrix(blocks, indCorr, L) {
  const monoMean = blocks.map((b) => {
    const k = b.length
    if (k < 2) return null
    let s = 0
    for (let a = 0; a < k; a++) for (let c = a + 1; c < k; c++) s += indCorr[b[a]][b[c]]
    return s / (k * (k - 1) / 2)
  })
  const M = []
  for (let a = 0; a < L; a++) {
    M.push(new Array(L).fill(null))
    for (let b = 0; b < L; b++) {
      if (a === b) continue
      if (monoMean[a] === null || monoMean[b] === null) continue
      let s = 0
      for (const g of blocks[a]) for (const h of blocks[b]) s += indCorr[g][h]
      const hetero = s / (blocks[a].length * blocks[b].length)
      const denom = Math.sqrt(monoMean[a] * monoMean[b])
      M[a][b] = Number.isFinite(denom) && denom > 0 ? hetero / denom : null
    }
  }
  return M
}

/* ─────────────────────────  模型規格前處理（共用）  ───────────────────────── */

function buildSpec(model, options) {
  const v = validatePLSModel(model)
  if (!v.ok) return { error: 'invalid-model', message: v.errors.join('；'), errors: v.errors }
  const m = v.model

  for (const lv of m.latentVariables) {
    if (lv.mode === 'formative') {
      return {
        error: 'formative-not-supported',
        message: `潛在變數「${lv.name}」宣告為形成型（formative / Mode B）——W1 引擎僅支援反映型（reflective / Mode A），形成型將於 Wave 3 開通`,
      }
    }
  }
  const scheme = options.scheme ?? 'path'
  if (scheme !== 'path') {
    return { error: 'scheme-not-supported', message: `W1 僅支援 path weighting scheme，收到「${scheme}」（factorial/centroid 將於 Wave 3 開通）` }
  }

  const lvNames = m.latentVariables.map((l) => l.name)
  const indicators = []
  const blocks = []
  for (const lv of m.latentVariables) {
    const idx = []
    for (const ind of lv.indicators) {
      idx.push(indicators.length)
      indicators.push(ind)
    }
    blocks.push(idx)
  }
  const L = lvNames.length
  const pred = Array.from({ length: L }, () => [])
  const succ = Array.from({ length: L }, () => [])
  for (const p of m.paths) {
    const a = lvNames.indexOf(p.from)
    const b = lvNames.indexOf(p.to)
    pred[b].push(a)
    succ[a].push(b)
  }
  return {
    model: m, lvNames, indicators, blocks, pred, succ,
    scheme,
    tolerance: options.tolerance ?? 1e-7,
    maxIterations: options.maxIterations ?? 300,
    missing: options.missing ?? 'casewise',
  }
}

/* ─────────────────────────  主 API：runPLS  ───────────────────────── */

/**
 * @param {object[]} rows  資料（物件陣列，欄位名 → 值）
 * @param {object} model   模型 JSON（docs/pls-model-schema.md）
 * @param {object} options { scheme, tolerance, maxIterations, missing }
 */
export function runPLS(rows, model, options = {}) {
  const spec = buildSpec(model, options)
  if (spec.error) return spec

  const ext = extractMatrix(rows, spec.indicators, spec.missing)
  if (ext.error) return ext
  const { X, n, nDropped } = ext
  if (n < 5) return { error: 'too-few-cases', message: `缺失值處理後樣本數只剩 ${n} 筆（至少需要 5 筆）` }

  const std = standardizeColumns(X)
  if (std.zeroVarIndex !== undefined) {
    return { error: 'zero-variance', message: `指標「${spec.indicators[std.zeroVarIndex]}」變異數為零，無法標準化` }
  }
  const cols = std.cols

  const est = estimateCore(cols, n, spec)
  if (!est) return { error: 'estimation-failed', message: 'PLS 迭代過程出現數值退化（零變異 LV 分數或奇異矩陣），請檢查指標間是否極度共線' }
  if (!est.converged) {
    return { error: 'not-converged', message: `PLS 迭代在 ${spec.maxIterations} 次內未收斂（準則 ${spec.tolerance}），不回傳半成品結果；請檢查資料品質或模型設定` }
  }

  const warnings = []
  if (n < 30) warnings.push(`樣本數偏低（n = ${n}），PLS 估計與 bootstrap 推論的穩定性有限`)
  if (nDropped > 0) warnings.push(`casewise deletion 剔除 ${nDropped} 筆含缺失值的資料列`)

  const { weights, scores } = est
  const L = spec.lvNames.length
  const p = spec.indicators.length

  // 指標相關矩陣（供信效度、HTMT）
  const indCorr = []
  for (let a = 0; a < p; a++) {
    indCorr.push(new Array(p))
    for (let b = 0; b < p; b++) indCorr[a][b] = a === b ? 1 : corrOf(cols[a], cols[b])
  }

  // Outer loadings / cross-loadings
  const outerLoadings = []
  const outerWeights = []
  const crossLoadings = []
  const loadingsByLV = spec.blocks.map(() => [])
  for (let j = 0; j < L; j++) {
    for (let h = 0; h < spec.blocks[j].length; h++) {
      const colIdx = spec.blocks[j][h]
      const loading = corrOf(cols[colIdx], scores[j])
      outerLoadings.push({ lv: spec.lvNames[j], indicator: spec.indicators[colIdx], loading })
      outerWeights.push({ lv: spec.lvNames[j], indicator: spec.indicators[colIdx], weight: weights[j][h] })
      loadingsByLV[j].push(loading)
    }
  }
  for (let a = 0; a < p; a++) {
    const ownLv = spec.lvNames[spec.blocks.findIndex((b) => b.includes(a))]
    const values = {}
    for (let j = 0; j < L; j++) values[spec.lvNames[j]] = corrOf(cols[a], scores[j])
    crossLoadings.push({ indicator: spec.indicators[a], ownLv, values })
  }

  // 結構模型
  const sm = structuralModel(scores, spec.pred, spec.lvNames, n)
  if (!sm) return { error: 'estimation-failed', message: '結構模型求解失敗（LV 分數相關矩陣奇異），請檢查潛在變數間是否極度共線' }

  // 信效度
  const reliability = spec.blocks.map((b, j) => ({
    lv: spec.lvNames[j],
    ...blockReliability(b, Array.from(weights[j]), loadingsByLV[j], indCorr),
  }))

  // Fornell-Larcker：對角線 √AVE、非對角線 LV 相關
  const fornellLarcker = sm.lvCorr.map((row, a) =>
    row.map((v, b) => (a === b ? Math.sqrt(reliability[a].ave) : v)))

  const htmt = htmtMatrix(spec.blocks, indCorr, L)

  return {
    meta: {
      schemaVersion: PLS_SCHEMA_VERSION,
      n, nRows: rows.length, nDropped, missing: spec.missing,
      scheme: spec.scheme, tolerance: spec.tolerance, maxIterations: spec.maxIterations,
      iterations: est.iterations, converged: est.converged,
      warnings,
    },
    lvNames: spec.lvNames,
    outerLoadings,
    outerWeights,
    scores: { lvNames: spec.lvNames, data: scores.map((y) => Array.from(y)) },
    latentCorrelations: { lvNames: spec.lvNames, matrix: sm.lvCorr },
    pathCoefficients: sm.pathCoefficients,
    structural: sm.structural,
    reliability,
    fornellLarcker: { lvNames: spec.lvNames, matrix: fornellLarcker },
    crossLoadings,
    htmt: { lvNames: spec.lvNames, matrix: htmt },
  }
}

/* ─────────────────────────  Bootstrap  ───────────────────────── */

/**
 * Bootstrap 重抽樣（percentile CI、確定性 PRNG、construct-level 符號校正）。
 * @param {object} options { n=5000, seed=42, ciAlpha=0.05,
 *                           signCorrection='construct'|'none',
 *                           onProgress(done, total), ...runPLS options }
 */
export function bootstrapPLS(rows, model, options = {}) {
  const B = options.n ?? 5000
  const seed = options.seed ?? 42
  const ciAlpha = options.ciAlpha ?? 0.05
  const signCorrection = options.signCorrection ?? 'construct'
  const onProgress = options.onProgress

  const original = runPLS(rows, model, options)
  if (original.error) return original

  const spec = buildSpec(model, options)
  const ext = extractMatrix(rows, spec.indicators, spec.missing)
  const { X, n } = ext
  const L = spec.lvNames.length

  // 參數索引
  const pathList = original.pathCoefficients.map((q) => ({ from: q.from, to: q.to }))
  const loadList = original.outerLoadings.map((q) => ({ lv: q.lv, indicator: q.indicator }))
  const origPaths = original.pathCoefficients.map((q) => q.coef)
  const origLoads = original.outerLoadings.map((q) => q.loading)
  const origLoadsByLV = spec.blocks.map((b, j) =>
    original.outerLoadings.filter((q) => q.lv === spec.lvNames[j]).map((q) => q.loading))

  const rand = mulberry32(seed)
  const pathDraws = pathList.map(() => [])
  const loadDraws = loadList.map(() => [])
  let nValid = 0
  let nSkipped = 0
  const progressEvery = Math.max(1, Math.floor(B / 100))

  const Xb = new Array(n)
  for (let rep = 0; rep < B; rep++) {
    // 放回重抽 n 列
    for (let i = 0; i < n; i++) Xb[i] = X[Math.floor(rand() * n)]
    const std = standardizeColumns(Xb)
    if (std.zeroVarIndex !== undefined) { nSkipped++; continue }
    const est = estimateCore(std.cols, n, spec)
    if (!est || !est.converged) { nSkipped++; continue }

    // 每 LV 的 loadings 與符號
    const cols = std.cols
    const flip = new Array(L).fill(1)
    const repLoadsByLV = spec.blocks.map((b, j) =>
      b.map((colIdx) => corrOf(cols[colIdx], est.scores[j])))
    if (signCorrection === 'construct') {
      // 備援方案（SmartPLS 文件沙盒不可達，見檔頭）：
      // 與原始估計 loadings 內積為負 → 翻轉該 LV
      for (let j = 0; j < L; j++) {
        let dot = 0
        for (let h = 0; h < repLoadsByLV[j].length; h++) dot += repLoadsByLV[j][h] * origLoadsByLV[j][h]
        if (dot < 0) flip[j] = -1
      }
    }

    // 結構模型（重抽樣本）
    const sm = structuralModel(est.scores, spec.pred, spec.lvNames, n)
    if (!sm) { nSkipped++; continue }

    for (let q = 0; q < pathList.length; q++) {
      const a = spec.lvNames.indexOf(pathList[q].from)
      const b = spec.lvNames.indexOf(pathList[q].to)
      const found = sm.pathCoefficients.find((c) => c.from === pathList[q].from && c.to === pathList[q].to)
      pathDraws[q].push(found.coef * flip[a] * flip[b])
    }
    let li = 0
    for (let j = 0; j < L; j++) {
      for (let h = 0; h < repLoadsByLV[j].length; h++) {
        loadDraws[li].push(repLoadsByLV[j][h] * flip[j])
        li++
      }
    }
    nValid++
    if (onProgress && (rep + 1) % progressEvery === 0) onProgress(rep + 1, B)
  }
  if (onProgress) onProgress(B, B)

  if (nValid < 10) {
    return { error: 'bootstrap-failed', message: `有效 bootstrap 重抽僅 ${nValid} 次（要求 ${B} 次），無法建立推論` }
  }

  const summarize = (draws, origValue) => {
    const m = meanOf(draws)
    const se = sdOf(draws)
    const sorted = [...draws].sort((a, b) => a - b)
    const t = se > 0 ? origValue / se : null
    const pval = t === null ? null : pT(Math.abs(t), nValid - 1)
    return {
      original: origValue, mean: m, se, t, p: pval,
      ciLower: quantile(sorted, ciAlpha / 2),
      ciUpper: quantile(sorted, 1 - ciAlpha / 2),
    }
  }

  return {
    nRequested: B, nValid, nSkipped, seed, ciAlpha, signCorrection,
    paths: pathList.map((q, i) => ({ from: q.from, to: q.to, ...summarize(pathDraws[i], origPaths[i]) })),
    loadings: loadList.map((q, i) => ({ lv: q.lv, indicator: q.indicator, ...summarize(loadDraws[i], origLoads[i]) })),
  }
}
