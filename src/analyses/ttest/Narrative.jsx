/**
 * t 檢定 — Narrative（報告模式右欄）
 *
 * 同時顯示中英 APA 敘述，各帶獨立複製按鈕。
 *
 * NarrativeBlock 為 2026-07 UI 改版的「範本」樣式
 * （對齊 docs/mockups/mockup-d-final-hybrid.html 的 .apa 區塊：
 *   cream 底 + hairline 邊框 + 左上 mono 小標籤 + 右上 ghost 複製鈕），
 * 已抽出為共用元件 src/components/NarrativeBlock.jsx，其餘 Narrative 照此逐步跟進。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runTTest } from './compute'
import { cohenDInterpretation } from '../../lib/stats/ttest'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const { ttest, type } = result
  const effectKey = cohenDInterpretation(ttest.d)
  const sig = ttest.p < 0.05

  const data = {
    t: fmtNum(ttest.t, 3),
    df: fmtNum(ttest.df, 2),
    pStr: fmtP(ttest.p),
    d: fmtNum(ttest.d, 2),
    effectWord: t.ttest.effectSize[effectKey],
    sigWord: sig ? t.ttest.apa.sigYes : t.ttest.apa.sigNo,
    meanDiff: fmtNum(ttest.meanDiff, 2),
  }

  let template
  if (type === 'independent') {
    template = t.ttest.apa.independent
    Object.assign(data, {
      g1Name: ttest.g1Name,
      g2Name: ttest.g2Name,
      m1: fmtNum(ttest.grp1.mean, 2),
      sd1: fmtNum(ttest.grp1.sd, 2),
      n1: ttest.grp1.n,
      m2: fmtNum(ttest.grp2.mean, 2),
      sd2: fmtNum(ttest.grp2.sd, 2),
      n2: ttest.grp2.n,
    })
  } else if (type === 'paired') {
    template = t.ttest.apa.paired
    Object.assign(data, {
      var1Name: labelMap[ttest.var1Name] || ttest.var1Name,
      var2Name: labelMap[ttest.var2Name] || ttest.var2Name,
      m1: fmtNum(ttest.var1.mean, 2),
      sd1: fmtNum(ttest.var1.sd, 2),
      m2: fmtNum(ttest.var2.mean, 2),
      sd2: fmtNum(ttest.var2.sd, 2),
      sdDiff: fmtNum(ttest.sdDiff, 2),
    })
  } else {
    template = t.ttest.apa.oneSample
    Object.assign(data, {
      m: fmtNum(ttest.mean, 2),
      sd: fmtNum(ttest.sd, 2),
      n: ttest.n,
      mu0: fmtNum(ttest.mu0, 2),
    })
  }

  return fillTemplate(template, data)
}

function Narrative() {
  const { dataset, t } = useApp()
  const [rawState] = useAnalysisState()
  // rawState 可能為 null；`rawState || {}` 每次 render 都會產生**新的空物件**，
  // 讓下面 useMemo 的 deps 每次都變 → memo 完全失效，每次 render 都重跑統計。
  // 用 useMemo 穩定化這個 fallback（2026-07-13 紅隊 R4）。
  const settings = useMemo(() => rawState || {}, [rawState])

  const result = useMemo(() => (dataset ? runTTest(dataset.rows, settings) : null), [dataset, settings])
  if (!dataset) return null

  if (result.error) {
    // 對齊 Result.jsx 的錯誤處理：依不同 error code 顯示對應訊息，不要把所有 error 都吃成 pickDep
    let msg
    if (result.error in t.ttest.config) {
      msg = t.ttest.config[result.error]
    } else if (result.error === 'groupVarBadGroups') {
      msg = fillTemplate(t.ttest.config.groupVarBadGroups, { k: result.meta?.k ?? '?' })
    } else {
      msg = result.error
    }
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {msg}
      </div>
    )
  }

  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')

  const zhStrings = getStrings('zh-TW')
  const enStrings = getStrings('en')

  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zhStrings.common.copy, copied: zhStrings.common.copied }}
        copyHint={zhStrings.ttest.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: enStrings.common.copy, copied: enStrings.common.copied }}
        copyHint={enStrings.ttest.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
