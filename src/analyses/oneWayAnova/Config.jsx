/**
 * 單因子 ANOVA — Config（左欄）
 *
 * 依變項：numeric（continuous / ordinal）下拉
 * 因子：categorical 下拉，需 ≥ 3 組
 */
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

  const numericOpts = numericCols.map((c) => ({ value: c, label: labelMap[c] || c }))
  const factorOpts = categoricalCols.map((c) => {
    const distinct = variables[c].distinct
    const tag = distinct >= 3 ? '' : ` (${distinct} ${lang === 'zh-TW' ? '組' : 'groups'})`
    return { value: c, label: (labelMap[c] || c) + tag }
  })

  return (
    <div className="space-y-3">
      <VarSelect variant="cream"
        label={t.anova.config.depVar}
        value={state.depVar}
        onChange={(v) => update({ depVar: v })}
        options={numericOpts}
        placeholder={t.anova.config.pickDep}
      />
      <VarSelect variant="cream"
        label={t.anova.config.factor}
        value={state.factor}
        onChange={(v) => update({ factor: v })}
        options={factorOpts}
        placeholder={t.anova.config.pickFactor}
        hint={t.anova.config.factorHint}
      />
    </div>
  )
}

export default Config
