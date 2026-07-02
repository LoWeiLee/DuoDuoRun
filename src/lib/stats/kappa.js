/**
 * Cohen's Kappa（評分者一致性 / inter-rater agreement）
 *
 * 對外 API：
 *   cohenKappa(rows, rater1Var, rater2Var, weighting)
 *     weighting ∈ { 'none', 'linear', 'quadratic' }
 *
 * 流程 / Pipeline：
 *   1. 從兩個類別變數蒐集共同層級（intersect levels），僅納入兩位 rater 都出現過的類別。
 *      Collect the intersection of levels appearing in both raters; only matched levels are kept.
 *   2. 建立 kxk 方形列聯表（k = 共同層級數）。 Build a kxk square table.
 *   3. 計算：
 *        Po = Σ diagonal / N
 *        Pe = Σ_i (row_i / N) × (col_i / N)
 *        κ  = (Po − Pe) / (1 − Pe)
 *      加權 κ：
 *        linear     w_ij = 1 − |i − j| / (k − 1)
 *        quadratic  w_ij = 1 − ((i − j) / (k − 1))²
 *        Po_w = Σ w_ij × p_ij，  Pe_w = Σ w_ij × (row_i/N)(col_j/N)
 *        κ_w  = (Po_w − Pe_w) / (1 − Pe_w)
 *   4. 變異數：
 *        Var(κ|H0) = Pe / (N × (1 − Pe))           — 用於 z 與雙尾 p
 *        Var(κ)    = Po(1 − Po) / (N × (1 − Pe)²)  — 用於 95% CI（asymptotic SE）
 *      z = κ / √Var(κ|H0)； 雙尾 p = 2(1 − Φ(|z|))
 *      95% CI = κ ± 1.96 × √Var(κ)
 *
 *   注意：加權 κ 的 H0 變異數採同樣的「Pe / (N(1 − Pe))」近似（簡化形式），
 *         CI 採 Po(1 − Po) / (N(1 − Pe)²) 的 asymptotic 形式。
 *         這在多數教學工具中為常見做法；嚴格的 Fleiss-Cohen-Everitt 公式較複雜，
 *         本工具以教學/初步報告為定位，提供方向性正確的近似。
 *
 * Landis & Koch (1977) 解讀標準：
 *   κ < 0      poor       極差
 *   0.0–0.2    slight     微弱
 *   0.2–0.4    fair       尚可
 *   0.4–0.6    moderate   中度
 *   0.6–0.8    substantial 良好
 *   0.8–1.0    almost perfect 幾近完美
 */
import { isMissing } from '../variableTypes.js'
import { normalCdf } from './pvalue.js'

function twoSidedZP(z) {
  if (!Number.isFinite(z)) return NaN
  return 2 * (1 - normalCdf(Math.abs(z)))
}

/**
 * 建立加權矩陣 / Build weight matrix
 * @param {number} k size of square table
 * @param {string} weighting 'none' | 'linear' | 'quadratic'
 */
function buildWeights(k, weighting) {
  const W = []
  for (let i = 0; i < k; i++) {
    const row = new Array(k)
    for (let j = 0; j < k; j++) {
      if (weighting === 'linear') {
        row[j] = k > 1 ? 1 - Math.abs(i - j) / (k - 1) : 1
      } else if (weighting === 'quadratic') {
        const d = k > 1 ? (i - j) / (k - 1) : 0
        row[j] = 1 - d * d
      } else {
        // 'none' — 對角為 1，其餘為 0（相當於 unweighted）
        row[j] = i === j ? 1 : 0
      }
    }
    W.push(row)
  }
  return W
}

/**
 * Cohen's Kappa
 * @param {object[]} rows 資料列
 * @param {string} rater1Var 第一位評分者欄位
 * @param {string} rater2Var 第二位評分者欄位
 * @param {'none'|'linear'|'quadratic'} weighting 加權方式
 */
export function cohenKappa(rows, rater1Var, rater2Var, weighting = 'none') {
  if (!rater1Var) return { error: 'pickRater1' }
  if (!rater2Var) return { error: 'pickRater2' }
  if (rater1Var === rater2Var) return { error: 'sameVar' }
  const w = ['none', 'linear', 'quadratic'].includes(weighting) ? weighting : 'none'

  // Step 1: 蒐集兩位評分者出現過的所有層級（聯集），並依自然序排序。
  // Collect the UNION of levels from both raters, sorted in natural (ordinal) order.
  //
  // 修正（2026-07-02 驗證發現）：
  //   (a) 原實作取「交集 + rater1 出現順序」。加權 κ 的權重 w_ij 取決於層級的
  //       序位距離 |i−j|，層級順序若非量尺自然順序，權重矩陣整個錯位——
  //       linear/quadratic κ 會嚴重偏離 SPSS / sklearn（實測偏低 0.14–0.22）。
  //   (b) 交集會默默剔除「僅單一評分者使用過的層級」及其觀察值；
  //       SPSS crosstabs 與 sklearn 均以聯集建方形表，觀察值不應流失。
  const levelSet = new Set()
  for (const r of rows) {
    const v1 = r[rater1Var]
    const v2 = r[rater2Var]
    if (isMissing(v1) || isMissing(v2)) continue
    levelSet.add(String(v1))
    levelSet.add(String(v2))
  }
  const levels = [...levelSet]
  const allNumeric = levels.every((lv) => lv !== '' && Number.isFinite(Number(lv)))
  levels.sort(allNumeric
    ? (a, b) => Number(a) - Number(b)
    : (a, b) => a.localeCompare(b))
  const k = levels.length
  if (k < 2) return { error: 'needTwoLevels' }

  // Step 2: 建立 kxk 列聯表（僅納入兩 rater 皆屬於 levels 的觀察值）
  // Build kxk contingency table over matched levels
  const idx = new Map(levels.map((lv, i) => [lv, i]))
  const table = Array.from({ length: k }, () => new Array(k).fill(0))
  let n = 0
  for (const r of rows) {
    const v1 = r[rater1Var]
    const v2 = r[rater2Var]
    if (isMissing(v1) || isMissing(v2)) continue
    const i = idx.get(String(v1))
    const j = idx.get(String(v2))
    if (i === undefined || j === undefined) continue
    table[i][j] += 1
    n += 1
  }
  if (n === 0) return { error: 'noData' }

  // Step 3: row/col 邊際與比例
  const rowTotals = new Array(k).fill(0)
  const colTotals = new Array(k).fill(0)
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      rowTotals[i] += table[i][j]
      colTotals[j] += table[i][j]
    }
  }

  // Step 4: 用加權矩陣計算 Po、Pe、κ
  const W = buildWeights(k, w)
  let po = 0
  let pe = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const pij = table[i][j] / n
      const piMarg = rowTotals[i] / n
      const pjMarg = colTotals[j] / n
      po += W[i][j] * pij
      pe += W[i][j] * piMarg * pjMarg
    }
  }

  if (Math.abs(1 - pe) < 1e-12) {
    // 邊際完全一致或單一類別 → κ 不可定義
    return {
      table, levels, n, po, pe,
      kappa: NaN, seKappa: NaN, ciLow: NaN, ciHigh: NaN,
      varH0: NaN, z: NaN, p: NaN,
      weighting: w,
      error: 'undefinedKappa',
    }
  }

  const kappa = (po - pe) / (1 - pe)

  // H0 變異數（簡化近似）→ z, p
  const varH0 = pe / (n * (1 - pe))
  const seH0 = Math.sqrt(varH0)
  const z = seH0 > 0 ? kappa / seH0 : NaN
  const p = twoSidedZP(z)

  // 95% CI 用 asymptotic SE
  const varCI = (po * (1 - po)) / (n * (1 - pe) * (1 - pe))
  const seKappa = Math.sqrt(varCI)
  const zc = 1.959963984540054
  const ciLow = kappa - zc * seKappa
  const ciHigh = kappa + zc * seKappa

  return {
    table, levels, rowTotals, colTotals,
    n, po, pe,
    kappa, seKappa, ciLow, ciHigh,
    varH0, z, p,
    weighting: w,
  }
}
