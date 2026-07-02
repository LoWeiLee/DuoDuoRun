import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runEFA } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function kmoInterpKey(kmo) {
  if (!Number.isFinite(kmo)) return null
  if (kmo < 0.5) return 'unacceptable'
  if (kmo < 0.6) return 'miserable'
  if (kmo < 0.7) return 'mediocre'
  if (kmo < 0.8) return 'middling'
  if (kmo < 0.9) return 'meritorious'
  return 'marvelous'
}

function buildNarrative(result, lang) {
  const t = getStrings(lang)
  const ki = result.kmo ? kmoInterpKey(result.kmo.overall) : null
  const kmoInterp = ki ? t.efa.result.kmoInterp[ki] : '—'
  const kmoVal = result.kmo ? fmtNum(result.kmo.overall, 3) : '—'
  const cumPct = result.varianceExplained.cumulative[result.nFactors - 1]
  const suitable = result.kmo && result.kmo.overall >= 0.6 && result.bartlett.p < 0.05
  if (suitable) {
    return fillTemplate(t.efa.apa.sentence, {
      p: result.p,
      kmo: kmoVal,
      kmoInterp,
      df: result.bartlett.df,
      n: result.n,
      chi2: fmtNum(result.bartlett.chi2, 2),
      pStr: fmtP(result.bartlett.p),
      k: result.nFactors,
      cumPct: fmtNum(cumPct, 1),
    })
  }
  return fillTemplate(t.efa.apa.sentenceUnsuit, {
    p: result.p,
    kmo: kmoVal,
    kmoInterp,
    suitWord: lang === 'zh-TW' ? '不佳' : 'poor',
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
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runEFA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.efa.config[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, 'zh-TW')
  const enText = buildNarrative(result, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.efa.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.efa.apa.copyHint} />
    </div>
  )
}

export default Narrative
