/**
 * NCA — Narrative（報告模式右欄）：中英 APA 敘述。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runNCACompute } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const nca = result.nca
  const ce = nca.ceilings.ce_fdh
  const cr = nca.ceilings.cr_fdh
  const p = nca.test ? nca.test.p_ce : NaN
  const sig = Number.isFinite(p) && p < 0.05 && ce.effectSize >= 0.1
  const template = sig ? t.nca.apa.sentence : t.nca.apa.sentenceNs

  return fillTemplate(template, {
    xLabel: labelMap[result.xVar] || result.xVar,
    yLabel: labelMap[result.yVar] || result.yVar,
    dCe: fmtNum(ce.effectSize, 3),
    dCr: fmtNum(cr.effectSize, 3),
    effectWord: t.nca.effect[ce.effectLabel] || ce.effectLabel,
    pStr: fmtP(p),
    n: nca.n,
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runNCACompute(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.nca.config[result.error] || t.errors.stats[result.error] || result.error
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
        copyHint={zh.nca.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.nca.apa.copyHint} />
    </div>
  )
}

export default Narrative
