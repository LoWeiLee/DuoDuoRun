/**
 * ICC — Result（中欄）
 *
 * 結構：
 *   1. n / k 摘要列
 *   2. ANOVA 表（MS_R / MS_C / MS_E / MS_W + df）
 *   3. 六種 ICC 變體表（值、95% CI、F、df、p、解讀）
 *   4. 教學模式：決策樹白話解讀（哪一種 ICC 該報？）
 *
 * Result panel for ICC: ANOVA breakdown + 6-variant table + decision-tree
 * teaching paragraph.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runIcc } from './compute'
import { iccInterpretationKey } from '../../lib/stats/icc'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

function Th({ children, align = 'right' }) {
  return (
    <th
      className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap`}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false, color }) {
  return (
    <td
      className={[
        'px-3 py-1.5 border-b border-duo-cream-100',
        `text-${align}`,
        mono ? 'font-mono' : '',
        bold ? 'font-medium' : '',
        color || 'text-duo-cocoa-700',
      ].join(' ')}
    >
      {children}
    </td>
  )
}

function SummaryStrip({ result, t }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg border bg-duo-cream-50 border-duo-cream-200">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.icc.result.cols.n}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">
          {result.n}
        </div>
        {result.droppedRows > 0 && (
          <div className="text-[10px] text-duo-cocoa-400 mt-0.5">
            {fillTemplate(t.icc.result.droppedNote, { n: result.droppedRows })}
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.icc.result.cols.k}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">
          {result.k}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.icc.result.cols.design}
        </div>
        <div className="text-sm text-duo-cocoa-800">
          {t.icc.result.designNote}
        </div>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const c = t.icc.result.cols
  const rows = [
    { label: t.icc.result.rows.between, ms: result.ms.msR, df: result.df.dfR },
    { label: t.icc.result.rows.raterCol, ms: result.ms.msC, df: result.df.dfC },
    { label: t.icc.result.rows.residual, ms: result.ms.msE, df: result.df.dfE },
    { label: t.icc.result.rows.within, ms: result.ms.msW, df: result.df.dfW },
  ]
  return (
    <div>
      <Heading>{t.icc.result.anovaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.source}</Th>
              <Th>{c.df_short}</Th>
              <Th>{c.ms}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <Td align="left" mono={false} bold color="text-duo-cocoa-800">
                  {r.label}
                </Td>
                <Td>{r.df}</Td>
                <Td>{fmtNum(r.ms, 3)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VariantTable({ result, t }) {
  const c = t.icc.result.cols
  const desc = t.icc.result.variantDesc
  return (
    <div>
      <Heading>{t.icc.result.variantTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.variant}</Th>
              <Th align="left">{c.description}</Th>
              <Th>{c.icc}</Th>
              <Th>{c.ci95}</Th>
              <Th>{c.f}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
              <Th align="left">{c.interp}</Th>
            </tr>
          </thead>
          <tbody>
            {result.variants.map((v) => {
              const ik = iccInterpretationKey(v.value)
              const interpStr = ik ? t.icc.interp[ik] : '—'
              const ciStr =
                Number.isFinite(v.ciLow) && Number.isFinite(v.ciHigh)
                  ? `[${fmtNum(v.ciLow, 3)}, ${fmtNum(v.ciHigh, 3)}]`
                  : '—'
              let color = 'text-duo-cocoa-700'
              if (ik === 'excellent' || ik === 'good')
                color = 'text-duo-sig-ok font-semibold'
              else if (ik === 'poor') color = 'text-duo-sig-bad font-semibold'
              return (
                <tr key={v.key}>
                  <Td align="left" mono bold color="text-duo-cocoa-800">
                    {t.icc.result.variantLabel[v.key]}
                  </Td>
                  <Td align="left" mono={false}>
                    {desc[v.key]}
                  </Td>
                  <Td>{fmtNum(v.value, 3)}</Td>
                  <Td>{ciStr}</Td>
                  <Td>{fmtNum(v.f, 3)}</Td>
                  <Td>
                    {v.dfNum}, {v.dfDen}
                  </Td>
                  <Td>{fmtP(v.p)}</Td>
                  <Td align="left" mono={false} color={color}>
                    {interpStr}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        {t.icc.result.interpRange}
      </p>
    </div>
  )
}

function DecisionTree({ t }) {
  const dt = t.icc.decisionTree
  return (
    <div className="mt-5">
      <Heading>{dt.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
        {dt.body}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runIcc(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.icc.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  return (
    <div>
      <Heading>{t.icc.result.summaryTitle}</Heading>
      <SummaryStrip result={result} t={t} />
      <AnovaTable result={result} t={t} />
      <VariantTable result={result} t={t} />
      {mode === 'teaching' && <DecisionTree t={t} />}
    </div>
  )
}

export default Result
