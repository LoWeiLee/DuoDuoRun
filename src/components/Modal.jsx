/**
 * Modal — 共用對話框外殼
 *
 * 取代原本 TransformDialog / HistoryDialog 各自手刻的 backdrop + 面板。
 * 它們原本欠缺的無障礙行為（全 codebase `aria-modal` 出現 0 次、無 focus trap），
 * 一次補齊在這裡：
 *
 *   - role="dialog" + aria-modal="true" + aria-labelledby 指向標題
 *   - focus trap：Tab / Shift+Tab 在對話框內循環，焦點不會跑到底下的頁面
 *   - 開啟時把焦點移入對話框；關閉時**還回**開啟前的元素（鍵盤使用者不會失去定位）
 *   - Esc 關閉、點 backdrop 關閉（點面板內部不關）
 *   - 開啟期間鎖住 body 捲動，避免背景跟著滾
 *
 * 用法：
 *   <Modal open={open} onClose={onClose} title={t.history.title} titleExtra={<span>(3)</span>}
 *          labels={{ close: t.common.close }} maxWidth="max-w-2xl">
 *     ...內容...
 *   </Modal>
 *
 * footer 為選用；不給就不渲染底部區塊。
 */
import { useEffect, useId, useRef } from 'react'

/** 對話框內可聚焦的元素（依 DOM 順序） */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function Modal({
  open,
  onClose,
  title,
  titleExtra = null,
  labels = {},
  maxWidth = 'max-w-2xl',
  footer = null,
  children,
}) {
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const titleId = useId()

  // 開啟時記住原本的焦點、把焦點移入面板；關閉時還回
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement
    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    // 面板內若無可聚焦元素，就聚焦面板本身（tabIndex={-1}）
    ;(first || panel)?.focus()

    return () => {
      const prev = restoreFocusRef.current
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus()
    }
  }, [open])

  // Esc 關閉 ＋ focus trap
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      // 焦點已在邊界（或跑到面板外）時，手動繞回另一端
      if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  // 鎖住背景捲動
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-duo-cocoa-900/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-white rounded-xl shadow-xl border border-duo-cream-200 overflow-hidden flex flex-col max-h-[85vh] focus:outline-none`}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-duo-cream-200">
          <h2 id={titleId} className="text-base font-semibold text-duo-cocoa-800">
            {title}
            {titleExtra}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close || 'Close'}
            className="rounded-md px-2 py-1 text-xs text-duo-cocoa-500 hover:text-duo-cocoa-700
                       focus-ring"
          >
            {labels.close || 'Close'} <span aria-hidden="true">✕</span>
          </button>
        </header>

        {children}

        {footer ? (
          <footer className="px-5 py-3 border-t border-duo-cream-200 flex justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export default Modal
