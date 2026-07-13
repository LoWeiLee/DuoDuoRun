/**
 * 視覺化 — Config（左欄）
 *
 * 上方：圖型 selector（4 個按鈕，垂直排）
 * 下方：依 type 切變數選擇 UI
 *   scatter   — X + Y（numeric）
 *   histogram — X（numeric）
 *   boxplot   — Y（numeric）+ 可選 group（categorical）
 *   heatmap   — 多選 numeric（≥ 2）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

const DEFAULT = { type: 'scatter', xVar: null, yVar: null, groupVar: null, multiVars: [] }

function TypeSelector({ value, onChange, t }) {
  const types = ['scatter', 'histogram', 'boxplot', 'heatmap']
  return (
    <div className="space-y-2 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.viz.config.typeLabel}
      </h3>
      <div className="flex flex-col rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full gap-0.5">
        {types.map((tp) => {
          const active = value === tp
          return (
            <button
              key={tp}
              type="button"
              onClick={() => onChange(tp)}
              className={[
                'w-full text-left px-3 py-1.5 text-xs font-medium rounded transition',
                active
                  ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                  : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
              ].join(' ')}
            >
              {t.viz.types[tp]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">
        {t.viz.typeHint[value]}
      </p>
    </div>
  )
}

function MultiVarPicker({ title, hint, candidates, selected, onChange }) {
  const toggle = (col) => {
    const next = selected.includes(col)
      ? selected.filter((v) => v !== col)
      : [...selected, col]
    onChange(next)
  }
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
        {title}
      </h3>
      <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{hint}</p>
      <ul className="space-y-1">
        {candidates.map((opt) => {
          const checked = selected.includes(opt.value)
          return (
            <li key={opt.value}>
              <label
                className={[
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition',
                  checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <div className="text-sm text-duo-cocoa-800 truncate">{opt.label}</div>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [rawState, update] = useAnalysisState()
  const state = { ...DEFAULT, ...rawState }

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter((c) => variables[c].type === 'categorical')

  const numOpts = numericCols.map((c) => ({ value: c, label: labelMap[c] || c }))
  const groupOpts = [
    { value: '', label: t.viz.config.none },
    ...categoricalCols.map((c) => ({ value: c, label: labelMap[c] || c })),
  ]

  return (
    <div>
      <TypeSelector value={state.type} onChange={(tp) => update({ type: tp })} t={t} />

      {state.type === 'scatter' && (
        <div className="space-y-3">
          <VarSelect
            label={t.viz.config.xLabel}
            value={state.xVar}
            onChange={(v) => update({ xVar: v })}
            options={numOpts.filter((o) => o.value !== state.yVar)}
            placeholder={t.viz.config.pickX}
          />
          <VarSelect
            label={t.viz.config.yLabel}
            value={state.yVar}
            onChange={(v) => update({ yVar: v })}
            options={numOpts.filter((o) => o.value !== state.xVar)}
            placeholder={t.viz.config.pickY}
          />
        </div>
      )}

      {state.type === 'histogram' && (
        <div className="space-y-3">
          <VarSelect
            label={t.viz.config.xLabel}
            value={state.xVar}
            onChange={(v) => update({ xVar: v })}
            options={numOpts}
            placeholder={t.viz.config.pickX}
          />
        </div>
      )}

      {state.type === 'boxplot' && (
        <div className="space-y-3">
          <VarSelect
            label={t.viz.config.yLabel}
            value={state.yVar}
            onChange={(v) => update({ yVar: v })}
            options={numOpts}
            placeholder={t.viz.config.pickY}
          />
          <VarSelect
            label={t.viz.config.groupVar}
            value={state.groupVar}
            onChange={(v) => update({ groupVar: v })}
            options={groupOpts}
            placeholder={t.viz.config.none}
            hint={t.viz.config.groupVarHint}
          />
        </div>
      )}

      {state.type === 'heatmap' && (
        <MultiVarPicker
          title={t.viz.config.multiVarsTitle}
          hint={t.viz.config.multiVarsHint}
          candidates={numOpts}
          selected={state.multiVars}
          onChange={(next) => update({ multiVars: next })}
          t={t}
        />
      )}
    </div>
  )
}

export default Config
