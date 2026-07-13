/**
 * 驗證性因素分析（CFA）— 最大概似估計（Maximum Likelihood）
 *
 * Confirmatory Factor Analysis with ML estimation, simple structure
 * (each indicator loads on exactly one factor; no cross-loadings; no
 * correlated residuals), factor variances fixed at 1.0 for identification.
 *
 * 對外 API：
 *   cfa(rows, factors) → 完整結果
 *
 * factors 結構：
 *   [{ name: 'F1', indicators: ['v1', 'v2', 'v3'] }, ...]
 *
 * 模型設定：
 *   Σ(θ) = Λ Φ Λᵀ + Θ
 *     Λ      p × m  因子負荷量（簡單結構：每個指標只裝載一個因子）
 *     Φ      m × m  因子共變數矩陣（對角線固定 = 1，相關為自由參數）
 *     Θ      p × p  指標殘差變異矩陣（對角；自由參數）
 *
 * 自由參數 t = p（loadings）+ m(m-1)/2（factor correlations）+ p（residual variances）
 * 自由度 df = p(p+1)/2 − t
 *
 * 估計流程：
 *   1. 樣本共變數矩陣 S（listwise deletion）
 *   2. 重新參數化以避免邊界：
 *        loadings 直接為實數
 *        residual variances 用 τ = log(θ) 表達 → θ = exp(τ) > 0
 *        factor correlations 用 z = atanh(ρ) 表達 → ρ = tanh(z) ∈ (−1, 1)
 *   3. 最小化 F_ML(θ) = log|Σ| + tr(SΣ⁻¹) − log|S| − p
 *   4. 用 quasi-Newton（BFGS）+ 中央差分數值梯度
 *   5. 收斂條件：‖∇F‖ < 1e-6 或 ΔF < 1e-9 或 200 次迭代
 *   6. χ² = (N − 1) · F_min；df 同上；CFI / TLI / RMSEA / SRMR
 *
 * 對標 R::lavaan::cfa()。
 */
import { isMissing } from '../variableTypes.js'
import { pChiSq } from './pvalue.js'
import { inverse } from './matrix.js'

/* ─────────────────  共變數矩陣（listwise）  ───────────────── */

function sampleCovariance(rows, columns) {
  const valid = []
  for (const r of rows) {
    let bad = false
    const row = []
    for (const c of columns) {
      const v = r[c]
      if (isMissing(v)) { bad = true; break }
      const nv = Number(v)
      if (!Number.isFinite(nv)) { bad = true; break }
      row.push(nv)
    }
    if (bad) continue
    valid.push(row)
  }
  const n = valid.length
  const p = columns.length
  if (n < p + 2) return { n, p, S: null, means: null }
  const means = new Array(p).fill(0)
  for (const r of valid) for (let i = 0; i < p; i++) means[i] += r[i]
  for (let i = 0; i < p; i++) means[i] /= n
  const S = []
  for (let i = 0; i < p; i++) S.push(new Array(p).fill(0))
  for (const r of valid) {
    for (let i = 0; i < p; i++) {
      const di = r[i] - means[i]
      for (let j = i; j < p; j++) {
        const dj = r[j] - means[j]
        S[i][j] += di * dj
      }
    }
  }
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      S[i][j] /= (n - 1)
      if (i !== j) S[j][i] = S[i][j]
    }
  }
  return { n, p, S, means }
}

/* ─────────────────  矩陣輔助：Cholesky-based log|·| 與 trace(S·M⁻¹)  ───────────────── */

/**
 * 對稱正定矩陣的 Cholesky 分解：A = L · Lᵀ
 * 回傳下三角 L；若不是正定則回傳 null。
 */
function cholesky(A) {
  const n = A.length
  const L = []
  for (let i = 0; i < n; i++) L.push(new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j]
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k]
      if (i === j) {
        if (sum <= 1e-14) return null
        L[i][j] = Math.sqrt(sum)
      } else {
        L[i][j] = sum / L[j][j]
      }
    }
  }
  return L
}

/** 由 Cholesky 因子計算 log|A| = 2 · Σ log(L_ii) */
function logDetFromChol(L) {
  let s = 0
  for (let i = 0; i < L.length; i++) s += Math.log(L[i][i])
  return 2 * s
}

/* ─────────────────  參數向量 ↔ Λ, Φ, Θ  ───────────────── */

/**
 * 參數向量配置（長度 = p + m(m-1)/2 + p）：
 *   [0 .. p-1]                       loadings λ_i（每個指標一個）
 *   [p .. p + m(m-1)/2 - 1]          factor correlations 的 Fisher z（z_ij，i < j）
 *   [p + m(m-1)/2 .. end]            residual log-variances τ_i（θ_i = exp(τ_i)）
 */

function unpack(theta, structure) {
  const { p, m, indicatorFactor } = structure
  const Lambda = []
  for (let i = 0; i < p; i++) {
    const row = new Array(m).fill(0)
    row[indicatorFactor[i]] = theta[i]
    Lambda.push(row)
  }
  const Phi = []
  for (let i = 0; i < m; i++) {
    const row = new Array(m).fill(0)
    row[i] = 1
    Phi.push(row)
  }
  const nCorr = (m * (m - 1)) / 2
  let idx = p
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const z = theta[idx++]
      const rho = Math.tanh(z)
      Phi[i][j] = rho
      Phi[j][i] = rho
    }
  }
  const Theta = new Array(p)
  const offset = p + nCorr
  for (let i = 0; i < p; i++) Theta[i] = Math.exp(theta[offset + i])
  return { Lambda, Phi, Theta }
}

/** Σ = Λ Φ Λᵀ + diag(Θ) */
function modelImpliedCov(Lambda, Phi, Theta) {
  const p = Lambda.length
  const m = Phi.length
  // LF = Λ · Φ
  const LF = []
  for (let i = 0; i < p; i++) {
    const row = new Array(m).fill(0)
    for (let k = 0; k < m; k++) {
      let s = 0
      for (let l = 0; l < m; l++) s += Lambda[i][l] * Phi[l][k]
      row[k] = s
    }
    LF.push(row)
  }
  // Σ = LF · Λᵀ + diag(Θ)
  const Sigma = []
  for (let i = 0; i < p; i++) {
    const row = new Array(p).fill(0)
    for (let j = 0; j < p; j++) {
      let s = 0
      for (let k = 0; k < m; k++) s += LF[i][k] * Lambda[j][k]
      row[j] = s
    }
    if (Theta[i] !== undefined) row[i] += Theta[i]
    Sigma.push(row)
  }
  return Sigma
}

/* ─────────────────  ML 適配函數 F_ML(θ)  ───────────────── */

/**
 * F_ML = log|Σ| + tr(S Σ⁻¹) − log|S| − p
 *
 * 失敗（Σ 非正定 / 反矩陣失敗）→ 回傳 +∞
 */
function fitFunctionML(theta, structure, S, logDetS) {
  const { Lambda, Phi, Theta } = unpack(theta, structure)
  const p = S.length
  const Sigma = modelImpliedCov(Lambda, Phi, Theta)
  const L = cholesky(Sigma)
  if (!L) return { F: Infinity, Sigma }
  const logDetSigma = logDetFromChol(L)
  const SigmaInv = inverse(Sigma)
  if (!SigmaInv) return { F: Infinity, Sigma }
  // tr(S Σ⁻¹) = Σᵢ Σⱼ S_ij · SigmaInv_ji
  let tr = 0
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) tr += S[i][j] * SigmaInv[j][i]
  }
  const F = logDetSigma + tr - logDetS - p
  return { F, Sigma, SigmaInv }
}

/* ─────────────────  數值梯度（中央差分）  ───────────────── */

function numericalGradient(theta, evalF, h = 1e-5) {
  const k = theta.length
  const g = new Array(k).fill(0)
  for (let i = 0; i < k; i++) {
    const tp = theta.slice()
    const tm = theta.slice()
    tp[i] += h
    tm[i] -= h
    const fp = evalF(tp).F
    const fm = evalF(tm).F
    if (Number.isFinite(fp) && Number.isFinite(fm)) {
      g[i] = (fp - fm) / (2 * h)
    } else {
      g[i] = 0
    }
  }
  return g
}

/* ─────────────────  BFGS 最佳化  ───────────────── */

function vecAdd(a, b, scale = 1) {
  const out = new Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] + scale * b[i]
  return out
}
function vecSub(a, b) {
  const out = new Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i]
  return out
}
function vecDot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}
function vecNorm(a) {
  return Math.sqrt(vecDot(a, a))
}
function matVecBFGS(H, v) {
  const n = v.length
  const out = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) out[i] += H[i][j] * v[j]
  }
  return out
}

/**
 * 簡化 BFGS（含 backtracking line search）
 * 失敗時退回最後可用的 (theta, F)。
 */
function bfgs(theta0, evalF, opts = {}) {
  const maxIter = opts.maxIter ?? 200
  const tolGrad = opts.tolGrad ?? 1e-6
  const tolF = opts.tolF ?? 1e-9
  const k = theta0.length
  let theta = theta0.slice()
  let evalCur = evalF(theta)
  let F = evalCur.F
  let g = numericalGradient(theta, evalF)
  // H = identity (近似海森反矩陣)
  let H = []
  for (let i = 0; i < k; i++) {
    const row = new Array(k).fill(0)
    row[i] = 1
    H.push(row)
  }
  let iterations = 0
  let converged = false
  let bestTheta = theta.slice()
  let bestF = F
  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1
    const gNorm = vecNorm(g)
    if (gNorm < tolGrad) { converged = true; break }

    // 搜尋方向 d = −H · g
    const Hg = matVecBFGS(H, g)
    const d = Hg.map((v) => -v)

    // 確認下降方向；若不是，重設 H = I
    if (vecDot(g, d) > 0) {
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) H[i][j] = i === j ? 1 : 0
      }
      for (let i = 0; i < k; i++) d[i] = -g[i]
    }

    // backtracking line search（Armijo-like）
    let alpha = 1
    let newTheta = vecAdd(theta, d, alpha)
    let newEval = evalF(newTheta)
    let newF = newEval.F
    let lsTries = 0
    while ((!Number.isFinite(newF) || newF > F + 1e-4 * alpha * vecDot(g, d)) && lsTries < 30) {
      alpha *= 0.5
      newTheta = vecAdd(theta, d, alpha)
      newEval = evalF(newTheta)
      newF = newEval.F
      lsTries++
    }
    if (!Number.isFinite(newF) || newF >= F) {
      // 線搜尋失敗 → 終止；保留最後 best
      break
    }

    const s = vecSub(newTheta, theta)
    const newG = numericalGradient(newTheta, evalF)
    const y = vecSub(newG, g)
    const sy = vecDot(s, y)

    if (sy > 1e-12) {
      // BFGS 更新： H_{k+1} = (I − ρ s yᵀ) H_k (I − ρ y sᵀ) + ρ s sᵀ
      const rho = 1 / sy
      const Hy = matVecBFGS(H, y)
      // V = I − ρ s yᵀ
      // newH = V · H · Vᵀ + ρ s sᵀ
      // 用 Sherman-Morrison 形式直接展開
      const newH = []
      for (let i = 0; i < k; i++) newH.push(new Array(k).fill(0))
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          // H_ij - ρ (s_i (Hy)_j + (Hy)_i s_j) + (ρ² yᵀHy + ρ) s_i s_j
          const t1 = H[i][j]
          const t2 = -rho * (s[i] * Hy[j] + Hy[i] * s[j])
          const yHy = vecDot(y, Hy)
          const t3 = (rho * rho * yHy + rho) * s[i] * s[j]
          newH[i][j] = t1 + t2 + t3
        }
      }
      H = newH
    }

    const dF = Math.abs(F - newF)
    theta = newTheta
    F = newF
    g = newG
    if (newF < bestF) { bestF = newF; bestTheta = theta.slice() }
    if (dF < tolF) { converged = true; break }
  }
  // 採用 best
  if (bestF < F) {
    theta = bestTheta
    F = bestF
    evalCur = evalF(theta)
  } else {
    evalCur = evalF(theta)
  }
  return { theta, F, iterations, converged, finalEval: evalCur, gradient: g }
}

/* ─────────────────  零模型（獨立模型）F_null  ───────────────── */

/**
 * 獨立模型：Σ_null = diag(S)
 * F_null = log|diag(S)| + tr(S · diag(S)⁻¹) − log|S| − p
 *        = Σ log(s_ii) + p − log|S| − p
 *        = Σ log(s_ii) − log|S|
 * df_null = p(p+1)/2 − p = p(p−1)/2
 */
function nullModelFit(S, logDetS) {
  const p = S.length
  let sumLog = 0
  for (let i = 0; i < p; i++) sumLog += Math.log(Math.max(S[i][i], 1e-15))
  const F = sumLog - logDetS
  return { F, df: (p * (p - 1)) / 2 }
}

/* ─────────────────  非中心 χ²（用於 RMSEA CI）  ───────────────── */

/**
 * 非中心 χ² 的右尾機率 P(χ²_df,ncp ≥ x)
 *
 * 級數展開：P(X² ≥ x | df, λ) = Σ_{j=0..} e^(−λ/2) (λ/2)^j / j! · P(χ²_{df+2j} ≥ x)
 * 收斂條件：j-th 項 < 1e-10 或 j > 200
 */
export function pChiSqNoncentral(x, df, ncp) {
  if (!(ncp > 0)) return pChiSq(x, df)
  const lambda2 = ncp / 2

  // 極端 ncp：非中央分布已整體遠離 x，尾機率飽和 → 直接回傳，避免長級數
  const meanNC = df + ncp
  const sdNC = Math.sqrt(2 * (df + 2 * ncp))
  if (meanNC - x > 12 * sdNC) return 1
  if (x - meanNC > 12 * sdNC) return 0

  // Poisson 混合：P(X ≥ x) = Σ_j w_j · P(χ²_{df+2j} ≥ x)，w_j = Poisson(j; λ/2)
  //
  // ⚠ 2026-07-13 紅隊修復。修復前寫成
  //     let term = Math.exp(-lambda2); ... if (term < 1e-12 && inc < 1e-12) break
  //   Poisson 權重的眾數在 j ≈ lambda2，但 w_0 = exp(−lambda2) 在 ncp ≳ 60 時
  //   已 < 1e-12 → 迴圈在 j = 1 就 break，級數在爬上眾數之前被砍掉，整個函式
  //   對 ncp ≳ 100 塌成 ~0（實測 ncp = 100 回傳 7e-21，正確值 ≈ 1）。
  //   後果：rmseaCI 的 bisection 一路倍增撞上 1e6 上限，RMSEA 90% CI 印出
  //   [59.954, 59.954] 這種超出定義域的值；大模型的 close-fit p 也會誤報為 0。
  //   修法：(1) 只有跑過眾數（j > lambda2）才允許截斷；
  //         (2) 權重走 log 域，避免 lambda2 > 709 時 exp(−lambda2) 下溢為 0。
  const jMax = Math.ceil(lambda2 + 10 * Math.sqrt(lambda2 + 1)) + 50
  const LOG_TINY = Math.log(1e-15)
  let logW = -lambda2 // log w_0
  let sum = 0
  for (let j = 0; j <= jMax; j++) {
    if (j > 0) logW += Math.log(lambda2) - Math.log(j)
    if (logW > -745) sum += Math.exp(logW) * pChiSq(x, df + 2 * j)
    if (j > lambda2 && logW < LOG_TINY) break
  }
  return Math.min(1, Math.max(0, sum))
}

/**
 * RMSEA 90% CI：以 bisection 找 ncp 使 P(χ²_df,ncp ≥ chi2) = 0.05 / 0.95
 * RMSEA = sqrt(ncp / (df · (N-1)))
 */
export function rmseaCI(chi2, df, n, level = 0.9) {
  if (chi2 <= 0 || df <= 0) return { low: NaN, high: NaN }
  const alpha = (1 - level) / 2
  const findNcp = (target) => {
    // 找 ncp 使 P(χ²_df,ncp ≥ chi2) = target
    let lo = 0
    let hi = chi2 + 200
    // 確保 hi 對應 P ≥ target
    while (pChiSqNoncentral(chi2, df, hi) < target && hi < 1e6) hi *= 2
    for (let it = 0; it < 80; it++) {
      const mid = (lo + hi) / 2
      const p = pChiSqNoncentral(chi2, df, mid)
      if (p < target) lo = mid
      else hi = mid
      if (hi - lo < 1e-6) break
    }
    return (lo + hi) / 2
  }
  // MacCallum, Browne & Sugawara (1996)：ncp 的 90% CI 為 [λ_L, λ_U]，其中
  //   λ_L 使 P(χ²_df,λ ≥ chi2) = α      (=.05)  → 下界
  //   λ_U 使 P(χ²_df,λ ≥ chi2) = 1 − α  (=.95)  → 上界
  // 尾機率 P(χ² ≥ chi2 | ncp) 對 ncp 遞增，故 λ_L < λ_U。
  //
  // ⚠ 2026-07-13 紅隊修復：修復前上下界標籤對調（ncpLow 取 1−α、ncpHigh 取 α），
  //   會得到 low > high 的反轉區間。見 docs/validation-report-v1.md。
  const sf0 = pChiSqNoncentral(chi2, df, 0)
  const ncpLow = sf0 < alpha ? findNcp(alpha) : 0
  const ncpHigh = sf0 < 1 - alpha ? findNcp(1 - alpha) : 0
  const denom = df * Math.max(n - 1, 1)
  return {
    low: Math.sqrt(Math.max(0, ncpLow) / denom),
    high: Math.sqrt(Math.max(0, ncpHigh) / denom),
  }
}

/**
 * RMSEA p 值（對 H0: RMSEA ≤ 0.05 的「close fit」檢定）
 * P(χ² ≥ chi2 | ncp_close)，ncp_close = 0.05² · df · (N − 1)
 */
export function rmseaPValue(chi2, df, n) {
  if (df <= 0) return NaN
  const ncpClose = 0.05 * 0.05 * df * Math.max(n - 1, 1)
  return pChiSqNoncentral(chi2, df, ncpClose)
}

/* ─────────────────  SRMR  ───────────────── */

function srmr(S, Sigma) {
  const p = S.length
  let sum = 0
  let cnt = 0
  for (let i = 0; i < p; i++) {
    for (let j = 0; j <= i; j++) {
      const denom = Math.sqrt(Math.max(S[i][i], 1e-15) * Math.max(S[j][j], 1e-15))
      const r = (S[i][j] - Sigma[i][j]) / denom
      sum += r * r
      cnt++
    }
  }
  return Math.sqrt(sum / cnt)
}

/* ─────────────────  解讀關鍵字（供 UI 著色）  ───────────────── */

export function cfiInterpretationKey(v) {
  if (!Number.isFinite(v)) return null
  if (v >= 0.95) return 'good'
  if (v >= 0.9) return 'acceptable'
  return 'poor'
}
export function tliInterpretationKey(v) {
  return cfiInterpretationKey(v)
}
export function rmseaInterpretationKey(v) {
  if (!Number.isFinite(v)) return null
  if (v <= 0.06) return 'good'
  if (v <= 0.08) return 'acceptable'
  return 'poor'
}
export function srmrInterpretationKey(v) {
  if (!Number.isFinite(v)) return null
  if (v <= 0.08) return 'good'
  return 'poor'
}

/* ─────────────────  主要 CFA 函式  ───────────────── */

/**
 * @param {Array<Object>} rows  原始資料列
 * @param {Array<{name: string, indicators: string[]}>} factors  因子結構
 * @returns CFA 結果物件
 */
export function cfa(rows, factors) {
  // 驗證因子結構
  if (!Array.isArray(factors) || factors.length === 0) {
    return { error: 'no-factors' }
  }
  for (const f of factors) {
    if (!f || !Array.isArray(f.indicators) || f.indicators.length < 2) {
      return { error: 'too-few-indicators' }
    }
  }
  // 攤平所有指標 + 記錄每個指標屬於哪個因子（簡單結構）
  const allIndicators = []
  const indicatorFactor = []
  const seen = new Set()
  for (let fi = 0; fi < factors.length; fi++) {
    for (const ind of factors[fi].indicators) {
      if (seen.has(ind)) {
        return { error: 'duplicate-indicator' }
      }
      seen.add(ind)
      allIndicators.push(ind)
      indicatorFactor.push(fi)
    }
  }
  const p = allIndicators.length
  const m = factors.length
  if (p < 3) return { error: 'too-few-total-indicators' }

  // 樣本共變數
  const { n, S } = sampleCovariance(rows, allIndicators)
  if (!S || n < p + 5) return { error: 'need-more-data' }

  // 識別性檢查
  const nUnique = (p * (p + 1)) / 2
  const nFreeParams = p + (m * (m - 1)) / 2 + p
  const df = nUnique - nFreeParams
  if (df < 0) return { error: 'underidentified' }

  // log|S| —— 對 ML 適配函數的常數項
  const Lchol = cholesky(S)
  if (!Lchol) return { error: 'sample-cov-not-pd' }
  const logDetS = logDetFromChol(Lchol)

  // 起始值
  const initLoading = 0.7
  const initFactorCorr = 0.3
  const initLogResVar = (i) => Math.log(Math.max(0.5 * S[i][i], 1e-3))
  const theta0 = []
  for (let i = 0; i < p; i++) theta0.push(initLoading)
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) theta0.push(Math.atanh(initFactorCorr))
  }
  for (let i = 0; i < p; i++) theta0.push(initLogResVar(i))

  const structure = { p, m, indicatorFactor }
  const evalF = (th) => fitFunctionML(th, structure, S, logDetS)

  // 最佳化
  const opt = bfgs(theta0, evalF, { maxIter: 200, tolGrad: 1e-6, tolF: 1e-9 })
  if (!Number.isFinite(opt.F)) {
    return {
      error: 'optimization-failed',
      n, p, m,
    }
  }

  const { Lambda, Phi, Theta } = unpack(opt.theta, structure)
  const Sigma = opt.finalEval.Sigma || modelImpliedCov(Lambda, Phi, Theta)

  // χ²
  const chi2 = (n - 1) * Math.max(opt.F, 0)
  const pChi2 = df > 0 ? pChiSq(chi2, df) : NaN

  // 零模型
  const nullFit = nullModelFit(S, logDetS)
  const chi2Null = (n - 1) * nullFit.F
  const dfNull = nullFit.df

  // 適配指標
  const cfiNumerator = Math.max(chi2 - df, 0)
  const cfiDenom = Math.max(chi2Null - dfNull, cfiNumerator, 1e-12)
  const cfi = 1 - cfiNumerator / cfiDenom

  let tli = NaN
  if (Number.isFinite(chi2Null) && dfNull > 0 && df > 0) {
    const num = chi2Null / dfNull - chi2 / df
    const den = chi2Null / dfNull - 1
    tli = den !== 0 ? num / den : NaN
  }

  const rmseaVal = df > 0
    ? Math.sqrt(Math.max(chi2 - df, 0) / (df * Math.max(n - 1, 1)))
    : NaN
  const ci = df > 0 ? rmseaCI(chi2, df, n, 0.9) : { low: NaN, high: NaN }
  const rmseaP = df > 0 ? rmseaPValue(chi2, df, n) : NaN

  const srmrVal = srmr(S, Sigma)

  // 標準化負荷量 + R²
  const loadings = []
  for (let i = 0; i < p; i++) {
    const fi = indicatorFactor[i]
    const lambda = Lambda[i][fi]
    const sigmaii = Sigma[i][i]
    const lambdaStd = sigmaii > 0 ? lambda / Math.sqrt(sigmaii) : NaN
    // 因為 φ_jj = 1，且 σ_ii = λ_i² + θ_i：
    const r2 = sigmaii > 0 ? 1 - Theta[i] / sigmaii : NaN
    loadings.push({
      factor: factors[fi].name,
      factorIndex: fi,
      indicator: allIndicators[i],
      lambda,
      lambdaStd,
      r2,
    })
  }

  // 殘差變異
  const residualVariances = []
  for (let i = 0; i < p; i++) {
    residualVariances.push({
      indicator: allIndicators[i],
      theta: Theta[i],
    })
  }

  // 因子相關矩陣（Φ 因為固定 φ_jj = 1，已是相關矩陣）
  const factorCorrelations = []
  for (let i = 0; i < m; i++) {
    const row = new Array(m)
    for (let j = 0; j < m; j++) row[j] = Phi[i][j]
    factorCorrelations.push(row)
  }

  // 嘗試從 Hessian 估計 SE（中央差分二階導數）
  // 若 Hessian 非正定 → 留空（se = null）
  let standardErrors
  try {
    standardErrors = computeStandardErrors(opt.theta, evalF, n)
  } catch {
    standardErrors = null
  }
  if (standardErrors) {
    // 把 SE 套到 loadings（前 p 個元素）與 residualVariances（最後 p 個元素，但因 reparameterize → delta method）
    for (let i = 0; i < p; i++) {
      const seL = standardErrors[i]
      if (Number.isFinite(seL) && seL > 0) {
        const z = loadings[i].lambda / seL
        loadings[i].se = seL
        loadings[i].z = z
        // 雙尾常態 p 值：2·(1 − Φ(|z|))
        loadings[i].p = 2 * (1 - normalCdfApprox(Math.abs(z)))
      } else {
        loadings[i].se = null
      }
    }
    // 殘差變異：θ = exp(τ)，由 delta method：SE(θ) ≈ θ · SE(τ)
    const offset = p + (m * (m - 1)) / 2
    for (let i = 0; i < p; i++) {
      const seTau = standardErrors[offset + i]
      if (Number.isFinite(seTau) && seTau > 0) {
        residualVariances[i].se = Theta[i] * seTau
      } else {
        residualVariances[i].se = null
      }
    }
  }

  return {
    n, p, m,
    factors: factors.map((f) => ({ name: f.name, indicators: [...f.indicators] })),
    indicators: allIndicators,
    indicatorFactor,
    S,
    Sigma,
    loadings,
    residualVariances,
    factorCorrelations,
    fitFunction: opt.F,
    iterations: opt.iterations,
    converged: opt.converged,
    chi2,
    df,
    pChi2,
    chi2Null,
    dfNull,
    fitIndices: {
      cfi,
      tli,
      rmsea: rmseaVal,
      rmseaCiLow: ci.low,
      rmseaCiHigh: ci.high,
      rmseaP,
      srmr: srmrVal,
    },
    hasStandardErrors: !!standardErrors,
  }
}

/* ─────────────────  Hessian-based SE 計算  ───────────────── */

/**
 * 透過數值 Hessian 估計 SE：
 *   Cov(θ̂) ≈ 2 / (N − 1) · H⁻¹（其中 H 為 ∇² F_ML）
 * 若 H⁻¹ 對角線出現負值或反矩陣失敗，回傳 null（呼叫端負責處理）。
 *
 * 注意：由於 reparameterize（loadings 直接、residual 用 log、correlation 用 atanh），
 * loadings 的 SE 可直接使用；其他需要 delta method（在主函式裡處理 residual）。
 */
function computeStandardErrors(theta, evalF, n) {
  const k = theta.length
  const h = 1e-4
  const F0 = evalF(theta).F
  if (!Number.isFinite(F0)) return null
  const H = []
  for (let i = 0; i < k; i++) H.push(new Array(k).fill(0))
  // 對角線：(F(θ + h e_i) − 2F(θ) + F(θ − h e_i)) / h²
  for (let i = 0; i < k; i++) {
    const tp = theta.slice(); tp[i] += h
    const tm = theta.slice(); tm[i] -= h
    const fp = evalF(tp).F
    const fm = evalF(tm).F
    if (!Number.isFinite(fp) || !Number.isFinite(fm)) return null
    H[i][i] = (fp - 2 * F0 + fm) / (h * h)
  }
  // 非對角線：(F(θ + h e_i + h e_j) − F(θ + h e_i − h e_j) − F(θ − h e_i + h e_j) + F(θ − h e_i − h e_j)) / (4h²)
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const tpp = theta.slice(); tpp[i] += h; tpp[j] += h
      const tpm = theta.slice(); tpm[i] += h; tpm[j] -= h
      const tmp = theta.slice(); tmp[i] -= h; tmp[j] += h
      const tmm = theta.slice(); tmm[i] -= h; tmm[j] -= h
      const fpp = evalF(tpp).F
      const fpm = evalF(tpm).F
      const fmp = evalF(tmp).F
      const fmm = evalF(tmm).F
      if (![fpp, fpm, fmp, fmm].every(Number.isFinite)) return null
      const v = (fpp - fpm - fmp + fmm) / (4 * h * h)
      H[i][j] = v
      H[j][i] = v
    }
  }
  // 對稱化（保險）
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const a = (H[i][j] + H[j][i]) / 2
      H[i][j] = H[j][i] = a
    }
  }
  const Hinv = inverse(H)
  if (!Hinv) return null
  // Cov(θ̂) ≈ 2 / (n − 1) · H⁻¹
  const factor = 2 / Math.max(n - 1, 1)
  const se = new Array(k).fill(NaN)
  for (let i = 0; i < k; i++) {
    const v = factor * Hinv[i][i]
    se[i] = v > 0 ? Math.sqrt(v) : NaN
  }
  return se
}

/* ─────────────────  小工具：標準常態 CDF（避免相依 pvalue 的可選 import） ───────────────── */

function normalCdfApprox(z) {
  // Abramowitz & Stegun 7.1.26 → erf
  const sign = z >= 0 ? 1 : -1
  const ax = Math.abs(z)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const t = 1 / (1 + p * (ax / Math.SQRT2))
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-(ax / Math.SQRT2) * (ax / Math.SQRT2))
  return 0.5 * (1 + sign * y)
}
