/**
 * AppProvider — 全域狀態的 Provider 元件
 *
 * 2026-07-13 紅隊 R4：從 AppContext.jsx 拆出。原本 context / hooks / Provider
 * 全擠在一個檔案，觸發 react-refresh/only-export-components——Fast Refresh 失效，
 * 每次改動 AppContext.jsx 都會整頁重載，已載入的資料集與分析設定全部歸零。
 *
 * context 與 hooks（useApp / useAnalysisState）留在 AppContext.jsx，
 * 因此全 codebase 的 `import { useApp } from '../context/AppContext'` 不受影響。
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { AppContext } from './AppContext'
import { getStrings } from '../i18n'
import { getDataset } from '../data'
import { summarizeAll } from '../lib/variableTypes'
import { applyTransforms } from '../lib/transforms'

let snapCounter = 0
function newSnapId() {
  snapCounter += 1
  return `${Date.now()}-${snapCounter}`
}

export function AppProvider({ children }) {
  const [lang, setLang] = useState('zh-TW')
  const [mode, setMode] = useState('teaching')
  const [activeAnalysis, setActiveAnalysis] = useState(null)
  const [activeDataset, setActiveDatasetRaw] = useState(null)
  const [analysisState, setAnalysisState] = useState({})
  const [transforms, setTransforms] = useState([])
  const [history, setHistory] = useState([])
  const [uploadedDataset, setUploadedDatasetRaw] = useState(null)
  // 手機（<768px）預設折疊 sidebar，避免一進來就被導覽列吃掉螢幕。
  //
  // 2026-07-13 紅隊 R3：原本只在初次 mount 讀一次 window.innerWidth，之後
  // 旋轉螢幕、縮放視窗、或從手機版展開到桌面寬度都不會重算——桌面使用者若在
  // 窄視窗開啟頁面再拉寬，側欄會一直維持折疊且沒有任何提示。
  // 改用 matchMedia 並掛 listener：跨過斷點時同步預設值。
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches
  )
  // 使用者手動切換過側欄後，就不再被斷點變化覆寫（尊重明示意圖）
  const sidebarTouchedRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = (e) => {
      if (sidebarTouchedRef.current) return
      setSidebarCollapsed(e.matches)
    }
    // Safari < 14 只有 addListener；兩者都掛以求相容
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [explainCollapsed, setExplainCollapsed] = useState(false)
  const toggleSidebar = useCallback(() => {
    sidebarTouchedRef.current = true
    setSidebarCollapsed((v) => !v)
  }, [])
  const toggleConfig = useCallback(() => setConfigCollapsed((v) => !v), [])
  const toggleExplain = useCallback(() => setExplainCollapsed((v) => !v), [])

  const t = useMemo(() => getStrings(lang), [lang])

  // 切換資料集時清空轉換（轉換綁特定資料集的欄位）
  const switchDataset = useCallback((id) => {
    setActiveDatasetRaw(id)
    setTransforms([])
  }, [])

  /**
   * 設定上傳資料集；自動 activate（並清空 transforms）。
   *   data: { name, rows, columns } from parseFile
   *   傳 null 為「移除上傳資料集」
   */
  const setUploadedDataset = useCallback((data) => {
    if (!data) {
      setUploadedDatasetRaw(null)
      // 若目前是上傳資料集，回到「未載入」
      setActiveDatasetRaw((prev) => (prev === 'uploaded' ? null : prev))
      return
    }
    // 建立 dataset 物件（使用 raw column 名為中英 label）
    const labels = { zh: {}, en: {} }
    for (const c of data.columns) {
      labels.zh[c] = c
      labels.en[c] = c
    }
    const ds = {
      id: 'uploaded',
      name: data.name,
      rows: data.rows,
      labels,
    }
    setUploadedDatasetRaw(ds)
    // 自動切到此資料集 + 清 transforms
    setActiveDatasetRaw('uploaded')
    setTransforms([])
  }, [])

  // 套用 transforms 後的有效 dataset
  const dataset = useMemo(() => {
    if (!activeDataset) return null
    let raw
    if (activeDataset === 'uploaded') {
      raw = uploadedDataset
    } else {
      raw = getDataset(activeDataset)
    }
    if (!raw) return null
    if (transforms.length === 0) return raw
    const effectiveRows = applyTransforms(raw.rows, transforms)
    const effectiveLabels = {
      zh: { ...(raw.labels?.zh || {}) },
      en: { ...(raw.labels?.en || {}) },
    }
    for (const tr of transforms) {
      effectiveLabels.zh[tr.name] = tr.labels?.zh || tr.name
      effectiveLabels.en[tr.name] = tr.labels?.en || tr.name
    }
    return {
      ...raw,
      rows: effectiveRows,
      labels: effectiveLabels,
    }
  }, [activeDataset, transforms, uploadedDataset])

  const variables = useMemo(() => {
    if (!dataset) return {}
    return summarizeAll(dataset.rows)
  }, [dataset])

  const getAnalysisState = useCallback(
    (id) => analysisState[id] || {},
    [analysisState]
  )
  const updateAnalysisState = useCallback((id, partial) => {
    setAnalysisState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...partial },
    }))
  }, [])

  const addTransform = useCallback((tr) => {
    setTransforms((prev) => {
      const filtered = prev.filter((p) => p.name !== tr.name)
      return [...filtered, tr]
    })
  }, [])
  const removeTransform = useCallback((name) => {
    setTransforms((prev) => prev.filter((p) => p.name !== name))
  }, [])

  /* ─────────────────────  history  ───────────────────── */

  const pushSnapshot = useCallback(
    (label) => {
      if (!activeDataset || !activeAnalysis) return null
      const settings = analysisState[activeAnalysis] || {}
      const snap = {
        id: newSnapId(),
        timestamp: Date.now(),
        datasetId: activeDataset,
        analysisId: activeAnalysis,
        settings: structuredClone(settings),
        transforms: structuredClone(transforms),
        mode,
        lang,
        label: label || null,
      }
      setHistory((prev) => [snap, ...prev]) // 最新在前
      return snap.id
    },
    [activeDataset, activeAnalysis, analysisState, transforms, mode, lang]
  )

  const restoreSnapshot = useCallback(
    (id) => {
      const snap = history.find((h) => h.id === id)
      if (!snap) return false
      // 直接設 activeDataset（繞過 switchDataset 以保留 transforms）
      setActiveDatasetRaw(snap.datasetId)
      setTransforms(snap.transforms ? structuredClone(snap.transforms) : [])
      setActiveAnalysis(snap.analysisId)
      setAnalysisState((prev) => ({
        ...prev,
        [snap.analysisId]: structuredClone(snap.settings),
      }))
      setMode(snap.mode)
      setLang(snap.lang)
      return true
    },
    [history]
  )

  const removeSnapshot = useCallback((id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // 用 useMemo 包 context value，避免每次 render 都產生新物件導致全樹 re-render
  // setter（useState 回傳的 dispatch）與 useCallback 包過的 handler 引用穩定，不需列入 deps
  // 但為了 react-hooks lint 安全，把所有值都列進去（穩定引用不會觸發額外渲染）
  const value = useMemo(() => ({
    lang, setLang,
    mode, setMode,
    activeAnalysis, setActiveAnalysis,
    activeDataset, setActiveDataset: switchDataset,
    transforms, addTransform, removeTransform,
    dataset,
    variables,
    uploadedDataset, setUploadedDataset,
    t,
    getAnalysisState,
    updateAnalysisState,
    history,
    pushSnapshot,
    restoreSnapshot,
    removeSnapshot,
    clearHistory,
    sidebarCollapsed, toggleSidebar,
    configCollapsed, toggleConfig,
    explainCollapsed, toggleExplain,
  }), [
    lang, mode, activeAnalysis, activeDataset, transforms, dataset, variables,
    uploadedDataset, t, history, sidebarCollapsed, configCollapsed, explainCollapsed,
    switchDataset, setUploadedDataset, addTransform, removeTransform,
    getAnalysisState, updateAnalysisState,
    pushSnapshot, restoreSnapshot, removeSnapshot, clearHistory,
    toggleSidebar, toggleConfig, toggleExplain,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppProvider
