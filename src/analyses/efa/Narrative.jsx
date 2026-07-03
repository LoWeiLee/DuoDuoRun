import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
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
