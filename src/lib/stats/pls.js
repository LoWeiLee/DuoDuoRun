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
import { pT, qT, qnorm, normalCdf } from './pvalue.js'
import { isMissing } from '../variableTypes.js'
import { runNCA } from './nca.js'
import { kolmogorovSmirnov } from './normality.js'

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
export function validatePLSModel(model, allowSharedIndicators = false) {
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
      if (!allowSharedIndicators && indicatorOwner.has(ind) && indicatorOwner.get(ind) !== name) {
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

  /* ── W4：higherOrder（高階構念）宣告 ── */
  const hocByName = new Map()
  const componentOwner = new Map() // LOC name → HOC name
  const normalizedHOCs = []
  if (model.higherOrder !== undefined && model.higherOrder !== null) {
    if (!Array.isArray(model.higherOrder)) {
      errors.push('higherOrder 必須是陣列')
    } else {
      const hocMethods = new Set()
      for (let i = 0; i < model.higherOrder.length; i++) {
        const h = model.higherOrder[i]
        if (!h || typeof h !== 'object' || typeof h.name !== 'string' || h.name.trim() === '') {
          errors.push(`第 ${i + 1} 個高階構念缺少有效名稱`)
          continue
        }
        if (lvNames.has(h.name) || indicatorOwner.has(h.name) || hocByName.has(h.name)) {
          errors.push(`高階構念名稱「${h.name}」與既有潛在變數／指標／高階構念重複`)
        }
        if (!Array.isArray(h.components) || h.components.length < 2) {
          errors.push(`高階構念「${h.name}」的 components 必須是至少 2 個低階構念的陣列`)
          continue
        }
        const seenC = new Set()
        let compOk = true
        for (const c of h.components) {
          if (typeof c !== 'string' || !lvNames.has(c)) {
            errors.push(`高階構念「${h.name}」的低階構念「${c}」不是已宣告的潛在變數`)
            compOk = false
            continue
          }
          if (seenC.has(c)) { errors.push(`高階構念「${h.name}」的低階構念「${c}」重複`); compOk = false }
          seenC.add(c)
          if (componentOwner.has(c)) {
            errors.push(`低階構念「${c}」同時屬於「${componentOwner.get(c)}」與「${h.name}」（一個低階構念只能屬於一個高階構念）`)
            compOk = false
          }
          componentOwner.set(c, h.name)
        }
        const mode = h.mode ?? 'reflective'
        if (mode !== 'reflective' && mode !== 'formative') {
          errors.push(`高階構念「${h.name}」的 mode 必須是 'reflective' 或 'formative'，收到「${h.mode}」`)
        }
        const method = h.method ?? 'repeated'
        if (method !== 'repeated' && method !== 'two-stage' && method !== 'disjoint') {
          errors.push(`高階構念「${h.name}」的 method 必須是 'repeated'、'two-stage' 或 'disjoint'，收到「${h.method}」`)
        }
        hocMethods.add(method)
        if (compOk) {
          hocByName.set(h.name, h)
          normalizedHOCs.push({ name: h.name, components: [...h.components], mode, method })
        }
      }
      if (hocMethods.size > 1) {
        errors.push('多個高階構念的 method 必須一致（repeated / two-stage / disjoint 擇一）')
      }
    }
  }

  /* ── W4：interactions（調節／二次效果）宣告 ── */
  const intByName = new Map()
  const normalizedInts = []
  if (model.interactions !== undefined && model.interactions !== null) {
    if (!Array.isArray(model.interactions)) {
      errors.push('interactions 必須是陣列')
    } else {
      const intMethods = new Set()
      for (let i = 0; i < model.interactions.length; i++) {
        const it = model.interactions[i]
        if (!it || typeof it !== 'object' || typeof it.name !== 'string' || it.name.trim() === '') {
          errors.push(`第 ${i + 1} 個交互項缺少有效名稱`)
          continue
        }
        if (lvNames.has(it.name) || indicatorOwner.has(it.name)
            || hocByName.has(it.name) || intByName.has(it.name)) {
          errors.push(`交互項名稱「${it.name}」與既有潛在變數／指標／高階構念／交互項重複`)
        }
        if (!Array.isArray(it.factors) || it.factors.length < 2) {
          errors.push(`交互項「${it.name}」的 factors 必須是至少 2 個構念的陣列`)
          continue
        }
        const method = it.method ?? 'two-stage'
        if (method !== 'two-stage' && method !== 'product-indicator' && method !== 'orthogonal') {
          errors.push(`交互項「${it.name}」的 method 必須是 'two-stage'、'product-indicator' 或 'orthogonal'，收到「${it.method}」`)
        }
        intMethods.add(method)
        for (const f of it.factors) {
          if (typeof f !== 'string' || (!lvNames.has(f) && !hocByName.has(f))) {
            errors.push(`交互項「${it.name}」的 factor「${f}」不是已宣告的潛在變數或高階構念`)
          } else if (componentOwner.has(f)) {
            errors.push(`交互項「${it.name}」的 factor「${f}」是高階構念「${componentOwner.get(f)}」的低階構念（低階構念由高階構念吸收，不能單獨作為 factor）`)
          }
        }
        if (method !== 'two-stage') {
          if (it.factors.length !== 2 || it.factors[0] === it.factors[1]) {
            errors.push(`交互項「${it.name}」：product indicator / orthogonalizing 只支援兩個相異構念（二次效果與三向以上請用 two-stage）`)
          } else {
            for (const f of it.factors) {
              const flv = normalizedLVs.find((q) => q.name === f)
              if (!flv) {
                errors.push(`交互項「${it.name}」：product indicator / orthogonalizing 的 factor 必須是一般（非高階）構念，「${f}」不是`)
              } else if (flv.mode !== 'reflective') {
                errors.push(`交互項「${it.name}」：product indicator / orthogonalizing 只支援反映型 factor（「${f}」是形成型）`)
              }
            }
          }
        }
        intByName.set(it.name, it)
        normalizedInts.push({ name: it.name, factors: [...it.factors], method })
      }
      if (intMethods.size > 1) {
        errors.push('多個交互項的 method 必須一致（two-stage / product-indicator / orthogonal 擇一）')
      }
    }
  }

  const paths = model.paths
  if (!Array.isArray(paths) || paths.length < 1) {
    errors.push('paths 必須是陣列且至少包含 1 條路徑')
    return { ok: false, errors }
  }
  const isConstruct = (x) => lvNames.has(x) || hocByName.has(x)
  const pathKeys = new Set()
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i]
    if (!p || typeof p.from !== 'string' || typeof p.to !== 'string') {
      errors.push(`第 ${i + 1} 條路徑必須含 from 與 to（字串）`)
      continue
    }
    if (!isConstruct(p.from) && !intByName.has(p.from)) {
      errors.push(`路徑 from「${p.from}」不是已宣告的潛在變數`)
    }
    if (intByName.has(p.to)) {
      errors.push(`路徑 to「${p.to}」是交互項——交互項只能作為前置（from），不能被解釋（to）`)
    } else if (!isConstruct(p.to)) {
      errors.push(`路徑 to「${p.to}」不是已宣告的潛在變數`)
    }
    if (componentOwner.has(p.from) || componentOwner.has(p.to)) {
      const loc = componentOwner.has(p.from) ? p.from : p.to
      errors.push(`路徑「${p.from} → ${p.to}」使用了低階構念「${loc}」——低階構念由高階構念「${componentOwner.get(loc)}」吸收，結構路徑請改用高階構念`)
    }
    if (p.from === p.to) errors.push(`路徑「${p.from} → ${p.to}」是自環，不允許`)
    const key = `${p.from}→${p.to}`
    if (pathKeys.has(key)) errors.push(`路徑「${key}」重複宣告`)
    pathKeys.add(key)
  }

  // 交互項必須出現在至少一條路徑（作為 from）
  for (const name of intByName.keys()) {
    if (!paths.some((p) => p && p.from === name)) {
      errors.push(`交互項「${name}」未出現在任何路徑中（至少需要一條 ${name} → 依變數 的路徑）`)
    }
  }

  // 無環檢查（Kahn 拓撲排序）：節點 = 一般構念（非 LOC）＋高階構念；
  // 交互項路徑 I→Y 以「各 factor→Y」的依賴邊展開（調節變數不可同時是其依變數）
  if (errors.length === 0) {
    const nodes = new Set([...lvNames].filter((n) => !componentOwner.has(n)))
    for (const h of hocByName.keys()) nodes.add(h)
    const indeg = new Map([...nodes].map((n) => [n, 0]))
    const adj = new Map([...nodes].map((n) => [n, []]))
    const addEdge = (a, b) => {
      adj.get(a).push(b)
      indeg.set(b, indeg.get(b) + 1)
    }
    for (const p of paths) {
      if (intByName.has(p.from)) {
        for (const f of new Set(intByName.get(p.from).factors)) addEdge(f, p.to)
      } else {
        addEdge(p.from, p.to)
      }
    }
    const queue = [...nodes].filter((n) => indeg.get(n) === 0)
    let visited = 0
    while (queue.length) {
      const u = queue.shift()
      visited++
      for (const v of adj.get(u)) {
        indeg.set(v, indeg.get(v) - 1)
        if (indeg.get(v) === 0) queue.push(v)
      }
    }
    if (visited !== nodes.size) {
      errors.push('結構模型含循環路徑（PLS-SEM 要求遞迴模型，路徑圖必須無環；含調節時，調節變數與其交互項的依變數之間也不可形成循環）')
    }
    // 孤立構念：一般構念（非 LOC）與高階構念必須出現在路徑中或作為交互項 factor
    const connected = new Set()
    for (const p of paths) {
      if (!intByName.has(p.from)) connected.add(p.from)
      connected.add(p.to)
    }
    for (const it of intByName.values()) for (const f of it.factors) connected.add(f)
    for (const n of nodes) {
      if (!connected.has(n)) errors.push(`潛在變數「${n}」未出現在任何路徑中（孤立 LV 無法估計內部權重）`)
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    model: {
      schemaVersion: ver,
      latentVariables: normalizedLVs,
      paths: paths.map((p) => ({ from: p.from, to: p.to })),
      ...(normalizedHOCs.length > 0 ? { higherOrder: normalizedHOCs } : {}),
      ...(normalizedInts.length > 0 ? { interactions: normalizedInts } : {}),
    },
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
  let kept
  if (missing === 'mean') {
    const means = new Array(p)
    for (let j = 0; j < p; j++) {
      let s = 0, c = 0
      for (const vec of raw) if (!Number.isNaN(vec[j])) { s += vec[j]; c++ }
      means[j] = s / c
    }
    X = raw.map((vec) => vec.map((v, j) => (Number.isNaN(v) ? means[j] : v)))
    kept = raw.map((_, i) => i)
  } else if (missing === 'pairwise') {
    // pairwise deletion：不剔除任何列、不補值——NaN 原樣留著。
    // 相關矩陣以 pairwise-complete 計算；LV 分數用 zero-imputed 標準化值
    // （＝原尺度的均值補值）加權，僅供 IPMA／預測／分段等下游使用。見 handoff §6.7。
    X = raw
    kept = raw.map((_, i) => i)
  } else { // casewise（預設）
    X = []
    kept = []
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].every((v) => !Number.isNaN(v))) { X.push(raw[i]); kept.push(i) }
    }
    nDropped = raw.length - X.length
  }
  return { X, n: X.length, nDropped, kept }
}

/**
 * pairwise-complete 相關矩陣：R[a][b] 只用「a、b 兩欄同時可觀察」的列計算。
 * 對角線為 1。可用配對數 < 3 或任一欄在該配對上零變異 → 該格回傳 NaN（呼叫端負責報錯）。
 * 回傳 { R, minPairs }。
 */
function pairwiseCorrMatrix(cols) {
  const p = cols.length
  const n = cols[0].length
  const R = []
  for (let a = 0; a < p; a++) R.push(new Array(p).fill(1))
  let minPairs = n
  for (let a = 0; a < p; a++) {
    for (let b = a + 1; b < p; b++) {
      let cnt = 0, sa = 0, sb = 0
      for (let i = 0; i < n; i++) {
        const va = cols[a][i], vb = cols[b][i]
        if (Number.isNaN(va) || Number.isNaN(vb)) continue
        cnt++; sa += va; sb += vb
      }
      if (cnt < minPairs) minPairs = cnt
      if (cnt < 3) { R[a][b] = NaN; R[b][a] = NaN; continue }
      const ma = sa / cnt, mb = sb / cnt
      let saa = 0, sbb = 0, sab = 0
      for (let i = 0; i < n; i++) {
        const va = cols[a][i], vb = cols[b][i]
        if (Number.isNaN(va) || Number.isNaN(vb)) continue
        const da = va - ma, db = vb - mb
        saa += da * da; sbb += db * db; sab += da * db
      }
      const den = Math.sqrt(saa * sbb)
      const v = den > 0 ? sab / den : NaN
      R[a][b] = v
      R[b][a] = v
    }
  }
  return { R, minPairs }
}

/**
 * 加權相關矩陣（WPLS）：以抽樣權重 w_i 計算加權平均、加權共變異與加權相關。
 *   μ_j = Σw·x / Σw；cov_ab = Σw(x_a−μ_a)(x_b−μ_b) / Σw；R_ab = cov_ab / √(cov_aa·cov_bb)
 * 權重同乘一個常數不影響結果（相關為尺度不變量）。
 * 零變異欄回傳 { zeroVarIndex }。
 */
function weightedCorrMatrix(cols, w) {
  const p = cols.length
  const n = cols[0].length
  let sw = 0
  for (let i = 0; i < n; i++) sw += w[i]
  const mu = new Array(p)
  for (let j = 0; j < p; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s += w[i] * cols[j][i]
    mu[j] = s / sw
  }
  const cov = []
  for (let a = 0; a < p; a++) cov.push(new Array(p).fill(0))
  for (let a = 0; a < p; a++) {
    for (let b = a; b < p; b++) {
      let s = 0
      for (let i = 0; i < n; i++) s += w[i] * (cols[a][i] - mu[a]) * (cols[b][i] - mu[b])
      cov[a][b] = s / sw
      cov[b][a] = cov[a][b]
    }
  }
  for (let j = 0; j < p; j++) if (!(cov[j][j] > 0)) return { zeroVarIndex: j }
  const R = []
  for (let a = 0; a < p; a++) {
    R.push(new Array(p))
    for (let b = 0; b < p; b++) {
      R[a][b] = a === b ? 1 : cov[a][b] / Math.sqrt(cov[a][a] * cov[b][b])
    }
  }
  return { R, mu, sd: cov.map((row, j) => Math.sqrt(row[j])) }
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
 * ★ PLS 核心迭代（Lohmöller 1989）——**完全由指標相關矩陣 R 驅動**。
 *
 * 這是引擎的單一迭代實作。三個入口共用它：
 *   1. 完整資料：R = 標準化欄位的相關矩陣（`estimateCore` 的薄包裝）
 *   2. pairwise deletion：R = pairwise-complete 相關矩陣
 *   3. WPLS（抽樣權重）：R = 加權相關矩陣
 *
 * 為什麼可以純由 R 驅動（設計見 handoff-roadmap §6.7）：
 *   · 分數 y_j = Σ_h w_jh·z_h  →  Var(y_j) = w_j'R_jj w_j、corr(y_j,y_k) = w_j'R_jk w_k
 *   · 內部估計 Z_j = Σ_k e_jk·y_k  →  cov(z_h, Z_j) = Σ_k e_jk·(Σ_g w_kg·R[h][g])
 *   · Mode A 外部權重 ∝ corr(z_h, Z_j)；Mode B 為 S_bb⁻¹·r —— 兩者都只吃上式
 *   · 三種 scheme 的內部權重皆由 LV 相關矩陣導出
 *   · loadings、lvCorr、信效度、HTMT、model fit 本來就只吃 R
 *
 * 一個關鍵簡化：原實作用 corr(z_h, Z_j)（除以 sd(Z_j)），本實作用 cov(z_h, Z_j)。
 * 因為 sd(Z_j) 對整個區塊是同一個純量，權重隨後又被縮放成 Var(y_j)=1 → 該因子完全相消，
 * 兩者的正規化結果**逐位相同**。少一次開根號，也少一個數值誤差來源。
 *
 * spec：{ blocks, modes, pred, succ, scheme, tolerance, maxIterations }
 * @returns { weights: Float64Array[], iterations, converged } | null（數值失敗）
 */
function estimateCoreFromCorr(R, spec) {
  const { blocks, modes, pred, succ, scheme, tolerance, maxIterations } = spec
  const L = blocks.length

  // Mode B 區塊：指標相關子矩陣的反矩陣在迭代間不變，預先計算
  let SbInv = null
  if (modes.some((m) => m === 'B')) {
    SbInv = blocks.map((b, j) => {
      if (modes[j] !== 'B' || b.length < 2) return null
      const Sb = b.map((a) => b.map((c) => R[a][c]))
      return inverse(Sb)
    })
    for (let j = 0; j < L; j++) {
      if (modes[j] === 'B' && blocks[j].length >= 2 && !SbInv[j]) return null
    }
  }

  /** Var(y_j) = w_j'·R_jj·w_j */
  const varOf = (j, w) => {
    const b = blocks[j]
    let v = 0
    for (let a = 0; a < b.length; a++) {
      for (let c = 0; c < b.length; c++) v += w[a] * w[c] * R[b[a]][b[c]]
    }
    return v
  }
  /** corr(y_j, y_k) = w_j'·R_jk·w_k（兩者皆為單位變異） */
  const lvCorrOf = (W, j, k) => {
    const bj = blocks[j]
    const bk = blocks[k]
    let v = 0
    for (let a = 0; a < bj.length; a++) {
      for (let c = 0; c < bk.length; c++) v += W[j][a] * W[k][c] * R[bj[a]][bk[c]]
    }
    return v
  }
  /** corr(z_h, y_k) = Σ_g w_kg·R[h][g] */
  const indLvCorr = (W, h, k) => {
    const bk = blocks[k]
    let v = 0
    for (let g = 0; g < bk.length; g++) v += W[k][g] * R[h][bk[g]]
    return v
  }
  /** 權重縮放為單位變異；失敗回傳 false */
  const normalize = (j, w) => {
    const v = varOf(j, w)
    if (!(v > 0) || !Number.isFinite(v)) return false
    const s = Math.sqrt(v)
    for (let h = 0; h < w.length; h++) w[h] /= s
    return true
  }

  // 權重初始化為 1，縮放為單位變異分數
  let W = blocks.map((b) => Float64Array.from({ length: b.length }, () => 1))
  for (let j = 0; j < L; j++) if (!normalize(j, W[j])) return null

  let iterations = 0
  let converged = false

  while (iterations < maxIterations) {
    iterations++

    // 內部權重 e_jk（僅需係數，不需實際的 Z 向量）
    const E = blocks.map(() => new Map())
    for (let j = 0; j < L; j++) {
      if (scheme === 'path') {
        // 前置 LV：OLS 迴歸係數
        const P = pred[j]
        if (P.length > 0) {
          const Rpp = P.map((a) => P.map((b) => (a === b ? 1 : lvCorrOf(W, a, b))))
          const rpy = P.map((a) => lvCorrOf(W, a, j))
          let bcoef
          if (P.length === 1) {
            bcoef = [rpy[0]]
          } else {
            const Rinv = inverse(Rpp)
            if (!Rinv) return null
            bcoef = Rinv.map((row) => row.reduce((s, v, k) => s + v * rpy[k], 0))
          }
          for (let k = 0; k < P.length; k++) E[j].set(P[k], (E[j].get(P[k]) ?? 0) + bcoef[k])
        }
        // 後繼 LV：相關係數
        for (const sIdx of succ[j]) {
          E[j].set(sIdx, (E[j].get(sIdx) ?? 0) + lvCorrOf(W, j, sIdx))
        }
      } else {
        // factorial / centroid：所有相鄰 LV
        const nb = new Set([...pred[j], ...succ[j]])
        for (const k of nb) {
          let e = lvCorrOf(W, j, k)
          if (scheme === 'centroid') e = e >= 0 ? 1 : -1
          E[j].set(k, (E[j].get(k) ?? 0) + e)
        }
      }
    }

    // 外部權重（Mode A：cov(z_h, Z_j)；Mode B：S_bb⁻¹·r），再縮放為單位變異
    const Wnew = []
    for (let j = 0; j < L; j++) {
      const b = blocks[j]
      // c_h = cov(z_h, Z_j) = Σ_k e_jk · corr(z_h, y_k)
      const c = new Float64Array(b.length)
      for (let h = 0; h < b.length; h++) {
        let v = 0
        for (const [k, e] of E[j]) v += e * indLvCorr(W, b[h], k)
        c[h] = v
      }
      const w = new Float64Array(b.length)
      if (modes[j] === 'B' && b.length >= 2) {
        const Sinv = SbInv[j]
        for (let h = 0; h < b.length; h++) {
          let s = 0
          for (let k = 0; k < b.length; k++) s += Sinv[h][k] * c[k]
          w[h] = s
        }
      } else {
        for (let h = 0; h < b.length; h++) w[h] = c[h]
      }
      if (!normalize(j, w)) return null
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

  // 符號定向：每個 LV 與所屬指標的相關總和為正（dominant orientation）
  for (let j = 0; j < L; j++) {
    let s = 0
    for (const h of blocks[j]) s += indLvCorr(W, h, j)
    if (s < 0) for (let h = 0; h < W[j].length; h++) W[j][h] = -W[j][h]
  }

  return { weights: W, iterations, converged }
}

/**
 * 對「已標準化欄位」執行 PLS 迭代（Mode A/B × path/factorial/centroid）。
 *
 * 薄包裝：R ← 欄位相關矩陣 → `estimateCoreFromCorr` → 由欄位算出 LV 分數。
 * 迭代邏輯的單一事實來源在 `estimateCoreFromCorr`。
 *
 * @returns { weights: Float64Array[], scores: Float64Array[], iterations, converged } | null
 */
function estimateCore(cols, n, spec) {
  const core = estimateCoreFromCorr(spec.corrMatrix ?? corrMatrixOf(cols), spec)
  if (!core) return null
  const scores = scoresFromWeights(cols, n, spec.blocks, core.weights)
  if (!scores) return null
  return { weights: core.weights, scores, iterations: core.iterations, converged: core.converged }
}

/**
 * 由權重與（標準化）欄位算出 LV 分數。
 * 權重已縮放為「在 R 的度量下」單位變異；分數這裡不再重新標準化，
 * 完整資料時 sd(y) = 1（浮點誤差內）。pairwise / WPLS 時 R 與樣本共變異不一致，
 * 分數的 sd 未必恰為 1 —— 這是刻意的：分數只供 IPMA / 預測 / 分段等下游使用，
 * 統計量（loadings、lvCorr、信效度、fit）一律走 R，不受影響（文件見 handoff §6.7）。
 */
function scoresFromWeights(cols, n, blocks, W) {
  const Y = []
  for (let j = 0; j < blocks.length; j++) {
    const b = blocks[j]
    const y = new Float64Array(n)
    for (let h = 0; h < b.length; h++) {
      const z = cols[b[h]]
      const w = W[j][h]
      for (let i = 0; i < n; i++) y[i] += w * z[i]
    }
    if (!Number.isFinite(y[0])) return null
    Y.push(y)
  }
  return Y
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
    // IT 模型選擇準則（Sharma et al. 2019）：SSE = (n−1)(1−R²)（標準化分數）
    const sse = (n - 1) * (1 - full.r2)
    let itc = null
    if (sse > 1e-12 && n - k - 2 > 0) {
      const base = n * Math.log(sse / n)
      itc = {
        aic: base + 2 * (k + 1),
        aicc: base + 2 * (k + 1) + (2 * (k + 1) * (k + 2)) / (n - k - 2),
        bic: base + (k + 1) * Math.log(n),
        hq: base + 2 * (k + 1) * Math.log(Math.log(n)),
      }
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
    structural.push({ lv: lvNames[j], r2: full.r2, adjR2, itCriteria: itc, predictors })
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

/** HTMT 矩陣（Henseler et al. 2015）；不合格配對（單指標或形成型）為 null。
 *  blockedPairs（W4）：`a|b` 索引鍵集合——repeated indicators 高階構念與其低階構念
 *  共用指標，HTMT 分母含重複指標的 r=1，數值無效 → 該配對回傳 null */
function htmtMatrix(blocks, eligible, indCorr, L, blockedPairs = null) {
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
      if (blockedPairs && (blockedPairs.has(`${a}|${b}`) || blockedPairs.has(`${b}|${a}`))) continue
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

function buildSpec(model, options, allowSharedIndicators = false) {
  const v = validatePLSModel(model, allowSharedIndicators)
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
  // pairwise / WPLS：分數是 zero-imputed（或加權標準化）值的加權和，其樣本相關
  // 不等於 pairwise／加權相關矩陣的對應量。統計量一律回到 R 算（handoff §6.7 的設計）。
  const R = spec.corrMatrix
  const rawLoadingsByLV = R
    ? spec.blocks.map((b, j) => b.map((h) => {
      let v = 0
      for (let g = 0; g < b.length; g++) v += est.weights[j][g] * R[h][b[g]]
      return v
    }))
    : spec.blocks.map((b, j) => b.map((h) => corrOf(cols[h], est.scores[j])))
  const lvCorr = []
  for (let a = 0; a < L; a++) {
    lvCorr.push(new Array(L))
    for (let b = 0; b < L; b++) {
      if (a === b) { lvCorr[a][b] = 1; continue }
      if (R) {
        const ba = spec.blocks[a]
        const bb = spec.blocks[b]
        let v = 0
        for (let g = 0; g < ba.length; g++) {
          for (let h = 0; h < bb.length; h++) v += est.weights[a][g] * est.weights[b][h] * R[ba[g]][bb[h]]
        }
        lvCorr[a][b] = v
      } else {
        lvCorr[a][b] = corrOf(est.scores[a], est.scores[b])
      }
    }
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

/* ─────────────────────────  W4 管線（調節／高階構念／中介）  ───────────────────────── */

/** rows-major 矩陣 → 欄位池（name → 原始值 Float64Array） */
function toColumnPool(X, names) {
  const n = X.length
  const pool = new Map()
  names.forEach((name, j) => {
    const col = new Float64Array(n)
    for (let i = 0; i < n; i++) col[i] = X[i][j]
    pool.set(name, col)
  })
  return pool
}

/**
 * 欄位陣列逐欄 z-score（ddof=1；不改動原欄）。零變異回傳該欄 index。
 *
 * @param {object} [opt] {
 *   pairwise: true    → 平均／標準差只用該欄的可觀察值；NaN 標準化後填 0
 *                      （＝原尺度的均值補值）。只影響「分數」，統計量走 pairwise 相關矩陣。
 *   rowWeights        → 加權平均／加權標準差（WPLS）
 * }
 */
function standardizeColArrays(raws, opt = {}) {
  const { pairwise, rowWeights } = opt
  const cols = []
  for (let j = 0; j < raws.length; j++) {
    const srcCol = raws[j]
    const n = srcCol.length
    if (pairwise || rowWeights) {
      let sw = 0, sx = 0
      for (let i = 0; i < n; i++) {
        const v = srcCol[i]
        if (Number.isNaN(v)) continue
        const w = rowWeights ? rowWeights[i] : 1
        sw += w; sx += w * v
      }
      if (!(sw > 0)) return { zeroVarIndex: j }
      const m = sx / sw
      let ss = 0
      for (let i = 0; i < n; i++) {
        const v = srcCol[i]
        if (Number.isNaN(v)) continue
        const w = rowWeights ? rowWeights[i] : 1
        ss += w * (v - m) * (v - m)
      }
      const sd = Math.sqrt(ss / sw)
      if (!(sd > 0)) return { zeroVarIndex: j }
      const col = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        col[i] = Number.isNaN(srcCol[i]) ? 0 : (srcCol[i] - m) / sd
      }
      cols.push(col)
      continue
    }
    const m = meanOf(srcCol)
    let ss = 0
    for (let i = 0; i < n; i++) { const d = srcCol[i] - m; ss += d * d }
    const s = Math.sqrt(ss / (n - 1))
    if (!(s > 0)) return { zeroVarIndex: j }
    const col = new Float64Array(n)
    for (let i = 0; i < n; i++) col[i] = (srcCol[i] - m) / s
    cols.push(col)
  }
  return { cols }
}

/** y 對 [1, xcols…] 的 OLS 殘差（orthogonalizing 法用；Little et al. 2006） */
function residualizeOn(y, xcols) {
  const n = y.length
  const k = xcols.length + 1
  const Xd = [(new Float64Array(n)).fill(1), ...xcols]
  const XtX = []
  for (let a = 0; a < k; a++) {
    XtX.push(new Array(k))
    for (let b = 0; b < k; b++) {
      let s = 0
      for (let i = 0; i < n; i++) s += Xd[a][i] * Xd[b][i]
      XtX[a][b] = s
    }
  }
  const Xty = new Array(k)
  for (let a = 0; a < k; a++) {
    let s = 0
    for (let i = 0; i < n; i++) s += Xd[a][i] * y[i]
    Xty[a] = s
  }
  const inv = inverse(XtX)
  if (!inv) return null
  const beta = inv.map((row) => row.reduce((s, v, q) => s + v * Xty[q], 0))
  const res = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let yhat = 0
    for (let a = 0; a < k; a++) yhat += beta[a] * Xd[a][i]
    res[i] = y[i] - yhat
  }
  return res
}

/**
 * 模型層計畫：驗證 → 正規化 → 自動補調節主效果路徑 → 需要的原始指標清單。
 * 純模型/選項層，與資料無關（bootstrap 只建一次）。
 */
function buildPlan(model, options) {
  const v = validatePLSModel(model)
  if (!v.ok) return { error: 'invalid-model', message: v.errors.join('；'), errors: v.errors }
  const m = v.model
  const rawScheme = options.scheme ?? 'path'
  const scheme = SCHEME_ALIASES[rawScheme]
  if (!scheme) {
    return { error: 'scheme-not-supported', message: `未知的 weighting scheme「${rawScheme}」（支援 path / factorial / centroid）` }
  }
  const hocs = m.higherOrder || []
  const ints = m.interactions || []
  if (options.consistent === true && (hocs.length > 0 || ints.length > 0)) {
    return {
      error: 'plsc-w4-not-supported',
      message: 'PLSc（consistent PLS）目前不支援與調節／高階構念併用；請關閉 PLSc 或改用一般（composite）估計',
    }
  }
  // 自動補主效果路徑（SmartPLS 4 Moderation 行為：交互項指向 Y 時，各 factor 也須直接指向 Y）
  const pathKeys = new Set(m.paths.map((q) => `${q.from}→${q.to}`))
  const autoAddedPaths = []
  for (const it of ints) {
    for (const q of m.paths) {
      if (q.from !== it.name) continue
      for (const f of new Set(it.factors)) {
        const k = `${f}→${q.to}`
        if (!pathKeys.has(k)) {
          pathKeys.add(k)
          autoAddedPaths.push({ from: f, to: q.to })
        }
      }
    }
  }
  const fullPaths = [...m.paths.map((q) => ({ from: q.from, to: q.to })), ...autoAddedPaths]
  const baseIndicators = []
  const seen = new Set()
  for (const lv of m.latentVariables) {
    for (const ind of lv.indicators) {
      if (!seen.has(ind)) { seen.add(ind); baseIndicators.push(ind) }
    }
  }
  return {
    model: m,
    hocs,
    ints,
    hocMethod: hocs.length > 0 ? hocs[0].method : null,
    interactionMethod: ints.length > 0 ? ints[0].method : null,
    hasStages: (hocs.length > 0 && hocs[0].method !== 'repeated')
      || (ints.length > 0 && ints[0].method === 'two-stage'),
    autoAddedPaths,
    fullPaths,
    baseIndicators,
    scheme,
    consistent: options.consistent === true,
    tolerance: options.tolerance ?? 1e-7,
    maxIterations: options.maxIterations ?? 300,
    missing: options.missing ?? 'casewise',
  }
}

/** 在欄位池上執行一次完整 PLS 估計（buildSpec → 標準化 → coreEstimates） */
function estimateStage(pool, n, modelS, plan, allowShared) {
  const spec = buildSpec(modelS, {
    scheme: plan.scheme,
    consistent: plan.consistent,
    tolerance: plan.tolerance,
    maxIterations: plan.maxIterations,
    missing: plan.missing,
  }, allowShared)
  if (spec.error) return spec
  const raws = []
  for (const name of spec.indicators) {
    const col = pool.get(name)
    if (!col) return { error: 'missing-column', message: `管線內部錯誤：找不到欄位「${name}」` }
    raws.push(col)
  }
  const pairwise = plan.missing === 'pairwise'
  const rowWeights = plan.rowWeights ?? null
  const std = standardizeColArrays(raws, { pairwise, rowWeights })
  if (std.zeroVarIndex !== undefined) {
    return { error: 'zero-variance', message: `指標「${spec.indicators[std.zeroVarIndex]}」變異數為零，無法標準化` }
  }

  // pairwise / WPLS：相關矩陣不從（zero-imputed／加權標準化）欄位重算，另行建構後掛進 spec。
  // 迭代、loadings、lvCorr、信效度、HTMT、model fit 全部走它（handoff §6.7 的相關矩陣驅動設計）。
  spec.stageWarnings = []
  if (pairwise) {
    const pw = pairwiseCorrMatrix(raws)
    for (let a = 0; a < spec.indicators.length; a++) {
      for (let b = 0; b < spec.indicators.length; b++) {
        if (Number.isNaN(pw.R[a][b])) {
          return {
            error: 'pairwise-too-sparse',
            message: `指標「${spec.indicators[a]}」與「${spec.indicators[b]}」同時可觀察的資料列少於 3 筆（或其一在該配對上零變異），pairwise 相關無法計算`,
          }
        }
      }
    }
    spec.corrMatrix = pw.R
    const eig = jacobiEigen(pw.R.map((row) => [...row]))
    const minEig = Math.min(...eig.values)
    if (minEig < -1e-8) {
      spec.stageWarnings.push(`pairwise 相關矩陣非半正定（最小特徵值 ${minEig.toFixed(4)}）——不同的相關係數來自不同的子樣本，彼此可能不相容。信效度與 model fit 指標在此情形下可能落在合理範圍外，請謹慎解讀；缺失比例高時建議改用 casewise 或先做多重插補`)
    }
    spec.stageWarnings.push(`pairwise deletion：相關矩陣的每一格只用「該配對同時可觀察」的列計算（最少的一格有 ${pw.minPairs} 筆）；LV 分數則以均值補值後的標準化值加權，僅供 IPMA／預測／分段等下游使用`)
  } else if (rowWeights) {
    const wc = weightedCorrMatrix(raws, rowWeights)
    if (wc.zeroVarIndex !== undefined) {
      return { error: 'zero-variance', message: `指標「${spec.indicators[wc.zeroVarIndex]}」在加權後變異數為零` }
    }
    spec.corrMatrix = wc.R
  }

  const ce = coreEstimates(std.cols, n, spec)
  if (!ce) {
    return { error: 'estimation-failed', message: 'PLS 迭代過程出現數值退化（零變異 LV 分數或奇異矩陣），請檢查指標間是否極度共線' }
  }
  if (ce.notConverged) {
    return { error: 'not-converged', message: `PLS 迭代在 ${spec.maxIterations} 次內未收斂（準則 ${spec.tolerance}），不回傳半成品結果；請檢查資料品質或模型設定` }
  }
  return { spec, cols: std.cols, n, ce }
}

/** repeated indicators 展開：HOC 區塊 = 全部 LOC 指標；反映型 HOC→LOC、形成型 LOC→HOC */
function hocExpandModel(lvsArr, pathsArr, hocs, allLVs) {
  const lvs = lvsArr.map((l) => ({ name: l.name, indicators: [...l.indicators], mode: l.mode }))
  const paths = pathsArr.map((q) => ({ from: q.from, to: q.to }))
  for (const h of hocs) {
    const inds = []
    for (const c of h.components) {
      const lv = allLVs.find((q) => q.name === c)
      inds.push(...lv.indicators)
    }
    lvs.push({ name: h.name, indicators: inds, mode: h.mode })
    for (const c of h.components) {
      paths.push(h.mode === 'formative' ? { from: c, to: h.name } : { from: h.name, to: c })
    }
  }
  return { lvs, paths }
}

/** disjoint 第一階段：無 HOC，由 LOC 直接承接 HOC 的所有結構關係 */
function hocDisjointStage1(lvsArr, pathsArr, hocs) {
  const hocNames = new Set(hocs.map((h) => h.name))
  const compOf = new Map(hocs.map((h) => [h.name, h.components]))
  const lvs = lvsArr.map((l) => ({ name: l.name, indicators: [...l.indicators], mode: l.mode }))
  const paths = []
  const key = new Set()
  const push = (a, b) => {
    const k = `${a}→${b}`
    if (!key.has(k)) { key.add(k); paths.push({ from: a, to: b }) }
  }
  for (const q of pathsArr) {
    const fromH = hocNames.has(q.from)
    const toH = hocNames.has(q.to)
    if (!fromH && !toH) push(q.from, q.to)
    else if (fromH && !toH) for (const c of compOf.get(q.from)) push(c, q.to)
    else if (!fromH && toH) for (const c of compOf.get(q.to)) push(q.from, c)
    else for (const ca of compOf.get(q.from)) for (const cb of compOf.get(q.to)) push(ca, cb)
  }
  return { lvs, paths }
}

/**
 * 執行整條估計管線：HOC 解析（repeated 展開／two-stage／disjoint）→
 * 交互項解析（two-stage 分數乘積／product indicator／orthogonalizing）→ 最終估計。
 * anchors（bootstrap 符號校正用）：依估計順序的原始 effLoadingsByLV 陣列；
 * 中間階段的翻轉寫入下一階段資料（分數欄 × flip），最終階段翻轉由呼叫端套用於輸出。
 */
function executePlan(pool, n, plan, anchors) {
  const intNames = new Set(plan.ints.map((q) => q.name))
  const basePaths = plan.fullPaths.filter((q) => !intNames.has(q.from))
  const intPaths = plan.fullPaths.filter((q) => intNames.has(q.from))
  let curPool = pool
  let curLVs = plan.model.latentVariables.map((l) => ({ name: l.name, indicators: [...l.indicators], mode: l.mode }))
  let curPaths = basePaths
  let relaxed = false
  const estimations = [] // { st, flip } 依執行順序
  const notes = []
  const interactionInfo = []

  const computeFlip = (st) => {
    const L = st.spec.lvNames.length
    const flip = new Array(L).fill(1)
    const anchor = anchors ? anchors[estimations.length] : null
    if (!anchor) return flip
    for (let j = 0; j < L; j++) {
      const lj = st.ce.effLoadingsByLV[j]
      const aj = anchor[j]
      let dot = 0
      for (let h = 0; h < lj.length; h++) dot += lj[h] * aj[h]
      if (dot < 0) flip[j] = -1
    }
    return flip
  }
  const scoreColumn = (st, flip, name) => {
    const j = st.spec.lvNames.indexOf(name)
    const y = st.ce.est.scores[j]
    const f = flip[j]
    const c = new Float64Array(n)
    for (let i = 0; i < n; i++) c[i] = f * y[i]
    return c
  }

  /* ── 步驟 1：高階構念 ── */
  if (plan.hocs.length > 0) {
    if (plan.hocMethod === 'repeated') {
      const exp = hocExpandModel(curLVs, curPaths, plan.hocs, plan.model.latentVariables)
      curLVs = exp.lvs
      curPaths = exp.paths
      relaxed = true
      notes.push('高階構念（repeated indicators）：高階構念區塊＝全部低階構念指標，與最終模型同一次估計')
    } else {
      let s1
      if (plan.hocMethod === 'disjoint') {
        const dj = hocDisjointStage1(curLVs, curPaths, plan.hocs)
        s1 = estimateStage(curPool, n, { schemaVersion: 1, latentVariables: dj.lvs, paths: dj.paths }, plan, false)
      } else { // embedded two-stage
        const exp = hocExpandModel(curLVs, curPaths, plan.hocs, plan.model.latentVariables)
        s1 = estimateStage(curPool, n, { schemaVersion: 1, latentVariables: exp.lvs, paths: exp.paths }, plan, true)
      }
      if (s1.error) return s1
      const flip1 = computeFlip(s1)
      estimations.push({ st: s1, flip: flip1 })
      const compSet = new Set(plan.hocs.flatMap((h) => h.components))
      const pool2 = new Map()
      const lvs2 = []
      for (const h of plan.hocs) {
        const inds = h.components.map((c) => `${c}_score`)
        for (const c of h.components) pool2.set(`${c}_score`, scoreColumn(s1, flip1, c))
        lvs2.push({ name: h.name, indicators: inds, mode: h.mode })
      }
      for (const lv of curLVs) {
        if (compSet.has(lv.name)) continue
        if (plan.hocMethod === 'disjoint') {
          for (const ind of lv.indicators) pool2.set(ind, curPool.get(ind))
          lvs2.push({ name: lv.name, indicators: [...lv.indicators], mode: lv.mode })
        } else {
          pool2.set(`${lv.name}_score`, scoreColumn(s1, flip1, lv.name))
          lvs2.push({ name: lv.name, indicators: [`${lv.name}_score`], mode: 'reflective' })
        }
      }
      curPool = pool2
      curLVs = lvs2
      // curPaths 不變：驗證器保證使用者路徑只用 HOC 名稱、不含 LOC
      notes.push(plan.hocMethod === 'disjoint'
        ? '高階構念（disjoint two-stage）：第一階段低階構念直連結構、第二階段以其 LV 分數作為高階構念指標（其餘構念用原始指標）'
        : '高階構念（embedded two-stage）：第一階段 repeated indicators 取分數、第二階段全構念以分數估計')
    }
  }

  /* ── 步驟 2：交互項 ── */
  if (plan.ints.length > 0) {
    if (plan.interactionMethod === 'two-stage') {
      const sMain = estimateStage(curPool, n, { schemaVersion: 1, latentVariables: curLVs, paths: curPaths }, plan, relaxed)
      if (sMain.error) return sMain
      const flipM = computeFlip(sMain)
      estimations.push({ st: sMain, flip: flipM })
      const pool3 = new Map()
      const lvs3 = []
      for (const lv of curLVs) {
        pool3.set(`${lv.name}_score`, scoreColumn(sMain, flipM, lv.name))
        lvs3.push({ name: lv.name, indicators: [`${lv.name}_score`], mode: 'reflective' })
      }
      for (const it of plan.ints) {
        const prod = new Float64Array(n).fill(1)
        for (const f of it.factors) {
          const s = pool3.get(`${f}_score`)
          for (let i = 0; i < n; i++) prod[i] *= s[i]
        }
        const sd = sdOf(prod)
        if (!(sd > 0) || !Number.isFinite(sd)) {
          return { error: 'interaction-degenerate', message: `交互項「${it.name}」的分數乘積變異為零，無法估計` }
        }
        pool3.set(`${it.name}_score`, prod)
        lvs3.push({ name: it.name, indicators: [`${it.name}_score`], mode: 'reflective' })
        interactionInfo.push({ name: it.name, factors: [...it.factors], method: it.method, sdProduct: sd })
      }
      curPool = pool3
      curLVs = lvs3
      curPaths = [...curPaths, ...intPaths]
      relaxed = false
      notes.push('調節（two-stage）：第二階段以第一階段 LV 分數為單指標構念；交互項＝分數乘積、不標準化（SmartPLS 4 慣例），其路徑係數以未標準化乘積量尺回報')
    } else {
      // product indicator / orthogonalizing：資料層擴充，單一估計
      const isOrtho = plan.interactionMethod === 'orthogonal'
      curPool = new Map(curPool)
      curLVs = curLVs.map((l) => ({ name: l.name, indicators: [...l.indicators], mode: l.mode }))
      const zCache = new Map()
      const zOf = (name) => {
        if (zCache.has(name)) return zCache.get(name)
        const std = standardizeColArrays([curPool.get(name)])
        if (std.zeroVarIndex !== undefined) return null
        zCache.set(name, std.cols[0])
        return std.cols[0]
      }
      for (const it of plan.ints) {
        const lvA = curLVs.find((q) => q.name === it.factors[0])
        const lvB = curLVs.find((q) => q.name === it.factors[1])
        const prodNames = []
        for (const a of lvA.indicators) {
          for (const b of lvB.indicators) {
            const za = zOf(a)
            const zb = zOf(b)
            if (!za || !zb) return { error: 'zero-variance', message: `指標「${!za ? a : b}」變異數為零，無法建立交互項乘積指標` }
            let c = new Float64Array(n)
            for (let i = 0; i < n; i++) c[i] = za[i] * zb[i]
            if (isOrtho) {
              const firsts = [...lvA.indicators, ...lvB.indicators].map(zOf)
              c = residualizeOn(c, firsts)
              if (!c) return { error: 'estimation-failed', message: `交互項「${it.name}」的正交化殘差計算失敗（一階指標共線）` }
            }
            const nm = `${it.name}·${a}×${b}`
            curPool.set(nm, c)
            prodNames.push(nm)
          }
        }
        curLVs.push({ name: it.name, indicators: prodNames, mode: 'reflective' })
        interactionInfo.push({ name: it.name, factors: [...it.factors], method: it.method, sdProduct: null })
      }
      curPaths = [...curPaths, ...intPaths]
      notes.push(isOrtho
        ? '調節（orthogonalizing）：乘積指標對全部一階指標殘差化後作為交互構念指標（Little et al. 2006；係數為標準化量尺，對齊 seminr）'
        : '調節（product indicator）：交互構念指標＝兩構念標準化指標全配對乘積（Chin et al. 2003；係數為標準化量尺，對齊 seminr）')
    }
  }

  /* ── 步驟 3：最終估計 ── */
  const sF = estimateStage(curPool, n, { schemaVersion: 1, latentVariables: curLVs, paths: curPaths }, plan, relaxed)
  if (sF.error) return sF
  const flipF = computeFlip(sF)
  estimations.push({ st: sF, flip: flipF })

  // repeated HOC：HTMT 對 HOC×LOC 配對無效（共用指標）
  let htmtBlockedIdx = null
  if (plan.hocs.length > 0 && plan.hocMethod === 'repeated') {
    htmtBlockedIdx = new Set()
    for (const h of plan.hocs) {
      const a = sF.spec.lvNames.indexOf(h.name)
      for (const c of h.components) {
        const b = sF.spec.lvNames.indexOf(c)
        if (a >= 0 && b >= 0) htmtBlockedIdx.add(`${a}|${b}`)
      }
    }
  }

  // 「以 LV 分數產生新資料檔」：多階段時輸出最終階段的輸入資料
  let derived = null
  if (estimations.length > 1) {
    const columns = []
    const seenCol = new Set()
    for (const name of sF.spec.indicators) {
      if (!seenCol.has(name)) { seenCol.add(name); columns.push(name) }
    }
    const rows = []
    for (let i = 0; i < n; i++) {
      rows.push(columns.map((c) => curPool.get(c)[i]))
    }
    derived = { columns, rows }
  }

  return {
    final: sF,
    finalFlip: flipF,
    stage1: estimations.length > 1 ? estimations[0].st : null,
    estimations,
    interactionInfo,
    htmtBlockedIdx,
    derived,
    notes,
  }
}

/* ─────────────────────────  報表組裝  ───────────────────────── */

/**
 * 由單一估計階段組裝完整報表（W1–W3 的 runPLS 報表本體，抽出供多階段共用）。
 * ctx: { nRows, nDropped, warnings, htmtBlocked, skipFit }
 */
function reportFromStage(stage, ctx) {
  const { spec, cols, n, ce } = stage
  const { est, rawLoadingsByLV, effLoadingsByLV, effLvCorr, plsc, sm } = ce

  const warnings = [...(ctx.warnings || [])]
  if (plsc) warnings.push(...plsc.warnings)

  const { weights, scores } = est
  const L = spec.lvNames.length
  const p = spec.indicators.length

  // 指標相關矩陣（供信效度、HTMT、外部 VIF、model fit）
  // pairwise / WPLS 時直接用 spec.corrMatrix——不是從（zero-imputed／加權標準化）欄位重算
  let indCorr
  if (spec.corrMatrix) {
    indCorr = spec.corrMatrix
  } else {
    indCorr = []
    for (let a = 0; a < p; a++) {
      indCorr.push(new Array(p))
      for (let b = 0; b < p; b++) indCorr[a][b] = a === b ? 1 : corrOf(cols[a], cols[b])
    }
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
  const htmt = htmtMatrix(spec.blocks, htmtEligible, indCorr, L, ctx.htmtBlocked || null)

  // Model fit（多階段最終模型不報 fit：分數層級的殘差矩陣不具標準詮釋）
  let fit = null
  if (!ctx.skipFit) {
    const lamFlat = []
    const owner = []
    for (let j = 0; j < L; j++) {
      for (let h = 0; h < spec.blocks[j].length; h++) {
        lamFlat.push(effLoadingsByLV[j][h])
        owner.push(j)
      }
    }
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
      warnings.push('Model fit：指標相關矩陣接近奇異（重複掛載指標的 repeated indicators 模型屬預期情況），SRMR/d_ULS/d_G/NFI 無法計算')
    }
  }

  // GoF index（Tenenhaus et al. 2005；官方文件不建議作為適配指標，報表附註記）：
  // sqrt(mean communality × mean R²)——communality 限反映型多指標區塊、R² 取全部內生構念
  let gof = null
  if (!ctx.skipFit && sm.structural.length > 0) {
    const comm = []
    for (let j = 0; j < L; j++) {
      if (spec.modes[j] !== 'A' || spec.blocks[j].length < 2) continue
      for (const lam of effLoadingsByLV[j]) comm.push(lam * lam)
    }
    if (comm.length > 0) {
      const mC = comm.reduce((s, v) => s + v, 0) / comm.length
      const mR = sm.structural.reduce((s, q) => s + q.r2, 0) / sm.structural.length
      if (mC > 0 && mR > 0) gof = Math.sqrt(mC * mR)
    }
  }

  return {
    meta: {
      schemaVersion: PLS_SCHEMA_VERSION,
      n, nRows: ctx.nRows, nDropped: ctx.nDropped, missing: spec.missing,
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
    gof,
    ...(plsc ? { plsc: { rhoA: Object.fromEntries(spec.lvNames.map((name, j) => [name, plsc.rhoA[j]])) } } : {}),
  }
}

/** 交互項路徑係數重標：two-stage 的交互項以未標準化乘積量尺回報（coefStd 保留標準化值） */
function applyInteractionRescale(report, interactionInfo) {
  if (!interactionInfo || interactionInfo.length === 0) return
  const sdBy = new Map()
  for (const q of interactionInfo) {
    if (q.sdProduct !== null && Number.isFinite(q.sdProduct)) sdBy.set(q.name, q.sdProduct)
  }
  if (sdBy.size === 0) return
  for (const q of report.pathCoefficients) {
    if (sdBy.has(q.from)) {
      q.coefStd = q.coef
      q.coef = q.coef / sdBy.get(q.from)
    }
  }
  for (const s of report.structural) {
    for (const q of s.predictors) {
      if (sdBy.has(q.from)) {
        q.coefStd = q.coef
        q.coef = q.coef / sdBy.get(q.from)
      }
    }
  }
}

/** 交互項摘要（含 two-stage 二因子的 simple slopes；Aiken & West 1991：調節值 ±1 SD） */
function buildInteractionSummary(report, plan, exec) {
  const coefBy = new Map(report.pathCoefficients.map((q) => [`${q.from}→${q.to}`, q]))
  return plan.ints.map((it) => {
    const info = exec.interactionInfo.find((q) => q.name === it.name) || null
    const targets = []
    for (const q of report.pathCoefficients) {
      if (q.from !== it.name) continue
      const to = q.to
      const entry = { to, coef: q.coef, coefStd: q.coefStd ?? q.coef }
      if (it.method === 'two-stage' && it.factors.length === 2) {
        const [fa, fb] = it.factors
        if (fa === fb) {
          const bLin = coefBy.get(`${fa}→${to}`)?.coef ?? 0
          entry.quadratic = true
          entry.iv = fa
          entry.curve = { linear: bLin, quad: q.coef }
          entry.slopes = [-1, 0, 1].map((x) => ({ level: x, slope: bLin + 2 * q.coef * x }))
        } else {
          const bIv = coefBy.get(`${fa}→${to}`)?.coef ?? 0
          const bMod = coefBy.get(`${fb}→${to}`)?.coef ?? 0
          entry.quadratic = false
          entry.iv = fa
          entry.moderator = fb
          entry.slopes = [-1, 0, 1].map((m) => ({ level: m, slope: bIv + q.coef * m, intercept: bMod * m }))
        }
      }
      targets.push(entry)
    }
    return {
      name: it.name,
      factors: [...it.factors],
      method: it.method,
      sdProduct: info ? info.sdProduct : null,
      targets,
    }
  })
}

/* ─────────────────────────  中介效果  ───────────────────────── */

/**
 * 由最終模型路徑清單枚舉全部中介鏈（DFS 簡單路徑，長度 ≥ 2 條邊）。
 * 交互項不參與中介鏈（不作為來源也不作為中介）。
 * 回傳 [{ from, to, directIdx|null, chains: [{ idxSeq, via }] }]，
 * idxSeq 為 pathList 索引序列（bootstrap 以逐重抽乘積計算 CI）。
 */
function buildMediationChains(pathList, intFrom) {
  const adj = new Map()
  const idxByEdge = new Map()
  pathList.forEach((q, i) => {
    idxByEdge.set(`${q.from}→${q.to}`, i)
    if (intFrom.has(q.from)) return
    if (!adj.has(q.from)) adj.set(q.from, [])
    adj.get(q.from).push(q.to)
  })
  const nodes = []
  const seen = new Set()
  for (const q of pathList) {
    for (const nm of [q.from, q.to]) {
      if (!seen.has(nm) && !intFrom.has(nm)) { seen.add(nm); nodes.push(nm) }
    }
  }
  const pairs = []
  for (const a of nodes) {
    const chainsTo = new Map()
    const walk = (node, viaEdges, viaNodes) => {
      for (const nxt of adj.get(node) || []) {
        if (viaNodes.has(nxt)) continue
        const e = idxByEdge.get(`${node}→${nxt}`)
        const seq = [...viaEdges, e]
        if (seq.length >= 2) {
          if (!chainsTo.has(nxt)) chainsTo.set(nxt, [])
          chainsTo.get(nxt).push(seq)
        }
        viaNodes.add(nxt)
        walk(nxt, seq, viaNodes)
        viaNodes.delete(nxt)
      }
    }
    walk(a, [], new Set([a]))
    for (const [b, chains] of chainsTo) {
      const dKey = `${a}→${b}`
      pairs.push({
        from: a,
        to: b,
        directIdx: idxByEdge.has(dKey) ? idxByEdge.get(dKey) : null,
        chains: chains.map((seq) => ({
          idxSeq: seq,
          via: seq.slice(0, -1).map((ei) => pathList[ei].to),
        })),
      })
    }
  }
  return pairs
}

/** 中介分解點估計：direct / specific indirect / total indirect / total / VAF */
function buildMediationReport(pathCoefficients, plan) {
  const intFrom = new Set(plan.ints.map((q) => q.name))
  const pairs = buildMediationChains(pathCoefficients, intFrom)
  if (pairs.length === 0) return null
  const effects = pairs.map((pr) => {
    const chains = pr.chains.map((c) => ({
      via: c.via,
      coef: c.idxSeq.reduce((s, i) => s * pathCoefficients[i].coef, 1),
    }))
    const totalIndirect = chains.reduce((s, c) => s + c.coef, 0)
    const direct = pr.directIdx !== null ? pathCoefficients[pr.directIdx].coef : null
    const total = (direct ?? 0) + totalIndirect
    const vaf = Math.abs(total) > 1e-12 ? totalIndirect / total : null
    return { from: pr.from, to: pr.to, direct, chains, totalIndirect, total, vaf }
  })
  return { effects }
}

/* ─────────────────────────  主 API：runPLS  ───────────────────────── */

/**
 * @param {object[]} rows  資料（物件陣列，欄位名 → 值）
 * @param {object} model   模型 JSON（docs/pls-model-schema.md；W4 起支援
 *                          interactions[] 與 higherOrder[]）
 * @param {object} options { scheme:'path'|'factorial'|'centroid', consistent:boolean,
 *                           tolerance, maxIterations, missing:'casewise'|'mean' }
 */

/**
 * 抽樣權重（WPLS）：options.weights 可為欄位名（字串）或與 rows 等長的數值陣列。
 * 回傳 { weights: number[]（依 kept 過濾後）, nPositive } | { error, message } | null（未指定）。
 */
function resolveRowWeights(rows, options, kept) {
  const wspec = options.weights
  if (wspec === undefined || wspec === null) return null
  let raw
  if (typeof wspec === 'string') {
    raw = rows.map((r) => Number(r?.[wspec]))
    if (raw.every((v) => !Number.isFinite(v))) {
      return { error: 'wpls-bad-weights', message: `資料中找不到可用的權重欄位「${wspec}」` }
    }
  } else if (Array.isArray(wspec)) {
    if (wspec.length !== rows.length) {
      return { error: 'wpls-bad-weights', message: `weights 陣列長度（${wspec.length}）與資料列數（${rows.length}）不符` }
    }
    raw = wspec.map(Number)
  } else {
    return { error: 'wpls-bad-weights', message: 'weights 必須是欄位名（字串）或與資料等長的數值陣列' }
  }
  const w = kept.map((i) => raw[i])
  for (let i = 0; i < w.length; i++) {
    if (!Number.isFinite(w[i]) || w[i] < 0) {
      return { error: 'wpls-bad-weights', message: `第 ${kept[i] + 1} 列的抽樣權重不是有效的非負數值（收到 ${raw[kept[i]]}）` }
    }
  }
  const sum = w.reduce((a, v) => a + v, 0)
  if (!(sum > 0)) return { error: 'wpls-bad-weights', message: '抽樣權重總和為 0' }
  return { weights: w, nPositive: w.filter((v) => v > 0).length }
}

export function runPLS(rows, model, options = {}) {
  const plan = buildPlan(model, options)
  if (plan.error) return plan

  const ext = extractMatrix(rows, plan.baseIndicators, plan.missing)
  if (ext.error) return ext
  const { X, n, nDropped, kept } = ext
  if (n < 5) return { error: 'too-few-cases', message: `缺失值處理後樣本數只剩 ${n} 筆（至少需要 5 筆）` }

  const rw = resolveRowWeights(rows, options, kept)
  if (rw && rw.error) return rw
  if (rw) {
    plan.rowWeights = rw.weights
    plan.nPositiveWeights = rw.nPositive
  }

  const pool = toColumnPool(X, plan.baseIndicators)
  const exec = executePlan(pool, n, plan, null)
  if (exec.error) return exec

  const baseWarnings = []
  if (n < 30) baseWarnings.push(`樣本數偏低（n = ${n}），PLS 估計與 bootstrap 推論的穩定性有限`)
  if (nDropped > 0) baseWarnings.push(`casewise deletion 剔除 ${nDropped} 筆含缺失值的資料列`)
  if (plan.rowWeights) {
    baseWarnings.push(`WPLS（加權 PLS）：相關矩陣以抽樣權重加權計算；${n - plan.nPositiveWeights} 筆權重為 0 的資料列實質不參與估計。推論（bootstrap）仍以未加權方式重抽——加權重抽的設計未在 SmartPLS 文件化，本工具不擅自實作`)
  }
  if (exec.final?.spec?.stageWarnings?.length) baseWarnings.push(...exec.final.spec.stageWarnings)

  const report = reportFromStage(exec.final, {
    nRows: rows.length,
    nDropped,
    warnings: baseWarnings,
    htmtBlocked: exec.htmtBlockedIdx,
    skipFit: exec.stage1 !== null,
  })

  applyInteractionRescale(report, exec.interactionInfo)

  if (exec.stage1) {
    report.stage1 = reportFromStage(exec.stage1, {
      nRows: rows.length, nDropped, warnings: [], htmtBlocked: null, skipFit: false,
    })
  }
  if (plan.ints.length > 0) {
    report.interactions = buildInteractionSummary(report, plan, exec)
    report.meta.interactionMethod = plan.interactionMethod
  }
  if (plan.hocs.length > 0) report.meta.hocMethod = plan.hocMethod
  if (plan.autoAddedPaths.length > 0) report.meta.autoAddedPaths = plan.autoAddedPaths
  if (exec.notes.length > 0) report.meta.stages = exec.notes
  if (exec.derived) report.derived = exec.derived
  report.mediation = buildMediationReport(report.pathCoefficients, plan)

  return report
}

/* ─────────────────────────  Blindfolding Q²  ───────────────────────── */

/**
 * 構念層 cross-validated redundancy Q²（程序見檔頭）。
 * @param {object} options { omissionDistance=7, ...runPLS options（consistent 於 Q² 中不適用，
 *                           一律以 composite 估計計算） }
 * @returns {{ omissionDistance, constructs:[{lv, q2, sse, sso}], warnings }} | { error, message }
 */
export function blindfoldPLS(rows, model, options = {}) {
  // blindfolding 以「刻意挖洞再預測」為機制，本身就要控制缺失樣式；
  // 與 pairwise deletion 併用時「哪些格子是被挖掉的、哪些是原本就缺的」無法區分 → 互斥（handoff §6.7）。
  if ((options.missing ?? 'casewise') === 'pairwise') {
    return {
      error: 'blindfold-pairwise-conflict',
      message: 'blindfolding（Q²）不能與 pairwise deletion 併用：blindfolding 需要刻意挖洞再預測，若資料本身已有缺失，無法區分「被挖掉的格子」與「原本就缺的格子」。請改用 casewise 或均值補值',
    }
  }
  if ((Array.isArray(model?.interactions) && model.interactions.length > 0)
      || (Array.isArray(model?.higherOrder) && model.higherOrder.length > 0)) {
    return {
      error: 'q2-not-supported',
      message: 'blindfolding Q² 目前不支援含調節／高階構念的模型（W4 範圍限制；此類模型的預測評估留待 W5 PLSpredict）',
    }
  }
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
 * W4：每次重抽重跑整條管線（含 HOC／調節的多階段估計與交互項重標）；
 * 另回報中介效果（specific/total indirect、total）與 two-stage 調節的
 * simple slope 之 bootstrap 推論。
 * @param {object} options { n=5000, seed=42, ciAlpha=0.05,
 *                           signCorrection='construct'|'none',
 *                           ciType:'percentile'|'bca',
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

  const plan = buildPlan(model, options)
  const ext = extractMatrix(rows, plan.baseIndicators, plan.missing)
  const { X, n } = ext

  // 原始管線（供符號校正 anchors 與量測階段清單）
  const pool0 = toColumnPool(X, plan.baseIndicators)
  const exec0 = executePlan(pool0, n, plan, null)
  if (exec0.error) return exec0
  const anchors = signCorrection === 'construct'
    ? exec0.estimations.map((e) => e.st.ce.effLoadingsByLV)
    : null

  // 量測（loadings/weights）來源階段：多階段時為第一階段（原始指標），否則最終階段
  const measIdx = exec0.stage1 ? 0 : exec0.estimations.length - 1
  const measSpec = exec0.estimations[measIdx].st.spec
  const finalSpec = exec0.final.spec
  const lvIdxF = new Map(finalSpec.lvNames.map((name, j) => [name, j]))
  const intFrom = new Set(plan.ints.map((q) => q.name))

  const pathList = original.pathCoefficients.map((q) => ({ from: q.from, to: q.to }))
  const idxByEdge = new Map(pathList.map((q, i) => [`${q.from}→${q.to}`, i]))
  const loadList = []
  for (let j = 0; j < measSpec.lvNames.length; j++) {
    for (const h of measSpec.blocks[j]) {
      loadList.push({ lv: measSpec.lvNames[j], indicator: measSpec.indicators[h] })
    }
  }
  const origPaths = original.pathCoefficients.map((q) => q.coef)
  const measCE0 = exec0.estimations[measIdx].st.ce
  const origLoads = []
  const origWts = []
  for (let j = 0; j < measSpec.lvNames.length; j++) {
    for (let h = 0; h < measSpec.blocks[j].length; h++) {
      origLoads.push(measCE0.effLoadingsByLV[j][h])
      origWts.push(measCE0.est.weights[j][h])
    }
  }

  /** 單次估計 → 攤平參數（含逐階段符號校正與交互項重標）；重抽與 jackknife 共用 */
  const flatEstimates = (Xs) => {
    const poolB = toColumnPool(Xs, plan.baseIndicators)
    const ex = executePlan(poolB, Xs.length, plan, anchors)
    if (ex.error) return null
    const flipF = ex.finalFlip
    const sdBy = new Map()
    for (const q of ex.interactionInfo) {
      if (q.sdProduct !== null && Number.isFinite(q.sdProduct)) sdBy.set(q.name, q.sdProduct)
    }
    const paths = ex.final.ce.sm.pathCoefficients.map((q) => {
      let v = q.coef * flipF[lvIdxF.get(q.from)] * flipF[lvIdxF.get(q.to)]
      if (sdBy.has(q.from)) v /= sdBy.get(q.from)
      return v
    })
    const me = ex.estimations[measIdx]
    const loads = []
    const wts = []
    for (let j = 0; j < measSpec.lvNames.length; j++) {
      const f = me.flip[j]
      for (let h = 0; h < measSpec.blocks[j].length; h++) {
        loads.push(me.st.ce.effLoadingsByLV[j][h] * f)
        wts.push(me.st.ce.est.weights[j][h] * f)
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

  // BCa：n 次 jackknife（leave-one-out 全管線重估）求加速常數 a
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

  /** 由 pathDraws 派生的複合統計量（中介鏈乘積、加總、simple slope） */
  const derive = (source, fn) => {
    const m = source[0] ? source[0].length : 0
    const out = new Array(m)
    for (let i = 0; i < m; i++) out[i] = fn((idx) => source[idx][i])
    return out
  }

  // 中介效果：specific indirect（鏈乘積）、total indirect、total effect
  let indirectEffects = null
  let totalIndirectEffects = null
  let totalEffects = null
  if (original.mediation && original.mediation.effects.length > 0) {
    const pairs = buildMediationChains(pathList, intFrom)
    indirectEffects = []
    totalIndirectEffects = []
    totalEffects = []
    for (const pr of pairs) {
      const orig = original.mediation.effects.find((q) => q.from === pr.from && q.to === pr.to)
      const chainDraws = pr.chains.map((c) =>
        derive(pathDraws, (get) => c.idxSeq.reduce((s, idx) => s * get(idx), 1)))
      const chainJacks = jackPaths
        ? pr.chains.map((c) => derive(jackPaths, (get) => c.idxSeq.reduce((s, idx) => s * get(idx), 1)))
        : pr.chains.map(() => null)
      pr.chains.forEach((c, ci) => {
        indirectEffects.push({
          from: pr.from, to: pr.to, via: c.via,
          ...summarize(chainDraws[ci], orig.chains[ci].coef, chainJacks[ci]),
        })
      })
      const tiDraws = derive(pathDraws, (get) =>
        pr.chains.reduce((s, c) => s + c.idxSeq.reduce((m2, idx) => m2 * get(idx), 1), 0))
      const tiJack = jackPaths
        ? derive(jackPaths, (get) =>
            pr.chains.reduce((s, c) => s + c.idxSeq.reduce((m2, idx) => m2 * get(idx), 1), 0))
        : null
      totalIndirectEffects.push({ from: pr.from, to: pr.to, ...summarize(tiDraws, orig.totalIndirect, tiJack) })
      const totFn = (get) => {
        let s = pr.directIdx !== null ? get(pr.directIdx) : 0
        for (const c of pr.chains) s += c.idxSeq.reduce((m2, idx) => m2 * get(idx), 1)
        return s
      }
      const totDraws = derive(pathDraws, totFn)
      const totJack = jackPaths ? derive(jackPaths, totFn) : null
      totalEffects.push({ from: pr.from, to: pr.to, ...summarize(totDraws, orig.total, totJack) })
    }
  }

  // simple slopes（two-stage 二因子交互；斜率 = b_iv + b_int·m，二次：b_iv + 2·b_q·x）
  let slopes = null
  if (Array.isArray(original.interactions)) {
    slopes = []
    for (const it of original.interactions) {
      for (const tg of it.targets) {
        if (!Array.isArray(tg.slopes)) continue
        const idxInt = idxByEdge.get(`${it.name}→${tg.to}`)
        const idxIv = idxByEdge.get(`${tg.iv}→${tg.to}`)
        if (idxInt === undefined || idxIv === undefined) continue
        for (const sl of tg.slopes) {
          const mult = tg.quadratic ? 2 * sl.level : sl.level
          const drawsS = derive(pathDraws, (get) => get(idxIv) + mult * get(idxInt))
          const jackS = jackPaths ? derive(jackPaths, (get) => get(idxIv) + mult * get(idxInt)) : null
          slopes.push({
            interaction: it.name, to: tg.to, level: sl.level,
            quadratic: tg.quadratic === true,
            ...summarize(drawsS, sl.slope, jackS),
          })
        }
      }
    }
    if (slopes.length === 0) slopes = null
  }

  return {
    nRequested: B, nValid, nSkipped, seed, ciAlpha, signCorrection, ciType,
    ...(options._keepDraws ? { draws: { paths: pathDraws } } : {}),
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
    ...(indirectEffects ? { indirectEffects, totalIndirectEffects, totalEffects } : {}),
    ...(slopes ? { slopes } : {}),
  }
}

/* ─────────────────────────  W5：群組與預測  ───────────────────────── */

/** Fisher–Yates 洗牌（mulberry32；permutation 檢定用） */
function shuffledPositions(n, rand) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

/** W4 模型（調節／高階構念）擋下——W5 群組/預測 API 目前僅支援一般模型 */
function rejectW4(model, api) {
  if ((Array.isArray(model?.interactions) && model.interactions.length > 0)
      || (Array.isArray(model?.higherOrder) && model.higherOrder.length > 0)) {
    return {
      error: 'w4-model-not-supported',
      message: `${api} 目前不支援含調節／高階構念的模型（W5 範圍限制，見 roadmap）`,
    }
  }
  return null
}

/**
 * MGA 參數檢定（供 mgaPLS 與測試共用）。
 * pooled：Keil et al. (2000)（等變異假設）；welch：Welch–Satterthwaite
 * （Sarstedt, Henseler & Ringle 2011）。se 為 bootstrap 標準誤。
 */
export function mgaParametricTest(th1, se1, n1, th2, se2, n2) {
  const diff = th1 - th2
  const sp = Math.sqrt(
    (((n1 - 1) ** 2) / (n1 + n2 - 2)) * se1 * se1
    + (((n2 - 1) ** 2) / (n1 + n2 - 2)) * se2 * se2,
  ) * Math.sqrt(1 / n1 + 1 / n2)
  const tPooled = sp > 0 ? diff / sp : null
  const dfPooled = n1 + n2 - 2
  // Welch–Satterthwaite（Sarstedt, Henseler & Ringle 2011）：兩組變異數須以 (n−1)/n 加權。
  // n1 = n2 時本式與 Keil 的 pooled t 數學上恆等——cSEM 0.6.1 兩者同值（2026-07-13 抽驗確認）。
  const vw1 = ((n1 - 1) / n1) * se1 * se1
  const vw2 = ((n2 - 1) / n2) * se2 * se2
  const sw = Math.sqrt(vw1 + vw2)
  const tWelch = sw > 0 ? diff / sw : null
  const dfWelch = (vw1 + vw2) ** 2
    / ((vw1 * vw1) / (n1 - 1) + (vw2 * vw2) / (n2 - 1))
  return {
    diff,
    pooled: { t: tPooled, df: dfPooled, p: tPooled === null ? null : pT(Math.abs(tPooled), dfPooled) },
    welch: { t: tWelch, df: dfWelch, p: tWelch === null ? null : pT(Math.abs(tWelch), dfWelch) },
  }
}

/**
 * Henseler's MGA 單尾 p（Henseler, Ringle & Sinkovics 2009）。
 *
 * 偏誤校正的成對比較：c_k = 2·θ̄*_k − θ*_k，其中 **θ̄*_k 是該組 bootstrap 估計的平均**
 * （不是點估計 θ̂）。回傳 P(c1 ≤ c2) 的估計——p 小 → 群組 1 顯著大於群組 2。
 *
 * 2026-07-13 修正：原實作以點估計 θ̂ 作為鏡射錨點。Henseler et al. (2009) 的原式與
 * seminr 的參考實作（`estimate_pls_mga.R`：`2*group1_beta_mean - draw1 - 2*group2_beta_mean + draw2`）
 * 都用 bootstrap 平均。θ̂ 與 θ̄* 相差一個 bootstrap 偏誤，故兩者結果接近但不相同。
 *
 * 註：cSEM 0.6.1 的 Henseler p 與本式差異較大（其值與「不做偏誤校正、直接比較原始 draws」
 * 一致），詳見 validation-report。
 */
export function henselerMgaP(draws1, draws2) {
  const B1 = draws1.length
  const B2 = draws2.length
  if (B1 === 0 || B2 === 0) return null
  const m1 = draws1.reduce((a, v) => a + v, 0) / B1  // θ̄*₁
  const m2 = draws2.reduce((a, v) => a + v, 0) / B2  // θ̄*₂
  // 排序後雙指針：count(c1 > c2) 的 O(B log B) 版
  const c1 = draws1.map((v) => 2 * m1 - v).sort((a, b) => a - b)
  const c2 = draws2.map((v) => 2 * m2 - v).sort((a, b) => a - b)
  let count = 0
  let j = 0
  for (let i = 0; i < B1; i++) {
    while (j < B2 && c2[j] < c1[i]) j++
    count += j // c2[0..j-1] < c1[i]
  }
  return 1 - count / (B1 * B2)
}

/** rows 依群組欄位切分（值以字串比對；維持原列序） */
function splitGroups(rows, groupColumn, groups) {
  const g1 = []
  const g2 = []
  for (const row of rows) {
    const v = row?.[groupColumn]
    if (v === undefined || v === null) continue
    const s = String(v)
    if (s === String(groups[0])) g1.push(row)
    else if (s === String(groups[1])) g2.push(row)
  }
  return { g1, g2 }
}

/**
 * PLS-MGA：兩群組路徑係數差異檢定，三法並列（對齊 SmartPLS 4 MGA 報表）。
 * @param {object} options { groupColumn, groups:[g1,g2], bootstrapN=1000, seed=42,
 *                           permutations=1000, permutationIndices?（測試注入：
 *                           位置索引陣列的陣列，前 n1 個為 pseudo-group1）,
 *                           onProgress?, ...runPLS options }
 */
export function mgaPLS(rows, model, options = {}) {
  const { groupColumn, groups } = options
  if (!groupColumn || !Array.isArray(groups) || groups.length !== 2) {
    return { error: 'mga-bad-groups', message: 'MGA 需要 groupColumn 與恰好兩個群組值（groups: [g1, g2]）' }
  }
  const { g1, g2 } = splitGroups(rows, groupColumn, groups)
  if (g1.length < 5 || g2.length < 5) {
    return { error: 'mga-too-few', message: `群組樣本過少（${groups[0]}: ${g1.length}、${groups[1]}: ${g2.length}；每組至少 5 筆）` }
  }
  const baseOpts = { ...options }
  delete baseOpts.groupColumn; delete baseOpts.groups; delete baseOpts.bootstrapN
  delete baseOpts.permutations; delete baseOpts.permutationIndices; delete baseOpts.onProgress

  const r1 = runPLS(g1, model, baseOpts)
  if (r1.error) return { error: r1.error, message: `群組「${groups[0]}」估計失敗：${r1.message}` }
  const r2 = runPLS(g2, model, baseOpts)
  if (r2.error) return { error: r2.error, message: `群組「${groups[1]}」估計失敗：${r2.message}` }

  const B = options.bootstrapN ?? 1000
  const seed = options.seed ?? 42
  const b1 = bootstrapPLS(g1, model, { ...baseOpts, n: B, seed, _keepDraws: true })
  if (b1.error) return b1
  const b2 = bootstrapPLS(g2, model, { ...baseOpts, n: B, seed: seed + 1, _keepDraws: true })
  if (b2.error) return b2

  // permutation：合併列（group1 在前）
  const combined = [...g1, ...g2]
  const n1 = g1.length
  const P = options.permutationIndices ? options.permutationIndices.length : (options.permutations ?? 1000)
  const rand = mulberry32((options.seed ?? 42) + 7)
  const permDiffsByPath = r1.pathCoefficients.map(() => [])
  let nPermValid = 0
  let nPermFailed = 0
  for (let pi = 0; pi < P; pi++) {
    const pos = options.permutationIndices
      ? options.permutationIndices[pi]
      : shuffledPositions(combined.length, rand)
    const rowsA = []
    const rowsB = []
    for (let i = 0; i < pos.length; i++) (i < n1 ? rowsA : rowsB).push(combined[pos[i]])
    const ra = runPLS(rowsA, model, baseOpts)
    const rb = runPLS(rowsB, model, baseOpts)
    if (ra.error || rb.error) { nPermFailed++; continue }
    for (let q = 0; q < permDiffsByPath.length; q++) {
      permDiffsByPath[q].push(ra.pathCoefficients[q].coef - rb.pathCoefficients[q].coef)
    }
    nPermValid++
    if (options.onProgress && (pi + 1) % 20 === 0) options.onProgress(pi + 1, P)
  }
  if (options.onProgress) options.onProgress(P, P)

  const paths = r1.pathCoefficients.map((q, i) => {
    const th1 = q.coef
    const th2 = r2.pathCoefficients[i].coef
    const se1 = b1.paths[i].se
    const se2 = b2.paths[i].se
    const par = mgaParametricTest(th1, se1, g1.length, th2, se2, g2.length)
    const hp = henselerMgaP(b1.draws.paths[i], b2.draws.paths[i])
    const diffs = permDiffsByPath[i]
    const pPerm = diffs.length > 0
      ? (diffs.filter((d) => Math.abs(d) >= Math.abs(par.diff)).length + 1) / (diffs.length + 1)
      : null
    return {
      from: q.from,
      to: q.to,
      group1: { coef: th1, se: se1 },
      group2: { coef: th2, se: se2 },
      diff: par.diff,
      henselerP: hp,
      henselerP2: hp === null ? null : 2 * Math.min(hp, 1 - hp),
      parametric: par.pooled,
      welch: par.welch,
      permutation: { p: pPerm, diffs },
    }
  })
  return {
    groupColumn, groups: [...groups], n1: g1.length, n2: g2.length,
    bootstrapN: B, nPermValid, nPermFailed,
    paths,
    warnings: [
      ...(g1.length < 30 || g2.length < 30 ? [`群組樣本偏低（${g1.length}／${g2.length}），MGA 檢定力有限`] : []),
    ],
  }
}

/**
 * MICOM 測量恆等性（Henseler, Ringle & Sarstedt 2016）三步驟：
 * step 1 configural（程序性，報表以檢核清單呈現）；
 * step 2 compositional invariance：c = corr(Z_pooled·w_g1, Z_pooled·w_g2)＋permutation；
 * step 3 等平均／等變異：pooled 權重分數的組間差＋permutation CI。
 * 僅支援一般模型（W4 管線模型回傳錯誤）。
 */
export function micomPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'MICOM')
  if (bad) return bad
  const { groupColumn, groups } = options
  if (!groupColumn || !Array.isArray(groups) || groups.length !== 2) {
    return { error: 'micom-bad-groups', message: 'MICOM 需要 groupColumn 與恰好兩個群組值' }
  }
  const plan = buildPlan(model, options)
  if (plan.error) return plan
  const { g1, g2 } = splitGroups(rows, groupColumn, groups)
  if (g1.length < 5 || g2.length < 5) {
    return { error: 'micom-too-few', message: `群組樣本過少（${g1.length}／${g2.length}；每組至少 5 筆）` }
  }
  // 合併（group1 在前）＋ casewise
  const ext = extractMatrix([...g1, ...g2], plan.baseIndicators, 'casewise')
  if (ext.error) return ext
  const labels = []
  {
    // extractMatrix casewise 會剔列——以同規則重建標籤
    const all = [...g1.map(() => 0), ...g2.map(() => 1)]
    const src = [...g1, ...g2]
    for (let i = 0; i < src.length; i++) {
      const ok = plan.baseIndicators.every((c) => {
        const v = src[i]?.[c]
        return !isMissing(v) && Number.isFinite(Number(v))
      })
      if (ok) labels.push(all[i])
    }
  }
  const X = ext.X
  const n = ext.n
  const n1 = labels.filter((v) => v === 0).length
  const n2 = n - n1

  const stdP = standardizeColumns(X)
  if (stdP.zeroVarIndex !== undefined) {
    return { error: 'zero-variance', message: `指標「${plan.baseIndicators[stdP.zeroVarIndex]}」變異數為零` }
  }
  const spec = buildSpec(plan.model, plan)
  if (spec.error) return spec

  /** 位置集合 → 該 pseudo-group 的權重（組內標準化後估計） */
  const groupWeights = (posArr) => {
    const Xg = posArr.map((i) => X[i])
    const stdG = standardizeColumns(Xg)
    if (stdG.zeroVarIndex !== undefined) return null
    const ce = coreEstimates(stdG.cols, Xg.length, spec)
    if (!ce || ce.notConverged) return null
    return ce.est.weights
  }
  /** 兩組權重 → 各構念 c（pooled Z 上的分數相關） */
  const compC = (w1, w2) => spec.blocks.map((b, j) => {
    const s1 = new Float64Array(n)
    const s2 = new Float64Array(n)
    for (let h = 0; h < b.length; h++) {
      const z = stdP.cols[b[h]]
      for (let i = 0; i < n; i++) {
        s1[i] += w1[j][h] * z[i]
        s2[i] += w2[j][h] * z[i]
      }
    }
    return corrOf(s1, s2)
  })

  const pos1 = []
  const pos2 = []
  labels.forEach((v, i) => (v === 0 ? pos1 : pos2).push(i))
  const w1 = groupWeights(pos1)
  const w2 = groupWeights(pos2)
  if (!w1 || !w2) return { error: 'micom-estimation-failed', message: 'MICOM：群組估計未收斂或退化' }
  const cObs = compC(w1, w2)

  // step 3：pooled 分數
  const ceP = coreEstimates(stdP.cols, n, spec)
  if (!ceP || ceP.notConverged) return { error: 'micom-estimation-failed', message: 'MICOM：pooled 估計未收斂' }
  const mvOf = (p1, p2) => spec.lvNames.map((_, j) => {
    const s = ceP.est.scores[j]
    const m1 = p1.reduce((a, i) => a + s[i], 0) / p1.length
    const m2 = p2.reduce((a, i) => a + s[i], 0) / p2.length
    const v1 = p1.reduce((a, i) => a + (s[i] - m1) ** 2, 0) / (p1.length - 1)
    const v2 = p2.reduce((a, i) => a + (s[i] - m2) ** 2, 0) / (p2.length - 1)
    // Henseler, Ringle & Sarstedt (2016)：step 3 的變異數比較為 log 變異數比
    // log(var1) − log(var2)，非變異數差（cSEM 原始碼同：log(y[[1]]) − log(y[[2]])）。
    return [m1 - m2, Math.log(v1) - Math.log(v2)]
  })
  const mvObs = mvOf(pos1, pos2)

  const P = options.permutationIndices ? options.permutationIndices.length : (options.permutations ?? 1000)
  const rand = mulberry32((options.seed ?? 42) + 11)
  const cPerm = spec.lvNames.map(() => [])
  const mPerm = spec.lvNames.map(() => [])
  const vPerm = spec.lvNames.map(() => [])
  let nPermValid = 0
  for (let pi = 0; pi < P; pi++) {
    const pos = options.permutationIndices
      ? options.permutationIndices[pi]
      : shuffledPositions(n, rand)
    const pa = pos.slice(0, n1)
    const pb = pos.slice(n1)
    const wa = groupWeights(pa)
    const wb = groupWeights(pb)
    if (!wa || !wb) continue
    const cs = compC(wa, wb)
    const mv = mvOf(pa, pb)
    for (let j = 0; j < spec.lvNames.length; j++) {
      cPerm[j].push(cs[j])
      mPerm[j].push(mv[j][0])
      vPerm[j].push(mv[j][1])
    }
    nPermValid++
    if (options.onProgress && (pi + 1) % 20 === 0) options.onProgress(pi + 1, P)
  }
  if (options.onProgress) options.onProgress(P, P)
  if (nPermValid < 10) return { error: 'micom-permutation-failed', message: `有效 permutation 僅 ${nPermValid} 次` }

  const constructs = spec.lvNames.map((lv, j) => {
    const sortedC = [...cPerm[j]].sort((a, b) => a - b)
    const sortedM = [...mPerm[j]].sort((a, b) => a - b)
    const sortedV = [...vPerm[j]].sort((a, b) => a - b)
    return {
      lv,
      c: cObs[j],
      cQuantile5: quantile(sortedC, 0.05),
      cP: (cPerm[j].filter((v) => v <= cObs[j]).length + 1) / (nPermValid + 1),
      mean: { diff: mvObs[j][0], ciLower: quantile(sortedM, 0.025), ciUpper: quantile(sortedM, 0.975) },
      variance: { diff: mvObs[j][1], ciLower: quantile(sortedV, 0.025), ciUpper: quantile(sortedV, 0.975) },
    }
  })
  return { groupColumn, groups: [...groups], n1, n2, nPermValid, constructs }
}

/** OLS 預測（含截距；PLSpredict 的 LM 基準與 IPMA 非標準化路徑共用） */
function olsFit(Xcols, y, rowsIdx) {
  const k = Xcols.length + 1
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0))
  const Xty = new Array(k).fill(0)
  const val = (c, i) => (c === 0 ? 1 : Xcols[c - 1][i])
  for (const i of rowsIdx) {
    for (let a = 0; a < k; a++) {
      const va = val(a, i)
      Xty[a] += va * y[i]
      for (let b = a; b < k; b++) XtX[a][b] += va * val(b, i)
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a]
  const inv = inverse(XtX)
  if (!inv) return null
  const beta = inv.map((row) => row.reduce((s, v, q) => s + v * Xty[q], 0))
  return {
    beta,
    predict: (i) => {
      let s = beta[0]
      for (let c = 0; c < Xcols.length; c++) s += beta[c + 1] * Xcols[c][i]
      return s
    },
  }
}

/**
 * PLSpredict（Shmueli et al. 2016；判讀依 Shmueli et al. 2019）＋
 * CVPAT（Liengaard et al. 2021：PLS vs IA、PLS vs LM 的逐案損失成對 t 檢定）。
 * k-fold 交叉驗證；LM 基準 = 各內生指標對全部外生指標的 OLS。
 * 僅支援一般模型。
 * @param {object} options { k=10, seed=42, foldIndices?（測試注入：長度 n 的 fold id 陣列）,
 *                           ...runPLS options }
 */
export function plspredictPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'PLSpredict')
  if (bad) return bad
  const plan = buildPlan(model, options)
  if (plan.error) return plan
  const ext = extractMatrix(rows, plan.baseIndicators, 'casewise')
  if (ext.error) return ext
  const { X, n } = ext
  const k = options.k ?? 10
  if (!Number.isInteger(k) || k < 2 || k > n) {
    return { error: 'bad-k', message: `k-fold 的 k 必須是 2–n 的整數，收到「${options.k}」` }
  }
  const spec = buildSpec(plan.model, plan)
  if (spec.error) return spec

  // fold 指派
  let foldOf
  if (options.foldIndices) {
    if (options.foldIndices.length !== n) {
      return { error: 'bad-folds', message: `foldIndices 長度（${options.foldIndices.length}）與有效樣本數（${n}）不符` }
    }
    foldOf = options.foldIndices
  } else {
    const rand = mulberry32((options.seed ?? 42) + 13)
    const pos = shuffledPositions(n, rand)
    foldOf = new Array(n)
    pos.forEach((p, i) => { foldOf[p] = i % k })
  }

  const exoIdx = []
  for (let j = 0; j < spec.lvNames.length; j++) if (spec.pred[j].length === 0) exoIdx.push(j)
  const endoIdx = []
  for (let j = 0; j < spec.lvNames.length; j++) if (spec.pred[j].length > 0) endoIdx.push(j)
  if (endoIdx.length === 0) return { error: 'no-endogenous', message: 'PLSpredict 需要至少一個內生構念' }
  const exoCols = exoIdx.flatMap((j) => spec.blocks[j])
  const endoCols = endoIdx.flatMap((j) => spec.blocks[j])

  // spec.indicators 與 baseIndicators 同序（一般模型無重複掛載）
  const rawCols = plan.baseIndicators.map((_, c) => {
    const col = new Float64Array(n)
    for (let i = 0; i < n; i++) col[i] = X[i][c]
    return col
  })

  const predPls = spec.indicators.map(() => new Float64Array(n).fill(NaN))
  const predLm = spec.indicators.map(() => new Float64Array(n).fill(NaN))
  const predNaive = spec.indicators.map(() => new Float64Array(n).fill(NaN))

  for (let f = 0; f < k; f++) {
    const tr = []
    const ho = []
    for (let i = 0; i < n; i++) (foldOf[i] === f ? ho : tr).push(i)
    if (ho.length === 0) continue
    if (tr.length < 5) return { error: 'fold-too-small', message: `第 ${f + 1} 摺的訓練樣本不足` }
    // 訓練摺標準化參數
    const mu = new Array(spec.indicators.length)
    const sd = new Array(spec.indicators.length)
    const Ztr = []
    for (let c = 0; c < spec.indicators.length; c++) {
      let s = 0
      for (const i of tr) s += rawCols[c][i]
      const m = s / tr.length
      let ss = 0
      for (const i of tr) { const d = rawCols[c][i] - m; ss += d * d }
      const sdv = Math.sqrt(ss / (tr.length - 1))
      if (!(sdv > 0)) return { error: 'zero-variance', message: `第 ${f + 1} 摺：指標「${spec.indicators[c]}」訓練變異為零` }
      mu[c] = m
      sd[c] = sdv
      const col = new Float64Array(tr.length)
      tr.forEach((i, t) => { col[t] = (rawCols[c][i] - m) / sdv })
      Ztr.push(col)
    }
    const ce = coreEstimates(Ztr, tr.length, spec)
    if (!ce || ce.notConverged) return { error: 'predict-estimation-failed', message: `第 ${f + 1} 摺的 PLS 估計未收斂` }
    const coefBy = new Map()
    for (const st of ce.sm.structural) {
      coefBy.set(spec.lvNames.indexOf(st.lv), st.predictors.map((q) => q.coef))
    }
    // holdout 分數（拓撲順序遞迴）
    const scoreHat = spec.lvNames.map(() => new Float64Array(ho.length))
    for (const j of spec.topoOrder) {
      if (spec.pred[j].length === 0) {
        const b = spec.blocks[j]
        for (let t = 0; t < ho.length; t++) {
          let s = 0
          for (let h = 0; h < b.length; h++) {
            s += ce.est.weights[j][h] * ((rawCols[b[h]][ho[t]] - mu[b[h]]) / sd[b[h]])
          }
          scoreHat[j][t] = s
        }
      } else {
        const bc = coefBy.get(j)
        const P = spec.pred[j]
        for (let t = 0; t < ho.length; t++) {
          let s = 0
          for (let q = 0; q < P.length; q++) s += bc[q] * scoreHat[P[q]][t]
          scoreHat[j][t] = s
        }
      }
    }
    // 指標預測（僅內生）＋ naive
    for (const j of endoIdx) {
      const b = spec.blocks[j]
      for (let h = 0; h < b.length; h++) {
        const lam = ce.rawLoadingsByLV[j][h]
        for (let t = 0; t < ho.length; t++) {
          predPls[b[h]][ho[t]] = lam * scoreHat[j][t] * sd[b[h]] + mu[b[h]]
          predNaive[b[h]][ho[t]] = mu[b[h]]
        }
      }
    }
    // LM 基準
    const exoRaw = exoCols.map((c) => rawCols[c])
    for (const c of endoCols) {
      const fit = olsFit(exoRaw, rawCols[c], tr)
      if (!fit) return { error: 'lm-failed', message: `第 ${f + 1} 摺的 LM 基準估計失敗（外生指標共線）` }
      for (const i of ho) predLm[c][i] = fit.predict(i)
    }
  }

  const indicators = []
  for (const j of endoIdx) {
    for (const c of spec.blocks[j]) {
      const x = rawCols[c]
      const metrics = (pr) => {
        let se2 = 0
        let ae = 0
        let sn = 0
        for (let i = 0; i < n; i++) {
          const e = x[i] - pr[i]
          se2 += e * e
          ae += Math.abs(e)
          const en = x[i] - predNaive[c][i]
          sn += en * en
        }
        return {
          rmse: Math.sqrt(se2 / n),
          mae: ae / n,
          q2predict: sn > 1e-12 ? 1 - se2 / sn : null,
        }
      }
      indicators.push({
        lv: spec.lvNames[j],
        indicator: spec.indicators[c],
        ...metrics(predPls[c]),
        lm: metrics(predLm[c]),
      })
    }
  }

  // CVPAT：逐案平均平方損失
  const lossOf = (pr) => {
    const out = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      let s = 0
      for (const c of endoCols) { const e = rawCols[c][i] - pr[c][i]; s += e * e }
      out[i] = s / endoCols.length
    }
    return out
  }
  const lPls = lossOf(predPls)
  const cvOne = (lBench) => {
    const D = new Float64Array(n)
    for (let i = 0; i < n; i++) D[i] = lBench[i] - lPls[i]
    const dBar = meanOf(D)
    const sdD = sdOf(D)
    const t = sdD > 0 ? dBar / (sdD / Math.sqrt(n)) : null
    return { dBar, t, df: n - 1, p: t === null ? null : pT(Math.abs(t), n - 1) }
  }
  return {
    k,
    n,
    indicators,
    cvpat: { vsIA: cvOne(lossOf(predNaive)), vsLM: cvOne(lossOf(predLm)) },
    warnings: [],
  }
}

/**
 * IPMA 重要性－績效地圖分析（Ringle & Sarstedt 2016）。
 * 指標 0–100 重標定（觀察 min/max）、非標準化權重正規化 Σw̃=1、
 * 非標準化路徑（0–100 分數的 OLS）、importance = 對目標的非標準化總效果。
 * 僅支援一般模型。
 * @param {object} options { target, ...runPLS options }
 */
export function ipmaPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'IPMA')
  if (bad) return bad
  const plan = buildPlan(model, options)
  if (plan.error) return plan
  const target = options.target
  const ext = extractMatrix(rows, plan.baseIndicators, plan.missing)
  if (ext.error) return ext
  const { X, n } = ext
  const spec = buildSpec(plan.model, plan)
  if (spec.error) return spec
  const tIdx = spec.lvNames.indexOf(target)
  if (tIdx < 0 || spec.pred[tIdx].length === 0) {
    return { error: 'ipma-bad-target', message: `IPMA 目標「${target}」必須是模型中的內生構念` }
  }
  const std = standardizeColumns(X)
  if (std.zeroVarIndex !== undefined) {
    return { error: 'zero-variance', message: `指標「${spec.indicators[std.zeroVarIndex]}」變異數為零` }
  }
  const ce = coreEstimates(std.cols, n, spec)
  if (!ce || ce.notConverged) return { error: 'ipma-estimation-failed', message: 'IPMA：PLS 估計未收斂或退化' }

  const warnings = []
  // 0–100 重標定（觀察 min/max；SmartPLS 以量表理論界線，UI 註記差異）
  const p = spec.indicators.length
  const resc = []
  for (let c = 0; c < p; c++) {
    let mn = Infinity
    let mx = -Infinity
    for (let i = 0; i < n; i++) {
      const v = X[i][c]
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    if (!(mx > mn)) return { error: 'ipma-degenerate', message: `指標「${spec.indicators[c]}」無變異，無法重標定` }
    const col = new Float64Array(n)
    for (let i = 0; i < n; i++) col[i] = ((X[i][c] - mn) / (mx - mn)) * 100
    resc.push(col)
  }
  // 非標準化權重正規化
  const s100 = []
  const wNorm = []
  for (let j = 0; j < spec.lvNames.length; j++) {
    const b = spec.blocks[j]
    const wu = b.map((c, h) => ce.est.weights[j][h] / std.sds[c])
    const sum = wu.reduce((s, v) => s + v, 0)
    if (!(Math.abs(sum) > 1e-12)) {
      return { error: 'ipma-degenerate', message: `構念「${spec.lvNames[j]}」的非標準化權重總和為零，無法正規化` }
    }
    const wn = wu.map((v) => v / sum)
    if (wn.some((v) => v < 0)) {
      warnings.push(`構念「${spec.lvNames[j]}」含負的正規化權重，IPMA 解讀請留意（Ringle & Sarstedt 2016 的已知限制）`)
    }
    wNorm.push(wn)
    const col = new Float64Array(n)
    for (let h = 0; h < b.length; h++) {
      for (let i = 0; i < n; i++) col[i] += wn[h] * resc[b[h]][i]
    }
    s100.push(col)
  }
  // 非標準化路徑（OLS with 截距）
  const allIdx = Array.from({ length: n }, (_, i) => i)
  const upaths = []
  const uCoefBy = new Map()
  for (let j = 0; j < spec.lvNames.length; j++) {
    const P = spec.pred[j]
    if (P.length === 0) continue
    const fit = olsFit(P.map((a) => s100[a]), s100[j], allIdx)
    if (!fit) return { error: 'ipma-estimation-failed', message: 'IPMA：非標準化路徑 OLS 失敗' }
    uCoefBy.set(j, fit.beta.slice(1))
    P.forEach((a, q) => upaths.push({ from: spec.lvNames[a], to: spec.lvNames[j], coef: fit.beta[q + 1] }))
  }
  // 對目標的非標準化總效果（拓撲遞迴）
  const totalTo = new Map([[tIdx, 1]])
  const order = [...spec.topoOrder].reverse()
  for (const j of order) {
    if (j === tIdx) continue
    let te = 0
    spec.succ[j].forEach((s) => {
      const bc = uCoefBy.get(s)
      const qi = spec.pred[s].indexOf(j)
      const direct = bc ? bc[qi] : 0
      const down = totalTo.get(s)
      if (down !== undefined) te += direct * down
    })
    if (te !== 0 || spec.succ[j].some((s) => totalTo.has(s))) totalTo.set(j, te)
  }
  const constructs = []
  const indicators = []
  for (let j = 0; j < spec.lvNames.length; j++) {
    if (j === tIdx || !totalTo.has(j)) continue
    const imp = totalTo.get(j)
    const perf = meanOf(s100[j])
    constructs.push({ lv: spec.lvNames[j], importance: imp, performance: perf })
    const b = spec.blocks[j]
    for (let h = 0; h < b.length; h++) {
      indicators.push({
        lv: spec.lvNames[j],
        indicator: spec.indicators[b[h]],
        importance: imp * wNorm[j][h],
        performance: meanOf(resc[b[h]]),
      })
    }
  }
  return {
    target,
    targetPerformance: meanOf(s100[tIdx]),
    constructs,
    indicators,
    unstandardizedPaths: upaths,
    warnings,
    // 0–100 重標定 LV 分數（cIPMA 的 NCA 輸入；Hauff et al. 2024）
    scores100: Object.fromEntries(spec.lvNames.map((nm, j) => [nm, Array.from(s100[j])])),
  }
}

/**
 * cIPMA — combined importance-performance map analysis
 * （Hauff, Richter, Sarstedt & Ringle, 2024, J. Retailing & Consumer Services）
 *
 * 程序：IPMA（0–100 重標定分數）→ 對目標構念的**直接前置構念**逐一跑 NCA
 * （CE-FDH 為主判準、CR-FDH 並列；實證 scope）→ 必要性判準 d ≥ .1 且
 * permutation p < .05（理論支持由研究者判斷）。bottleneck 以 0–100 實際值＋
 * 「未達所需水準之案例 %」雙格式（論文 Table 5 慣例）。
 *
 * options 同 ipmaPLS，另加：
 *   ncaPermutations — 整數 P（以 ncaSeed 生成）或 number[][]（注入固定排列）
 *   ncaSeed         — 預設 42
 *   bottleneckLevels — 預設 [0,10,…,100]（% of Y range）
 *
 * 回傳：ipmaPLS 完整結果 ＋ cipma: { conditions: [{ lv, importance, performance,
 *   effectSizeCE, effectSizeCR, p, necessary, bottleneck: [{ level, yValue,
 *   xValue, nn, pctBelow }] }] }
 */
export function cipmaPLS(rows, model, options = {}) {
  const ipma = ipmaPLS(rows, model, options)
  if (ipma.error) return ipma
  const target = options.target
  // 直接前置構念（cIPMA 只測 direct antecedents；IPMA importance 為總效果）
  const direct = [...new Set((model.paths || [])
    .filter((p) => p.to === target)
    .map((p) => p.from))]
  const yScores = ipma.scores100[target]
  const impBy = new Map(ipma.constructs.map((c) => [c.lv, c]))
  const conditions = []
  for (const lv of direct) {
    const xScores = ipma.scores100[lv]
    if (!xScores) continue
    const nca = runNCA(xScores, yScores, {
      permutations: options.ncaPermutations ?? 10000,
      seed: options.ncaSeed ?? 42,
      bottleneckLevels: options.bottleneckLevels,
    })
    if (nca.error) {
      return { error: 'cipma-nca-failed', message: `cIPMA：構念「${lv}」的 NCA 失敗（${nca.error}）` }
    }
    const ce = nca.ceilings.ce_fdh
    const p = nca.test ? nca.test.p_ce : NaN
    const n = xScores.length
    const bottleneck = ce.bottleneck.map((b) => ({
      ...b,
      // 未達所需水準之案例 %（Hauff et al. 2024 percentile 格式；NN → 0）
      pctBelow: b.nn ? 0 : (xScores.filter((v) => v < b.xValue).length / n) * 100,
    }))
    const base = impBy.get(lv) || { importance: NaN, performance: NaN }
    conditions.push({
      lv,
      importance: base.importance,
      performance: base.performance,
      effectSizeCE: ce.effectSize,
      effectSizeCR: nca.ceilings.cr_fdh.effectSize,
      effectLabel: ce.effectLabel,
      p,
      necessary: Number.isFinite(p) && p < 0.05 && ce.effectSize >= 0.1,
      bottleneck,
    })
  }
  return { ...ipma, cipma: { conditions } }
}

/* ─────────────────────────  CTA-PLS（W6.3）  ───────────────────────── */

/**
 * 非冗餘 tetrad 的索引選取（區塊內 0-based），數量 = k(k−3)/2。
 *
 * 依「逐一加入指標」的自由度分解構造：加入第 m 個指標時新增 (m−1) 個共變異數、
 * 1 個新 loading → (m−2) 個約束。取法為 {0,1,2,m} 上 2 個獨立 tetrad
 * ＋ 對 c = 3..m−1 各 1 個 {0,1,c,m}。Σ_{m=3}^{k−1}(m−1) = k(k−3)/2，
 * 與「k(k−1)/2 個共變異數 − k 個 loading」的自由度一致（見 generate_reference.py
 * 的 Jacobian 秩 assert）。
 *
 * ※ 任一極大獨立子集張成相同的約束空間（omnibus 判讀等價），但個別 tetrad 的
 *   CI 會隨選取而異；SmartPLS 的選取細節未文件化 → 待抽驗（validation-report）。
 */
function ctaNonredundantTetrads(k) {
  if (k < 4) return []
  const out = []
  for (let m = 3; m < k; m++) {
    out.push([0, 1, 2, m])
    out.push([0, 1, m, 2])
    for (let c = 3; c < m; c++) out.push([0, 1, c, m])
  }
  return out
}

/** τ_ghij = σ_gh·σ_ij − σ_gi·σ_hj（Bollen & Ting 1993） */
function tetradValue(R, t) {
  const [g, h, i, j] = t
  return R[g][h] * R[i][j] - R[g][i] * R[h][j]
}

/** 由列資料（每列一筆、每欄一指標）算相關矩陣 */
function corrMatrixOf(cols) {
  const p = cols.length
  const R = []
  for (let a = 0; a < p; a++) {
    R.push(new Array(p).fill(1))
  }
  for (let a = 0; a < p; a++) {
    for (let b = a + 1; b < p; b++) {
      const r = corrOf(cols[a], cols[b])
      R[a][b] = r
      R[b][a] = r
    }
  }
  return R
}

/**
 * CTA-PLS：confirmatory tetrad analysis（Gudergan, Ringle, Wende & Will 2008, JBR 61(12)）。
 *
 * 檢定「反映型（共同因子）測量模型隱含的 model-implied tetrads 是否消失」。
 * tetrad 顯著不為 0 → 反映型設定被否證 → 該構念應改採形成型。
 *
 * 程序：
 *   1. 每個 ≥4 指標的構念，在其指標相關矩陣上算 k(k−3)/2 個非冗餘 tetrad
 *   2. bootstrap（重抽個案、每次重算相關矩陣）→ tetrad 的 bias 與 SE
 *   3. bias-corrected ＋ 區塊內 Bonferroni 的 CI：
 *        CI = (τ̂ − bias) ± t_{1−α/(2T), B−1} · SE          （T = 該區塊 tetrad 數）
 *   4. 任一 CI 不含 0 → 判為形成型（拒絕反映型）
 *
 * 指標少於 4 個的構念**無法**做 tetrad 檢定（數學上不存在 tetrad），
 * 一律明確列入 skipped 並附中文說明——不靜默略過（架構不變量 4）。
 *
 * @param {object[]} rows 資料列
 * @param {object} model PLS 模型 JSON
 * @param {object} options {
 *   n=5000              bootstrap 重抽次數
 *   seed=42             PRNG 種子
 *   ciAlpha=0.05        族系錯誤率（Bonferroni 前）
 *   bootstrapIndices    注入固定重抽索引（number[][]，測試／基準交叉驗證用；給了就忽略 n/seed）
 *   missing='casewise'  缺失值處理
 * }
 * @returns {{ blocks, skipped, nBootstrap, ciAlpha, warnings }} | { error, message }
 */
export function ctaPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'CTA-PLS')
  if (bad) return bad

  const valid = validatePLSModel(model)
  if (!valid.ok) {
    return { error: 'invalid-model', message: `模型不合法：${valid.errors.join('；')}` }
  }
  const lvs = valid.model.latentVariables

  const ciAlpha = options.ciAlpha ?? 0.05
  if (!(ciAlpha > 0 && ciAlpha < 1)) {
    return { error: 'cta-bad-alpha', message: `ciAlpha 必須介於 0 與 1 之間（收到 ${options.ciAlpha}）` }
  }

  const eligible = lvs.filter((lv) => lv.indicators.length >= 4)
  const skipped = lvs
    .filter((lv) => lv.indicators.length < 4)
    .map((lv) => ({
      lv: lv.name,
      nIndicators: lv.indicators.length,
      reason: `構念「${lv.name}」只有 ${lv.indicators.length} 個指標；tetrad 檢定至少需要 4 個指標（Gudergan et al. 2008），本構念無法判讀測量模式`,
    }))

  if (eligible.length === 0) {
    return {
      error: 'cta-no-eligible-construct',
      message: `CTA-PLS 需要至少一個含 4 個以上指標的構念，但模型中每個構念的指標都少於 4 個（${skipped.map((s) => `${s.lv}: ${s.nIndicators}`).join('、')}）`,
    }
  }

  const allInd = eligible.flatMap((lv) => lv.indicators)
  const ext = extractMatrix(rows, allInd, options.missing ?? 'casewise')
  if (ext.error) return ext
  const { X, n, nDropped } = ext
  if (n < 10) {
    return { error: 'too-few-cases', message: `缺失值處理後樣本數只剩 ${n} 筆（CTA-PLS 至少需要 10 筆）` }
  }

  // bootstrap 重抽索引：注入優先（基準交叉驗證），否則以固定種子 PRNG 生成
  let bootIdx = options.bootstrapIndices
  if (bootIdx) {
    if (!Array.isArray(bootIdx) || bootIdx.length === 0
        || !bootIdx.every((d) => Array.isArray(d) && d.length === n)) {
      return {
        error: 'cta-bad-bootstrap-indices',
        message: `注入的 bootstrapIndices 必須是非空的二維陣列，且每組長度等於樣本數（n = ${n}）`,
      }
    }
  } else {
    const B = options.n ?? 5000
    if (!Number.isInteger(B) || B < 100) {
      return { error: 'cta-too-few-bootstrap', message: `bootstrap 次數至少 100（收到 ${options.n}）` }
    }
    const rnd = mulberry32(options.seed ?? 42)
    bootIdx = []
    for (let b = 0; b < B; b++) {
      const idx = new Array(n)
      for (let i = 0; i < n; i++) idx[i] = Math.floor(rnd() * n)
      bootIdx.push(idx)
    }
  }
  const B = bootIdx.length

  const colOf = (name) => {
    const j = allInd.indexOf(name)
    const c = new Float64Array(n)
    for (let i = 0; i < n; i++) c[i] = X[i][j]
    return c
  }

  const blocks = []
  for (const lv of eligible) {
    const k = lv.indicators.length
    const tets = ctaNonredundantTetrads(k)
    const T = tets.length
    const cols = lv.indicators.map(colOf)
    const R0 = corrMatrixOf(cols)
    const obs = tets.map((t) => tetradValue(R0, t))

    // bootstrap：每次重抽個案 → 重算相關矩陣 → 重算 tetrads
    const draws = tets.map(() => new Float64Array(B))
    const resampled = cols.map(() => new Float64Array(n))
    for (let b = 0; b < B; b++) {
      const idx = bootIdx[b]
      for (let a = 0; a < k; a++) {
        const src = cols[a]
        const dst = resampled[a]
        for (let i = 0; i < n; i++) dst[i] = src[idx[i]]
      }
      const Rb = corrMatrixOf(resampled)
      for (let q = 0; q < T; q++) draws[q][b] = tetradValue(Rb, tets[q])
    }

    const tCrit = qT(ciAlpha / T, B - 1)
    const tetrads = []
    let nNonVanishing = 0
    for (let q = 0; q < T; q++) {
      const d = draws[q]
      const bias = meanOf(d) - obs[q]
      const se = sdOf(d)
      const centre = obs[q] - bias
      const ciLower = centre - tCrit * se
      const ciUpper = centre + tCrit * se
      const nonVanishing = ciLower > 0 || ciUpper < 0
      if (nonVanishing) nNonVanishing++
      tetrads.push({
        label: [tets[q][0], tets[q][1], tets[q][2], tets[q][3]]
          .map((z) => lv.indicators[z]).join(','),
        value: obs[q],
        bias,
        se,
        t: se > 0 ? obs[q] / se : null,
        p: se > 0 ? pT(Math.abs(obs[q] / se), B - 1) : null,
        ciLower,
        ciUpper,
        nonVanishing,
      })
    }
    blocks.push({
      lv: lv.name,
      declaredMode: lv.mode,
      nIndicators: k,
      nTetrads: T,
      tCrit,
      alphaAdjusted: ciAlpha / T,
      tetrads,
      nNonVanishing,
      verdict: nNonVanishing > 0 ? 'formative' : 'reflective',
      // 宣告與判讀不一致 → UI 需提示重新檢視測量模式
      conflict: (nNonVanishing > 0 ? 'formative' : 'reflective') !== lv.mode,
    })
  }

  const warnings = []
  if (n < 30) warnings.push(`樣本數偏低（n = ${n}），tetrad 的 bootstrap 推論穩定性有限`)
  if (nDropped > 0) warnings.push(`casewise deletion 剔除 ${nDropped} 筆含缺失值的資料列`)
  if (skipped.length > 0) {
    warnings.push(`${skipped.length} 個構念因指標少於 4 個而無法檢定：${skipped.map((s) => s.lv).join('、')}`)
  }

  return { blocks, skipped, n, nDropped, nBootstrap: B, ciAlpha, warnings }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Gaussian copula 內生性檢查（W6，§6.5）
 *
 * Park & Gupta (2012), Marketing Science 31(4)；PLS-SEM 應用流程依
 * Hult, Hair, Proksch, Sarstedt, Pinkwart & Ringle (2018), JIM 26(3)。
 *
 * 原理：若解釋變數 P 與結構誤差相關（內生），則把
 *     c_P = Φ⁻¹(H(P))，H = P 的經驗 CDF
 * 加入該內生構念的結構迴歸後，c_P 的係數會顯著。c_P 係數不顯著 → 無內生性證據。
 *
 * 識別條件（Park & Gupta 2012）：P 必須「非常態」。P 為常態時 copula 法無從識別，
 * 本實作以 KS（Lilliefors）把關並在報表明確警告，但仍照算（不靜默擋掉）。
 *
 * 慣例：H 以 ecdf(P)(P) 計算（並列取最大秩 ÷ n），H = 1 夾為 1 − 1e−7
 * （Hult et al. 2018 公開程式碼的作法）。copula 項為秩基底 → 對單調變換不變，
 * 故 LV 分數標準化與否不影響 c_P。
 *
 * 顯著性：copula 項的漸近 SE 非標準，Hult et al. (2018) 建議 bootstrap。
 * 本實作每次重抽都「重估 PLS 權重 → 重算 copula 項 → 重跑擴充迴歸」（完整巢套）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** c = Φ⁻¹(ecdf(v)(v))；並列取最大秩；H = 1 夾為 1 − 1e−7（Hult et al. 2018）。 */
export function copulaTerm(v) {
  const n = v.length
  if (n === 0) return []
  const sorted = [...v].sort((a, b) => a - b)
  return v.map((x) => {
    // 「≤ x 的個數」＝ 右插入點（並列取最大秩）
    let lo = 0
    let hi = n
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] <= x) lo = mid + 1
      else hi = mid
    }
    let h = lo / n
    if (h >= 1) h = 1 - 1e-7
    return qnorm(h)
  })
}

/** 含截距的 OLS；回傳 { coefs（不含截距）, r2 } 或 null（奇異）。 */
function olsWithIntercept(cols, y) {
  const n = y.length
  const k = cols.length + 1
  const X = []
  for (let i = 0; i < n; i++) {
    const row = new Array(k)
    row[0] = 1
    for (let j = 0; j < cols.length; j++) row[j + 1] = cols[j][i]
    X.push(row)
  }
  // 正規方程 XᵀX b = Xᵀy（k 很小，用高斯消去）
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0))
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      let s = 0
      for (let i = 0; i < n; i++) s += X[i][a] * X[i][b]
      A[a][b] = s
    }
    let s = 0
    for (let i = 0; i < n; i++) s += X[i][a] * y[i]
    A[a][k] = s
  }
  for (let c = 0; c < k; c++) {
    let piv = c
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < 1e-12) return null
    if (piv !== c) { const t = A[piv]; A[piv] = A[c]; A[c] = t }
    for (let r = 0; r < k; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let cc = c; cc <= k; cc++) A[r][cc] -= f * A[c][cc]
    }
  }
  const b = new Array(k)
  for (let c = 0; c < k; c++) b[c] = A[c][k] / A[c][c]
  let ssRes = 0
  let ssTot = 0
  const ym = y.reduce((a, v) => a + v, 0) / n
  for (let i = 0; i < n; i++) {
    let pred = 0
    for (let c = 0; c < k; c++) pred += b[c] * X[i][c]
    ssRes += (y[i] - pred) ** 2
    ssTot += (y[i] - ym) ** 2
  }
  return { coefs: b.slice(1), r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 }
}

/** 非空子集列舉（k ≤ 5 時全組合；k > 5 只給「各自單獨」與「全部」以免爆炸）。 */
function copulaSubsets(k) {
  if (k <= 0) return []
  if (k <= 5) {
    const out = []
    for (let m = 1; m < (1 << k); m++) {
      const s = []
      for (let i = 0; i < k; i++) if (m & (1 << i)) s.push(i)
      out.push(s)
    }
    return out
  }
  const out = []
  for (let i = 0; i < k; i++) out.push([i])
  out.push(Array.from({ length: k }, (_, i) => i))
  return out
}

/**
 * Gaussian copula 內生性檢查。
 *
 * @param {object[]} rows 原始資料列
 * @param {object} model PLS 模型 JSON
 * @param {object} [options] {
 *   constructs?: string[]      要檢定的（可能內生的）解釋構念；預設＝所有出現在結構路徑左側者
 *   bootstrapN=1000            bootstrap 次數
 *   seed=42                    重抽種子
 *   bootstrapIndices?          注入固定重抽索引（number[][]；給了就忽略 bootstrapN/seed）
 *   ciAlpha=0.05               percentile CI 的 α
 *   normalityAlpha=0.05        KS 把關的 α（p ≥ α ⇒ 判為常態 ⇒ 警告）
 *   missing='casewise'
 *   ...runPLS 的其餘 options
 * }
 * @returns {{ normality, equations, nBootstrap, ciAlpha, n, nDropped, warnings }}
 *          | { error, message }
 */
export function copulaPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'Gaussian copula 內生性檢查')
  if (bad) return bad

  const valid = validatePLSModel(model)
  if (!valid.ok) {
    return { error: 'invalid-model', message: `模型不合法：${valid.errors.join('；')}` }
  }
  const m = valid.model
  const lvNames = m.latentVariables.map((lv) => lv.name)

  if (!Array.isArray(m.paths) || m.paths.length === 0) {
    return {
      error: 'copula-no-structural-path',
      message: 'Gaussian copula 內生性檢查需要結構路徑；目前模型沒有任何路徑',
    }
  }

  const ciAlpha = options.ciAlpha ?? 0.05
  if (!(ciAlpha > 0 && ciAlpha < 1)) {
    return { error: 'copula-bad-alpha', message: `ciAlpha 必須介於 0 與 1 之間（收到 ${options.ciAlpha}）` }
  }
  const normalityAlpha = options.normalityAlpha ?? 0.05

  // 結構方程：每個內生構念 → 其解釋構念清單（維持模型宣告順序）
  const eqs = []
  for (const lv of lvNames) {
    const preds = m.paths.filter((pp) => pp.to === lv).map((pp) => pp.from)
    if (preds.length > 0) eqs.push({ endogenous: lv, predictors: preds })
  }

  // 候選構念：使用者指定，或所有出現在路徑左側者
  const allPredictors = [...new Set(m.paths.map((pp) => pp.from))]
  let candidates = options.constructs ?? allPredictors
  const unknown = candidates.filter((c) => !lvNames.includes(c))
  if (unknown.length > 0) {
    return {
      error: 'copula-unknown-construct',
      message: `constructs 指定了模型中不存在的構念：${unknown.join('、')}（可用：${lvNames.join('、')}）`,
    }
  }
  candidates = candidates.filter((c) => allPredictors.includes(c))
  if (candidates.length === 0) {
    return {
      error: 'copula-no-candidate',
      message: 'Gaussian copula 只能檢定「作為解釋變數」的構念；指定的構念都不是任何結構路徑的起點',
    }
  }

  const baseOpts = { ...options }
  for (const k of ['constructs', 'bootstrapN', 'seed', 'bootstrapIndices',
    'ciAlpha', 'normalityAlpha', 'onProgress']) delete baseOpts[k]

  const base = runPLS(rows, m, baseOpts)
  if (base.error) return base

  const scoreOf = (res, lv) => res.scores.data[res.scores.lvNames.indexOf(lv)]
  const n = base.scores.data[0].length

  if (n < 10) {
    return { error: 'too-few-cases', message: `缺失值處理後樣本數只剩 ${n} 筆（copula 檢查至少需要 10 筆）` }
  }

  const warnings = []

  // 前置：非常態把關（Park & Gupta 的識別條件）
  const normality = candidates.map((lv) => {
    const ks = kolmogorovSmirnov(scoreOf(base, lv))
    const nonNormal = !(ks.p >= normalityAlpha)
    if (!nonNormal) {
      warnings.push(`構念「${lv}」的分數在 KS（Lilliefors）檢定下未拒絕常態（D = ${ks.D.toFixed(4)}、p = ${ks.p.toFixed(3)}）；Gaussian copula 的識別條件要求解釋變數非常態（Park & Gupta, 2012），此構念的 copula 結果不可靠，請勿據以判定內生性`)
    }
    return { lv, D: ks.D, p: ks.p, nonNormal }
  })

  // 每個方程要跑的 copula 子集
  const plan = eqs.map((eq) => {
    const cand = eq.predictors.filter((p) => candidates.includes(p))
    return { ...eq, candidates: cand, subsets: copulaSubsets(cand.length) }
  }).filter((eq) => eq.candidates.length > 0)

  if (plan.length === 0) {
    return {
      error: 'copula-no-candidate',
      message: '指定的構念都沒有出現在任何結構方程的解釋變數中，無從檢定',
    }
  }
  for (const eq of plan) {
    if (eq.candidates.length > 5) {
      warnings.push(`構念「${eq.endogenous}」的方程有 ${eq.candidates.length} 個候選 copula，全組合會有 ${2 ** eq.candidates.length - 1} 個模型；本次只跑「各自單獨」與「全部同時」（Hult et al. 2018 建議在候選較少時檢視全組合）`)
    }
  }

  /** 對一次 PLS 結果，算出每個方程每個子集的係數向量（順序：預測構念…, copula…）。 */
  const fitAll = (res) => plan.map((eq) => {
    const y = scoreOf(res, eq.endogenous)
    const predCols = eq.predictors.map((p) => scoreOf(res, p))
    const copCols = new Map()
    for (const c of eq.candidates) copCols.set(c, copulaTerm(scoreOf(res, c)))
    return eq.subsets.map((sub) => {
      const cols = [...predCols, ...sub.map((i) => copCols.get(eq.candidates[i]))]
      return olsWithIntercept(cols, y)
    })
  })

  const obs = fitAll(base)

  // bootstrap：完整巢套（重抽 → 重估權重 → 重算 copula → 重跑迴歸）
  const B = options.bootstrapIndices ? options.bootstrapIndices.length : (options.bootstrapN ?? 1000)
  const rand = mulberry32(options.seed ?? 42)
  const drawIdx = (i) => {
    if (options.bootstrapIndices) return options.bootstrapIndices[i]
    const idx = new Array(rows.length)
    for (let j = 0; j < rows.length; j++) idx[j] = Math.floor(rand() * rows.length)
    return idx
  }

  // draws[eqIdx][subIdx][coefIdx] = number[]
  const draws = obs.map((eqFits) => eqFits.map((f) => (f ? f.coefs.map(() => []) : null)))
  let nValid = 0
  for (let b = 0; b < B; b++) {
    const idx = drawIdx(b)
    const sample = idx.map((i) => rows[i])
    const res = runPLS(sample, m, baseOpts)
    if (res.error) continue
    const fits = fitAll(res)
    let ok = true
    for (let e = 0; e < fits.length && ok; e++) {
      for (let s = 0; s < fits[e].length; s++) if (!fits[e][s]) { ok = false; break }
    }
    if (!ok) continue
    for (let e = 0; e < fits.length; e++) {
      for (let s = 0; s < fits[e].length; s++) {
        if (!draws[e][s]) continue
        for (let c = 0; c < fits[e][s].coefs.length; c++) draws[e][s][c].push(fits[e][s].coefs[c])
      }
    }
    nValid++
  }
  if (nValid < 2) {
    return { error: 'copula-bootstrap-failed', message: `bootstrap 有效重抽只有 ${nValid} 次（模型在重抽樣本上無法收斂）` }
  }

  const equations = plan.map((eq, e) => ({
    endogenous: eq.endogenous,
    predictors: eq.predictors,
    candidates: eq.candidates,
    models: eq.subsets.map((sub, s) => {
      const fit = obs[e][s]
      if (!fit) {
        // 共線／奇異：以狀態旗標表示，不用 error 欄位（error 欄位保留給引擎層級的錯誤碼）
        return { copulas: sub.map((i) => eq.candidates[i]), singular: true, coefficients: [], r2: null }
      }
      const names = [...eq.predictors, ...sub.map((i) => `c(${eq.candidates[i]})`)]
      const coefficients = names.map((name, c) => {
        const d = draws[e][s][c]
        const se = sdOf(d)
        const sorted = [...d].sort((x, y) => x - y)
        const t = se > 0 ? fit.coefs[c] / se : null
        return {
          name,
          isCopula: c >= eq.predictors.length,
          coef: fit.coefs[c],
          se,
          t,
          p: t === null ? null : pT(Math.abs(t), nValid - 1), // pT 已為雙尾
          ciLower: quantile(sorted, ciAlpha / 2),
          ciUpper: quantile(sorted, 1 - ciAlpha / 2),
        }
      })
      // 判讀：任一 copula 項的 CI 不含 0 → 該模型有內生性訊號
      const endogenous = coefficients
        .filter((c) => c.isCopula)
        .some((c) => !(c.ciLower <= 0 && c.ciUpper >= 0))
      return {
        copulas: sub.map((i) => eq.candidates[i]),
        coefficients,
        r2: fit.r2,
        endogeneitySignal: endogenous,
      }
    }),
  }))

  return {
    normality,
    equations,
    n,
    nDropped: base.meta?.nDropped ?? 0,
    nBootstrap: nValid,
    ciAlpha,
    warnings,
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FIMIX-PLS：潛在（未觀察）異質性分段（W6，§6.1）
 *
 * Hahn, Johnson, Herrmann & Huber (2002), Schmalenbach Business Review 54(3)。
 * 段數選擇準則依 Sarstedt, Becker, Ringle & Schwaiger (2011), Schmalenbach BR 63(1)。
 *
 * 原理：全域 PLS 的路徑係數是「平均」——若樣本其實由結構關係不同的次群體組成，
 * 這個平均可能誰都不代表（極端情形：一個強正段與一個強負段相消，全域看起來沒關係）。
 * FIMIX 以全域 PLS 的標準化 LV 分數為輸入，對**內模型**做有限混合迴歸的 EM：
 *
 *   段 k、內生構念 j：η_ij ~ N(x_ij'β_kj, σ²_kj)   （Hahn et al. 原式不含截距）
 *   E 步：p_ik ∝ ρ_k · Π_j N(η_ij; x_ij'β_kj, σ²_kj)
 *   M 步：ρ_k = mean_i p_ik；β_kj = 以 p_ik 為權重的 OLS；σ²_kj = Σp_ik·resid² / Σp_ik
 *
 * 局部最優：EM 對起始值敏感 → 多起點（固定種子集）取 lnL 最高者。
 * label switching：段別以佔比 ρ 遞減排序，確保輸出決定性。
 *
 * 判讀邊界（UI Notes 另有完整說明）：
 *   · FIMIX 是**探索性**工具。找到的段必須能用可觀察變數事後刻畫，否則無法據以行動。
 *   · EN（normed entropy）< .50 表示段別分離不佳，分段結果不可信。
 *   · 段數選擇沒有單一準則；AIC 傾向高估、BIC/CAIC 傾向低估，應合看並以理論收斂。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 加權 OLS（無截距）：解 (XᵀWX)β = XᵀWy。回傳 β 或 null（奇異）。 */
function weightedOls(cols, y, w) {
  const k = cols.length
  const n = y.length
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0))
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      let s = 0
      for (let i = 0; i < n; i++) s += w[i] * cols[a][i] * cols[b][i]
      A[a][b] = s
    }
    let s = 0
    for (let i = 0; i < n; i++) s += w[i] * cols[a][i] * y[i]
    A[a][k] = s
  }
  for (let c = 0; c < k; c++) {
    let piv = c
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < 1e-12) return null
    if (piv !== c) { const t = A[piv]; A[piv] = A[c]; A[c] = t }
    for (let r = 0; r < k; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let cc = c; cc <= k; cc++) A[r][cc] -= f * A[c][cc]
    }
  }
  return A.map((row, c) => row[k] / A[c][c])
}

/**
 * 單次 EM（給定初始後驗機率）。
 * @returns {{ rho, beta, sigma2, post, lnL, iterations, converged, monotone }}
 */
function fimixEM(eqs, P0, K, n, maxIter, tol) {
  let P = P0.map((row) => {
    const s = row.reduce((a, v) => a + v, 0)
    return row.map((v) => v / s)
  })
  let lnLPrev = -Infinity
  let monotone = true
  let lnL = -Infinity
  let rho = new Array(K).fill(1 / K)
  let beta = null
  let sigma2 = null
  let it
  let converged = false

  for (it = 1; it <= maxIter; it++) {
    // ── M 步 ──
    rho = new Array(K).fill(0)
    for (let k = 0; k < K; k++) {
      let s = 0
      for (let i = 0; i < n; i++) s += P[i][k]
      rho[k] = s / n
    }
    beta = []   // beta[k][j] = number[]（該方程的係數）
    sigma2 = [] // sigma2[k][j]
    for (let k = 0; k < K; k++) {
      const w = P.map((row) => row[k])
      const sw = w.reduce((a, v) => a + v, 0)
      const bK = []
      const sK = []
      for (const eq of eqs) {
        if (sw < 1e-10) { bK.push(new Array(eq.X.length).fill(0)); sK.push(1e-8); continue }
        const b = weightedOls(eq.X, eq.y, w) || new Array(eq.X.length).fill(0)
        let ss = 0
        for (let i = 0; i < n; i++) {
          let pred = 0
          for (let c = 0; c < eq.X.length; c++) pred += b[c] * eq.X[c][i]
          ss += w[i] * (eq.y[i] - pred) ** 2
        }
        bK.push(b)
        sK.push(Math.max(ss / sw, 1e-8))
      }
      beta.push(bK)
      sigma2.push(sK)
    }

    // ── E 步（對數空間；同時得到 lnL）──
    const logf = []
    for (let i = 0; i < n; i++) {
      const row = new Array(K)
      for (let k = 0; k < K; k++) {
        let lp = Math.log(Math.max(rho[k], 1e-300))
        for (let j = 0; j < eqs.length; j++) {
          const eq = eqs[j]
          let pred = 0
          for (let c = 0; c < eq.X.length; c++) pred += beta[k][j][c] * eq.X[c][i]
          const r = eq.y[i] - pred
          const s2 = sigma2[k][j]
          lp += -0.5 * Math.log(2 * Math.PI * s2) - (r * r) / (2 * s2)
        }
        row[k] = lp
      }
      logf.push(row)
    }
    lnL = 0
    const Pnew = []
    for (let i = 0; i < n; i++) {
      const row = logf[i]
      const mx = Math.max(...row)
      let se = 0
      for (let k = 0; k < K; k++) se += Math.exp(row[k] - mx)
      const lse = mx + Math.log(se)
      lnL += lse
      Pnew.push(row.map((v) => Math.exp(v - lse)))
    }
    if (lnL < lnLPrev - 1e-6) monotone = false
    P = Pnew
    if (Math.abs(lnL - lnLPrev) < tol) { converged = true; break }
    lnLPrev = lnL
  }
  return { rho, beta, sigma2, post: P, lnL, iterations: Math.min(it, maxIter), converged, monotone }
}

/** 段數選擇準則（Sarstedt et al. 2011）。 */
function fimixCriteria(K, lnL, post, n, nPaths, nEndo) {
  const nk = (K - 1) + K * nPaths + K * nEndo
  const out = {
    lnL,
    nParams: nk,
    aic: -2 * lnL + 2 * nk,
    aic3: -2 * lnL + 3 * nk,
    aic4: -2 * lnL + 4 * nk,
    bic: -2 * lnL + Math.log(n) * nk,
    caic: -2 * lnL + (Math.log(n) + 1) * nk,
    hq: -2 * lnL + 2 * Math.log(Math.log(n)) * nk,
    mdl5: -2 * lnL + 5 * Math.log(n) * nk,
    en: null,
  }
  if (K >= 2) {
    let ent = 0
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < K; k++) {
        const p = post[i][k]
        if (p > 1e-300) ent -= p * Math.log(p)
      }
    }
    out.en = 1 - ent / (n * Math.log(K)) // normed entropy（Ramaswamy et al. 1993）
  }
  return out
}

/**
 * FIMIX-PLS。
 *
 * @param {object[]} rows
 * @param {object} model PLS 模型 JSON
 * @param {object} [options] {
 *   segments=2            要輸出詳細解的段數 K
 *   kMax?                 給了就額外算 K = 1..kMax 的段數選擇表
 *   restarts=10           多起點次數（EM 對起始值敏感；取 lnL 最高者）
 *   seed=42               起始值種子
 *   initPosteriors?       注入固定初始後驗（n×K；給了就只跑這一個起點——基準交叉驗證用）
 *   maxIterations=2000, tolerance=1e-10
 *   missing='casewise'
 *   ...runPLS 的其餘 options
 * }
 */
export function fimixPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'FIMIX-PLS')
  if (bad) return bad

  const valid = validatePLSModel(model)
  if (!valid.ok) {
    return { error: 'invalid-model', message: `模型不合法：${valid.errors.join('；')}` }
  }
  const m = valid.model
  const lvNames = m.latentVariables.map((lv) => lv.name)

  if (!Array.isArray(m.paths) || m.paths.length === 0) {
    return {
      error: 'fimix-no-structural-path',
      message: 'FIMIX-PLS 是對「內模型」分段；目前模型沒有任何結構路徑，無從分段',
    }
  }

  const K = options.segments ?? 2
  if (!Number.isInteger(K) || K < 1) {
    return { error: 'fimix-bad-segments', message: `段數必須是 ≥ 1 的整數（收到 ${options.segments}）` }
  }

  const baseOpts = { ...options }
  for (const k of ['segments', 'kMax', 'restarts', 'seed', 'initPosteriors',
    'maxIterations', 'tolerance', 'onProgress']) delete baseOpts[k]

  const base = runPLS(rows, m, baseOpts)
  if (base.error) return base

  const scoreOf = (lv) => base.scores.data[base.scores.lvNames.indexOf(lv)]
  const n = base.scores.data[0].length

  // 內模型的方程組
  const eqs = []
  for (const lv of lvNames) {
    const preds = m.paths.filter((pp) => pp.to === lv).map((pp) => pp.from)
    if (preds.length === 0) continue
    eqs.push({ endogenous: lv, predictors: preds, y: scoreOf(lv), X: preds.map(scoreOf) })
  }
  const nPaths = eqs.reduce((a, e) => a + e.predictors.length, 0)
  const nEndo = eqs.length

  // 樣本數把關：Hahn et al. 建議每段至少要有足夠自由度
  const minN = 10 * K
  if (n < minN) {
    return {
      error: 'too-few-cases',
      message: `FIMIX 分 ${K} 段至少需要 ${minN} 筆資料（每段 10 筆為極保守下限），目前只有 ${n} 筆；段數過多會得到無意義的解`,
    }
  }

  const maxIter = options.maxIterations ?? 2000
  const tol = options.tolerance ?? 1e-10
  const warnings = []

  const runK = (kk) => {
    if (kk === 1) {
      const P0 = Array.from({ length: n }, () => [1])
      return { ...fimixEM(eqs, P0, 1, n, maxIter, tol), restarts: 1 }
    }
    if (options.initPosteriors) {
      const P0 = options.initPosteriors
      if (P0.length !== n || P0[0].length !== kk) {
        return { error: 'fimix-bad-init', message: `initPosteriors 的形狀應為 ${n}×${kk}，收到 ${P0.length}×${P0[0]?.length}` }
      }
      return { ...fimixEM(eqs, P0, kk, n, maxIter, tol), restarts: 1 }
    }
    const R = options.restarts ?? 10
    const rand = mulberry32((options.seed ?? 42) + kk * 1000)
    let best = null
    for (let r = 0; r < R; r++) {
      const P0 = Array.from({ length: n }, () => Array.from({ length: kk }, () => rand() + 0.1))
      const sol = fimixEM(eqs, P0, kk, n, maxIter, tol)
      if (!best || sol.lnL > best.lnL) best = sol
    }
    return { ...best, restarts: R }
  }

  const solve = (kk) => {
    const sol = runK(kk)
    if (sol.error) return sol
    // label switching：依段別佔比 ρ 遞減排序
    const ord = sol.rho.map((_, i) => i).sort((a, b) => sol.rho[b] - sol.rho[a])
    return {
      ...sol,
      rho: ord.map((k) => sol.rho[k]),
      beta: ord.map((k) => sol.beta[k]),
      sigma2: ord.map((k) => sol.sigma2[k]),
      post: sol.post.map((row) => ord.map((k) => row[k])),
    }
  }

  const main = solve(K)
  if (main.error) return main
  if (!main.converged) {
    warnings.push(`EM 在 ${maxIter} 次迭代內未達收斂容差（${tol}）；結果可能不穩定，建議提高迭代上限或減少段數`)
  }
  if (!main.monotone) {
    warnings.push('EM 的對數概似出現下降——這在數學上不應發生，請回報此案例')
  }

  const criteria = fimixCriteria(K, main.lnL, main.post, n, nPaths, nEndo)
  if (criteria.en !== null && criteria.en < 0.5) {
    warnings.push(`normed entropy EN = ${criteria.en.toFixed(3)} < .50，段別分離不佳（Ramaswamy et al., 1993 判準）；此分段結果不宜據以行動`)
  }

  const assignment = main.post.map((row) => row.indexOf(Math.max(...row)))
  const counts = new Array(K).fill(0)
  for (const a of assignment) counts[a]++
  const tiny = counts.filter((c) => c < 0.05 * n).length
  if (tiny > 0) {
    warnings.push(`有 ${tiny} 個段的成員數不足全樣本的 5%——段數可能過多（Hair et al. 建議每段至少要能支撐該段的模型估計）`)
  }

  const segments = main.rho.map((share, k) => ({
    index: k + 1,
    share,
    expectedSize: share * n,
    assignedSize: counts[k],
    equations: eqs.map((eq, j) => ({
      endogenous: eq.endogenous,
      sigma2: main.sigma2[k][j],
      coefficients: eq.predictors.map((from, c) => ({ from, coef: main.beta[k][j][c] })),
    })),
  }))

  let selection = null
  if (options.kMax) {
    const kMax = options.kMax
    if (!Number.isInteger(kMax) || kMax < 1) {
      return { error: 'fimix-bad-segments', message: `kMax 必須是 ≥ 1 的整數（收到 ${options.kMax}）` }
    }
    selection = []
    for (let kk = 1; kk <= kMax; kk++) {
      if (n < 10 * kk) break
      const sol = kk === K ? main : solve(kk)
      if (sol.error) continue
      selection.push({ k: kk, ...fimixCriteria(kk, sol.lnL, sol.post, n, nPaths, nEndo) })
    }
  }

  return {
    segments,
    posteriors: main.post,
    assignment,
    criteria,
    selection,
    n,
    nDropped: base.meta?.nDropped ?? 0,
    lnL: main.lnL,
    iterations: main.iterations,
    converged: main.converged,
    restarts: main.restarts,
    warnings,
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PLS-POS：prediction-oriented segmentation（W6，§6.2）
 *
 * Becker, Rai, Ringle & Völckner (2013), MIS Quarterly 37(3)。
 * 與 FIMIX 互補——同樣處理未觀察異質性，但目標函數完全不同：
 *
 *            FIMIX                          PLS-POS
 *   指派      軟（後驗機率）                  硬（每個個案屬於一段）
 *   目標      混合模型的對數概似               內生構念的**預測誤差**（殘差平方和）
 *   演算法    EM                             逐案重新指派的爬山法
 *   分布假設  常態                           無
 *
 * 目標函數：Obj = Σ_段 Σ_內生構念 SSE_段,構念，愈小愈好。
 *
 * 爬山法（確定性）：以充分統計量（A = Σxx'、b = Σxy、yy = Σy²、n）做增量更新——
 * 搬移一個個案只需 O(k²)，不必重跑整段的 OLS。逐案（索引序）試著搬到其他段（段索引序），
 * 取「改善最大且 > 1e-12」者；同分取段索引較小者。一輪掃完沒有搬移即停止。
 *
 * ★ 本法的關鍵弱點（UI 明確警告）：目標函數**必然**隨段數增加而下降——
 * 段數愈多、配適愈好，POS 自己沒有懲罰項。所以 **POS 不能用來選段數**。
 * 段數要靠 FIMIX 的資訊準則、理論、或段別的可解釋性來決定。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 單段單方程的充分統計量 → { sse, beta }。A: k×k、b: k、yy: 純量。 */
function posSolve(A, b, yy, k) {
  // 解 Aβ = b（高斯消去；k 很小）
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < k; c++) {
    let piv = c
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    if (Math.abs(M[piv][c]) < 1e-12) return { sse: yy, beta: new Array(k).fill(0) }
    if (piv !== c) { const t = M[piv]; M[piv] = M[c]; M[c] = t }
    for (let r = 0; r < k; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let cc = c; cc <= k; cc++) M[r][cc] -= f * M[c][cc]
    }
  }
  const beta = M.map((row, c) => row[k] / M[c][c])
  let bb = 0
  for (let i = 0; i < k; i++) bb += beta[i] * b[i]
  return { sse: Math.max(yy - bb, 0), beta }
}

/**
 * PLS-POS。
 *
 * @param {object[]} rows
 * @param {object} model
 * @param {object} [options] {
 *   segments=2          段數 K（POS 不能用來選段數——見上方註解）
 *   starts=10           多起始分割（爬山法只保證局部最優；取目標函數最小者）
 *   seed=42
 *   initAssignment?     注入固定起始分割（number[]；給了就只跑這一個起點——基準交叉驗證用）
 *   minSize?            段別大小下限（預設 max(3, 5% 樣本)；硬約束）
 *   maxPasses=100
 *   missing='casewise'
 *   ...runPLS 的其餘 options
 * }
 */
export function posPLS(rows, model, options = {}) {
  const bad = rejectW4(model, 'PLS-POS')
  if (bad) return bad

  const valid = validatePLSModel(model)
  if (!valid.ok) {
    return { error: 'invalid-model', message: `模型不合法：${valid.errors.join('；')}` }
  }
  const m = valid.model
  const lvNames = m.latentVariables.map((lv) => lv.name)

  if (!Array.isArray(m.paths) || m.paths.length === 0) {
    return {
      error: 'pos-no-structural-path',
      message: 'PLS-POS 是對「內模型」分段；目前模型沒有任何結構路徑，無從分段',
    }
  }

  const K = options.segments ?? 2
  if (!Number.isInteger(K) || K < 2) {
    return { error: 'pos-bad-segments', message: `段數必須是 ≥ 2 的整數（收到 ${options.segments}）；K = 1 就是全域模型` }
  }

  const baseOpts = { ...options }
  for (const k of ['segments', 'starts', 'seed', 'initAssignment', 'minSize',
    'maxPasses', 'onProgress']) delete baseOpts[k]

  const base = runPLS(rows, m, baseOpts)
  if (base.error) return base

  const scoreOf = (lv) => base.scores.data[base.scores.lvNames.indexOf(lv)]
  const n = base.scores.data[0].length

  const eqs = []
  for (const lv of lvNames) {
    const preds = m.paths.filter((pp) => pp.to === lv).map((pp) => pp.from)
    if (preds.length === 0) continue
    eqs.push({ endogenous: lv, predictors: preds, y: scoreOf(lv), X: preds.map(scoreOf) })
  }

  const minSize = options.minSize ?? Math.max(3, Math.floor(0.05 * n))
  if (n < minSize * K) {
    return {
      error: 'too-few-cases',
      message: `PLS-POS 分 ${K} 段、每段下限 ${minSize} 筆，至少需要 ${minSize * K} 筆資料，目前只有 ${n} 筆`,
    }
  }

  /** 一組段別的充分統計量。 */
  const makeStats = () => eqs.map((eq) => {
    const k = eq.X.length
    return {
      A: Array.from({ length: k }, () => new Array(k).fill(0)),
      b: new Array(k).fill(0),
      yy: 0,
    }
  })
  const addCase = (st, i, sign) => {
    for (let j = 0; j < eqs.length; j++) {
      const eq = eqs[j]
      const k = eq.X.length
      for (let a = 0; a < k; a++) {
        for (let bb = 0; bb < k; bb++) st[j].A[a][bb] += sign * eq.X[a][i] * eq.X[bb][i]
        st[j].b[a] += sign * eq.X[a][i] * eq.y[i]
      }
      st[j].yy += sign * eq.y[i] * eq.y[i]
    }
  }
  const sseOf = (st) => st.reduce((acc, s, j) => acc + posSolve(s.A, s.b, s.yy, eqs[j].X.length).sse, 0)

  const maxPasses = options.maxPasses ?? 100
  let monotone = true

  const climb = (assign0) => {
    const assign = [...assign0]
    const stats = Array.from({ length: K }, makeStats)
    const counts = new Array(K).fill(0)
    for (let i = 0; i < n; i++) { addCase(stats[assign[i]], i, +1); counts[assign[i]]++ }

    let obj = stats.reduce((a, st) => a + sseOf(st), 0)
    let moves = 0
    let passes = 0
    for (let p = 1; p <= maxPasses; p++) {
      passes = p
      let moved = false
      for (let i = 0; i < n; i++) {
        const s = assign[i]
        if (counts[s] - 1 < minSize) continue
        const sseSin = sseOf(stats[s])
        addCase(stats[s], i, -1)
        const sseSout = sseOf(stats[s])
        let bestT = -1
        let bestGain = 1e-12
        for (let t = 0; t < K; t++) {
          if (t === s) continue
          const sseTin = sseOf(stats[t])
          addCase(stats[t], i, +1)
          const sseTout = sseOf(stats[t])
          addCase(stats[t], i, -1)
          const gain = (sseSin + sseTin) - (sseSout + sseTout)
          if (gain > bestGain) { bestGain = gain; bestT = t } // 嚴格 > → 同分取段索引較小者
        }
        if (bestT >= 0) {
          addCase(stats[bestT], i, +1)
          counts[s]--; counts[bestT]++
          assign[i] = bestT
          moved = true; moves++
        } else {
          addCase(stats[s], i, +1) // 還原
        }
      }
      const newObj = stats.reduce((a, st) => a + sseOf(st), 0)
      if (newObj > obj + 1e-6) monotone = false
      obj = newObj
      if (!moved) break
    }
    return { assign, stats, counts, obj, passes, moves }
  }

  let best = null
  let starts = 1
  if (options.initAssignment) {
    const a0 = options.initAssignment
    if (a0.length !== n || a0.some((v) => !Number.isInteger(v) || v < 0 || v >= K)) {
      return { error: 'pos-bad-init', message: `initAssignment 應為長度 ${n}、值域 0..${K - 1} 的整數陣列` }
    }
    const cnt = new Array(K).fill(0)
    for (const v of a0) cnt[v]++
    if (cnt.some((c) => c < minSize)) {
      return { error: 'pos-bad-init', message: `initAssignment 的某些段小於下限 ${minSize} 筆` }
    }
    best = climb(a0)
  } else {
    starts = options.starts ?? 10
    const rand = mulberry32((options.seed ?? 42) + K * 7919)
    for (let r = 0; r < starts; r++) {
      const a0 = Array.from({ length: n }, () => Math.floor(rand() * K))
      // 修補：確保每段達下限
      const cnt = new Array(K).fill(0)
      for (const v of a0) cnt[v]++
      for (let k = 0; k < K; k++) {
        let guard = 0
        while (cnt[k] < minSize && guard++ < n) {
          const donor = cnt.indexOf(Math.max(...cnt))
          const i = a0.indexOf(donor)
          if (i < 0 || cnt[donor] - 1 < minSize) break
          a0[i] = k; cnt[donor]--; cnt[k]++
        }
      }
      const sol = climb(a0)
      if (!best || sol.obj < best.obj) best = sol
    }
  }

  // 全域（單段）對照：分段前的預測誤差
  const globalStats = makeStats()
  for (let i = 0; i < n; i++) addCase(globalStats, i, +1)
  const globalSse = sseOf(globalStats)
  const totalYY = globalStats.reduce((a, s) => a + s.yy, 0)

  // label switching：段別依大小遞減排序
  const ord = best.counts.map((_, i) => i).sort((a, b) => best.counts[b] - best.counts[a])
  const remap = new Array(K)
  ord.forEach((old, neu) => { remap[old] = neu })

  const segments = ord.map((k, i) => {
    const st = best.stats[k]
    const equations = eqs.map((eq, j) => {
      const { sse, beta } = posSolve(st[j].A, st[j].b, st[j].yy, eq.X.length)
      return {
        endogenous: eq.endogenous,
        sse,
        r2: st[j].yy > 1e-12 ? 1 - sse / st[j].yy : 0,
        coefficients: eq.predictors.map((from, c) => ({ from, coef: beta[c] })),
      }
    })
    return {
      index: i + 1,
      size: best.counts[k],
      share: best.counts[k] / n,
      sse: equations.reduce((a, e) => a + e.sse, 0),
      equations,
    }
  })

  const warnings = []
  if (!monotone) {
    warnings.push('爬山法的目標函數出現上升——這在數學上不應發生，請回報此案例')
  }
  if (best.passes >= maxPasses) {
    warnings.push(`爬山法在 ${maxPasses} 輪內未停止；結果可能不是局部最優`)
  }
  warnings.push('PLS-POS 的目標函數（預測誤差）必然隨段數增加而下降——本法自身沒有懲罰項，因此**不能用來選段數**。段數請依 FIMIX 的資訊準則、理論、或段別的可解釋性決定。')

  return {
    segments,
    assignment: best.assign.map((k) => remap[k]),
    objective: best.obj,
    r2Overall: totalYY > 1e-12 ? 1 - best.obj / totalYY : 0,
    global: {
      sse: globalSse,
      r2: totalYY > 1e-12 ? 1 - globalSse / totalYY : 0,
      equations: eqs.map((eq, j) => {
        const { sse, beta } = posSolve(globalStats[j].A, globalStats[j].b, globalStats[j].yy, eq.X.length)
        return {
          endogenous: eq.endogenous,
          sse,
          coefficients: eq.predictors.map((from, c) => ({ from, coef: beta[c] })),
        }
      }),
    },
    n,
    nDropped: base.meta?.nDropped ?? 0,
    minSize,
    passes: best.passes,
    moves: best.moves,
    starts,
    warnings,
  }
}
