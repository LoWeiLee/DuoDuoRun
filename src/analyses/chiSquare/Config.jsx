/**
 * 卡方檢定 — Config（左欄）
 *
 * 上方：型別切換（獨立性 / 適合度）
 * 獨立性：列變數 + 欄變數（兩個 categorical）
 * 適合度：類別變數 + 期望機率輸入
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

const DEFAULT = { type: 'independence', rowVar: null, colVar: null, gofVar: null, expectedProps: null }

function TypeSelector({ value, onChange, t }) {
  const types = ['independence', 'gof']
  return (
    <div className="space-y-2 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.chiSq.config.typeLabel}
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
              {t.chiSq.types[tp]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">
        {t.chiSq.typeHint[value]}
      </p>
    </div>
  )
}

function GofExpectedTable({ gofVar, dataset, t, lang, expectedProps, update }) {
  if (!gofVar) return null
  // 從資料集中蒐集 gofVar 的所有 levels（按出現順序）
  const seen = new Set()
  const levels = []
  for (const r of dataset.rows) {
    const v = r[gofVar]
    if (v === null || v === undefined || v === '') continue
    const k = String(v)
    if (!seen.has(k)) { seen.add(k); levels.push(k) }
  }
  if (levels.length === 0) return null

  const valueLabels = dataset.valueLabels?.[gofVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const current = expectedProps || {}
  const handleChange = (lv, val) => {
    const next = { ...current }
    if (val === '' || val === null) delete next[lv]
    else next[lv] = Number(val)
    update({ expectedProps: next })
  }
  const reset = () => update({ expectedProps: null })

  return (
    <div>
      <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">
        {t.chiSq.config.expectedProps}
      </label>
      <p className="text-[10px] text-duo-cocoa-400 mb-2 leading-snug">
        {t.chiSq.config.expectedHint}
      </p>
      <div className="space-y-1.5">
        {levels.map((lv) => (
          <div key={lv} className="flex items-center gap-2">
            <span className="text-xs text-duo-cocoa-700 flex-1 truncate">
              {valueLabels[lv] || lv}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              max="1"
              value={current[lv] !== undefined ? current[lv] : ''}
              onChange={(e) => handleChange(lv, e.target.value)}
              placeholder={`1/${levels.length} = ${(1 / levels.length).toFixed(3)}`}
              className="w-24 h-7 px-2 text-xs rounded bg-white border border-duo-cocoa-100 text-duo-cocoa-800 focus-ring focus:border-duo-amber-500 font-mono"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={reset}
        className="text-[11px] text-duo-amber-700 hover:underline mt-2"
      >
        {lang === 'zh-TW' ? '重設為均勻' : 'Reset to uniform'}
      </button>
    </div>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [rawState, update] = useAnalysisState()
  const state = { ...DEFAULT, ...rawState }

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const categoricalCols = Object.keys(variables).filter((c) => variables[c].type === 'categorical')
  const opts = categoricalCols.map((c) => ({ value: c, label: labelMap[c] || c }))

  const handleType = (newType) => update({ type: newType })

  return (
    <div>
      <TypeSelector value={state.type} onChange={handleType} t={t} />

      {state.type === 'independence' && (
        <div className="space-y-3">
          <VarSelect
            label={t.chiSq.config.rowVar}
            value={state.rowVar}
            onChange={(v) => update({ rowVar: v })}
            options={opts.filter((o) => o.value !== state.colVar)}
            placeholder={t.chiSq.config.pickRow}
            hint={t.chiSq.config.varNeedCategorical}
          />
          <VarSelect
            label={t.chiSq.config.colVar}
            value={state.colVar}
            onChange={(v) => update({ colVar: v })}
            options={opts.filter((o) => o.value !== state.rowVar)}
            placeholder={t.chiSq.config.pickCol}
            hint={t.chiSq.config.varNeedCategorical}
          />
        </div>
      )}

      {state.type === 'gof' && (
        <div className="space-y-3">
          <VarSelect
            label={t.chiSq.config.gofVar}
            value={state.gofVar}
            onChange={(v) => update({ gofVar: v, expectedProps: null })}
            options={opts}
            placeholder={t.chiSq.config.pickGof}
          />
          <GofExpectedTable
            gofVar={state.gofVar}
            dataset={dataset}
            t={t}
            lang={lang}
            expectedProps={state.expectedProps}
            update={update}
          />
        </div>
      )}
    </div>
  )
}

export default Config
