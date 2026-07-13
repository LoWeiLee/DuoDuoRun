/**
 * 無母數檢定 — Config（左欄）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

const DEFAULT = { type: 'mw', depVar: null, groupVar: null, var1: null, var2: null, dunnPostHoc: false }

function TypeSelector({ value, onChange, t }) {
  const types = ['mw', 'wilcoxon', 'kw']
  return (
    <div className="space-y-2 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.np.config.typeLabel}
      </h3>
      <div className="inline-flex flex-col rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full">
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
              {t.np.types[tp]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">
        {t.np.typeHint[value]}
      </p>
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
  const groupOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct === 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })
  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 3 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  return (
    <div>
      <TypeSelector value={state.type} onChange={(tp) => update({ type: tp })} t={t} />

      {state.type === 'mw' && (
        <div className="space-y-3">
          <VarSelect
            label={t.np.config.depVar}
            value={state.depVar}
            onChange={(v) => update({ depVar: v })}
            options={numOpts}
            placeholder={t.np.config.pickDep}
          />
          <VarSelect
            label={t.np.config.groupVar}
            value={state.groupVar}
            onChange={(v) => update({ groupVar: v })}
            options={groupOpts}
            placeholder={t.np.config.pickGroup}
          />
        </div>
      )}

      {state.type === 'wilcoxon' && (
        <div className="space-y-3">
          <VarSelect
            label={t.np.config.var1}
            value={state.var1}
            onChange={(v) => update({ var1: v })}
            options={numOpts}
            placeholder={t.np.config.pickVar1}
          />
          <VarSelect
            label={t.np.config.var2}
            value={state.var2}
            onChange={(v) => update({ var2: v })}
            options={numOpts.filter((o) => o.value !== state.var1)}
            placeholder={t.np.config.pickVar2}
          />
        </div>
      )}

      {state.type === 'kw' && (
        <div className="space-y-3">
          <VarSelect
            label={t.np.config.depVar}
            value={state.depVar}
            onChange={(v) => update({ depVar: v })}
            options={numOpts}
            placeholder={t.np.config.pickDep}
          />
          <VarSelect
            label={t.np.config.groupVarKW}
            value={state.groupVar}
            onChange={(v) => update({ groupVar: v })}
            options={factorOpts}
            placeholder={t.np.config.pickGroup}
          />
          <div className="pt-2 border-t border-duo-cocoa-100">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!state.dunnPostHoc}
                onChange={(e) => update({ dunnPostHoc: e.target.checked })}
                className="mt-0.5 w-3.5 h-3.5 accent-duo-amber-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-duo-cocoa-700 leading-snug">
                {t.np.config.showDunn}
              </span>
            </label>
            <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug pl-5">
              {t.np.config.dunnHint}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Config
