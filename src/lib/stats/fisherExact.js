/**
 * Fisher 精確檢定（2×2）
 *
 * 對外 API：
 *   fisherExact(rows, rowVar, colVar, successRow, successCol)
 *     → {
 *         a, b, c, d,                  // 2×2 觀察次數
 *         n,                            // 總和
 *         p,                            // 雙尾 exact p-value
 *         or, lnOr, seLnOr,             // 勝算比與 ln(OR) 標準誤
 *         orCiLow, orCiHigh,            // 95% Woolf CI（log-scale）
 *         rowLevels, colLevels,         // 實際分析的兩列、兩欄類別名
 *         haldaneApplied,               // 是否套用 +0.5 修正
 *         tooManyRowLevels, tooManyColLevels  // 超過兩類別時的提示
 *       }
 *
 * 計算邏輯：
 *   - 從 rowVar 與 colVar 中各取「前兩個出現的類別」當分析的 row/col。
 *     若實際多於兩類，回傳 flag（UI 顯示警告）。
 *   - successRow / successCol 指定哪一列、哪一欄為「成功」事件，
 *     用來決定 a 格位置：a = (rowVar=successRow) ∧ (colVar=successCol)。
 *   - 雙尾 exact p：固定邊際次數下，列舉所有可能的 a 值，
 *     將機率不大於觀察表機率（在某 EPS 容忍度下）者全加總。
 *   - 機率以 lgamma 計算（避免階乘溢位）：
 *       P(a) = C(R1, a) · C(R2, K - a) / C(N, K)
 *       其中 R1 = a+b, R2 = c+d, K = a+c, N = a+b+c+d
 *     在 log-scale：
 *       lnP = lnC(R1, a) + lnC(R2, K-a) − lnC(N, K)
 *       lnC(n, k) = lgamma(n+1) − lgamma(k+1) − lgamma(n-k+1)
 *   - 勝算比 OR = (a·d) / (b·c)；
 *     若任一格為 0，套用 Haldane 修正（+0.5 全格）後再計 OR 與 ln(OR) 的 SE。
 *     SE(ln OR) = √(1/a + 1/b + 1/c + 1/d)
 *     95% CI = exp(ln OR ± 1.96·SE)
 */
import { isMissing } from '../variableTypes.js'
import { lgamma } from './pvalue.js'

function lnChoose(n, k) {
  if (k < 0 || k > n) return -Infinity
  if (k === 0 || k === n) return 0
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
}

/** 給定 a，計算 P(table | 邊際) 的對數機率 */
function lnHyperProb(a, R1, R2, K, N) {
  // P = C(R1, a) * C(R2, K - a) / C(N, K)
  const lnNum = lnChoose(R1, a) + lnChoose(R2, K - a)
  const lnDen = lnChoose(N, K)
  return lnNum - lnDen
}

export function fisherExact(rows, rowVar, colVar, successRow, successCol) {
  if (!rowVar) return { error: 'pickRowVar' }
  if (!colVar) return { error: 'pickColVar' }
  if (rowVar === colVar) return { error: 'sameVar' }
  if (successRow === null || successRow === undefined || successRow === '') {
    return { error: 'pickSuccessRow' }
  }
  if (successCol === null || successCol === undefined || successCol === '') {
    return { error: 'pickSuccessCol' }
  }

  // 蒐集 rowVar / colVar 的出現類別（保留出現順序）
  const rowLevelsAll = []
  const colLevelsAll = []
  const rowSet = new Set()
  const colSet = new Set()
  for (const r of rows) {
    const rv = r[rowVar]
    const cv = r[colVar]
    if (isMissing(rv) || isMissing(cv)) continue
    const rk = String(rv)
    const ck = String(cv)
    if (!rowSet.has(rk)) { rowSet.add(rk); rowLevelsAll.push(rk) }
    if (!colSet.has(ck)) { colSet.add(ck); colLevelsAll.push(ck) }
  }
  if (rowLevelsAll.length < 2) return { error: 'needTwoRowLevels' }
  if (colLevelsAll.length < 2) return { error: 'needTwoColLevels' }

  const successRowKey = String(successRow)
  const successColKey = String(successCol)

  // 確認 successRow / successCol 確實存在於資料中
  if (!rowSet.has(successRowKey)) return { error: 'pickSuccessRow' }
  if (!colSet.has(successColKey)) return { error: 'pickSuccessCol' }

  // 取「成功」與「失敗」的兩列、兩欄；
  // 失敗類別 = 第一個非成功的類別（pickPair 內部自行從 allLevels 挑，
  // 不需預先切出 top2——2026-07-13 紅隊清理掉未使用的中間變數）
  const pickPair = (allLevels, successKey) => {
    const others = allLevels.filter(l => l !== successKey)
    if (others.length === 0) return null
    return [successKey, others[0]]
  }
  const rowPair = pickPair(rowLevelsAll, successRowKey)
  const colPair = pickPair(colLevelsAll, successColKey)
  if (!rowPair) return { error: 'needTwoRowLevels' }
  if (!colPair) return { error: 'needTwoColLevels' }

  // 計算 2×2：a = (row=success ∧ col=success)，依此類推
  let a = 0, b = 0, c = 0, d = 0
  for (const r of rows) {
    const rv = r[rowVar]
    const cv = r[colVar]
    if (isMissing(rv) || isMissing(cv)) continue
    const rk = String(rv)
    const ck = String(cv)
    // 僅納入兩列、兩欄內的觀察
    if (rk !== rowPair[0] && rk !== rowPair[1]) continue
    if (ck !== colPair[0] && ck !== colPair[1]) continue
    const isSuccessRow = rk === rowPair[0]
    const isSuccessCol = ck === colPair[0]
    if (isSuccessRow && isSuccessCol) a += 1
    else if (isSuccessRow && !isSuccessCol) b += 1
    else if (!isSuccessRow && isSuccessCol) c += 1
    else d += 1
  }
  const n = a + b + c + d
  if (n === 0) return { error: 'noData' }

  // 邊際
  const R1 = a + b
  const R2 = c + d
  const K = a + c

  // 觀察表機率 → 雙尾 p：列舉所有合法 a' 值
  const lnPobs = lnHyperProb(a, R1, R2, K, n)
  const aMin = Math.max(0, K - R2)
  const aMax = Math.min(R1, K)
  const EPS_LN = 1e-9 // 對數空間的 tie tolerance（對應約 1e-9 的相對誤差）
  let pSum = 0
  for (let aa = aMin; aa <= aMax; aa++) {
    const lnPi = lnHyperProb(aa, R1, R2, K, n)
    if (lnPi <= lnPobs + EPS_LN) pSum += Math.exp(lnPi)
  }
  // 數值安全：p 必落於 (0, 1]
  let p = pSum
  if (!Number.isFinite(p) || p < 0) p = 0
  if (p > 1) p = 1

  // 勝算比 + Woolf CI（必要時 Haldane +0.5）
  const anyZero = a === 0 || b === 0 || c === 0 || d === 0
  const a2 = anyZero ? a + 0.5 : a
  const b2 = anyZero ? b + 0.5 : b
  const c2 = anyZero ? c + 0.5 : c
  const d2 = anyZero ? d + 0.5 : d
  const or = (a2 * d2) / (b2 * c2)
  const lnOr = Math.log(or)
  const seLnOr = Math.sqrt(1 / a2 + 1 / b2 + 1 / c2 + 1 / d2)
  const zc = 1.959963984540054
  const orCiLow = Math.exp(lnOr - zc * seLnOr)
  const orCiHigh = Math.exp(lnOr + zc * seLnOr)

  return {
    a, b, c, d, n,
    p,
    or, lnOr, seLnOr,
    orCiLow, orCiHigh,
    rowLevels: rowPair,            // [success, fail]
    colLevels: colPair,            // [success, fail]
    successRow: successRowKey,
    successCol: successColKey,
    haldaneApplied: anyZero,
    tooManyRowLevels: rowLevelsAll.length > 2,
    tooManyColLevels: colLevelsAll.length > 2,
    rowLevelsAll,
    colLevelsAll,
  }
}
