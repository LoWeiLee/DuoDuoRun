/**
 * 卡方檢定 — Result（中欄）
 *
 * 結構：
 *   1. 假設前提檢核（期望次數 ≥ 5 比例）
 *   2. 列聯表（觀察次數）含邊際合計
 *   3. 期望次數
 *   4. 標準化殘差（|z| ≥ 1.96 amber 高亮）
 *   5. 統計量表（χ² / df / p / N / Cramer's V）
 *   6. 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runChiSquare } from './compute'
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

function cramerInterpretKey(v) {
  if (!Number.isFinite(v)) return null
  if (v < 0.1) return 'trivial'
  if (v < 0.3) return 'small'
  if (v < 0.5) return 'medium'
  return 'large'
}

function residColor(z) {
  if (!Number.isFinite(z)) return 'text-duo-cocoa-400'
  const a = Math.abs(z)
  if (a >= 1.96) return 'text-duo-amber-700 font-semibold'
  return 'text-duo-cocoa-700'
}

function AssumptionRow({ result, t }) {
  const okCells = result.totalCells - result.lowExpectedCells
  const okPct = result.totalCells > 0 ? okCells / result.totalCells : 0
  const violated = okPct < 0.8
  return (
    <div>
      <Heading>{t.chiSq.result.assumpTitle}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md text-xs">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={[
                'inline-block w-2 h-2 rounded-full',
                violated ? 'bg-duo-tongue' : 'bg-duo-leaf',
              ].join(' ')} />
              <span className="text-duo-cocoa-700">
                {fillTemplate(t.chiSq.result.assumpExpected, {
                  ok: okCells,
                  total: result.totalCells,
                })}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-duo-cocoa-400 mt-1 ml-4 font-mono">
            {fillTemplate(t.chiSq.result.assumpExpectedDetail, {
              min: fmtNum(result.minExpected, 2),
            })}
          </div>
          {violated && (
            <div className="text-[11px] text-duo-tongue mt-1 ml-4 leading-snug">
              {t.chiSq.result.assumpViolatedHint}
            </div>
          )}
          {result.suggestFisher && (
            <div className="text-[11px] text-duo-amber-700 mt-1 ml-4 leading-snug">
              {t.chiSq.result.fisherSuggest}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MatrixTable({ title, matrix, rowLabels, colLabels, rowTotals, colTotals, total, decimals = 0, cellColor, t }) {
  const showTotals = Array.isArray(rowTotals) && Array.isArray(colTotals)
  return (
    <div>
      <Heading>{title}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left"></Th>
              {colLabels.map((c) => (
                <Th key={c}>{c}</Th>
              ))}
              {showTotals && <Th>{t.chiSq.result.total}</Th>}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <Td align="left" mono={false} bold>{rowLabels[i]}</Td>
                {row.map((v, j) => (
                  <Td key={j} color={cellColor ? cellColor(v) : undefined}>{fmtNum(v, decimals)}</Td>
                ))}
                {showTotals && <Td bold>{rowTotals[i]}</Td>}
              </tr>
            ))}
            {showTotals && (
              <tr className="bg-duo-cream-50/50">
                <Td align="left" mono={false} bold>{t.chiSq.result.total}</Td>
                {colTotals.map((v, j) => (
                  <Td key={j} bold>{v}</Td>
                ))}
                <Td bold>{total}</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GofTable({ result, t, dataset, lang }) {
  const c = t.chiSq.result.cols
  const valueLabels = dataset.valueLabels?.[result.gofVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  return (
    <div>
      <Heading>{t.chiSq.result.contingencyTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.category}</Th>
              <Th>{c.observed}</Th>
              <Th>{c.expected}</Th>
              <Th>{c.residual}</Th>
            </tr>
          </thead>
          <tbody>
            {result.levels.map((lv, i) => (
              <tr key={lv}>
                <Td align="left" mono={false} bold>{valueLabels[lv] || lv}</Td>
                <Td>{fmtNum(result.observed[i], 0)}</Td>
                <Td>{fmtNum(result.expected[i], 2)}</Td>
                <Td color={residColor(result.stdResiduals[i])}>{fmtNum(result.stdResiduals[i], 2)}</Td>
              </tr>
            ))}
            <tr className="bg-duo-cream-50/50">
              <Td align="left" mono={false} bold>{t.chiSq.result.total}</Td>
              <Td bold>{result.n}</Td>
              <Td bold>{fmtNum(result.expected.reduce((s, v) => s + v, 0), 2)}</Td>
              <Td>—</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">{t.chiSq.result.cramerHint}</p>
    </div>
  )
}

function StatsTable({ result, t }) {
  const c = t.chiSq.result.cols
  const ek = result.cramerV !== undefined ? cramerInterpretKey(result.cramerV) : null
  const showYates = result.type === 'independence' && result.yatesApplied
  return (
    <div>
      <Heading>{t.chiSq.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              {showYates && <Th align="left">Test</Th>}
              <Th>{c.chi2}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
              <Th>{c.n}</Th>
              {result.type === 'independence' && <Th>{c.cramerV}</Th>}
              {result.type === 'independence' && <Th align="left">效果量 / Effect</Th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              {showYates && <Td align="left" mono={false} bold>Pearson χ²</Td>}
              <Td>{fmtNum(result.chi2, 3)}</Td>
              <Td>{result.df}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td>{result.n}</Td>
              {result.type === 'independence' && <Td>{fmtNum(result.cramerV, 3)}</Td>}
              {result.type === 'independence' && (
                <Td align="left" mono={false}>
                  {ek ? t.chiSq.result.effectInterp[ek] : '—'}
                </Td>
              )}
            </tr>
            {showYates && (
              <tr>
                <Td align="left" mono={false} bold>{t.chiSq.result.yatesRow}</Td>
                <Td>{fmtNum(result.chi2Yates, 3)}</Td>
                <Td>{result.df}</Td>
                <Td>{fmtP(result.pYates)}</Td>
                <Td>{result.n}</Td>
                <Td>—</Td>
                <Td align="left" mono={false}>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showYates && (
        <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">{t.chiSq.result.yatesNote}</p>
      )}
    </div>
  )
}

function Interpretation({ result, t, dataset, lang }) {
  const sig = result.p < 0.05
  if (result.type === 'independence') {
    const ek = cramerInterpretKey(result.cramerV)
    const overall = fillTemplate(t.chiSq.interp.indepOverall, {
      df: result.df,
      n: result.n,
      chi2: fmtNum(result.chi2, 3),
      pStr: fmtP(result.p),
      sigWord: sig ? t.chiSq.interp.sigYes : t.chiSq.interp.sigNo,
      v: fmtNum(result.cramerV, 3),
      effect: ek ? t.chiSq.result.effectInterp[ek] : '—',
    })

    // 顯著時，列出 |z| ≥ 1.96 的 cells
    const notable = []
    if (sig) {
      for (let i = 0; i < result.rowLevels.length; i++) {
        for (let j = 0; j < result.colLevels.length; j++) {
          const z = result.stdResiduals[i][j]
          if (Number.isFinite(z) && Math.abs(z) >= 1.96) {
            notable.push({
              cellLabel: `${result.rowLevels[i]} × ${result.colLevels[j]}`,
              z,
            })
          }
        }
      }
    }

    return (
      <div className="mt-5">
        <Heading>{t.chiSq.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
          <p className="whitespace-pre-line">{overall}</p>
          {notable.length > 0 && (
            <>
              <p className="mt-3 font-medium">{t.chiSq.interp.residSection}</p>
              <ul className="mt-1.5 space-y-1">
                {notable.map((n, idx) => (
                  <li key={idx} className="text-duo-cocoa-700">
                    · {fillTemplate(t.chiSq.interp.residLine, {
                      cellLabel: n.cellLabel,
                      z: fmtNum(n.z, 2),
                      flag: t.chiSq.interp.flagHigh,
                    })}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    )
  }

  // gof
  const overall = fillTemplate(t.chiSq.interp.gofOverall, {
    df: result.df,
    n: result.n,
    chi2: fmtNum(result.chi2, 3),
    pStr: fmtP(result.p),
    sigWord: sig ? t.chiSq.interp.sigYes : t.chiSq.interp.sigNo,
  })
  return (
    <div className="mt-5">
      <Heading>{t.chiSq.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p>{overall}</p>
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runChiSquare(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg = t.chiSq.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  // 取得 row / col levels 的中英 label
  let rowLabels = []
  let colLabels = []
  if (result.type === 'independence') {
    const rowVL = dataset.valueLabels?.[result.rowVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const colVL = dataset.valueLabels?.[result.colVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    rowLabels = result.rowLevels.map((lv) => rowVL[lv] || lv)
    colLabels = result.colLevels.map((lv) => colVL[lv] || lv)
  }

  return (
    <div>
      <AssumptionRow result={result} t={t} />

      {result.type === 'independence' && (
        <>
          <MatrixTable
            title={t.chiSq.result.contingencyTitle}
            matrix={result.observed}
            rowLabels={rowLabels}
            colLabels={colLabels}
            rowTotals={result.rowTotals}
            colTotals={result.colTotals}
            total={result.n}
            decimals={0}
            t={t}
          />
          <MatrixTable
            title={t.chiSq.result.expectedTitle}
            matrix={result.expected}
            rowLabels={rowLabels}
            colLabels={colLabels}
            decimals={2}
            t={t}
          />
          <MatrixTable
            title={t.chiSq.result.stdResidualsTitle}
            matrix={result.stdResiduals}
            rowLabels={rowLabels}
            colLabels={colLabels}
            decimals={2}
            cellColor={residColor}
            t={t}
          />
        </>
      )}

      {result.type === 'gof' && <GofTable result={result} t={t} dataset={dataset} lang={lang} />}

      <StatsTable result={result} t={t} />

      {mode === 'teaching' && <Interpretation result={result} t={t} dataset={dataset} lang={lang} />}
    </div>
  )
}

export default Result
