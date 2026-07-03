/**
 * Fisher 精確檢定 — Result
 *
 * 顯示：
 *   1. 2×2 列聯表（觀察次數）
 *   2. 檢定統計量：p、OR、OR 95% CI、效果量解讀
 *   3. 解讀段落（白底卡片）
 *   4. 警告：若任一變數類別數 > 2 或啟用 Haldane 修正
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runFisherExact } from './compute'
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

/** ln OR 的效果量解讀 */
function lnOrInterpKey(lnOr) {
  const a = Math.abs(lnOr)
  if (a < 0.5) return 'trivial'
  if (a < 1.0) return 'small'
  if (a < 2.0) return 'medium'
  return 'large'
}

function Result() {
  const { dataset, lang, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runFisherExact(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.fisherExact.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const langKey = lang === 'zh-TW' ? 'zh' : 'en'
  const rowValueLabels = dataset.valueLabels?.[state.rowVar]?.[langKey] || {}
  const colValueLabels = dataset.valueLabels?.[state.colVar]?.[langKey] || {}
  const rowVarLabel = dataset.labels?.[langKey]?.[state.rowVar] || state.rowVar
  const colVarLabel = dataset.labels?.[langKey]?.[state.colVar] || state.colVar

  const rSucc = rowValueLabels[result.rowLevels[0]] || result.rowLevels[0]
  const rFail = rowValueLabels[result.rowLevels[1]] || result.rowLevels[1]
  const cSucc = colValueLabels[result.colLevels[0]] || result.colLevels[0]
  const cFail = colValueLabels[result.colLevels[1]] || result.colLevels[1]

  const sig = result.p < 0.05
  const ek = lnOrInterpKey(result.lnOr)
  const interp = fillTemplate(t.fisherExact.interp.overall, {
    rSucc, rFail, cSucc, cFail,
    rowVar: rowVarLabel, colVar: colVarLabel,
    a: result.a, b: result.b, c: result.c, d: result.d,
    n: result.n,
    pStr: fmtP(result.p),
    sigWord: sig ? t.fisherExact.interp.sigYes : t.fisherExact.interp.sigNo,
    or: fmtNum(result.or, 3),
    orCiLow: fmtNum(result.orCiLow, 3),
    orCiHigh: fmtNum(result.orCiHigh, 3),
    effect: t.fisherExact.result.effectInterp[ek],
  })

  return (
    <div>
      {/* 警告區 */}
      {(result.tooManyRowLevels || result.tooManyColLevels || result.haldaneApplied) && (
        <div className="mb-4 space-y-1">
          {result.tooManyRowLevels && (
            <div className="text-[11px] text-duo-cocoa-500 bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2 leading-snug">
              {fillTemplate(t.fisherExact.warnings.tooManyRowLevels, {
                varLabel: rowVarLabel,
                count: result.rowLevelsAll.length,
              })}
            </div>
          )}
          {result.tooManyColLevels && (
            <div className="text-[11px] text-duo-cocoa-500 bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2 leading-snug">
              {fillTemplate(t.fisherExact.warnings.tooManyColLevels, {
                varLabel: colVarLabel,
                count: result.colLevelsAll.length,
              })}
            </div>
          )}
          {result.haldaneApplied && (
            <div className="text-[11px] text-duo-cocoa-500 bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2 leading-snug">
              {t.fisherExact.warnings.haldane}
            </div>
          )}
        </div>
      )}

      {/* 關鍵統計量卡片（2026-07 UI 改版） */}
      <StatCards
        items={[
          {
            label: t.fisherExact.result.cols.p,
            value: fmtP(result.p),
            tone: toneForP(result.p),
            sub: Number.isFinite(result.p) ? (result.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          {
            label: t.fisherExact.result.cols.or,
            value: fmtNum(result.or, 3),
            sub: `[${fmtNum(result.orCiLow, 3)}, ${fmtNum(result.orCiHigh, 3)}]`,
          },
          { label: t.fisherExact.result.cols.lnOr, value: fmtNum(result.lnOr, 3) },
        ]}
      />

      {/* 2×2 列聯表 */}
      <Heading>{t.fisherExact.result.tableTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{rowVarLabel} \ {colVarLabel}</Th>
              <Th>{cSucc}</Th>
              <Th>{cFail}</Th>
              <Th>{t.fisherExact.result.cols.rowTotal}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{rSucc}</Td>
              <Td>{result.a}</Td>
              <Td>{result.b}</Td>
              <Td>{result.a + result.b}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{rFail}</Td>
              <Td>{result.c}</Td>
              <Td>{result.d}</Td>
              <Td>{result.c + result.d}</Td>
            </tr>
            <tr className="bg-duo-cream-50">
              <Td align="left" mono={false} bold>{t.fisherExact.result.cols.colTotal}</Td>
              <Td bold>{result.a + result.c}</Td>
              <Td bold>{result.b + result.d}</Td>
              <Td bold>{result.n}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 檢定統計量 */}
      <Heading>{t.fisherExact.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{t.fisherExact.result.cols.p}</Th>
              <Th>{t.fisherExact.result.cols.or}</Th>
              <Th>{t.fisherExact.result.cols.orCi95}</Th>
              <Th>{t.fisherExact.result.cols.lnOr}</Th>
              <Th align="left">{t.fisherExact.result.cols.effect}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtP(result.p)}</Td>
              <Td>{fmtNum(result.or, 3)}</Td>
              <Td>[{fmtNum(result.orCiLow, 3)}, {fmtNum(result.orCiHigh, 3)}]</Td>
              <Td>{fmtNum(result.lnOr, 3)}</Td>
              <Td align="left" mono={false}>{t.fisherExact.result.effectInterp[ek]}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 解讀 */}
      <div className="mt-5">
        <Heading>{t.fisherExact.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
          {interp}
        </div>
      </div>
    </div>
  )
}

export default Result
