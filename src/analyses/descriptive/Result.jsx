/**
 * 敘述統計 — Result（中欄）
 *
 * 教學模式：完整表格 + 每個變數的白話解讀段落
 * 報告模式：純表格（白話解讀不秀，APA 敘述會在右欄）
 *
 * 表格欄位順序與 SPSS 慣例一致：
 *   Variable | N | M | SD | SE | Min | Max | Median | Skew | Kurt
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runDescriptive } from './compute'
import { fmtNum, fmtInt, fillTemplate } from '../../lib/format'

function interpretSkewKurt(skew, kurt, t) {
  let skewWord = t.desc.interp.skewSymmetric
  if (skew > 0.5) skewWord = t.desc.interp.skewRight
  else if (skew < -0.5) skewWord = t.desc.interp.skewLeft

  let kurtWord = t.desc.interp.kurtNormal
  if (kurt > 1) kurtWord = t.desc.interp.kurtHigh
  else if (kurt < -1) kurtWord = t.desc.interp.kurtLow

  return { skewWord, kurtWord }
}

function ResultsTable({ results, labelMap, t }) {
  const cols = t.desc.cols
  return (
    <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-duo-cream-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.variable}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.n}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.mean}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.sd}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.se}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.min}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.max}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.median}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.skew}</th>
            <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cream-200">{cols.kurt}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.col} className="hover:bg-duo-cream-50">
              <td className="px-3 py-1.5 text-duo-cocoa-800 border-b border-duo-cream-100 font-medium">{labelMap[r.col] || r.col}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtInt(r.n)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.mean, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.sd, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.se, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.min, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.max, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.median, 2)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.skewness, 3)}</td>
              <td className="px-3 py-1.5 text-right text-duo-cocoa-700 border-b border-duo-cream-100 font-mono">{fmtNum(r.kurtosis, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InterpretationBlock({ results, labelMap, t }) {
  return (
    <div className="mt-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        解讀 / Reading
      </h3>
      {results.map((r) => {
        const { skewWord, kurtWord } = interpretSkewKurt(r.skewness, r.kurtosis, t)
        const sentence = fillTemplate(t.desc.interp.sentence, {
          label: labelMap[r.col] || r.col,
          n: r.n,
          m: fmtNum(r.mean, 2),
          sd: fmtNum(r.sd, 2),
          minMaxRange: `${fmtNum(r.min, 0)}–${fmtNum(r.max, 0)}`,
          skewWord,
          kurtWord,
        })
        return (
          <p
            key={r.col}
            className="text-sm leading-relaxed text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3"
          >
            {sentence}
          </p>
        )
      })}
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  // `state.selectedVars || []` 每次 render 都會產生**新的空陣列**，讓下方 useMemo
  // 的 deps 每次都變 → memo 完全失效。用 useMemo 穩定化 fallback（2026-07-13 紅隊 R4）。
  const selectedVars = useMemo(() => state.selectedVars || [], [state.selectedVars])

  const results = useMemo(
    () => (dataset && selectedVars.length > 0 ? runDescriptive(dataset.rows, selectedVars) : null),
    [dataset, selectedVars])

  if (!dataset) return null

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  if (selectedVars.length === 0) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.desc.noVarsSelected}
      </div>
    )
  }

  return (
    <div>
      <ResultsTable results={results} labelMap={labelMap} t={t} />
      {mode === 'teaching' && (
        <InterpretationBlock results={results} labelMap={labelMap} t={t} />
      )}
    </div>
  )
}

export default Result
