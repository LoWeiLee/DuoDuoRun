/**
 * 階層迴歸 — Narrative（報告模式右欄）
 *
 * 產出 APA 風格中英文敘述，依序描述每一步累積 R² 與 ΔR² 是否顯著
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runHierarchicalRegression } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const yLabel = labelMap[result.yVar] || result.yVar
  const conj = lang === 'zh-TW' ? '、' : ', '

  const parts = []
  parts.push(
    fillTemplate(t.hierReg.narrative.opener, {
      k: result.steps.length,
      n: result.n,
      yLabel,
    })
  )

  for (let i = 0; i < result.steps.length; i++) {
    const s = result.steps[i]
    const vars = s.added.map((v) => labelMap[v] || v).join(conj)
    if (i === 0) {
      parts.push(
        fillTemplate(t.hierReg.narrative.step1, {
          vars,
          r2: fmtNum(s.R2, 3),
          adjR2: fmtNum(s.adjR2, 3),
          f: fmtNum(s.F, 3),
          df1: s.dfNum,
          df2: s.dfDen,
          pStr: fmtP(s.p),
        })
      )
    } else {
      const sig = s.deltaP < 0.05
      parts.push(
        fillTemplate(t.hierReg.narrative.stepK, {
          step: i + 1,
          vars,
          deltaR2: fmtNum(s.deltaR2, 3),
          deltaF: fmtNum(s.deltaF, 3),
          df1: s.deltaDfNum,
          df2: s.deltaDfDen,
          deltaP: fmtP(s.deltaP),
          r2: fmtNum(s.R2, 3),
          adjR2: fmtNum(s.adjR2, 3),
          sigWord: sig ? t.hierReg.narrative.sigYes : t.hierReg.narrative.sigNo,
        })
      )
    }
  }

  return parts.join(lang === 'zh-TW' ? '' : ' ')
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runHierarchicalRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.hierReg.errors[result.error] || t.errors.stats[result.error] || result.error
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
        copyHint={zh.hierReg.narrative.copyHint} preLine />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.hierReg.narrative.copyHint} preLine />
    </div>
  )
}

export default Narrative
