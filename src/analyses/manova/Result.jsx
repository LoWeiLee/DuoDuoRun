/**
 * MANOVA — Result（中欄）
 *
 * 結構：
 *   1. n / k / p 摘要列
 *   2. 各組敘述統計（M (SD)；列為組、欄為各 DV）
 *   3. Box's M 同質共變數矩陣檢定（綠燈：p > .001；紅燈：p ≤ .001）
 *   4. 多變量檢定表（Wilks Λ / Pillai V / Hotelling-Lawley T / Roy Largest Root）
 *      欄位：Statistic 值、F approx、df1、df2、p、partial η²。Roy 列附 upper-bound 註記。
 *   5. 推薦：Pillai 對假設違反最穩健；Wilks 最常用；Box's M 違反時優先報 Pillai。
 *   6. 特徵值表（E^(-1) H 的 λ_i）
 *   7. 教學模式：白話解讀
 *
 * MANOVA result panel: descriptives + Box's M + multivariate tests +
 * eigenvalues + interpretation.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runManova } from './compute'
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

function Td({ children, align = 'right', mono = true, bold = false, color }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-100',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      color || 'text-duo-cocoa-700',
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

/* ─────────────────────────  Summary  ───────────────────────── */

function SummaryLine({ result, t }) {
  const r = t.manova.result
  return (
    <div className="bg-white border border-duo-cream-200 rounded-lg px-3 py-2 text-xs text-duo-cocoa-700 font-mono">
      N = {result.n} &nbsp;·&nbsp; k = {result.k} ({r.groups}) &nbsp;·&nbsp; p = {result.p} ({r.dvs}) &nbsp;·&nbsp; df_h = {result.dfH}, df_e = {result.dfE}
    </div>
  )
}

/* ─────────────────────────  Group descriptives  ───────────────────────── */

function GroupDescTable({ result, t, valueLabels, lang, labelMap }) {
  const r = t.manova.result
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  // 重新 pivot：列 = group，欄 = 各 DV / re-pivot to rows=groups, cols=DVs
  const cell = {}
  for (const d of result.descriptives) {
    if (!cell[d.level]) cell[d.level] = {}
    cell[d.level][d.dv] = d
  }
  return (
    <div>
      <Heading>{r.descTitle}</Heading>
      <p className="text-[11px] text-duo-cocoa-400 mb-2">{r.descHint}</p>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.group}</Th>
              <Th>n</Th>
              {result.dvVars.map((dv) => (
                <Th key={dv}>{labelMap[dv] || dv}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.levels.map((lv, gi) => (
              <tr key={lv}>
                <Td align="left" mono={false} bold>{labelOf(lv)}</Td>
                <Td>{result.groupSizes[gi]}</Td>
                {result.dvVars.map((dv) => {
                  const d = cell[lv]?.[dv]
                  if (!d) return <Td key={dv}>—</Td>
                  return (
                    <Td key={dv}>
                      {fmtNum(d.mean, 2)}{' '}
                      <span className="text-duo-cocoa-400">({fmtNum(d.sd, 2)})</span>
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────  Box's M  ───────────────────────── */

function BoxMRow({ result, t }) {
  const r = t.manova.result
  const box = result.boxM
  if (!box || !box.applicable) {
    return (
      <div>
        <Heading>{r.boxMTitle}</Heading>
        <div className="bg-white border border-duo-cream-200 rounded-lg px-3 py-2 text-xs text-duo-cocoa-500">
          {r.boxMNotApplicable}
        </div>
      </div>
    )
  }
  const violated = Number.isFinite(box.p) && box.p <= 0.001
  return (
    <div>
      <Heading>{r.boxMTitle}</Heading>
      {violated && (
        <div className="mb-3 p-3 rounded-md bg-duo-amber-50 border border-duo-amber-200 text-xs text-duo-cocoa-800 leading-relaxed">
          {r.boxMViolatedWarn}
        </div>
      )}
      <div className="bg-white border border-duo-cream-200 rounded-lg text-xs">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={[
              'inline-block w-2 h-2 rounded-full',
              violated ? 'bg-duo-amber-500' : 'bg-duo-leaf',
            ].join(' ')} />
            <span className="text-duo-cocoa-700">{r.boxMLabel}</span>
          </div>
          <div className="font-mono text-duo-cocoa-700">
            M = {fmtNum(box.m, 2)}, χ²({box.df}) = {fmtNum(box.chi2, 2)}, p = {fmtP(box.p)}
            <span className={violated ? 'text-duo-amber-700 font-semibold' : 'text-duo-leaf'}>
              {' · '}{violated ? r.boxMViolated : r.boxMOk}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────  Multivariate test table  ───────────────────────── */

function MultivariateTable({ result, t }) {
  const r = t.manova.result
  const c = r.cols
  const { wilks, pillai, hotellingLawley, roy } = result
  const wEta = etaInterpKey(wilks.eta2)
  const pEta = etaInterpKey(pillai.eta2)
  return (
    <div>
      <Heading>{r.multTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.test}</Th>
              <Th>{c.statistic}</Th>
              <Th>{c.f}</Th>
              <Th>{c.df1}</Th>
              <Th>{c.df2}</Th>
              <Th>{c.p}</Th>
              <Th>{c.partialEta2}</Th>
            </tr>
          </thead>
          <tbody>
            {/* Wilks */}
            <tr>
              <Td align="left" mono={false} bold>
                {r.tests.wilks}
              </Td>
              <Td>{fmtNum(wilks.lambda, 3)}</Td>
              <Td>{fmtNum(wilks.f, 3)}</Td>
              <Td>{fmtNum(wilks.df1, 2)}</Td>
              <Td>{fmtNum(wilks.df2, 2)}</Td>
              <Td>{fmtP(wilks.p)}{fmtSig(wilks.p)}</Td>
              <Td>
                {fmtNum(wilks.eta2, 3)}
                {wEta && <span className="text-duo-amber-700 ml-1">{r.effectInterp[wEta]}</span>}
              </Td>
            </tr>
            {/* Pillai */}
            <tr>
              <Td align="left" mono={false} bold>
                {r.tests.pillai}
              </Td>
              <Td>{fmtNum(pillai.v, 3)}</Td>
              <Td>{fmtNum(pillai.f, 3)}</Td>
              <Td>{fmtNum(pillai.df1, 2)}</Td>
              <Td>{fmtNum(pillai.df2, 2)}</Td>
              <Td>{fmtP(pillai.p)}{fmtSig(pillai.p)}</Td>
              <Td>
                {fmtNum(pillai.eta2, 3)}
                {pEta && <span className="text-duo-amber-700 ml-1">{r.effectInterp[pEta]}</span>}
              </Td>
            </tr>
            {/* Hotelling-Lawley */}
            <tr>
              <Td align="left" mono={false} bold>
                {r.tests.hotellingLawley}
              </Td>
              <Td>{fmtNum(hotellingLawley.t, 3)}</Td>
              <Td>{fmtNum(hotellingLawley.f, 3)}</Td>
              <Td>{fmtNum(hotellingLawley.df1, 2)}</Td>
              <Td>{fmtNum(hotellingLawley.df2, 2)}</Td>
              <Td>{fmtP(hotellingLawley.p)}{fmtSig(hotellingLawley.p)}</Td>
              <Td>—</Td>
            </tr>
            {/* Roy */}
            <tr>
              <Td align="left" mono={false} bold>
                {r.tests.roy}
                <span className="ml-1 text-[10px] text-duo-amber-700">({r.upperBound})</span>
              </Td>
              <Td>{fmtNum(roy.theta, 3)}</Td>
              <Td>{fmtNum(roy.f, 3)}</Td>
              <Td>{fmtNum(roy.df1, 2)}</Td>
              <Td>{fmtNum(roy.df2, 2)}</Td>
              <Td>{fmtP(roy.p)}{fmtSig(roy.p)}</Td>
              <Td>—</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>
      <div className="mt-2 px-3 py-2 rounded-md bg-duo-cream-50 border border-duo-cream-200 text-[11px] text-duo-cocoa-700 leading-relaxed">
        {r.recommendation}
      </div>
    </div>
  )
}

/* ─────────────────────────  Eigenvalues  ───────────────────────── */

function EigenTable({ result, t }) {
  const r = t.manova.result
  if (!result.eigenvalues || result.eigenvalues.length === 0) return null
  return (
    <div>
      <Heading>{r.eigenTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.idx}</Th>
              <Th>{r.cols.eigenvalue}</Th>
              <Th>{r.cols.contribution}</Th>
            </tr>
          </thead>
          <tbody>
            {result.eigenvalues.map((lam, idx) => (
              <tr key={idx}>
                <Td align="left" mono={false} bold>λ{idx + 1}</Td>
                <Td>{fmtNum(lam, 4)}</Td>
                <Td>{fmtNum(lam / (1 + lam), 4)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.eigenHint}</p>
    </div>
  )
}

/* ─────────────────────────  Interpretation (teaching)  ───────────────────────── */

function Interpretation({ result, t }) {
  const r = t.manova.result
  const i = t.manova.interp
  const sig = result.wilks.p < 0.05 || result.pillai.p < 0.05
  const wEta = etaInterpKey(result.wilks.eta2)
  const pEta = etaInterpKey(result.pillai.eta2)

  const overall = fillTemplate(i.overall, {
    factor: result.factorVar,
    p: result.p,
    k: result.k,
    n: result.n,
    sigWord: sig ? i.sigYes : i.sigNo,
    wilks: fmtNum(result.wilks.lambda, 3),
    wDf1: fmtNum(result.wilks.df1, 2),
    wDf2: fmtNum(result.wilks.df2, 2),
    wF: fmtNum(result.wilks.f, 3),
    wPstr: fmtP(result.wilks.p),
    wEta2: fmtNum(result.wilks.eta2, 3),
    wEtaInterp: wEta ? r.effectInterp[wEta] : '—',
    pillai: fmtNum(result.pillai.v, 3),
    pF: fmtNum(result.pillai.f, 3),
    pPstr: fmtP(result.pillai.p),
    pEta2: fmtNum(result.pillai.eta2, 3),
    pEtaInterp: pEta ? r.effectInterp[pEta] : '—',
  })

  const boxLine = result.boxM?.applicable
    ? fillTemplate(i.boxLine, {
        chi2: fmtNum(result.boxM.chi2, 2),
        df: result.boxM.df,
        pStr: fmtP(result.boxM.p),
        verdict: result.boxM.p <= 0.001 ? i.boxBad : i.boxOk,
      })
    : i.boxNotApplicable

  return (
    <div className="mt-5">
      <Heading>{i.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{overall}</p>
        <p className="mt-3">{boxLine}</p>
        {sig ? (
          <p className="mt-2 text-duo-cocoa-700">{i.sigFollowUp}</p>
        ) : (
          <p className="mt-2 text-duo-cocoa-500">{i.nsAdvice}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────  Result entry  ───────────────────────── */

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runManova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'factorBadGroups')
      msg = fillTemplate(t.manova.errors.factorBadGroups, { k: result.meta?.k ?? 0 })
    else if (result.error === 'tooFewN')
      msg = fillTemplate(t.manova.errors.tooFewN, {
        N: result.meta?.N ?? 0,
        k: result.meta?.k ?? 0,
        p: result.meta?.p ?? 0,
      })
    else msg = t.manova.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels = dataset.valueLabels?.[result.factorVar]

  return (
    <div className="space-y-1">
      <SummaryLine result={result} t={t} />
      <GroupDescTable result={result} t={t} valueLabels={valueLabels} lang={lang} labelMap={labelMap} />
      <BoxMRow result={result} t={t} />
      <MultivariateTable result={result} t={t} />
      <EigenTable result={result} t={t} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
