/**
 * CFA — Narrative（報告模式右欄）
 *
 * APA 風格的中英敘述：模型結構（因子數 + 指標數）+ 全部適配指標 + 解讀。
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCFA } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'
import {
  cfiInterpretationKey,
  tliInterpretationKey,
  rmseaInterpretationKey,
  srmrInterpretationKey,
} from '../../lib/stats/cfa'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const conj = lang === 'zh-TW' ? '、' : ', '
  const factorList = result.factors
    .map(
      (f) =>
        `${f.name}（${f.indicators
          .map((c) => labelMap[c] || c)
          .join(conj)}）`
    )
    .join(conj)

  const fi = result.fitIndices
  const ciStr =
    Number.isFinite(fi.rmseaCiLow) && Number.isFinite(fi.rmseaCiHigh)
      ? `[${fmtNum(fi.rmseaCiLow, 3)}, ${fmtNum(fi.rmseaCiHigh, 3)}]`
      : '—'

  const overallKeys = [
    cfiInterpretationKey(fi.cfi),
    tliInterpretationKey(fi.tli),
    rmseaInterpretationKey(fi.rmsea),
    srmrInterpretationKey(fi.srmr),
  ]
  let overallKey = 'good'
  if (overallKeys.some((k) => k === 'poor')) overallKey = 'poor'
  else if (overallKeys.some((k) => k === 'acceptable')) overallKey = 'acceptable'

  return fillTemplate(t.cfa.apa.sentence, {
    n: result.n,
    p: result.p,
    m: result.m,
    factorList,
    chi2: fmtNum(result.chi2, 2),
    df: result.df,
    pStr: fmtP(result.pChi2),
    cfi: fmtNum(fi.cfi, 3),
    tli: fmtNum(fi.tli, 3),
    rmsea: fmtNum(fi.rmsea, 3),
    rmseaCi: ciStr,
    srmr: fmtNum(fi.srmr, 3),
    overall: t.cfa.fitInterp[overallKey],
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
    <button
      type="button"
      onClick={handleCopy}
      title={hint}
      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
    >
      {copied ? label.copied : label.copy}
    </button>
  )
}

function NarrativeBlock({ heading, text, copyLabel, copyHint }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
          {heading}
        </h4>
        <CopyButton text={text} label={copyLabel} hint={copyHint} />
      </div>
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 whitespace-pre-line">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCFA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.cfa.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.cfa.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.cfa.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
