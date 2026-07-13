/**
 * ANCOVA — Analysis of Covariance（單因子 + 1 個以上共變項）
 * ANCOVA — Single-factor with one or more continuous covariates.
 *
 * 對外 API / Public API:
 *   ancova(rows, yVar, factorVar, covariateVars)
 *
 *   rows           : raw object rows
 *   yVar           : string — 連續依變項名稱 / continuous DV
 *   factorVar      : string — 類別因子名稱 / categorical factor
 *   covariateVars  : string[] — 連續共變項名稱（≥1）/ continuous covariates
 *
 * 回傳 / Returns（皆為 Type-III SS 風格的調整 SS）：
 *   {
 *     n, k, levels,                                  // N、組數、各組標籤
 *     factor:    { ss, df, ms, f, p, partialEta2 },
 *     covariates:[{ name, ss, df, ms, f, p, partialEta2 }],
 *     errorTerm: { ss, df, ms },   // 誤差／殘差項（不是「錯誤」）
 *     total:     { ss, df },
 *     adjustedMeans: [{ level, mean, se, ciLow, ciHigh }],
 *     rawMeans:      [{ level, mean, n }],
 *     homogeneityTest: { f, dfNum, dfDen, p },       // 斜率同質性檢定
 *     mseFull, mseReduced,
 *
 * ⚠ 2026-07-13 紅隊 R5：這個欄位原本叫 `error`，與全 app「result.error 代表計算失敗」
 *   的慣例**直接撞名**。後果是 analyses 包裝層的 `if (out.error) return { error: ... }`
 *   在計算**成功**時也會成立（誤差項物件恆為 truthy），成功分支永遠到不了；
 *   Result.jsx 接著把 {ss, df, ms} 物件當成 React child 渲染 → 整個面板炸掉、白畫面。
 *   ANCOVA 實測從來沒有在 UI 上正常運作過。改名為 errorTerm 以根除這類撞名。
 *
 *     error?: string   // 僅在計算失敗時出現，值一律為字串錯誤碼
 *   }
 *
 * 計算流程 / Algorithm:
 *   1. Listwise deletion across DV / Factor / 所有共變項
 *   2. 用 0/1 dummy（reference = 第一個層級）建構設計矩陣
 *   3. Full model:    Y ~ dummies + covariates → SS_res_full
 *   4. Reduced model: Y ~ covariates 			 → SS_res_reduced
 *      → SS_factor (adjusted) = SS_res_reduced − SS_res_full
 *   5. 對每個 covariate j 重做一次 Y ~ dummies + (covariates 去除 j)，
 *      其 SS_res − SS_res_full = SS_covariate_j
 *   6. 調整平均（least-squares means）：
 *      將所有 covariate 取 grand mean 代入完整迴歸方程式，
 *      每個層級分別預測得到 adjusted mean；
 *      SE 由 c'(X'X)⁻¹c · MSE 取根號計算。
 *   7. 斜率同質性：再加入 factor × covariate 的交互項，
 *      檢定交互項整體 F（< .05 → 違反假設）。
 *
 * 內部復用 / Reuse:
 *   multipleRegression()，避免自寫 OLS。
 */
import { isMissing } from '../variableTypes.js'
import { mean as meanOf } from './descriptive.js'
import { transpose, matmul, matvec, inverse } from './matrix.js'
import { pF } from './pvalue.js'

/** 在 X 加入截距欄 / Augment X with an intercept column */
function augment(X) {
  return X.map((row) => [1, ...row])
}

/**
 * 用 X、y 直接跑 OLS，回傳 ssRes 與 beta；
 * 與 multipleRegression 相比省掉所有衍生統計，給內部使用。
 * Internal helper: just fit OLS and return SS_res and beta.
 */
function olsResidualSS(X, y) {
  const n = X.length
  const Xa = augment(X)
  const Xt = transpose(Xa)
  const XtX = matmul(Xt, Xa)
  const XtXinv = inverse(XtX)
  if (!XtXinv) return { error: 'singular-matrix' }
  const Xty = matvec(Xt, y)
  const beta = matvec(XtXinv, Xty)
  const fitted = matvec(Xa, beta)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const e = y[i] - fitted[i]
    ssRes += e * e
  }
  return { ssRes, beta, XtXinv, fitted, n }
}

export function ancova(rows, yVar, factorVar, covariateVars) {
  if (!yVar) return { error: 'pickDep' }
  if (!factorVar) return { error: 'pickFactor' }
  if (!covariateVars || covariateVars.length < 1) return { error: 'pickCov' }
  if (covariateVars.includes(yVar)) return { error: 'covIsY' }
  if (covariateVars.includes(factorVar)) return { error: 'covIsFactor' }

  // 1. Listwise deletion / 任一缺值即剔除
  const cleaned = []
  for (const r of rows) {
    const yv = r[yVar]
    const fv = r[factorVar]
    if (isMissing(yv) || isMissing(fv)) continue
    const yn = Number(yv)
    if (!Number.isFinite(yn)) continue
    let bad = false
    const cov = []
    for (const c of covariateVars) {
      const cv = r[c]
      if (isMissing(cv)) { bad = true; break }
      const cn = Number(cv)
      if (!Number.isFinite(cn)) { bad = true; break }
      cov.push(cn)
    }
    if (bad) continue
    cleaned.push({ y: yn, factor: String(fv), cov })
  }

  const N = cleaned.length
  if (N < 4) return { error: 'tooFewN' }

  // 各層級 / Distinct factor levels
  const levels = []
  const seen = new Set()
  for (const r of cleaned) {
    if (!seen.has(r.factor)) { seen.add(r.factor); levels.push(r.factor) }
  }
  const k = levels.length
  if (k < 2) return { error: 'factorBadGroups', meta: { k } }

  const p = covariateVars.length

  // 2. 建構設計矩陣 / Build design matrix
  // 欄順序 / column order: [dummy_1, ..., dummy_{k-1}, cov_1, ..., cov_p]
  // dummy 採第一個層級為 reference / first level is reference category
  const dummyCount = k - 1
  const dummyNames = []
  for (let g = 1; g < k; g++) dummyNames.push(`__d_${levels[g]}`)
  const covOnlyX = []
  const fullX = []
  const y = []
  for (const r of cleaned) {
    const dummies = new Array(dummyCount).fill(0)
    const idx = levels.indexOf(r.factor)
    if (idx > 0) dummies[idx - 1] = 1
    fullX.push([...dummies, ...r.cov])
    covOnlyX.push([...r.cov])
    y.push(r.y)
  }

  // 3. Full model
  const full = olsResidualSS(fullX, y)
  if (full.error) return { error: full.error }

  // 4. Reduced model（只用共變項）
  const reduced = olsResidualSS(covOnlyX, y)
  if (reduced.error) return { error: reduced.error }

  const ssError = full.ssRes
  const dfError = N - k - p
  if (dfError <= 0) return { error: 'tooFewN' }
  const msError = ssError / dfError

  // SS_factor (Type-III, 即 partial)
  const ssFactor = reduced.ssRes - full.ssRes
  const dfFactor = k - 1
  const msFactor = dfFactor > 0 ? ssFactor / dfFactor : NaN
  const fFactor = msError > 0 ? msFactor / msError : Infinity
  const pFactor = pF(fFactor, dfFactor, dfError)

  // SS_total = Σ(y_i − ȳ)²
  const yMean = meanOf(y)
  let ssTotal = 0
  for (const v of y) ssTotal += (v - yMean) * (v - yMean)
  const dfTotal = N - 1

  // 5. 各 covariate 的 partial SS
  const covariates = []
  for (let j = 0; j < p; j++) {
    // 拿掉第 j 欄共變項 → 但保留 dummies
    const reducedJ = []
    for (const row of fullX) {
      const r2 = row.slice()
      r2.splice(dummyCount + j, 1)
      reducedJ.push(r2)
    }
    const fitJ = olsResidualSS(reducedJ, y)
    if (fitJ.error) {
      covariates.push({
        name: covariateVars[j], ss: NaN, df: 1, ms: NaN, f: NaN, p: NaN, partialEta2: NaN,
      })
      continue
    }
    const ssJ = fitJ.ssRes - full.ssRes
    const dfJ = 1
    const msJ = ssJ / dfJ
    const fJ = msError > 0 ? msJ / msError : Infinity
    const pJ = pF(fJ, dfJ, dfError)
    const partialEta2 = (ssJ + ssError) > 0 ? ssJ / (ssJ + ssError) : NaN
    covariates.push({
      name: covariateVars[j], ss: ssJ, df: dfJ, ms: msJ, f: fJ, p: pJ, partialEta2,
    })
  }

  // partial η² for factor
  const partialEta2Factor = (ssFactor + ssError) > 0 ? ssFactor / (ssFactor + ssError) : NaN

  // 6. Adjusted (LS) means / 調整後平均
  // 將共變項代入 grand mean，逐層級計算預測值
  const covMeans = []
  for (let j = 0; j < p; j++) {
    let s = 0
    for (const r of cleaned) s += r.cov[j]
    covMeans.push(s / N)
  }
  // β = full.beta 的順序是 [intercept, dummy_1..k-1, cov_1..p]
  const beta = full.beta
  const XtXinv = full.XtXinv
  const adjustedMeans = []
  // tCrit for 95% CI（用 t 近似不額外算 qt → 用 1.96 並非嚴謹；改用 normal approx）
  // 此處使用 t 分布的對稱右尾 0.025 近似：以正態 1.96 作為通用值（與 multReg 既有風格一致）
  const tCrit = 1.96
  for (let g = 0; g < k; g++) {
    // c 向量：[1, dummy_1..k-1, cov_means]
    const c = new Array(1 + dummyCount + p).fill(0)
    c[0] = 1
    if (g > 0) c[g] = 1
    for (let j = 0; j < p; j++) c[1 + dummyCount + j] = covMeans[j]
    // mean = c · β
    let mAdj = 0
    for (let i = 0; i < c.length; i++) mAdj += c[i] * beta[i]
    // var = c' (X'X)^-1 c · MSE
    let v = 0
    for (let a = 0; a < c.length; a++) {
      let row = 0
      for (let b = 0; b < c.length; b++) row += XtXinv[a][b] * c[b]
      v += c[a] * row
    }
    const seAdj = Math.sqrt(Math.max(0, v) * msError)
    adjustedMeans.push({
      level: levels[g],
      mean: mAdj,
      se: seAdj,
      ciLow: mAdj - tCrit * seAdj,
      ciHigh: mAdj + tCrit * seAdj,
    })
  }

  // 原始（未調整）平均 / Raw means
  const rawMeans = levels.map((lv) => {
    const vs = cleaned.filter((r) => r.factor === lv).map((r) => r.y)
    return { level: lv, mean: meanOf(vs), n: vs.length }
  })

  // 7. 斜率同質性檢定 / Homogeneity-of-regression-slopes test
  // 完整模型再加入 factor×covariate 的交互項
  // 交互項數 = (k − 1) × p
  let homogeneityTest = { f: NaN, dfNum: NaN, dfDen: NaN, p: NaN }
  const interactCount = dummyCount * p
  if (interactCount > 0 && N - k - p - interactCount > 0) {
    const homoX = []
    for (let i = 0; i < cleaned.length; i++) {
      const r = cleaned[i]
      const dummies = new Array(dummyCount).fill(0)
      const idx = levels.indexOf(r.factor)
      if (idx > 0) dummies[idx - 1] = 1
      const interacts = []
      for (let d = 0; d < dummyCount; d++) {
        for (let j = 0; j < p; j++) interacts.push(dummies[d] * r.cov[j])
      }
      homoX.push([...dummies, ...r.cov, ...interacts])
    }
    const homoFit = olsResidualSS(homoX, y)
    if (!homoFit.error) {
      const ssRes_homo = homoFit.ssRes
      const dfRes_homo = N - k - p - interactCount
      // 比較：full（無交互） vs full+interaction
      // F = ((ssRes_full − ssRes_homo) / interactCount) / (ssRes_homo / dfRes_homo)
      const num = (full.ssRes - ssRes_homo) / interactCount
      const den = ssRes_homo / dfRes_homo
      const fH = den > 0 ? num / den : Infinity
      const pH = pF(fH, interactCount, dfRes_homo)
      homogeneityTest = { f: fH, dfNum: interactCount, dfDen: dfRes_homo, p: pH }
    }
  }

  return {
    n: N,
    k,
    levels,
    factor: {
      ss: ssFactor, df: dfFactor, ms: msFactor,
      f: fFactor, p: pFactor, partialEta2: partialEta2Factor,
    },
    covariates,
    errorTerm: { ss: ssError, df: dfError, ms: msError },
    total: { ss: ssTotal, df: dfTotal },
    adjustedMeans,
    rawMeans,
    homogeneityTest,
    mseFull: full.ssRes / dfError,
    mseReduced: reduced.ssRes / (N - p - 1),
  }
}
