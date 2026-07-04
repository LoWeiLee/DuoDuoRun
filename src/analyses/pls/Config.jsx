/**
 * PLS-SEM — Config（左欄）
 *
 * 表單式模型宣告（照 cfa/Config.jsx 的動態卡片慣例）：
 *   1. 潛在變數卡片：名稱 + 從資料欄多選指標（一個指標只屬於一個構念）
 *   2. 結構路徑：from → to 下拉選（可新增／刪除）
 *   3. Bootstrap 重抽次數：500 / 1000 / 5000（預設 1000）
 *   4. 「執行分析」：先跑 validatePLSModel，錯誤以中文列出；
 *      通過才把 { model, bootstrapN, draft } 寫入 state.committed，
 *      Result / Narrative 依 committed 計算（bootstrap 較重，不做即時反應式計算）。
 *
 * state（analysisState['pls-sem']）：
 *   { lvs, paths, bootstrapN, committed, configErrors }
 */
import { useEffect } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { validatePLSModel } from '../../lib/stats/pls.js'
import { fillTemplate } from '../../lib/format'

const BOOT_OPTIONS = [500, 1000, 5000]

const DEFAULT_LVS = () => [
  { name: 'LV1', indicators: [] },
  { name: 'LV2', indicators: [] },
]
const DEFAULT_PATHS = () => [{ from: '', to: '' }]

/** 把表單草稿組成 docs/pls-model-schema.md 的模型 JSON（不含 UI 專屬欄位） */
function buildModel(lvs, paths) {
  return {
    schemaVersion: 1,
    latentVariables: (lvs || []).map((f) => ({
      name: (f.name || '').trim(),
      indicators: Array.isArray(f.indicators) ? f.indicators.filter(Boolean) : [],
    })),
    paths: (paths || [])
      .filter((p) => p.from || p.to)
      .map((p) => ({ from: p.from, to: p.to })),
  }
}

function draftSignature(lvs, paths, bootstrapN) {
  return JSON.stringify({ model: buildModel(lvs, paths), bootstrapN })
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
      {children}
    </h3>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const c = t.pls.config

  const lvs = state.lvs
  const paths = state.paths
  const bootstrapN = state.bootstrapN ?? 1000

  // 首次進入：兩個空構念 + 一條空路徑
  useEffect(() => {
    if (lvs === undefined) {
      update({ lvs: DEFAULT_LVS(), paths: DEFAULT_PATHS(), bootstrapN: 1000 })
    }
  }, [lvs, update])

  if (!dataset) return null
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const numericCols = Object.keys(variables).filter(
    (col) => variables[col].type === 'continuous' || variables[col].type === 'ordinal'
  )
  const curLvs = lvs || DEFAULT_LVS()
  const curPaths = paths || DEFAULT_PATHS()

  // 已被「其他」構念佔用的指標（給定正在編輯的構念 fi）
  const usedByOthers = (fi) => {
    const set = new Set()
    curLvs.forEach((f, idx) => {
      if (idx === fi) return
      f.indicators.forEach((ind) => set.add(ind))
    })
    return set
  }

  const lvNameOptions = curLvs
    .map((f) => (f.name || '').trim())
    .filter((name) => name !== '')

  /* ── 構念操作 ── */
  const setLvs = (next) => update({ lvs: next })
  const addLv = () => setLvs([...curLvs, { name: `LV${curLvs.length + 1}`, indicators: [] }])
  const removeLv = (fi) => {
    if (curLvs.length <= 1) return
    setLvs(curLvs.filter((_, idx) => idx !== fi))
  }
  const renameLv = (fi, name) =>
    setLvs(curLvs.map((f, idx) => (idx === fi ? { ...f, name } : f)))
  const toggleIndicator = (fi, col) =>
    setLvs(
      curLvs.map((f, idx) => {
        if (idx !== fi) return f
        const has = f.indicators.includes(col)
        return {
          ...f,
          indicators: has ? f.indicators.filter((x) => x !== col) : [...f.indicators, col],
        }
      })
    )

  /* ── 路徑操作 ── */
  const setPaths = (next) => update({ paths: next })
  const addPath = () => setPaths([...curPaths, { from: '', to: '' }])
  const removePath = (pi) => setPaths(curPaths.filter((_, idx) => idx !== pi))
  const setPathEnd = (pi, key, value) =>
    setPaths(curPaths.map((p, idx) => (idx === pi ? { ...p, [key]: value } : p)))

  /* ── 執行 ── */
  const handleRun = () => {
    const errors = []
    curPaths.forEach((p, idx) => {
      const touched = p.from || p.to
      if (touched && (!p.from || !p.to)) {
        errors.push(fillTemplate(c.pathIncomplete, { i: idx + 1 }))
      }
    })
    const model = buildModel(curLvs, curPaths)
    const v = validatePLSModel(model)
    if (!v.ok) errors.push(...v.errors)
    if (errors.length > 0) {
      update({ configErrors: errors })
      return
    }
    update({
      configErrors: [],
      committed: {
        model,
        bootstrapN,
        draft: { model, bootstrapN },
      },
    })
  }

  const committed = state.committed
  const stale =
    committed && JSON.stringify(committed.draft) !== draftSignature(curLvs, curPaths, bootstrapN)

  const errors = state.configErrors || []

  return (
    <div className="space-y-5">
      {/* 潛在變數 */}
      <div>
        <SectionTitle>{c.lvsTitle}</SectionTitle>
        <p className="text-[11px] text-duo-cocoa-400 mb-3 leading-snug">{c.lvsHint}</p>

        <div className="space-y-3">
          {curLvs.map((f, fi) => {
            const used = usedByOthers(fi)
            const availCols = numericCols.filter((col) => !used.has(col))
            return (
              <div key={fi} className="bg-white border border-duo-cocoa-100 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-duo-cocoa-400">
                    {c.lvLabel} {fi + 1}
                  </span>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => renameLv(fi, e.target.value)}
                    placeholder={`LV${fi + 1}`}
                    className="flex-1 h-7 px-2 text-sm rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus:outline-none focus:border-duo-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLv(fi)}
                    disabled={curLvs.length <= 1}
                    title={c.removeLv}
                    className="p-1 text-duo-cocoa-300 hover:text-duo-sig-bad disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.75" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
                <div className="text-[11px] text-duo-cocoa-500 mb-1.5">
                  {c.indicatorsLabel}（{f.indicators.length}）
                </div>
                <ul className="space-y-1 max-h-56 overflow-y-auto">
                  {availCols.map((col) => {
                    const checked = f.indicators.includes(col)
                    return (
                      <li key={col}>
                        <label
                          className={[
                            'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition',
                            checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIndicator(fi, col)}
                            className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="text-xs text-duo-cocoa-800 truncate">
                            {labelMap[col] || col}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                  {availCols.length === 0 && (
                    <li className="text-[11px] text-duo-cocoa-400 italic px-2 py-1">
                      {c.noIndicatorsLeft}
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addLv}
          className="w-full mt-3 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
        >
          + {c.addLv}
        </button>
      </div>

      {/* 結構路徑 */}
      <div>
        <SectionTitle>{c.pathsTitle}</SectionTitle>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{c.pathsHint}</p>
        <div className="space-y-2">
          {curPaths.map((p, pi) => (
            <div key={pi} className="flex items-center gap-1.5">
              <select
                value={p.from}
                onChange={(e) => setPathEnd(pi, 'from', e.target.value)}
                className="flex-1 min-w-0 h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
              >
                <option value="">{c.pickLv}</option>
                {lvNameOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <span className="text-duo-cocoa-400 text-xs shrink-0">→</span>
              <select
                value={p.to}
                onChange={(e) => setPathEnd(pi, 'to', e.target.value)}
                className="flex-1 min-w-0 h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
              >
                <option value="">{c.pickLv}</option>
                {lvNameOptions
                  .filter((name) => name !== p.from)
                  .map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => removePath(pi)}
                title={c.removePath}
                className="p-1 shrink-0 text-duo-cocoa-300 hover:text-duo-sig-bad transition"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     strokeWidth="1.75" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPath}
          className="w-full mt-2 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-700 hover:bg-duo-cream-100 transition"
        >
          + {c.addPath}
        </button>
      </div>

      {/* Bootstrap 次數 */}
      <div>
        <SectionTitle>{c.bootstrapTitle}</SectionTitle>
        <div className="inline-flex rounded-lg bg-duo-cream-50 border border-duo-cream-200 p-0.5 w-full">
          {BOOT_OPTIONS.map((n) => {
            const active = bootstrapN === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => update({ bootstrapN: n })}
                className={[
                  'flex-1 px-2 py-1.5 text-xs font-mono font-medium rounded-md transition',
                  active
                    ? 'bg-white text-duo-cocoa-800 shadow-sm'
                    : 'text-duo-cocoa-500 hover:text-duo-cocoa-700',
                ].join(' ')}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.bootstrapHint}</p>
      </div>

      {/* 執行 */}
      <div>
        <button
          type="button"
          onClick={handleRun}
          className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
        >
          {committed ? c.rerun : c.run}
        </button>
        {stale && (
          <p className="mt-2 px-3 py-2 rounded-md bg-duo-tongue/20 border border-duo-tongue text-[11px] text-duo-cocoa-800 leading-snug">
            {c.staleNote}
          </p>
        )}
        {errors.length > 0 && (
          <div className="mt-2 px-3 py-2 rounded-md bg-duo-sig-bad/10 border border-duo-sig-bad text-[11px] text-duo-cocoa-800 leading-snug">
            <div className="font-semibold text-duo-sig-bad mb-1">{c.errorsTitle}</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="text-[11px] text-duo-cocoa-400 leading-snug bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2">
        {c.modeNote}
      </div>
    </div>
  )
}

export default Config
