import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
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
    df2: result.errorTerm.df,
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

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runTwoWayAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.anova2.config[result.error] || t.errors.stats[result.error] || result.error}</div>
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
