import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runLogisticRegression } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels = dataset.valueLabels?.[result.yVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sig = result.fit.lrP < 0.05
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const predictors = result.xVars.map((c) => labelMap[c] || c).join(conjunction)
  const yLabel = labelMap[result.yVar] || result.yVar
  const posClass = valueLabels[result.positiveClass] || result.positiveClass

  if (!sig) {
    return fillTemplate(t.logReg.apa.sentenceNs, {
      predictors, yLabel,
      df: result.fit.lrDf,
      n: result.n,
      chi2: fmtNum(result.fit.lrStat, 3),
      pStr: fmtP(result.fit.lrP),
      nagelkerke: fmtNum(result.fit.nagelkerke, 3),
    })
  }

  const sigCoefs = result.coefficients.filter((c) => c.p < 0.05)
  let coefList = ''
  if (sigCoefs.length > 0) {
    const parts = sigCoefs.map((co) =>
      fillTemplate(t.logReg.apa.coefSig, {
        name: labelMap[co.name] || co.name,
        or: fmtNum(co.or, 3),
        ciLow: fmtNum(co.orCI[0], 3),
        ciHigh: fmtNum(co.orCI[1], 3),
        z: fmtNum(co.z, 3),
        pStr: fmtP(co.p),
      })
    )
    const joiner = lang === 'zh-TW' ? '；' : '; '
    const ending = lang === 'zh-TW' ? '達到顯著。' : 'were significant.'
    coefList = t.logReg.apa.coefOpener + parts.join(joiner) + ' ' + ending
  }

  return fillTemplate(t.logReg.apa.sentence, {
    predictors, yLabel, posClass,
    sigWord: sig ? t.ttest.apa.sigYes : t.ttest.apa.sigNo,
    df: result.fit.lrDf,
    n: result.n,
    chi2: fmtNum(result.fit.lrStat, 3),
    pStr: fmtP(result.fit.lrP),
    nagelkerke: fmtNum(result.fit.nagelkerke, 3),
    coefList,
    auc: fmtNum(result.roc.auc, 3),
    correctPct: (result.classification.correctPercent * 100).toFixed(1),
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runLogisticRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.logReg.config[result.error] || t.errors.stats[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.logReg.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.logReg.apa.copyHint} />
    </div>
  )
}

export default Narrative
