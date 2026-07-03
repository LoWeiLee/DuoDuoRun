/**
 * 多元迴歸 — Result（中欄）
 *
 * 結構：
 *   1. 殘差常態性檢核
 *   2. Model summary（R / R² / Adj. R² / SE 估計值 / n）
 *   3. ANOVA 整體 F 表
 *   4. 係數表（含截距、所有預測項，含 b/SE/β/t/p/VIF）
 *      - VIF > 5 amber 警示、> 10 tongue 紅色
 *   5. VIF 警示總結（若有）
 *   6. 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runMultipleRegression } from './compute'
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

function vifColor(vif) {
  if (!Number.isFinite(vif)) return 'text-duo-tongue font-semibold'
  if (vif > 10) return 'text-duo-tongue font-semibold'
  if (vif > 5) return 'text-duo-amber-700 font-semibold'
  return 'text-duo-cocoa-700'
}

function AssumptionRow({ result, t }) {
  const sw = result.assumptions.residualNormality
  const violated = Number.isFinite(sw.p) && sw.p < 0.05
  return (
    <div>
      <Heading>{t.multReg.result.assumpTitle}</Heading>
      {violated && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
          殘差常態性違反（p &lt; .05）— 在小樣本下迴歸的 p 值與信賴區間可能失準。 / Residual normality violated; CIs and p-values may be misleading at small n.
        </div>
      )}
      <ul className="bg-white border border-duo-cocoa-100 rounded-md overflow-hidden text-xs">
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
  const c = t.multReg.result.cols
  const fit = result.reg.fit
  return (
    <div>
      <Heading>{t.multReg.result.modelTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.r}</Th>
              <Th>{c.r2}</Th>
              <Th>{c.adjR2}</Th>
              <Th>{c.se}</Th>
              <Th>{c.n}</Th>
              <Th>k</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(fit.r, 3)}</Td>
              <Td>{fmtNum(fit.r2, 3)}</Td>
              <Td>{fmtNum(fit.adjR2, 3)}</Td>
              <Td>{fmtNum(fit.seEstimate, 3)}</Td>
              <Td>{result.reg.n}</Td>
              <Td>{result.reg.k}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const c = t.multReg.result.cols
  const a = result.reg.anova
  return (
    <div>
      <Heading>{t.multReg.result.anovaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
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
  const c = t.multReg.result.cols
  const reg = result.reg
  const hasHighVif = reg.coefficients.some((co) => co.vif > 5 || !Number.isFinite(co.vif))
  return (
    <div>
      <Heading>{t.multReg.result.coefTitle}</Heading>
      {hasHighVif && (
        <div className="mb-3 p-3 rounded-md bg-duo-amber-50 border border-duo-amber-200 text-xs text-duo-cocoa-800 leading-relaxed">
          {t.multReg.result.vifWarn}
        </div>
      )}
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.predictor}</Th>
              <Th>{c.b}</Th>
              <Th>{c.stdErr}</Th>
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
                <Td color={vifColor(co.vif)}>{fmtNum(co.vif, 2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Interpretation({ result, t, labelMap }) {
  const reg = result.reg
  const sig = reg.anova.p < 0.05
  const overall = fillTemplate(t.multReg.interp.overall, {
    df1: reg.anova.dfReg,
    df2: reg.anova.dfRes,
    f: fmtNum(reg.anova.F, 3),
    pStr: fmtP(reg.anova.p),
    sigWord: sig ? t.multReg.interp.sigYes : t.multReg.interp.sigNo,
    r2: fmtNum(reg.fit.r2, 3),
    r2Pct: fmtNum(reg.fit.r2 * 100, 1),
    adjR2: fmtNum(reg.fit.adjR2, 3),
  })

  return (
    <div className="mt-5">
      <Heading>{t.multReg.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p>{overall}</p>

        <p className="mt-3 font-medium">{t.multReg.interp.coefSection}</p>
        <ul className="mt-1.5 space-y-1.5">
          {reg.coefficients.map((co) => {
            const sigCo = co.p < 0.05
            const text = fillTemplate(t.multReg.interp.coefLine, {
              name: labelMap[co.name] || co.name,
              b: fmtNum(co.b, 3),
              se: fmtNum(co.se, 3),
              beta: fmtNum(co.beta, 3),
              t: fmtNum(co.t, 3),
              pStr: fmtP(co.p),
              sigWord: sigCo ? t.multReg.interp.sigYes : t.multReg.interp.sigNo,
            })
            return (
              <li key={co.name} className={sigCo ? 'text-duo-cocoa-800' : 'text-duo-cocoa-500'}>
                · {text}
              </li>
            )
          })}
        </ul>

        <p className="mt-3 font-medium">{t.multReg.interp.vifSection}</p>
        <ul className="mt-1.5 space-y-1">
          {reg.coefficients.map((co) => {
            let warn = ''
            if (!Number.isFinite(co.vif) || co.vif > 10) warn = t.multReg.interp.vifWarnSevere
            else if (co.vif > 5) warn = t.multReg.interp.vifWarnHigh
            const text = fillTemplate(t.multReg.interp.vifLine, {
              name: labelMap[co.name] || co.name,
              vif: fmtNum(co.vif, 2),
              warn,
            })
            return (
              <li key={co.name} className={warn ? 'text-duo-tongue' : 'text-duo-cocoa-500'}>
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
  const result = useMemo(() => (dataset ? runMultipleRegression(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.multReg.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const cols = t.multReg.result.cols
  const maxVif = Math.max(...result.reg.coefficients.map((co) => co.vif))

  return (
    <div>
      <AssumptionRow result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版） */}
      <StatCards
        items={[
          { label: cols.r2, value: fmtNum(result.reg.fit.r2, 3) },
          { label: cols.adjR2, value: fmtNum(result.reg.fit.adjR2, 3) },
          {
            label: cols.p,
            value: fmtP(result.reg.anova.p),
            tone: toneForP(result.reg.anova.p),
            sub: Number.isFinite(result.reg.anova.p) ? (result.reg.anova.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          {
            label: `max ${cols.vif}`,
            value: fmtNum(maxVif, 2),
            tone: !Number.isFinite(maxVif) || maxVif > 10 ? 'bad' : maxVif > 5 ? 'warn' : undefined,
          },
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
