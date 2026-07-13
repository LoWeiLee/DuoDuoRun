/**
 * LDA — Config（左欄）
 *
 * 上半：Group 下拉（categorical, ≥ 2 levels）
 * 下半：Predictors 多選 checkbox（continuous / ordinal, ≥ 2）
 *
 * LDA configuration:
 *   - one categorical grouping variable (≥ 2 levels) as class labels
 *   - 2+ continuous predictors (group itself is filtered out)
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const groupVar = state.groupVar || null
  const predictors = state.predictors || []

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'categorical'
  )

  const groupOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  const predictorCandidates = numericCols.filter((c) => c !== groupVar)

  const setGroup = (col) => {
    update({ groupVar: col || null, predictors: predictors.filter((v) => v !== col) })
  }

  const togglePredictor = (col) => {
    if (col === groupVar) return
    const next = predictors.includes(col)
      ? predictors.filter((v) => v !== col)
      : [...predictors, col]
    update({ predictors: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.lda.config.groupLabel}
        </label>
        <select
          aria-label={t.lda.config.groupLabel}
          value={groupVar || ''}
          onChange={(e) => setGroup(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-lg bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.lda.config.pickGroup}</option>
          {groupOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">
          {t.lda.config.groupHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.lda.config.predictorsLabel}
        </label>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.lda.config.predictorsHint}
        </p>
        {predictorCandidates.length === 0 ? (
          <p className="text-xs text-duo-cocoa-400">
            {lang === 'zh-TW' ? '請先選擇分組變項' : 'Pick the grouping variable first'}
          </p>
        ) : (
          <ul className="space-y-1">
            {predictorCandidates.map((col) => {
              const checked = predictors.includes(col)
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
                      onChange={() => togglePredictor(col)}
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
