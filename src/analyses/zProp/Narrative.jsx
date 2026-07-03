/**
 * z 檢定（比例）— 報告模式（APA 敘述）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runZProp } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

function Narrative() {
  const { dataset, lang, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runZProp(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) return <div className="text-xs text-duo-cocoa-400">—</div>

  let text
  if (result.type === 'one') {
    const valueLabels = dataset.valueLabels?.[state.var1]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const successLabel = valueLabels[result.successLevel] || result.successLevel
    text = fillTemplate(t.zProp.narrative.one, {
      success: successLabel,
      n: result.n, x: result.x,
      phat: fmtNum(result.phat, 3),
      p0: fmtNum(result.p0, 3),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      ciLow: fmtNum(result.ciLow, 3),
      ciHigh: fmtNum(result.ciHigh, 3),
    })
  } else {
    const groupLabels = dataset.valueLabels?.[state.groupVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const valueLabels = dataset.valueLabels?.[state.valueVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    text = fillTemplate(t.zProp.narrative.two, {
      g1: groupLabels[result.g1Name] || result.g1Name,
      g2: groupLabels[result.g2Name] || result.g2Name,
      success: valueLabels[result.successLevel] || result.successLevel,
      n1: result.n1, n2: result.n2,
      p1: fmtNum(result.p1, 3),
      p2: fmtNum(result.p2, 3),
      diff: fmtNum(result.diff, 3),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      h: fmtNum(result.h, 3),
      diffCiLow: fmtNum(result.diffCiLow, 3),
      diffCiHigh: fmtNum(result.diffCiHigh, 3),
    })
  }
  return (
    <NarrativeBlock
      heading={lang === 'zh-TW' ? '中文（APA）' : 'English (APA)'}
      text={text}
      copyLabel={{ copy: t.common.copy, copied: t.common.copied }}
      copyHint={t.zProp.narrative.copyHint}
      preLine
    />
  )
}

export default Narrative
