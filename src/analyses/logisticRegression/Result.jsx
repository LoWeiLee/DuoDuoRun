import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runLogisticRegression } from './compute'
import { fmtNum, fmtP, fmtSig, fillTemplate } from '../../lib/format'
import { ROCPlot } from './ROCPlot'

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
      bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function aucKey(auc) {
  if (!Number.isFinite(auc)) return null
  if (auc < 0.6) return 'poor'
  if (auc < 0.7) return 'fair'
  if (auc < 0.8) return 'good'
  return 'excellent'
}

function ModelSummary({ result, t }) {
  const c = t.logReg.result.cols
  const f = result.fit
  return (
    <div>
      <Heading>{t.logReg.result.modelTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md mb-2">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.n}</Th>
              <Th>{c.k}</Th>
              <Th>{c.llNull}</Th>
              <Th>{c.ll}</Th>
              <Th>{c.mcFadden}</Th>
              <Th>{c.nagelkerke}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{result.n}</Td>
              <Td>{result.k}</Td>
              <Td>{fmtNum(f.llNull, 2)}</Td>
              <Td>{fmtNum(f.ll, 2)}</Td>
              <Td>{fmtNum(f.mcFadden, 3)}</Td>
              <Td>{fmtNum(f.nagelkerke, 3)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={[
        'text-[11px]',
        result.converged ? 'text-duo-leaf' : 'text-duo-tongue',
      ].join(' ')}>
        {result.converged
          ? fillTemplate(t.logReg.result.converged, { n: result.iterations })
          : t.logReg.result.notConverged}
      </p>
    </div>
  )
}

function OmnibusTable({ result, t }) {
  const c = t.logReg.result.cols
  const f = result.fit
  return (
    <div>
      <Heading>{t.logReg.result.omnibusTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.lrChi2}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(f.lrStat, 3)}</Td>
              <Td>{f.lrDf}</Td>
              <Td>{fmtP(f.lrP)}{fmtSig(f.lrP)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CoefficientsTable({ result, t, labelMap }) {
  const c = t.logReg.result.cols
  return (
    <div>
      <Heading>{t.logReg.result.coefTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.predictor}</Th>
              <Th>{c.b}</Th>
              <Th>{c.se}</Th>
              <Th>{c.z}</Th>
              <Th>{c.p}</Th>
              <Th>{c.or}</Th>
              <Th>{c.orCI}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.intercept}</Td>
              <Td>{fmtNum(result.intercept.b, 3)}</Td>
              <Td>{fmtNum(result.intercept.se, 3)}</Td>
              <Td>{fmtNum(result.intercept.z, 3)}</Td>
              <Td>{fmtP(result.intercept.p)}</Td>
              <Td>{fmtNum(result.intercept.or, 3)}</Td>
              <Td>[{fmtNum(result.intercept.orCI[0], 3)}, {fmtNum(result.intercept.orCI[1], 3)}]</Td>
            </tr>
            {result.coefficients.map((co) => (
              <tr key={co.name}>
                <Td align="left" mono={false} bold>{labelMap[co.name] || co.name}</Td>
                <Td>{fmtNum(co.b, 3)}</Td>
                <Td>{fmtNum(co.se, 3)}</Td>
                <Td>{fmtNum(co.z, 3)}</Td>
                <Td>{fmtP(co.p)}{fmtSig(co.p)}</Td>
                <Td>{fmtNum(co.or, 3)}</Td>
                <Td>[{fmtNum(co.orCI[0], 3)}, {fmtNum(co.orCI[1], 3)}]</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001 &nbsp;·&nbsp; CI 不跨 1 即顯著
      </p>
    </div>
  )
}

function ClassificationTable({ result, t, lang }) {
  const c = t.logReg.result.cols
  const cls = result.classification
  const sens = cls.tp + cls.fn > 0 ? cls.tp / (cls.tp + cls.fn) : NaN
  const spec = cls.tn + cls.fp > 0 ? cls.tn / (cls.tn + cls.fp) : NaN
  return (
    <div>
      <Heading>{t.logReg.result.classTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.actual} \ {c.predicted}</Th>
              <Th>{c.positive}</Th>
              <Th>{c.negative}</Th>
              <Th>{lang === 'zh-TW' ? '小計' : 'Total'}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.positive}</Td>
              <Td bold>{cls.tp}</Td>
              <Td>{cls.fn}</Td>
              <Td>{cls.tp + cls.fn}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.negative}</Td>
              <Td>{cls.fp}</Td>
              <Td bold>{cls.tn}</Td>
              <Td>{cls.fp + cls.tn}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
        <div className="px-3 py-2 rounded-md bg-duo-cream-50 border border-duo-cocoa-100">
          <div className="text-[10px] text-duo-cocoa-400 mb-0.5">{c.correctPercent}</div>
          <div className="font-mono text-duo-cocoa-800">{(cls.correctPercent * 100).toFixed(1)}%</div>
        </div>
        <div className="px-3 py-2 rounded-md bg-duo-cream-50 border border-duo-cocoa-100">
          <div className="text-[10px] text-duo-cocoa-400 mb-0.5">{c.sensitivity}</div>
          <div className="font-mono text-duo-cocoa-800">{(sens * 100).toFixed(1)}%</div>
        </div>
        <div className="px-3 py-2 rounded-md bg-duo-cream-50 border border-duo-cocoa-100">
          <div className="text-[10px] text-duo-cocoa-400 mb-0.5">{c.specificity}</div>
          <div className="font-mono text-duo-cocoa-800">{(spec * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

function RocSection({ result, t }) {
  return (
    <div>
      <Heading>{t.logReg.result.rocTitle}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-3">
        <ROCPlot points={result.roc.points} auc={result.roc.auc} />
      </div>
    </div>
  )
}

function Interpretation({ result, t, labelMap }) {
  const sig = result.fit.lrP < 0.05
  const ng = result.fit.nagelkerke
  let strengthWord
  if (ng < 0.2) strengthWord = t.logReg.interp.strengthWeak
  else if (ng < 0.4) strengthWord = t.logReg.interp.strengthFair
  else strengthWord = t.logReg.interp.strengthStrong
  const ak = aucKey(result.roc.auc)
  const aucWord = ak ? t.logReg.result.aucInterp[ak] : '—'

  const overall = fillTemplate(t.logReg.interp.overall, {
    df: result.fit.lrDf,
    chi2: fmtNum(result.fit.lrStat, 3),
    pStr: fmtP(result.fit.lrP),
    sigWord: sig ? t.logReg.interp.sigYes : t.logReg.interp.sigNo,
    nagelkerke: fmtNum(ng, 3),
    auc: fmtNum(result.roc.auc, 3),
    aucWord,
    correctPct: (result.classification.correctPercent * 100).toFixed(1),
    strengthWord,
  })

  return (
    <div className="mt-5">
      <Heading>{t.logReg.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p className="whitespace-pre-line">{overall}</p>
        <p className="mt-3 font-medium">{t.logReg.interp.coefSection}</p>
        <ul className="mt-1.5 space-y-1.5">
          {result.coefficients.map((co) => {
            const sigCo = co.p < 0.05
            const text = fillTemplate(t.logReg.interp.coefLine, {
              name: labelMap[co.name] || co.name,
              or: fmtNum(co.or, 3),
              ciLow: fmtNum(co.orCI[0], 3),
              ciHigh: fmtNum(co.orCI[1], 3),
              pStr: fmtP(co.p),
              sigWord: sigCo ? t.logReg.interp.sigYes : t.logReg.interp.sigNo,
            })
            return (
              <li key={co.name} className={sigCo ? 'text-duo-cocoa-800' : 'text-duo-cocoa-500'}>
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
  const result = useMemo(() => (dataset ? runLogisticRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'yNeedBinary')
      msg = fillTemplate(t.logReg.config.yNeedBinary, { k: result.meta.k })
    else msg = t.logReg.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div>
      <ModelSummary result={result} t={t} />
      <OmnibusTable result={result} t={t} />
      <CoefficientsTable result={result} t={t} labelMap={labelMap} />
      <ClassificationTable result={result} t={t} lang={lang} />
      <RocSection result={result} t={t} />
      {mode === 'teaching' && <Interpretation result={result} t={t} labelMap={labelMap} />}
    </div>
  )
}

export default Result
