/**
 * PLS-SEM — 把 Config 送出的 committed 設定轉成計算結果。
 *
 * committed（Config 按「執行分析」時經 validatePLSModel 驗證後寫入 analysisState）：
 *   { model, bootstrapN, options, draft }
 *     model      — docs/pls-model-schema.md 格式的模型 JSON（含 mode）
 *     bootstrapN — 500 | 1000 | 5000
 *     options    — { scheme:'path'|'factorial'|'centroid', consistent:boolean,
 *                    ciType:'percentile'|'bca', q2:boolean }（W3）
 *     draft      — 執行當下的表單快照（Config 用來偵測「設定已變更」）
 *
 * 回傳：
 *   { estimate, bootstrap, q2 } — estimate 為 runPLS 結果；
 *                                 bootstrap / q2 失敗時為 { error, message }（estimate 仍可用）；
 *                                 q2 未開啟時為 null
 *   { error, message }          — 點估計本身失敗
 *
 * TODO(W5)：Worker 接線 — src/lib/plsWorker.js 已備妥訊息協定（run / progress / result / error，
 * 含 q2），本檔目前為主執行緒同步計算（bootstrap ≤ 5000 次在示範資料量約 1–3 秒；
 * BCa 另加 n 次 jackknife；W4 兩階段模型每次重抽跑 2–3 次估計，成本約 2–3 倍，
 * 到 W5 的 permutation/k-fold 重運算時一併接 Worker）。接線時把 Result/Narrative 的
 * useMemo 改為 useEffect + worker.postMessage，以 progress 訊息驅動進度條。
 */
import { runPLS, bootstrapPLS, blindfoldPLS } from '../../lib/stats/pls.js'

// Result 與 Narrative 會在同一次 render 各自呼叫一次；
// 以「最後一次引數」快取避免 bootstrap 重跑兩遍（rows / committed 引用不變即命中）。
let lastRows = null
let lastCommitted = null
let lastResult = null

export function runPLSAnalysis(rows, committed) {
  if (!committed || !committed.model) return { error: 'not-run', message: '' }
  if (rows === lastRows && committed === lastCommitted && lastResult) return lastResult

  const opts = committed.options || {}
  const estimateOptions = {
    scheme: opts.scheme ?? 'path',
    consistent: opts.consistent === true,
  }

  const estimate = runPLS(rows, committed.model, estimateOptions)
  if (estimate.error) {
    lastResult = { error: estimate.error, message: estimate.message }
  } else {
    const bootstrap = bootstrapPLS(rows, committed.model, {
      ...estimateOptions,
      n: committed.bootstrapN ?? 1000,
      seed: 42,
      ciType: opts.ciType === 'bca' ? 'bca' : 'percentile',
    })
    const q2 = opts.q2 === true
      ? blindfoldPLS(rows, committed.model, estimateOptions)
      : null
    lastResult = { estimate, bootstrap, q2 }
  }
  lastRows = rows
  lastCommitted = committed
  return lastResult
}
