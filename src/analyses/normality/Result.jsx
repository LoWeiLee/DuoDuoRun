/**
 * 常態性檢定 — Result（中欄）
 *
 * 表格：每變數一列，欄位 N / SW W / SW p / KS D / KS p / 判讀
 * 判讀邏輯：
 *   - 兩個 p 都 ≥ .05 → normal
 *   - 兩個 p 都 < .05 → nonNormal
 *   - 不一致 → mixed
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runNormality } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

// ★ 2026-07-30 紅隊 R61（L2）：零變異欄的 W = 1.000 / D = 0.000 / p = 1.000 全部是退化值，
//   舊版會把它判成 'normal' 綠燈——看起來是全套最常態的變項（同 A4 R40-h、A5a R51 之型）。
//   零變異時不下判讀，改印「無法檢定」並在表格上方顯性說明。
function verdictKey(swP, ksP, zeroVariance) {
  if (zeroVariance) return 'undefinedTest'
  const a = Number.isFinite(swP) ? swP < 0.05 : null
  const b = Number.isFinite(ksP) ? ksP < 0.05 : null
  if (a === null && b === null) return null
  if (a && b) return 'nonNormal'
  if (!a && !b) return 'normal'
  return 'mixed'
}

function verdictColor(key) {
  if (key === 'undefinedTest') return 'text-duo-cocoa-400'
  if (key === 'normal') return 'text-duo-sig-ok'
  if (key === 'nonNormal') return 'text-duo-sig-bad'
  if (key === 'mixed') return 'text-duo-amber-700'
  return 'text-duo-cocoa-400'
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runNormality(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.norm[result.error] || t.errors.stats[result.error] || result.error}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const c = t.norm.cols

  const hasZeroVariance = result.rows.some((r) => r.sw.zeroVariance || r.ks.zeroVariance)

  return (
    <div>
      {/* ★ R61：零變異欄的退化值不可被讀成「符合常態」 */}
      {hasZeroVariance && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/10 border border-duo-tongue/20 text-xs text-duo-cocoa-800 leading-relaxed">
          {t.norm.zeroVarianceWarn}
        </div>
      )}
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.variable}</th>
              <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.n}</th>
              <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.sw_w}</th>
              <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.sw_p}</th>
              <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.ks_d}</th>
              <th className="px-3 py-2 text-right font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.ks_p}</th>
              <th className="px-3 py-2 text-left font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap">{c.verdict}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => {
              const key = verdictKey(r.sw.p, r.ks.p, r.sw.zeroVariance || r.ks.zeroVariance)
              return (
                <tr key={r.col} className="hover:bg-duo-cream-50 transition">
                  <td className="px-3 py-1.5 text-duo-cocoa-800 font-medium border-b border-duo-cream-50">{labelMap[r.col] || r.col}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-duo-cocoa-700 border-b border-duo-cream-50">{r.n}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-duo-cocoa-700 border-b border-duo-cream-50">{fmtNum(r.sw.W, 3)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-duo-cocoa-700 border-b border-duo-cream-50">{fmtP(r.sw.p)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-duo-cocoa-700 border-b border-duo-cream-50">{fmtNum(r.ks.D, 3)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-duo-cocoa-700 border-b border-duo-cream-50">{fmtP(r.ks.p)}</td>
                  <td className={['px-3 py-1.5 text-xs font-medium border-b border-duo-cream-50', verdictColor(key)].join(' ')}>
                    {key ? t.norm.verdict[key] : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mode === 'teaching' && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
            {t.norm.interp.header}
          </h3>
          <ul className="space-y-1.5">
            {result.rows.map((r) => {
              const key = verdictKey(r.sw.p, r.ks.p, r.sw.zeroVariance || r.ks.zeroVariance)
              const text = fillTemplate(t.norm.interp.line, {
                var: labelMap[r.col] || r.col,
                verdict: key ? t.norm.verdict[key] : '—',
                w: fmtNum(r.sw.W, 3),
                pSW: fmtP(r.sw.p),
                d: fmtNum(r.ks.D, 3),
                pKS: fmtP(r.ks.p),
              })
              return (
                <li key={r.col} className="text-sm text-duo-cocoa-700 bg-white border border-duo-cocoa-100 rounded-md px-4 py-2.5">
                  {text}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Result
