/**
 * 簡單迴歸 — Narrative（報告模式右欄）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runSimpleRegression } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const reg = result.reg
  const sig = reg.anova.p < 0.05
  const template = sig ? t.simpleReg.apa.sentence : t.simpleReg.apa.sentenceNs

  return fillTemplate(template, {
    yLabel: labelMap[result.yVar] || result.yVar,
    xLabel: labelMap[result.xVar] || result.xVar,
    df1: reg.anova.dfReg,
    df2: reg.anova.dfRes,
    f: fmtNum(reg.anova.F, 3),
    pStr: fmtP(reg.anova.p),
    r2: fmtNum(reg.fit.r2, 3),
    adjR2: fmtNum(reg.fit.adjR2, 3),
    b0: fmtNum(reg.intercept.b, 3),
    b1: fmtNum(reg.slope.b, 3),
    beta: fmtNum(reg.slope.beta, 3),
    t: fmtNum(reg.slope.t, 3),
    pStrSlope: fmtP(reg.slope.p),
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runSimpleRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.simpleReg.config[result.error] || result.error
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
        copyHint={zh.simpleReg.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.simpleReg.apa.copyHint} />
    </div>
  )
}

export default Narrative
