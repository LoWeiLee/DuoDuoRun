/**
 * PLS-SEM 運算 Web Worker（Vite module worker）
 *
 * UI 的接法（Vite 的 new Worker(new URL(...)) 模式）：
 *   const worker = new Worker(new URL('./plsWorker.js', import.meta.url), { type: 'module' })
 *   worker.postMessage({ type: 'run', rows, model, options })
 *   worker.onmessage = ({ data }) => {
 *     if (data.type === 'progress') { ... }   // bootstrap 完成進度
 *     if (data.type === 'result')   { ... }   // { estimate, bootstrap, q2 }
 *     if (data.type === 'error')    { ... }   // { error, message }
 *   }
 *
 * 訊息協定：
 *   in : { type: 'run', rows, model, options }
 *        options 直接傳給 runPLS/bootstrapPLS（scheme/consistent/ciType…見 pls.js 檔頭）；
 *        options.bootstrap = false        → 只做點估計，不跑 bootstrap
 *        options.bootstrap = { n, seed, ciAlpha, signCorrection, ciType } → bootstrap 專屬設定
 *        options.q2 = true | { omissionDistance } → 附帶 blindfolding Q²（W3）
 *   out: { type: 'progress', done, total }  — bootstrap 期間定期回報（約每 1%）
 *        { type: 'result', estimate, bootstrap, q2 }（關閉的項目為 null）
 *        { type: 'error', error, message }
 *
 * 取消：bootstrap 是同步迴圈（Worker 執行中不會處理 inbound 訊息），
 *       取消的正確方式是主執行緒呼叫 worker.terminate() 後重建 Worker。
 *       progress 訊息由 Worker 內 postMessage 送出，不受同步迴圈影響。
 *
 * 引擎程式碼同構：runPLS/bootstrapPLS/blindfoldPLS 為純函式，本檔在 Node（Vitest）
 * 環境 import 時不會註冊任何 listener（isWorkerScope 判斷），可直接測 handleMessage。
 */
import {
  runPLS, bootstrapPLS, blindfoldPLS, mgaPLS, micomPLS, plspredictPLS, ipmaPLS,
} from './stats/pls.js'

/**
 * 處理一則 'run' 訊息。post 為訊息送出函式（Worker 中是 self.postMessage）。
 * 抽成純函式供 Node 端單元測試。
 */
export function handleMessage(msg, post) {
  if (!msg || msg.type !== 'run') {
    post({ type: 'error', error: 'bad-message', message: `未知的訊息類型：${msg?.type}` })
    return
  }
  try {
    const { rows, model, options = {} } = msg
    const {
      bootstrap: bootOpt, q2: q2Opt,
      mga: mgaOpt, micom: micomOpt, predict: predictOpt, ipma: ipmaOpt,
      ...estimateOptions
    } = options

    const estimate = runPLS(rows, model, estimateOptions)
    if (estimate.error) {
      post({ type: 'error', error: estimate.error, message: estimate.message })
      return
    }

    let bootstrap = null
    if (bootOpt !== false) {
      const bopt = {
        ...estimateOptions,
        ...(typeof bootOpt === 'object' && bootOpt !== null ? bootOpt : {}),
        onProgress: (done, total) => post({ type: 'progress', done, total }),
      }
      bootstrap = bootstrapPLS(rows, model, bopt)
      if (bootstrap.error) {
        post({ type: 'error', error: bootstrap.error, message: bootstrap.message })
        return
      }
    }

    // Q²（blindfolding）失敗不擋整體結果：以 { error, message } 原樣回傳給 UI 顯示
    let q2 = null
    if (q2Opt) {
      const qopt = {
        ...estimateOptions,
        ...(typeof q2Opt === 'object' && q2Opt !== null ? q2Opt : {}),
      }
      q2 = blindfoldPLS(rows, model, qopt)
    }

    // W5（各項獨立開關；錯誤以 { error, message } 內嵌回傳，不中斷其他結果）
    const progress = (done, total) => post({ type: 'progress', done, total })
    const mga = mgaOpt
      ? mgaPLS(rows, model, { ...estimateOptions, ...mgaOpt, onProgress: progress })
      : null
    const micom = micomOpt
      ? micomPLS(rows, model, { ...estimateOptions, ...micomOpt, onProgress: progress })
      : null
    const predict = predictOpt
      ? plspredictPLS(rows, model, { ...estimateOptions, ...predictOpt })
      : null
    const ipma = ipmaOpt
      ? ipmaPLS(rows, model, { ...estimateOptions, ...ipmaOpt })
      : null

    post({ type: 'result', estimate, bootstrap, q2, mga, micom, predict, ipma })
  } catch (err) {
    post({ type: 'error', error: 'unexpected', message: String(err?.message ?? err) })
  }
}

// 只在真正的 Worker 環境註冊 listener（Node/Vitest import 本檔不產生副作用）
const isWorkerScope =
  typeof self !== 'undefined' &&
  typeof self.postMessage === 'function' &&
  typeof window === 'undefined'

if (isWorkerScope) {
  self.onmessage = (e) => handleMessage(e.data, (m) => self.postMessage(m))
}
