/**
 * 邏輯斯迴歸 — Config（左欄）
 *
 * Y：所有 categorical 變項，且 distinct = 2 的會列出
 * 正類別：選定 Y 後出現 radio
 * X：多選 numeric
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import { detectYLevels } from './compute'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const { yVar, xVars = [], positiveClass } = state || {}

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  // Y 候選：所有 categorical（無論 distinct 多少都列；compute 端會 validate）
  // + 數值欄位中 distinct 恰好 2 的（通常是 0/1 類）
  const yCandidates = Object.keys(variables).filter((c) => {
    const meta = variables[c]
    if (meta.type === 'categorical') return true
    if ((meta.type === 'continuous' || meta.type === 'ordinal') && meta.distinct === 2) return true
    return false
  })
  const numericCols = Object.keys(variables).filter(
    (c) => (variables[c].type === 'continuous' || variables[c].type === 'ordinal') && c !== yVar
  )

  const yLevels = yVar ? detectYLevels(dataset.rows, yVar) : []
  const valueLabels = (yVar && dataset.valueLabels?.[yVar]?.[lang === 'zh-TW' ? 'zh' : 'en']) || {}

  const handleY = (v) => {
    update({ yVar: v || null, positiveClass: null })
  }
  const toggleX = (col) => {
    const next = xVars.includes(col)
      ? xVars.filter((v) => v !== col)
      : [...xVars, col]
    update({ xVars: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.logReg.config.yLabel}
        </label>
        <select
          aria-label={t.logReg.config.yLabel}
          value={yVar || ''}
          onChange={(e) => handleY(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.logReg.config.pickY}</option>
          {yCandidates.map((c) => (
            <option key={c} value={c}>
              {labelMap[c] || c} ({variables[c].distinct})
            </option>
          ))}
        </select>
        {yVar && yLevels.length !== 2 && (
          <p className="text-[11px] text-duo-tongue mt-1 leading-snug">
            {t.logReg.config.yNeedBinary.replace('{k}', yLevels.length)}
          </p>
        )}
      </div>

      {yVar && yLevels.length === 2 && (
        <div>
          <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
            {t.logReg.config.positiveClass}
          </label>
          <div className="flex gap-2">
            {yLevels.map((lv) => {
              const isActive = (positiveClass || yLevels[1]) === lv
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => update({ positiveClass: lv })}
                  className={[
                    'flex-1 px-2 py-1.5 text-xs rounded border transition',
                    isActive
                      ? 'bg-duo-amber-500 text-white border-duo-amber-600'
                      : 'bg-white text-duo-cocoa-700 border-duo-cocoa-100 hover:border-duo-cocoa-300',
                  ].join(' ')}
                >
                  {valueLabels[lv] || lv}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.logReg.config.xLabel}
        </label>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{t.logReg.config.hint}</p>
        <ul className="space-y-1">
          {numericCols.map((col) => {
            const checked = xVars.includes(col)
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
                  <div className="text-sm text-duo-cocoa-800 truncate">{labelMap[col] || col}</div>
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
