/**
 * LDA — Narrative（報告模式右欄）
 *
 * APA narrative covering:
 *   - test of the first / overall discriminant function (Wilks' Λ + χ²)
 *   - canonical correlation, % of variance
 *   - resubstitution classification accuracy
 *   - Box's M result
 *
 * One-click copy in 中文 / English.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runLDA } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const predictorList = result.predictors.map((v) => labelMap[v] || v)
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const predictorJoined = predictorList.join(conjunction)
  const groupLabel = labelMap[result.groupVar] || result.groupVar

  const f1 = result.functions[0]
  const sig = Number.isFinite(f1?.p) && f1.p < 0.05

  // Box's M section
  let boxSection = ''
  if (result.boxM?.applicable) {
    const tpl = result.boxM.p <= 0.001 ? t.lda.apa.boxBad : t.lda.apa.boxOk
    boxSection = fillTemplate(tpl, {
      chi2: fmtNum(result.boxM.chi2, 2),
      df: result.boxM.df,
      pStr: fmtP(result.boxM.p),
    })
  } else {
    boxSection = t.lda.apa.boxNotApplicable
  }

  const data = {
    group: groupLabel,
    predictorList: predictorJoined,
    p: result.p,
    k: result.k,
    n: result.n,
    nFns: result.functions.length,
    f1Lambda: fmtNum(f1?.wilksLambda, 3),
    f1Chi2: fmtNum(f1?.chi2, 2),
    f1Df: f1?.df ?? '—',
    f1Pstr: fmtP(f1?.p),
    f1CanR: fmtNum(f1?.canonicalCorrelation, 3),
    f1Eig: fmtNum(f1?.eigenvalue, 3),
    f1PctVar: Number.isFinite(f1?.proportionOfVariance)
      ? fmtNum(f1.proportionOfVariance * 100, 1)
      : '—',
    accPct: fmtNum(result.classification.overallAccuracy * 100, 2),
    boxSection,
  }

  const tpl = sig ? t.lda.apa.sentence : t.lda.apa.sentenceNs
  return fillTemplate(tpl, data)
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runLDA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.lda.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.lda.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.lda.apa.copyHint} />
    </div>
  )
}

export default Narrative
