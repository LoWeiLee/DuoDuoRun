/**
 * Cronbach's α 內部一致性信度
 *
 * 對外 API：
 *   cronbachAlpha(rows, columns) → 完整結果
 *
 * 公式（Cronbach 1951）：
 *
 *   α = (k / (k-1)) · (1 - Σσ²_i / σ²_t)
 *
 *   k    — 量表題數
 *   σ²_i — 第 i 題的變異數
 *   σ²_t — 總分（各題加總）的變異數
 *
 * 進階指標（每項一筆）：
 *   - 項目敘述：n / M / SD
 *   - 校正項目-總分相關（corrected item-total correlation）：
 *     r 介於該項目分數與「總分減去該項目」的相關。
 *     建議標準 ≥ 0.30；過低代表該項與其他項共同測量內容相關性低。
 *   - 刪題後 α：移除該項目後重新計算 α。
 *     若該項刪除後 α 上升明顯，代表該項可能損害一致性。
 *
 * 處理遺漏值：listwise deletion — 任一欄缺值即剔除整列（與 SPSS 預設一致）。
 *
 * 對標 SPSS / JASP 預設輸出。
 */
import { variance, sd, mean } from './descriptive.js'
import { pearsonCorr } from './correlation.js'
import { isMissing } from '../variableTypes.js'

function alphaFrom(items, k) {
  const totals = items[0].map((_, idx) =>
    items.reduce((sum, item) => sum + item[idx], 0)
  )
  const sumItemVar = items.reduce((s, item) => s + variance(item), 0)
  const totalVar = variance(totals)
  if (totalVar === 0) return NaN
  return (k / (k - 1)) * (1 - sumItemVar / totalVar)
}

export function cronbachAlpha(rows, columns) {
  const k = columns.length
  if (k < 2) return { error: 'need->=2-items' }

  // Listwise deletion：任一題缺值即剔除
  const filtered = rows.filter((r) =>
    columns.every((c) => {
      const v = r[c]
      if (isMissing(v)) return false
      return Number.isFinite(Number(v))
    })
  )
  const n = filtered.length
  const droppedRows = rows.length - n

  if (n < 3) return { error: 'need->=3-cases', meta: { n } }

  // 整理為各題的 1D 數值陣列
  const items = columns.map((c) => filtered.map((r) => Number(r[c])))
  const totals = filtered.map((_, idx) =>
    items.reduce((sum, item) => sum + item[idx], 0)
  )

  const sumItemVar = items.reduce((s, item) => s + variance(item), 0)
  const totalVar = variance(totals)
  // 邊界：總分變異 = 0（所有受訪者各題完全相同分數，例如全班同分）
  if (totalVar === 0) {
    return {
      error: 'zero-total-variance',
      meta: { n, k },
    }
  }
  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar)

  // 每項統計
  const itemStats = columns.map((col, i) => {
    const item = items[i]
    const itemMean = mean(item)
    const itemSd = sd(item)

    // 校正項目-總分相關：item vs (total - item)
    const totalMinusItem = totals.map((t, idx) => t - item[idx])
    const itc = pearsonCorr(item, totalMinusItem).r

    // 刪題後 α
    let alphaIfDeleted = NaN
    if (k > 2) {
      const otherItems = items.filter((_, j) => j !== i)
      alphaIfDeleted = alphaFrom(otherItems, k - 1)
    }

    return {
      col,
      n,
      mean: itemMean,
      sd: itemSd,
      itemTotalCorr: itc,
      alphaIfDeleted,
    }
  })

  // 平均項間相關（從相關矩陣對角線外取平均）
  let interItemSum = 0
  let interItemCount = 0
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const r = pearsonCorr(items[i], items[j]).r
      if (Number.isFinite(r)) {
        interItemSum += r
        interItemCount++
      }
    }
  }
  const meanInterItemCorr =
    interItemCount > 0 ? interItemSum / interItemCount : NaN

  return {
    alpha,
    n,
    k,
    droppedRows,
    sumItemVariance: sumItemVar,
    totalVariance: totalVar,
    meanInterItemCorr,
    itemStats,
  }
}

/** α 解讀（DeVellis 2017 / Nunnally 1978 慣例） */
export function alphaInterpretationKey(alpha) {
  if (!Number.isFinite(alpha)) return null
  if (alpha < 0) return 'unacceptable' // 負 α 通常表示反向計分未處理或無一致性
  if (alpha < 0.5) return 'unacceptable'
  if (alpha < 0.6) return 'poor'
  if (alpha < 0.7) return 'questionable'
  if (alpha < 0.8) return 'acceptable'
  if (alpha < 0.9) return 'good'
  return 'excellent'
}
