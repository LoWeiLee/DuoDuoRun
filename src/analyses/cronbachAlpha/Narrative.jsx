/**
 * Cronbach's α — Narrative（報告模式右欄）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runCronbachAlpha } from './compute'
import { alphaInterpretationKey } from '../../lib/stats/alpha'
import { fmtNum, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, settings, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const ik = alphaInterpretationKey(result.alpha)
  const interp = ik ? t.alpha.interpretation[ik] : '—'

  const cols = settings?.selectedVars || []
  const itemList = cols.map((c) => labelMap[c] || c).join('、')
  const itemListEn = cols.map((c) => labelMap[c] || c).join(', ')

  return fillTemplate(t.alpha.apa.sentence, {
    itemList: lang === 'zh-TW' ? itemList : itemListEn,
    k: result.k,
    n: result.n,
    alpha: fmtNum(result.alpha, 3),
    interp,
    meanInter: fmtNum(result.meanInterItemCorr, 3),
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCronbachAlpha(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.alpha[result.error] || t.errors.stats[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, state, 'zh-TW')
  const enText = buildNarrative(result, dataset, state, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.alpha.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.alpha.apa.copyHint} />
    </div>
  )
}

export default Narrative
