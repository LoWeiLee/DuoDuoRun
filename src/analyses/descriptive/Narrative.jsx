/**
 * 敘述統計 — Narrative（報告模式右欄）
 *
 * 顯示中英文 APA 敘述各一段（可同時呈現），各帶獨立的「複製」按鈕。
 * 沒勾選變數時提示。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runDescriptive } from './compute'
import { fmtNum, fmtInt, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(results, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sentences = results.map((r) =>
    fillTemplate(t.desc.apa.sentence, {
      label: labelMap[r.col] || r.col,
      n: fmtInt(r.n),
      m: fmtNum(r.mean, 2),
      sd: fmtNum(r.sd, 2),
      min: fmtNum(r.min, 0),
      max: fmtNum(r.max, 0),
      median: fmtNum(r.median, 2),
      skew: fmtNum(r.skewness, 2),
      kurt: fmtNum(r.kurtosis, 2),
    })
  )
  return sentences.join(' ')
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  // `state.selectedVars || []` 每次 render 都會產生**新的空陣列**，讓下方 useMemo
  // 的 deps 每次都變 → memo 完全失效。用 useMemo 穩定化 fallback（2026-07-13 紅隊 R4）。
  const selectedVars = useMemo(() => state.selectedVars || [], [state.selectedVars])

  const results = useMemo(
    () => (dataset && selectedVars.length > 0 ? runDescriptive(dataset.rows, selectedVars) : null),
    [dataset, selectedVars])

  if (!dataset || selectedVars.length === 0) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.desc.noVarsSelected}
      </div>
    )
  }
  const zhText = buildNarrative(results, dataset, 'zh-TW')
  const enText = buildNarrative(results, dataset, 'en')

  const zhStrings = getStrings('zh-TW')
  const enStrings = getStrings('en')

  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zhStrings.common.copy, copied: zhStrings.common.copied }}
        copyHint={zhStrings.desc.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: enStrings.common.copy, copied: enStrings.common.copied }}
        copyHint={enStrings.desc.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
