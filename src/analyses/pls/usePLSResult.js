/**
 * PLS 運算 Worker hook — Result 與 Narrative 共用同一次運算（W3 順延的 Worker 接線）。
 *
 * 模組層快取：同一組 (rows, committed) 引用只跑一次 Worker；
 * 兩個元件透過訂閱共享 { status: 'running'|'done', progress, result }。
 * Worker 建立失敗（罕見：測試環境／舊瀏覽器）時退回主執行緒同步計算（compute.js）。
 *
 * 取消語意：committed 變更即 terminate 舊 Worker 重建（plsWorker.js 檔頭約定）。
 */
import { useEffect, useState } from 'react'
import { runPLSAnalysis, buildWorkerOptions } from './compute'

const cache = {
  rows: null,
  committed: null,
  state: null, // { status, progress, result }
  worker: null,
  listeners: new Set(),
}

function notify() {
  for (const fn of cache.listeners) fn()
}

function ensureRun(rows, committed) {
  if (cache.rows === rows && cache.committed === committed && cache.state) return
  if (cache.worker) {
    cache.worker.terminate()
    cache.worker = null
  }
  cache.rows = rows
  cache.committed = committed
  cache.state = { status: 'running', progress: 0, result: null }

  let worker = null
  try {
    worker = new Worker(new URL('../../lib/plsWorker.js', import.meta.url), { type: 'module' })
  } catch {
    worker = null
  }
  if (!worker) {
    // 同步後援（阻塞主執行緒，但功能完整）
    cache.state = { status: 'done', progress: 1, result: runPLSAnalysis(rows, committed) }
    return
  }
  cache.worker = worker
  worker.onmessage = ({ data }) => {
    if (cache.worker !== worker) return // 已被新一輪取代
    if (data.type === 'progress') {
      cache.state = {
        ...cache.state,
        progress: data.total > 0 ? data.done / data.total : 0,
      }
    } else if (data.type === 'result') {
      const rest = { ...data }
      delete rest.type
      cache.state = { status: 'done', progress: 1, result: rest }
      worker.terminate()
      cache.worker = null
    } else if (data.type === 'error') {
      cache.state = { status: 'done', progress: 1, result: { error: data.error, message: data.message } }
      worker.terminate()
      cache.worker = null
    }
    notify()
  }
  worker.onerror = () => {
    if (cache.worker !== worker) return
    worker.terminate()
    cache.worker = null
    cache.state = { status: 'done', progress: 1, result: runPLSAnalysis(rows, committed) }
    notify()
  }
  worker.postMessage({ type: 'run', rows, model: committed.model, options: buildWorkerOptions(committed) })
}

/** @returns {{ status: 'idle'|'running'|'done', progress: number, result: object|null }} */
export function usePLSResult(dataset, committed) {
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = () => bump((v) => v + 1)
    cache.listeners.add(fn)
    return () => cache.listeners.delete(fn)
  }, [])
  if (!dataset || !committed) return { status: 'idle', progress: 0, result: null }
  ensureRun(dataset.rows, committed)
  return cache.state
}
