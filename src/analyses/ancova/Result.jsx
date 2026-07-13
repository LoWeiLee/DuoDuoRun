/**
 * ANCOVA — Result（中欄）/ Result panel (middle column).
 *
 * 結構 / Sections:
 *   1. 斜率同質性檢定 / Homogeneity-of-regression-slopes test（違反時紅旗）
 *   2. ANCOVA 表（Source / SS / df / MS / F / p / partial η²）
 *   3. 原始 vs 調整（LS）平均並列 / Raw means vs adjusted (LS) means side-by-side
 *   4. 教學模式：白話解讀 / Teaching mode: plain-language interpretation
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runAncova } from './compute'
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

function HomogeneityCheck({ result, t }) {
  const r = t.ancova.result
  const h = result.homogeneityTest
  const has = Number.isFinite(h.f) && Number.isFinite(h.p)
  const violated = has && h.p < 0.05
  return (
    <div>
      <Heading>{r.homoTitle}</Heading>
      {violated && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
          {r.homoViolationWarn}
        </div>
      )}
      {!has ? (
        <div className="text-xs text-duo-cocoa-400 px-3 py-2">{r.homoNotComputable}</div>
      ) : (
        <div className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className={[
                'inline-block w-2 h-2 rounded-full shrink-0',
                violated ? 'bg-duo-sig-bad shadow-led-bad' : 'bg-duo-sig-ok shadow-led-ok',
              ].join(' ')} />
              <span className="text-duo-cocoa-700">{r.homoLabel}</span>
            </span>
            <span className="font-mono text-duo-cocoa-700 ml-auto text-right whitespace-nowrap">
              F({h.dfNum}, {h.dfDen}) = {fmtNum(h.f, 3)}, p = {fmtP(h.p)}
              <span className={violated ? 'text-duo-sig-bad' : 'text-duo-sig-ok'}>
                {' '}· {violated ? r.homoViolated : r.homoOk}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function AncovaTable({ result, t, factorLabel, covLabelMap }) {
  const c = t.ancova.result.cols
  const r = t.ancova.result
  return (
    <div>
      <Heading>{r.tableTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.source}</Th>
              <Th>{c.ss}</Th>
              <Th>{c.df}</Th>
              <Th>{c.ms}</Th>
              <Th>{c.f}</Th>
              <Th>{c.p}</Th>
              <Th>{c.partialEta2}</Th>
            </tr>
          </thead>
          <tbody>
            {result.covariates.map((cv) => (
              <tr key={cv.name}>
                <Td align="left" mono={false} bold>
                  {covLabelMap[cv.name] || cv.name}
                </Td>
                <Td>{fmtNum(cv.ss, 2)}</Td>
                <Td>{cv.df}</Td>
                <Td>{fmtNum(cv.ms, 2)}</Td>
                <Td>{fmtNum(cv.f, 3)}</Td>
                <Td>{fmtP(cv.p)}{fmtSig(cv.p)}</Td>
                <Td>{fmtNum(cv.partialEta2, 3)}</Td>
              </tr>
            ))}
            <tr>
              <Td align="left" mono={false} bold>{factorLabel}</Td>
              <Td>{fmtNum(result.factor.ss, 2)}</Td>
              <Td>{result.factor.df}</Td>
              <Td>{fmtNum(result.factor.ms, 2)}</Td>
              <Td>{fmtNum(result.factor.f, 3)}</Td>
              <Td>{fmtP(result.factor.p)}{fmtSig(result.factor.p)}</Td>
              <Td>{fmtNum(result.factor.partialEta2, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.error}</Td>
              <Td>{fmtNum(result.errorTerm.ss, 2)}</Td>
              <Td>{result.errorTerm.df}</Td>
              <Td>{fmtNum(result.errorTerm.ms, 2)}</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.total}</Td>
              <Td>{fmtNum(result.total.ss, 2)}</Td>
              <Td>{result.total.df}</Td>
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

function MeansTables({ result, t, valueLabels, lang }) {
  const r = t.ancova.result
  const c = r.cols
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Raw means */}
      <div>
        <Heading>{r.rawMeansTitle}</Heading>
        <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-duo-cream-50">
              <tr>
                <Th align="left">{c.level}</Th>
                <Th>n</Th>
                <Th>{c.mean}</Th>
              </tr>
            </thead>
            <tbody>
              {result.rawMeans.map((m) => (
                <tr key={m.level}>
                  <Td align="left" mono={false} bold>{labelOf(m.level)}</Td>
                  <Td>{m.n}</Td>
                  <Td>{fmtNum(m.mean, 2)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjusted (LS) means */}
      <div>
        <Heading>{r.adjMeansTitle}</Heading>
        <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-duo-cream-50">
              <tr>
                <Th align="left">{c.level}</Th>
                <Th>{c.adjMean}</Th>
                <Th>{c.se}</Th>
                <Th>{c.ci95}</Th>
              </tr>
            </thead>
            <tbody>
              {result.adjustedMeans.map((m) => (
                <tr key={m.level}>
                  <Td align="left" mono={false} bold>{labelOf(m.level)}</Td>
                  <Td>{fmtNum(m.mean, 2)}</Td>
                  <Td>{fmtNum(m.se, 3)}</Td>
                  <Td>[{fmtNum(m.ciLow, 2)}, {fmtNum(m.ciHigh, 2)}]</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {r.adjMeansHint}
        </p>
      </div>
    </div>
  )
}

function Interpretation({ result, t, factorLabel, yLabel, covLabelMap }) {
  const sigFactor = result.factor.p < 0.05
  const etaKey = etaInterpKey(result.factor.partialEta2)

  const overall = fillTemplate(t.ancova.interp.overall, {
    yLabel,
    factor: factorLabel,
    df1: result.factor.df,
    df2: result.errorTerm.df,
    f: fmtNum(result.factor.f, 3),
    pStr: fmtP(result.factor.p),
    sigWord: sigFactor ? t.ancova.interp.sigYes : t.ancova.interp.sigNo,
    eta2: fmtNum(result.factor.partialEta2, 3),
    etaInterp: etaKey ? t.ancova.result.effectInterp[etaKey] : '—',
  })

  return (
    <div className="mt-5">
      <Heading>{t.ancova.interp.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{overall}</p>
        <p className="mt-3 font-medium">{t.ancova.interp.covSection}</p>
        <ul className="mt-1.5 space-y-1.5">
          {result.covariates.map((cv) => {
            const sigCv = cv.p < 0.05
            const text = fillTemplate(t.ancova.interp.covLine, {
              name: covLabelMap[cv.name] || cv.name,
              df1: cv.df,
              df2: result.errorTerm.df,
              f: fmtNum(cv.f, 3),
              pStr: fmtP(cv.p),
              eta2: fmtNum(cv.partialEta2, 3),
              sigWord: sigCv ? t.ancova.interp.sigYes : t.ancova.interp.sigNo,
            })
            return (
              <li key={cv.name} className={sigCv ? 'text-duo-cocoa-800' : 'text-duo-cocoa-500'}>
                · {text}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runAncova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'factorBadGroups')
      msg = fillTemplate(t.ancova.errors.factorBadGroups, { k: result.meta?.k ?? '?' })
    else msg = t.ancova.errors[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const factorLabel = labelMap[result.factorVar] || result.factorVar
  const yLabel = labelMap[result.yVar] || result.yVar
  const covLabelMap = labelMap // same source
  const valueLabels = dataset.valueLabels?.[result.factorVar]

  return (
    <div>
      <HomogeneityCheck result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版；p 值紅綠語意：顯著=綠、未達顯著=紅） */}
      <StatCards
        items={[
          {
            label: t.ancova.result.cols.f,
            value: fmtNum(result.factor.f, 3),
            sub: `${t.ancova.result.cols.df} = ${result.factor.df}, ${result.errorTerm.df}`,
          },
          {
            label: t.ancova.result.cols.p,
            value: fmtP(result.factor.p),
            tone: toneForP(result.factor.p),
            sub: Number.isFinite(result.factor.p) ? (result.factor.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          { label: t.ancova.result.cols.partialEta2, value: fmtNum(result.factor.partialEta2, 3) },
        ]}
      />

      <AncovaTable result={result} t={t} factorLabel={factorLabel} covLabelMap={covLabelMap} />
      <div className="mt-5">
        <MeansTables result={result} t={t} valueLabels={valueLabels} lang={lang} />
      </div>
      {mode === 'teaching' && (
        <Interpretation
          result={result}
          t={t}
          factorLabel={factorLabel}
          yLabel={yLabel}
          covLabelMap={covLabelMap}
        />
      )}
    </div>
  )
}

export default Result
