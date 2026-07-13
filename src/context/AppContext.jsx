/**
 * AppContext — 全域狀態的 context 與 hooks
 *
 * ⚠ 本檔**不得 export 任何元件**。Provider 已於 2026-07-13 紅隊 R4 拆到
 *   AppProvider.jsx——react-refresh/only-export-components 要求「一個檔案只 export
 *   元件」或「完全不 export 元件」，元件與 hook 混在同一檔會讓 Vite 的 Fast Refresh
 *   失效（改動時整頁重載、所有分析設定與已載入的資料全部丟失）。
 *
 * 這樣拆的好處：全 codebase 既有的 `import { useApp } from '../context/AppContext'`
 * 完全不用改，只有 App.jsx 改成從 AppProvider.jsx 取 Provider。
 */
import { createContext, useContext, useCallback } from 'react'

export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export function useAnalysisState() {
  const { activeAnalysis, getAnalysisState, updateAnalysisState } = useApp()
  const state = getAnalysisState(activeAnalysis)
  const update = useCallback(
    (partial) => updateAnalysisState(activeAnalysis, partial),
    [activeAnalysis, updateAnalysisState]
  )
  return [state, update]
}
