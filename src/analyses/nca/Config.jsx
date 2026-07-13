/**
 * NCA — Config（左欄）
 *
 * 兩個下拉選單：條件變數 X（必要條件）、結果變數 Y。X 與 Y 不可相同。
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
        label={t.nca.config.xLabel}
        value={state.xVar}
        onChange={(v) => update({ xVar: v })}
        options={opts.filter((o) => o.value !== state.yVar)}
        placeholder={t.nca.config.pickX}
      />
      <VarSelect
        label={t.nca.config.yLabel}
        value={state.yVar}
        onChange={(v) => update({ yVar: v })}
        options={opts.filter((o) => o.value !== state.xVar)}
        placeholder={t.nca.config.pickY}
      />
      <p className="text-xs text-duo-cocoa-400 leading-relaxed pt-1">{t.nca.config.hint}</p>
    </div>
  )
}

export default Config
