/**
 * t 檢定 — Result（中欄）
 *
 * 結構：
 *   1. 假設前提檢核（最頂部，違反時黃色警示框；通過則簡潔列出）
 *   2. 敘述統計表（依 type 不同）
 *   3. t 檢定結果表（核心統計量：t, df, p, mean diff, SE, Cohen's d, effect）
 *   4. 教學模式專屬：白話解讀段落
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runTTest } from './compute'
import StatCards from '../../components/StatCards'
import { cohenDInterpretation } from '../../lib/stats/ttest'
import { fmtNum, fmtInt, fmtP, fillTemplate, toneForP } from '../../lib/format'

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

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td
      className={[
        'px-3 py-1.5 border-b border-duo-cream-100',
        `text-${align}`,
        mono ? 'font-mono' : '',
        bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
      ].join(' ')}
    >
      {children}
    </td>
  )
}

/* ─────────────────────  小元件  ───────────────────── */

function ErrorBox({ msg }) {
  return (
    <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  )
}

function AssumptionChecks({ assumptions, type, t }) {
  const r = t.ttest.result
  const items = []

  // Levene's
  if (assumptions.homogeneity) {
    const lv = assumptions.homogeneity
    const violated = lv.p < 0.05
    items.push({
      label: r.homogeneity,
      stat: `F(${lv.df1}, ${lv.df2}) = ${fmtNum(lv.F, 2)}, p = ${fmtP(lv.p)}`,
      ok: !violated,
    })
  }

  // Shapiro-Wilk per group / variable
  for (const sw of assumptions.normality) {
    const violated = sw.p < 0.05
    items.push({
      label: `${r.normality}（${sw.name}）`,
      stat: `W = ${fmtNum(sw.W, 3)}, p = ${fmtP(sw.p)}`,
      ok: !violated,
    })
  }

  const anyViolated = items.some((x) => !x.ok)

  return (
    <div>
      <Heading>{r.assumpTitle}</Heading>

      {anyViolated && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
          {r.assumpViolationWarn}
        </div>
      )}

      <ul className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
        {items.map((it, idx) => (
          <li
            key={idx}
            className={[
              'flex items-center justify-between px-3 py-2',
              idx > 0 ? 'border-t border-duo-cream-100' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-block w-2 h-2 rounded-full',
                  it.ok ? 'bg-duo-leaf' : 'bg-duo-tongue',
                ].join(' ')}
              />
              <span className="text-duo-cocoa-700">{it.label}</span>
            </div>
            <div className="font-mono text-duo-cocoa-700">
              {it.stat}{' '}
              <span className={it.ok ? 'text-duo-leaf' : 'text-duo-tongue'}>
                · {it.ok ? r.assumpOk : r.assumpViolated}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GroupStatsTable({ ttest, t, labelMap, dataset }) {
  const c = t.ttest.result.cols
  const r = t.ttest.result
  const valueLabels = dataset?.valueLabels?.[ttest.groupVarColName]
  // 取組別中英 label（如果 dataset 有 valueLabels）— 但 group 名是動態的，保留原值即可
  return (
    <div>
      <Heading>{r.groupStatsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.groupCol}</Th>
              <Th>n</Th>
              <Th>M</Th>
              <Th>SD</Th>
            </tr>
          </thead>
          <tbody>
            <tr><Td align="left" mono={false} bold>{ttest.g1Name}</Td><Td>{ttest.grp1.n}</Td><Td>{fmtNum(ttest.grp1.mean, 2)}</Td><Td>{fmtNum(ttest.grp1.sd, 2)}</Td></tr>
            <tr><Td align="left" mono={false} bold>{ttest.g2Name}</Td><Td>{ttest.grp2.n}</Td><Td>{fmtNum(ttest.grp2.mean, 2)}</Td><Td>{fmtNum(ttest.grp2.sd, 2)}</Td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PairedDescTable({ ttest, diffStats, t, labelMap }) {
  const r = t.ttest.result
  return (
    <div>
      <Heading>{r.pairedDescTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.t.replace('t', '')}</Th>
              <Th>n</Th>
              <Th>M</Th>
              <Th>SD</Th>
            </tr>
          </thead>
          <tbody>
            <tr><Td align="left" mono={false} bold>{labelMap[ttest.var1Name] || ttest.var1Name}</Td><Td>{diffStats.n}</Td><Td>{fmtNum(ttest.var1.mean, 2)}</Td><Td>{fmtNum(ttest.var1.sd, 2)}</Td></tr>
            <tr><Td align="left" mono={false} bold>{labelMap[ttest.var2Name] || ttest.var2Name}</Td><Td>{diffStats.n}</Td><Td>{fmtNum(ttest.var2.mean, 2)}</Td><Td>{fmtNum(ttest.var2.sd, 2)}</Td></tr>
            <tr className="bg-duo-cream-50/50">
              <Td align="left" mono={false} bold>diff = X₁ - X₂</Td>
              <Td>{diffStats.n}</Td>
              <Td>{fmtNum(diffStats.mean, 2)}</Td>
              <Td>{fmtNum(diffStats.sd, 2)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OneSampleDescTable({ ttest, t, labelMap }) {
  const r = t.ttest.result
  return (
    <div>
      <Heading>{r.oneSampleDescTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">變數 / Variable</Th>
              <Th>n</Th>
              <Th>M</Th>
              <Th>SD</Th>
              <Th>μ₀</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{labelMap.__depLabel || ''}</Td>
              <Td>{ttest.n}</Td>
              <Td>{fmtNum(ttest.mean, 2)}</Td>
              <Td>{fmtNum(ttest.sd, 2)}</Td>
              <Td>{fmtNum(ttest.mu0, 2)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TTestStatsTable({ ttest, t }) {
  const c = t.ttest.result.cols
  const r = t.ttest.result
  const effectKey = cohenDInterpretation(ttest.d)
  return (
    <div>
      <Heading>{r.ttestTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.t}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
              <Th>{c.meanDiff}</Th>
              <Th>{c.se}</Th>
              <Th>{c.d}</Th>
              <Th>{c.effect}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(ttest.t, 3)}</Td>
              <Td>{fmtNum(ttest.df, 2)}</Td>
              <Td>{fmtP(ttest.p)}</Td>
              <Td>{fmtNum(ttest.meanDiff, 2)}</Td>
              <Td>{fmtNum(ttest.se, 3)}</Td>
              <Td>{fmtNum(ttest.d, 2)}</Td>
              <Td mono={false}>{t.ttest.effectSize[effectKey]}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InterpretationParagraph({ result, t, labelMap }) {
  const { ttest, type } = result
  const effectKey = cohenDInterpretation(ttest.d)
  const sig = ttest.p < 0.05
  const data = {
    t: fmtNum(ttest.t, 3),
    pStr: fmtP(ttest.p),
    d: fmtNum(ttest.d, 2),
    effectWord: t.ttest.effectSize[effectKey],
    sigWord: sig ? '達顯著' : '未達顯著',
    practical: sig ? t.ttest.interp.practicalSig : t.ttest.interp.practicalNs,
  }

  let template
  if (type === 'independent') {
    template = t.ttest.interp.independent
    Object.assign(data, {
      g1Name: ttest.g1Name,
      g2Name: ttest.g2Name,
      m1: fmtNum(ttest.grp1.mean, 2),
      m2: fmtNum(ttest.grp2.mean, 2),
    })
  } else if (type === 'paired') {
    template = t.ttest.interp.paired
    Object.assign(data, {
      var1Name: labelMap[ttest.var1Name] || ttest.var1Name,
      var2Name: labelMap[ttest.var2Name] || ttest.var2Name,
      m1: fmtNum(ttest.var1.mean, 2),
      m2: fmtNum(ttest.var2.mean, 2),
    })
  } else {
    template = t.ttest.interp.oneSample
    Object.assign(data, {
      m: fmtNum(ttest.mean, 2),
      mu0: fmtNum(ttest.mu0, 2),
    })
  }

  // 中文 sigWord 替換英文 — i18n 切換時用 t.ttest.apa.sigYes/sigNo 比較精確
  // 直接把 sigYes/sigNo 對應字串放進 data
  data.sigWord = sig ? t.ttest.apa.sigYes : t.ttest.apa.sigNo

  const text = fillTemplate(template, data)

  return (
    <div className="mt-5">
      <Heading>解讀 / Reading</Heading>
      <p className="text-sm leading-relaxed text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </p>
    </div>
  )
}

/* ─────────────────────  主元件  ───────────────────── */

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [rawState] = useAnalysisState()
  const settings = rawState || {}

  const result = useMemo(() => (dataset ? runTTest(dataset.rows, settings) : null), [dataset, settings])
  if (!dataset) return null

  if (result.error) {
    const msgKey = result.error in t.ttest.config ? result.error : null
    let msg
    if (msgKey) msg = t.ttest.config[msgKey]
    else if (result.error === 'groupVarBadGroups')
      msg = fillTemplate(t.ttest.config.groupVarBadGroups, { k: result.meta.k })
    else msg = result.error
    return <ErrorBox msg={msg} />
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  // oneSample 需把依變項 label 注入
  if (result.type === 'oneSample') {
    labelMap.__depLabel = labelMap[settings.depVar] || settings.depVar
  }

  const cols = t.ttest.result.cols
  return (
    <div>
      <AssumptionChecks
        assumptions={result.assumptions}
        type={result.type}
        t={t}
      />

      {/* 關鍵統計量卡片（2026-07 UI 改版參考實作；p 值紅綠語意：顯著=綠、未達顯著=紅） */}
      <StatCards
        items={[
          { label: cols.t, value: fmtNum(result.ttest.t, 3), sub: `${cols.df} = ${fmtNum(result.ttest.df, 2)}` },
          {
            label: cols.p,
            value: fmtP(result.ttest.p),
            tone: toneForP(result.ttest.p),
            sub: Number.isFinite(result.ttest.p) ? (result.ttest.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          { label: cols.d, value: fmtNum(result.ttest.d, 3) },
          { label: cols.meanDiff, value: fmtNum(result.ttest.meanDiff, 2) },
        ]}
      />

      {result.type === 'independent' && (
        <GroupStatsTable
          ttest={result.ttest}
          t={t}
          labelMap={labelMap}
          dataset={dataset}
        />
      )}
      {result.type === 'paired' && (
        <PairedDescTable
          ttest={result.ttest}
          diffStats={result.diffStats}
          t={t}
          labelMap={labelMap}
        />
      )}
      {result.type === 'oneSample' && (
        <OneSampleDescTable ttest={result.ttest} t={t} labelMap={labelMap} />
      )}

      <TTestStatsTable ttest={result.ttest} t={t} />

      {mode === 'teaching' && (
        <InterpretationParagraph
          result={result}
          t={t}
          labelMap={labelMap}
        />
      )}
    </div>
  )
}

export default Result
