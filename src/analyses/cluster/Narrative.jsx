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
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
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

function CopyButton({ text, label, hint }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" onClick={handleCopy} title={hint}
      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition">
      {copied ? label.copied : label.copy}
    </button>
  )
}

function NarrativeBlock({ heading, text, copyLabel, copyHint }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">{heading}</h4>
        <CopyButton text={text} label={copyLabel} hint={copyHint} />
      </div>
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCluster(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.cluster.errors[result.error] || result.error
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
