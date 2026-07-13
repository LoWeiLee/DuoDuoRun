/**
 * 雙因子變異數分析（Two-way ANOVA）— Type III SS
 *
 * 演算法：效果編碼（effect coding，−1/0/1）+ OLS。對平衡與不平衡資料皆適用。
 *
 * 設計矩陣欄位：
 *   1（截距）│ nA−1（A 主效果） │ nB−1（B 主效果） │ (nA−1)(nB−1)（交互作用）
 *
 * Type III SS：對每個效果 E，
 *   SS_E = ESS(model 不含 E) − ESS(full model)
 *
 * 對外 API：
 *   twoWayANOVA(rows, depVar, factorA, factorB)
 *   → {
 *       n, levelsA, levelsB,
 *       cellMeans: { [a]: { [b]: { mean, n, sd } } },
 *       marginalA: { [a]: { mean, n } },
 *       marginalB: { [b]: { mean, n } },
 *       grandMean,
 *       effectA, effectB, effectAB, errorTerm, total,  // 各 SS / df / MS / F / p / partialEta2
 *       （errorTerm ＝ 誤差／殘差項，不是「錯誤」；error 一律保留給字串錯誤碼，
 *         2026-07-13 紅隊 R5 改名，原本的撞名讓 Result.jsx 永遠走進錯誤分支）
 *     }
 */
import { isMissing } from '../variableTypes.js'
import { mean, sd } from './descriptive.js'
import { pF } from './pvalue.js'
import { transpose, matmul, matvec, inverse } from './matrix.js'

/**
 * 效果編碼：對 k 個 levels，第 idx 個 level（idx 從 0 開始）轉成 k−1 維向量。
 *   - idx ∈ [0, k−2]：第 idx 維為 1，其餘為 0
 *   - idx === k−1：所有維度為 −1（reference 組）
 */
function effectCode(idx, k) {
  const v = new Array(k - 1).fill(0)
  if (idx === k - 1) {
    for (let i = 0; i < k - 1; i++) v[i] = -1
  } else if (idx >= 0 && idx < k - 1) {
    v[idx] = 1
  }
  return v
}

/** 在設計矩陣 X 中刪掉指定欄位（用於計算 reduced model） */
function dropCols(X, indices) {
  const set = new Set(indices)
  return X.map((row) => row.filter((_, i) => !set.has(i)))
}

/** 解 OLS 並回傳 ESS（殘差平方和） */
function essOf(X, y) {
  const Xt = transpose(X)
  const XtX = matmul(Xt, X)
  const XtXinv = inverse(XtX)
  if (!XtXinv) return null
  const Xty = matvec(Xt, y)
  const beta = matvec(XtXinv, Xty)
  const yhat = matvec(X, beta)
  let ess = 0
  for (let i = 0; i < y.length; i++) {
    const e = y[i] - yhat[i]
    ess += e * e
  }
  return ess
}

export function twoWayANOVA(rows, depVar, factorA, factorB) {
  // ── 1. 收集 levels（保留出現順序）
  const setA = new Set()
  const setB = new Set()
  const levelsA = []
  const levelsB = []
  const validRows = []
  for (const r of rows) {
    const y = r[depVar]
    const a = r[factorA]
    const b = r[factorB]
    if (isMissing(y) || isMissing(a) || isMissing(b)) continue
    const yn = Number(y)
    if (!Number.isFinite(yn)) continue
    const aKey = String(a)
    const bKey = String(b)
    if (!setA.has(aKey)) { setA.add(aKey); levelsA.push(aKey) }
    if (!setB.has(bKey)) { setB.add(bKey); levelsB.push(bKey) }
    validRows.push({ y: yn, a: aKey, b: bKey })
  }
  const nA = levelsA.length
  const nB = levelsB.length
  if (nA < 2) return { error: 'factorA-needs->=2-levels' }
  if (nB < 2) return { error: 'factorB-needs->=2-levels' }
  const N = validRows.length
  if (N < nA * nB + 2) return { error: 'need-more-data' }

  const aIndex = (k) => levelsA.indexOf(k)
  const bIndex = (k) => levelsB.indexOf(k)

  // ── 2. 計算 cell means + marginal means
  const cellAcc = {}  // { [a]: { [b]: number[] } }
  for (const a of levelsA) {
    cellAcc[a] = {}
    for (const b of levelsB) cellAcc[a][b] = []
  }
  const aValues = {}
  const bValues = {}
  for (const a of levelsA) aValues[a] = []
  for (const b of levelsB) bValues[b] = []
  const allValues = []
  for (const r of validRows) {
    cellAcc[r.a][r.b].push(r.y)
    aValues[r.a].push(r.y)
    bValues[r.b].push(r.y)
    allValues.push(r.y)
  }
  const cellMeans = {}
  for (const a of levelsA) {
    cellMeans[a] = {}
    for (const b of levelsB) {
      const arr = cellAcc[a][b]
      cellMeans[a][b] = arr.length > 0
        ? { mean: mean(arr), n: arr.length, sd: arr.length > 1 ? sd(arr) : NaN }
        : { mean: NaN, n: 0, sd: NaN }
    }
  }
  const marginalA = {}
  for (const a of levelsA) marginalA[a] = { mean: mean(aValues[a]), n: aValues[a].length }
  const marginalB = {}
  for (const b of levelsB) marginalB[b] = { mean: mean(bValues[b]), n: bValues[b].length }
  const grandMean = mean(allValues)

  // ── 3. 設計矩陣（effect coding）
  const aCols = nA - 1
  const bCols = nB - 1
  const abCols = aCols * bCols

  const X = []
  const y = []
  for (const r of validRows) {
    const ac = effectCode(aIndex(r.a), nA)
    const bc = effectCode(bIndex(r.b), nB)
    const row = [1]
    for (const v of ac) row.push(v)
    for (const v of bc) row.push(v)
    for (const va of ac) {
      for (const vb of bc) row.push(va * vb)
    }
    X.push(row)
    y.push(r.y)
  }

  // 欄位範圍
  const aRange = []
  for (let i = 1; i <= aCols; i++) aRange.push(i)
  const bRange = []
  for (let i = aCols + 1; i <= aCols + bCols; i++) bRange.push(i)
  const abRange = []
  for (let i = aCols + bCols + 1; i <= aCols + bCols + abCols; i++) abRange.push(i)

  // ── 4. ESS for full model 與三個 reduced models
  const essFull = essOf(X, y)
  if (essFull === null) return { error: 'singular-matrix' }
  const essNoA = essOf(dropCols(X, aRange), y)
  const essNoB = essOf(dropCols(X, bRange), y)
  const essNoAB = essOf(dropCols(X, abRange), y)
  if (essNoA === null || essNoB === null || essNoAB === null) {
    return { error: 'singular-reduced-model' }
  }

  // ── 5. SS / df / MS / F / p
  const dfA = aCols
  const dfB = bCols
  const dfAB = abCols
  const dfError = N - (1 + aCols + bCols + abCols) // = N - nA*nB
  const dfTotal = N - 1
  const ssA = essNoA - essFull
  const ssB = essNoB - essFull
  const ssAB = essNoAB - essFull
  const ssError = essFull
  // SS_total = Σ(y - grandMean)²
  let ssTotal = 0
  for (const v of y) ssTotal += (v - grandMean) * (v - grandMean)
  const msError = ssError / dfError
  const msA = ssA / dfA
  const msB = ssB / dfB
  const msAB = ssAB / dfAB
  const fA = msA / msError
  const fB = msB / msError
  const fAB = msAB / msError
  const pA = pF(fA, dfA, dfError)
  const pB = pF(fB, dfB, dfError)
  const pAB = pF(fAB, dfAB, dfError)

  // partial η² = SS_effect / (SS_effect + SS_error)
  const peA = ssA / (ssA + ssError)
  const peB = ssB / (ssB + ssError)
  const peAB = ssAB / (ssAB + ssError)

  return {
    n: N,
    levelsA, levelsB, nA, nB,
    cellMeans,
    marginalA, marginalB,
    grandMean,
    effectA:  { ss: ssA,  df: dfA,  ms: msA,  F: fA,  p: pA,  partialEta2: peA },
    effectB:  { ss: ssB,  df: dfB,  ms: msB,  F: fB,  p: pB,  partialEta2: peB },
    effectAB: { ss: ssAB, df: dfAB, ms: msAB, F: fAB, p: pAB, partialEta2: peAB },
    errorTerm: { ss: ssError, df: dfError, ms: msError },
    total:    { ss: ssTotal, df: dfTotal },
  }
}
