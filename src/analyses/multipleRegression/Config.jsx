/**
 * 多元迴歸 — Config（左欄）
 *
 * 上半：Y 下拉
 * 下半：X 多選 checkbox（自動排除 Y）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const yVar = state.yVar || null
  const xVars = state.xVars || []

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )

  const yOpts = numericCols
  const xCandidates = numericCols.filter((c) => c !== yVar)

  const toggleX = (col) => {
    if (col === yVar) return
    const next = xVars.includes(col)
      ? xVars.filter((v) => v !== col)
      : [...xVars, col]
    update({ xVars: next })
  }

  const setY = (col) => {
    update({ yVar: col || null, xVars: xVars.filter((v) => v !== col) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.multReg.config.yLabel}
        </label>
        <select
          aria-label={t.multReg.config.yLabel}
          value={yVar || ''}
          onChange={(e) => setY(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.multReg.config.pickY}</option>
          {yOpts.map((c) => (
            <option key={c} value={c}>{labelMap[c] || c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.multReg.config.xLabel}
        </label>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.multReg.config.hint}
        </p>
        {xCandidates.length === 0 ? (
          <p className="text-xs text-duo-cocoa-400">
            {lang === 'zh-TW' ? '請先選 Y' : 'Pick Y first'}
          </p>
        ) : (
          <ul className="space-y-1">
            {xCandidates.map((col) => {
              const checked = xVars.includes(col)
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
                      onChange={() => toggleX(col)}
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
