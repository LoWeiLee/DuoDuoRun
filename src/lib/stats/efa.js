/**
 * 探索性因素分析（EFA）— 主成分萃取 + Varimax 正交轉軸
 *
 * 對外 API：
 *   exploratoryFactorAnalysis(rows, columns, options) → 完整結果
 *
 * options:
 *   nFactors    — 指定因子數；省略則用 Kaiser（特徵值 > 1）
 *   rotation    — 'varimax' | 'none'（預設 'varimax'）
 *
 * 演算法：
 *   1. 從資料計算相關矩陣 R（★ listwise：任一變項缺值即剔除整列。
 *      2026-07-29 紅隊 R40-e 修正 —— 原註解誤寫「pair-wise listwise」，實作從來是純 listwise）
 *   2. Bartlett's 球形檢定：H₀ = R 為單位矩陣
 *      χ² = -((n-1) - (2p+5)/6) · ln|R|，df = p(p-1)/2
 *   3. KMO 取樣適切性（p ≥ 3 才計算）
 *   4. Jacobi 特徵分解：R = V·diag(λ)·Vᵀ
 *   5. 因子負荷量：A = V·diag(√λ)（PCA loadings）
 *   6. 決定因子數 k：Kaiser（λᵢ > 1）或使用者指定
 *   7. 取前 k 個 loadings：A_k 為 p × k
 *   8. Varimax 正交轉軸（含 Kaiser normalization）
 *   9. 共同性 hᵢ² = Σⱼ aᵢⱼ²
 *
 * 對外回傳：
 *   {
 *     n, p,
 *     correlationMatrix, determinant,
 *     bartlett: { chi2, df, p, singular? },   // singular = true 時 |R| = 0，χ²/p 為 NaN
 *     kmo: { overall, perVar, unavailable }   // unavailable = null | 'too-few-vars' | 'singular'
 *     eigenvalues: number[]                   // 全部 p 個，遞減
 *     varianceExplained: { values, percent, cumulative },
 *     nFactors,                               // 實際採用的因子數
 *     unrotatedLoadings,
 *     rotatedLoadings,                        // 若 rotation = 'varimax'
 *     rotation,
 *     communalities,                          // 採用 k 個因子後的 h²
 *   }
 *
 * 對標 SPSS Factor / R::psych::fa.parallel + principal()。
 */
import { isMissing } from '../variableTypes.js'
import { pearsonCorr } from './correlation.js'
import { pChiSq } from './pvalue.js'
import { inverse } from './matrix.js'

/* ─────────────────  Jacobi 對稱矩陣特徵分解  ───────────────── */

function jacobiEigen(A, maxIter = 200, tol = 1e-12) {
  const n = A.length
  const M = A.map((row) => [...row])
  // V = I
  const V = []
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0)
    row[i] = 1
    V.push(row)
  }
  for (let iter = 0; iter < maxIter; iter++) {
    let p = 0, q = 1, max = 0
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = Math.abs(M[i][j])
        if (a > max) { max = a; p = i; q = j }
      }
    }
    if (max < tol) break
    const theta = (M[q][q] - M[p][p]) / (2 * M[p][q])
    let t
    if (theta >= 0) t = 1 / (theta + Math.sqrt(1 + theta * theta))
    else t = -1 / (-theta + Math.sqrt(1 + theta * theta))
    const c = 1 / Math.sqrt(1 + t * t)
    const s = t * c
    const Mpp = M[p][p], Mqq = M[q][q], Mpq = M[p][q]
    M[p][p] = c * c * Mpp + s * s * Mqq - 2 * s * c * Mpq
    M[q][q] = s * s * Mpp + c * c * Mqq + 2 * s * c * Mpq
    M[p][q] = M[q][p] = 0
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Mip = M[i][p], Miq = M[i][q]
        M[i][p] = M[p][i] = c * Mip - s * Miq
        M[i][q] = M[q][i] = s * Mip + c * Miq
      }
    }
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p], Viq = V[i][q]
      V[i][p] = c * Vip - s * Viq
      V[i][q] = s * Vip + c * Viq
    }
  }
  const eigenvalues = M.map((row, i) => row[i])
  const order = eigenvalues
    .map((_, i) => i)
    .sort((a, b) => eigenvalues[b] - eigenvalues[a])
  const sortedValues = order.map((i) => eigenvalues[i])
  const sortedVectors = []
  for (let i = 0; i < n; i++) {
    const row = new Array(n)
    for (let j = 0; j < n; j++) row[j] = V[i][order[j]]
    sortedVectors.push(row)
  }
  return { values: sortedValues, vectors: sortedVectors }
}

/* ─────────────────  Varimax 正交轉軸  ───────────────── */

function varimax(loadings, maxIter = 100, tol = 1e-7) {
  const p = loadings.length
  const k = loadings[0]?.length || 0
  if (k < 2) return loadings.map((row) => [...row])

  // Kaiser normalization
  const h2 = loadings.map((row) => row.reduce((s, v) => s + v * v, 0))
  const L = loadings.map((row, i) =>
    row.map((v) => (h2[i] > 0 ? v / Math.sqrt(h2[i]) : v))
  )

  for (let iter = 0; iter < maxIter; iter++) {
    let maxAngle = 0
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        let sumU = 0, sumV = 0, sumUV = 0, sumU2_V2 = 0
        for (let r = 0; r < p; r++) {
          const a = L[r][i], b = L[r][j]
          const u = a * a - b * b
          const v = 2 * a * b
          sumU += u
          sumV += v
          sumUV += u * v
          sumU2_V2 += u * u - v * v
        }
        const num = 2 * (p * sumUV - sumU * sumV)
        const den = p * sumU2_V2 - (sumU * sumU - sumV * sumV)
        if (Math.abs(num) < 1e-15 && Math.abs(den) < 1e-15) continue
        const angle = 0.25 * Math.atan2(num, den)
        if (Math.abs(angle) > maxAngle) maxAngle = Math.abs(angle)
        if (Math.abs(angle) < 1e-12) continue
        const c = Math.cos(angle)
        const s = Math.sin(angle)
        for (let r = 0; r < p; r++) {
          const a = L[r][i], b = L[r][j]
          L[r][i] = c * a + s * b
          L[r][j] = -s * a + c * b
        }
      }
    }
    if (maxAngle < tol) break
  }

  // Un-normalize
  return L.map((row, i) => row.map((v) => v * Math.sqrt(h2[i])))
}

/* ─────────────────  Bartlett + KMO  ───────────────── */

function determinantFromEigen(eigenvalues) {
  return eigenvalues.reduce((acc, v) => acc * v, 1)
}

function bartlettSphericity(eigenvalues, n, p) {
  if (n <= 1 || p < 2) return { chi2: NaN, df: NaN, p: NaN }
  const det = determinantFromEigen(eigenvalues)
  // ★ 2026-07-29 紅隊 R40-i（L3，Kevin 核定）：|R| = 0（完全共線）時 χ² 發散。
  //   修復前回 { chi2: Infinity, p: 0 }，UI 的 fmtNum(Infinity) 印「—」、fmtP(0) 印「< .001」，
  //   於是完全共線的資料會亮綠燈「適合做因素分析」。改為明確標記 singular，由 UI 顯性說明。
  if (!(det > 0)) return { chi2: NaN, df: (p * (p - 1)) / 2, p: NaN, singular: true }
  const chi2 = -((n - 1) - (2 * p + 5) / 6) * Math.log(det)
  const df = (p * (p - 1)) / 2
  const pVal = pChiSq(chi2, df)
  return { chi2, df, p: pVal }
}

/**
 * KMO（Kaiser-Meyer-Olkin）取樣適切性
 *
 * 公式：KMO = ΣΣ rᵢⱼ² / (ΣΣ rᵢⱼ² + ΣΣ aᵢⱼ²)
 * 其中 aᵢⱼ 為 anti-image correlation = -pᵢⱼ / √(pᵢᵢ pⱼⱼ)
 * pᵢⱼ 為 R 的 inverse 元素。
 *
 * 解讀（Kaiser）：
 *   ≥ .90 marvelous、.80 meritorious、.70 middling、.60 mediocre、.50 miserable、< .50 unacceptable
 */
function kmo(R) {
  const p = R.length
  // ★ 2026-07-29 紅隊 R40-i：回傳 { unavailable: 原因 } 而不是 null。
  //   修復前 UI 兩處都寫 `result.kmo && (...)`，KMO 算不出來時整張卡片與統計量卡
  //   直接消失、沒有任何說明 —— 使用者不會知道少了一個判準。
  if (p < 3) return { unavailable: 'too-few-vars' }
  const Rinv = inverse(R)
  if (!Rinv) return { unavailable: 'singular' }
  // anti-image correlation aij = -Rinv[i][j] / sqrt(Rinv[i][i] * Rinv[j][j])
  // KMO_overall = sum(rij^2 over i!=j) / (sum(rij^2 over i!=j) + sum(aij^2 over i!=j))
  let sumR2 = 0
  let sumA2 = 0
  const perVar = new Array(p).fill(0)
  const perVarR2 = new Array(p).fill(0)
  const perVarA2 = new Array(p).fill(0)
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i === j) continue
      const rij = R[i][j]
      const aij = -Rinv[i][j] / Math.sqrt(Math.max(1e-15, Rinv[i][i]) * Math.max(1e-15, Rinv[j][j]))
      sumR2 += rij * rij
      sumA2 += aij * aij
      perVarR2[i] += rij * rij
      perVarA2[i] += aij * aij
    }
  }
  for (let i = 0; i < p; i++) {
    perVar[i] = perVarR2[i] / (perVarR2[i] + perVarA2[i])
  }
  const overall = sumR2 / (sumR2 + sumA2)
  return { overall, perVar, unavailable: null }
}

/* ─────────────────  主要 EFA 函式  ───────────────── */

export function exploratoryFactorAnalysis(rows, columns, options = {}) {
  const { nFactors: requestedK, rotation = 'varimax' } = options
  const p = columns.length
  if (p < 2) return { error: 'need->=2-vars' }

  // listwise deletion：所有變數都有值的列
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
  if (n < p + 5) return { error: 'need-more-data' }

  // ★ 2026-07-29 紅隊 R40-h（L3，Kevin 核定）：零變異欄硬擋。
  //   修復前不擋也不警告 —— pearsonCorr 對常數欄回 NaN，下方第 245 行把 NaN 換成 0，
  //   於是該欄在 R 裡成為與所有變項零相關的孤島：
  //     · Bartlett 的 df 仍照全部 p 計 → df 虛胖（7 題實測 21，實際應為 15）、p 系統性偏小
  //     · KMO 的 perVar 出現 null，overall 仍照算
  //     · 該欄的 h² 通常為 0（死列），但當因子數涵蓋到它自己的 λ = 1 特徵向量時，
  //       它會拿到 loading 1.000 / h² 1.000 —— 看起來是全套最好的題目（3 欄 k=2 實測）
  //   四支多變量方法裡 LDA（singularPooled）、CFA（sample-cov-not-pd）、NCA（no-variation）
  //   都硬擋，修復前只有 EFA 放行。
  const zeroVar = []
  for (let i = 0; i < p; i++) {
    const v0 = valid[0][i]
    if (valid.every((row) => row[i] === v0)) zeroVar.push(columns[i])
  }
  if (zeroVar.length > 0) return { error: 'zero-variance-vars', vars: zeroVar }

  // 相關矩陣
  const R = []
  for (let i = 0; i < p; i++) {
    const rowR = new Array(p).fill(0)
    R.push(rowR)
  }
  for (let i = 0; i < p; i++) {
    R[i][i] = 1
    for (let j = i + 1; j < p; j++) {
      const xs = valid.map((row) => row[i])
      const ys = valid.map((row) => row[j])
      const { r } = pearsonCorr(xs, ys)
      R[i][j] = R[j][i] = Number.isFinite(r) ? r : 0
    }
  }

  // 特徵分解
  const { values: eigenvalues, vectors } = jacobiEigen(R)

  // Bartlett + KMO
  const bartlett = bartlettSphericity(eigenvalues, n, p)
  const kmoResult = kmo(R)

  // 變異解釋
  const totalVar = p
  const variancePercent = eigenvalues.map((v) => (v / totalVar) * 100)
  const cumulative = []
  let acc = 0
  for (const pct of variancePercent) { acc += pct; cumulative.push(acc) }

  // 因子數：使用者指定優先，否則 Kaiser
  let k
  if (Number.isFinite(requestedK) && requestedK > 0 && requestedK <= p) {
    k = Math.floor(requestedK)
  } else {
    k = eigenvalues.filter((v) => v > 1).length
    if (k < 1) k = 1
    if (k > p) k = p
  }

  // 未轉軸 loadings：A = V · diag(√λ)，但只取正特徵值（負的 clamp 到 0）
  const unrotated = []
  for (let i = 0; i < p; i++) {
    const row = new Array(k)
    for (let j = 0; j < k; j++) {
      const lam = Math.max(0, eigenvalues[j])
      row[j] = vectors[i][j] * Math.sqrt(lam)
    }
    unrotated.push(row)
  }

  // 轉軸
  let rotated = null
  if (rotation === 'varimax' && k >= 2) {
    rotated = varimax(unrotated)
  }

  // 共同性 h² = Σ aᵢⱼ²（基於採用的 k 個因子，轉軸後）
  const finalLoadings = rotated || unrotated
  const communalities = finalLoadings.map((row) =>
    row.reduce((s, v) => s + v * v, 0)
  )

  return {
    n, p,
    correlationMatrix: R,
    determinant: determinantFromEigen(eigenvalues),
    bartlett,
    kmo: kmoResult,
    eigenvalues,
    varianceExplained: { values: eigenvalues, percent: variancePercent, cumulative },
    nFactors: k,
    unrotatedLoadings: unrotated,
    rotatedLoadings: rotated,
    rotation: rotated ? 'varimax' : 'none',
    communalities,
  }
}
