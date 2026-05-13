/**
 * 單因子 ANOVA — 把 settings 轉成計算結果。
 *
 * settings: { depVar, factor }
 *
 * 流程：
 *   1. 依 factor 將 rows 分組
 *   2. 對 depVar 做 listwise（任一缺值剔除）
 *   3. 跑 oneWayANOVA → tukeyHSD
 *   4. 跑前提檢核：每組 Shapiro-Wilk + 全組 Levene's
 */
import { isMissing } from '../../lib/variableTypes.js'
import { oneWayANOVA, tukeyHSD, bonferroni } from '../../lib/stats/anova.js'
import { shapiroWilk } from '../../lib/stats/normality.js'
import { levene } from '../../lib/stats/levene.js'

export function runOneWayAnova(rows, settings) {
  const { depVar, factor } = settings || {}
  if (!depVar) return { error: 'pickDep' }
  if (!factor) return { error: 'pickFactor' }

  // 依 factor 分桶
  const buckets = {}
  for (const r of rows) {
    const f = r[factor]
    const v = r[depVar]
    if (isMissing(f) || isMissing(v)) continue
    const num = Number(v)
    if (!Number.isFinite(num)) continue
    if (!buckets[f]) buckets[f] = []
    buckets[f].push(num)
  }
  const groupNames = Object.keys(buckets)
  if (groupNames.length < 2) {
    return { error: 'factorBadGroups', meta: { k: groupNames.length } }
  }
  // k=2 時 ANOVA 等價於兩樣本 t；引導使用者改用 t-test 介面
  if (groupNames.length === 2) {
    return { error: 'useTTestForTwoGroups', meta: { k: 2 } }
  }

  const groups = groupNames.map((name) => ({ name, values: buckets[name] }))
  const anova = oneWayANOVA(groups)
  if (anova.error) return { error: anova.error, meta: anova.meta }

  // 前提檢核
  const normality = groups.map((g) => ({ name: g.name, ...shapiroWilk(g.values) }))
  const homogeneity = levene(groups.map((g) => g.values))

  // Tukey HSD（不論顯著與否都計算，UI 端視 F 是否顯著決定是否強調）
  const tukey = tukeyHSD(anova.groupStats, anova.msWithin, anova.dfWithin)
  // Bonferroni 同樣計算（與 Tukey 並列展示）
  const bonf = bonferroni(anova.groupStats, anova.msWithin, anova.dfWithin)

  return {
    anova,
    tukey,
    bonferroni: bonf,
    depVar,
    factor,
    assumptions: { normality, homogeneity },
  }
}
