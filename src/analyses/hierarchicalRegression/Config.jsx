/**
 * 階層迴歸 — Config（左欄）
 *
 * 上半：Y 下拉
 * 下半：動態 N 個區塊（block 1, 2, 3, ...），各區塊以多選 checkbox 選預測變項
 *       已在前面區塊出現的變項，會從後續區塊的選項中排除（cumulative）
 *
 * 預設：2 個區塊，皆為空白
 *
 * Hierarchical regression Config
 *   - DV dropdown
 *   - Dynamic block UI: each block has its own multi-select; predictors used in
 *     earlier blocks are excluded from later blocks
 */
import { useApp, useAnalysisState } from '../../context/AppContext'

const DEFAULT_BLOCKS = [[], []]

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [rawState, update] = useAnalysisState()
  const yVar = rawState.yVar || null
  const blocks = Array.isArray(rawState.blocks) && rawState.blocks.length >= 1
    ? rawState.blocks
    : DEFAULT_BLOCKS

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )

  const setY = (col) => {
    // 從 blocks 中清除被選為 Y 的變項
    const next = blocks.map((b) => b.filter((v) => v !== col))
    update({ yVar: col || null, blocks: next })
  }

  const toggleX = (blockIdx, col) => {
    if (col === yVar) return
    const next = blocks.map((b, i) => {
      if (i === blockIdx) {
        return b.includes(col) ? b.filter((v) => v !== col) : [...b, col]
      }
      // 確保未在其他 block 出現重複（理論上不會被觸發，因為 UI 已過濾）
      return b.filter((v) => v !== col)
    })
    update({ blocks: next })
  }

  const addBlock = () => {
    update({ blocks: [...blocks, []] })
  }

  const removeBlock = () => {
    if (blocks.length <= 1) return
    update({ blocks: blocks.slice(0, -1) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
          {t.hierReg.config.yLabel}
        </label>
        <select
          aria-label={t.hierReg.config.yLabel}
          value={yVar || ''}
          onChange={(e) => setY(e.target.value || null)}
          className="w-full h-9 px-3 pr-8 text-sm rounded-lg bg-white border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500 cursor-pointer"
        >
          <option value="">{t.hierReg.config.pickY}</option>
          {numericCols.map((c) => (
            <option key={c} value={c}>{labelMap[c] || c}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-duo-cocoa-700">
            {t.hierReg.config.blocksLabel}
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={addBlock}
              className="px-2 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
            >
              {t.hierReg.config.addBlock}
            </button>
            <button
              type="button"
              onClick={removeBlock}
              disabled={blocks.length <= 1}
              className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-700 hover:bg-duo-cream-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.hierReg.config.removeBlock}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">
          {t.hierReg.config.hint}
        </p>

        {blocks.map((blk, idx) => {
          // 已被前面 block 用掉的變項
          const usedBefore = new Set()
          for (let i = 0; i < idx; i++) {
            for (const v of blocks[i]) usedBefore.add(v)
          }
          const candidates = numericCols.filter(
            (c) => c !== yVar && !usedBefore.has(c)
          )
          return (
            <div
              key={idx}
              className="mb-3 bg-white border border-duo-cocoa-100 rounded-md p-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-duo-cocoa-700">
                  {t.hierReg.config.blockTitle.replace('{n}', String(idx + 1))}
                </span>
                <span className="text-[10px] text-duo-cocoa-400 font-mono">
                  {blk.length} {t.hierReg.config.varsUnit}
                </span>
              </div>
              {candidates.length === 0 ? (
                <p className="text-[11px] text-duo-cocoa-400 px-1 py-1">
                  {yVar
                    ? t.hierReg.config.noMoreVars
                    : t.hierReg.config.pickYFirst}
                </p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((col) => {
                    const checked = blk.includes(col)
                    const label = labelMap[col] || col
                    const meta = variables[col]
                    return (
                      <li key={col}>
                        <label
                          className={[
                            'flex items-center gap-2.5 px-2 py-1 rounded-md cursor-pointer transition',
                            checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleX(idx, col)}
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
          )
        })}
      </div>
    </div>
  )
}

export default Config
