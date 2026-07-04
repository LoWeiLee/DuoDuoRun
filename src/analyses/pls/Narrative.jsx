/**
 * PLS-SEM — Narrative（報告模式右欄）
 *
 * 用共用 NarrativeBlock 同時顯示中英 APA 敘述（各帶複製鈕）：
 *   1. 方法（scheme / PLSc）與 bootstrap 設定（重抽數、CI 類型）
 *   2. 測量模型：反映型信效度（α / CR / AVE 範圍 + HTMT 最大值）＋
 *      形成型（權重檢定 + 外部 VIF 最大值）
 *   3. 模型適配（估計模型 SRMR）與 blindfolding Q²（開啟時）
 *   4. 結構模型路徑檢定（β, t, p, 95% CI）與 R²
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runPLSAnalysis } from './compute'
import { fmtNum, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function rangeStr(values) {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return '—'
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const lo = fmtNum(min, 2)
  const hi = fmtNum(max, 2)
  return lo === hi ? lo : `${lo}–${hi}`
}

function pStr(p, lang) {
  if (!Number.isFinite(p)) return lang === 'en' ? 'p = n/a' : 'p 無法估計'
  if (p < 0.001) return 'p < .001'
  const s = p.toFixed(3)
  return `p = ${s.startsWith('0') ? s.slice(1) : s}`
}

function buildNarrative(res, lang) {
  const t = getStrings(lang)
  const a = t.pls.apa
  const { estimate, bootstrap, q2 } = res
  const bootOk = Boolean(bootstrap && !bootstrap.error)

  const schemeName = a.schemeNames[estimate.meta.scheme] || estimate.meta.scheme
  const plscClause = estimate.meta.consistent ? a.plscClause : ''

  const parts = []
  parts.push(
    bootOk
      ? fillTemplate(a.intro, {
          n: estimate.meta.n,
          nValid: bootstrap.nValid,
          scheme: schemeName,
          plsc: plscClause,
          ciType: a.ciNames[bootstrap.ciType] || bootstrap.ciType,
        })
      : fillTemplate(a.introNoBoot, { n: estimate.meta.n, scheme: schemeName, plsc: plscClause })
  )

  // 測量模型（反映型多指標構念；單指標與形成型另計）
  const kByLv = new Map()
  for (const q of estimate.outerLoadings) kByLv.set(q.lv, (kByLv.get(q.lv) || 0) + 1)
  const multi = estimate.reliability.filter(
    (q) => q.mode !== 'formative' && (kByLv.get(q.lv) || 0) >= 2)
  if (multi.length > 0) {
    const measOk = multi.every((q) => q.rhoC >= 0.7 && q.ave >= 0.5)
    parts.push(
      fillTemplate(a.measurement, {
        alphaRange: rangeStr(multi.map((q) => q.alpha)),
        crRange: rangeStr(multi.map((q) => q.rhoC)),
        aveRange: rangeStr(multi.map((q) => q.ave)),
        measVerdict: measOk ? a.measOk : a.measBad,
      })
    )
  }

  // 形成型構念：權重檢定 + 外部 VIF
  const lvModes = estimate.lvModes || {}
  const formativeLvs = Object.keys(lvModes).filter((lv) => lvModes[lv] === 'formative')
  if (formativeLvs.length > 0) {
    const vifs = estimate.outerWeights
      .filter((q) => lvModes[q.lv] === 'formative' && Number.isFinite(q.vif))
      .map((q) => q.vif)
    parts.push(
      fillTemplate(a.formative, {
        lvs: formativeLvs.join(lang === 'en' ? ', ' : '、'),
        vifMax: vifs.length > 0 ? fmtNum(Math.max(...vifs), 2) : '—',
      })
    )
  }

  // HTMT（有可計算的配對才寫）
  const htmtValues = []
  for (const row of estimate.htmt.matrix) {
    for (const v of row) if (v !== null && Number.isFinite(v)) htmtValues.push(v)
  }
  if (htmtValues.length > 0) {
    const htmtMax = Math.max(...htmtValues)
    parts.push(
      fillTemplate(a.htmt, {
        htmtMax: fmtNum(htmtMax, 2),
        htmtVerdict: htmtMax < 0.85 ? a.htmtOk : a.htmtBad,
      })
    )
  }

  // 模型適配（估計模型 SRMR）
  if (estimate.fit && Number.isFinite(estimate.fit.estimated?.srmr)) {
    const srmr = estimate.fit.estimated.srmr
    parts.push(
      fillTemplate(a.fit, {
        srmr: fmtNum(srmr, 3),
        fitVerdict: srmr < 0.08 ? a.fitOk : a.fitBad,
      })
    )
  }

  // Q²（開啟且成功時）
  if (q2 && !q2.error && Array.isArray(q2.constructs) && q2.constructs.length > 0) {
    const vals = q2.constructs.map((c) => c.q2).filter((v) => Number.isFinite(v))
    if (vals.length > 0) {
      parts.push(
        fillTemplate(a.q2, {
          d: q2.omissionDistance,
          q2Range: rangeStr(vals),
          q2Verdict: vals.every((v) => v > 0) ? a.q2Ok : a.q2Bad,
        })
      )
    }
  }

  // 結構模型
  const sep = lang === 'en' ? '; ' : '；'
  const period = lang === 'en' ? '.' : '。'
  let pathSentences
  if (bootOk) {
    pathSentences = bootstrap.paths.map((q) =>
      fillTemplate(a.path, {
        from: q.from,
        to: q.to,
        beta: fmtNum(q.original, 2),
        t: fmtNum(q.t, 2),
        pStr: pStr(q.p, lang),
        lo: fmtNum(q.ciLower, 2),
        hi: fmtNum(q.ciUpper, 2),
        sig: Number.isFinite(q.p) && q.p < 0.05 ? a.sigYes : a.sigNo,
      })
    )
  } else {
    pathSentences = estimate.pathCoefficients.map((q) =>
      fillTemplate(a.pathNoBoot, { from: q.from, to: q.to, beta: fmtNum(q.coef, 2) })
    )
  }
  const r2Sentences = estimate.structural.map((q) =>
    fillTemplate(a.r2, { lv: q.lv, r2: fmtNum(q.r2, 2) })
  )
  parts.push(a.structuralIntro + pathSentences.join(sep) + period)
  parts.push(r2Sentences.join(sep) + period)

  return parts.join(lang === 'en' ? ' ' : '').trim()
}

function Narrative() {
  const { dataset, t } = useApp()
  const [rawState] = useAnalysisState()
  const committed = rawState?.committed || null

  const res = useMemo(
    () => (dataset && committed ? runPLSAnalysis(dataset.rows, committed) : null),
    [dataset, committed]
  )

  if (!dataset) return null
  if (!committed || !res) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.pls.result.runFirst}</div>
    )
  }
  if (res.error) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">{res.message || res.error}</div>
    )
  }

  const zhText = buildNarrative(res, 'zh-TW')
  const enText = buildNarrative(res, 'en')
  const zhStrings = getStrings('zh-TW')
  const enStrings = getStrings('en')

  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zhStrings.common.copy, copied: zhStrings.common.copied }}
        copyHint={zhStrings.pls.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: enStrings.common.copy, copied: enStrings.common.copied }}
        copyHint={enStrings.pls.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
