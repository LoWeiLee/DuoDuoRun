/**
 * 簡單迴歸 — Config（左欄）
 *
 * 兩個下拉選單：依變項 Y、預測變項 X。X 與 Y 不可相同（已在選項中互斥）。
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
  const opts = numericCols.map((c) => ({ value: c, label: labelMap[c] || c }))

  return (
    <div className="space-y-3">
      <VarSelect
        label={t.simpleReg.config.yLabel}
        value={state.yVar}
        onChange={(v) => update({ yVar: v })}
        options={opts.filter((o) => o.value !== state.xVar)}
        placeholder={t.simpleReg.config.pickY}
      />
      <VarSelect
        label={t.simpleReg.config.xLabel}
        value={state.xVar}
        onChange={(v) => update({ xVar: v })}
        options={opts.filter((o) => o.value !== state.yVar)}
        placeholder={t.simpleReg.config.pickX}
      />
    </div>
  )
}

export default Config
