/**
 * ANCOVA — Config（左欄）/ Config panel (left column).
 *
 * 欄位 / Fields:
 *   - 依變項 Y：numeric 下拉
 *   - 因子 Factor：categorical 下拉（≥ 2 組）
 *   - 共變項 Covariates：numeric 多選 checkbox（自動排除 Y、不重複）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const yVar = state.yVar || null
  const factorVar = state.factorVar || null
  const covariateVars = state.covariateVars || []

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'categorical'
  )

  const yOpts = numericCols.filter((c) => !covariateVars.includes(c))
  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag, distinct }
  })
  const covCandidates = numericCols.filter((c) => c !== yVar)

  const setY = (col) => {
    update({
      yVar: col || null,
      covariateVars: covariateVars.filter((v) => v !== col),
    })
  }
  const setFactor = (col) => update({ factorVar: col || null })
  const toggleCov = (col) => {
    if (col === yVar) return
    const next = covariateVars.includes(col)
      ? covariateVars.filter((v) => v !== col)
      : [...covariateVars, col]
    update({ covariateVars: next })
  }

  return (
    <div className="space-y-4">
      {/* DV */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.ancova.config.yLabel}
        </label>
        <select
          aria-label={t.ancova.config.yLabel}
          value={yVar || ''}
          onChange={(e) => setY(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-lg bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.ancova.config.pickY}</option>
          {yOpts.map((c) => (
            <option key={c} value={c}>{labelMap[c] || c}</option>
          ))}
        </select>
      </div>

      {/* Factor */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.ancova.config.factorLabel}
        </label>
        <select
          aria-label={t.ancova.config.factorLabel}
          value={factorVar || ''}
          onChange={(e) => setFactor(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-lg bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.ancova.config.pickFactor}</option>
          {factorOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.ancova.config.factorHint}
        </p>
      </div>

      {/* Covariates multi-select */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.ancova.config.covLabel}
        </label>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.ancova.config.covHint}
        </p>
        {covCandidates.length === 0 ? (
          <p className="text-xs text-duo-cocoa-400">
            {lang === 'zh-TW' ? '請先選依變項' : 'Pick DV first'}
          </p>
        ) : (
          <ul className="space-y-1">
            {covCandidates.map((col) => {
              const checked = covariateVars.includes(col)
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
                      onChange={() => toggleCov(col)}
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
