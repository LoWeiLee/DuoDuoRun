/**
 * MANOVA — Narrative（報告模式右欄）
 *
 * Default reports Wilks' Λ and mentions Box's M. APA narrative with
 * one-click copy in 中文 / English.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runManova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const dvList = result.dvVars.map((v) => labelMap[v] || v)
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const dvJoined = dvList.join(conjunction)
  const factorLabel = labelMap[result.factorVar] || result.factorVar

  const sig = Number.isFinite(result.wilks.p) && result.wilks.p < 0.05

  // Box's M section
  let boxSection = ''
  if (result.boxM?.applicable) {
    const tpl = result.boxM.p <= 0.001 ? t.manova.apa.boxBad : t.manova.apa.boxOk
    boxSection = fillTemplate(tpl, {
      chi2: fmtNum(result.boxM.chi2, 2),
      df: result.boxM.df,
      pStr: fmtP(result.boxM.p),
    })
  } else {
    boxSection = t.manova.apa.boxNotApplicable
  }

  // Pillai 附加（在 Box's M 違反時優先報 Pillai；這裡也順帶帶出）
  const pillaiSection = fillTemplate(t.manova.apa.pillaiLine, {
    v: fmtNum(result.pillai.v, 3),
    df1: fmtNum(result.pillai.df1, 2),
    df2: fmtNum(result.pillai.df2, 2),
    f: fmtNum(result.pillai.f, 3),
    pStr: fmtP(result.pillai.p),
    eta2: fmtNum(result.pillai.eta2, 3),
  })

  const data = {
    factor: factorLabel,
    dvList: dvJoined,
    p: result.p,
    k: result.k,
    n: result.n,
    lambda: fmtNum(result.wilks.lambda, 3),
    wDf1: fmtNum(result.wilks.df1, 2),
    wDf2: fmtNum(result.wilks.df2, 2),
    wF: fmtNum(result.wilks.f, 3),
    wPstr: fmtP(result.wilks.p),
    wEta2: fmtNum(result.wilks.eta2, 3),
    pillaiSection,
    boxSection,
  }

  const tpl = sig ? t.manova.apa.sentence : t.manova.apa.sentenceNs
  return fillTemplate(tpl, data)
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runManova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.manova.errors[result.error] || result.error
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
        copyHint={zh.manova.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.manova.apa.copyHint} />
    </div>
  )
}

export default Narrative
