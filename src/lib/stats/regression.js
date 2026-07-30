/**
 * 簡單線性迴歸（一個 X 預測 Y）
 *
 * 對外 API：
 *   simpleLinearRegression(x, y) → 完整結果物件
 *
 * 回傳結構：
 *   {
 *     n,
 *     intercept: { b, se, t, p },
 *     slope:     { b, se, t, p, beta },     // beta 為標準化係數
 *     fit: { r, r2, adjR2, seEstimate },
 *     anova: { ssReg, ssRes, ssTotal, dfReg, dfRes, dfTotal, msReg, msRes, F, p },
 *     residuals: number[],
 *   }
 *
 * 公式：
 *   b1 = Σ((Xi - Mx)(Yi - My)) / Σ(Xi - Mx)²
 *   b0 = My - b1 * Mx
 *   ŷi = b0 + b1 * Xi
 *   ei = Yi - ŷi
 *   SSr = Σei²              (殘差平方和)
 *   SSt = Σ(Yi - My)²       (總平方和)
 *   SSm = SSt - SSr         (迴歸模型平方和)
 *   R² = SSm / SSt
 *   Adj R² = 1 - (1-R²)(n-1)/(n-2)（k=1 預測變項）
 *   F = MSm / MSr，df1=1, df2=n-2
 *   SE(b1) = SE_estimate / √Σ(Xi - Mx)²
 *   SE(b0) = SE_estimate · √(1/n + Mx²/Σ(Xi - Mx)²)
 *   beta = b1 · SD(X) / SD(Y)（簡單迴歸下 = r）
 *
 * 對標 SPSS / R::lm 的預設輸出。
 */
import { mean, sd } from './descriptive.js'
import { pT, pF } from './pvalue.js'

export function simpleLinearRegression(x, y) {
  const n = x.length
  if (n !== y.length) return { error: 'length-mismatch' }
  if (n < 3) return { error: 'need-n>=3' }

  const mx = mean(x)
  const my = mean(y)

  let sxx = 0  // Σ(Xi - Mx)²
  let syy = 0  // Σ(Yi - My)²
  let sxy = 0  // Σ((Xi - Mx)(Yi - My))
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }

  if (sxx === 0) return { error: 'x-is-constant' }

  const b1 = sxy / sxx
  const b0 = my - b1 * mx

  // 殘差與 SS
  const residuals = new Array(n)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const yhat = b0 + b1 * x[i]
    residuals[i] = y[i] - yhat
    ssRes += residuals[i] * residuals[i]
  }
  const ssTotal = syy
  const ssReg = ssTotal - ssRes

  // 自由度
  const dfReg = 1
  const dfRes = n - 2
  const dfTotal = n - 1

  // MS
  const msReg = ssReg / dfReg
  const msRes = ssRes / dfRes

  // F 與 p
  const F = msReg / msRes
  const pF_ = pF(F, dfReg, dfRes)

  // 配適度
  const r2 = ssTotal === 0 ? NaN : ssReg / ssTotal
  const r = Math.sign(b1) * Math.sqrt(Math.max(0, r2))
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dfRes)
  const seEstimate = Math.sqrt(msRes)

  // 係數標準誤
  const seB1 = seEstimate / Math.sqrt(sxx)
  const seB0 = seEstimate * Math.sqrt(1 / n + (mx * mx) / sxx)

  // 係數 t / p
  const tB1 = b1 / seB1
  const tB0 = b0 / seB0
  const pB1 = pT(Math.abs(tB1), dfRes)
  const pB0 = pT(Math.abs(tB0), dfRes)

  // 標準化係數 beta（簡單迴歸下 = r）
  const sdX = sd(x)
  const sdY = sd(y)
  const beta = sdY === 0 ? NaN : (b1 * sdX) / sdY

  // ★ 2026-07-30 紅隊 R69（L2）：簡單迴歸沒有矩陣可解，所以**不會**像多元迴歸那樣被
  //   singular-matrix 擋下來。兩個退化情形都要自己標：
  //   (a) y 為常數 ⇒ ssTotal = 0 ⇒ R² 為 NaN 印「—」，但**截距的 p 是 0，報表印「< .001」綠燈**；
  //   (b) 完美配適 ⇒ ssRes = 0 ⇒ se = 0、t = ±∞，報表印 **R² = 1.000、斜率 p < .001**
  //       而 t 欄印「—」（fmtNum(Infinity)）——看起來只是排版空白。
  const zeroVarianceY = ssTotal === 0
  const perfectFit = ssTotal > 0 && ssRes / ssTotal < 1e-20

  return {
    n,
    zeroVarianceY,
    perfectFit,
    intercept: { b: b0, se: seB0, t: tB0, p: pB0 },
    slope:     { b: b1, se: seB1, t: tB1, p: pB1, beta },
    fit: { r, r2, adjR2, seEstimate },
    anova: {
      ssReg, ssRes, ssTotal,
      dfReg, dfRes, dfTotal,
      msReg, msRes,
      F, p: pF_,
    },
    residuals,
    means: { x: mx, y: my },
    sds:   { x: sdX, y: sdY },
  }
}
