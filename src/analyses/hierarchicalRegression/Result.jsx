/**
 * 階層迴歸 — Result（中欄）
 *
 * 結構：
 *   1. Step summary 表（每一步：累積 X 數、R²、Adj R²、ΔR²、ΔF、df、Δp）
 *   2. 最終步驟係數表（沿用多元迴歸格式）
 *   3. 教學模式：解讀（哪一步顯著改善 fit）
 *
 * Hierarchical regression result panel
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runHierarchicalRegression } from './compute'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fillTemplate, toneForP } from '../../lib/format'

function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false, color }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      color || 'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function fmtPredictorList(names, labelMap, conjunction) {
  return names.map((n) => labelMap[n] || n).join(conjunction)
}

function StepSummary({ result, t, labelMap, lang }) {
  const c = t.hierReg.result.cols
  const conj = lang === 'zh-TW' ? '、' : ', '
  return (
    <div>
      <Heading>{t.hierReg.result.stepTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.step}</Th>
              <Th align="left">{c.added}</Th>
              <Th>{c.r2}</Th>
              <Th>{c.adjR2}</Th>
              <Th>{c.f}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
              <Th>{c.deltaR2}</Th>
              <Th>{c.deltaF}</Th>
              <Th>{c.deltaDf}</Th>
              <Th>{c.deltaP}</Th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((s, i) => {
              const sigDelta = s.deltaP !== null && s.deltaP < 0.05
              return (
                <tr key={i}>
                  <Td align="left" mono={false} bold>{i + 1}</Td>
                  <Td align="left" mono={false}>
                    {fmtPredictorList(s.added, labelMap, conj)}
                  </Td>
                  <Td>{fmtNum(s.R2, 3)}</Td>
                  <Td>{fmtNum(s.adjR2, 3)}</Td>
                  <Td>{fmtNum(s.F, 3)}</Td>
                  <Td>{s.dfNum}, {s.dfDen}</Td>
                  <Td>{fmtP(s.p)}</Td>
                  <Td color={sigDelta ? 'text-duo-sig-ok font-semibold' : 'text-duo-cocoa-700'}>
                    {s.deltaR2 === null ? '—' : fmtNum(s.deltaR2, 3)}
                  </Td>
                  <Td>{s.deltaF === null ? '—' : fmtNum(s.deltaF, 3)}</Td>
                  <Td>{s.deltaDfNum === null ? '—' : `${s.deltaDfNum}, ${s.deltaDfDen}`}</Td>
                  <Td color={sigDelta ? 'text-duo-sig-ok font-semibold' : 'text-duo-cocoa-700'}>
                    {s.deltaP === null ? '—' : fmtP(s.deltaP)}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-duo-cocoa-400 leading-snug">
        {fillTemplate(t.hierReg.result.nNote, { n: result.n })}
      </p>
    </div>
  )
}

function FinalCoefficients({ result, t, labelMap }) {
  const c = t.hierReg.result.cols
  const reg = result.finalReg
  return (
    <div>
      <Heading>{t.hierReg.result.coefTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.predictor}</Th>
              <Th>{c.b}</Th>
              <Th>{c.se}</Th>
              <Th>{c.beta}</Th>
              <Th>{c.t}</Th>
              <Th>{c.p}</Th>
              <Th>{c.vif}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.intercept}</Td>
              <Td>{fmtNum(reg.intercept.b, 3)}</Td>
              <Td>{fmtNum(reg.intercept.se, 3)}</Td>
              <Td>—</Td>
              <Td>{fmtNum(reg.intercept.t, 3)}</Td>
              <Td>{fmtP(reg.intercept.p)}</Td>
              <Td>—</Td>
            </tr>
            {reg.coefficients.map((co) => (
              <tr key={co.name}>
                <Td align="left" mono={false} bold>{labelMap[co.name] || co.name}</Td>
                <Td>{fmtNum(co.b, 3)}</Td>
                <Td>{fmtNum(co.se, 3)}</Td>
                <Td>{fmtNum(co.beta, 3)}</Td>
                <Td>{fmtNum(co.t, 3)}</Td>
                <Td>{fmtP(co.p)}</Td>
                <Td>{fmtNum(co.vif, 2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Interpretation({ result, t, labelMap, lang }) {
  const conj = lang === 'zh-TW' ? '、' : ', '
  const lastStep = result.steps[result.steps.length - 1]
  const overall = fillTemplate(t.hierReg.interp.overall, {
    k: result.steps.length,
    n: result.n,
    r2Final: fmtNum(lastStep.R2, 3),
    adjR2Final: fmtNum(lastStep.adjR2, 3),
    fFinal: fmtNum(lastStep.F, 3),
    df1: lastStep.dfNum,
    df2: lastStep.dfDen,
    pFinal: fmtP(lastStep.p),
  })

  // 哪些 step 顯著改善了 fit（k≥2 且 Δp<.05）
  const sigSteps = result.steps
    .map((s, idx) => ({ s, idx }))
    .filter(({ s, idx }) => idx >= 1 && s.deltaP !== null && s.deltaP < 0.05)

  return (
    <div className="mt-5">
      <Heading>{t.hierReg.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p>{overall}</p>

        <p className="mt-3 font-medium">{t.hierReg.interp.deltaSection}</p>
        {result.steps.length < 2 ? (
          <p className="mt-1 text-duo-cocoa-500">{t.hierReg.interp.singleStepNote}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {result.steps.map((s, i) => {
              if (i === 0) {
                const text = fillTemplate(t.hierReg.interp.firstStepLine, {
                  vars: fmtPredictorList(s.added, labelMap, conj),
                  r2: fmtNum(s.R2, 3),
                  f: fmtNum(s.F, 3),
                  df1: s.dfNum,
                  df2: s.dfDen,
                  pStr: fmtP(s.p),
                })
                return <li key={i} className="text-duo-cocoa-800">· {text}</li>
              }
              const sig = s.deltaP < 0.05
              const text = fillTemplate(t.hierReg.interp.stepLine, {
                step: i + 1,
                vars: fmtPredictorList(s.added, labelMap, conj),
                deltaR2: fmtNum(s.deltaR2, 3),
                deltaF: fmtNum(s.deltaF, 3),
                df1: s.deltaDfNum,
                df2: s.deltaDfDen,
                pStr: fmtP(s.deltaP),
                sigWord: sig ? t.hierReg.interp.sigYes : t.hierReg.interp.sigNo,
              })
              return (
                <li key={i} className={sig ? 'text-duo-cocoa-800' : 'text-duo-cocoa-500'}>
                  · {text}
                </li>
              )
            })}
          </ul>
        )}

        {sigSteps.length > 0 && result.steps.length >= 2 && (
          <p className="mt-3 text-duo-sig-ok">
            {fillTemplate(t.hierReg.interp.sigSummary, {
              steps: sigSteps.map(({ idx }) => idx + 1).join(', '),
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runHierarchicalRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.hierReg.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const cols = t.hierReg.result.cols
  const lastStep = result.steps[result.steps.length - 1]

  return (
    <div>
      {/* 關鍵統計量卡片（最終步；2026-07 UI 改版） */}
      <StatCards
        items={[
          { label: cols.r2, value: fmtNum(lastStep.R2, 3) },
          { label: cols.adjR2, value: fmtNum(lastStep.adjR2, 3) },
          { label: cols.deltaR2, value: lastStep.deltaR2 === null ? '—' : fmtNum(lastStep.deltaR2, 3) },
          {
            label: cols.deltaP,
            value: fmtP(lastStep.deltaP),
            tone: toneForP(lastStep.deltaP),
            sub: Number.isFinite(lastStep.deltaP) ? (lastStep.deltaP < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
        ]}
      />

      <StepSummary result={result} t={t} labelMap={labelMap} lang={lang} />
      <FinalCoefficients result={result} t={t} labelMap={labelMap} />
      {mode === 'teaching' && (
        <Interpretation result={result} t={t} labelMap={labelMap} lang={lang} />
      )}
    </div>
  )
}

export default Result
