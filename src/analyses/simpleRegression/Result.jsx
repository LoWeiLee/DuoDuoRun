/**
 * 簡單迴歸 — Result（中欄）
 *
 * 結構：
 *   - 殘差常態性檢核（最頂部）
 *   - Model summary（r、R²、Adj. R²、SE 估計值）
 *   - ANOVA 表（迴歸 / 殘差 / 總和；含 SS、df、MS、F、p）
 *   - 係數表（常數項、斜率；含 b、SE、β、t、p）
 *   - 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runSimpleRegression } from './compute'
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

function AssumptionRow({ result, t }) {
  const sw = result.assumptions.residualNormality
  const violated = Number.isFinite(sw.p) && sw.p < 0.05
  return (
    <div>
      <Heading>{t.simpleReg.result.assumpTitle}</Heading>
      {violated && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
          殘差常態性違反（p &lt; .05）— 在小樣本下迴歸的 p 值與信賴區間可能失準。考慮樣本量是否足夠或檢視殘差散佈圖。 / Residual normality violated; consider sample size and inspect residual plot.
        </div>
      )}
      <ul className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className={[
              'inline-block w-2 h-2 rounded-full shrink-0',
              violated ? 'bg-duo-sig-bad shadow-led-bad' : 'bg-duo-sig-ok shadow-led-ok',
            ].join(' ')} />
            <span className="text-duo-cocoa-700">Shapiro-Wilk（{result.reg.n} 殘差）</span>
          </span>
          <span className="font-mono text-duo-cocoa-700 ml-auto text-right whitespace-nowrap">
            W = {fmtNum(sw.W, 3)}, p = {fmtP(sw.p)}{' '}
            <span className={violated ? 'text-duo-sig-bad' : 'text-duo-sig-ok'}>· {violated ? t.ttest.result.assumpViolated : t.ttest.result.assumpOk}</span>
          </span>
        </li>
      </ul>
    </div>
  )
}

function ModelSummary({ result, t }) {
  const c = t.simpleReg.result.cols
  const fit = result.reg.fit
  return (
    <div>
      <Heading>{t.simpleReg.result.modelTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.r}</Th>
              <Th>{c.r2}</Th>
              <Th>{c.adjR2}</Th>
              <Th>{c.se}</Th>
              <Th>n</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(fit.r, 3)}</Td>
              <Td>{fmtNum(fit.r2, 3)}</Td>
              <Td>{fmtNum(fit.adjR2, 3)}</Td>
              <Td>{fmtNum(fit.seEstimate, 3)}</Td>
              <Td>{result.reg.n}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const c = t.simpleReg.result.cols
  const a = result.reg.anova
  return (
    <div>
      <Heading>{t.simpleReg.result.anovaTitle}</Heading>
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
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.regression}</Td>
              <Td>{fmtNum(a.ssReg, 2)}</Td>
              <Td>{a.dfReg}</Td>
              <Td>{fmtNum(a.msReg, 2)}</Td>
              <Td>{fmtNum(a.F, 3)}</Td>
              <Td>{fmtP(a.p)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.residual}</Td>
              <Td>{fmtNum(a.ssRes, 2)}</Td>
              <Td>{a.dfRes}</Td>
              <Td>{fmtNum(a.msRes, 2)}</Td>
              <Td></Td>
              <Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.total}</Td>
              <Td>{fmtNum(a.ssTotal, 2)}</Td>
              <Td>{a.dfTotal}</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CoefficientsTable({ result, t, labelMap }) {
  const c = t.simpleReg.result.cols
  const reg = result.reg
  const xLabel = labelMap[result.xVar] || result.xVar
  return (
    <div>
      <Heading>{t.simpleReg.result.coefTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.predictor}</Th>
              <Th>{c.b}</Th>
              <Th>{c.stdErr}</Th>
              <Th>{c.beta}</Th>
              <Th>{c.t}</Th>
              <Th>{c.p}</Th>
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
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{xLabel}（{c.slope}）</Td>
              <Td>{fmtNum(reg.slope.b, 3)}</Td>
              <Td>{fmtNum(reg.slope.se, 3)}</Td>
              <Td>{fmtNum(reg.slope.beta, 3)}</Td>
              <Td>{fmtNum(reg.slope.t, 3)}</Td>
              <Td>{fmtP(reg.slope.p)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function strengthFor(beta) {
  const a = Math.abs(beta)
  if (a < 0.3) return 'Weak'
  if (a < 0.5) return 'Moderate'
  return 'Strong'
}

function Interpretation({ result, t, labelMap }) {
  const reg = result.reg
  const sig = reg.anova.p < 0.05
  const beta = reg.slope.beta
  const strength = strengthFor(beta)
  const strengthWord =
    strength === 'Weak' ? t.simpleReg.interp.strengthWeak :
    strength === 'Moderate' ? t.simpleReg.interp.strengthModerate :
    t.simpleReg.interp.strengthStrong

  const text = fillTemplate(t.simpleReg.interp.sentence, {
    xLabel: labelMap[result.xVar] || result.xVar,
    yLabel: labelMap[result.yVar] || result.yVar,
    sigWord: sig ? t.simpleReg.interp.sigYes : t.simpleReg.interp.sigNo,
    f: fmtNum(reg.anova.F, 3),
    pStr: fmtP(reg.anova.p),
    r2: fmtNum(reg.fit.r2, 3),
    r2Pct: fmtNum(reg.fit.r2 * 100, 1),
    b0: fmtNum(reg.intercept.b, 3),
    b1: fmtNum(reg.slope.b, 3),
    beta: fmtNum(beta, 3),
    strengthWord,
  })

  return (
    <div className="mt-5">
      <Heading>解讀 / Reading</Heading>
      <p className="text-sm leading-relaxed text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </p>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runSimpleRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.simpleReg.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const cols = t.simpleReg.result.cols

  return (
    <div>
      <AssumptionRow result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版） */}
      <StatCards
        items={[
          { label: cols.r2, value: fmtNum(result.reg.fit.r2, 3) },
          {
            label: cols.p,
            value: fmtP(result.reg.anova.p),
            tone: toneForP(result.reg.anova.p),
            sub: Number.isFinite(result.reg.anova.p) ? (result.reg.anova.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          { label: cols.slope, value: fmtNum(result.reg.slope.b, 3) },
          { label: cols.adjR2, value: fmtNum(result.reg.fit.adjR2, 3) },
        ]}
      />

      <ModelSummary result={result} t={t} />
      <AnovaTable result={result} t={t} />
      <CoefficientsTable result={result} t={t} labelMap={labelMap} />
      {mode === 'teaching' && <Interpretation result={result} t={t} labelMap={labelMap} />}
    </div>
  )
}

export default Result
