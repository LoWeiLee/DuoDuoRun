/**
 * EFA — 把 settings 轉成計算結果。
 *
 * settings: { selectedVars, nFactors, rotation }
 */
import { exploratoryFactorAnalysis } from '../../lib/stats/efa.js'

export function runEFA(rows, settings) {
  const cols = settings?.selectedVars || []
  if (cols.length < 3) return { error: 'needAtLeastThree' }
  const opts = {
    nFactors: settings?.nFactors,
    rotation: settings?.rotation || 'varimax',
  }
  const r = exploratoryFactorAnalysis(rows, cols, opts)
  // ★ 2026-07-29 R40-h：零變異的錯誤要把變項名帶給 UI（比照 A1 的 R7「指名構念」）
  if (r.error) return { error: r.error, vars: r.vars }
  return {
    ...r,
    columns: cols,
    // ★ R40-d：使用者選了 varimax 但因子數 < 2 時引擎不轉軸。
    //   修復前靜默 —— 標題的「（Varimax 轉軸後）」跟著消失，使用者不會知道是自己的設定造成的。
    rotationSkipped: opts.rotation === 'varimax' && r.rotation !== 'varimax',
  }
}
