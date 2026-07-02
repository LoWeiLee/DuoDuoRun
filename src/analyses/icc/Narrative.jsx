/**
 * ICC — Narrative（報告模式右欄）
 *
 * 預設敘述以 ICC(2,1) 雙因子隨機、絕對一致性、單一評分者為主軸（最常見的「評分者間信度」報告角度）。
 * Default APA narrative anchored on ICC(2,1) absolute agreement.
 */
import { useState, useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runIcc } from './compute'
import { iccInterpretationKey } from '../../lib/stats/icc'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, settings, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const cols = settings?.raterVars || []
  const conj = lang === 'zh-TW' ? '、' : ', '
  const itemList = cols.map((c) => labelMap[c] || c).join(conj)

  // 以 ICC(2,1) 為主軸；若 NaN（極端情況）退而報 ICC(3,1）
  const v21 = result.variants.find((v) => v.key === 'icc2_1')
  const v = v21 && Number.isFinite(v21.value)
    ? v21
    : result.variants.find((v) => v.key === 'icc3_1')

  const ik = iccInterpretationKey(v.value)
  const interp = ik ? t.icc.interp[ik] : '—'
  const ciStr =
    Number.isFinite(v.ciLow) && Number.isFinite(v.ciHigh)
      ? `[${fmtNum(v.ciLow, 3)}, ${fmtNum(v.ciHigh, 3)}]`
      : '—'

  return fillTemplate(t.icc.narrative.sentence, {
    itemList,
    n: result.n,
    k: result.k,
    icc: fmtNum(v.value, 3),
    ci: ciStr,
    f: fmtNum(v.f, 3),
    df1: v.dfNum,
    df2: v.dfDen,
    pStr: fmtP(v.p),
    interp,
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
      <div className="text-sm text-duo-cocoa-800 leading-relaxed bg-white border border-duo-cream-200 rounded-md px-4 py-3 whitespace-pre-line">
        {text}
      </div>
    </section>
  )
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runIcc(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.icc.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const zhText = buildNarrative(result, dataset, state, 'zh-TW')
  const enText = buildNarrative(result, dataset, state, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.icc.narrative.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.icc.narrative.copyHint}
      />
    </div>
  )
}

export default Narrative
