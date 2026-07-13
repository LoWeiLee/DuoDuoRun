/**
 * 混合設計 ANOVA — Result（中欄）
 * Mixed ANOVA — Result panel (middle column).
 *
 * 結構 / Sections:
 *   1. n / a / b 摘要 / summary card
 *   2. 描述統計：每組 × 每條件 (M / SD / n)
 *   3. Mauchly 球形檢定（b ≥ 3 才報；用於 within 部分）
 *   4. Mixed ANOVA 表：A / Subjects(A) error / B / AB / Error(within)
 *      其中 B 與 AB 各展開 SA / GG / HF 三列
 *   5. 校正建議區塊 / correction recommendation banner
 *   6. 教學模式：白話解讀（含三個效應）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runMixedAnova } from './compute'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fmtSig, fillTemplate, toneForP } from '../../lib/format'
import Heading from '../../components/ui/Heading'

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false, indent = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-100',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
      indent ? 'pl-6' : '',
    ].join(' ')}>
      {children}
    </td>
  )
}

function etaInterpKey(eta2) {
  if (!Number.isFinite(eta2)) return null
  if (eta2 < 0.06) return 'small'
  if (eta2 < 0.14) return 'medium'
  return 'large'
}

function SummaryCard({ result, t }) {
  const r = t.mixedAnova.result
  return (
    <div>
      <Heading>{r.summaryTitle}</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border bg-duo-cream-50 border-duo-cream-200">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.n}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.n}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.aGroups}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.a}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.bConditions}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.b}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.fAB}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{fmtNum(result.fAB, 3)}</div>
        </div>
      </div>
    </div>
  )
}

function DescTable({ result, t, dataset, lang }) {
  const r = t.mixedAnova.result
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels =
    dataset.valueLabels?.[result.betweenVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const labelLevel = (k) => valueLabels[k] || k

  return (
    <div>
      <Heading>{r.descTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.group}</Th>
              <Th align="left">{r.cols.condition}</Th>
              <Th>n</Th>
              <Th>{r.cols.mean}</Th>
              <Th>{r.cols.sd}</Th>
            </tr>
          </thead>
          <tbody>
            {result.descriptives.map((row, idx) => (
              <tr key={idx}>
                <Td align="left" mono={false} bold>{labelLevel(row.level)}</Td>
                <Td align="left" mono={false}>{labelMap[row.condition] || row.condition}</Td>
                <Td>{row.n}</Td>
                <Td>{fmtNum(row.mean, 2)}</Td>
                <Td>{fmtNum(row.sd, 2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MauchlyTable({ result, t }) {
  const r = t.mixedAnova.result
  const m = result.mauchly
  if (!m.applicable) {
    return (
      <div>
        <Heading>{r.mauchlyTitle}</Heading>
        <div className="text-xs text-duo-cocoa-400 px-3 py-2 bg-white border border-duo-cream-200 rounded-md">
          {r.mauchlyNotApplicable}
        </div>
      </div>
    )
  }
  const violated = Number.isFinite(m.p) && m.p < 0.05
  return (
    <div>
      <Heading>{r.mauchlyTitle}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className={[
              'inline-block w-2 h-2 rounded-full shrink-0',
              violated ? 'bg-duo-sig-bad shadow-led-bad' : 'bg-duo-sig-ok shadow-led-ok',
            ].join(' ')} />
            <span className="text-duo-cocoa-700">{r.mauchlyLabel}</span>
          </span>
          <span className="font-mono text-duo-cocoa-700 ml-auto text-right whitespace-nowrap">
            W = {fmtNum(m.w, 3)}, χ²({m.df}) = {fmtNum(m.chi2, 3)}, p = {fmtP(m.p)}
            <span className={violated ? 'text-duo-sig-bad' : 'text-duo-sig-ok'}>
              {' '}· {violated ? r.mauchlyViolated : r.mauchlyOk}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const r = t.mixedAnova.result
  const c = r.cols

  // 三列球形校正：SA / GG / HF
  const corrRowsB = [
    { name: r.sources.sa, df1: result.dfB, df2: result.dfErrorWithin, p: result.pB, eps: 1, applyEps: false },
    { name: r.sources.gg, df1: result.gg.dfBAdj, df2: result.gg.dfErrorAdj, p: result.gg.pB, eps: result.gg.eps, applyEps: true },
    { name: r.sources.hf, df1: result.hf.dfBAdj, df2: result.hf.dfErrorAdj, p: result.hf.pB, eps: result.hf.eps, applyEps: true },
  ]
  const corrRowsAB = [
    { name: r.sources.sa, df1: result.dfAB, df2: result.dfErrorWithin, p: result.pAB, eps: 1, applyEps: false },
    { name: r.sources.gg, df1: result.gg.dfABAdj, df2: result.gg.dfErrorAdj, p: result.gg.pAB, eps: result.gg.eps, applyEps: true },
    { name: r.sources.hf, df1: result.hf.dfABAdj, df2: result.hf.dfErrorAdj, p: result.hf.pAB, eps: result.hf.eps, applyEps: true },
  ]

  return (
    <div>
      <Heading>{r.anovaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.source}</Th>
              <Th>{c.eps}</Th>
              <Th>{c.ss}</Th>
              <Th>{c.dfTreat}</Th>
              <Th>{c.dfError}</Th>
              <Th>{c.ms}</Th>
              <Th>{c.f}</Th>
              <Th>{c.p}</Th>
              <Th>{c.partialEta2}</Th>
            </tr>
          </thead>
          <tbody>
            {/* === Between-subjects effect: A === */}
            <tr className="bg-duo-cream-50/60">
              <Td align="left" mono={false} bold colSpan={9}>{r.sections.between}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{r.sources.effectA}</Td>
              <Td>—</Td>
              <Td>{fmtNum(result.ssA, 2)}</Td>
              <Td>{result.dfA}</Td>
              <Td>{result.dfSubjWithinA}</Td>
              <Td>{fmtNum(result.msA, 2)}</Td>
              <Td>{fmtNum(result.fA, 3)}</Td>
              <Td>{fmtP(result.pA)}{fmtSig(result.pA)}</Td>
              <Td>{fmtNum(result.partialEta2A, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{r.sources.subjWithinA}</Td>
              <Td>—</Td>
              <Td>{fmtNum(result.ssSubjWithinA, 2)}</Td>
              <Td>{result.dfSubjWithinA}</Td>
              <Td>—</Td>
              <Td>{fmtNum(result.msSubjWithinA, 2)}</Td>
              <Td></Td><Td></Td><Td></Td>
            </tr>

            {/* === Within-subjects effect: B === */}
            <tr className="bg-duo-cream-50/60">
              <Td align="left" mono={false} bold colSpan={9}>{r.sections.within}</Td>
            </tr>
            {corrRowsB.map((row, idx) => {
              const ms = row.df1 > 0 ? result.ssB / row.df1 : NaN
              return (
                <tr key={`b-${idx}`}>
                  <Td align="left" mono={false} bold={idx === 0} indent>
                    {idx === 0 ? r.sources.effectB : row.name}
                  </Td>
                  <Td>{row.applyEps ? fmtNum(row.eps, 3) : '—'}</Td>
                  <Td>{idx === 0 ? fmtNum(result.ssB, 2) : ''}</Td>
                  <Td>{fmtNum(row.df1, 2)}</Td>
                  <Td>{fmtNum(row.df2, 2)}</Td>
                  <Td>{fmtNum(ms, 2)}</Td>
                  <Td>{fmtNum(result.fB, 3)}</Td>
                  <Td>{fmtP(row.p)}{fmtSig(row.p)}</Td>
                  <Td>{idx === 0 ? fmtNum(result.partialEta2B, 3) : ''}</Td>
                </tr>
              )
            })}

            {/* === Interaction: AB === */}
            {corrRowsAB.map((row, idx) => {
              const ms = row.df1 > 0 ? result.ssAB / row.df1 : NaN
              return (
                <tr key={`ab-${idx}`}>
                  <Td align="left" mono={false} bold={idx === 0} indent>
                    {idx === 0 ? r.sources.effectAB : row.name}
                  </Td>
                  <Td>{row.applyEps ? fmtNum(row.eps, 3) : '—'}</Td>
                  <Td>{idx === 0 ? fmtNum(result.ssAB, 2) : ''}</Td>
                  <Td>{fmtNum(row.df1, 2)}</Td>
                  <Td>{fmtNum(row.df2, 2)}</Td>
                  <Td>{fmtNum(ms, 2)}</Td>
                  <Td>{fmtNum(result.fAB, 3)}</Td>
                  <Td>{fmtP(row.p)}{fmtSig(row.p)}</Td>
                  <Td>{idx === 0 ? fmtNum(result.partialEta2AB, 3) : ''}</Td>
                </tr>
              )
            })}

            {/* === Error within === */}
            <tr>
              <Td align="left" mono={false} bold>{r.sources.errorWithin}</Td>
              <Td>—</Td>
              <Td>{fmtNum(result.ssErrorWithin, 2)}</Td>
              <Td>{result.dfErrorWithin}</Td>
              <Td>—</Td>
              <Td>{fmtNum(result.msErrorWithin, 2)}</Td>
              <Td></Td><Td></Td><Td></Td>
            </tr>

            {/* === Total === */}
            <tr>
              <Td align="left" mono={false} bold>{r.sources.total}</Td>
              <Td></Td>
              <Td>{fmtNum(result.ssTotal, 2)}</Td>
              <Td>{result.n * result.b - 1}</Td>
              <Td>—</Td>
              <Td></Td><Td></Td><Td></Td><Td></Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>
    </div>
  )
}

function Recommendation({ result, t }) {
  const r = t.mixedAnova.result
  const m = result.mauchly
  if (!m.applicable) {
    return (
      <div className="mt-3 p-3 rounded-md bg-duo-leaf/10 border border-duo-leaf text-xs text-duo-cocoa-800 leading-relaxed">
        {r.recK2}
      </div>
    )
  }
  const violated = Number.isFinite(m.p) && m.p < 0.05
  if (violated) {
    return (
      <div className="mt-3 p-3 rounded-md bg-duo-tongue/15 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
        {r.recViolated}
      </div>
    )
  }
  return (
    <div className="mt-3 p-3 rounded-md bg-duo-leaf/10 border border-duo-leaf text-xs text-duo-cocoa-800 leading-relaxed">
      {r.recOk}
    </div>
  )
}

function Interpretation({ result, t, dataset, lang }) {
  const r = t.mixedAnova
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const m = result.mauchly
  const useGG = m.applicable && Number.isFinite(m.p) && m.p < 0.05

  // 內因子 / 交互作用：球形違反時自動採 GG
  const dfBuse = useGG ? result.gg.dfBAdj : result.dfB
  const dfBerr = useGG ? result.gg.dfErrorAdj : result.dfErrorWithin
  const pBuse = useGG ? result.gg.pB : result.pB
  const dfABuse = useGG ? result.gg.dfABAdj : result.dfAB
  const dfABerr = useGG ? result.gg.dfErrorAdj : result.dfErrorWithin
  const pABuse = useGG ? result.gg.pAB : result.pAB

  const peKa = etaInterpKey(result.partialEta2A)
  const peKb = etaInterpKey(result.partialEta2B)
  const peKab = etaInterpKey(result.partialEta2AB)

  const text = fillTemplate(r.interp.summary, {
    n: result.n,
    a: result.a,
    b: result.b,
    factorA: labelMap[result.betweenVar] || result.betweenVar,
    df1A: result.dfA,
    df2A: result.dfSubjWithinA,
    fA: fmtNum(result.fA, 3),
    pA: fmtP(result.pA),
    peA: fmtNum(result.partialEta2A, 3),
    sigA: result.pA < 0.05 ? r.interp.sigYes : r.interp.sigNo,
    effectAStr: peKa ? r.result.effectInterp[peKa] : '—',
    df1B: fmtNum(dfBuse, 2),
    df2B: fmtNum(dfBerr, 2),
    fB: fmtNum(result.fB, 3),
    pB: fmtP(pBuse),
    peB: fmtNum(result.partialEta2B, 3),
    sigB: pBuse < 0.05 ? r.interp.sigYes : r.interp.sigNo,
    effectBStr: peKb ? r.result.effectInterp[peKb] : '—',
    df1AB: fmtNum(dfABuse, 2),
    df2AB: fmtNum(dfABerr, 2),
    fAB: fmtNum(result.fAB, 3),
    pAB: fmtP(pABuse),
    peAB: fmtNum(result.partialEta2AB, 3),
    sigAB: pABuse < 0.05 ? r.interp.sigYes : r.interp.sigNo,
    effectABStr: peKab ? r.result.effectInterp[peKab] : '—',
  })
  const note = useGG
    ? r.interp.useGG
    : (m.applicable ? r.interp.useSA : r.interp.k2Note)

  const sigAB = pABuse < 0.05
  return (
    <div className="mt-5">
      <Heading>{r.interp.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{text}</p>
        <p className="mt-3 text-duo-cocoa-500">{note}</p>
        {sigAB && (
          <p className="mt-3 text-duo-amber-700 font-medium">⚠ {r.interp.interactionWarn}</p>
        )}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runMixedAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'tooFewN')
      msg = fillTemplate(t.mixedAnova.errors.tooFewN, { n: result.meta?.n ?? '?' })
    else if (result.error === 'tooFewPerGroup')
      msg = t.mixedAnova.errors.tooFewPerGroup
    else msg = t.mixedAnova.errors[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  return (
    <div>
      <SummaryCard result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版；每個效果一張卡，p 值紅綠語意） */}
      <StatCards
        items={[
          {
            label: t.mixedAnova.result.sources.effectA,
            value: fmtP(result.pA),
            tone: toneForP(result.pA),
            sub: `F(${result.dfA}, ${result.dfSubjWithinA}) = ${fmtNum(result.fA, 3)}`,
          },
          {
            label: t.mixedAnova.result.sources.effectB,
            value: fmtP(result.pB),
            tone: toneForP(result.pB),
            sub: `F(${result.dfB}, ${result.dfErrorWithin}) = ${fmtNum(result.fB, 3)}`,
          },
          {
            label: t.mixedAnova.result.sources.effectAB,
            value: fmtP(result.pAB),
            tone: toneForP(result.pAB),
            sub: `F(${result.dfAB}, ${result.dfErrorWithin}) = ${fmtNum(result.fAB, 3)}`,
          },
        ]}
      />

      <DescTable result={result} t={t} dataset={dataset} lang={lang} />
      <MauchlyTable result={result} t={t} />
      <AnovaTable result={result} t={t} />
      <Recommendation result={result} t={t} />
      {mode === 'teaching' && (
        <Interpretation result={result} t={t} dataset={dataset} lang={lang} />
      )}
    </div>
  )
}

export default Result
