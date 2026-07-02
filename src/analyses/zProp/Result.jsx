/**
 * z 檢定（比例）— Result
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runZProp } from './compute'
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
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function hInterpKey(h) {
  const a = Math.abs(h)
  if (a < 0.2) return 'trivial'
  if (a < 0.5) return 'small'
  if (a < 0.8) return 'medium'
  return 'large'
}

function OneSampleResult({ result, t, lang, valueLabels }) {
  const successLabel = valueLabels[result.successLevel] || result.successLevel
  const sig = result.p < 0.05
  const interp = fillTemplate(t.zProp.interp.oneOverall, {
    n: result.n,
    x: result.x,
    phat: fmtNum(result.phat, 3),
    p0: fmtNum(result.p0, 3),
    z: fmtNum(result.z, 3),
    pStr: fmtP(result.p),
    sigWord: sig ? t.zProp.interp.sigYes : t.zProp.interp.sigNo,
    success: successLabel,
  })
  return (
    <div>
      <Heading>{t.zProp.result.summaryTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{t.zProp.result.cols.success}</Th>
              <Th>{t.zProp.result.cols.n}</Th>
              <Th>{t.zProp.result.cols.x}</Th>
              <Th>{t.zProp.result.cols.phat}</Th>
              <Th>{t.zProp.result.cols.p0}</Th>
              <Th>{t.zProp.result.cols.ci95}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{successLabel}</Td>
              <Td>{result.n}</Td>
              <Td>{result.x}</Td>
              <Td>{fmtNum(result.phat, 3)}</Td>
              <Td>{fmtNum(result.p0, 3)}</Td>
              <Td>[{fmtNum(result.ciLow, 3)}, {fmtNum(result.ciHigh, 3)}]</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <Heading>{t.zProp.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{t.zProp.result.cols.z}</Th>
              <Th>{t.zProp.result.cols.p}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.z, 3)}</Td>
              <Td>{fmtP(result.p)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <Heading>{t.zProp.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
          {interp}
        </div>
      </div>
    </div>
  )
}

function TwoSampleResult({ result, t, lang, dataset, groupVar, valueVar }) {
  const groupLabels = dataset.valueLabels?.[groupVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels = dataset.valueLabels?.[valueVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const g1 = groupLabels[result.g1Name] || result.g1Name
  const g2 = groupLabels[result.g2Name] || result.g2Name
  const successLabel = valueLabels[result.successLevel] || result.successLevel
  const sig = result.p < 0.05
  const ek = hInterpKey(result.h)
  const interp = fillTemplate(t.zProp.interp.twoOverall, {
    g1, g2,
    p1: fmtNum(result.p1, 3),
    p2: fmtNum(result.p2, 3),
    diff: fmtNum(result.diff, 3),
    z: fmtNum(result.z, 3),
    pStr: fmtP(result.p),
    sigWord: sig ? t.zProp.interp.sigYes : t.zProp.interp.sigNo,
    h: fmtNum(result.h, 3),
    effect: t.zProp.result.effectInterp[ek],
    success: successLabel,
  })
  return (
    <div>
      <Heading>{t.zProp.result.summaryTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{t.zProp.result.cols.group}</Th>
              <Th>{t.zProp.result.cols.n}</Th>
              <Th>{t.zProp.result.cols.x}</Th>
              <Th>{t.zProp.result.cols.phat}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{g1}</Td>
              <Td>{result.n1}</Td>
              <Td>{result.x1}</Td>
              <Td>{fmtNum(result.p1, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{g2}</Td>
              <Td>{result.n2}</Td>
              <Td>{result.x2}</Td>
              <Td>{fmtNum(result.p2, 3)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <Heading>{t.zProp.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{t.zProp.result.cols.diff}</Th>
              <Th>{t.zProp.result.cols.diffCi95}</Th>
              <Th>{t.zProp.result.cols.z}</Th>
              <Th>{t.zProp.result.cols.p}</Th>
              <Th>{t.zProp.result.cols.h}</Th>
              <Th align="left">{t.zProp.result.cols.effect}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.diff, 3)}</Td>
              <Td>[{fmtNum(result.diffCiLow, 3)}, {fmtNum(result.diffCiHigh, 3)}]</Td>
              <Td>{fmtNum(result.z, 3)}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td>{fmtNum(result.h, 3)}</Td>
              <Td align="left" mono={false}>{t.zProp.result.effectInterp[ek]}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <Heading>{t.zProp.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
          {interp}
        </div>
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runZProp(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg = t.zProp.errors[result.error] || result.error
    if (result.error === 'tooManyGroups' && result.extra?.groups) {
      msg = msg + '：' + result.extra.groups.join(', ')
    }
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  if (result.type === 'one') {
    const valueLabels = dataset.valueLabels?.[state.var1]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    return <OneSampleResult result={result} t={t} lang={lang} valueLabels={valueLabels} />
  }
  return (
    <TwoSampleResult
      result={result}
      t={t}
      lang={lang}
      dataset={dataset}
      groupVar={state.groupVar}
      valueVar={state.valueVar}
    />
  )
}

export default Result
