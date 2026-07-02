/**
 * Cronbach's α — Narrative（報告模式右欄）
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCronbachAlpha } from './compute'
import { alphaInterpretationKey } from '../../lib/stats/alpha'
import { fmtNum, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, settings, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const ik = alphaInterpretationKey(result.alpha)
  const interp = ik ? t.alpha.interpretation[ik] : '—'

  const cols = settings?.selectedVars || []
  const itemList = cols.map((c) => labelMap[c] || c).join('、')
  const itemListEn = cols.map((c) => labelMap[c] || c).join(', ')

  return fillTemplate(t.alpha.apa.sentence, {
    itemList: lang === 'zh-TW' ? itemList : itemListEn,
    k: result.k,
    n: result.n,
    alpha: fmtNum(result.alpha, 3),
    interp,
    meanInter: fmtNum(result.meanInterItemCorr, 3),
  })
}

function CopyButton({ text, label, hint }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" onClick={handleCopy} title={hint}
      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition">
      {copied ? label.copied : label.copy}
    </button>
  )
}

function NarrativeBlock({ heading, text, copyLabel, copyHint }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">{heading}</h4>
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
  const result = useMemo(() => (dataset ? runCronbachAlpha(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.alpha[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, state, 'zh-TW')
  const enText = buildNarrative(result, dataset, state, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.alpha.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.alpha.apa.copyHint} />
    </div>
  )
}

export default Narrative
