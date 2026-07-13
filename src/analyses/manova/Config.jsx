/**
 * MANOVA — Config（左欄）
 *
 * 上半：Factor 下拉（categorical，≥ 2 組）
 * 下半：DV 多選 checkbox（numeric continuous / ordinal，≥ 2）
 *
 * MANOVA single-factor configuration:
 *   - one categorical factor with ≥ 2 levels
 *   - 2+ continuous DVs (factor itself is filtered out)
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const factorVar = state.factorVar || null
  const dvVars = state.dvVars || []

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'categorical'
  )

  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  const dvCandidates = numericCols.filter((c) => c !== factorVar)

  const setFactor = (col) => {
    update({ factorVar: col || null, dvVars: dvVars.filter((v) => v !== col) })
  }

  const toggleDv = (col) => {
    if (col === factorVar) return
    const next = dvVars.includes(col)
      ? dvVars.filter((v) => v !== col)
      : [...dvVars, col]
    update({ dvVars: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.manova.config.factorLabel}
        </label>
        <select
          aria-label={t.manova.config.factorLabel}
          value={factorVar || ''}
          onChange={(e) => setFactor(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-lg bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.manova.config.pickFactor}</option>
          {factorOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.manova.config.factorHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.manova.config.dvLabel}
        </label>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.manova.config.dvHint}
        </p>
        {dvCandidates.length === 0 ? (
          <p className="text-xs text-duo-cocoa-400">
            {lang === 'zh-TW' ? '請先選擇因子' : 'Pick the factor first'}
          </p>
        ) : (
          <ul className="space-y-1">
            {dvCandidates.map((col) => {
              const checked = dvVars.includes(col)
              const label = labelMap[col] || col
              const meta = variables[col]
              return (
                <li key={col}>
                  <label
                    className={[
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition',
                      checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDv(col)}
                      className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-duo-cocoa-800 truncate">{label}</div>
                      <div className="text-[10px] text-duo-cocoa-400 mt-0.5 font-mono">
                        {col} · {t.varTypes[meta.type]}
                      </div>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Config
