import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runTwoWayAnova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang, settings) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sigA = result.effectA.p < 0.05
  const sigB = result.effectB.p < 0.05
  const sigAB = result.effectAB.p < 0.05
  return fillTemplate(t.anova2.apa.sentence, {
    factorA: labelMap[settings.factorA] || settings.factorA,
    factorB: labelMap[settings.factorB] || settings.factorB,
    df1A: result.effectA.df,
    df1B: result.effectB.df,
    df1AB: result.effectAB.df,
    df2: result.error.df,
    fA: fmtNum(result.effectA.F, 3),
    fB: fmtNum(result.effectB.F, 3),
    fAB: fmtNum(result.effectAB.F, 3),
    pA: fmtP(result.effectA.p),
    pB: fmtP(result.effectB.p),
    pAB: fmtP(result.effectAB.p),
    peA: fmtNum(result.effectA.partialEta2, 3),
    peB: fmtNum(result.effectB.partialEta2, 3),
    peAB: fmtNum(result.effectAB.partialEta2, 3),
    sigA: sigA ? t.anova2.apa.sigYes : t.anova2.apa.sigNo,
    sigB: sigB ? t.anova2.apa.sigYes : t.anova2.apa.sigNo,
    sigAB: sigAB ? t.anova2.apa.sigYes : t.anova2.apa.sigNo,
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
  const result = useMemo(() => (dataset ? runTwoWayAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.anova2.config[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW', state)
  const enText = buildNarrative(result, dataset, 'en', state)
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.anova2.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.anova2.apa.copyHint} />
    </div>
  )
}

export default Narrative
