/**
 * 必要條件分析（NCA）— 把 settings 轉成計算結果。
 *
 * settings: { xVar（條件變數）, yVar（結果變數） }
 *
 * 流程：
 *   1. listwise 剔除任一缺值的列
 *   2. 跑 runNCA（CE-FDH / CR-FDH ceiling、effect size、bottleneck）
 *   3. permutation 檢定用固定 seed → UI 顯示決定性、可重現的近似 p
 *
 * 註：UI 的 permutation 以固定 seed 生成（近似檢定，重現穩定）；引擎層級的
 * 數值正確性由 tests/compare.test.js 以注入固定 draws 對 numpy 基準驗證。
 */
import { isMissing } from '../../lib/variableTypes.js'
import { runNCA } from '../../lib/stats/nca.js'

const UI_PERMUTATIONS = 10000
const UI_SEED = 42

export function runNCACompute(rows, settings) {
  const { xVar, yVar } = settings || {}
  if (!xVar) return { error: 'pickX' }
  if (!yVar) return { error: 'pickY' }
  if (xVar === yVar) return { error: 'sameVar' }

  const xs = []
  const ys = []
  for (const r of rows) {
    const xv = r[xVar]
    const yv = r[yVar]
    if (isMissing(xv) || isMissing(yv)) continue
    const xn = Number(xv)
    const yn = Number(yv)
    if (!Number.isFinite(xn) || !Number.isFinite(yn)) continue
    xs.push(xn)
    ys.push(yn)
  }

  const nca = runNCA(xs, ys, { permutations: UI_PERMUTATIONS, seed: UI_SEED })
  if (nca.error) return { error: nca.error }

  return { nca, xVar, yVar }
}
