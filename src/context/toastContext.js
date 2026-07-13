/**
 * Toast 的 context 與 hook。
 *
 * 與 <ToastProvider>（src/components/Toast.jsx）分檔的原因：
 * react-refresh/only-export-components 要求「一個檔案只 export 元件」，
 * 元件與 hook / context 混在同一檔會讓 Vite 的 Fast Refresh 失效
 * （改動時整頁重載、state 全丟）。
 */
import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
