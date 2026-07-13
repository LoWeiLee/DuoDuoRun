/**
 * ConfirmDialog — 取代瀏覽器原生 confirm()
 *
 * 原生 confirm() 的問題：樣式無法控制、無法 i18n（按鈕永遠是瀏覽器語言）、
 * 阻塞主執行緒、在部分嵌入情境會被瀏覽器直接吞掉（使用者按了沒反應）。
 *
 * 建在 Modal 之上，因此自動具備 focus trap / Esc / aria-modal / focus 還回。
 * 危險操作（destructive）用 duo.sig.bad 標示確認鈕。
 */
import Modal from './Modal'

function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  closeLabel,
  destructive = false,
}) {
  // 標題列的關閉鈕必須與「取消」有不同的無障礙名稱，否則螢幕報讀與鍵盤操作
  // 會出現兩個同名的 button，使用者無從分辨（測試也會抓到重複元素）。
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      labels={{ close: closeLabel || 'Close' }}
      maxWidth="max-w-md"
    >
      <div className="px-5 py-5">
        <p className="text-sm text-duo-cocoa-700 leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 text-xs font-medium rounded-lg border border-duo-cocoa-200 bg-white text-duo-cocoa-700
                       hover:bg-duo-cream-50 transition
                       focus-ring"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'h-8 px-3 text-xs font-medium rounded-lg text-white transition',
              destructive
                ? 'bg-duo-sig-bad hover:brightness-110 focus-ring-bad'
                : 'bg-duo-amber-500 hover:bg-duo-amber-600 focus-ring',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
