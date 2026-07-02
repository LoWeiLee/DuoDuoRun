/**
 * 敘述統計 — Narrative（報告模式右欄）
 *
 * 顯示中英文 APA 敘述各一段（可同時呈現），各帶獨立的「複製」按鈕。
 * 沒勾選變數時提示。
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runDescriptive } from './compute'
import { fmtNum, fmtInt, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(results, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sentences = results.map((r) =>
    fillTemplate(t.desc.apa.sentence, {
      label: labelMap[r.col] || r.col,
      n: fmtInt(r.n),
      m: fmtNum(r.mean, 2),
      sd: fmtNum(r.sd, 2),
      min: fmtNum(r.min, 0),
      max: fmtNum(r.max, 0),
      median: fmtNum(r.median, 2),
      skew: fmtNum(r.skewness, 2),
      kurt: fmtNum(r.kurtosis, 2),
    })
  )
  return sentences.join(' ')
}

function CopyButton({ text, label, hint }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      // navigator.clipboard 可能在非 https 或不支援的環境失敗，做 fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={hint}
      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
    >
      {copied ? label.copied : label.copy}
    </button>
  )
}

function NarrativeBlock({ heading, text, copyLabel, copyHint }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
          {heading}
        </h4>
        <CopyButton text={text} label={copyLabel} hint={copyHint} />
      </div>
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const selectedVars = state.selectedVars || []

  const results = useMemo(
    () => (dataset && selectedVars.length > 0 ? runDescriptive(dataset.rows, selectedVars) : null),
    [dataset, selectedVars])

  if (!dataset || selectedVars.length === 0) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.desc.noVarsSelected}
      </div>
    )
  }
  const zhText = buildNarrative(results, dataset, 'zh-TW')
  const enText = buildNarrative(results, dataset, 'en')

  const zhStrings = getStrings('zh-TW')
  const enStrings = getStrings('en')

  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zhStrings.common.copy, copied: zhStrings.common.copied }}
        copyHint={zhStrings.desc.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: enStrings.common.copy, copied: enStrings.common.copied }}
        copyHint={enStrings.desc.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
