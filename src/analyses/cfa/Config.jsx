/**
 * CFA — Config（左欄）
 *
 * 動態因子結構編輯器：
 *   - 每個因子一張卡片：因子名稱 + 指標多選清單
 *   - 指標來源 = dataset 的 continuous / ordinal 欄位
 *   - 簡單結構（no cross-loadings）：先選的因子佔用後，後續因子的選單會排除已選指標
 *
 * Dynamic factor-structure editor for CFA.
 */
import { useEffect } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'

const DEFAULT_FACTORS = [
  { name: 'F1', indicators: [] },
  { name: 'F2', indicators: [] },
]

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const factors = state.factors

  // 首次進入：給兩個空因子預設
  useEffect(() => {
    if (factors === undefined) {
      update({ factors: DEFAULT_FACTORS.map((f) => ({ ...f, indicators: [] })) })
    }
  }, [factors, update])

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const current = factors || DEFAULT_FACTORS

  // 已被任何「其他」因子佔用的指標集合（給定當前正在編輯的因子 fi 時）
  const usedByOthers = (fi) => {
    const set = new Set()
    current.forEach((f, idx) => {
      if (idx === fi) return
      f.indicators.forEach((ind) => set.add(ind))
    })
    return set
  }

  const setFactors = (next) => update({ factors: next })

  const addFactor = () => {
    const idx = current.length + 1
    setFactors([...current, { name: `F${idx}`, indicators: [] }])
  }
  const removeLastFactor = () => {
    if (current.length <= 1) return
    setFactors(current.slice(0, current.length - 1))
  }
  const renameFactor = (fi, name) => {
    const next = current.map((f, idx) => (idx === fi ? { ...f, name } : f))
    setFactors(next)
  }
  const toggleIndicator = (fi, col) => {
    const next = current.map((f, idx) => {
      if (idx !== fi) return f
      const has = f.indicators.includes(col)
      return {
        ...f,
        indicators: has
          ? f.indicators.filter((c) => c !== col)
          : [...f.indicators, col],
      }
    })
    setFactors(next)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
          {t.cfa.config.factorsTitle}
        </h3>
        <p className="text-[11px] text-duo-cocoa-400 mb-3 leading-snug">
          {t.cfa.config.factorsHint}
        </p>

        <div className="space-y-3">
          {current.map((f, fi) => {
            const used = usedByOthers(fi)
            const availCols = numericCols.filter((c) => !used.has(c))
            return (
              <div
                key={fi}
                className="bg-white border border-duo-cocoa-100 rounded-md p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-duo-cocoa-400">
                    {t.cfa.config.factorLabel} {fi + 1}
                  </span>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => renameFactor(fi, e.target.value)}
                    placeholder={`F${fi + 1}`}
                    className="flex-1 h-7 px-2 text-sm rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus-ring focus:border-duo-amber-500"
                  />
                </div>
                <div className="text-[11px] text-duo-cocoa-500 mb-1.5">
                  {t.cfa.config.indicatorsLabel}（{f.indicators.length}）
                </div>
                <ul className="space-y-1 max-h-56 overflow-y-auto">
                  {availCols.map((col) => {
                    const checked = f.indicators.includes(col)
                    return (
                      <li key={col}>
                        <label
                          className={[
                            'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition',
                            checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIndicator(fi, col)}
                            className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="text-xs text-duo-cocoa-800 truncate">
                            {labelMap[col] || col}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                  {availCols.length === 0 && (
                    <li className="text-[11px] text-duo-cocoa-400 italic px-2 py-1">
                      {t.cfa.config.noIndicatorsLeft}
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={addFactor}
            className="flex-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
          >
            + {t.cfa.config.addFactor}
          </button>
          <button
            type="button"
            onClick={removeLastFactor}
            disabled={current.length <= 1}
            className="flex-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-700 hover:bg-duo-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            − {t.cfa.config.removeFactor}
          </button>
        </div>
      </div>

      <div className="text-[11px] text-duo-cocoa-400 leading-snug bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2">
        {t.cfa.config.simpleStructureNote}
      </div>
    </div>
  )
}

export default Config
