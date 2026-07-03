/**
 * 假設前提概覽 — 在 ResultPanel 頂端顯示
 *
 * 自動依 activeAnalysis + 當前 settings 跑 runAssumptionChecks，列出綠/黃/紅燈號。
 * 若該 analysis 無自動檢查項，整個元件不渲染（避免畫面空白噪音）。
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { runAssumptionChecks } from '../lib/assumptionChecker'

// LED 燈號（2026-07 UI 改版：發光圓點，統一綠黃紅語意）
const STATUS_COLORS = {
  ok:   'bg-duo-sig-ok shadow-led-ok',
  warn: 'bg-duo-sig-warn shadow-led-warn',
  fail: 'bg-duo-sig-bad shadow-led-bad',
  info: 'bg-duo-denim-500 shadow-led-info',
  skip: 'bg-duo-cocoa-300',
}

const STATUS_TEXT_COLORS = {
  ok:   'text-duo-sig-ok',
  warn: 'text-duo-sig-warn',
  fail: 'text-duo-sig-bad',
  info: 'text-duo-denim-600',
  skip: 'text-duo-cocoa-400',
}

function AssumptionChecker() {
  const { dataset, activeAnalysis, getAnalysisState, t } = useApp()
  const [expanded, setExpanded] = useState(true)

  if (!dataset || !activeAnalysis) return null
  const settings = getAnalysisState(activeAnalysis)
  let checks
  try {
    checks = runAssumptionChecks(activeAnalysis, dataset, settings, t.panels)
  } catch {
    return null
  }
  if (!checks || checks.length === 0) return null

  // 摘要：依嚴重度排序顯示計數
  const counts = checks.reduce((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {})
  const summary = []
  for (const s of ['fail', 'warn', 'ok', 'skip']) {
    if (counts[s]) summary.push(
      <span key={s} className={STATUS_TEXT_COLORS[s]}>
        {counts[s]} {t.panels.assumpStatus?.[s] || s}
      </span>
    )
  }

  return (
    <div className="mb-4 bg-white rounded-lg border border-duo-cocoa-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-duo-cream-50/60 hover:bg-duo-cream-100 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-duo-cocoa-600 shrink-0">
            {t.panels.assumpTitle}
          </h3>
          <span className="text-[11px] text-duo-cocoa-500 truncate flex items-center gap-2">
            {summary.length > 0 && summary.reduce((acc, item, i) => {
              if (i === 0) return [item]
              return [...acc, <span key={`sep-${i}`} className="text-duo-cocoa-200">·</span>, item]
            }, [])}
          </span>
        </div>
        <span className="text-duo-cocoa-400 text-base font-light leading-none">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <ul className="px-3 py-2.5 space-y-1.5">
          {checks.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-duo-cocoa-100 bg-duo-cream-50/70 px-3 py-2"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[c.status]}`}
                  title={t.panels.assumpStatus?.[c.status] || c.status}
                />
                <span className="text-xs font-medium text-duo-cocoa-800">{c.label}</span>
              </span>
              <span className="font-mono text-[11px] text-duo-cocoa-500 leading-snug ml-auto text-right whitespace-nowrap">
                {c.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AssumptionChecker
