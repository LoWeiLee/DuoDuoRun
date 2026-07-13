/**
 * Cronbach's α — Result（中欄）
 *
 * 結構：
 *   1. 總體信度卡片（α + 解讀 + k + n + 平均項間相關）
 *   2. 項目分析表（每題：M、SD、校正項目-總分相關、刪題後 α）
 *      - 校正項目-總分相關 < 0.30 紅色標示
 *      - 刪題後 α > 整體 α 的題目 amber 標示
 *   3. 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCronbachAlpha } from './compute'
import StatCards from '../../components/StatCards'
import { alphaInterpretationKey } from '../../lib/stats/alpha'
import { fmtNum, fmtInt, fillTemplate } from '../../lib/format'
import Heading from '../../components/ui/Heading'

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

function SummaryCard({ result, t }) {
  const ik = alphaInterpretationKey(result.alpha)
  const interp = ik ? t.alpha.interpretation[ik] : undefined
  return (
    <div>
      <Heading>{t.alpha.summaryTitle}</Heading>
      {/* 關鍵統計量卡片（2026-07 UI 改版；α 不加 tone） */}
      <StatCards
        items={[
          { label: t.alpha.cols.alpha, value: fmtNum(result.alpha, 3), sub: interp },
          { label: t.alpha.cols.kItems, value: fmtInt(result.k) },
          {
            label: t.alpha.cols.n,
            value: fmtInt(result.n),
            sub: result.droppedRows > 0
              ? fillTemplate(t.alpha.droppedNote, { n: result.droppedRows })
              : undefined,
          },
          { label: t.alpha.cols.meanInter, value: fmtNum(result.meanInterItemCorr, 3) },
        ]}
      />
    </div>
  )
}

function ItemTable({ result, t, labelMap }) {
  const c = t.alpha.cols
  const overallAlpha = result.alpha
  return (
    <div>
      <Heading>{t.alpha.itemTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.item}</Th>
              <Th>{c.mean}</Th>
              <Th>{c.sd}</Th>
              <Th>{c.itemTotalCorr}</Th>
              <Th>{c.alphaIfDeleted}</Th>
            </tr>
          </thead>
          <tbody>
            {result.itemStats.map((it) => {
              const lowITC = it.itemTotalCorr < 0.30
              const aboveAlpha =
                Number.isFinite(it.alphaIfDeleted) &&
                Number.isFinite(overallAlpha) &&
                it.alphaIfDeleted > overallAlpha + 0.005
              return (
                <tr key={it.col}>
                  <Td align="left" mono={false} bold color="text-duo-cocoa-800">
                    {labelMap[it.col] || it.col}
                  </Td>
                  <Td>{fmtNum(it.mean, 2)}</Td>
                  <Td>{fmtNum(it.sd, 2)}</Td>
                  <Td color={lowITC ? 'text-duo-sig-bad font-semibold' : 'text-duo-cocoa-700'}>
                    {fmtNum(it.itemTotalCorr, 3)}
                  </Td>
                  <Td color={aboveAlpha ? 'text-duo-amber-700 font-semibold' : 'text-duo-cocoa-700'}>
                    {fmtNum(it.alphaIfDeleted, 3)}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        {t.l === 'zh-TW' ? '' : ''}
        <span className="text-duo-sig-bad">●</span> 校正項目-總分相關 &lt; 0.30 / corrected r &lt; 0.30
        &nbsp;·&nbsp;
        <span className="text-duo-amber-700">●</span> 刪題後 α 高於整體 / α-if-deleted exceeds overall
      </p>
    </div>
  )
}

function Interpretation({ result, t }) {
  const ik = alphaInterpretationKey(result.alpha)
  const interp = ik ? t.alpha.interpretation[ik] : '—'
  let recommendation
  if (ik === 'excellent') recommendation = t.alpha.interp.recommendExcellent
  else if (ik === 'good') recommendation = t.alpha.interp.recommendGood
  else if (ik === 'acceptable') recommendation = t.alpha.interp.recommendAcceptable
  else recommendation = t.alpha.interp.recommendLow

  const text = fillTemplate(t.alpha.interp.summary, {
    k: result.k,
    n: result.n,
    alpha: fmtNum(result.alpha, 3),
    interp,
    meanInter: fmtNum(result.meanInterItemCorr, 3),
    recommendation,
  })

  return (
    <div className="mt-5">
      <Heading>{t.alpha.interp.header}</Heading>
      <p className="text-sm leading-relaxed text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </p>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCronbachAlpha(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.alpha[result.error] || t.errors.stats[result.error] || result.error}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div>
      <SummaryCard result={result} t={t} />
      <ItemTable result={result} t={t} labelMap={labelMap} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
