/**
 * 單因子 ANOVA — Narrative（報告模式右欄）
 *
 * 顯著時：完整 APA + Tukey HSD 顯著配對列表
 * 不顯著時：簡短一句不顯著
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { runOneWayAnova } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'
import { getStrings } from '../../i18n'

function etaKey(eta2) {
  if (!Number.isFinite(eta2)) return null
  if (eta2 < 0.06) return 'small'
  if (eta2 < 0.14) return 'medium'
  return 'large'
}

function buildNarrative(result, dataset, lang) {
  const t = getStrings(lang)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels = dataset.valueLabels?.[result.factor]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const labelOf = (name) => valueLabels[name] || name
  const { anova, tukey } = result
  const sig = anova.p < 0.05
  const ek = etaKey(anova.eta2)

  // Tukey 顯著配對的句子串接
  let tukeySection = ''
  if (sig) {
    const sigPairs = tukey.filter((p) => p.p < 0.05)
    if (sigPairs.length === 0) {
      tukeySection = t.anova.apa.tukeyNoSig
    } else {
      const parts = sigPairs.map((p) => {
        const a = labelOf(p.a)
        const b = labelOf(p.b)
        const ma = anova.groupStats.find((g) => g.name === p.a)?.mean
        const mb = anova.groupStats.find((g) => g.name === p.b)?.mean
        return fillTemplate(t.anova.apa.tukeyPairLine, {
          a, b,
          ma: fmtNum(ma, 2),
          mb: fmtNum(mb, 2),
          diff: fmtNum(p.meanDiff, 2),
          pStr: fmtP(p.p),
        })
      })
      tukeySection = t.anova.apa.tukeyOpener + parts.join('；') + '。'
    }
  }

  const data = {
    factor: labelMap[result.factor] || result.factor,
    depVar: labelMap[result.depVar] || result.depVar,
    sigWord: sig ? t.ttest.apa.sigYes : t.ttest.apa.sigNo,
    df1: anova.dfBetween,
    df2: anova.dfWithin,
    f: fmtNum(anova.F, 3),
    pStr: fmtP(anova.p),
    eta2: fmtNum(anova.eta2, 3),
    etaInterp: ek ? t.anova.result.effectInterp[ek] : '—',
    tukeySection,
  }

  const template = sig ? t.anova.apa.sentence : t.anova.apa.sentenceNs
  return fillTemplate(template, data)
}

function Narrative() {
  const { dataset, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runOneWayAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.anova.config[result.error] || t.errors.stats[result.error] || result.error}</div>
  }
  const zhText = buildNarrative(result, dataset, 'zh-TW')
  const enText = buildNarrative(result, dataset, 'en')
  const zh = getStrings('zh-TW')
  const en = getStrings('en')
  return (
    <div>
      <NarrativeBlock heading="中文（APA）" text={zhText}
        copyLabel={{ copy: zh.common.copy, copied: zh.common.copied }}
        copyHint={zh.anova.apa.copyHint} />
      <NarrativeBlock heading="English (APA)" text={enText}
        copyLabel={{ copy: en.common.copy, copied: en.common.copied }}
        copyHint={en.anova.apa.copyHint} />
    </div>
  )
}

export default Narrative
