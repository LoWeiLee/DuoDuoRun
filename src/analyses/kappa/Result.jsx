/**
 * Cohen's Kappa — Result
 *
 * 顯示：
 *  1. kxk agreement table（對角線以暖色 highlight）
 *  2. κ 統計（κ、SE、95% CI、z、p、Po、Pe）
 *  3. 三種加權的 κ 對照（unweighted / linear / quadratic）
 *  4. Landis & Koch 解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runKappa } from './compute'
import { cohenKappa } from '../../lib/stats/kappa.js'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fillTemplate, toneForP } from '../../lib/format'
import Heading from '../../components/ui/Heading'

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false, highlight = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      highlight ? 'bg-duo-amber-50/40' : '',
      'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

/**
 * Landis & Koch (1977) 解讀
 */
function kappaInterpKey(k) {
  if (!Number.isFinite(k)) return 'undefined'
  if (k < 0) return 'poor'
  if (k < 0.2) return 'slight'
  if (k < 0.4) return 'fair'
  if (k < 0.6) return 'moderate'
  if (k < 0.8) return 'substantial'
  return 'almostPerfect'
}

function AgreementTable({ result, t, valueLabels }) {
  const { table, levels, rowTotals, colTotals, n } = result
  const k = levels.length
  return (
    <div>
      <Heading>{t.kappa.result.tableTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{t.kappa.result.cols.rater1Backslash2}</Th>
              {levels.map((lv) => (
                <Th key={lv}>{valueLabels[lv] || lv}</Th>
              ))}
              <Th>{t.kappa.result.cols.total}</Th>
            </tr>
          </thead>
          <tbody>
            {levels.map((lvRow, i) => (
              <tr key={lvRow}>
                <Td align="left" mono={false} bold>{valueLabels[lvRow] || lvRow}</Td>
                {levels.map((lvCol, j) => (
                  <Td key={lvCol} highlight={i === j}>{table[i][j]}</Td>
                ))}
                <Td bold>{rowTotals[i]}</Td>
              </tr>
            ))}
            <tr>
              <Td align="left" mono={false} bold>{t.kappa.result.cols.total}</Td>
              {colTotals.map((c, j) => (
                <Td key={j} bold>{c}</Td>
              ))}
              <Td bold>{n}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
        {fillTemplate(t.kappa.result.tableHint, { k })}
      </p>
    </div>
  )
}

function StatsTable({ result, t }) {
  const interpKey = kappaInterpKey(result.kappa)
  return (
    <div>
      <Heading>{t.kappa.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{t.kappa.result.cols.po}</Th>
              <Th>{t.kappa.result.cols.pe}</Th>
              <Th>{t.kappa.result.cols.kappa}</Th>
              <Th>{t.kappa.result.cols.se}</Th>
              <Th>{t.kappa.result.cols.ci95}</Th>
              <Th>{t.kappa.result.cols.z}</Th>
              <Th>{t.kappa.result.cols.p}</Th>
              <Th align="left">{t.kappa.result.cols.interp}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.po, 3)}</Td>
              <Td>{fmtNum(result.pe, 3)}</Td>
              <Td bold>{fmtNum(result.kappa, 3)}</Td>
              <Td>{fmtNum(result.seKappa, 3)}</Td>
              <Td>[{fmtNum(result.ciLow, 3)}, {fmtNum(result.ciHigh, 3)}]</Td>
              <Td>{fmtNum(result.z, 3)}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td align="left" mono={false}>{t.kappa.interp.levels[interpKey]}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VariantsTable({ rows, settings, t }) {
  // 同步重算三種 weighting，提供對照（Po / Pe 不一定一致，因為 weighting 改變定義）
  const variants = ['none', 'linear', 'quadratic'].map((w) => {
    const r = cohenKappa(rows, settings.rater1Var, settings.rater2Var, w)
    return { w, result: r }
  })
  return (
    <div>
      <Heading>{t.kappa.result.variantsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{t.kappa.result.cols.weighting}</Th>
              <Th>{t.kappa.result.cols.po}</Th>
              <Th>{t.kappa.result.cols.pe}</Th>
              <Th>{t.kappa.result.cols.kappa}</Th>
              <Th>{t.kappa.result.cols.ci95}</Th>
              <Th align="left">{t.kappa.result.cols.interp}</Th>
            </tr>
          </thead>
          <tbody>
            {variants.map(({ w, result }) => {
              if (result.error && result.error !== 'undefinedKappa') {
                return (
                  <tr key={w}>
                    <Td align="left" mono={false} bold>{t.kappa.weightings[w]}</Td>
                    <Td align="left" mono={false}>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td align="left" mono={false}>—</Td>
                  </tr>
                )
              }
              const interpKey = kappaInterpKey(result.kappa)
              const isCurrent = w === (settings.weighting || 'none')
              return (
                <tr key={w}>
                  <Td align="left" mono={false} bold highlight={isCurrent}>
                    {t.kappa.weightings[w]}
                    {isCurrent ? ' ★' : ''}
                  </Td>
                  <Td highlight={isCurrent}>{fmtNum(result.po, 3)}</Td>
                  <Td highlight={isCurrent}>{fmtNum(result.pe, 3)}</Td>
                  <Td bold highlight={isCurrent}>{fmtNum(result.kappa, 3)}</Td>
                  <Td highlight={isCurrent}>[{fmtNum(result.ciLow, 3)}, {fmtNum(result.ciHigh, 3)}]</Td>
                  <Td align="left" mono={false} highlight={isCurrent}>
                    {t.kappa.interp.levels[interpKey]}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
        {t.kappa.result.variantsHint}
      </p>
    </div>
  )
}

function Result() {
  const { dataset, lang, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runKappa(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error && result.error !== 'undefinedKappa') {
    const msg = t.kappa.errors[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const langKey = lang === 'zh-TW' ? 'zh' : 'en'
  // 兩位 rater 的 valueLabels 可能不同；交集後通常採 rater1 的 label 即可，
  // 若 rater1 缺、改 fallback rater2
  const labels1 = dataset.valueLabels?.[state.rater1Var]?.[langKey] || {}
  const labels2 = dataset.valueLabels?.[state.rater2Var]?.[langKey] || {}
  const valueLabels = { ...labels2, ...labels1 }

  const interpKey = kappaInterpKey(result.kappa)
  const sig = Number.isFinite(result.p) && result.p < 0.05
  const interp = fillTemplate(t.kappa.interp.overall, {
    n: result.n,
    k: result.levels.length,
    po: fmtNum(result.po, 3),
    pe: fmtNum(result.pe, 3),
    kappa: fmtNum(result.kappa, 3),
    ciLow: fmtNum(result.ciLow, 3),
    ciHigh: fmtNum(result.ciHigh, 3),
    z: fmtNum(result.z, 3),
    pStr: fmtP(result.p),
    sigWord: sig ? t.kappa.interp.sigYes : t.kappa.interp.sigNo,
    weighting: t.kappa.weightings[result.weighting] || result.weighting,
    level: t.kappa.interp.levels[interpKey],
  })

  return (
    <div>
      {/* 關鍵統計量卡片（2026-07 UI 改版；p 值紅綠語意：顯著=綠、未達顯著=紅） */}
      <StatCards
        items={[
          { label: t.kappa.result.cols.kappa, value: fmtNum(result.kappa, 3) },
          {
            label: t.kappa.result.cols.p,
            value: fmtP(result.p),
            tone: toneForP(result.p),
            sub: Number.isFinite(result.p) ? (result.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          {
            label: t.kappa.result.cols.ci95,
            value: `[${fmtNum(result.ciLow, 3)}, ${fmtNum(result.ciHigh, 3)}]`,
            long: true,
          },
        ]}
      />

      <AgreementTable result={result} t={t} valueLabels={valueLabels} />
      <StatsTable result={result} t={t} />
      <VariantsTable rows={dataset.rows} settings={state} t={t} />

      <div className="mt-5">
        <Heading>{t.kappa.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
          {interp}
        </div>
      </div>

      {result.error === 'undefinedKappa' && (
        <p className="text-[11px] text-duo-cocoa-500 mt-3 leading-snug">
          {t.kappa.errors.undefinedKappa}
        </p>
      )}
    </div>
  )
}

export default Result
