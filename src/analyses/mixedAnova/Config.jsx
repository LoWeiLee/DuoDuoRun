/**
 * 混合設計 ANOVA — Config（左欄）
 * Mixed ANOVA — Config (left column).
 *
 * 寬資料格式：每列 = 一位受試者
 *   - betweenVar：被試間因子（categorical, ≥ 2 levels）
 *   - conditionVars：被試內因子的 b 個重複測量欄
 * Wide-format input: each row = one subject.
 *   - betweenVar: between-subjects categorical factor (>= 2 levels)
 *   - conditionVars: b repeated-measures columns (each = one within level)
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  if (!dataset) return null

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'categorical'
  )

  const conditionVars = state.conditionVars || []
  const betweenVar = state.betweenVar || null

  const toggleCondition = (col) => {
    const next = conditionVars.includes(col)
      ? conditionVars.filter((v) => v !== col)
      : [...conditionVars, col]
    update({ conditionVars: next })
  }
  const allSelected =
    numericCols.length > 0 && numericCols.every((c) => conditionVars.includes(c))
  const toggleAll = () =>
    update({ conditionVars: allSelected ? [] : [...numericCols] })

  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag =
      distinct >= 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  return (
    <div className="space-y-4">
      {/* 被試間因子 / between-subjects factor */}
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.mixedAnova.config.betweenVar}
        </label>
        <select
          aria-label={t.mixedAnova.config.betweenVar}
          value={betweenVar || ''}
          onChange={(e) => update({ betweenVar: e.target.value || null })}
          className="w-full h-9 px-3 pr-8 text-sm rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.mixedAnova.config.pickBetween}</option>
          {factorOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.mixedAnova.config.betweenHint}
        </p>
      </div>

      {/* 被試內因子（多選測量欄） / within-subjects factor (multi-pick) */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
          {t.mixedAnova.config.selectConditionsTitle}
        </h3>
        <p className="text-[11px] text-duo-cocoa-400 mb-3 leading-snug">
          {t.mixedAnova.config.selectConditionsHint}
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] text-duo-amber-600 hover:text-duo-amber-800 mb-2 underline-offset-2 hover:underline"
        >
          {allSelected ? '取消全選 / Deselect all' : '全選 / Select all'}
        </button>
        <ul className="space-y-1">
          {numericCols.map((col) => {
            const checked = conditionVars.includes(col)
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
                    onChange={() => toggleCondition(col)}
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
