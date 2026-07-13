/**
 * Cohen's Kappa — Config
 *
 * 選兩個類別變數（rater 1 / rater 2）+ 加權方式（none / linear / quadratic）。
 * Pick two categorical variables + weighting (none / linear / quadratic).
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

const DEFAULT = {
  rater1Var: null,
  rater2Var: null,
  weighting: 'none',
}

function WeightingSelector({ value, onChange, t }) {
  const options = ['none', 'linear', 'quadratic']
  return (
    <div className="space-y-2 mb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400">
        {t.kappa.config.weightingLabel}
      </h3>
      <div className="inline-flex rounded-md bg-duo-cream-50 border border-duo-cocoa-100 p-0.5 w-full">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={[
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition',
                active
                  ? 'bg-white text-duo-cocoa-900 border border-duo-cocoa-100'
                  : 'text-duo-cocoa-500 hover:text-duo-cocoa-800',
              ].join(' ')}
            >
              {t.kappa.weightings[opt]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-duo-cocoa-400 leading-snug">
        {t.kappa.weightingHint[value]}
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

  const categoricalCols = Object.keys(variables).filter((c) => variables[c].type === 'categorical')
  const opts = categoricalCols.map((c) => ({ value: c, label: labelMap[c] || c }))

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <VarSelect
          label={t.kappa.config.rater1Var}
          value={state.rater1Var}
          onChange={(v) => update({ rater1Var: v })}
          options={opts.filter(o => o.value !== state.rater2Var)}
          placeholder={t.kappa.config.pickRater1}
          hint={t.kappa.config.raterHint}
        />
        <VarSelect
          label={t.kappa.config.rater2Var}
          value={state.rater2Var}
          onChange={(v) => update({ rater2Var: v })}
          options={opts.filter(o => o.value !== state.rater1Var)}
          placeholder={t.kappa.config.pickRater2}
          hint={t.kappa.config.raterHint}
        />
      </div>

      <WeightingSelector
        value={state.weighting}
        onChange={(v) => update({ weighting: v })}
        t={t}
      />
    </div>
  )
}

export default Config
