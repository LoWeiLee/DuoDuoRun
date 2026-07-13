/**
 * MANOVA — 單因子多變量變異數分析（One-way MANOVA）
 *
 * One-way single factor MANOVA computing Wilks' Lambda, Pillai's trace,
 * Hotelling-Lawley trace, Roy's largest root, plus Box's M test for
 * homogeneity of covariance matrices.
 *
 * 對外 API：
 *   manova(rows, factorVar, dvVars)
 *
 *   factorVar : string  — 類別因子欄位
 *   dvVars    : string[] — 連續依變項欄位（≥ 2）
 *
 * Listwise deletion：factor 或任一 DV 缺值即剔除整列。
 *
 * 演算法概要：
 *   p = #DVs, k = #groups, N = total subjects, n_g = group size
 *   Y     : N×p
 *   Ȳ_g  : 1×p (group g mean)
 *   Ȳ    : 1×p (grand mean)
 *
 *   H = Σ_g n_g · (Ȳ_g − Ȳ)ᵀ (Ȳ_g − Ȳ)        (between SSCP, p×p)
 *   E = Σ_g Σ_i (Y_gi − Ȳ_g)ᵀ (Y_gi − Ȳ_g)    (within SSCP, p×p)
 *
 *   df_h = k − 1, df_e = N − k
 *
 *   Wilks' Λ           = det(E) / det(E + H)
 *   Pillai's V         = Σ λ_i / (1 + λ_i)
 *   Hotelling-Lawley T = Σ λ_i
 *   Roy's largest root = max λ_i
 *   λ_i 為 E^(-1) H 的特徵值（非對稱），透過對稱化 E^(-1/2) H E^(-1/2) 求解。
 *
 *   Box's M：M = (N-k)·ln|S_p| − Σ (n_g-1)·ln|S_g|
 *           χ² = (1 - c1) · M, df = (k-1)·p·(p+1)/2
 *
 *   Approximate F distributions follow Rencher (2002) /
 *   Tabachnick & Fidell convention. Roy is reported as upper bound.
 */
import { isMissing } from '../variableTypes.js'
import { transpose, matmul, inverse } from './matrix.js'
import { pF, pChiSq } from './pvalue.js'

/* ─────────────────────────  局部矩陣輔助 / Local matrix helpers  ───────────────────────── */

/**
 * 行列式（LU decomposition with partial pivoting）
 * Determinant via LU decomposition. Returns 0 for singular.
 */
function determinant(M) {
  const n = M.length
  if (n === 0) return 1
  // 複製 / clone
  const A = M.map((row) => [...row])
  let sign = 1
  for (let col = 0; col < n; col++) {
    // partial pivoting
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


/** A + B（assume same shape） */
function matAdd(A, B) {
  const n = A.length
  const out = []
  for (let i = 0; i < n; i++) {
    const row = new Array(A[i].length)
    for (let j = 0; j < A[i].length; j++) row[j] = A[i][j] + B[i][j]
    out.push(row)
  }
  return out
}

/* ─────────────────────────  Jacobi 對稱矩陣特徵分解  ───────────────────────── */

/**
 * Jacobi eigen-decomposition for a symmetric matrix.
 * 回傳 { values, vectors } — values 已遞減排序，vectors 為對應的列向量集合（M = V Λ Vᵀ）。
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
 * 計算 E^(-1) H 的特徵值 / Eigenvalues of E^(-1) · H
 *
 * E^(-1) H 一般非對稱，這裡透過對稱化：先用 Jacobi 對 E 取出 V·Λ·Vᵀ，
 * 構造 E^(-1/2) = V·Λ^(-1/2)·Vᵀ；則 E^(-1/2) H E^(-1/2) 為對稱，
 * 其特徵值與 E^(-1) H 相同。
 */
function eigenvaluesEinvH(E, H) {
  // E = V · diag(λ_E) · Vᵀ
  const eig = jacobiSymEigen(E)
  const p = E.length
  // E^(-1/2) = V · diag(1/√λ_E) · Vᵀ
  const invSqrtLam = eig.values.map((v) => (v > 1e-15 ? 1 / Math.sqrt(v) : 0))
  // E^(-1/2)
  const Vmat = eig.vectors // p × p, columns are eigenvectors
  // diag(invSqrtLam) · Vᵀ
  const Vt = transpose(Vmat)
  const D_Vt = []
  for (let i = 0; i < p; i++) {
    const row = new Array(p)
    for (let j = 0; j < p; j++) row[j] = invSqrtLam[i] * Vt[i][j]
    D_Vt.push(row)
  }
  const Esqrtinv = matmul(Vmat, D_Vt) // p × p, symmetric
  // S = E^(-1/2) H E^(-1/2)
  const tmp = matmul(Esqrtinv, H)
  const S = matmul(tmp, Esqrtinv)
  // 數值對稱化以避免微小漂移 / numerical symmetrization
  for (let i = 0; i < p; i++) {
    for (let j = i + 1; j < p; j++) {
      const m = 0.5 * (S[i][j] + S[j][i])
      S[i][j] = S[j][i] = m
    }
  }
  const sEig = jacobiSymEigen(S)
  // 截斷負特徵值（理論上 ≥ 0，數值誤差可能微負）
  return sEig.values.map((v) => (v < 0 ? 0 : v))
}

/* ─────────────────────────  主要 MANOVA  ───────────────────────── */

export function manova(rows, factorVar, dvVars) {
  if (!factorVar) return { error: 'pickFactor' }
  if (!dvVars || dvVars.length < 2) return { error: 'pickDVs' }
  if (dvVars.includes(factorVar)) return { error: 'factor-in-dvs' }

  const p = dvVars.length

  // Listwise deletion + 分組 / grouping
  const buckets = {}
  for (const r of rows) {
    const f = r[factorVar]
    if (isMissing(f)) continue
    const row = []
    let bad = false
    for (const dv of dvVars) {
      const v = r[dv]
      if (isMissing(v)) { bad = true; break }
      const num = Number(v)
      if (!Number.isFinite(num)) { bad = true; break }
      row.push(num)
    }
    if (bad) continue
    const key = String(f)
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(row)
  }

  const levels = Object.keys(buckets)
  const k = levels.length
  if (k < 2) return { error: 'factorBadGroups', meta: { k } }

  const groupSizes = levels.map((lv) => buckets[lv].length)
  const N = groupSizes.reduce((s, n) => s + n, 0)
  if (N <= k + p) return { error: 'tooFewN', meta: { N, k, p } }

  // 各組平均 / group means (k × p)
  const groupMeans = []
  for (const lv of levels) {
    const G = buckets[lv]
    const m = new Array(p).fill(0)
    for (const r of G) for (let j = 0; j < p; j++) m[j] += r[j]
    for (let j = 0; j < p; j++) m[j] /= G.length
    groupMeans.push(m)
  }

  // 全平均 / grand mean (1 × p)，以加權方式（等同於 sum / N）
  const grandMean = new Array(p).fill(0)
  for (let g = 0; g < k; g++) {
    for (let j = 0; j < p; j++) grandMean[j] += groupSizes[g] * groupMeans[g][j]
  }
  for (let j = 0; j < p; j++) grandMean[j] /= N

  // H = Σ_g n_g · (Ȳ_g − Ȳ)(Ȳ_g − Ȳ)ᵀ
  const H = []
  for (let i = 0; i < p; i++) H.push(new Array(p).fill(0))
  for (let g = 0; g < k; g++) {
    const d = new Array(p)
    for (let j = 0; j < p; j++) d[j] = groupMeans[g][j] - grandMean[j]
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        H[i][j] += groupSizes[g] * d[i] * d[j]
      }
    }
  }

  // E = Σ_g Σ_i (Y_gi − Ȳ_g)(Y_gi − Ȳ_g)ᵀ
  const E = []
  for (let i = 0; i < p; i++) E.push(new Array(p).fill(0))
  // 同時收集每組 SSCP 用於 Box's M
  const groupSSCP = [] // Σ_i (Y_gi − Ȳ_g)(...)ᵀ for each g
  for (let g = 0; g < k; g++) {
    const Sg = []
    for (let i = 0; i < p; i++) Sg.push(new Array(p).fill(0))
    const G = buckets[levels[g]]
    const m = groupMeans[g]
    for (const r of G) {
      const d = new Array(p)
      for (let j = 0; j < p; j++) d[j] = r[j] - m[j]
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          const inc = d[i] * d[j]
          E[i][j] += inc
          Sg[i][j] += inc
        }
      }
    }
    groupSSCP.push(Sg)
  }

  const dfH = k - 1
  const dfE = N - k

  // 行列式 / determinants
  const detE = determinant(E)
  const EplusH = matAdd(E, H)
  const detEplusH = determinant(EplusH)

  // Wilks' Λ
  const wilksLambda = detEplusH > 0 ? detE / detEplusH : NaN

  // E^(-1) H 的特徵值 / eigenvalues of E^(-1)·H
  let eigenvalues
  try {
    eigenvalues = eigenvaluesEinvH(E, H)
  } catch {
    eigenvalues = []
  }
  // 只保留 s = min(p, df_h) 個非零特徵值（理論上其餘為 0）
  const s = Math.min(p, dfH)

  // Pillai's V = Σ λ_i / (1 + λ_i)
  let pillaiV = 0
  for (const lam of eigenvalues) {
    if (Number.isFinite(lam)) pillaiV += lam / (1 + lam)
  }

  // Hotelling-Lawley T = Σ λ_i
  let hotellingT = 0
  for (const lam of eigenvalues) if (Number.isFinite(lam)) hotellingT += lam

  // Roy's largest root = max λ_i
  const royLambda = eigenvalues.length > 0 ? Math.max(...eigenvalues) : NaN
  const royTheta = Number.isFinite(royLambda) ? royLambda / (1 + royLambda) : NaN

  /* ─── F 近似 / F approximations ─── */

  // Wilks: Rao's F approximation
  // 特例：p == 1 或 df_h == 1 用 exact / special form
  let wilksF, wilksDf1, wilksDf2, wilksP
  {
    if (Number.isFinite(wilksLambda) && wilksLambda > 0 && wilksLambda <= 1) {
      if (p === 1) {
        // 同 ANOVA F
        wilksDf1 = dfH
        wilksDf2 = dfE
        const lam = wilksLambda
        wilksF = ((1 - lam) / lam) * (wilksDf2 / wilksDf1)
      } else if (dfH === 1) {
        // exact: F = ((1 − Λ) / Λ) · (df_e − p + 1) / p
        wilksDf1 = p
        wilksDf2 = dfE - p + 1
        wilksF = ((1 - wilksLambda) / wilksLambda) * (wilksDf2 / wilksDf1)
      } else {
        const tNum = p * p * dfH * dfH - 4
        const tDen = p * p + dfH * dfH - 5
        const tApprox = tDen > 0 ? Math.sqrt(tNum / tDen) : 1
        wilksDf1 = p * dfH
        const w = dfE + dfH - (p + dfH + 1) / 2
        wilksDf2 = w * tApprox - (p * dfH - 2) / 2
        const lamPow = Math.pow(wilksLambda, 1 / tApprox)
        wilksF = ((1 - lamPow) / lamPow) * (wilksDf2 / wilksDf1)
      }
      wilksP = wilksDf2 > 0 && Number.isFinite(wilksF) ? pF(wilksF, wilksDf1, wilksDf2) : NaN
    } else {
      wilksF = NaN; wilksDf1 = NaN; wilksDf2 = NaN; wilksP = NaN
    }
  }

  // Pillai
  let pillaiF, pillaiDf1, pillaiDf2, pillaiP
  {
    const m = (Math.abs(p - dfH) - 1) / 2
    const nVal = (dfE - p - 1) / 2
    pillaiDf1 = s * (2 * m + s + 1)
    pillaiDf2 = s * (2 * nVal + s + 1)
    if (s > 0 && pillaiDf2 > 0 && s - pillaiV > 0) {
      pillaiF = ((2 * nVal + s + 1) / (2 * m + s + 1)) * (pillaiV / (s - pillaiV))
      pillaiP = pF(pillaiF, pillaiDf1, pillaiDf2)
    } else {
      pillaiF = NaN; pillaiP = NaN
    }
  }

  // Hotelling-Lawley
  let hlF, hlDf1, hlDf2, hlP
  {
    const m = (Math.abs(p - dfH) - 1) / 2
    const nVal = (dfE - p - 1) / 2
    hlDf1 = s * (2 * m + s + 1)
    hlDf2 = 2 * (s * nVal + 1)
    if (s > 0 && hlDf2 > 0) {
      hlF = (hlDf2 / (s * s * (2 * m + s + 1))) * hotellingT
      hlP = pF(hlF, hlDf1, hlDf2)
    } else {
      hlF = NaN; hlP = NaN
    }
  }

  // Roy (upper bound)
  let royF, royDf1, royDf2, royP
  {
    const maxPDH = Math.max(p, dfH)
    royDf1 = maxPDH
    royDf2 = dfE - maxPDH + dfH
    if (Number.isFinite(royLambda) && royDf2 > 0) {
      royF = (royDf2 / maxPDH) * royLambda
      royP = pF(royF, royDf1, royDf2)
    } else {
      royF = NaN; royP = NaN
    }
  }

  /* ─── 效果量 / Effect sizes ─── */
  // partial η² (Pillai) = V / s
  const pillaiEta2 = s > 0 ? pillaiV / s : NaN
  // partial η² (Wilks) = 1 − Λ^(1/s)
  const wilksEta2 = s > 0 && Number.isFinite(wilksLambda) && wilksLambda > 0
    ? 1 - Math.pow(wilksLambda, 1 / s)
    : NaN

  /* ─── Box's M test of homogeneity of covariance matrices ─── */
  // S_g = (1/(n_g − 1)) · groupSSCP[g]; S_p = E / (N − k)
  let boxM = { applicable: false }
  // 適用條件：每組 n_g ≥ 2
  const allOk = groupSizes.every((n) => n >= 2)
  if (allOk) {
    const S_p = []
    for (let i = 0; i < p; i++) {
      const row = new Array(p)
      for (let j = 0; j < p; j++) row[j] = E[i][j] / dfE
      S_p.push(row)
    }
    const detSp = determinant(S_p)
    if (detSp > 0) {
      let M = (N - k) * Math.log(detSp)
      let degenerate = false
      for (let g = 0; g < k; g++) {
        const ng = groupSizes[g]
        // S_g = groupSSCP[g] / (n_g - 1)
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
        // c1
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

  /* ─── 各組敘述統計（M, SD, n）/ group descriptives per DV ─── */
  const descriptives = []
  for (let g = 0; g < k; g++) {
    const G = buckets[levels[g]]
    const ng = G.length
    for (let j = 0; j < p; j++) {
      let s1 = 0, s2 = 0
      for (const r of G) { s1 += r[j]; s2 += r[j] * r[j] }
      const mean = s1 / ng
      const variance = ng > 1 ? (s2 - s1 * s1 / ng) / (ng - 1) : 0
      const sd = Math.sqrt(Math.max(0, variance))
      descriptives.push({ level: levels[g], dv: dvVars[j], mean, sd, n: ng })
    }
  }

  return {
    n: N,
    k,
    p,
    factorVar,
    dvVars,
    levels,
    groupSizes,
    groupMeans,
    grandMean,
    H,
    E,
    dfH,
    dfE,
    eigenvalues,
    wilks: {
      lambda: wilksLambda,
      f: wilksF,
      df1: wilksDf1,
      df2: wilksDf2,
      p: wilksP,
      eta2: wilksEta2,
    },
    pillai: {
      v: pillaiV,
      f: pillaiF,
      df1: pillaiDf1,
      df2: pillaiDf2,
      p: pillaiP,
      eta2: pillaiEta2,
    },
    hotellingLawley: {
      t: hotellingT,
      f: hlF,
      df1: hlDf1,
      df2: hlDf2,
      p: hlP,
    },
    roy: {
      theta: royTheta,
      lambda: royLambda,
      f: royF,
      df1: royDf1,
      df2: royDf2,
      p: royP,
      isUpperBound: true,
    },
    boxM,
    descriptives,
  }
}

/* unused inverse import suppression — kept for future diagnostics */
export const _inverse = inverse
