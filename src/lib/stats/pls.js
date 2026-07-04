/**
 * PLS-SEM 核心引擎
 *   Wave 1：反映型（Mode A）＋ path weighting scheme ＋ percentile bootstrap
 *   Wave 3：形成型（Mode B）＋ centroid/factorial scheme ＋ PLSc ＋ BCa bootstrap
 *           ＋ model fit（SRMR/d_ULS/d_G/NFI）＋ blindfolding Q²
 *
 * 對外 API（純函式、無 UI 依賴，Node/Worker 雙環境同構）：
 *   PLS_SCHEMA_VERSION            — 模型 JSON schema 版本（目前 1；formative 為 v1 既有欄位，
 *                                    W3 起引擎正式支援，schema 語意未變）
 *   validatePLSModel(model)       — schema 驗證器 → { ok, model } | { ok:false, errors[] }
 *   runPLS(rows, model, options)  — 完整估計 → 結果物件 | { error, message }
 *   bootstrapPLS(rows, model, options) — bootstrap 重抽樣 → 摘要物件 | { error, message }
 *   blindfoldPLS(rows, model, options) — blindfolding Q²（構念層 cross-validated redundancy）
 *   bcaInterval(draws, jackknife, original, ciAlpha) — BCa 信賴區間（供 bootstrap 與測試）
 *
 * 模型 JSON 格式見 docs/pls-model-schema.md（v2：formative 正式支援）。
 *
 * 演算法（Lohmöller 1989；對齊 SmartPLS 4 預設）：
 *   1. 指標 z-score 標準化（sample SD, n−1，與 descriptive.js 慣例一致）
 *   2. 外部權重初始化為 1 → 迭代：
 *      a. LV 分數 = 標準化(Σ w_h·z_h)（單位變異，ddof=1）
 *      b. 內部權重（options.scheme，預設 'path'）：
 *         path      — 前置 LV 用 OLS 迴歸係數、後繼 LV 用相關係數
 *         factorial — 所有相鄰 LV 用相關係數（別名 'factor' 亦接受）
 *         centroid  — 所有相鄰 LV 用相關係數的正負號（±1）
 *      c. 內部代理 Z_j = Σ e_jk·Y_k
 *      d. 外部權重更新（依 latentVariables[].mode）：
 *         Mode A（reflective，correlation weights）：w_h = corr(z_h, Z_j)
 *         Mode B（formative，regression weights）：w = S_block⁻¹ · corr(z_block, Z_j)
 *      e. 權重重新縮放使 LV 分數單位變異
 *   3. 收斂準則：外部權重最大絕對變化 < tolerance（預設 1e-7），
 *      最大迭代 300 次（SmartPLS 4 預設 stop criterion 10^-7 / 300）
 *   4. 符號定向：每個 LV 使其與所屬指標的相關總和為正（dominant orientation）
 *
 * 統計量公式出處：
 *   - 路徑係數/R²：LV 相關矩陣的 OLS（matrix.js inverse）
 *   - f²（Cohen 1988）：(R²_included − R²_excluded) / (1 − R²_included)
 *   - 內部 VIF：前置 LV 相關矩陣反矩陣的對角線
 *   - 外部 VIF（形成型指標共線性；Hair et al. 2017 評估程序）：
 *     區塊指標相關矩陣反矩陣的對角線
 *   - Cronbach's α（標準化）、rho_A（Dijkstra & Henseler 2015, Psychometrika 80(2) 式 12）、
 *     rho_c / CR（Jöreskog 1971）、AVE（Fornell & Larcker 1981）——僅反映型構念；
 *     形成型構念不定義信度/收斂效度（回傳 null，報表以權重檢定＋外部 VIF 取代）
 *   - HTMT（Henseler, Ringle & Sarstedt 2015, JAMS 43）：僅反映型多指標構念的配對
 *   - PLSc（consistent PLS；Dijkstra & Henseler 2015, Psychometrika 80(2) 與 MISQ 39(2)）：
 *     options.consistent=true 時，(1) 一致 loadings λ̂ = √c²·ŵ，
 *     c² = ŵ'(S−diagS)ŵ / ŵ'(ŵŵ'−diag ŵŵ')ŵ（ŵ 已滿足 ŵ'Sŵ=1）；
 *     (2) 反映型構念間相關以 √rho_A 反衰減 r_c = r/√(ρ_A^a·ρ_A^b)；
 *     (3) 路徑係數/R²/f²/內部 VIF 全部改用校正後相關矩陣估計；
 *     (4) CR/AVE 改用一致 loadings；α 與 rho_A 本身不變。
 *     校正後 |r|>1 或一致 loading>1 時「警告不截斷」（roadmap 風險對策，對齊 cSEM 慣例）
 *   - Model fit（每次估計皆回傳 fit）：
 *     SRMR（Henseler et al. 2014, Organizational Research Methods 17(2)）
 *     d_ULS = ½‖S−Σ̂‖²_F、d_G = ½Σ(ln λ_i)²，λ_i 為 S⁻¹Σ̂ 特徵值
 *     （Dijkstra & Henseler 2015, MISQ 39(2)）
 *     NFI = 1 − F_ML/F_null（Bentler & Bonett 1980；F_ML = ln|Σ̂|−ln|S|+tr(SΣ̂⁻¹)−p）
 *     Σ̂：區塊內 λ_iλ_j、區塊間 λ_i·r(η_a,η_b)·λ_j、對角線 1；
 *     「飽和模型」構念相關 = 樣本 LV 相關；「估計模型」構念相關 = 路徑模型以
 *     遞迴 path tracing 隱含的相關。SmartPLS 未完整公開其 fit 實作細節，
 *     本實作依上列文獻公式（與 numpy 手算基準比對），待本機 SmartPLS/seminr 抽驗
 *   - Blindfolding Q²（Stone 1974; Geisser 1974；程序依 Hair et al. 2017 第 6 章）：
 *     omission distance D（預設 7）、構念層 cross-validated redundancy——
 *     內生構念區塊的資料點按 (列×區塊寬+欄) mod D 分 D 輪略去，略去點以該指標
 *     其餘資料的平均補值，整個模型重新估計（含重新標準化），以前置 LV 分數
 *     經路徑係數預測內生 LV 分數、再乘外部 loading 還原略去點；
 *     Q² = 1 − SSE/SSO（SSO 以欄平均為 trivial 預測）
 *
 * Bootstrap（預設 5,000 次、確定性 Mulberry32 PRNG）：
 *   - 逐次以放回抽樣重抽 n 列原始資料、完整重跑估計（含重新標準化、
 *     PLSc 開啟時含一致化校正——即 consistent bootstrapping）
 *   - 回報路徑係數、outer loadings 與 outer weights（形成型檢定用）的
 *     SE / t / p / CI
 *   - 符號校正 signCorrection: 'construct'（預設）——construct-level sign correction：
 *     重抽的 LV loadings 與原始估計內積為負則翻轉該 LV（loadings、weights、觸及路徑）
 *   - CI 法 options.ciType：'percentile'（預設）— 線性內插分位數（R type 7）；
 *     'bca' — bias-corrected and accelerated（Efron 1987, JASA 82(397)；
 *     Efron & Tibshirani 1993 §14.3）：偏誤校正 z₀ = Φ⁻¹(#{θ*<θ̂}/B)、
 *     加速常數 a 由 n 次 jackknife（leave-one-out 全模型重估）三階動差求得
 *   - SE = 重抽估計值的樣本標準差（ddof=1）；t = original/SE；
 *     p = 雙尾 t 分布（df = 有效重抽數 − 1，B=5000 時 ≈ 常態）
 *   - 不收斂或退化（零變異）的重抽樣本剔除並計數（nSkipped）
 */
import { inverse, matmul } from './matrix.js'
import { pT, qnorm, normalCdf } from './pvalue.js'
import { isMissing } from '../variableTypes.js'

export const PLS_SCHEMA_VERSION = 1

/** weighting scheme 正規名稱（'factor' 為 'factorial' 的別名） */
const SCHEME_ALIASES = { path: 'path', factorial: 'factorial', factor: 'factorial', centroid: 'centroid' }

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

/** 兩向量的 Pearson 相關（通用版自行置中） */
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
  const pc = Math.min(Math.max(p, 0), 1)
  const h = (m - 1) * pc
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

/**
 * 對稱矩陣 Jacobi 特徵分解（cyclic sweep；model fit 的 d_G/NFI 用）。
 * @returns {{ values:number[], vectors:number[][] }} vectors[i][j] = 第 j 個特徵向量的第 i 元素
 */
function jacobiEigen(Ain, maxSweeps = 80) {
  const n = Ain.length
  const A = Ain.map((r) => r.slice())
  const V = []
  for (let i = 0; i < n; i++) {
    V.push(new Array(n).fill(0))
    V[i][i] = 1
  }
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q]
    if (off < 1e-26) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-18) continue
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q])
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k][p]
          const akq = A[k][q]
          A[k][p] = c * akp - s * akq
          A[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k]
          const aqk = A[q][k]
          A[p][k] = c * apk - s * aqk
          A[q][k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p]
          const vkq = V[k][q]
          V[k][p] = c * vkp - s * vkq
          V[k][q] = s * vkp + c * vkq
        }
      }
    }
  }
  return { values: A.map((row, i) => row[i]), vectors: V }
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

/** 逐欄 z-score（ddof=1），回傳各欄 mean/sd（blindfolding 用）。零變異回傳該欄 index。 */
function standardizeColumns(X) {
  const n = X.length
  const p = X[0].length
  const cols = []
  const means = new Array(p)
  const sds = new Array(p)
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
    means[j] = m
    sds[j] = s
  }
  return { cols, means, sds }
}

/* ─────────────────────────  核心迭代估計  ───────────────────────── */

/**
 * 對「已標準化欄位」執行 PLS 迭代（Mode A/B × path/factorial/centroid）。
 * spec：{ blocks, modes, pred, succ, scheme, tolerance, maxIterations }
 * @returns { weights: Float64Array[], scores: Float64Array[], iterations, converged } | null（數值失敗）
 */
function estimateCore(cols, n, spec) {
  const { blocks, modes, pred, succ, scheme, tolerance, maxIterations } = spec
  const L = blocks.length

  // Mode B 區塊：指標相關子矩陣反矩陣在迭代間不變，預先計算
  let SbInv = null
  if (modes.some((m) => m === 'B')) {
    SbInv = blocks.map((b, j) => {
      if (modes[j] !== 'B' || b.length < 2) return null
      const Sb = b.map((a) => b.map((c) => (a === c ? 1 : corrOf(cols[a], cols[c]))))
      return inverse(Sb)
    })
    for (let j = 0; j < L; j++) {
      if (modes[j] === 'B' && blocks[j].length >= 2 && !SbInv[j]) return null
    }
  }

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
    // 內部權重
    for (let j = 0; j < L; j++) {
      const zj = Zin[j]
      zj.fill(0)
      if (scheme === 'path') {
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
      } else {
        // factorial / centroid：所有相鄰 LV
        const nb = new Set([...pred[j], ...succ[j]])
        for (const k of nb) {
          let e = corrOf(Y[j], Y[k])
          if (scheme === 'centroid') e = e >= 0 ? 1 : -1
          const yk = Y[k]
          for (let i = 0; i < n; i++) zj[i] += e * yk[i]
        }
      }
    }
    // 外部權重（Mode A：相關；Mode B：迴歸），再縮放為單位變異
    const Wnew = []
    for (let j = 0; j < L; j++) {
      const b = blocks[j]
      const w = new Float64Array(b.length)
      if (modes[j] === 'B' && b.length >= 2) {
        const r = b.map((h) => corrOf(cols[h], Zin[j]))
        const Sinv = SbInv[j]
        for (let h = 0; h < b.length; h++) {
          let s = 0
          for (let k = 0; k < b.length; k++) s += Sinv[h][k] * r[k]
          w[h] = s
        }
      } else {
        for (let h = 0; h < b.length; h++) w[h] = corrOf(cols[b[h]], Zin[j])
      }
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

/** 由 LV 相關矩陣解結構模型：路徑係數、R²、adjR²、f²、內部 VIF */
function structuralFromCorr(lvCorr, pred, lvNames, n) {
  const L = lvNames.length

  const regress = (P, j) => { // 回傳 { coefs, r2 }；P 為前置索引陣列
    if (P.length === 0) return { coefs: [], r2: 0 }
    const rpy = P.map((a) => lvCorr[a][j])
    if (P.length === 1) return { coefs: [rpy[0]], r2: rpy[0] * rpy[0] }
    const Rpp = P.map((a) => P.map((b) => lvCorr[a][b]))
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
  return { pathCoefficients, structural }
}

/** 區塊信效度：α（標準化）、rho_A、rho_c、AVE（僅反映型多指標構念） */
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

/** HTMT 矩陣（Henseler et al. 2015）；不合格配對（單指標或形成型）為 null */
function htmtMatrix(blocks, eligible, indCorr, L) {
  const monoMean = blocks.map((b, j) => {
    const k = b.length
    if (!eligible[j] || k < 2) return null
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

/* ─────────────────────────  PLSc（consistent PLS）  ───────────────────────── */

/**
 * Dijkstra & Henseler (2015) 一致化校正。
 * 僅校正「反映型多指標」構念；形成型與單指標構念的衰減係數視為 1。
 * @returns { rhoA:number[], loadingsByLV:number[][], lvCorr:number[][], warnings:string[] }
 */
function plscAdjust(spec, cols, weights, rawLoadingsByLV, lvCorr) {
  const { blocks, modes, lvNames } = spec
  const L = blocks.length
  const warnings = []
  const rhoA = new Array(L).fill(1)
  const q = new Array(L).fill(1)
  const loadingsByLV = rawLoadingsByLV.map((l) => l.slice())

  for (let j = 0; j < L; j++) {
    const b = blocks[j]
    if (modes[j] === 'B' || b.length < 2) continue
    const S = b.map((a) => b.map((c) => (a === c ? 1 : corrOf(cols[a], cols[c]))))
    const w = Array.from(weights[j]) // 已滿足 w'Sw = 1（單位變異分數）
    let num = 0, den = 0, ww = 0
    for (let a = 0; a < b.length; a++) {
      ww += w[a] * w[a]
      for (let c = 0; c < b.length; c++) {
        if (a === c) continue
        num += w[a] * S[a][c] * w[c]
        den += w[a] * w[a] * w[c] * w[c]
      }
    }
    if (!(den > 1e-12) || !(num / den > 0)) {
      warnings.push(`PLSc：構念「${lvNames[j]}」的一致化校正係數無法計算（c² ≤ 0），該構念改用未校正估計`)
      continue
    }
    const c2 = num / den
    const c = Math.sqrt(c2)
    loadingsByLV[j] = w.map((v) => v * c)
    rhoA[j] = ww * ww * c2
    q[j] = Math.sqrt(rhoA[j])
    if (loadingsByLV[j].some((v) => Math.abs(v) > 1)) {
      warnings.push(`PLSc：構念「${lvNames[j]}」的一致 loadings 有絕對值 > 1（小樣本或低信度時可能發生），依 cSEM 慣例警告不截斷，解讀時請留意`)
    }
  }

  const lvCorrC = lvCorr.map((row, a) => row.map((v, b) => (a === b ? 1 : v / (q[a] * q[b]))))
  const over = []
  for (let a = 0; a < L; a++) {
    for (let b = a + 1; b < L; b++) {
      if (Math.abs(lvCorrC[a][b]) > 1) over.push(`${lvNames[a]}–${lvNames[b]}`)
    }
  }
  if (over.length > 0) {
    warnings.push(`PLSc：校正後構念相關絕對值 > 1（${over.join('、')}），校正後相關矩陣可能非正定；警告不截斷，路徑估計請謹慎解讀`)
  }
  return { rhoA, loadingsByLV, lvCorr: lvCorrC, warnings }
}

/* ─────────────────────────  Model fit（SRMR / d_ULS / d_G / NFI）  ───────────────────────── */

/** 估計模型隱含的構念相關矩陣（遞迴 path tracing；拓撲順序由 buildSpec 提供） */
function impliedLvCorr(lvCorr, structural, spec) {
  const { lvNames, pred, topoOrder } = spec
  const R = lvNames.map((_, a) => lvNames.map((_, b) => (a === b ? 1 : 0)))
  const coefByIdx = new Map()
  for (const s of structural) {
    coefByIdx.set(lvNames.indexOf(s.lv), s.predictors.map((qq) => qq.coef))
  }
  const done = []
  for (const j of topoOrder) {
    const P = pred[j]
    if (P.length === 0) {
      // 外生構念：與其他外生構念的相關 = 樣本相關
      // （Kahn FIFO 保證外生構念全部排在內生之前）
      for (const k of done) { R[j][k] = lvCorr[j][k]; R[k][j] = lvCorr[j][k] }
    } else {
      const bc = coefByIdx.get(j) || []
      for (const k of done) {
        let s = 0
        for (let qi = 0; qi < P.length; qi++) s += bc[qi] * R[P[qi]][k]
        R[j][k] = s
        R[k][j] = s
      }
    }
    done.push(j)
  }
  return R
}

/**
 * SRMR / d_ULS / d_G / NFI（公式出處見檔頭）。
 * @param {number[][]} S 指標相關矩陣
 * @param {number[]} lamFlat 各指標 loading（依 spec 指標順序）
 * @param {number[]} owner 各指標所屬 LV 索引
 * @param {number[][]} Rlv 構念相關矩陣（飽和 = 樣本；估計 = path tracing 隱含）
 * @param {{values:number[], vectors:number[][]}|null} eigS S 的特徵分解（呼叫端快取）
 */
function fitStats(S, lamFlat, owner, Rlv, eigS) {
  const p = S.length
  const Sig = []
  for (let i = 0; i < p; i++) {
    Sig.push(new Array(p))
    for (let k = 0; k < p; k++) {
      if (i === k) Sig[i][k] = 1
      else if (owner[i] === owner[k]) Sig[i][k] = lamFlat[i] * lamFlat[k]
      else Sig[i][k] = lamFlat[i] * Rlv[owner[i]][owner[k]] * lamFlat[k]
    }
  }
  let ssTri = 0
  let ssAll = 0
  for (let i = 0; i < p; i++) {
    for (let k = 0; k < p; k++) {
      const d = S[i][k] - Sig[i][k]
      ssAll += d * d
      if (k >= i) ssTri += d * d
    }
  }
  const srmr = Math.sqrt(ssTri / (p * (p + 1) / 2))
  const dUls = 0.5 * ssAll
  let dG = null
  let nfi = null
  if (eigS && eigS.values.every((v) => v > 1e-10)) {
    // S^(-1/2) 經特徵分解；M = S^(-1/2)·Σ̂·S^(-1/2) 的特徵值 = S⁻¹Σ̂ 的特徵值
    const V = eigS.vectors
    const Shalf = []
    for (let i = 0; i < p; i++) {
      Shalf.push(new Array(p).fill(0))
      for (let k = 0; k < p; k++) {
        let s = 0
        for (let j = 0; j < p; j++) s += V[i][j] * V[k][j] / Math.sqrt(eigS.values[j])
        Shalf[i][k] = s
      }
    }
    const M = matmul(matmul(Shalf, Sig), Shalf)
    const ev = jacobiEigen(M).values
    if (ev.every((v) => v > 1e-12)) {
      let sumLog2 = 0
      let fMl = 0
      for (const v of ev) {
        const lg = Math.log(v)
        sumLog2 += lg * lg
        fMl += lg + 1 / v - 1
      }
      dG = 0.5 * sumLog2
      let fNull = 0
      for (const v of eigS.values) fNull -= Math.log(v)
      nfi = fNull > 1e-12 ? 1 - fMl / fNull : null
    }
  }
  return { srmr, dUls, dG, nfi }
}

/* ─────────────────────────  模型規格前處理（共用）  ───────────────────────── */

function buildSpec(model, options) {
  const v = validatePLSModel(model)
  if (!v.ok) return { error: 'invalid-model', message: v.errors.join('；'), errors: v.errors }
  const m = v.model

  const rawScheme = options.scheme ?? 'path'
  const scheme = SCHEME_ALIASES[rawScheme]
  if (!scheme) {
    return { error: 'scheme-not-supported', message: `未知的 weighting scheme「${rawScheme}」（支援 path / factorial / centroid）` }
  }

  const lvNames = m.latentVariables.map((l) => l.name)
  const modes = m.latentVariables.map((l) => (l.mode === 'formative' ? 'B' : 'A'))
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
  // 拓撲順序（Kahn FIFO：外生構念必在內生之前）——estimated model fit 的 path tracing 用
  const indeg = lvNames.map((_, j) => pred[j].length)
  const queue = []
  for (let j = 0; j < L; j++) if (indeg[j] === 0) queue.push(j)
  const topoOrder = []
  while (queue.length) {
    const u = queue.shift()
    topoOrder.push(u)
    for (const vIdx of succ[u]) {
      indeg[vIdx] -= 1
      if (indeg[vIdx] === 0) queue.push(vIdx)
    }
  }
  return {
    model: m, lvNames, modes, indicators, blocks, pred, succ, topoOrder,
    scheme,
    consistent: options.consistent === true,
    tolerance: options.tolerance ?? 1e-7,
    maxIterations: options.maxIterations ?? 300,
    missing: options.missing ?? 'casewise',
  }
}

/**
 * 共用估計流程：迭代估計 → 原始 loadings / LV 相關 → （選配）PLSc 校正 → 結構模型。
 * runPLS、bootstrap 重抽與 jackknife 皆走此函式，確保 consistent bootstrap 的一致性。
 * @returns { est, rawLoadingsByLV, lvCorr, effLoadingsByLV, effLvCorr, plsc, sm } | null
 */
function coreEstimates(cols, n, spec) {
  const est = estimateCore(cols, n, spec)
  if (!est || !est.converged) return est ? { notConverged: true, est } : null
  const L = spec.blocks.length
  const rawLoadingsByLV = spec.blocks.map((b, j) => b.map((h) => corrOf(cols[h], est.scores[j])))
  const lvCorr = []
  for (let a = 0; a < L; a++) {
    lvCorr.push(new Array(L))
    for (let b = 0; b < L; b++) lvCorr[a][b] = a === b ? 1 : corrOf(est.scores[a], est.scores[b])
  }
  let effLoadingsByLV = rawLoadingsByLV
  let effLvCorr = lvCorr
  let plsc = null
  if (spec.consistent) {
    plsc = plscAdjust(spec, cols, est.weights, rawLoadingsByLV, lvCorr)
    effLoadingsByLV = plsc.loadingsByLV
    effLvCorr = plsc.lvCorr
  }
  const sm = structuralFromCorr(effLvCorr, spec.pred, spec.lvNames, n)
  if (!sm) return null
  return { est, rawLoadingsByLV, lvCorr, effLoadingsByLV, effLvCorr, plsc, sm }
}

/* ─────────────────────────  主 API：runPLS  ───────────────────────── */

/**
 * @param {object[]} rows  資料（物件陣列，欄位名 → 值）
 * @param {object} model   模型 JSON（docs/pls-model-schema.md）
 * @param {object} options { scheme:'path'|'factorial'|'centroid', consistent:boolean,
 *                           tolerance, maxIterations, missing:'casewise'|'mean' }
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

  const ce = coreEstimates(cols, n, spec)
  if (!ce) return { error: 'estimation-failed', message: 'PLS 迭代過程出現數值退化（零變異 LV 分數或奇異矩陣），請檢查指標間是否極度共線' }
  if (ce.notConverged) {
    return { error: 'not-converged', message: `PLS 迭代在 ${spec.maxIterations} 次內未收斂（準則 ${spec.tolerance}），不回傳半成品結果；請檢查資料品質或模型設定` }
  }
  const { est, rawLoadingsByLV, effLoadingsByLV, effLvCorr, plsc, sm } = ce

  const warnings = []
  if (n < 30) warnings.push(`樣本數偏低（n = ${n}），PLS 估計與 bootstrap 推論的穩定性有限`)
  if (nDropped > 0) warnings.push(`casewise deletion 剔除 ${nDropped} 筆含缺失值的資料列`)
  if (plsc) warnings.push(...plsc.warnings)

  const { weights, scores } = est
  const L = spec.lvNames.length
  const p = spec.indicators.length

  // 指標相關矩陣（供信效度、HTMT、外部 VIF、model fit）
  const indCorr = []
  for (let a = 0; a < p; a++) {
    indCorr.push(new Array(p))
    for (let b = 0; b < p; b++) indCorr[a][b] = a === b ? 1 : corrOf(cols[a], cols[b])
  }

  // 外部 VIF（形成型多指標區塊）：區塊相關矩陣反矩陣對角線
  const outerVifByLV = spec.blocks.map((b, j) => {
    if (spec.modes[j] !== 'B' || b.length < 2) return null
    const Sb = b.map((a) => b.map((c) => indCorr[a][c]))
    const Sinv = inverse(Sb)
    if (!Sinv) return null
    return Sinv.map((row, i) => row[i])
  })

  // Outer loadings / weights / cross-loadings
  const outerLoadings = []
  const outerWeights = []
  const crossLoadings = []
  for (let j = 0; j < L; j++) {
    for (let h = 0; h < spec.blocks[j].length; h++) {
      const colIdx = spec.blocks[j][h]
      outerLoadings.push({ lv: spec.lvNames[j], indicator: spec.indicators[colIdx], loading: effLoadingsByLV[j][h] })
      outerWeights.push({
        lv: spec.lvNames[j],
        indicator: spec.indicators[colIdx],
        weight: weights[j][h],
        vif: outerVifByLV[j] ? outerVifByLV[j][h] : null,
      })
    }
  }
  for (let a = 0; a < p; a++) {
    const ownLv = spec.lvNames[spec.blocks.findIndex((b) => b.includes(a))]
    const values = {}
    for (let j = 0; j < L; j++) values[spec.lvNames[j]] = corrOf(cols[a], scores[j])
    crossLoadings.push({ indicator: spec.indicators[a], ownLv, values })
  }

  // 信效度（僅反映型；形成型構念不定義 α/rho_A/CR/AVE → null）
  const reliability = spec.blocks.map((b, j) => {
    const mode = spec.modes[j] === 'B' ? 'formative' : 'reflective'
    if (mode === 'formative') {
      return { lv: spec.lvNames[j], mode, alpha: null, rhoA: null, rhoC: null, ave: null }
    }
    const base = blockReliability(b, Array.from(weights[j]), rawLoadingsByLV[j], indCorr)
    if (spec.consistent && b.length >= 2) {
      // PLSc：CR / AVE 改用一致 loadings；α 與 rho_A 不變
      const lamC = effLoadingsByLV[j]
      const sumL = lamC.reduce((s, l) => s + l, 0)
      const sumL2 = lamC.reduce((s, l) => s + l * l, 0)
      const sumErr = lamC.reduce((s, l) => s + (1 - l * l), 0)
      base.rhoC = (sumL * sumL) / (sumL * sumL + sumErr)
      base.ave = sumL2 / b.length
    }
    return { lv: spec.lvNames[j], mode, ...base }
  })

  // Fornell-Larcker：對角線 √AVE（形成型 → null）、非對角線 LV 相關
  const fornellLarcker = effLvCorr.map((row, a) =>
    row.map((v, b) => {
      if (a !== b) return v
      return reliability[a].ave === null ? null : Math.sqrt(reliability[a].ave)
    }))

  const htmtEligible = spec.blocks.map((b, j) => spec.modes[j] === 'A' && b.length >= 2)
  const htmt = htmtMatrix(spec.blocks, htmtEligible, indCorr, L)

  // Model fit（SRMR / d_ULS / d_G / NFI；saturated vs estimated）
  const lamFlat = []
  const owner = []
  for (let j = 0; j < L; j++) {
    for (let h = 0; h < spec.blocks[j].length; h++) {
      lamFlat.push(effLoadingsByLV[j][h])
      owner.push(j)
    }
  }
  let fit = null
  const eigS = jacobiEigen(indCorr)
  if (eigS.values.every((v) => v > 1e-10)) {
    const RlvEst = impliedLvCorr(effLvCorr, sm.structural, spec)
    const saturated = fitStats(indCorr, lamFlat, owner, effLvCorr, eigS)
    const estimated = fitStats(indCorr, lamFlat, owner, RlvEst, eigS)
    fit = { saturated, estimated }
    if (saturated.dG === null || estimated.dG === null) {
      warnings.push('Model fit：模型隱含相關矩陣非正定（PLSc 一致 loadings > 1 時可能發生），d_G 與 NFI 無法計算')
    }
  } else {
    warnings.push('Model fit：指標相關矩陣接近奇異，SRMR/d_ULS/d_G/NFI 無法計算')
  }

  return {
    meta: {
      schemaVersion: PLS_SCHEMA_VERSION,
      n, nRows: rows.length, nDropped, missing: spec.missing,
      scheme: spec.scheme, consistent: spec.consistent,
      tolerance: spec.tolerance, maxIterations: spec.maxIterations,
      iterations: est.iterations, converged: est.converged,
      warnings,
    },
    lvNames: spec.lvNames,
    lvModes: Object.fromEntries(spec.lvNames.map((name, j) => [name, spec.modes[j] === 'B' ? 'formative' : 'reflective'])),
    outerLoadings,
    outerWeights,
    scores: { lvNames: spec.lvNames, data: scores.map((y) => Array.from(y)) },
    latentCorrelations: { lvNames: spec.lvNames, matrix: effLvCorr },
    pathCoefficients: sm.pathCoefficients,
    structural: sm.structural,
    reliability,
    fornellLarcker: { lvNames: spec.lvNames, matrix: fornellLarcker },
    crossLoadings,
    htmt: { lvNames: spec.lvNames, matrix: htmt },
    fit,
    ...(plsc ? { plsc: { rhoA: Object.fromEntries(spec.lvNames.map((name, j) => [name, plsc.rhoA[j]])) } } : {}),
  }
}

/* ─────────────────────────  Blindfolding Q²  ───────────────────────── */

/**
 * 構念層 cross-validated redundancy Q²（程序見檔頭）。
 * @param {object} options { omissionDistance=7, ...runPLS options（consistent 於 Q² 中不適用，
 *                           一律以 composite 估計計算） }
 * @returns {{ omissionDistance, constructs:[{lv, q2, sse, sso}], warnings }} | { error, message }
 */
export function blindfoldPLS(rows, model, options = {}) {
  const D = options.omissionDistance ?? 7
  if (!Number.isInteger(D) || D < 2) {
    return { error: 'bad-omission-distance', message: `omission distance 必須是 ≥ 2 的整數，收到「${options.omissionDistance}」` }
  }
  const spec = buildSpec(model, { ...options, consistent: false })
  if (spec.error) return spec

  const ext = extractMatrix(rows, spec.indicators, spec.missing)
  if (ext.error) return ext
  const { X, n } = ext
  if (n < 5) return { error: 'too-few-cases', message: `缺失值處理後樣本數只剩 ${n} 筆（至少需要 5 筆）` }

  const warnings = []
  if (n % D === 0) {
    warnings.push(`樣本數 n = ${n} 是 omission distance（${D}）的整數倍，略去點會落在固定列型樣上（SmartPLS 慣例建議改用其他 D）`)
  }

  // 基準估計需可收斂，否則不進入重估迴圈
  const baseStd = standardizeColumns(X)
  if (baseStd.zeroVarIndex !== undefined) {
    return { error: 'zero-variance', message: `指標「${spec.indicators[baseStd.zeroVarIndex]}」變異數為零，無法標準化` }
  }
  const baseCe = coreEstimates(baseStd.cols, n, spec)
  if (!baseCe || baseCe.notConverged) {
    return { error: 'blindfold-failed', message: 'Q²：完整資料的 PLS 估計即未收斂或退化，無法進行 blindfolding' }
  }

  const constructs = []
  for (let j = 0; j < spec.lvNames.length; j++) {
    if (spec.pred[j].length === 0) continue // 只有內生構念有 Q²
    const b = spec.blocks[j]
    const k = b.length
    let sse = 0
    let sso = 0
    for (let d = 0; d < D; d++) {
      // 此輪略去的資料點（列 i × 區塊內欄 h）
      const omitted = []
      for (let i = 0; i < n; i++) {
        for (let h = 0; h < k; h++) {
          if ((i * k + h) % D === d) omitted.push([i, h])
        }
      }
      if (omitted.length === 0) continue
      // 補值：以該指標「其餘資料」的平均取代（在原始量尺）
      const colMeans = new Array(k).fill(null)
      for (let h = 0; h < k; h++) {
        const omitRows = new Set(omitted.filter((q) => q[1] === h).map((q) => q[0]))
        if (omitRows.size === 0) continue
        let s = 0, c = 0
        for (let i = 0; i < n; i++) {
          if (omitRows.has(i)) continue
          s += X[i][b[h]]; c++
        }
        colMeans[h] = s / c
      }
      const Xd = X.map((row) => row.slice())
      for (const [i, h] of omitted) Xd[i][b[h]] = colMeans[h]
      // 整個模型重估（含重新標準化）
      const std = standardizeColumns(Xd)
      if (std.zeroVarIndex !== undefined) {
        return { error: 'blindfold-failed', message: `Q²：構念「${spec.lvNames[j]}」第 ${d + 1} 輪補值後出現零變異指標，無法估計` }
      }
      const ce = coreEstimates(std.cols, n, spec)
      if (!ce || ce.notConverged) {
        return { error: 'blindfold-failed', message: `Q²：構念「${spec.lvNames[j]}」第 ${d + 1} 輪的 PLS 重估未收斂或退化` }
      }
      // 內生 LV 分數的結構預測：Ŷ_j = Σ β·Y_pred
      const P = spec.pred[j]
      const st = ce.sm.structural.find((s) => s.lv === spec.lvNames[j])
      const bc = st.predictors.map((q) => q.coef)
      const scores = ce.est.scores
      const loadRow = ce.rawLoadingsByLV[j]
      for (const [i, h] of omitted) {
        let yhat = 0
        for (let qi = 0; qi < P.length; qi++) yhat += bc[qi] * scores[P[qi]][i]
        const zTrue = (X[i][b[h]] - std.means[b[h]]) / std.sds[b[h]]
        const zHat = loadRow[h] * yhat
        const zTrivial = (colMeans[h] - std.means[b[h]]) / std.sds[b[h]]
        sse += (zTrue - zHat) * (zTrue - zHat)
        sso += (zTrue - zTrivial) * (zTrue - zTrivial)
      }
    }
    constructs.push({
      lv: spec.lvNames[j],
      sse,
      sso,
      q2: sso > 1e-12 ? 1 - sse / sso : null,
    })
  }
  return { omissionDistance: D, constructs, warnings }
}

/* ─────────────────────────  BCa 信賴區間  ───────────────────────── */

/**
 * Bias-corrected and accelerated bootstrap CI（Efron 1987；Efron & Tibshirani 1993 §14.3）。
 * @param {number[]} draws     bootstrap 重抽估計值
 * @param {number[]} jackknife leave-one-out 估計值（加速常數 a 用）
 * @param {number} original    原始（全樣本）估計值
 * @param {number} ciAlpha     雙尾 α（預設 0.05 → 95% CI）
 * @returns {{ ciLower, ciUpper, z0, a }}
 */
export function bcaInterval(draws, jackknife, original, ciAlpha = 0.05) {
  const B = draws.length
  const sorted = [...draws].sort((x, y) => x - y)
  let below = 0
  for (const v of draws) if (v < original) below++
  const prop = Math.min(Math.max(below / B, 1 / (B + 1)), B / (B + 1))
  const z0 = qnorm(prop)
  let a = 0
  if (Array.isArray(jackknife) && jackknife.length >= 3) {
    const mj = meanOf(jackknife)
    let s2 = 0, s3 = 0
    for (const v of jackknife) {
      const dv = mj - v
      s2 += dv * dv
      s3 += dv * dv * dv
    }
    a = s2 > 1e-24 ? s3 / (6 * Math.pow(s2, 1.5)) : 0
  }
  const adj = (z) => {
    const t = z0 + z
    const denom = 1 - a * t
    if (!(Math.abs(denom) > 1e-12)) return t > 0 ? 1 : 0
    return normalCdf(z0 + t / denom)
  }
  const a1 = adj(qnorm(ciAlpha / 2))
  const a2 = adj(qnorm(1 - ciAlpha / 2))
  return { ciLower: quantile(sorted, a1), ciUpper: quantile(sorted, a2), z0, a }
}

/* ─────────────────────────  Bootstrap  ───────────────────────── */

/**
 * Bootstrap 重抽樣（確定性 PRNG、construct-level 符號校正、percentile/BCa CI、
 * consistent=true 時為 consistent bootstrapping——每次重抽含 PLSc 校正）。
 * @param {object} options { n=5000, seed=42, ciAlpha=0.05,
 *                           signCorrection='construct'|'none',
 *                           ciType='percentile'|'bca',
 *                           onProgress(done, total), ...runPLS options }
 */
export function bootstrapPLS(rows, model, options = {}) {
  const B = options.n ?? 5000
  const seed = options.seed ?? 42
  const ciAlpha = options.ciAlpha ?? 0.05
  const signCorrection = options.signCorrection ?? 'construct'
  const ciType = options.ciType ?? 'percentile'
  if (ciType !== 'percentile' && ciType !== 'bca') {
    return { error: 'ci-type-not-supported', message: `未知的 CI 類型「${options.ciType}」（支援 percentile / bca）` }
  }
  const onProgress = options.onProgress

  const original = runPLS(rows, model, options)
  if (original.error) return original

  const spec = buildSpec(model, options)
  const ext = extractMatrix(rows, spec.indicators, spec.missing)
  const { X, n } = ext
  const L = spec.lvNames.length
  const lvIdx = new Map(spec.lvNames.map((name, j) => [name, j]))

  // 參數清單與原始值（loadings/weights 依區塊順序攤平；paths 依結構模型順序）
  const pathList = original.pathCoefficients.map((q) => ({ from: q.from, to: q.to }))
  const loadList = original.outerLoadings.map((q) => ({ lv: q.lv, indicator: q.indicator }))
  const origPaths = original.pathCoefficients.map((q) => q.coef)
  const origLoads = original.outerLoadings.map((q) => q.loading)
  const origWts = original.outerWeights.map((q) => q.weight)
  const origLoadsByLV = spec.blocks.map((b, j) =>
    original.outerLoadings.filter((q) => q.lv === spec.lvNames[j]).map((q) => q.loading))

  /** 單次估計 → 攤平參數（含符號校正）；重抽與 jackknife 共用 */
  const flatEstimates = (Xs) => {
    const std = standardizeColumns(Xs)
    if (std.zeroVarIndex !== undefined) return null
    const ce = coreEstimates(std.cols, Xs.length, spec)
    if (!ce || ce.notConverged) return null
    const flip = new Array(L).fill(1)
    if (signCorrection === 'construct') {
      for (let j = 0; j < L; j++) {
        let dot = 0
        const lj = ce.effLoadingsByLV[j]
        for (let h = 0; h < lj.length; h++) dot += lj[h] * origLoadsByLV[j][h]
        if (dot < 0) flip[j] = -1
      }
    }
    // ce.sm.pathCoefficients 的順序由 spec 決定，與 original 逐一對應
    const paths = ce.sm.pathCoefficients.map((q) => q.coef * flip[lvIdx.get(q.from)] * flip[lvIdx.get(q.to)])
    const loads = []
    const wts = []
    for (let j = 0; j < L; j++) {
      for (let h = 0; h < spec.blocks[j].length; h++) {
        loads.push(ce.effLoadingsByLV[j][h] * flip[j])
        wts.push(ce.est.weights[j][h] * flip[j])
      }
    }
    return { paths, loads, wts }
  }

  const rand = mulberry32(seed)
  const pathDraws = pathList.map(() => [])
  const loadDraws = loadList.map(() => [])
  const wtDraws = loadList.map(() => [])
  let nValid = 0
  let nSkipped = 0
  const progressEvery = Math.max(1, Math.floor(B / 100))

  const Xb = new Array(n)
  for (let rep = 0; rep < B; rep++) {
    // 放回重抽 n 列
    for (let i = 0; i < n; i++) Xb[i] = X[Math.floor(rand() * n)]
    const fe = flatEstimates(Xb)
    if (!fe) { nSkipped++; continue }
    for (let q = 0; q < pathList.length; q++) pathDraws[q].push(fe.paths[q])
    for (let q = 0; q < loadList.length; q++) {
      loadDraws[q].push(fe.loads[q])
      wtDraws[q].push(fe.wts[q])
    }
    nValid++
    if (onProgress && (rep + 1) % progressEvery === 0) onProgress(rep + 1, B)
  }
  if (onProgress) onProgress(B, B)

  if (nValid < 10) {
    return { error: 'bootstrap-failed', message: `有效 bootstrap 重抽僅 ${nValid} 次（要求 ${B} 次），無法建立推論` }
  }

  // BCa：n 次 jackknife（leave-one-out 全模型重估）求加速常數 a
  let jackPaths = null
  let jackLoads = null
  let jackWts = null
  let nJackknife = null
  if (ciType === 'bca') {
    jackPaths = pathList.map(() => [])
    jackLoads = loadList.map(() => [])
    jackWts = loadList.map(() => [])
    nJackknife = 0
    for (let i = 0; i < n; i++) {
      const Xj = []
      for (let r = 0; r < n; r++) if (r !== i) Xj.push(X[r])
      const fe = flatEstimates(Xj)
      if (!fe) continue
      for (let q = 0; q < pathList.length; q++) jackPaths[q].push(fe.paths[q])
      for (let q = 0; q < loadList.length; q++) {
        jackLoads[q].push(fe.loads[q])
        jackWts[q].push(fe.wts[q])
      }
      nJackknife++
    }
    if (nJackknife < 3) {
      return { error: 'bca-failed', message: `BCa 需要 jackknife 重估計，但有效 jackknife 僅 ${nJackknife} 次（n = ${n}），請改用 percentile CI` }
    }
  }

  const summarize = (draws, origValue, jack) => {
    const m = meanOf(draws)
    const se = sdOf(draws)
    const t = se > 0 ? origValue / se : null
    const pval = t === null ? null : pT(Math.abs(t), nValid - 1)
    let ciLower
    let ciUpper
    if (ciType === 'bca') {
      const ci = bcaInterval(draws, jack, origValue, ciAlpha)
      ciLower = ci.ciLower
      ciUpper = ci.ciUpper
    } else {
      const sorted = [...draws].sort((x, y) => x - y)
      ciLower = quantile(sorted, ciAlpha / 2)
      ciUpper = quantile(sorted, 1 - ciAlpha / 2)
    }
    return { original: origValue, mean: m, se, t, p: pval, ciLower, ciUpper }
  }

  return {
    nRequested: B, nValid, nSkipped, seed, ciAlpha, signCorrection, ciType,
    ...(nJackknife !== null ? { nJackknife } : {}),
    paths: pathList.map((q, i) => ({
      from: q.from, to: q.to,
      ...summarize(pathDraws[i], origPaths[i], jackPaths ? jackPaths[i] : null),
    })),
    loadings: loadList.map((q, i) => ({
      lv: q.lv, indicator: q.indicator,
      ...summarize(loadDraws[i], origLoads[i], jackLoads ? jackLoads[i] : null),
    })),
    weights: loadList.map((q, i) => ({
      lv: q.lv, indicator: q.indicator,
      ...summarize(wtDraws[i], origWts[i], jackWts ? jackWts[i] : null),
    })),
  }
}
