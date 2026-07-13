/**
 * PLS-SEM — Config（左欄）
 *
 * 表單式模型宣告（照 cfa/Config.jsx 的動態卡片慣例）：
 *   1. 潛在變數卡片：名稱 + 測量模式（反映型/形成型）+ 從資料欄多選指標
 *   2. 結構路徑：from → to 下拉選（可新增／刪除）
 *   3. Bootstrap 重抽次數：500 / 1000 / 5000（預設 1000）
 *   4. 進階選項（W3，收合區）：weighting scheme（path/factorial/centroid）、
 *      PLSc（consistent PLS）、CI 類型（percentile/BCa）、blindfolding Q² 開關
 *   5. 「執行分析」：先跑 validatePLSModel，錯誤以中文列出；
 *      通過才把 { model, bootstrapN, options, draft } 寫入 state.committed，
 *      Result / Narrative 依 committed 計算（bootstrap 較重，不做即時反應式計算）。
 *
 * state（analysisState['pls-sem']）：
 *   { lvs, paths, bootstrapN, scheme, consistent, ciType, q2,
 *     committed, configErrors, plsView, positions }
 */
import { useEffect, useState } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { validatePLSModel } from '../../lib/stats/pls.js'
import { fillTemplate } from '../../lib/format'

/** 手機窄幅偵測（md 斷點 = 768px）；畫布在窄幅退回表單 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

const BOOT_OPTIONS = [500, 1000, 5000]
const SCHEME_OPTIONS = ['path', 'factorial', 'centroid']

const DEFAULT_LVS = () => [
  { name: 'LV1', indicators: [], mode: 'reflective' },
  { name: 'LV2', indicators: [], mode: 'reflective' },
]
const DEFAULT_PATHS = () => [{ from: '', to: '' }]

/** 交互項顯示名（同時是模型內的構念名）：A×B（×C） */
function intName(q) {
  return q.c ? `${q.a}×${q.b}×${q.c}` : `${q.a}×${q.b}`
}

/** 把表單草稿組成 docs/pls-model-schema.md 的模型 JSON（不含 UI 專屬欄位） */
function buildModel(lvs, paths, ints, intMethod, hocs, hocMethod) {
  const model = {
    schemaVersion: 1,
    latentVariables: (lvs || []).map((f) => ({
      name: (f.name || '').trim(),
      indicators: Array.isArray(f.indicators) ? f.indicators.filter(Boolean) : [],
      mode: f.mode === 'formative' ? 'formative' : 'reflective',
    })),
    paths: (paths || [])
      .filter((p) => p.from || p.to)
      .map((p) => ({ from: p.from, to: p.to })),
  }
  const hocsN = (hocs || [])
    .filter((h) => (h.name || '').trim() !== '' && Array.isArray(h.components) && h.components.length >= 2)
    .map((h) => ({
      name: h.name.trim(),
      components: [...h.components],
      mode: h.mode === 'formative' ? 'formative' : 'reflective',
      method: hocMethod,
    }))
  if (hocsN.length > 0) model.higherOrder = hocsN
  const intsN = (ints || [])
    .filter((q) => q.a && q.b)
    .map((q) => ({
      name: intName(q),
      factors: q.c ? [q.a, q.b, q.c] : [q.a, q.b],
      method: intMethod,
    }))
  if (intsN.length > 0) model.interactions = intsN
  return model
}

function draftSignature(lvs, paths, ints, intMethod, hocs, hocMethod, bootstrapN, options) {
  return JSON.stringify({ model: buildModel(lvs, paths, ints, intMethod, hocs, hocMethod), bootstrapN, options })
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
      {children}
    </h3>
  )
}

/** segmented control（照 mockup 樣式；供檢視切換 / scheme / CI 類型共用） */
function Segmented({ items, value, onChange, mono = false }) {
  return (
    <div className="inline-flex rounded-lg bg-duo-cream-50 border border-duo-cream-200 p-0.5 w-full">
      {items.map((it) => {
        const active = value === it.key
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition',
              mono ? 'font-mono' : '',
              active
                ? 'bg-white text-duo-cocoa-800 shadow-sm'
                : 'text-duo-cocoa-500 hover:text-duo-cocoa-700',
            ].join(' ')}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-duo-amber-500 w-3.5 h-3.5 mt-0.5 cursor-pointer"
      />
      <span>
        <span className="block text-xs font-medium text-duo-cocoa-800">{label}</span>
        {hint && <span className="block text-[11px] text-duo-cocoa-400 leading-snug mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function Config() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const c = t.pls.config
  const narrow = useIsNarrow()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const lvs = state.lvs
  const paths = state.paths
  const bootstrapN = state.bootstrapN ?? 1000
  const scheme = state.scheme ?? 'path'
  const consistent = state.consistent === true
  const ciType = state.ciType === 'bca' ? 'bca' : 'percentile'
  const q2 = state.q2 === true
  const w5Draft = state.w5 || {}
  const options = {
    scheme, consistent, ciType, q2,
    ...(w5Draft.mga || w5Draft.micom || w5Draft.predict || w5Draft.ipma || w5Draft.cta
      ? { w5: w5Draft } : {}),
  }
  const ints = state.ints || []
  const intMethod = ['two-stage', 'product-indicator', 'orthogonal'].includes(state.intMethod)
    ? state.intMethod : 'two-stage'
  const hocs = state.hocs || []
  const hocMethod = ['repeated', 'disjoint', 'two-stage'].includes(state.hocMethod)
    ? state.hocMethod : 'disjoint'
  const w5 = state.w5 || {}
  const setW5 = (patch) => update({ w5: { ...w5, ...patch } })
  // 檢視模式：'form' 表單 / 'canvas' 畫布；窄幅一律退回表單
  const plsView = narrow ? 'form' : (state.plsView === 'canvas' ? 'canvas' : 'form')

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
  const hocNames = hocs.map((h) => (h.name || '').trim()).filter((name) => name !== '')
  const absorbedSet = new Set(hocs.flatMap((h) => h.components || []))
  // 結構層可用構念：一般構念（未被 HOC 吸收）＋ 高階構念
  const constructOptions = [...lvNameOptions.filter((name) => !absorbedSet.has(name)), ...hocNames]
  const intNames = ints.filter((q) => q.a && q.b).map(intName)
  const pathFromOptions = [...constructOptions, ...intNames]
  // W5：群組值（所選欄位的唯一值，最多 20 個）與內生構念（IPMA 目標）
  const w5col = (state.w5 || {}).groupColumn
  const groupValues = w5col
    ? [...new Set(dataset.rows.map((row) => row?.[w5col]).filter((v) => v !== undefined && v !== null && v !== ''))]
        .slice(0, 20).map(String)
    : []
  const endoOptions = [...new Set(curPaths.filter((p) => p.to).map((p) => p.to))]
  // CTA-PLS（W6.3）：tetrad 檢定至少需 4 個指標（Gudergan et al. 2008）
  const ctaEligible = curLvs
    .filter((f) => (f.indicators || []).filter(Boolean).length >= 4)
    .map((f) => (f.name || '').trim())
  const ctaSkipped = curLvs
    .filter((f) => (f.indicators || []).filter(Boolean).length < 4)
    .map((f) => (f.name || '').trim())
    .filter(Boolean)

  /* ── 構念操作 ── */
  const setLvs = (next) => update({ lvs: next })
  const addLv = () => setLvs([...curLvs, { name: `LV${curLvs.length + 1}`, indicators: [], mode: 'reflective' }])
  const removeLv = (fi) => {
    if (curLvs.length <= 1) return
    setLvs(curLvs.filter((_, idx) => idx !== fi))
  }
  const renameLv = (fi, name) =>
    setLvs(curLvs.map((f, idx) => (idx === fi ? { ...f, name } : f)))
  const setLvMode = (fi, mode) =>
    setLvs(curLvs.map((f, idx) => (idx === fi ? { ...f, mode } : f)))
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

  /* ── 高階構念操作 ── */
  const setHocs = (next) => update({ hocs: next })
  const addHoc = () => setHocs([...hocs, { name: `HOC${hocs.length + 1}`, components: [], mode: 'reflective' }])
  const removeHoc = (hi) => setHocs(hocs.filter((_, idx) => idx !== hi))
  const setHocField = (hi, key, value) =>
    setHocs(hocs.map((h, idx) => (idx === hi ? { ...h, [key]: value } : h)))
  const toggleHocComponent = (hi, name) =>
    setHocs(hocs.map((h, idx) => {
      if (idx !== hi) return h
      const has = (h.components || []).includes(name)
      return { ...h, components: has ? h.components.filter((x) => x !== name) : [...(h.components || []), name] }
    }))

  /* ── 交互項操作 ── */
  const setInts = (next) => update({ ints: next })
  const addInt = () => setInts([...ints, { a: '', b: '', c: '' }])
  const removeInt = (ii) => setInts(ints.filter((_, idx) => idx !== ii))
  const setIntField = (ii, key, value) =>
    setInts(ints.map((q, idx) => (idx === ii ? { ...q, [key]: value } : q)))

  /* ── 執行 ── */
  const handleRun = () => {
    const errors = []
    curPaths.forEach((p, idx) => {
      const touched = p.from || p.to
      if (touched && (!p.from || !p.to)) {
        errors.push(fillTemplate(c.pathIncomplete, { i: idx + 1 }))
      }
    })
    ints.forEach((q, idx) => {
      const touched = q.a || q.b || q.c
      if (touched && (!q.a || !q.b)) errors.push(fillTemplate(c.intIncomplete, { i: idx + 1 }))
    })
    hocs.forEach((h) => {
      const touched = (h.name || '').trim() !== '' || (h.components || []).length > 0
      if (touched && ((h.name || '').trim() === '' || (h.components || []).length < 2)) {
        errors.push(fillTemplate(c.hocIncomplete, { name: h.name || '?' }))
      }
    })
    if ((w5.mga || w5.micom)
        && (!w5.groupColumn || w5.g1 === undefined || w5.g2 === undefined || w5.g1 === w5.g2)) {
      errors.push(c.w5NeedGroups)
    }
    if (w5.ipma && !w5.target) errors.push(c.w5NeedTarget)
    if (w5.cta && ctaEligible.length === 0) errors.push(c.w5CtaNoBlock)
    const model = buildModel(curLvs, curPaths, ints, intMethod, hocs, hocMethod)
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
        options,
        draft: { model, bootstrapN, options },
      },
    })
  }

  const committed = state.committed
  const stale =
    committed &&
    JSON.stringify(committed.draft) !== draftSignature(curLvs, curPaths, ints, intMethod, hocs, hocMethod, bootstrapN, options)

  const errors = state.configErrors || []

  return (
    <div className="space-y-5">
      {/* 表單 / 畫布 切換 */}
      {!narrow && (
        <div>
          <Segmented
            items={[
              { key: 'form', label: c.viewForm },
              { key: 'canvas', label: c.viewCanvas },
            ]}
            value={plsView}
            onChange={(key) => update({ plsView: key })}
          />
          <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">
            {plsView === 'canvas' ? c.viewCanvasHint : c.viewFormHint}
          </p>
        </div>
      )}
      {narrow && state.plsView === 'canvas' && (
        <div className="text-[11px] text-duo-cocoa-800 leading-snug bg-duo-tongue/20 border border-duo-tongue rounded-md px-3 py-2">
          {c.canvasNarrowFallback}
        </div>
      )}

      {/* 潛在變數 */}
      <div>
        <SectionTitle>{c.lvsTitle}</SectionTitle>
        <p className="text-[11px] text-duo-cocoa-400 mb-3 leading-snug">{c.lvsHint}</p>

        <div className="space-y-3">
          {curLvs.map((f, fi) => {
            const used = usedByOthers(fi)
            const availCols = numericCols.filter((col) => !used.has(col))
            const mode = f.mode === 'formative' ? 'formative' : 'reflective'
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
                {/* 測量模式（反映型 / 形成型） */}
                <div className="mb-2">
                  <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.modeLabel}</div>
                  <Segmented
                    items={[
                      { key: 'reflective', label: c.modeReflective },
                      { key: 'formative', label: c.modeFormative },
                    ]}
                    value={mode}
                    onChange={(key) => setLvMode(fi, key)}
                  />
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
        <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">{c.modeHint}</p>

        <button
          type="button"
          onClick={addLv}
          className="w-full mt-3 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition"
        >
          + {c.addLv}
        </button>
      </div>

      {/* 高階構念（W4） */}
      <div>
        <SectionTitle>{c.hocTitle}</SectionTitle>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{c.hocHint}</p>
        {hocs.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.hocMethodTitle}</div>
            <Segmented
              items={['disjoint', 'two-stage', 'repeated'].map((m) => ({ key: m, label: c.hocMethodNames[m] }))}
              value={hocMethod}
              onChange={(key) => update({ hocMethod: key })}
            />
            <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.hocMethodHint}</p>
          </div>
        )}
        <div className="space-y-3">
          {hocs.map((h, hi) => {
            const usedElsewhere = new Set(
              hocs.flatMap((o, oi) => (oi === hi ? [] : o.components || [])))
            return (
              <div key={hi} className="bg-white border border-duo-cocoa-100 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-duo-cocoa-400">{c.hocNameLabel}</span>
                  <input
                    type="text"
                    value={h.name}
                    onChange={(e) => setHocField(hi, 'name', e.target.value)}
                    className="flex-1 h-7 px-2 text-sm rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-800 hover:border-duo-cocoa-200 focus:outline-none focus:border-duo-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeHoc(hi)}
                    title={c.removeHoc}
                    className="p-1 text-duo-cocoa-300 hover:text-duo-sig-bad transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.75" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
                <div className="mb-2">
                  <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.modeLabel}</div>
                  <Segmented
                    items={[
                      { key: 'reflective', label: c.modeReflective },
                      { key: 'formative', label: c.modeFormative },
                    ]}
                    value={h.mode === 'formative' ? 'formative' : 'reflective'}
                    onChange={(key) => setHocField(hi, 'mode', key)}
                  />
                </div>
                <div className="text-[11px] text-duo-cocoa-500 mb-1.5">
                  {c.hocComponentsLabel}（{(h.components || []).length}）
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {lvNameOptions.filter((name) => !usedElsewhere.has(name)).map((name) => {
                    const checked = (h.components || []).includes(name)
                    return (
                      <li key={name}>
                        <label
                          className={[
                            'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition',
                            checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHocComponent(hi, name)}
                            className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="text-xs text-duo-cocoa-800 truncate">{name}</div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={addHoc}
          className="w-full mt-2 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-700 hover:bg-duo-cream-100 transition"
        >
          + {c.addHoc}
        </button>
      </div>

      {/* 調節與二次效果（W4） */}
      <div>
        <SectionTitle>{c.interactionsTitle}</SectionTitle>
        <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{c.interactionsHint}</p>
        {ints.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.intMethodTitle}</div>
            <Segmented
              items={['two-stage', 'product-indicator', 'orthogonal'].map((m) => ({
                key: m, label: c.intMethodNames[m],
              }))}
              value={intMethod}
              onChange={(key) => update({ intMethod: key })}
            />
            <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.intMethodHint}</p>
          </div>
        )}
        <div className="space-y-2">
          {ints.map((q, ii) => (
            <div key={ii} className="bg-white border border-duo-cocoa-100 rounded-md p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={q.a}
                  onChange={(e) => setIntField(ii, 'a', e.target.value)}
                  className="flex-1 min-w-0 h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
                >
                  <option value="">{c.intFactor1}</option>
                  {constructOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="text-duo-cocoa-400 text-xs shrink-0">×</span>
                <select
                  value={q.b}
                  onChange={(e) => setIntField(ii, 'b', e.target.value)}
                  className="flex-1 min-w-0 h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
                >
                  <option value="">{c.intFactor2}</option>
                  {constructOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeInt(ii)}
                  title={c.removeInteraction}
                  className="p-1 shrink-0 text-duo-cocoa-300 hover:text-duo-sig-bad transition"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                       strokeWidth="1.75" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
              {intMethod === 'two-stage' && (
                <select
                  value={q.c || ''}
                  onChange={(e) => setIntField(ii, 'c', e.target.value)}
                  className="w-full h-7 px-2 text-[11px] rounded-md bg-duo-cream-50 border border-duo-cream-200 text-duo-cocoa-600 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
                >
                  <option value="">{c.intFactor3}</option>
                  {constructOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
              {q.a && q.b && (
                <div className="text-[11px] font-mono text-duo-cocoa-500">→ {intName(q)}</div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addInt}
          className="w-full mt-2 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-cream-50 border border-duo-cocoa-100 text-duo-cocoa-700 hover:bg-duo-cream-100 transition"
        >
          + {c.addInteraction}
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
                {pathFromOptions.map((name) => (
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
                {constructOptions
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
        <Segmented
          items={BOOT_OPTIONS.map((n) => ({ key: n, label: String(n) }))}
          value={bootstrapN}
          onChange={(key) => update({ bootstrapN: key })}
          mono
        />
        <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.bootstrapHint}</p>
      </div>

      {/* 進階選項（W3）：scheme / PLSc / CI 類型 / Q² */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 bg-duo-cream-50 border border-duo-cream-200 rounded-md hover:text-duo-cocoa-600 transition"
        >
          <span>{c.advancedTitle}</span>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            className={advancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        {advancedOpen && (
          <div className="mt-3 space-y-4 px-1">
            <div>
              <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.schemeTitle}</div>
              <Segmented
                items={SCHEME_OPTIONS.map((s) => ({ key: s, label: c.schemeNames[s] }))}
                value={scheme}
                onChange={(key) => update({ scheme: key })}
              />
              <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.schemeHint}</p>
            </div>
            <Toggle
              checked={consistent}
              onChange={(v) => update({ consistent: v })}
              label={c.plscLabel}
              hint={c.plscHint}
            />
            <div>
              <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.ciTypeTitle}</div>
              <Segmented
                items={[
                  { key: 'percentile', label: c.ciPercentile },
                  { key: 'bca', label: c.ciBca },
                ]}
                value={ciType}
                onChange={(key) => update({ ciType: key })}
              />
              <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.ciTypeHint}</p>
            </div>
            <Toggle
              checked={q2}
              onChange={(v) => update({ q2: v })}
              label={c.q2Label}
              hint={c.q2Hint}
            />
          </div>
        )}
      </div>

      {/* 群組與預測（W5） */}
      <div>
        <SectionTitle>{c.w5Title}</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-2">
            <Toggle
              checked={w5.mga === true}
              onChange={(v) => setW5({ mga: v })}
              label={c.w5MgaLabel}
              hint={c.w5MgaHint}
            />
            <Toggle
              checked={w5.micom === true}
              onChange={(v) => setW5({ micom: v })}
              label={c.w5MicomLabel}
              hint={c.w5MicomHint}
            />
            {(w5.mga || w5.micom) && (
              <div className="pl-1 space-y-2">
                <div>
                  <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.w5GroupColumn}</div>
                  <select
                    value={w5.groupColumn || ''}
                    onChange={(e) => setW5({ groupColumn: e.target.value, g1: undefined, g2: undefined })}
                    className="w-full h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
                  >
                    <option value="">{c.w5PickColumn}</option>
                    {Object.keys(variables).map((col) => (
                      <option key={col} value={col}>{labelMap[col] || col}</option>
                    ))}
                  </select>
                </div>
                {w5.groupColumn && (
                  <div className="flex items-center gap-1.5">
                    {['g1', 'g2'].map((key) => (
                      <select
                        key={key}
                        value={w5[key] ?? ''}
                        onChange={(e) => setW5({ [key]: e.target.value })}
                        className="flex-1 min-w-0 h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
                      >
                        <option value="">{key === 'g1' ? c.w5G1 : c.w5G2}</option>
                        {groupValues.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                )}
                <div>
                  <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.w5PermsTitle}</div>
                  <Segmented
                    items={[200, 500, 1000].map((n) => ({ key: n, label: String(n) }))}
                    value={w5.permutations ?? 500}
                    onChange={(key) => setW5({ permutations: key })}
                    mono
                  />
                  <p className="text-[11px] text-duo-cocoa-400 mt-1 leading-snug">{c.w5PermsHint}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Toggle
              checked={w5.predict === true}
              onChange={(v) => setW5({ predict: v })}
              label={c.w5PredictLabel}
              hint={c.w5PredictHint}
            />
            {w5.predict && (
              <div className="pl-1">
                <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.w5KTitle}</div>
                <Segmented
                  items={[5, 10].map((n) => ({ key: n, label: String(n) }))}
                  value={w5.k ?? 10}
                  onChange={(key) => setW5({ k: key })}
                  mono
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Toggle
              checked={w5.ipma === true}
              onChange={(v) => setW5({ ipma: v })}
              label={c.w5IpmaLabel}
              hint={c.w5IpmaHint}
            />
            {w5.ipma && (
              <select
                value={w5.target || ''}
                onChange={(e) => setW5({ target: e.target.value })}
                className="w-full h-8 px-2 text-xs rounded-md bg-white border border-duo-cream-200 text-duo-cocoa-800 hover:border-duo-amber-300 focus:outline-none focus:border-duo-amber-500 cursor-pointer"
              >
                <option value="">{c.w5Target}</option>
                {endoOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            {w5.ipma && (
              <Toggle
                checked={w5.cipma === true}
                onChange={(v) => setW5({ cipma: v })}
                label={c.w5CipmaLabel}
                hint={c.w5CipmaHint}
              />
            )}
          </div>
          <div className="space-y-2">
            <Toggle
              checked={w5.cta === true}
              onChange={(v) => setW5({ cta: v })}
              label={c.w5CtaLabel}
              hint={c.w5CtaHint}
            />
            {w5.cta && ctaEligible.length === 0 && (
              <p className="text-[11px] text-duo-cocoa-800 leading-snug bg-duo-sig-red/10 border border-duo-sig-red/40 rounded-md px-3 py-2">
                {c.w5CtaNoBlock}
              </p>
            )}
            {w5.cta && ctaEligible.length > 0 && ctaSkipped.length > 0 && (
              <p className="text-[11px] text-duo-cocoa-800 leading-snug bg-duo-tongue/20 border border-duo-tongue rounded-md px-3 py-2">
                {fillTemplate(c.w5CtaSkipNote, { lvs: ctaSkipped.join('、') })}
              </p>
            )}
          </div>
          {(w5.micom || w5.predict || w5.ipma) && (ints.length > 0 || hocs.length > 0) && (
            <p className="text-[11px] text-duo-cocoa-800 leading-snug bg-duo-tongue/20 border border-duo-tongue rounded-md px-3 py-2">
              {c.w5W4Note}
            </p>
          )}
        </div>
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
