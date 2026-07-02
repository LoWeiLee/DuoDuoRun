/**
 * 重複量數 ANOVA — Result（中欄）
 * Repeated-measures ANOVA — Result panel (middle column).
 *
 * 結構 / Sections:
 *   1. n / k 摘要 / summary card
 *   2. 各條件敘述統計（Mean, SD, n） / per-condition descriptives
 *   3. Mauchly's W 球形檢定（k ≥ 3） / Mauchly's test of sphericity
 *   4. RM-ANOVA 表：Sphericity Assumed + GG + HF + Lower-bound 共 4 列
 *   5. 校正建議區塊 / correction recommendation banner
 *   6. 教學模式：白話解讀（球形違反時自動以 GG 為解讀依據）
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runRepeatedAnova } from './compute'
import { fmtNum, fmtP, fmtSig, fillTemplate } from '../../lib/format'

function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-100',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
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
  const r = t.repAnova.result
  return (
    <div>
      <Heading>{r.summaryTitle}</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border bg-duo-cream-50 border-duo-cream-200">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.n}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.n}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.kCond}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{result.k}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.f}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{fmtNum(result.f, 3)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.partialEta2}</div>
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">{fmtNum(result.partialEta2, 3)}</div>
        </div>
      </div>
    </div>
  )
}

function DescTable({ result, t, labelMap }) {
  const r = t.repAnova.result
  return (
    <div>
      <Heading>{r.descTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.condition}</Th>
              <Th>n</Th>
              <Th>{r.cols.mean}</Th>
              <Th>{r.cols.sd}</Th>
            </tr>
          </thead>
          <tbody>
            {result.conditions.map((col, i) => (
              <tr key={col}>
                <Td align="left" mono={false} bold>{labelMap[col] || col}</Td>
                <Td>{result.n}</Td>
                <Td>{fmtNum(result.means[i], 2)}</Td>
                <Td>{fmtNum(result.sd[i], 2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MauchlyTable({ result, t }) {
  const r = t.repAnova.result
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
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={[
              'inline-block w-2 h-2 rounded-full',
              violated ? 'bg-duo-tongue' : 'bg-duo-leaf',
            ].join(' ')} />
            <span className="text-duo-cocoa-700">{r.mauchlyLabel}</span>
          </div>
          <div className="font-mono text-duo-cocoa-700">
            W = {fmtNum(m.w, 3)}, χ²({m.df}) = {fmtNum(m.chi2, 3)}, p = {fmtP(m.p)}
            <span className={violated ? 'text-duo-tongue' : 'text-duo-leaf'}>
              {' '}· {violated ? r.mauchlyViolated : r.mauchlyOk}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const r = t.repAnova.result
  const c = r.cols

  // 4 列：Sphericity Assumed / GG / HF / Lower-bound
  const rows = [
    { name: r.sources.sa, dT: result.dfTreat, dE: result.dfError, p: result.p, eps: 1, applyEps: false },
    { name: r.sources.gg, dT: result.gg.dfTreat, dE: result.gg.dfError, p: result.gg.p, eps: result.gg.eps, applyEps: true },
    { name: r.sources.hf, dT: result.hf.dfTreat, dE: result.hf.dfError, p: result.hf.p, eps: result.hf.eps, applyEps: true },
    { name: r.sources.lb, dT: result.lb.dfTreat, dE: result.lb.dfError, p: result.lb.p, eps: result.lb.eps, applyEps: true },
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
              <Th>{c.etaG2}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const ms = row.dT > 0 ? result.ssTreat / row.dT : NaN
              return (
                <tr key={idx}>
                  <Td align="left" mono={false} bold>{row.name}</Td>
                  <Td>{row.applyEps ? fmtNum(row.eps, 3) : '—'}</Td>
                  <Td>{fmtNum(result.ssTreat, 2)}</Td>
                  <Td>{fmtNum(row.dT, 2)}</Td>
                  <Td>{fmtNum(row.dE, 2)}</Td>
                  <Td>{fmtNum(ms, 2)}</Td>
                  <Td>{fmtNum(result.f, 3)}</Td>
                  <Td>{fmtP(row.p)}{fmtSig(row.p)}</Td>
                  <Td>{fmtNum(result.partialEta2, 3)}</Td>
                  <Td>{fmtNum(result.etaG2, 3)}</Td>
                </tr>
              )
            })}
            <tr>
              <Td align="left" mono={false} bold>{r.sources.error}</Td>
              <Td></Td>
              <Td>{fmtNum(result.ssError, 2)}</Td>
              <Td colSpan={2} mono={false}>
                <span className="font-mono">{result.dfError}</span>
              </Td>
              <Td>{fmtNum(result.msError, 2)}</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{r.sources.bs}</Td>
              <Td></Td>
              <Td>{fmtNum(result.ssBS, 2)}</Td>
              <Td colSpan={2} mono={false}>
                <span className="font-mono">{result.dfBS}</span>
              </Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{r.sources.total}</Td>
              <Td></Td>
              <Td>{fmtNum(result.ssTotal, 2)}</Td>
              <Td colSpan={2} mono={false}>
                <span className="font-mono">{result.dfTotal}</span>
              </Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
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
  const r = t.repAnova.result
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

function Interpretation({ result, t }) {
  const r = t.repAnova
  const m = result.mauchly
  const useGG = m.applicable && Number.isFinite(m.p) && m.p < 0.05
  const sourceName = useGG ? r.result.sources.gg : r.result.sources.sa
  const dT = useGG ? result.gg.dfTreat : result.dfTreat
  const dE = useGG ? result.gg.dfError : result.dfError
  const pUse = useGG ? result.gg.p : result.p
  const sig = pUse < 0.05
  const etaKey = etaInterpKey(result.partialEta2)

  const text = fillTemplate(r.interp.overall, {
    n: result.n,
    k: result.k,
    sourceName,
    df1: fmtNum(dT, 2),
    df2: fmtNum(dE, 2),
    f: fmtNum(result.f, 3),
    pStr: fmtP(pUse),
    sigWord: sig ? r.interp.sigYes : r.interp.sigNo,
    eta2: fmtNum(result.partialEta2, 3),
    etaInterp: etaKey ? r.result.effectInterp[etaKey] : '—',
    etaG2: fmtNum(result.etaG2, 3),
  })
  const note = useGG
    ? r.interp.useGG
    : (m.applicable ? r.interp.useSA : r.interp.k2Note)

  return (
    <div className="mt-5">
      <Heading>{r.interp.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{text}</p>
        <p className="mt-3 text-duo-cocoa-500">{note}</p>
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runRepeatedAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'tooFewN')
      msg = fillTemplate(t.repAnova.errors.tooFewN, { n: result.meta?.n ?? '?' })
    else msg = t.repAnova.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div>
      <SummaryCard result={result} t={t} />
      <DescTable result={result} t={t} labelMap={labelMap} />
      <MauchlyTable result={result} t={t} />
      <AnovaTable result={result} t={t} />
      <Recommendation result={result} t={t} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
