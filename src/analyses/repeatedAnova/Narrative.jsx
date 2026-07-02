/**
 * 重複量數 ANOVA — Narrative（報告模式右欄）
 * Repeated-measures ANOVA — Narrative panel (report mode, right column).
 *
 * APA 句式 / APA-style sentence:
 *   - 球形檢定（k ≥ 3 才報）
 *   - 主效應 F、df、p、partial η²、η²_G
 *   - 自動選擇報告依據：Mauchly 顯著違反 → 採 Greenhouse-Geisser；否則 Sphericity Assumed
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runRepeatedAnova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const condList = result.conditions.map((c) => labelMap[c] || c).join(conjunction)

  const m = result.mauchly
  const useGG = m.applicable && Number.isFinite(m.p) && m.p < 0.05

  // 球形檢定段 / Sphericity sentence
  let sphericitySection = ''
  if (m.applicable) {
    const tpl = useGG ? t.repAnova.apa.sphericityViolated : t.repAnova.apa.sphericityOk
    sphericitySection = fillTemplate(tpl, {
      w: fmtNum(m.w, 3),
      chi2: fmtNum(m.chi2, 3),
      df: m.df,
      pStr: fmtP(m.p),
      epsGG: fmtNum(result.gg.eps, 3),
    })
  } else {
    sphericitySection = t.repAnova.apa.k2Note
  }

  const dT = useGG ? result.gg.dfTreat : result.dfTreat
  const dE = useGG ? result.gg.dfError : result.dfError
  const pUse = useGG ? result.gg.p : result.p
  const sig = pUse < 0.05
  const correctionLabel = useGG ? t.repAnova.apa.ggLabel : t.repAnova.apa.saLabel

  return fillTemplate(
    sig ? t.repAnova.apa.sentence : t.repAnova.apa.sentenceNs,
    {
      condList,
      n: result.n,
      k: result.k,
      sphericitySection,
      correction: correctionLabel,
      df1: fmtNum(dT, 2),
      df2: fmtNum(dE, 2),
      f: fmtNum(result.f, 3),
      pStr: fmtP(pUse),
      eta2: fmtNum(result.partialEta2, 3),
      etaG2: fmtNum(result.etaG2, 3),
    }
  )
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
  const result = useMemo(() => (dataset ? runRepeatedAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.repAnova.errors[result.error] || result.error
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
        copyHint={zh.repAnova.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.repAnova.apa.copyHint} />
    </div>
  )
}

export default Narrative
