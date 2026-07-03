/**
 * 多元迴歸 — Narrative（報告模式右欄）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runMultipleRegression } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const reg = result.reg
  const sig = reg.anova.p < 0.05
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const predictors = result.xVars.map((c) => labelMap[c] || c).join(conjunction)
  const yLabel = labelMap[result.yVar] || result.yVar

  if (!sig) {
    return fillTemplate(t.multReg.apa.sentenceNs, {
      predictors, yLabel,
      df1: reg.anova.dfReg, df2: reg.anova.dfRes,
      f: fmtNum(reg.anova.F, 3),
      pStr: fmtP(reg.anova.p),
      r2: fmtNum(reg.fit.r2, 3),
      adjR2: fmtNum(reg.fit.adjR2, 3),
    })
  }

  // 顯著時：列出個別顯著係數
  const sigCoefs = reg.coefficients.filter((c) => c.p < 0.05)
  let coefList = ''
  if (sigCoefs.length > 0) {
    const parts = sigCoefs.map((co) =>
      fillTemplate(t.multReg.apa.coefSig, {
        name: labelMap[co.name] || co.name,
        b: fmtNum(co.b, 3),
        se: fmtNum(co.se, 3),
        beta: fmtNum(co.beta, 3),
        t: fmtNum(co.t, 3),
        pStr: fmtP(co.p),
      })
    )
    const joiner = lang === 'zh-TW' ? '；' : '; '
    const ending = lang === 'zh-TW' ? '達到顯著。' : 'were significant.'
    coefList = t.multReg.apa.coefOpener + parts.join(joiner) + ' ' + ending
  }

  return fillTemplate(t.multReg.apa.sentence, {
    predictors, yLabel,
    sigWord: sig ? t.ttest.apa.sigYes : t.ttest.apa.sigNo,
    df1: reg.anova.dfReg, df2: reg.anova.dfRes,
    f: fmtNum(reg.anova.F, 3),
    pStr: fmtP(reg.anova.p),
    r2: fmtNum(reg.fit.r2, 3),
    adjR2: fmtNum(reg.fit.adjR2, 3),
    coefList,
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runMultipleRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.multReg.config[result.error] || result.error
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
        copyHint={zh.multReg.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.multReg.apa.copyHint} />
    </div>
  )
}

export default Narrative
