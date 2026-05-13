/**
 * Levene's 等變異數檢定（Brown-Forsythe 版本，median-based）
 *
 * 對齊 JASP 預設與 R::car::leveneTest 預設：使用各組「中位數」做中心化，
 * 對偏態分布較穩健（Brown & Forsythe 1974）。
 *
 * 註：SPSS 的「Test of Homogeneity of Variances」預設為 mean-based Levene；
 * 本工具未提供 mean-based 版本。若要與 SPSS 預設輸出完全對齊，請以 R/JASP 結果為準。
 *
 * 演算法：
 *   1. 對每組 i，計算 Z_ij = |X_ij - median(group_i)|
 *   2. 對 Z 跑單因子 ANOVA
 *   3. F = MSBetween / MSWithin
 *   4. p = 右尾 F(df1=k-1, df2=N-k)
 *
 * 對外 API：
 *   levene(groups) → { F, df1, df2, p, error? }
 *
 *   groups: number[][] — 每組為一個數值陣列（已剔除遺漏值）
 *
 * 解讀：
 *   - 虛無假設 H₀：各組變異數相等
 *   - p < α → 拒絕 H₀ → 違反等變異數前提（獨立 t 應改用 Welch's，本工具預設即是）
 */
import { median, mean } from './descriptive.js'
import { pF } from './pvalue.js'

export function levene(groups) {
  const k = groups.length
  if (k < 2) {
    return { F: NaN, df1: NaN, df2: NaN, p: NaN, error: 'need->=2-groups' }
  }
  const N = groups.reduce((s, g) => s + g.length, 0)
  if (N <= k) {
    return { F: NaN, df1: NaN, df2: NaN, p: NaN, error: 'need-N>k' }
  }

  // 1. 對每組計算 |X - median(group)|
  const z = groups.map((g) => {
    const med = median(g)
    return g.map((v) => Math.abs(v - med))
  })

  // 2. 對 Z 跑單因子 ANOVA
  const zMeans = z.map((zi) => mean(zi))
  const zAll = z.flat()
  const zGrand = mean(zAll)

  let ssBetween = 0
  for (let i = 0; i < k; i++) {
    ssBetween += z[i].length * Math.pow(zMeans[i] - zGrand, 2)
  }

  let ssWithin = 0
  for (let i = 0; i < k; i++) {
    for (const v of z[i]) {
      ssWithin += Math.pow(v - zMeans[i], 2)
    }
  }

  const df1 = k - 1
  const df2 = N - k

  if (ssWithin === 0) {
    return { F: Infinity, df1, df2, p: 0 }
  }

  const F = (ssBetween / df1) / (ssWithin / df2)
  const p = pF(F, df1, df2)

  return { F, df1, df2, p }
}
