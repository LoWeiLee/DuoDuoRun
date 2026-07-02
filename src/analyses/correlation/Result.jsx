/**
 * 相關分析 — Result（中欄）
 *
 * 結構：相關矩陣（每格秀 r、n、p；用顏色強度表達 |r| 大小、星號表顯著性）。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCorrelation } from './compute'
import { fmtNum, fmtP, fmtSig } from '../../lib/format'

/** 將 |r| 對應到背景色（暖色暗示正、冷色暗示負，亮度依強度） */
function cellBg(r) {
  if (!Number.isFinite(r)) return 'transparent'
  const abs = Math.abs(r)
  // 對角線 r=1：顯較深的 amber
  if (r === 1) return '#f8c180' // duo-amber-200
  if (abs < 0.1) return '#fffaf2' // 最淡
  if (r > 0) {
    // amber 系（正相關）
    if (abs < 0.3) return '#fef3e2'
    if (abs < 0.5) return '#fce0b8'
    return '#f8c180'
  } else {
    // denim 系（負相關）
    if (abs < 0.3) return '#eef2f6'
    if (abs < 0.5) return '#cfdae3'
    return '#a9bbcc'
  }
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()

  const result = useMemo(() => (dataset ? runCorrelation(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.corr[result.error]}
      </div>
    )
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const cols = result.columns
  const method = result.method || 'pearson'
  const sym = t.corr.symbol[method] || 'r'
  const methodInline = t.corr.methodLabelInline[method]

  return (
    <div>
      {/* 方法指示條 */}
      <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-xs">
        <span className="text-duo-cocoa-400">
          {lang === 'zh-TW' ? '相關方法：' : 'Method:'}
        </span>
        <span className="font-medium text-duo-cocoa-800">
          {methodInline} (<span className="font-mono">{sym}</span>)
        </span>
      </div>

      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-duo-cream-50 border-b border-duo-cream-200 sticky left-0"></th>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 bg-duo-cream-50 text-left font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap min-w-[110px]"
                >
                  {labelMap[c] || c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((rowCol) => (
              <tr key={rowCol}>
                <th className="px-3 py-2 text-left font-medium text-duo-cocoa-700 bg-duo-cream-50 border-b border-duo-cream-100 sticky left-0 whitespace-nowrap">
                  {labelMap[rowCol] || rowCol}
                </th>
                {cols.map((c) => {
                  const cell = result.matrix[rowCol][c]
                  const isDiag = rowCol === c
                  return (
                    <td
                      key={c}
                      className="px-3 py-2 text-center border-b border-duo-cream-100 align-top"
                      style={{ backgroundColor: cellBg(cell.r) }}
                    >
                      {isDiag ? (
                        <span className="font-mono text-duo-cocoa-700">—</span>
                      ) : (
                        <div>
                          <div className="font-mono text-sm font-medium text-duo-cocoa-800">
                            {fmtNum(cell.r, 3)}
                            <span className="text-duo-amber-700 ml-0.5">{fmtSig(cell.p)}</span>
                          </div>
                          <div className="font-mono text-[10px] text-duo-cocoa-400 mt-0.5">
                            p = {fmtP(cell.p)}
                          </div>
                          <div className="font-mono text-[10px] text-duo-cocoa-300">
                            n = {cell.n}
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>

      {mode === 'teaching' && <Interpretation result={result} labelMap={labelMap} t={t} />}
    </div>
  )
}

function strengthFor(r) {
  const a = Math.abs(r)
  if (a < 0.3) return 'weak'
  if (a < 0.5) return 'moderate'
  return 'strong'
}

function Interpretation({ result, labelMap, t }) {
  const method = result.method || 'pearson'
  const sym = t.corr.symbol[method] || 'r'
  const sigPairs = []
  const cols = result.columns
  // 取上三角，避免重複
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const cell = result.matrix[cols[i]][cols[j]]
      if (Number.isFinite(cell.r) && cell.p < 0.05) {
        sigPairs.push({ a: cols[i], b: cols[j], ...cell })
      }
    }
  }
  if (sigPairs.length === 0) {
    return (
      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
          {t.corr.interp.header}
        </h3>
        <p className="text-sm text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3">
          {t.corr.interp.noSig}
        </p>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
        {t.corr.interp.header}
      </h3>
      <ul className="space-y-2">
        {sigPairs.map((p, idx) => {
          const strength = strengthFor(p.r)
          const direction = p.r > 0 ? 'positive' : 'negative'
          const strengthWord = t.corr.apa.strengthWord[strength]
          const directionWord = t.corr.apa.directionWord[direction]
          const text = t.corr.interp.pairLine
            .replace('{labelA}', labelMap[p.a] || p.a)
            .replace('{labelB}', labelMap[p.b] || p.b)
            .replace('{sym}', sym)
            .replace('{r}', fmtNum(p.r, 3))
            .replace('{strengthWord}', strengthWord)
            .replace('{directionWord}', directionWord)
            .replace('{pStr}', fmtP(p.p))
            .replace('{sigWord}', t.corr.interp.sigYes)
          return (
            <li
              key={idx}
              className="text-sm text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-2.5"
            >
              {text}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Result
