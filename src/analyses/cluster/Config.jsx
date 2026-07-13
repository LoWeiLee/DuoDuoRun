/**
 * 集群分析 — Config（左欄）
 *
 * 上半：Method 切換（k-means / 階層 Ward）
 * 中間：k（群數，2-10）+ 標準化開關
 * 下半：Variables 多選 checkbox（continuous / ordinal, ≥ 2）
 *
 * Cluster analysis configuration:
 *   - method (kmeans / hierarchical-Ward)
 *   - k (2-10)
 *   - standardize (default on)
 *   - 2+ continuous variables
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const vars = state.vars || []
  const method = state.method || 'kmeans'
  const k = state.k ?? 3
  const standardize = state.standardize !== false

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )

  const toggle = (col) => {
    const next = vars.includes(col)
      ? vars.filter((v) => v !== col)
      : [...vars, col]
    update({ vars: next })
  }
  const allSelected =
    numericCols.length > 0 && numericCols.every((c) => vars.includes(c))
  const toggleAll = () =>
    update({ vars: allSelected ? [] : [...numericCols] })

  return (
    <div className="space-y-5">
      {/* Method */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.cluster.config.methodLabel}
        </label>
        <div className="inline-flex rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full">
          {['kmeans', 'hierarchical'].map((m) => {
            const active = method === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => update({ method: m })}
                className={[
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded transition',
                  active
                    ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                    : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
                ].join(' ')}
              >
                {t.cluster.config.methods[m]}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-duo-cocoa-400 mt-1.5 leading-snug">
          {t.cluster.config.methodHint[method]}
        </p>
      </div>

      {/* k */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.cluster.config.kLabel}
        </label>
        <input
          type="number"
          min="2"
          max="10"
          step="1"
          value={k}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (Number.isInteger(v) && v >= 2 && v <= 10) update({ k: v })
            else if (e.target.value === '') update({ k: '' })
          }}
          className="w-full h-9 px-3 text-sm rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus-ring focus:border-duo-amber-500"
        />
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.cluster.config.kHint}
        </p>
      </div>

      {/* standardize */}
      <div>
        <label
          className={[
            'flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition',
            standardize ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
          ].join(' ')}
        >
          <input
            type="checkbox"
            checked={standardize}
            onChange={() => update({ standardize: !standardize })}
            className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
          />
          <div className="text-sm text-duo-cocoa-800">
            {t.cluster.config.standardizeLabel}
          </div>
        </label>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.cluster.config.standardizeHint}
        </p>
      </div>

      {/* Variables */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
          {t.cluster.config.varsLabel}
        </h3>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.cluster.config.varsHint}
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
            const checked = vars.includes(col)
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
                    onChange={() => toggle(col)}
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
      </div>
    </div>
  )
}

export default Config
