/**
 * EFA — Config（左欄）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const selectedVars = state.selectedVars || []
  const nFactors = state.nFactors ?? ''
  const rotation = state.rotation || 'varimax'

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )

  const toggle = (col) => {
    const next = selectedVars.includes(col)
      ? selectedVars.filter((v) => v !== col)
      : [...selectedVars, col]
    update({ selectedVars: next })
  }
  const allSelected = numericCols.length > 0 && numericCols.every((c) => selectedVars.includes(c))
  const toggleAll = () => update({ selectedVars: allSelected ? [] : [...numericCols] })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
          {t.efa.config.selectVarsTitle}
        </h3>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.efa.config.selectVarsHint}
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] text-duo-amber-700 hover:underline mb-2"
        >
          {allSelected ? '取消全選 / Deselect all' : '全選 / Select all'}
        </button>
        <ul className="space-y-1">
          {numericCols.map((col) => {
            const checked = selectedVars.includes(col)
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
                    onChange={() => toggle(col)}
                    className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <div className="text-sm text-duo-cocoa-800 truncate">{labelMap[col] || col}</div>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.efa.config.nFactorsTitle}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="auto (Kaiser)"
          value={nFactors}
          onChange={(e) => {
            const v = e.target.value
            update({ nFactors: v === '' ? undefined : Number(v) })
          }}
          className="w-full h-9 px-3 text-sm rounded-lg bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500"
        />
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.efa.config.nFactorsHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.efa.config.rotationTitle}
        </label>
        <div className="inline-flex rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full">
          {['varimax', 'none'].map((r) => {
            const active = rotation === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => update({ rotation: r })}
                className={[
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded transition',
                  active
                    ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                    : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
                ].join(' ')}
              >
                {t.efa.config.rotations[r]}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-duo-cocoa-400 mt-1.5 leading-snug">
          {t.efa.config.rotationHint[rotation]}
        </p>
      </div>
    </div>
  )
}

export default Config
