/**
 * 頂部工具列
 *
 * 左側：brand（縮小版多多照片 + 中英文標題）
 * 右側：教學/報告模式切換、語言切換、示範資料集下拉、匯出按鈕
 */
import { useRef, useState } from 'react'
import duoHead from '../assets/duoduo-head.jpg'
import { useApp } from '../context/AppContext'
import { SUPPORTED_LANGUAGES, getStrings } from '../i18n'
import { DEMO_DATASETS, ANALYSIS_GROUPS } from '../config/analyses'
import { isAnalysisImplemented } from '../analyses/registry'
import { exportToPdf } from '../lib/pdfExport'
import { parseFile } from '../lib/fileParser'
import { fillTemplate } from '../lib/format'
import { useAutoClearTimer } from '../lib/hooks/useTimedFlash'
import TransformDialog from './TransformDialog'
import HistoryDialog from './HistoryDialog'
import { useToast } from '../context/toastContext'

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5">
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'px-3 py-1 text-xs font-medium rounded transition',
              active
                ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** 從 analysis id 取出 zh / en label（用於 PDF header） */
function findAnalysisLabels(activeAnalysis) {
  if (!activeAnalysis) return { zh: '—', en: '—' }
  for (const group of ANALYSIS_GROUPS) {
    const item = group.items.find(i => i.id === activeAnalysis)
    if (item) {
      return {
        zh: getStrings('zh-TW').sidebar[item.i18nKey] || activeAnalysis,
        en: getStrings('en').sidebar[item.i18nKey] || activeAnalysis,
      }
    }
  }
  return { zh: activeAnalysis, en: activeAnalysis }
}

function findDatasetLabels(activeDataset) {
  if (!activeDataset) return { zh: '—', en: '—' }
  return {
    zh: getStrings('zh-TW').datasets[activeDataset] || activeDataset,
    en: getStrings('en').datasets[activeDataset] || activeDataset,
  }
}

function TopToolbar() {
  const {
    lang, setLang,
    mode, setMode,
    activeDataset, setActiveDataset,
    activeAnalysis, setActiveAnalysis,
    uploadedDataset, setUploadedDataset,
    dataset,
    history,
    t,
    toggleSidebar,
  } = useApp()
  const { showToast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /** 點 brand → 回首頁：清空資料集與分析（保留上傳資料以避免使用者重傳） */
  const goHome = () => {
    setActiveAnalysis(null)
    setActiveDataset(null)
  }

  const [exporting, setExporting] = useState(false)
  const [transformOpen, setTransformOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [uploadStatus, setUploadStatus] = useState({ kind: 'idle', msg: '' })
  const [scheduleClearToast] = useAutoClearTimer()
  const fileInputRef = useRef(null)

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const formatWarning = (w) => {
    switch (w.code) {
      case 'decoded-as-big5':
        return t.toolbar.decodedAsBig5
      case 'encoding-suspect':
        return t.toolbar.encodingSuspect
      case 'ignored-sheets':
        return fillTemplate(t.toolbar.ignoredSheets, {
          used: w.meta?.used || '—',
          list: (w.meta?.ignored || []).join('、'),
        })
      case 'large-row-count':
        return fillTemplate(t.toolbar.largeRowCount, { n: w.meta?.n || 0 })
      default:
        return w.code
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允許重複選同一個檔
    if (!file) return
    setUploadStatus({ kind: 'parsing', msg: '' })
    try {
      const parsed = await parseFile(file)
      setUploadedDataset(parsed)
      const baseMsg = fillTemplate(t.toolbar.uploadSuccess, {
        n: parsed.rows.length,
        k: parsed.columns.length,
      })
      const warnings = parsed.warnings || []
      if (warnings.length === 0) {
        setUploadStatus({ kind: 'success', msg: baseMsg })
        scheduleClearToast(() => setUploadStatus({ kind: 'idle', msg: '' }), 3000)
      } else {
        const warnLines = warnings.map(formatWarning)
        const msg = `${baseMsg}\n${t.toolbar.warningsLabel}：\n· ${warnLines.join('\n· ')}`
        setUploadStatus({ kind: 'warning', msg })
        // 有警告時延長顯示時間（含 Big5 提示時讓使用者有時間看清楚）
        scheduleClearToast(() => setUploadStatus({ kind: 'idle', msg: '' }), 9000)
      }
    } catch (err) {
      let msg
      if (err.message === 'unsupported-format') {
        msg = fillTemplate(t.toolbar.unsupportedFormat, { ext: err.ext || '?' })
      } else if (err.message === 'file-too-large') {
        msg = fillTemplate(t.toolbar.fileTooLarge, {
          actual: err.actualMb || '?',
          max: err.maxMb || 50,
        })
      } else {
        msg = fillTemplate(t.toolbar.uploadError, { msg: err.message || String(err) })
      }
      setUploadStatus({ kind: 'error', msg })
      scheduleClearToast(() => setUploadStatus({ kind: 'idle', msg: '' }), 5000)
    }
  }

  // 副標若是英文（DUODUORUN）拉開字距，若是中文（多多快跑）保持正常字距
  const subtitleTracking = lang === 'zh-TW' ? 'tracking-[0.25em]' : 'tracking-normal'

  // 匯出條件：要有資料集 + 有選定的分析 + 該分析已實作
  const canExport =
    !!activeDataset && !!activeAnalysis && isAnalysisImplemented(activeAnalysis)

  const handleExport = async () => {
    if (!canExport || exporting) return
    const target = document.querySelector('main')
    if (!target) return
    setExporting(true)
    try {
      const ds = findDatasetLabels(activeDataset)
      const an = findAnalysisLabels(activeAnalysis)
      await exportToPdf({
        targetEl: target,
        headerData: {
          datasetZh: ds.zh,
          datasetEn: ds.en,
          analysisZh: an.zh,
          analysisEn: an.en,
          filename: activeAnalysis,
        },
      })
    } catch (err) {
      // 匯出是非同步流程，ErrorBoundary 攔不到 → 必須在此自行接住並回報
      console.error('Export failed:', err)
      showToast({
        tone: 'bad',
        title: t.errors.exportFailed,
        message: String(err?.message || err),
      })
    } finally {
      setExporting(false)
    }
  }

  // 資料集 chip 的「列數×欄數」（dataset 為套用 transforms 後的有效資料集）
  const dsRows = dataset?.rows?.length || 0
  const dsCols = dataset?.rows?.[0] ? Object.keys(dataset.rows[0]).length : 0

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-16 bg-white border-b border-duo-cocoa-100 relative">
      {/* 左：漢堡（手機）+ brand */}
      <div className="flex items-center gap-1 md:gap-0 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-duo-cocoa-700 hover:text-duo-amber-700 transition shrink-0"
          title={lang === 'zh-TW' ? '開啟分析選單' : 'Open analysis menu'}
          aria-label={t.toolbar.menuAria}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* brand（可點擊回首頁） */}
        <button
          type="button"
          onClick={goHome}
          title={lang === 'zh-TW' ? '回首頁' : 'Back to home'}
          className="flex items-center gap-3.5 group cursor-pointer hover:opacity-90 transition-opacity min-w-0"
        >
          <img
            src={duoHead}
            alt="多多"
            className="h-9 w-9 md:h-11 md:w-11 rounded-md object-cover ring-1 ring-duo-cocoa-100 group-hover:ring-duo-amber-400 transition shrink-0"
          />
          <div className="text-left min-w-0">
            <h1 className="font-serif text-[17px] md:text-[20px] font-semibold tracking-tight text-duo-cocoa-900 leading-none group-hover:text-duo-amber-700 transition truncate">
              {t.app.title}
            </h1>
            <p className={`font-mono text-[10px] uppercase text-duo-amber-700 mt-1.5 ${subtitleTracking} truncate`}>
              {t.app.subtitle}
            </p>
          </div>
        </button>
      </div>

      {/* 手機：工具下拉觸發按鈕 */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(v => !v)}
        className="md:hidden p-2 -mr-2 text-duo-cocoa-700 hover:text-duo-amber-700 transition shrink-0"
        title={lang === 'zh-TW' ? '工具' : 'Tools'}
        aria-label={t.toolbar.toolsAria}
        aria-expanded={mobileMenuOpen}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {/* 手機 dropdown backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 bg-black/30 z-20"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      {/* 右：控制群（桌面 inline；手機絕對定位 dropdown） */}
      <div
        className={[
          mobileMenuOpen ? 'flex' : 'hidden',
          'md:flex',
          'absolute md:static top-16 md:top-auto left-0 right-0',
          'bg-white md:bg-transparent',
          'border-b md:border-b-0 border-duo-cocoa-100',
          'p-4 md:p-0',
          'flex-col md:flex-row',
          'items-stretch md:items-center',
          'gap-3',
          'shadow-lg md:shadow-none',
          'z-30',
        ].join(' ')}
      >
        {/* 模式切換 */}
        <SegmentedControl
          options={[
            { value: 'teaching', label: t.modes.teaching },
            { value: 'report',   label: t.modes.report },
          ]}
          value={mode}
          onChange={setMode}
        />

        {/* 語言切換 */}
        <SegmentedControl
          options={SUPPORTED_LANGUAGES.map(l => ({ value: l.code, label: l.shortLabel }))}
          value={lang}
          onChange={setLang}
        />

        {/* 資料集 chip（終端機風：迷你 LED + mono；select 保留下拉功能） */}
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-duo-cocoa-100 bg-duo-cream-50 font-mono w-full md:w-auto min-w-0">
          <span
            aria-hidden
            className={[
              'w-1.5 h-1.5 rounded-full shrink-0 transition',
              dataset ? 'bg-duo-sig-ok shadow-led-ok' : 'bg-duo-cocoa-200',
            ].join(' ')}
          />
          <select
            aria-label={t.toolbar.selectDataset}
            value={activeDataset || ''}
            onChange={e => setActiveDataset(e.target.value || null)}
            className="h-full bg-transparent font-mono text-xs font-semibold text-duo-cocoa-800 focus-ring cursor-pointer min-w-0 flex-1 md:flex-none md:max-w-[150px]"
          >
            <option value="">{t.toolbar.selectDataset}</option>
            {uploadedDataset && (
              <optgroup label={t.toolbar.uploadedGroupLabel}>
                <option value="uploaded">
                  {fillTemplate(t.toolbar.uploadedLabel, { name: uploadedDataset.name })}
                </option>
              </optgroup>
            )}
            <optgroup label={t.toolbar.demoGroupLabel}>
              {DEMO_DATASETS.map(d => (
                <option key={d.id} value={d.id}>
                  {t.datasets[d.i18nKey]}
                </option>
              ))}
            </optgroup>
          </select>
          {dataset && dsRows > 0 && (
            <span className="text-[10px] text-duo-cocoa-400 whitespace-nowrap shrink-0">
              {dsRows}×{dsCols} · {t.toolbar.runsLocally}
            </span>
          )}
        </div>

        {/* 上傳檔案 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploadStatus.kind === 'parsing'}
          className={[
            'h-8 px-3 text-xs font-medium rounded-md border transition',
            uploadStatus.kind === 'parsing'
              ? 'bg-duo-cream-50 border-duo-cocoa-100 text-duo-cocoa-400 cursor-wait'
              : 'bg-white border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-300 cursor-pointer',
          ].join(' ')}
          title={t.toolbar.uploadHint}
        >
          {uploadStatus.kind === 'parsing' ? t.toolbar.uploadingFile : `↑ ${t.toolbar.uploadData}`}
        </button>

        {/* 變數轉換按鈕 */}
        <button
          type="button"
          disabled={!activeDataset}
          onClick={() => setTransformOpen(true)}
          className={[
            'h-8 px-3 text-xs font-medium rounded-md border transition',
            activeDataset
              ? 'bg-white border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-300 cursor-pointer'
              : 'bg-duo-cream-50 border-duo-cocoa-100 text-duo-cocoa-300 cursor-not-allowed',
          ].join(' ')}
          title={
            activeDataset
              ? t.transform.title
              : (lang === 'zh-TW' ? '需先載入資料集' : 'Load a dataset first')
          }
        >
          + {t.variables.addTransform}
        </button>

        {/* 歷史按鈕 */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="h-8 px-3 text-xs font-medium rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-300 cursor-pointer transition"
          title={t.history.title}
        >
          {t.history.title}
          {history.length > 0 && (
            <span className="ml-1.5 font-mono px-1.5 py-0.5 text-[10px] rounded bg-duo-amber-100 text-duo-amber-800">
              {history.length}
            </span>
          )}
        </button>

        {/* 匯出按鈕 */}
        <button
          type="button"
          disabled={!canExport || exporting}
          onClick={handleExport}
          className={[
            'h-8 px-3 text-xs font-medium rounded-md transition',
            !canExport || exporting
              ? 'bg-duo-cream-100 text-duo-cocoa-300 border border-duo-cocoa-100 cursor-not-allowed'
              : 'bg-duo-cocoa-900 text-duo-cream-50 hover:bg-duo-cocoa-800 cursor-pointer',
          ].join(' ')}
          title={
            exporting
              ? (lang === 'zh-TW' ? '正在匯出 PDF...' : 'Exporting PDF...')
              : !canExport
                ? (lang === 'zh-TW' ? '需先選擇資料集與分析方法' : 'Select a dataset and analysis first')
                : t.toolbar.export
          }
        >
          {exporting
            ? (lang === 'zh-TW' ? '匯出中…' : 'Exporting…')
            : t.toolbar.export}
        </button>
      </div>

      <TransformDialog open={transformOpen} onClose={() => setTransformOpen(false)} />
      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* 上傳狀態 toast — 短暫顯示成功 / 警告 / 錯誤訊息 */}
      {uploadStatus.kind !== 'idle' && uploadStatus.msg && (
        <div
          className={[
            'fixed top-20 right-4 md:right-6 left-4 md:left-auto z-40 px-4 py-2 rounded-md text-xs shadow-md border md:max-w-sm whitespace-pre-line leading-relaxed',
            uploadStatus.kind === 'success'
              ? 'bg-duo-leaf/10 border-duo-leaf text-duo-cocoa-800'
              : uploadStatus.kind === 'warning'
                ? 'bg-duo-amber-50 border-duo-amber-400 text-duo-cocoa-800'
                : 'bg-duo-tongue/15 border-duo-tongue text-duo-cocoa-800',
          ].join(' ')}
        >
          {uploadStatus.msg}
        </div>
      )}
    </header>
  )
}

export default TopToolbar
