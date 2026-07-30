/**
 * 敘述統計：把資料列 + 選定欄位轉成計算結果。
 *
 * 處理遺漏值：每欄獨立 listwise（過濾掉該欄為 missing 的列），
 * 不做整列 listwise（跨欄 listwise 會在 Step 4 變成可選 mode）。
 */
import { describe } from '../../lib/stats/descriptive'
import { isMissing } from '../../lib/variableTypes'

/**
 * @param {Array<object>} rows  資料列
 * @param {string[]} columns    要分析的欄位
 * @returns {Array<{ col, n, mean, sd, se, min, max, median, skewness, kurtosis }>}
 */
export function runDescriptive(rows, columns) {
  return columns.map((col) => {
    const values = rows
      .map((r) => r[col])
      .filter((v) => !isMissing(v))
      .map(Number)
      // ★ 2026-07-30 紅隊 R65（L2）：原本沒有這一行，而 normality/compute.js 有。
      //   一個非數值字串（Number('abc') = NaN）會讓**整欄的 mean/sd/se/min/max/median/
      //   skew/kurt 全部變成 NaN**，報表印 n = 5 但其餘八欄全是「—」，且不說明原因。
      //   同一件事在兩支模組有兩套處理 ⇒ 對齊 normality 的做法。
      .filter(Number.isFinite)
    return { col, ...describe(values) }
  })
}
