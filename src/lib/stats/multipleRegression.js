/**
 * 多元線性迴歸（OLS）
 *
 * 對外 API：
 *   multipleRegression(X, y, predictorNames)
 *
 *   X : 列為觀察值、欄為預測變項（不含截距項）
 *   y : 1D 依變項
 *   predictorNames : 預測變項名稱陣列（用於回傳 coefficients 標籤）
 *
 * 回傳：
 *   {
 *     n, k,
 *     intercept: { b, se, t, p },
 *     coefficients: [{ name, b, se, beta, t, p, vif }],
 *     fit: { r, r2, adjR2, seEstimate },
 *     anova: { ssReg, ssRes, ssTotal, dfReg, dfRes, dfTotal, msReg, msRes, F, p },
 *     residuals: number[],
 *     fitted: number[],
 *   }
 *
 * 公式（標準 OLS）：
 *   設計矩陣 X* = [1 | X]（加截距）
 *   β = (X*' X*)^(-1) X*' y
 *   殘差 e = y - X* β
 *   SS_residual = e' e
 *   SS_total    = Σ(y_i - ȳ)²
 *   R² = 1 - SS_residual / SS_total
 *   Adj R² = 1 - (1 - R²) · (n - 1) / (n - k - 1)（k 為預測變項數）
 *   MSE = SS_residual / (n - k - 1)
 *   Var(β) = MSE · (X*' X*)^(-1)
 *   SE(β_i) = √Var(β)_ii
 *   t_i = β_i / SE(β_i)
 *   p_i = 雙尾 t(n - k - 1)
 *   F   = (R² / k) / ((1 - R²) / (n - k - 1))
 *   標準化 β_i_std = β_i · SD(X_i) / SD(y)
 *
 * VIF（Variance Inflation Factor）：
 *   VIF_i = 1 / (1 - R²_i)，其中 R²_i 為 X_i 對其他預測變項做迴歸的 R²
 *   VIF > 5（嚴格 10）通常視為多重共線警訊
 *
 * 對標 SPSS、R::lm() 預設輸出。
 */
import { mean, sd } from './descriptive.js'
import { pT, pF } from './pvalue.js'
import { transpose, matmul, matvec, inverse } from './matrix.js'

/** 對 X (n×k) 加上一個全 1 截距 column，回傳 n×(k+1) 矩陣 */
function augment(X) {
  return X.map((row) => [1, ...row])
}

/** 計算單變項 X_i 對其他變項的 R²（用於 VIF） */
function rSquaredOfPredictor(X, idx) {
  const n = X.length
  const k = X[0].length
  if (k < 2) return 0
  // y_i = X 的第 idx 欄
  const y = X.map((r) => r[idx])
  // 其他欄為設計矩陣
  const Xo = X.map((r) => r.filter((_, j) => j !== idx))
  // 加截距
  const Xa = augment(Xo)
  const Xt = transpose(Xa)
  const XtX = matmul(Xt, Xa)
  const XtXinv = inverse(XtX)
  if (!XtXinv) return NaN
  const Xty = matvec(Xt, y)
  const beta = matvec(XtXinv, Xty)
  // 預測值與 R²
  const yhat = matvec(Xa, beta)
  const yMean = mean(y)
  let ssRes = 0
  let ssTotal = 0
  for (let i = 0; i < n; i++) {
    const e = y[i] - yhat[i]
    ssRes += e * e
    const d = y[i] - yMean
    ssTotal += d * d
  }
  if (ssTotal === 0) return NaN
  return 1 - ssRes / ssTotal
}

export function multipleRegression(X, y, predictorNames) {
  const n = X.length
  if (n !== y.length) return { error: 'length-mismatch' }
  const k = X[0]?.length || 0
  if (k < 1) return { error: 'need->=1-predictor' }
  if (n < k + 2) return { error: 'need-n>k+1' }

  // 加截距
  const Xa = augment(X)
  const Xt = transpose(Xa)
  const XtX = matmul(Xt, Xa)
  const XtXinv = inverse(XtX)
  if (!XtXinv) return { error: 'singular-matrix' }
  const Xty = matvec(Xt, y)
  const beta = matvec(XtXinv, Xty)
  // beta[0] = intercept, beta[1..k] = slopes

  // 預測值與殘差
  const fitted = matvec(Xa, beta)
  const residuals = new Array(n)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    residuals[i] = y[i] - fitted[i]
    ssRes += residuals[i] * residuals[i]
  }
  const yMean = mean(y)
  let ssTotal = 0
  for (const yi of y) ssTotal += (yi - yMean) * (yi - yMean)
  const ssReg = ssTotal - ssRes

  const dfReg = k
  const dfRes = n - k - 1
  const dfTotal = n - 1
  const msReg = ssReg / dfReg
  const msRes = ssRes / dfRes

  const r2 = ssTotal === 0 ? NaN : ssReg / ssTotal
  const r = Math.sqrt(Math.max(0, r2))
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dfRes)
  const seEstimate = Math.sqrt(msRes)

  const F = (r2 / dfReg) / ((1 - r2) / dfRes)
  const pFvalue = pF(F, dfReg, dfRes)

  // 變異-共變異矩陣 = MSE · (X'X)^(-1)
  const seBetas = new Array(beta.length)
  for (let i = 0; i < beta.length; i++) {
    seBetas[i] = Math.sqrt(msRes * XtXinv[i][i])
  }

  // 標準化係數 + VIF（只對非截距項）
  const sdY = sd(y)
  const xCols = transpose(X) // k × n
  const sdXs = xCols.map((col) => sd(col))

  const coefficients = []
  for (let j = 0; j < k; j++) {
    const idx = j + 1 // 跳過截距
    const b = beta[idx]
    const se = seBetas[idx]
    const tStat = b / se
    const p = pT(Math.abs(tStat), dfRes)
    const beta_std = sdY === 0 ? NaN : (b * sdXs[j]) / sdY

    // VIF：把第 j 欄當 dependent，回歸到其他 X 上
    const r2j = rSquaredOfPredictor(X, j)
    const vif = Number.isFinite(r2j) && r2j < 1 ? 1 / (1 - r2j) : Infinity

    coefficients.push({
      name: predictorNames?.[j] || `x${j + 1}`,
      b, se, beta: beta_std, t: tStat, p, vif,
    })
  }

  // 截距
  const intercept = {
    b: beta[0],
    se: seBetas[0],
    t: beta[0] / seBetas[0],
    p: pT(Math.abs(beta[0] / seBetas[0]), dfRes),
  }

  // 警示：依變項變異 = 0；任一 VIF > 100 視為嚴重共線
  const zeroVarianceY = sdY === 0
  const maxVif = coefficients.reduce((m, c) => (Number.isFinite(c.vif) && c.vif > m ? c.vif : m), 0)
  const severeMulticollinearity = coefficients.some((c) => Number.isFinite(c.vif) && c.vif > 100)

  return {
    n, k,
    intercept,
    coefficients,
    fit: { r, r2, adjR2, seEstimate },
    anova: {
      ssReg, ssRes, ssTotal,
      dfReg, dfRes, dfTotal,
      msReg, msRes,
      F, p: pFvalue,
    },
    residuals,
    fitted,
    zeroVarianceY,
    severeMulticollinearity,
    maxVif,
  }
}
