/**
 * 主內容區
 *
 * 兩種模式：
 *   1. 首頁模式：尚未載入資料 + 未選分析 → 渲染 HomePage
 *   2. 工作模式：已載入資料或已選分析 → 三欄佈局
 *
 * 三欄寬度：左 25% / 中 45% / 右 30%（Config / 方法說明收起時，Result 自動補位）
 * 收合規則：每欄的收合鈕只收合「自己」——
 *   側欄收合鈕在 Sidebar.jsx、Config 與方法說明各有自己的鈕（僅桌面顯示；
 *   手機為垂直堆疊，不提供收合以免收起後無法展開）。
 * 視覺：1px hairline 邊框（border-duo-cocoa-100）、small caps eyebrow heading
 */
import { useRef, useState } from 'react'
import { useTimedFlash, useAutoClearTimer } from '../lib/hooks/useTimedFlash'
import { useApp } from '../context/AppContext'
import { ANALYSIS_GROUPS } from '../config/analyses'
import { getAnalysisModule } from '../analyses/registry'
import { getDemo } from '../config/demos'
import { copyAllTablesIn, copyToClipboard } from '../lib/clipboard'
import { fillTemplate } from '../lib/format'
import DuoMascot from './DuoMascot'
import VariableList from './VariableList'
import DataPreviewTable from './DataPreviewTable'
import HomePage from './HomePage'
import AssumptionChecker from './AssumptionChecker'
import ErrorBoundary from './ErrorBoundary'

function findAnalysisLabel(activeAnalysis, t) {
  if (!activeAnalysis) return null
  for (const group of ANALYSIS_GROUPS) {
    const item = group.items.find((i) => i.id === activeAnalysis)
    if (item) return t.sidebar[item.i18nKey]
  }
  return null
}

function PanelHeading({ children }) {
  return (
    <h2 className="heading-eyebrow mb-3">{children}</h2>
  )
}

function EmptyHint({ children }) {
  return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{children}</div>
}

const PANEL_BORDER = 'border-duo-cocoa-100'

function PanelChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 4 6 8 10 12" />
    </svg>
  )
}

function PanelChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  )
}

/* 載入示範設定按鈕 — 一鍵填好資料集與變數選擇 */
function LoadDemoButton({ analysisId }) {
  const { setActiveDataset, updateAnalysisState, t } = useApp()
  const [loaded, flashLoaded] = useTimedFlash(1500)
  const demo = getDemo(analysisId)
  if (!demo) return null

  const handle = () => {
    setActiveDataset(demo.dataset)
    updateAnalysisState(analysisId, demo.settings)
    flashLoaded()
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handle}
        title={t.panels.loadDemoHint}
        className={[
          'w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition',
          loaded
            ? 'bg-duo-leaf/15 border-duo-leaf text-duo-leaf'
            : 'bg-duo-amber-50 border-duo-amber-200 text-duo-amber-800 hover:bg-duo-amber-100 hover:border-duo-amber-400',
        ].join(' ')}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v8M4 6l4 4 4-4M3 13h10" />
        </svg>
        {loaded ? t.panels.demoLoaded : t.panels.loadDemo}
      </button>
    </div>
  )
}

/* ─────────────────────────  左欄  ───────────────────────── */

function ConfigPanel() {
  const { dataset, activeAnalysis, t, configCollapsed, toggleConfig } = useApp()
  const analysisLabel = findAnalysisLabel(activeAnalysis, t)
  const analysisModule = activeAnalysis ? getAnalysisModule(activeAnalysis) : null

  // 收起狀態：桌面顯示窄條，手機不渲染（手機本來就垂直堆疊，無需收起）
  if (configCollapsed) {
    return (
      <section className={`hidden md:flex w-7 shrink-0 border-r ${PANEL_BORDER} bg-white flex-col items-center pt-3`}>
        <button
          type="button"
          onClick={toggleConfig}
          title={t.common?.expand || '展開'}
          className="p-1 text-duo-cocoa-400 hover:text-duo-amber-700 transition"
        >
          <PanelChevronRight />
        </button>
      </section>
    )
  }

  // 收合鈕只收合 Config 自己；手機不顯示（收起後在手機上無法展開）
  const collapseBtn = (
    <button
      type="button"
      onClick={toggleConfig}
      title={t.common?.collapse || '收起'}
      className="hidden md:block absolute top-3 right-2 p-1 text-duo-cocoa-300 hover:text-duo-amber-700 transition z-10"
    >
      <PanelChevronLeft />
    </button>
  )

  if (!dataset) {
    return (
      <section className={`w-full md:flex-[25] md:min-w-0 p-5 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-white md:overflow-y-auto relative`}>
        {collapseBtn}
        <PanelHeading>{t.panels.configTitle}</PanelHeading>
        {activeAnalysis && <LoadDemoButton analysisId={activeAnalysis} />}
        <EmptyHint>{t.panels.configNoDataset}</EmptyHint>
      </section>
    )
  }

  if (analysisModule?.Config) {
    return (
      <section className={`w-full md:flex-[25] md:min-w-0 p-5 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-white md:overflow-y-auto relative`}>
        {collapseBtn}
        <LoadDemoButton analysisId={activeAnalysis} />
        <ErrorBoundary t={t} resetKey={activeAnalysis} where={t.panels.configTitle}>
          <analysisModule.Config />
        </ErrorBoundary>
      </section>
    )
  }

  if (analysisLabel) {
    return (
      <section className={`w-full md:flex-[25] md:min-w-0 p-5 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-white md:overflow-y-auto relative`}>
        {collapseBtn}
        <div className="space-y-6">
          <VariableList />
          <div>
            <h3 className="heading-eyebrow mb-2">{t.panels.configTitle}</h3>
            <div className="font-serif text-base font-medium text-duo-cocoa-900 mb-1">
              {analysisLabel}
            </div>
            <EmptyHint>{t.common.comingSoon}</EmptyHint>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`flex-[25] min-w-0 p-5 border-r ${PANEL_BORDER} bg-white overflow-y-auto relative`}>
      {collapseBtn}
      <VariableList />
    </section>
  )
}

/* ─────────────────────────  中欄  ───────────────────────── */

/** 複製整頁所有結果表格為 TSV 的小按鈕 */
function CopyTablesButton({ contentRef }) {
  const { t } = useApp()
  const [status, setStatus] = useState({ kind: 'idle', count: 0 })
  const [scheduleReset] = useAutoClearTimer()
  const handle = async () => {
    if (!contentRef.current) return
    const { count, text } = copyAllTablesIn(contentRef.current)
    if (count === 0) {
      setStatus({ kind: 'empty', count: 0 })
      scheduleReset(() => setStatus({ kind: 'idle', count: 0 }), 1500)
      return
    }
    const ok = await copyToClipboard(text)
    if (ok) {
      setStatus({ kind: 'copied', count })
      scheduleReset(() => setStatus({ kind: 'idle', count: 0 }), 1800)
    }
  }
  let label = t.panels.copyTablesBtn
  let cls = 'bg-white border-duo-cocoa-100 text-duo-cocoa-600 hover:border-duo-amber-400 hover:text-duo-amber-700'
  if (status.kind === 'copied') {
    label = fillTemplate(t.panels.copiedTables, { n: status.count })
    cls = 'bg-duo-leaf/15 border-duo-leaf text-duo-leaf'
  } else if (status.kind === 'empty') {
    label = t.panels.copyEmpty
    cls = 'bg-duo-cream-50 border-duo-cocoa-200 text-duo-cocoa-400'
  }
  return (
    <button
      type="button"
      onClick={handle}
      title={t.panels.copyTablesHint}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border transition ${cls}`}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
           strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="9" height="10" rx="1.5" />
        <path d="M4 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
      </svg>
      {label}
    </button>
  )
}

function ResultPanel() {
  const { dataset, activeAnalysis, t } = useApp()
  const analysisModule = activeAnalysis ? getAnalysisModule(activeAnalysis) : null
  const contentRef = useRef(null)

  if (!dataset) {
    return (
      <section className={`w-full md:flex-[45] md:min-w-0 p-4 md:p-6 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-duo-cream-50 md:overflow-y-auto`}>
        <PanelHeading>{t.panels.resultTitle}</PanelHeading>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <DuoMascot state="idle" size={96} />
          <div className="mt-5 font-serif text-xl font-semibold text-duo-cocoa-900">
            {t.panels.resultNoDataset}
          </div>
          <div className="mt-2 text-xs text-duo-cocoa-400 max-w-md">{t.app.tagline}</div>
        </div>
      </section>
    )
  }

  if (analysisModule?.Result) {
    return (
      <section className={`w-full md:flex-[45] md:min-w-0 p-4 md:p-6 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-duo-cream-50 md:overflow-y-auto`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="heading-eyebrow">{t.panels.resultTitle}</h2>
          <CopyTablesButton contentRef={contentRef} />
        </div>
        <AssumptionChecker />
        <div ref={contentRef}>
          <ErrorBoundary t={t} resetKey={activeAnalysis} where={t.panels.resultTitle}>
            <analysisModule.Result />
          </ErrorBoundary>
        </div>
      </section>
    )
  }

  if (activeAnalysis) {
    return (
      <section className={`w-full md:flex-[45] md:min-w-0 p-4 md:p-6 border-b md:border-b-0 md:border-r ${PANEL_BORDER} bg-duo-cream-50 md:overflow-y-auto`}>
        <PanelHeading>{t.panels.resultTitle}</PanelHeading>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <DuoMascot state="idle" size={72} />
          <div className="mt-4 font-serif text-base text-duo-cocoa-600">{t.panels.resultEmpty}</div>
        </div>
      </section>
    )
  }

  return (
    <section className={`flex-[45] min-w-0 p-6 border-r ${PANEL_BORDER} bg-duo-cream-50 overflow-y-auto`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="heading-eyebrow">{t.panels.resultTitle}</h2>
        <CopyTablesButton contentRef={contentRef} />
      </div>
      <div ref={contentRef}>
        <DataPreviewTable />
      </div>
    </section>
  )
}

/* ─────────────────────────  右欄  ───────────────────────── */

function ExplainPanel() {
  const { dataset, activeAnalysis, mode, t, explainCollapsed, toggleExplain } = useApp()
  const analysisModule = activeAnalysis ? getAnalysisModule(activeAnalysis) : null

  // 收起狀態：桌面顯示窄條，手機不渲染（手機本來就垂直堆疊，無需收起）
  if (explainCollapsed) {
    return (
      <section className="hidden md:flex w-7 shrink-0 bg-white flex-col items-center pt-3">
        <button
          type="button"
          onClick={toggleExplain}
          title={t.common?.expand || '展開'}
          className="p-1 text-duo-cocoa-400 hover:text-duo-amber-700 transition"
        >
          <PanelChevronLeft />
        </button>
      </section>
    )
  }

  // 收合鈕只收合方法說明欄自己；手機不顯示（收起後在手機上無法展開）
  const collapseBtn = (
    <button
      type="button"
      onClick={toggleExplain}
      title={t.common?.collapse || '收起'}
      className="hidden md:block absolute top-3 right-2 p-1 text-duo-cocoa-300 hover:text-duo-amber-700 transition z-10"
    >
      <PanelChevronRight />
    </button>
  )

  if (!dataset || !activeAnalysis) {
    return (
      <section className="w-full md:flex-[30] md:min-w-0 p-5 bg-white md:overflow-y-auto relative">
        {collapseBtn}
        <PanelHeading>{t.panels.explainTitle}</PanelHeading>
        <EmptyHint>{t.panels.explainEmpty}</EmptyHint>
      </section>
    )
  }

  if (analysisModule) {
    const Component = mode === 'teaching' ? analysisModule.Notes : analysisModule.Narrative
    return (
      <section className="w-full md:flex-[30] md:min-w-0 p-5 bg-white md:overflow-y-auto relative">
        {collapseBtn}
        <PanelHeading>{t.panels.explainTitle}</PanelHeading>
        {Component ? (
          <ErrorBoundary t={t} resetKey={`${activeAnalysis}:${mode}`} where={t.panels.explainTitle}>
            <Component />
          </ErrorBoundary>
        ) : (
          <EmptyHint>{t.panels.explainEmpty}</EmptyHint>
        )}
      </section>
    )
  }

  return (
    <section className="flex-[30] min-w-0 p-5 bg-white overflow-y-auto relative">
      {collapseBtn}
      <PanelHeading>{t.panels.explainTitle}</PanelHeading>
      <EmptyHint>
        {mode === 'teaching' ? t.panels.explainTeaching : t.panels.explainReport}
      </EmptyHint>
    </section>
  )
}

/* ─────────────────────────  整合  ───────────────────────── */

function MainContent() {
  const { dataset, activeAnalysis } = useApp()
  // 首頁模式：尚未載入資料且未選分析
  if (!dataset && !activeAnalysis) {
    return (
      <main className="flex-1 flex flex-col md:flex-row min-w-0">
        <HomePage />
      </main>
    )
  }
  return (
    <main className="flex-1 flex flex-col md:flex-row min-w-0">
      <ConfigPanel />
      <ResultPanel />
      <ExplainPanel />
    </main>
  )
}

export default MainContent
