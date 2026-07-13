/**
 * Toast — 非阻塞的短暫通知
 *
 * 取代瀏覽器原生 alert()。原生 alert() 的問題：
 *   - 阻塞主執行緒（匯出中的 spinner 會凍住）
 *   - 樣式與語言不可控（按鈕永遠是瀏覽器語言）
 *   - 使用者可勾選「不再顯示此類對話框」，之後所有錯誤就無聲消失
 *
 * 無障礙：
 *   - tone='bad' → role="alert"（assertive，螢幕報讀立即打斷播報）
 *   - 其他 → role="status"（polite，等使用者當前的播報結束）
 *   - 關閉鈕有 aria-label；toast 本身不搶焦點（不打斷鍵盤操作流）
 *
 * 用法：
 *   const { showToast } = useToast()
 *   showToast({ tone: 'bad', title: t.errors.exportFailed, message: err.message })
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ToastContext } from '../context/toastContext'

const TONE_STYLES = {
  ok:   { dot: 'bg-duo-sig-ok shadow-led-ok',     border: 'border-duo-sig-ok/40' },
  warn: { dot: 'bg-duo-sig-warn shadow-led-warn', border: 'border-duo-sig-warn/40' },
  bad:  { dot: 'bg-duo-sig-bad shadow-led-bad',   border: 'border-duo-sig-bad/40' },
}

const DEFAULT_DURATION = 6000

function ToastItem({ toast, onDismiss, closeLabel }) {
  const { id, tone = 'bad', title, message, duration = DEFAULT_DURATION } = toast
  const style = TONE_STYLES[tone] || TONE_STYLES.bad

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-lg border ${style.border}
                  bg-white shadow-xl px-4 py-3 flex items-start gap-3`}
    >
      <span aria-hidden="true" className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
      <div className="min-w-0 flex-1">
        {title ? (
          <div className="text-sm font-semibold text-duo-cocoa-900">{title}</div>
        ) : null}
        {message ? (
          <div className="mt-0.5 text-xs text-duo-cocoa-600 leading-relaxed break-words">{message}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label={closeLabel}
        className="shrink-0 rounded px-1 text-duo-cocoa-300 hover:text-duo-cocoa-700 transition
                   focus-ring"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  )
}

function ToastProvider({ children, closeLabel = 'Close' }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((list) => [...list, { ...toast, id }])
    return id
  }, [])

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live 區域：固定右下，不搶焦點、不阻塞操作 */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} closeLabel={closeLabel} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
