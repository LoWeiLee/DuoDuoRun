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

  // ★ 2026-07-30 紅隊 R66（L2）：原本回 { F: Infinity, p: 0 }，而**這個分支永遠是錯的**。
  //   ssWithin = 0 ⟺ 每一組的 |X − median| 全為 0 ⟺ 每一組都零變異
  //   ⟹ 各組的 Z 平均也全為 0 ⟹ ssBetween 必然同時為 0 ⟹ F 是 0/0，不是 ∞。
  //   舊版的後果：assumptionChecker 的 leveneStatus 讀到 p = 0 判 'fail'，
  //   前提檢核面板印**紅燈「違反變異數同質」＋ F = —（fmtNum(Infinity)）＋ p < .001**，
  //   而真相是**三組變異數完全相同（都是 0）**——方向剛好相反。
  //   改回錯誤碼後 leveneStatus 讀到非有限的 p 會判 'skip'，方向才對。
  //   （同型：A4 的 R40-i、A5a 的 R51、A6a 的 R61——這是第四次。）
  if (ssWithin === 0) {
    return { F: NaN, df1, df2, p: NaN, error: 'levene-all-constant' }
  }

  const F = (ssBetween / df1) / (ssWithin / df2)
  const p = pF(F, df1, df2)

  return { F, df1, df2, p }
}
