/**
 * 卡方檢定 — Narrative（報告模式右欄）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runChiSquare } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function cramerInterpretKey(v) {
  if (!Number.isFinite(v)) return null
  if (v < 0.1) return 'trivial'
  if (v < 0.3) return 'small'
  if (v < 0.5) return 'medium'
  return 'large'
}

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const sig = result.p < 0.05

  // 2x2 表附加 Yates 校正一句（與 SPSS Continuity Correction 對齊）
  const yatesSuffix = result.yatesApplied
    ? ' ' + fillTemplate(t.chiSq.apa.yatesAppendix, {
        df: result.df,
        n: result.n,
        chi2Yates: fmtNum(result.chi2Yates, 3),
        pYatesStr: fmtP(result.pYates),
      })
    : ''

  if (result.type === 'independence') {
    const rowLabel = labelMap[result.rowVar] || result.rowVar
    const colLabel = labelMap[result.colVar] || result.colVar
    if (sig) {
      const ek = cramerInterpretKey(result.cramerV)
      return fillTemplate(t.chiSq.apa.indepSig, {
        rowVar: rowLabel,
        colVar: colLabel,
        df: result.df,
        n: result.n,
        chi2: fmtNum(result.chi2, 3),
        pStr: fmtP(result.p),
        v: fmtNum(result.cramerV, 3),
        effect: ek ? t.chiSq.result.effectInterp[ek] : '—',
      }) + yatesSuffix
    }
    return fillTemplate(t.chiSq.apa.indepNs, {
      rowVar: rowLabel,
      colVar: colLabel,
      df: result.df,
      n: result.n,
      chi2: fmtNum(result.chi2, 3),
      pStr: fmtP(result.p),
    }) + yatesSuffix
  }

  // gof
  const varLabel = labelMap[result.gofVar] || result.gofVar
  if (sig) {
    return fillTemplate(t.chiSq.apa.gofSig, {
      var: varLabel,
      df: result.df,
      n: result.n,
      chi2: fmtNum(result.chi2, 3),
      pStr: fmtP(result.p),
      sig: t.chiSq.apa.sigYesDiff,
    })
  }
  return fillTemplate(t.chiSq.apa.gofNs, {
    var: varLabel,
    df: result.df,
    n: result.n,
    chi2: fmtNum(result.chi2, 3),
    pStr: fmtP(result.p),
  })
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runChiSquare(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.chiSq.config[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.chiSq.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.chiSq.apa.copyHint} />
    </div>
  )
}

export default Narrative
