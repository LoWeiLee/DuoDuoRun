import { useApp, useAnalysisState } from '../../context/AppContext'
import VarSelect from '../../components/ui/VarSelect'

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const numericCols = Object.keys(variables).filter(
    (c) => variables[c].type === 'continuous' || variables[c].type === 'ordinal'
  )
  const categoricalCols = Object.keys(variables).filter((c) => variables[c].type === 'categorical')

  const numOpts = numericCols.map((c) => ({ value: c, label: labelMap[c] || c }))
  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 2 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  return (
    <div className="space-y-3">
      <VarSelect
        label={t.anova2.config.depVar}
        value={state.depVar}
        onChange={(v) => update({ depVar: v })}
        options={numOpts}
        placeholder={t.anova2.config.pickDep}
      />
      <VarSelect
        label={t.anova2.config.factorA}
        value={state.factorA}
        onChange={(v) => update({ factorA: v })}
        options={factorOpts.filter((o) => o.value !== state.factorB)}
        placeholder={t.anova2.config.pickFactorA}
      />
      <VarSelect
        label={t.anova2.config.factorB}
        value={state.factorB}
        onChange={(v) => update({ factorB: v })}
        options={factorOpts.filter((o) => o.value !== state.factorA)}
        placeholder={t.anova2.config.pickFactorB}
        hint={t.anova2.config.hint}
      />
    </div>
  )
}

export default Config
