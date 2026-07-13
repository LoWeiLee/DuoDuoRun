/**
 * 二元邏輯斯迴歸（Binary Logistic Regression）
 *
 * 對外 API：
 *   logisticRegression(X, y, predictorNames)
 *
 * 演算法：Iteratively Reweighted Least Squares (IRLS) — 與 R::glm(family=binomial) 同
 *
 * 公式：
 *   logit(p) = β₀ + β₁X₁ + ... + βₖXₖ
 *   p = sigmoid(η) = 1 / (1 + exp(-η))
 *
 *   每次迭代：
 *     W = diag(p(1-p))
 *     z = η + (y - p) / [p(1-p)]            （工作回應）
 *     β_new = (X' W X)⁻¹ X' W z              （加權最小平方）
 *
 *   收斂條件：max|β_new - β| < 1e-8 或 50 次迭代
 *
 * 回傳：
 *   {
 *     n, k, converged, iterations,
 *     intercept: { b, se, z, p, or, orCI },
 *     coefficients: [{ name, b, se, z, p, or, orCI }],
 *     fit: { llNull, ll, lrStat, lrDf, lrP, mcFadden, nagelkerke },
 *     classification: { tp, tn, fp, fn, total, correctPercent },
 *     roc: { points: [{fpr, tpr}], auc },
 *     fittedProbs: number[]
 *   }
 *
 * Wald 檢定：z = β/SE(β)，p = 2(1 - Φ(|z|))
 * OR 95% CI：exp(β ± 1.96·SE(β))
 * LR test：-2(LL_null - LL_full) ~ χ²(k)
 * Nagelkerke R²：Cox-Snell R² 除以理論最大值
 *
 * 對標 R::glm + summary、SPSS 邏輯斯迴歸輸出。
 */
import { matvec, inverse } from './matrix.js'
import { normalCdf, pChiSq } from './pvalue.js'

/** Sigmoid 函式（含 numerically stable 分支） */
function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z))
  const e = Math.exp(z)
  return e / (1 + e)
}

/** 對數概似 LL = Σ y·log(p) + (1-y)·log(1-p) */
function logLikelihood(y, probs) {
  let ll = 0
  for (let i = 0; i < y.length; i++) {
    const pi = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]))
    ll += y[i] === 1 ? Math.log(pi) : Math.log(1 - pi)
  }
  return ll
}

export function logisticRegression(X, y, predictorNames) {
  const n = X.length
  if (n !== y.length) return { error: 'length-mismatch' }
  const k = X[0]?.length || 0
  if (k < 1) return { error: 'need->=1-predictor' }
  if (n < k + 5) return { error: 'need-more-data' }

  // 確認 y 為 0/1
  for (const yi of y) {
    if (yi !== 0 && yi !== 1) return { error: 'y-not-binary' }
  }
  const yPos = y.reduce((s, v) => s + v, 0)
  const yNeg = n - yPos
  if (yPos === 0 || yNeg === 0) return { error: 'y-all-same-class' }

  // 加截距
  const Xa = X.map((row) => [1, ...row])
  const p = k + 1

  // IRLS 迭代
  let beta = new Array(p).fill(0)
  const maxIter = 50
  const tol = 1e-8
  let converged = false
  let iter

  for (iter = 0; iter < maxIter; iter++) {
    const eta = matvec(Xa, beta)
    const probs = eta.map(sigmoid)

    // 構造 X' W X 與 X' W z（不顯式建 W 對角矩陣以省記憶體）
    const z = new Array(n)
    const w = new Array(n)
    for (let i = 0; i < n; i++) {
      const pi = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]))
      const wi = pi * (1 - pi)
      w[i] = wi
      z[i] = eta[i] + (y[i] - pi) / wi
    }

    const XtWX = []
    for (let r = 0; r < p; r++) {
      const row = new Array(p).fill(0)
      for (let c = 0; c < p; c++) {
        let s = 0
        for (let i = 0; i < n; i++) s += w[i] * Xa[i][r] * Xa[i][c]
        row[c] = s
      }
      XtWX.push(row)
    }
    const XtWXinv = inverse(XtWX)
    if (!XtWXinv) return { error: 'singular-matrix' }

    const XtWz = new Array(p).fill(0)
    for (let r = 0; r < p; r++) {
      let s = 0
      for (let i = 0; i < n; i++) s += w[i] * Xa[i][r] * z[i]
      XtWz[r] = s
    }

    const betaNew = matvec(XtWXinv, XtWz)
    let maxDiff = 0
    for (let i = 0; i < p; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(betaNew[i] - beta[i]))
    }
    beta = betaNew
    if (maxDiff < tol) {
      converged = true
      break
    }
  }

  // 最終配適
  const eta = matvec(Xa, beta)
  const fittedProbs = eta.map(sigmoid)
  const ll = logLikelihood(y, fittedProbs)

  // Null model（只有截距）
  const yMean = yPos / n
  const llNull = n * (yMean * Math.log(yMean) + (1 - yMean) * Math.log(1 - yMean))

  // 共變異矩陣 = (X' W X)⁻¹
  const W = fittedProbs.map((pi) => {
    const c = Math.max(1e-15, Math.min(1 - 1e-15, pi))
    return c * (1 - c)
  })
  const XtWX = []
  for (let r = 0; r < p; r++) {
    const row = new Array(p).fill(0)
    for (let c = 0; c < p; c++) {
      let s = 0
      for (let i = 0; i < n; i++) s += W[i] * Xa[i][r] * Xa[i][c]
      row[c] = s
    }
    XtWX.push(row)
  }
  const cov = inverse(XtWX)
  if (!cov) return { error: 'singular-final-cov' }

  // 截距與每個係數的 SE / z / p / OR / OR CI
  const wald = (b, se) => {
    const z = b / se
    return {
      z,
      p: 2 * (1 - normalCdf(Math.abs(z))),
      or: Math.exp(b),
      orCI: [Math.exp(b - 1.96 * se), Math.exp(b + 1.96 * se)],
    }
  }
  const intercept = (() => {
    const b = beta[0]
    const se = Math.sqrt(cov[0][0])
    return { b, se, ...wald(b, se) }
  })()

  const coefficients = []
  for (let j = 0; j < k; j++) {
    const idx = j + 1
    const b = beta[idx]
    const se = Math.sqrt(cov[idx][idx])
    coefficients.push({
      name: predictorNames?.[j] || `x${j + 1}`,
      b, se, ...wald(b, se),
    })
  }

  // LR test
  const lrStat = -2 * (llNull - ll)
  const lrDf = k
  const lrP = pChiSq(lrStat, lrDf)

  // Pseudo R²
  const mcFadden = 1 - ll / llNull
  const coxSnell = 1 - Math.exp((2 / n) * (llNull - ll))
  const maxR2 = 1 - Math.exp((2 / n) * llNull)
  const nagelkerke = maxR2 > 0 ? coxSnell / maxR2 : NaN

  // 0.5 閾值的分類表
  let tp = 0, tn = 0, fp = 0, fn = 0
  for (let i = 0; i < n; i++) {
    const pred = fittedProbs[i] >= 0.5 ? 1 : 0
    if (y[i] === 1 && pred === 1) tp++
    else if (y[i] === 0 && pred === 0) tn++
    else if (y[i] === 0 && pred === 1) fp++
    else fn++
  }
  const correctPercent = (tp + tn) / n

  // ROC + AUC（trapezoidal 積分）
  const sorted = fittedProbs.map((p, i) => ({ p, y: y[i] })).sort((a, b) => b.p - a.p)
  const points = [{ fpr: 0, tpr: 0 }]
  let tpCount = 0, fpCount = 0
  let prevFpr = 0, prevTpr = 0
  let auc = 0
  for (const item of sorted) {
    if (item.y === 1) tpCount++
    else fpCount++
    const tpr = yPos > 0 ? tpCount / yPos : 0
    const fpr = yNeg > 0 ? fpCount / yNeg : 0
    auc += (fpr - prevFpr) * (tpr + prevTpr) / 2
    points.push({ fpr, tpr })
    prevFpr = fpr; prevTpr = tpr
  }

  return {
    n, k, converged, iterations: iter + 1,
    intercept,
    coefficients,
    fit: { llNull, ll, lrStat, lrDf, lrP, mcFadden, nagelkerke },
    classification: { tp, tn, fp, fn, total: n, correctPercent },
    roc: { points, auc },
    fittedProbs,
  }
}
