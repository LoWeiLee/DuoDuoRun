import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runNonparametric } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function effectKey(r) {
  if (!Number.isFinite(r)) return null
  const a = Math.abs(r)
  if (a < 0.3) return 'small'
  if (a < 0.5) return 'medium'
  return 'large'
}

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sig = result.p < 0.05
  const sigWord = sig ? t.np.apa.sigYes : t.np.apa.sigNo

  if (result.type === 'mw') {
    const valueLabels = dataset.valueLabels?.[result.groupVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const ek = effectKey(result.r)
    return fillTemplate(t.np.apa.mw, {
      depLabel: labelMap[result.depVar] || result.depVar,
      g1Name: valueLabels[result.g1Name] || result.g1Name,
      g2Name: valueLabels[result.g2Name] || result.g2Name,
      u: fmtNum(result.U, 1),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      r: fmtNum(result.r, 3),
      effect: ek ? t.np.result.effect[ek] : '—',
      sigWord,
    })
  }
  if (result.type === 'wilcoxon') {
    const ek = effectKey(result.r)
    return fillTemplate(t.np.apa.wilcoxon, {
      var1Name: labelMap[result.var1] || result.var1,
      var2Name: labelMap[result.var2] || result.var2,
      t: fmtNum(result.T, 1),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      n: result.n,
      nDropped: result.nDropped,
      r: fmtNum(result.r, 3),
      effect: ek ? t.np.result.effect[ek] : '—',
      sigWord,
    })
  }
  // kw
  const kwText = fillTemplate(t.np.apa.kw, {
    factor: labelMap[result.factor] || result.factor,
    depLabel: labelMap[result.depVar] || result.depVar,
    df: result.df,
    n: result.N,
    h: fmtNum(result.H, 3),
    pStr: fmtP(result.p),
    eps2: fmtNum(result.epsilon2, 3),
    sigWord,
  })
  if (result.dunn && result.dunn.comparisons) {
    const valueLabels = dataset.valueLabels?.[result.factor]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const labelOf = (n) => valueLabels[n] || n
    const sigPairs = result.dunn.comparisons
      .filter((c) => c.pAdj < 0.05)
      .map((c) => `${labelOf(c.groupA)} vs. ${labelOf(c.groupB)} (p = ${fmtP(c.pAdj)})`)
    const sigPairsStr = sigPairs.length > 0 ? sigPairs.join('、') : t.np.narrative.dunnNoSig
    const dunnLine = fillTemplate(t.np.narrative.dunnLine, {
      m: result.dunn.m,
      sigPairs: sigPairsStr,
    })
    return kwText + ' ' + dunnLine
  }
  return kwText
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runNonparametric(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.np.config[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.np.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.np.apa.copyHint} />
    </div>
  )
}

export default Narrative
