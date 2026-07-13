/**
 * t 檢定 — Config（左欄）
 *
 * 結構：
 *   1. 頂部 segmented control：獨立／配對／單一
 *   2. 對應變數選擇 UI
 *      - 獨立：依變項（numeric）+ 分組變項（categorical, 2 類）
 *      - 配對：變項 1（numeric）+ 變項 2（numeric, ≠ 變項 1）
 *      - 單一：依變項（numeric）+ μ₀ 輸入欄
 *
 * 設定存到 analysisState['t-test']：
 *   { type, depVar, groupVar, var1, var2, mu0 }
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

const DEFAULT_STATE = {
  type: 'independent',
  depVar: null,
  groupVar: null,
  var1: null,
  var2: null,
  mu0: 0,
}

function TypeSelector({ value, onChange, t }) {
  const types = ['independent', 'paired', 'oneSample']
  return (
    <div className="space-y-2 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.ttest.config.typeLabel}
      </h3>
      <div className="inline-flex rounded-lg bg-duo-cream-50 border border-duo-cream-200 p-0.5 w-full">
        {types.map((tp) => {
          const active = value === tp
          return (
            <button
              key={tp}
              type="button"
              onClick={() => onChange(tp)}
              className={[
                'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition',
                active
                  ? 'bg-white text-duo-cocoa-800 shadow-sm'
                  : 'text-duo-cocoa-500 hover:text-duo-cocoa-700',
              ].join(' ')}
            >
              {t.ttest.types[tp]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">
        {t.ttest.typeHint[value]}
      </p>
    </div>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [rawState, update] = useAnalysisState()
  const state = { ...DEFAULT_STATE, ...rawState }

  if (!dataset) return null

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const cols = Object.keys(variables)
  const numericCols = cols.filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = cols.filter((c) => variables[c].type === 'categorical')

  const numericOptions = numericCols.map((c) => ({
    value: c,
    label: labelMap[c] || c,
  }))
  const categoricalOptions = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct === 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  const handleType = (newType) => update({ type: newType })

  return (
    <div>
      <TypeSelector value={state.type} onChange={handleType} t={t} />

      {state.type === 'independent' && (
        <div className="space-y-3">
          <VarSelect variant="cream"
            label={t.ttest.config.depVar}
            value={state.depVar}
            onChange={(v) => update({ depVar: v })}
            options={numericOptions}
            placeholder={t.ttest.config.pickDep}
          />
          <VarSelect variant="cream"
            label={t.ttest.config.groupVar}
            value={state.groupVar}
            onChange={(v) => update({ groupVar: v })}
            options={categoricalOptions}
            placeholder={t.ttest.config.pickGroup}
            hint={t.ttest.config.groupVarHint}
          />
        </div>
      )}

      {state.type === 'paired' && (
        <div className="space-y-3">
          <VarSelect variant="cream"
            label={t.ttest.config.var1}
            value={state.var1}
            onChange={(v) => update({ var1: v })}
            options={numericOptions}
            placeholder={t.ttest.config.pickVar1}
          />
          <VarSelect variant="cream"
            label={t.ttest.config.var2}
            value={state.var2}
            onChange={(v) => update({ var2: v })}
            options={numericOptions.filter((o) => o.value !== state.var1)}
            placeholder={t.ttest.config.pickVar2}
          />
        </div>
      )}

      {state.type === 'oneSample' && (
        <div className="space-y-3">
          <VarSelect variant="cream"
            label={t.ttest.config.depVar}
            value={state.depVar}
            onChange={(v) => update({ depVar: v })}
            options={numericOptions}
            placeholder={t.ttest.config.pickDep}
          />
          <div>
            <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
              {t.ttest.config.mu0}
            </label>
            <input
              type="number"
              step="any"
              value={state.mu0}
              onChange={(e) => {
                const v = e.target.value
                update({ mu0: v === '' ? '' : Number(v) })
              }}
              placeholder={t.ttest.config.enterMu0}
              className="w-full h-9 px-3 text-sm rounded-lg bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus-ring focus:border-duo-amber-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Config
