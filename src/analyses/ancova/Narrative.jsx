/**
 * ANCOVA — Narrative（報告模式右欄）/ Narrative (report mode, right column).
 *
 * APA 句式 / APA-style sentence:
 *   - 開場：研究設計（控制 covariates）
 *   - 主效應：F、df、p、partial η²
 *   - 共變項各自的 F 與 p
 *   - 斜率同質性聲明（若可計算）
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runAncova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const yLabel = labelMap[result.yVar] || result.yVar
  const factorLabel = labelMap[result.factorVar] || result.factorVar
  const conjunction = lang === 'zh-TW' ? '、' : ', '
  const covList = result.covariateVars.map((c) => labelMap[c] || c).join(conjunction)

  const sigFactor = result.factor.p < 0.05

  // 共變項句子串接 / Per-covariate string
  const joiner = lang === 'zh-TW' ? '；' : '; '
  const covParts = result.covariates.map((cv) =>
    fillTemplate(t.ancova.apa.covLine, {
      name: labelMap[cv.name] || cv.name,
      df1: cv.df,
      df2: result.error.df,
      f: fmtNum(cv.f, 3),
      pStr: fmtP(cv.p),
      eta2: fmtNum(cv.partialEta2, 3),
    })
  )
  const covSection = t.ancova.apa.covOpener + covParts.join(joiner) + '。'

  // 斜率同質性 / Homogeneity of slopes
  let homoSection = ''
  const h = result.homogeneityTest
  if (Number.isFinite(h.f) && Number.isFinite(h.p)) {
    const violated = h.p < 0.05
    homoSection = fillTemplate(
      violated ? t.ancova.apa.homoBad : t.ancova.apa.homoOk,
      {
        df1: h.dfNum, df2: h.dfDen,
        f: fmtNum(h.f, 3),
        pStr: fmtP(h.p),
      }
    )
  }

  return fillTemplate(
    sigFactor ? t.ancova.apa.sentence : t.ancova.apa.sentenceNs,
    {
      yLabel,
      factor: factorLabel,
      covList,
      n: result.n,
      df1: result.factor.df,
      df2: result.error.df,
      f: fmtNum(result.factor.f, 3),
      pStr: fmtP(result.factor.p),
      eta2: fmtNum(result.factor.partialEta2, 3),
      covSection,
      homoSection,
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
  const result = useMemo(() => (dataset ? runAncova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.ancova.errors[result.error] || result.error
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
        copyHint={zh.ancova.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.ancova.apa.copyHint} />
    </div>
  )
}

export default Narrative
