/**
 * PLS-SEM — 把 Config 送出的 committed 設定轉成計算結果。
 *
 * committed（Config 按「執行分析」時經 validatePLSModel 驗證後寫入 analysisState）：
 *   { model, bootstrapN, draft }
 *     model      — docs/pls-model-schema.md 格式的模型 JSON
 *     bootstrapN — 500 | 1000 | 5000
 *     draft      — 執行當下的表單快照（Config 用來偵測「設定已變更」）
 *
 * 回傳：
 *   { estimate, bootstrap } — estimate 為 runPLS 結果；
 *                             bootstrap 失敗時為 { error, message }（estimate 仍可用）
 *   { error, message }      — 點估計本身失敗
 *
 * TODO(W2)：Worker 接線 — src/lib/plsWorker.js 已備妥訊息協定（run / progress / result / error），
 * 本檔目前為主執行緒同步計算（bootstrap ≤ 5000 次在示範資料量約 1–3 秒）。
 * 接線時把 Result/Narrative 的 useMemo 改為 useEffect + worker.postMessage，
 * 以 progress 訊息驅動進度條，設定變更時 worker.terminate() 後重建。
 */
import { runPLS, bootstrapPLS } from '../../lib/stats/pls.js'

// Result 與 Narrative 會在同一次 render 各自呼叫一次；
// 以「最後一次引數」快取避免 bootstrap 重跑兩遍（rows / committed 引用不變即命中）。
let lastRows = null
let lastCommitted = null
let lastResult = null

export function runPLSAnalysis(rows, committed) {
  if (!committed || !committed.model) return { error: 'not-run', message: '' }
  if (rows === lastRows && committed === lastCommitted && lastResult) return lastResult

  const estimate = runPLS(rows, committed.model, {})
  if (estimate.error) {
    lastResult = { error: estimate.error, message: estimate.message }
  } else {
    const bootstrap = bootstrapPLS(rows, committed.model, {
      n: committed.bootstrapN ?? 1000,
      seed: 42,
    })
    lastResult = { estimate, bootstrap }
  }
  lastRows = rows
  lastCommitted = committed
  return lastResult
}
