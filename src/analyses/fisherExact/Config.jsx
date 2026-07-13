/**
 * Fisher 精確檢定 — Config
 *
 * 選擇兩個類別變數（rowVar、colVar，需相異），
 * 並指定每一個變數中要視為「成功」的類別。
 *
 * 若任一變數類別數 > 2，UI 會在 Result 端顯示警告（僅取前兩個或使用者指定的成功類別 + 第一個非成功類別）。
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
  rowVar: null,
  colVar: null,
  successRow: null,
  successCol: null,
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
    <div className="space-y-3">
      <VarSelect
        label={t.fisherExact.config.rowVar}
        value={state.rowVar}
        onChange={(v) => update({ rowVar: v, successRow: null })}
        options={opts.filter(o => o.value !== state.colVar)}
        placeholder={t.fisherExact.config.pickRow}
        hint={t.fisherExact.config.rowHint}
      />
      <VarSelect
        label={t.fisherExact.config.successRow}
        value={state.successRow}
        onChange={(v) => update({ successRow: v })}
        options={successLevelsForVar(state.rowVar)}
        placeholder={t.fisherExact.config.pickSuccessRow}
      />
      <VarSelect
        label={t.fisherExact.config.colVar}
        value={state.colVar}
        onChange={(v) => update({ colVar: v, successCol: null })}
        options={opts.filter(o => o.value !== state.rowVar)}
        placeholder={t.fisherExact.config.pickCol}
        hint={t.fisherExact.config.colHint}
      />
      <VarSelect
        label={t.fisherExact.config.successCol}
        value={state.successCol}
        onChange={(v) => update({ successCol: v })}
        options={successLevelsForVar(state.colVar)}
        placeholder={t.fisherExact.config.pickSuccessCol}
      />
    </div>
  )
}

export default Config
