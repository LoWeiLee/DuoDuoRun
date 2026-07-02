/**
 * 混合設計 ANOVA — Narrative（報告模式右欄）
 * Mixed ANOVA — Narrative panel (report mode, right column).
 *
 * APA 句式涵蓋三個效應 / APA-style sentence covers all three effects:
 *   - 被試間主效應 A / between-subjects main effect A
 *   - 被試內主效應 B / within-subjects main effect B
 *   - A × B 交互作用 / A × B interaction
 *
 * 球形違反（Mauchly p < .05）→ B 與 AB 自動採 Greenhouse-Geisser 校正
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runMixedAnova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const condList = result.conditions.map((c) => labelMap[c] || c).join(conjunction)
  const factorAName = labelMap[result.betweenVar] || result.betweenVar

  const m = result.mauchly
  const useGG = m.applicable && Number.isFinite(m.p) && m.p < 0.05

  // 球形檢定段 / sphericity sentence
  let sphericitySection = ''
  if (m.applicable) {
    const tpl = useGG ? t.mixedAnova.apa.sphericityViolated : t.mixedAnova.apa.sphericityOk
    sphericitySection = fillTemplate(tpl, {
      w: fmtNum(m.w, 3),
      chi2: fmtNum(m.chi2, 3),
      df: m.df,
      pStr: fmtP(m.p),
      epsGG: fmtNum(result.gg.eps, 3),
    })
  } else {
    sphericitySection = t.mixedAnova.apa.k2Note
  }

  const dfBuse = useGG ? result.gg.dfBAdj : result.dfB
  const dfBerr = useGG ? result.gg.dfErrorAdj : result.dfErrorWithin
  const pBuse = useGG ? result.gg.pB : result.pB
  const dfABuse = useGG ? result.gg.dfABAdj : result.dfAB
  const dfABerr = useGG ? result.gg.dfErrorAdj : result.dfErrorWithin
  const pABuse = useGG ? result.gg.pAB : result.pAB

  const correctionLabel = useGG ? t.mixedAnova.apa.ggLabel : t.mixedAnova.apa.saLabel

  const sigA = result.pA < 0.05
  const sigB = pBuse < 0.05
  const sigAB = pABuse < 0.05

  return fillTemplate(t.mixedAnova.apa.sentence, {
    n: result.n,
    a: result.a,
    b: result.b,
    factorA: factorAName,
    condList,
    sphericitySection,
    correction: correctionLabel,
    df1A: result.dfA,
    df2A: result.dfSubjWithinA,
    fA: fmtNum(result.fA, 3),
    pA: fmtP(result.pA),
    peA: fmtNum(result.partialEta2A, 3),
    sigA: sigA ? t.mixedAnova.apa.sigYes : t.mixedAnova.apa.sigNo,
    df1B: fmtNum(dfBuse, 2),
    df2B: fmtNum(dfBerr, 2),
    fB: fmtNum(result.fB, 3),
    pB: fmtP(pBuse),
    peB: fmtNum(result.partialEta2B, 3),
    sigB: sigB ? t.mixedAnova.apa.sigYes : t.mixedAnova.apa.sigNo,
    df1AB: fmtNum(dfABuse, 2),
    df2AB: fmtNum(dfABerr, 2),
    fAB: fmtNum(result.fAB, 3),
    pAB: fmtP(pABuse),
    peAB: fmtNum(result.partialEta2AB, 3),
    sigAB: sigAB ? t.mixedAnova.apa.sigYes : t.mixedAnova.apa.sigNo,
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
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runMixedAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.mixedAnova.errors[result.error] || result.error
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
        copyHint={zh.mixedAnova.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.mixedAnova.apa.copyHint} />
    </div>
  )
}

export default Narrative
