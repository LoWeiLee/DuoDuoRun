/**
 * 集群分析 — Narrative（報告模式右欄）
 *
 * APA narrative covering:
 *   - method, k, sample, predictors, standardization
 *   - cluster sizes
 *   - BSS/TSS ratio
 *   - silhouette score + qualitative interpretation
 *
 * One-click copy in 中文 / English.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runCluster } from './compute'
import { fmtNum, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function silhouetteInterpKey(s) {
  if (!Number.isFinite(s)) return null
  if (s < 0.25) return 'noStructure'
  if (s < 0.5) return 'weak'
  if (s < 0.7) return 'reasonable'
  return 'strong'
}

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const varList = result.vars.map((v) => labelMap[v] || v).join(conjunction)
  const methodLabel = t.cluster.config.methods[result.method]
  const ratio = result.tss > 0 ? result.bss / result.tss : NaN
  const sKey = silhouetteInterpKey(result.silhouette)
  const sInterp = sKey ? t.cluster.result.silhouetteInterp[sKey] : '—'
  const sizesLine = result.clusterSizes
    .map((sz, i) => `#${i + 1} n=${sz} (${fmtNum((sz / result.n) * 100, 1)}%)`)
    .join(conjunction)
  const stdWord = result.standardize
    ? t.cluster.apa.standardizedYes
    : t.cluster.apa.standardizedNo
  return fillTemplate(t.cluster.apa.sentence, {
    method: methodLabel,
    n: result.n,
    p: result.p,
    k: result.k,
    varList,
    stdWord,
    sizesLine,
    bssRatio: Number.isFinite(ratio) ? fmtNum(ratio * 100, 1) : '—',
    silhouette: fmtNum(result.silhouette, 3),
    sInterp,
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCluster(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.cluster.errors[result.error] || t.errors.stats[result.error] || result.error
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
        copyHint={zh.cluster.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.cluster.apa.copyHint} />
    </div>
  )
}

export default Narrative
