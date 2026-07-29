/**
 * 雙因子 ANOVA — 把 settings 轉成計算結果。
 *
 * settings: { depVar, factorA, factorB }
 */
import { twoWayANOVA } from '../../lib/stats/twoWayAnova.js'
import { isMissing } from '../../lib/variableTypes.js'
import { shapiroWilk } from '../../lib/stats/normality.js'
import { levene } from '../../lib/stats/levene.js'

export function runTwoWayAnova(rows, settings) {
  const { depVar, factorA, factorB } = settings || {}
  if (!depVar) return { error: 'pickDep' }
  if (!factorA) return { error: 'pickFactorA' }
  if (!factorB) return { error: 'pickFactorB' }
  if (factorA === factorB) return { error: 'sameFactor' }
  const result = twoWayANOVA(rows, depVar, factorA, factorB)
  if (result.error) return result

  /* ★ 2026-07-29 紅隊 R52（階段 A / A5a）：雙因子 ANOVA 原本**完全沒有前提檢核**。
     t 檢定與單因子 ANOVA 早就在 compute 層跑 Levene ＋ Shapiro-Wilk（同樣兩支現成函式），
     ANCOVA 有斜率同質性、重複量數與混合設計有 Mauchly——七支裡只有雙因子是空的。
     這裡比照 oneWayAnova/compute.js:47–48 的做法補上：
       · 變異數同質 → 對 A×B 交叉後的**各細格**跑 Levene（雙因子的誤差項是細格內變異）
       · 常態 → 對**全模型殘差**跑 Shapiro-Wilk（雙因子的常態假設是殘差常態，不是逐組常態）
     兩者都只警告、不擋。 */
  const cells = new Map()
  const resid = []
  for (const r of rows) {
    const yv = r[depVar]; const av = r[factorA]; const bv = r[factorB]
    if (isMissing(yv) || isMissing(av) || isMissing(bv)) continue
    const nv = Number(yv)
    if (!Number.isFinite(nv)) continue
    const key = `${av}\u0000${bv}`
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key).push(nv)
    const cm = result.cellMeans?.[av]?.[bv]?.mean
    if (Number.isFinite(cm)) resid.push(nv - cm)
  }
  const cellArrays = [...cells.values()].filter((a) => a.length >= 2)
  const homogeneity = cellArrays.length >= 2 ? levene(cellArrays) : null
  const normality = resid.length >= 3 ? shapiroWilk(resid) : null

  return {
    ...result,
    assumptions: {
      homogeneity: homogeneity && !homogeneity.error ? homogeneity : null,
      normality: normality && !normality.error ? normality : null,
      nCells: cells.size,
    },
  }
}
