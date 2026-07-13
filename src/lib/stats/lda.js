/**
 * LDA — 線性判別分析（Fisher's Linear Discriminant Analysis, multi-group）
 *
 * Multi-group Fisher's linear discriminant analysis. Computes within-class (W)
 * and between-class (B) scatter matrices, eigenvectors of W^-1 B as
 * discriminant functions, plus standardized canonical coefficients,
 * structure matrix, group centroids, classification (resubstitution) accuracy
 * and Box's M test of homogeneity of covariance matrices.
 *
 * 對外 API：
 *   lda(rows, groupVar, predictors)
 *
 *   groupVar    : string    — 類別欄位（class labels, ≥ 2 levels）
 *   predictors  : string[]  — 連續預測變項（≥ 2）
 *
 * Listwise deletion：groupVar 或任一 predictor 缺值即剔除整列。
 *
 * 演算法概要：
 *   N      = 總人數 / total subjects
 *   k      = 組數 / number of classes
 *   p      = 預測變項數 / number of predictors
 *   n_g    = 各組樣本數
 *
 *   W = Σ_g Σ_i (X_gi − X̄_g)ᵀ (X_gi − X̄_g)        (within-class scatter, p×p)
 *   B = Σ_g n_g · (X̄_g − X̄)ᵀ (X̄_g − X̄)            (between-class scatter, p×p)
 *   S_p = W / (N − k)                                  (pooled covariance)
 *
 *   Discriminant functions = eigenvectors of W^-1 B（symmetrized via
 *   W^(-1/2) B W^(-1/2)），最多 min(k − 1, p) 個。
 *
 *   λ_i      ─── eigenvalues
 *   ρ_i      ─── canonical correlation = √(λ_i / (1 + λ_i))
 *
 *   Sequential Wilks' Λ_j = Π_{i ≥ j} 1 / (1 + λ_i)
 *   Bartlett 近似：χ² = − (N − 1 − (p + k) / 2) · ln(Λ_j)
 *                    df = (p − j + 1)(k − j)
 *
 *   Unstandardized coefficients：對 raw eigenvector w 縮放使 wᵀ S_p w = 1
 *     （＝ SPSS「未標準化典型判別函數係數」；判別分數即由此係數計算）
 *   Standardized coefficients：unstandardized × 各預測變項的組內合併標準差
 *     b*_j = b_j · √(S_p[j][j])
 *     （＝ SPSS「標準化典型判別函數係數」；用於比較預測變項的相對重要性）
 *   Structure coefficients：predictor 與 discriminant score 的**組內合併**
 *     （pooled within-group）相關 — SPSS / R MASS 的標準定義。先對各組做組內
 *     置中（減去該組平均）再求相關，去除組間差異的影響。
 *
 *   ⚠ 2026-07-13 紅隊修復：修復前 standardizedCoefficients 回傳的其實是
 *     SPSS 的「未標準化」係數（保留原始單位），使用者會誤判預測變項的相對重要性
 *     （fixture main / group3 ~ x1+x2+x3 函數1：[−.091, .100, .047] 讀起來像 x3
 *     最不重要，真正的標準化係數 [−.724, .754, .718] 顯示三者貢獻相當）；
 *     structureCoefficients 則用全樣本相關而非組內合併相關。
 *     見 docs/validation-report-v1.md。
 *
 *   Classification（線性判別分數）：
 *     δ_g(x) = xᵀ S_p^-1 μ_g − ½ μ_gᵀ S_p^-1 μ_g + log(π_g)
 *   π_g = n_g / N
 *
 *   Resubstitution accuracy：將訓練樣本逐一分類，統計 confusion matrix。
 *
 *   Box's M（與 manova.js 相同公式）。
 */
import { isMissing } from '../variableTypes.js'
import { transpose, matmul, inverse } from './matrix.js'
import { pChiSq } from './pvalue.js'

/* ─────────────────────────  局部矩陣輔助 / Local matrix helpers  ───────────────────────── */

/** Determinant via LU decomposition with partial pivoting. */
function determinant(M) {
  const n = M.length
  if (n === 0) return 1
  const A = M.map((row) => [...row])
  let sign = 1
  for (let col = 0; col < n; col++) {
    let maxAbs = Math.abs(A[col][col])
    let maxRow = col
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(A[r][col])
      if (v > maxAbs) { maxAbs = v; maxRow = r }
    }
    if (maxAbs < 1e-15) return 0
    if (maxRow !== col) {
      const tmp = A[col]; A[col] = A[maxRow]; A[maxRow] = tmp
      sign = -sign
    }
    const pivot = A[col][col]
    for (let r = col + 1; r < n; r++) {
      const factor = A[r][col] / pivot
      if (factor === 0) continue
      for (let c = col; c < n; c++) A[r][c] -= factor * A[col][c]
    }
  }
  let det = sign
  for (let i = 0; i < n; i++) det *= A[i][i]
  return det
}

/* ─────────────────────────  Jacobi 對稱矩陣特徵分解  ───────────────────────── */

/**
 * Jacobi eigen-decomposition for a symmetric matrix.
 * Returns { values, vectors } sorted by eigenvalue descending.
 * vectors are stored such that vectors[i][j] = (i-th component of j-th eigenvector).
 */
function jacobiSymEigen(A, maxIter = 200, tol = 1e-12) {
  const n = A.length
  const M = A.map((row) => [...row])
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
    const Mpp = M[p][p], Mqq = M[q][q], Mpq = M[p][q]
    const theta = (Mqq - Mpp) / (2 * Mpq)
    let t
    if (theta >= 0) t = 1 / (theta + Math.sqrt(1 + theta * theta))
    else t = -1 / (-theta + Math.sqrt(1 + theta * theta))
    const c = 1 / Math.sqrt(1 + t * t)
    const s = t * c
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

/**
 * Returns { values, vectors } of W^-1 · B by symmetrising
 * W^(-1/2) B W^(-1/2). The eigenvectors of W^-1 B can be recovered as
 * W^(-1/2) · u_i where u_i is an eigenvector of the symmetric form.
 *
 * Output:
 *   values  : descending eigenvalues
 *   vectors : matrix where column j is the eigenvector of W^-1 B for λ_j
 *             (i.e. vectors[i][j] = i-th component of j-th eigenvector)
 */
function eigDecompWinvB(W, B) {
  const p = W.length
  const eig = jacobiSymEigen(W)
  const invSqrtLam = eig.values.map((v) => (v > 1e-15 ? 1 / Math.sqrt(v) : 0))
  const Vmat = eig.vectors
  const Vt = transpose(Vmat)

  // W^(-1/2) = V · diag(1/√λ_W) · Vᵀ
  const D_Vt = []
  for (let i = 0; i < p; i++) {
    const row = new Array(p)
    for (let j = 0; j < p; j++) row[j] = invSqrtLam[i] * Vt[i][j]
    D_Vt.push(row)
  }
  const Wsqrtinv = matmul(Vmat, D_Vt)

  // S = W^(-1/2) B W^(-1/2)
  const tmp = matmul(Wsqrtinv, B)
  const S = matmul(tmp, Wsqrtinv)
  for (let i = 0; i < p; i++) {
    for (let j = i + 1; j < p; j++) {
      const m = 0.5 * (S[i][j] + S[j][i])
      S[i][j] = S[j][i] = m
    }
  }
  const sEig = jacobiSymEigen(S)
  const values = sEig.values.map((v) => (v < 0 ? 0 : v))

  // 還原 W^-1 B 的特徵向量 = W^(-1/2) · u_i
  const Uvecs = sEig.vectors // columns are u_i
  const eigvecs = matmul(Wsqrtinv, Uvecs) // p × p, columns = w_i

  return { values, vectors: eigvecs }
}

/* ─────────────────────────  通用工具 / Misc helpers  ───────────────────────── */

/** Multiply matrix M (a×b) by column vector v (length b) → length a vector */
function matVec(M, v) {
  const a = M.length
  const b = M[0].length
  const out = new Array(a).fill(0)
  for (let i = 0; i < a; i++) {
    let s = 0
    for (let j = 0; j < b; j++) s += M[i][j] * v[j]
    out[i] = s
  }
  return out
}

/** Pearson correlation between two equal-length numeric arrays */
function pearson(xs, ys) {
  const n = xs.length
  if (n < 2) return NaN
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i] }
  const mx = sx / n, my = sy / n
  let num = 0, dxx = 0, dyy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dxx += dx * dx
    dyy += dy * dy
  }
  const denom = Math.sqrt(dxx * dyy)
  return denom > 0 ? num / denom : NaN
}

/**
 * 組內合併（pooled within-group）相關：先把每個觀察值減去其所屬組的平均
 * （組內置中），再對置中後的資料求 Pearson 相關。這是 SPSS 結構矩陣的定義。
 */
function pooledWithinCorr(xs, ys, groupIdx, k) {
  const n = xs.length
  const sumX = new Array(k).fill(0)
  const sumY = new Array(k).fill(0)
  const cnt = new Array(k).fill(0)
  for (let i = 0; i < n; i++) {
    const g = groupIdx[i]
    sumX[g] += xs[i]
    sumY[g] += ys[i]
    cnt[g] += 1
  }
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const g = groupIdx[i]
    if (cnt[g] === 0) continue
    const dx = xs[i] - sumX[g] / cnt[g]
    const dy = ys[i] - sumY[g] / cnt[g]
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const denom = Math.sqrt(sxx * syy)
  return denom > 0 ? sxy / denom : NaN
}

/* ─────────────────────────  主要 LDA  ───────────────────────── */

export function lda(rows, groupVar, predictors) {
  if (!groupVar) return { error: 'pickGroup' }
  if (!predictors || predictors.length < 2) return { error: 'pickPredictors' }
  if (predictors.includes(groupVar)) return { error: 'group-in-predictors' }

  const p = predictors.length

  // Listwise deletion + 分組 / grouping
  const buckets = {}
  const order = []
  for (const r of rows) {
    const f = r[groupVar]
    if (isMissing(f)) continue
    const row = []
    let bad = false
    for (const dv of predictors) {
      const v = r[dv]
      if (isMissing(v)) { bad = true; break }
      const num = Number(v)
      if (!Number.isFinite(num)) { bad = true; break }
      row.push(num)
    }
    if (bad) continue
    const key = String(f)
    if (!buckets[key]) { buckets[key] = []; order.push(key) }
    buckets[key].push(row)
  }

  const groups = order
  const k = groups.length
  if (k < 2) return { error: 'groupBadGroups', meta: { k } }

  const groupSizes = groups.map((g) => buckets[g].length)
  const N = groupSizes.reduce((s, n) => s + n, 0)
  if (N <= k + p) return { error: 'tooFewN', meta: { N, k, p } }

  // 各組平均 / group means (k × p)
  const groupMeans = []
  for (const g of groups) {
    const G = buckets[g]
    const m = new Array(p).fill(0)
    for (const r of G) for (let j = 0; j < p; j++) m[j] += r[j]
    for (let j = 0; j < p; j++) m[j] /= G.length
    groupMeans.push(m)
  }

  // 全平均 / grand mean (1 × p)，加權
  const grandMean = new Array(p).fill(0)
  for (let g = 0; g < k; g++) {
    for (let j = 0; j < p; j++) grandMean[j] += groupSizes[g] * groupMeans[g][j]
  }
  for (let j = 0; j < p; j++) grandMean[j] /= N

  // B = Σ_g n_g · (X̄_g − X̄)(X̄_g − X̄)ᵀ
  const B = []
  for (let i = 0; i < p; i++) B.push(new Array(p).fill(0))
  for (let g = 0; g < k; g++) {
    const d = new Array(p)
    for (let j = 0; j < p; j++) d[j] = groupMeans[g][j] - grandMean[j]
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        B[i][j] += groupSizes[g] * d[i] * d[j]
      }
    }
  }

  // W = Σ_g Σ_i (X_gi − X̄_g)(X_gi − X̄_g)ᵀ; 各組 SSCP for Box's M
  const W = []
  for (let i = 0; i < p; i++) W.push(new Array(p).fill(0))
  const groupSSCP = []
  for (let g = 0; g < k; g++) {
    const Sg = []
    for (let i = 0; i < p; i++) Sg.push(new Array(p).fill(0))
    const G = buckets[groups[g]]
    const m = groupMeans[g]
    for (const r of G) {
      const d = new Array(p)
      for (let j = 0; j < p; j++) d[j] = r[j] - m[j]
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          const inc = d[i] * d[j]
          W[i][j] += inc
          Sg[i][j] += inc
        }
      }
    }
    groupSSCP.push(Sg)
  }

  const dfE = N - k

  // Pooled covariance S_p = W / (N − k)
  const Sp = []
  for (let i = 0; i < p; i++) {
    const row = new Array(p)
    for (let j = 0; j < p; j++) row[j] = W[i][j] / dfE
    Sp.push(row)
  }
  const SpInv = inverse(Sp)
  if (!SpInv) {
    return {
      error: 'singularPooled',
      n: N, k, p, groups, groupSizes, predictors,
      groupMeans, grandMean, W, B, Sp,
    }
  }

  /* ─── Discriminant functions：W^-1 B 的特徵分解 ─── */
  let eigVals
  let eigVecs
  try {
    const ed = eigDecompWinvB(W, B)
    eigVals = ed.values
    eigVecs = ed.vectors // p × p, columns are eigenvectors of W^-1 B
  } catch {
    // Jacobi 不收斂或 W 奇異 → 回傳空的判別函數，由呼叫端以 numFunctions=0 處理
    eigVals = []
    eigVecs = []
  }

  const numFunctions = Math.min(k - 1, p)
  const functions = []

  // 各 case 的 raw discriminant scores 用於 structure matrix 與 centroids
  // 收集所有 case 的 X 與所屬 group index
  const allX = []
  const allGroupIdx = []
  for (let g = 0; g < k; g++) {
    for (const r of buckets[groups[g]]) {
      allX.push(r)
      allGroupIdx.push(g)
    }
  }

  // λ 總和（前 numFunctions 個正值）
  let lambdaSum = 0
  for (let i = 0; i < numFunctions; i++) {
    if (Number.isFinite(eigVals[i]) && eigVals[i] > 0) lambdaSum += eigVals[i]
  }
  let cumProportion = 0

  // 預先存 standardized & raw eigenvectors，以便算 group centroids
  const rawEigenvectors = []   // length numFunctions, each length p（任意尺度特徵向量）
  const unstdEigenvectors = [] // 未標準化係數（wᵀ S_p w = 1）— 投影判別分數 / centroids 用
  const scoresPerFunction = [] // numFunctions × N (列 = function, 欄 = case)

  for (let i = 0; i < numFunctions; i++) {
    const lam = eigVals[i] || 0
    // raw eigenvector (column i of eigVecs)
    const w = new Array(p)
    for (let r = 0; r < p; r++) w[r] = eigVecs[r][i] || 0

    // wᵀ S_p w
    const Spw = new Array(p).fill(0)
    for (let a = 0; a < p; a++) {
      let s = 0
      for (let b = 0; b < p; b++) s += Sp[a][b] * w[b]
      Spw[a] = s
    }
    let scale = 0
    for (let a = 0; a < p; a++) scale += w[a] * Spw[a]
    const norm = scale > 0 ? Math.sqrt(scale) : 1
    // 未標準化係數（SPSS unstandardized）：縮放使 wᵀ S_p w = 1，判別分數由此計算
    const wUnstd = w.map((v) => v / norm)
    // 標準化係數（SPSS standardized）：未標準化 × 該預測變項的組內合併 SD
    const wStd = wUnstd.map((v, j) => v * Math.sqrt(Math.max(0, Sp[j][j])))

    rawEigenvectors.push(w)
    unstdEigenvectors.push(wUnstd)

    // 每個 case 的判別分數：必須用**未標準化**係數（wᵀ S_p w = 1）投影，
    // 中心化於 grandMean 以呈現「離全平均的偏移」。
    // ⚠ 不可用標準化係數 wStd——它是 wUnstd 與各變項組內 SD 的逐元素乘積，
    //   方向與判別軸不同，會算出錯誤的 structure matrix 與 centroids。
    const scores = new Array(allX.length).fill(0)
    for (let n = 0; n < allX.length; n++) {
      let s = 0
      for (let j = 0; j < p; j++) s += (allX[n][j] - grandMean[j]) * wUnstd[j]
      scores[n] = s
    }
    scoresPerFunction.push(scores)

    // canonical correlation
    const canCorr = lam >= 0 ? Math.sqrt(lam / (1 + lam)) : NaN
    const propVar = lambdaSum > 0 ? lam / lambdaSum : NaN
    if (Number.isFinite(propVar)) cumProportion += propVar

    // structure coefficients = 預測變項與判別分數的組內合併（pooled within-group）
    // 相關（SPSS / R MASS 定義）。全樣本相關另存為 structureCoefficientsTotal 供對照。
    const structure = new Array(p).fill(NaN)
    const structureTotal = new Array(p).fill(NaN)
    for (let j = 0; j < p; j++) {
      const xs = allX.map((r) => r[j])
      structure[j] = pooledWithinCorr(xs, scores, allGroupIdx, k)
      structureTotal[j] = pearson(xs, scores)
    }

    // Sequential Wilks' Λ_j = Π_{i ≥ j} 1 / (1 + λ_i)
    let wilks = 1
    for (let q = i; q < numFunctions; q++) {
      const lq = eigVals[q] || 0
      wilks *= 1 / (1 + lq)
    }
    const chi2 = -(N - 1 - (p + k) / 2) * Math.log(wilks > 0 ? wilks : 1e-300)
    const df = (p - i) * (k - 1 - i) // (p − j + 1)(k − j) with 1-based j → 0-based i
    const pVal = chi2 > 0 && df > 0 ? pChiSq(chi2, df) : NaN

    functions.push({
      index: i + 1,
      eigenvalue: lam,
      canonicalCorrelation: canCorr,
      proportionOfVariance: propVar,
      cumulativeProportion: cumProportion,
      rawCoefficients: w,
      unstandardizedCoefficients: wUnstd,
      standardizedCoefficients: wStd,
      structureCoefficients: structure,
      structureCoefficientsTotal: structureTotal,
      wilksLambda: wilks,
      chi2,
      df,
      p: pVal,
    })
  }

  /* ─── Group centroids（將 group means 投影到判別軸） ─── */
  const groupCentroids = []
  for (let g = 0; g < k; g++) {
    const row = new Array(numFunctions).fill(0)
    for (let i = 0; i < numFunctions; i++) {
      let s = 0
      for (let j = 0; j < p; j++) s += (groupMeans[g][j] - grandMean[j]) * unstdEigenvectors[i][j]
      row[i] = s
    }
    groupCentroids.push(row)
  }

  /* ─── Classification（線性判別分數，resubstitution） ─── */
  // δ_g(x) = xᵀ S_p^-1 μ_g − ½ μ_gᵀ S_p^-1 μ_g + log(π_g)
  const SpInvMu = []      // k × p, rows = S_p^-1 μ_g
  const constTerm = []    // k, = − ½ μ_gᵀ S_p^-1 μ_g + log(π_g)
  for (let g = 0; g < k; g++) {
    const SpInvMu_g = matVec(SpInv, groupMeans[g])
    SpInvMu.push(SpInvMu_g)
    let muSpInvMu = 0
    for (let j = 0; j < p; j++) muSpInvMu += groupMeans[g][j] * SpInvMu_g[j]
    const prior = groupSizes[g] / N
    constTerm.push(-0.5 * muSpInvMu + Math.log(prior))
  }
  // 建立 confusion matrix
  const confusion = []
  for (let i = 0; i < k; i++) confusion.push(new Array(k).fill(0))
  let correct = 0
  const perClassCorrect = new Array(k).fill(0)
  for (let n = 0; n < allX.length; n++) {
    const x = allX[n]
    let bestG = 0
    let bestDelta = -Infinity
    for (let g = 0; g < k; g++) {
      let s = constTerm[g]
      for (let j = 0; j < p; j++) s += x[j] * SpInvMu[g][j]
      if (s > bestDelta) { bestDelta = s; bestG = g }
    }
    const trueG = allGroupIdx[n]
    confusion[trueG][bestG] += 1
    if (bestG === trueG) {
      correct += 1
      perClassCorrect[trueG] += 1
    }
  }
  const overallAccuracy = allX.length > 0 ? correct / allX.length : NaN
  const perClassAccuracy = perClassCorrect.map((c, g) =>
    groupSizes[g] > 0 ? c / groupSizes[g] : NaN
  )

  /* ─── Box's M test of homogeneity of covariance matrices ─── */
  let boxM = { applicable: false }
  const allOk = groupSizes.every((n) => n >= 2)
  if (allOk) {
    const detSp = determinant(Sp)
    if (detSp > 0) {
      let M = (N - k) * Math.log(detSp)
      let degenerate = false
      for (let g = 0; g < k; g++) {
        const ng = groupSizes[g]
        const S_g = []
        for (let i = 0; i < p; i++) {
          const row = new Array(p)
          for (let j = 0; j < p; j++) row[j] = groupSSCP[g][i][j] / (ng - 1)
          S_g.push(row)
        }
        const detSg = determinant(S_g)
        if (detSg <= 0) { degenerate = true; break }
        M -= (ng - 1) * Math.log(detSg)
      }
      if (!degenerate) {
        let invSum = 0
        for (const ng of groupSizes) invSum += 1 / (ng - 1)
        invSum -= 1 / (N - k)
        const c1 = ((2 * p * p + 3 * p - 1) / (6 * (p + 1) * (k - 1))) * invSum
        const chi2 = (1 - c1) * M
        const dfBox = ((k - 1) * p * (p + 1)) / 2
        const pBox = chi2 > 0 && dfBox > 0 ? pChiSq(chi2, dfBox) : NaN
        boxM = { m: M, chi2, df: dfBox, p: pBox, applicable: true }
      }
    }
  }

  return {
    n: N,
    k,
    p,
    groupVar,
    predictors,
    groups,
    groupSizes,
    groupMeans,
    grandMean,
    W,
    B,
    Sp,
    eigenvalues: eigVals.slice(0, numFunctions),
    functions,
    groupCentroids,
    classification: {
      confusionMatrix: confusion,
      overallAccuracy,
      perClassAccuracy,
      n: allX.length,
    },
    boxM,
  }
}

/* unused helper exports — kept for future diagnostics */
export const _matrixHelpers = { transpose, matmul, inverse }
