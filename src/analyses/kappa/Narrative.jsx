/**
 * Cohen's Kappa — 報告模式（APA 敘述）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runKappa } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

function kappaInterpKey(k) {
  if (!Number.isFinite(k)) return 'undefined'
  if (k < 0) return 'poor'
  if (k < 0.2) return 'slight'
  if (k < 0.4) return 'fair'
  if (k < 0.6) return 'moderate'
  if (k < 0.8) return 'substantial'
  return 'almostPerfect'
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runKappa(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error && result.error !== 'undefinedKappa') {
    return <div className="text-xs text-duo-cocoa-400">—</div>
  }

  const interpKey = kappaInterpKey(result.kappa)
  const text = fillTemplate(t.kappa.narrative.overall, {
    n: result.n,
    k: result.levels.length,
    po: fmtNum(result.po, 3),
    pe: fmtNum(result.pe, 3),
    kappa: fmtNum(result.kappa, 3),
    ciLow: fmtNum(result.ciLow, 3),
    ciHigh: fmtNum(result.ciHigh, 3),
    z: fmtNum(result.z, 3),
    pStr: fmtP(result.p),
    weighting: t.kappa.weightings[result.weighting] || result.weighting,
    level: t.kappa.interp.levels[interpKey],
  })

  return (
    <div className="text-sm text-duo-cocoa-800 leading-relaxed whitespace-pre-line">
      {text}
    </div>
  )
}

export default Narrative
