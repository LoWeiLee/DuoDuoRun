/**
 * 相關分析 — Narrative（報告模式右欄）
 *
 * 列出所有達顯著的兩兩配對，分中英版各一段（多個句子串起來），各帶複製按鈕。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runCorrelation } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function strengthFor(r) {
  const a = Math.abs(r)
  if (a < 0.3) return 'weak'
  if (a < 0.5) return 'moderate'
  return 'strong'
}

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const method = result.method || 'pearson'
  const sym = t.corr.symbol[method] || 'r'
  const methodInline = t.corr.methodLabelInline[method]

  const prefix = fillTemplate(t.corr.apa.methodPrefix, { methodInline })

  const sigPairs = []
  const cols = result.columns
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const cell = result.matrix[cols[i]][cols[j]]
      if (Number.isFinite(cell.r) && cell.p < 0.05) {
        sigPairs.push({ a: cols[i], b: cols[j], ...cell })
      }
    }
  }
  if (sigPairs.length === 0) return `${prefix} ${t.corr.apa.noSig}`

  const body = sigPairs
    .map((p) =>
      fillTemplate(t.corr.apa.pairLine, {
        labelA: labelMap[p.a] || p.a,
        labelB: labelMap[p.b] || p.b,
        sym,
        strengthWord: t.corr.apa.strengthWord[strengthFor(p.r)],
        directionWord: t.corr.apa.directionWord[p.r > 0 ? 'positive' : 'negative'],
        r: fmtNum(p.r, 3),
        pStr: fmtP(p.p),
        n: p.n,
      })
    )
    .join(' ')

  return `${prefix} ${body}`
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()

  const result = useMemo(() => (dataset ? runCorrelation(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.corr[result.error]}
      </div>
    )
  }

  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')

  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.corr.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.corr.apa.copyHint} />
    </div>
  )
}

export default Narrative
