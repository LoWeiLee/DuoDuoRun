/**
 * CFA — Result（中欄）
 *
 * 結構：
 *   1. 收斂狀態 + n / p / m 摘要
 *   2. 適配指標（CFI / TLI / RMSEA + 90% CI / SRMR / χ² + p）+ 顏色閾值
 *   3. 標準化負荷量表（factor / indicator / λ / λ_std / R²；含 SE/z/p 若可得）
 *   4. 因子相關矩陣（m ≥ 2）
 *   5. 殘差變異表
 *   6. 教學模式：解讀段落
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCFA } from './compute'
import { fmtNum, fmtP, fmtSig, fillTemplate } from '../../lib/format'
import {
  cfiInterpretationKey,
  tliInterpretationKey,
  rmseaInterpretationKey,
  srmrInterpretationKey,
} from '../../lib/stats/cfa'

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
      className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}
    >
      {children}
    </th>
  )
}
function Td({ children, align = 'right', mono = true, bold = false, color }) {
  return (
    <td
      className={[
        'px-3 py-1.5 border-b border-duo-cream-50',
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

function colorForKey(key) {
  if (key === 'good') return 'text-duo-leaf font-semibold'
  if (key === 'acceptable') return 'text-duo-amber-700 font-semibold'
  if (key === 'poor') return 'text-duo-tongue font-semibold'
  return 'text-duo-cocoa-700'
}

function FitCard({ label, value, sub, key_, t }) {
  const cls = colorForKey(key_)
  const interp = key_ ? t.cfa.fitInterp[key_] : '—'
  return (
    <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{label}</div>
      <div className={`font-mono text-2xl ${cls}`}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-duo-cocoa-500 mt-0.5">{sub}</div>}
      {key_ && <div className={`text-xs mt-0.5 ${cls}`}>{interp}</div>}
    </div>
  )
}

function SummaryStrip({ result, t }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border bg-duo-cream-50 border-duo-cocoa-100">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.cfa.result.cols.n}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.n}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.cfa.result.cols.pIndicators}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.p}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.cfa.result.cols.mFactors}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.m}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
          {t.cfa.result.cols.df}
        </div>
        <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.df}</div>
      </div>
    </div>
  )
}

function ConvergenceBadge({ result, t }) {
  const ok = result.converged
  return (
    <div
      className={[
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs',
        ok
          ? 'bg-duo-leaf/10 text-duo-leaf border border-duo-leaf/20'
          : 'bg-duo-tongue/10 text-duo-tongue border border-duo-tongue/20',
      ].join(' ')}
    >
      <span className="font-medium">
        {ok ? t.cfa.result.converged : t.cfa.result.notConverged}
      </span>
      <span className="font-mono">
        {fillTemplate(t.cfa.result.iterStr, { iter: result.iterations })}
      </span>
    </div>
  )
}

function FitIndicesBlock({ result, t }) {
  const fi = result.fitIndices
  const cfiK = cfiInterpretationKey(fi.cfi)
  const tliK = tliInterpretationKey(fi.tli)
  const rmseaK = rmseaInterpretationKey(fi.rmsea)
  const srmrK = srmrInterpretationKey(fi.srmr)

  const ciStr =
    Number.isFinite(fi.rmseaCiLow) && Number.isFinite(fi.rmseaCiHigh)
      ? `90% CI [${fmtNum(fi.rmseaCiLow, 3)}, ${fmtNum(fi.rmseaCiHigh, 3)}]`
      : null
  const chi2Sub =
    `df = ${result.df}, p = ${fmtP(result.pChi2)}${fmtSig(result.pChi2)}`

  return (
    <div>
      <Heading>{t.cfa.result.fitIndicesTitle}</Heading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FitCard
          label="χ²"
          value={fmtNum(result.chi2, 3)}
          sub={chi2Sub}
          key_={null}
          t={t}
        />
        <FitCard
          label="CFI"
          value={fmtNum(fi.cfi, 3)}
          sub={null}
          key_={cfiK}
          t={t}
        />
        <FitCard
          label="TLI"
          value={fmtNum(fi.tli, 3)}
          sub={null}
          key_={tliK}
          t={t}
        />
        <FitCard
          label="RMSEA"
          value={fmtNum(fi.rmsea, 3)}
          sub={ciStr}
          key_={rmseaK}
          t={t}
        />
        <FitCard
          label="SRMR"
          value={fmtNum(fi.srmr, 3)}
          sub={null}
          key_={srmrK}
          t={t}
        />
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">
            {t.cfa.result.cols.rmseaP}
          </div>
          <div className="font-mono text-2xl text-duo-cocoa-700">
            {fmtP(fi.rmseaP)}
          </div>
          <div className="text-[11px] text-duo-cocoa-500 mt-0.5">
            {t.cfa.result.rmseaPNote}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug whitespace-pre-line">
        {t.cfa.result.thresholdNote}
      </p>
    </div>
  )
}

function LoadingsTable({ result, t, labelMap }) {
  const c = t.cfa.result.cols
  const showSE = result.hasStandardErrors
  return (
    <div>
      <Heading>{t.cfa.result.loadingsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.factor}</Th>
              <Th align="left">{c.indicator}</Th>
              <Th>{c.lambda}</Th>
              {showSE && <Th>{c.se}</Th>}
              {showSE && <Th>{c.z}</Th>}
              {showSE && <Th>{c.p}</Th>}
              <Th>{c.lambdaStd}</Th>
              <Th>{c.r2}</Th>
            </tr>
          </thead>
          <tbody>
            {result.loadings.map((row, i) => {
              const sigCls = showSE && Number.isFinite(row.p) && row.p < 0.05
                ? 'text-duo-amber-700 font-semibold'
                : 'text-duo-cocoa-700'
              const stdAbs = Math.abs(row.lambdaStd)
              const stdCls =
                stdAbs < 0.4 ? 'text-duo-tongue'
                : stdAbs < 0.5 ? 'text-duo-cocoa-500'
                : stdAbs < 0.7 ? 'text-duo-cocoa-800'
                : 'text-duo-amber-700 font-semibold'
              return (
                <tr key={i}>
                  <Td align="left" mono={false} bold>{row.factor}</Td>
                  <Td align="left" mono={false}>
                    {labelMap[row.indicator] || row.indicator}
                  </Td>
                  <Td>{fmtNum(row.lambda, 3)}</Td>
                  {showSE && <Td>{Number.isFinite(row.se) ? fmtNum(row.se, 3) : '—'}</Td>}
                  {showSE && <Td>{Number.isFinite(row.z) ? fmtNum(row.z, 2) : '—'}</Td>}
                  {showSE && (
                    <Td color={sigCls}>
                      {Number.isFinite(row.p) ? fmtP(row.p) + fmtSig(row.p) : '—'}
                    </Td>
                  )}
                  <Td color={stdCls}>{fmtNum(row.lambdaStd, 3)}</Td>
                  <Td>{fmtNum(row.r2, 3)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!showSE && (
        <p className="text-[11px] text-duo-tongue mt-2 leading-snug">
          {t.cfa.result.seUnavailable}
        </p>
      )}
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        {t.cfa.result.loadingsNote}
      </p>
    </div>
  )
}

function FactorCorrelationsTable({ result, t }) {
  if (result.m < 2) return null
  const c = t.cfa.result.cols
  return (
    <div>
      <Heading>{t.cfa.result.factorCorrTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.factor}</Th>
              {result.factors.map((f, j) => (
                <Th key={j}>{f.name}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.factorCorrelations.map((row, i) => (
              <tr key={i}>
                <Td align="left" mono={false} bold>{result.factors[i].name}</Td>
                {row.map((v, j) => {
                  const same = i === j
                  const a = Math.abs(v)
                  const cls = same
                    ? 'text-duo-cocoa-300'
                    : a >= 0.7 ? 'text-duo-tongue font-semibold'
                    : a >= 0.5 ? 'text-duo-amber-700'
                    : 'text-duo-cocoa-700'
                  return (
                    <Td key={j} color={cls}>{fmtNum(v, 3)}</Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        {t.cfa.result.factorCorrNote}
      </p>
    </div>
  )
}

function ResidualsTable({ result, t, labelMap }) {
  const c = t.cfa.result.cols
  const showSE = result.hasStandardErrors
  return (
    <div>
      <Heading>{t.cfa.result.residualsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.indicator}</Th>
              <Th>{c.theta}</Th>
              {showSE && <Th>{c.se}</Th>}
            </tr>
          </thead>
          <tbody>
            {result.residualVariances.map((row, i) => (
              <tr key={i}>
                <Td align="left" mono={false}>{labelMap[row.indicator] || row.indicator}</Td>
                <Td>{fmtNum(row.theta, 3)}</Td>
                {showSE && (
                  <Td>{Number.isFinite(row.se) ? fmtNum(row.se, 3) : '—'}</Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Interpretation({ result, t }) {
  const fi = result.fitIndices
  const overallKeys = [
    cfiInterpretationKey(fi.cfi),
    tliInterpretationKey(fi.tli),
    rmseaInterpretationKey(fi.rmsea),
    srmrInterpretationKey(fi.srmr),
  ]
  let overallKey = 'good'
  if (overallKeys.some((k) => k === 'poor')) overallKey = 'poor'
  else if (overallKeys.some((k) => k === 'acceptable')) overallKey = 'acceptable'
  const text = fillTemplate(t.cfa.interp.summary, {
    n: result.n, p: result.p, m: result.m, df: result.df,
    chi2: fmtNum(result.chi2, 2),
    pStr: fmtP(result.pChi2),
    cfi: fmtNum(fi.cfi, 3),
    tli: fmtNum(fi.tli, 3),
    rmsea: fmtNum(fi.rmsea, 3),
    rmseaCi: Number.isFinite(fi.rmseaCiLow) && Number.isFinite(fi.rmseaCiHigh)
      ? `[${fmtNum(fi.rmseaCiLow, 3)}, ${fmtNum(fi.rmseaCiHigh, 3)}]`
      : '—',
    srmr: fmtNum(fi.srmr, 3),
    overall: t.cfa.fitInterp[overallKey],
  })
  return (
    <div className="mt-5">
      <Heading>{t.cfa.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
        {text}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCFA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.cfa.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div>
      <div className="mb-3">
        <ConvergenceBadge result={result} t={t} />
      </div>
      <Heading>{t.cfa.result.summaryTitle}</Heading>
      <SummaryStrip result={result} t={t} />
      <FitIndicesBlock result={result} t={t} />
      <LoadingsTable result={result} t={t} labelMap={labelMap} />
      <FactorCorrelationsTable result={result} t={t} />
      <ResidualsTable result={result} t={t} labelMap={labelMap} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
