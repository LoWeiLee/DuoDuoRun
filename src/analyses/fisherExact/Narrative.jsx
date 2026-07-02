/**
 * Fisher 精確檢定 — 報告模式（APA 敘述）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runFisherExact } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

function Narrative() {
  const { dataset, lang, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runFisherExact(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) return <div className="text-xs text-duo-cocoa-400">—</div>

  const langKey = lang === 'zh-TW' ? 'zh' : 'en'
  const rowValueLabels = dataset.valueLabels?.[state.rowVar]?.[langKey] || {}
  const colValueLabels = dataset.valueLabels?.[state.colVar]?.[langKey] || {}
  const rowVarLabel = dataset.labels?.[langKey]?.[state.rowVar] || state.rowVar
  const colVarLabel = dataset.labels?.[langKey]?.[state.colVar] || state.colVar
  const rSucc = rowValueLabels[result.rowLevels[0]] || result.rowLevels[0]
  const rFail = rowValueLabels[result.rowLevels[1]] || result.rowLevels[1]
  const cSucc = colValueLabels[result.colLevels[0]] || result.colLevels[0]
  const cFail = colValueLabels[result.colLevels[1]] || result.colLevels[1]

  const text = fillTemplate(t.fisherExact.narrative.main, {
    rowVar: rowVarLabel, colVar: colVarLabel,
    rSucc, rFail, cSucc, cFail,
    a: result.a, b: result.b, c: result.c, d: result.d,
    n: result.n,
    pStr: fmtP(result.p),
    or: fmtNum(result.or, 3),
    orCiLow: fmtNum(result.orCiLow, 3),
    orCiHigh: fmtNum(result.orCiHigh, 3),
  })
  return (
    <div className="text-sm text-duo-cocoa-800 leading-relaxed whitespace-pre-line">
      {text}
    </div>
  )
}

export default Narrative
