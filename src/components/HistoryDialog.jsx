/**
 * HistoryDialog — 分析歷史 modal
 *
 * 結構：
 *   頂部：「釘選目前分析」按鈕（無有效分析時禁用）
 *   中間：快照列表（最新在最上）
 *   底部：全部清空 + 關閉
 *
 * 每筆快照：
 *   - 分析名（中英）+ 資料集名（依目前語言）
 *   - 設定摘要（key=value 串）
 *   - 是否帶有變數轉換
 *   - 相對時間
 *   - 還原 / 移除按鈕
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ANALYSIS_GROUPS } from '../config/analyses'
import { getStrings } from '../i18n'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'

function findAnalysisLabel(analysisId, lang) {
  const t = getStrings(lang)
  for (const group of ANALYSIS_GROUPS) {
    const item = group.items.find((i) => i.id === analysisId)
    if (item) return t.sidebar[item.i18nKey] || analysisId
  }
  return analysisId
}

function findDatasetLabel(datasetId, lang) {
  const t = getStrings(lang)
  return t.datasets[datasetId] || datasetId
}

function formatSettingsBrief(settings, lang) {
  if (!settings) return ''
  const entries = Object.entries(settings)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}=[${v.join(', ')}]`
      if (typeof v === 'object') return `${k}=…`
      return `${k}=${v}`
    })
  if (entries.length === 0) return lang === 'zh-TW' ? '（未設定）' : '(empty)'
  return entries.join(', ')
}

function formatTimeAgo(ts, t) {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return t.history.timeAgo.seconds.replace('{n}', sec)
  const min = Math.floor(sec / 60)
  if (min < 60) return t.history.timeAgo.minutes.replace('{n}', min)
  const hr = Math.floor(min / 60)
  if (hr < 24) return t.history.timeAgo.hours.replace('{n}', hr)
  const day = Math.floor(hr / 24)
  return t.history.timeAgo.days.replace('{n}', day)
}

function HistoryDialog({ open, onClose }) {
  const {
    history,
    activeDataset, activeAnalysis,
    pushSnapshot, restoreSnapshot, removeSnapshot, clearHistory,
    lang, t,
  } = useApp()

  // 清空全部歷史：原本走瀏覽器原生 confirm()，改為可 i18n、可鍵盤操作的 ConfirmDialog
  const [confirmClear, setConfirmClear] = useState(false)

  const canSave = !!activeDataset && !!activeAnalysis

  const handleSave = () => {
    if (!canSave) return
    pushSnapshot()
  }

  const handleRestore = (id) => {
    if (restoreSnapshot(id)) onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t.history.title}
        titleExtra={
          <span className="ml-2 text-xs font-normal text-duo-cocoa-400">
            ({history.length})
          </span>
        }
        labels={{ close: t.common.close }}
        maxWidth="max-w-2xl"
        footer={
          history.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="rounded-md px-2 py-1 text-xs text-duo-tongue hover:underline focus-ring-bad"
            >
              {t.history.clearAllBtn}
            </button>
          ) : null
        }
      >
        {/* 釘選目前 */}
        <div className="px-5 py-4 border-b border-duo-cream-200 bg-duo-cream-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-duo-cocoa-800">
                {t.history.saveCurrent}
              </div>
              <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">
                {canSave ? t.history.saveCurrentHint : t.history.needSetup}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={[
                'shrink-0 h-8 px-3 text-xs font-medium rounded-lg transition',
                canSave
                  ? 'bg-duo-amber-500 text-white hover:bg-duo-amber-600'
                  : 'bg-duo-cream-100 text-duo-cocoa-300 cursor-not-allowed',
              ].join(' ')}
            >
              📌 {lang === 'zh-TW' ? '釘選' : 'Pin'}
            </button>
          </div>
        </div>

        {/* 快照列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {history.length === 0 ? (
            <p className="text-sm text-duo-cocoa-400 text-center py-8">
              {t.history.empty}
            </p>
          ) : (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-3">
                {t.history.listTitle}
              </h3>
              <ul className="space-y-2">
                {history.map((snap) => {
                  const analysisLabel = findAnalysisLabel(snap.analysisId, lang)
                  const datasetLabel = findDatasetLabel(snap.datasetId, lang)
                  const brief = formatSettingsBrief(snap.settings, lang)
                  const hasTransforms = snap.transforms?.length > 0
                  return (
                    <li
                      key={snap.id}
                      className="px-4 py-3 rounded-lg border border-duo-cream-200 bg-white hover:bg-duo-cream-50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-duo-cocoa-800">
                            {analysisLabel}
                            <span className="text-duo-cocoa-300 mx-2">·</span>
                            <span className="text-duo-cocoa-600">{datasetLabel}</span>
                            {hasTransforms && (
                              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-medium rounded bg-duo-amber-100 text-duo-amber-800">
                                {t.variables.transformed} ({snap.transforms.length})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-duo-cocoa-500 mt-1 truncate">
                            {brief}
                          </div>
                          <div className="text-[10px] text-duo-cocoa-400 mt-1">
                            {formatTimeAgo(snap.timestamp, t)}
                            <span className="text-duo-cocoa-300 mx-1.5">·</span>
                            {t.modes[snap.mode]} · {snap.lang}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRestore(snap.id)}
                            className="h-7 px-2.5 text-[11px] font-medium rounded-md bg-white border border-duo-amber-300 text-duo-amber-700 hover:bg-duo-amber-50 transition"
                          >
                            {t.history.restoreBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSnapshot(snap.id)}
                            className="text-xs text-duo-tongue hover:text-duo-cocoa-700 px-2 py-1 rounded hover:bg-duo-tongue/15"
                            title={t.history.removeBtn}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => { clearHistory(); setConfirmClear(false) }}
        title={t.history.clearAllBtn}
        message={t.history.clearConfirm}
        confirmLabel={t.history.clearAllBtn}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        destructive
      />
    </>
  )
}

export default HistoryDialog
