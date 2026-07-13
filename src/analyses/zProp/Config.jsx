/**
 * z 檢定（比例）— Config
 *
 * 型別：one（單樣本對 p0）/ two（雙獨立樣本比較）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

function collectLevels(rows, varName) {
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const v = r[varName]
    if (v === null || v === undefined || v === '') continue
    const k = String(v)
    if (!seen.has(k)) { seen.add(k); out.push(k) }
  }
  return out
}

const DEFAULT = {
  type: 'one',
  var1: null, successLevel: null, p0: 0.5,
  groupVar: null, valueVar: null,
}

function TypeSelector({ value, onChange, t }) {
  const types = ['one', 'two']
  return (
    <div className="space-y-2 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.zProp.config.typeLabel}
      </h3>
      <div className="inline-flex rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full">
        {types.map((tp) => {
          const active = value === tp
          return (
            <button
              key={tp}
              type="button"
              onClick={() => onChange(tp)}
              className={[
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition',
                active
                  ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                  : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
              ].join(' ')}
            >
              {t.zProp.types[tp]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">{t.zProp.typeHint[value]}</p>
    </div>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [rawState, update] = useAnalysisState()
  const state = { ...DEFAULT, ...rawState }
  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const langKey = lang === 'zh-TW' ? 'zh' : 'en'

  const categoricalCols = Object.keys(variables).filter((c) => variables[c].type === 'categorical')
  const opts = categoricalCols.map((c) => ({ value: c, label: labelMap[c] || c }))

  const successLevelsForVar = (vName) => {
    if (!vName) return []
    const lvs = collectLevels(dataset.rows, vName)
    const valueLabels = dataset.valueLabels?.[vName]?.[langKey] || {}
    return lvs.map(lv => ({ value: lv, label: valueLabels[lv] || lv }))
  }

  return (
    <div>
      <TypeSelector value={state.type} onChange={(v) => update({ type: v, successLevel: null })} t={t} />

      {state.type === 'one' && (
        <div className="space-y-3">
          <VarSelect
            label={t.zProp.config.var1}
            value={state.var1}
            onChange={(v) => update({ var1: v, successLevel: null })}
            options={opts}
            placeholder={t.zProp.config.pickVar}
            hint={t.zProp.config.varHint}
          />
          <VarSelect
            label={t.zProp.config.successLevel}
            value={state.successLevel}
            onChange={(v) => update({ successLevel: v })}
            options={successLevelsForVar(state.var1)}
            placeholder={t.zProp.config.pickSuccess}
          />
          <div>
            <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">{t.zProp.config.p0}</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.99"
              value={state.p0 ?? ''}
              onChange={(e) => update({ p0: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full h-9 px-3 text-sm rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-800 focus-ring focus:border-duo-amber-500 font-mono"
            />
            <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">{t.zProp.config.p0Hint}</p>
          </div>
        </div>
      )}

      {state.type === 'two' && (
        <div className="space-y-3">
          <VarSelect
            label={t.zProp.config.groupVar}
            value={state.groupVar}
            onChange={(v) => update({ groupVar: v })}
            options={opts.filter(o => o.value !== state.valueVar)}
            placeholder={t.zProp.config.pickGroup}
            hint={t.zProp.config.groupHint}
          />
          <VarSelect
            label={t.zProp.config.valueVar}
            value={state.valueVar}
            onChange={(v) => update({ valueVar: v, successLevel: null })}
            options={opts.filter(o => o.value !== state.groupVar)}
            placeholder={t.zProp.config.pickValueVar}
            hint={t.zProp.config.valueHint}
          />
          <VarSelect
            label={t.zProp.config.successLevel}
            value={state.successLevel}
            onChange={(v) => update({ successLevel: v })}
            options={successLevelsForVar(state.valueVar)}
            placeholder={t.zProp.config.pickSuccess}
          />
        </div>
      )}
    </div>
  )
}

export default Config
