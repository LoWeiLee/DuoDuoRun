/**
 * PLS-SEM — 拖拉式模型畫布（W2）
 *
 * 與表單「共用同一份模型 state」：讀寫 analysisState['pls-sem'] 的
 *   lvs      — [{ name, indicators, mode }]（與 Config.jsx 完全相同的欄位；
 *               mode: 'reflective' | 'formative'，W3 起可在指標面板切換）
 *   paths    — [{ from, to }]
 *   positions — { [lvName]: { x, y } }（W2 新增；節點座標，重載對話不丟版面）
 * 切換「表單 / 畫布」視圖只改 state.plsView，不動 lvs/paths，故資料不掉。
 *
 * 節點：
 *   潛在變數（LV）= 圓角橢圓節點，可拖曳、雙擊改名、刪除、點擊開指標面板
 *   指標         = 小矩形節點，自動排列在所屬 LV 周圍（不可拖，跟著 LV 走）
 * 邊：
 *   LV→LV（structural）= 箭頭路徑，點擊可刪；跑完分析顯示 β＋顯著星號（toneForP 語意色）
 *     LV 四方位都有 handle（ConnectionMode.Loose：每個圓點皆可拉出／接入連線）；
 *     邊依兩節點「相對位置」自動選最近的一對 handle（目標在右 → right→left，近似直線），
 *     拖動節點時（onNodeDrag 即時座標）邊會即時重選 handle，不會從下方繞到上方。
 *   LV→指標（measure）= 淺 cocoa 細線，跑完分析顯示 loading（mono）
 *     指標節點的 handle 必須是 target 型（先前誤設為 source，React Flow 找不到
 *     target handle 而整條邊不渲染 — 這就是「看不到指標連線」的根因）。
 *   HOC→成分（hoc）＝ 琥珀虛線；反映型 HOC 箭頭朝成分、形成型朝 HOC
 *   因子→交互項（int）＝ cocoa 虛線、無箭頭（表示交互項由這兩（三）個構念構成）
 * 結果覆蓋層：LV 圓內顯示 R²。
 *
 * W4（交互項／高階構念）顯示層 —— 表單仍是 source of truth，畫布唯讀呈現：
 *   - 交互項節點（int:）與高階構念節點（hoc:）由 state.ints / state.hocs 推導，
 *     不能在畫布上新增或改名（避免兩套編輯路徑各自為政）；可拖曳，座標與 LV 共用
 *     state.positions。
 *   - 引擎自動補的主效果路徑（meta.autoAddedPaths，如 two-stage 調節的 C→Y）
 *     以虛線呈現並標註，避免使用者以為畫布漏畫。
 *   - W4 模型的最終估計走分數層（指標名為 *_score），原始指標的 loading 在
 *     estimate.stage1 —— 覆蓋層改讀 stage1，否則畫布上的指標一律沒有數字。
 * 匯出：html2canvas 匯出白底 PNG（論文用）。
 *
 * 視覺對齊 docs/mockups：暖色底、cocoa 節點框、duo.sig 語意色，不用 React Flow 預設藍。
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import html2canvas from 'html2canvas'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runPLSAnalysis } from './compute'
import { intName, validInteractions, validHigherOrder } from './model'
import { fmtNum, fmtSig, toneForP } from '../../lib/format'

/* duo.sig 語意色（與 tailwind.config.js 一致，供 SVG/inline style 使用） */
const SIG = { ok: '#2f9e63', bad: '#d9363e', warn: '#e0940f' }
const COCOA = { 700: '#3f2d1f', 500: '#5a432a', 400: '#7d5e3c', 200: '#cfae89', 100: '#ebd9c4' }
const CREAM = { 50: '#fffaf2', 100: '#fbeed8', 200: '#f4ddb2' }
const AMBER = { 50: '#fef3e2', 500: '#d97e2a' }

/* LV 四方位 handle 的圓點樣式（Loose 模式：每個圓點皆可拉出／接入連線） */
const HANDLE_STYLE = { background: AMBER[500], border: '1.5px solid #fff', width: 9, height: 9 }

/** 新 LV 的不重疊預設座標（沿對角線鋪開，避免疊在一起） */
function defaultPosFor(index) {
  const col = index % 3
  const row = Math.floor(index / 3)
  return { x: 80 + col * 260, y: 80 + row * 200 }
}

/**
 * 依兩個 LV 的相對位置選最近的一對 handle，回傳 [sourceHandle, targetHandle]。
 * 兩個 LV 節點同尺寸（130×84），比較左上角座標等同比較中心點。
 * 水平距離較大 → 走左右（right→left / left→right）；垂直較大 → 走上下。
 */
/** 構念節點 id → 構念名（lv: / hoc: / int: 三種前綴）；指標節點回 null */
function constructNameOf(id) {
  if (id.startsWith('lv:')) return id.slice(3)
  if (id.startsWith('hoc:')) return id.slice(4)
  if (id.startsWith('int:')) return id.slice(4)
  return null
}

function pickPathHandles(sPos, tPos) {
  const dx = tPos.x - sPos.x
  const dy = tPos.y - sPos.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['r', 'l'] : ['l', 'r']
  return dy >= 0 ? ['b', 't'] : ['t', 'b']
}

/* ─────────────────────  自訂節點  ───────────────────── */

function LvNode({ data }) {
  const { label, r2, mode, modeBadge, absorbedBadge, selected, onRename, onOpenPanel, onDelete } = data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  // 名稱由外部（改名/刪除）變動時，同步草稿（render 期間調整 state，避免 effect 級聯渲染）
  const [prevLabel, setPrevLabel] = useState(label)
  if (label !== prevLabel) {
    setPrevLabel(label)
    setDraft(label)
  }

  const commit = () => {
    setEditing(false)
    const name = (draft || '').trim()
    if (name && name !== label) onRename(label, name)
    else setDraft(label)
  }

  return (
    <div
      className="pls-lv-node"
      style={{
        position: 'relative',
        width: 130,
        height: 84,
        borderRadius: 44,
        background: CREAM[50],
        border: `2px solid ${selected ? AMBER[500] : COCOA[400]}`,
        boxShadow: selected ? `0 0 0 3px ${AMBER[50]}` : '0 1px 3px rgba(43,29,20,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 4,
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      onClick={(e) => { e.stopPropagation(); if (!editing) onOpenPanel(label) }}
    >
      {/* 四方位 handle：ConnectionMode.Loose 下每個圓點都同時可拉出與接入路徑 */}
      <Handle type="source" position={Position.Left} id="l" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="r" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Top} id="t" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(label); setEditing(false) } }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 108, textAlign: 'center', fontSize: 12, border: `1px solid ${AMBER[500]}`,
            borderRadius: 6, padding: '2px 4px', color: COCOA[700], background: '#fff', outline: 'none',
          }}
        />
      ) : (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COCOA[700], textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
          {label}
        </div>
      )}

      {mode === 'formative' && (
        <div style={{ marginTop: 1, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.4, color: AMBER[500] }}>
          {modeBadge}
        </div>
      )}

      {/* 被高階構念吸收的一階構念：結構路徑掛在 HOC 上，這裡標記以免誤以為畫布漏畫 */}
      {absorbedBadge && (
        <div style={{ marginTop: 1, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.3, color: COCOA[400] }}>
          {absorbedBadge}
        </div>
      )}

      {Number.isFinite(r2) && (
        <div style={{ marginTop: 2, fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: COCOA[500] }}>
          R² {fmtNum(r2, 3)}
        </div>
      )}

      {/* 刪除鈕 */}
      <button
        type="button"
        title="刪除"
        onClick={(e) => { e.stopPropagation(); onDelete(label) }}
        style={{
          position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: 9,
          border: `1px solid ${COCOA[200]}`, background: '#fff', color: COCOA[400],
          fontSize: 12, lineHeight: '15px', cursor: 'pointer', padding: 0,
        }}
      >×</button>
    </div>
  )
}

function IndicatorNode({ data }) {
  const { label, loading, isWeight } = data
  const tone = isWeight
    ? COCOA[500]
    : Number.isFinite(loading)
      ? (Math.abs(loading) >= 0.708 ? SIG.ok : Math.abs(loading) >= 0.4 ? SIG.warn : SIG.bad)
      : COCOA[400]
  return (
    <div
      style={{
        minWidth: 54, maxWidth: 96, padding: '4px 6px', borderRadius: 5,
        background: '#fff', border: `1px solid ${COCOA[200]}`,
        fontSize: 10, color: COCOA[500], textAlign: 'center', lineHeight: 1.15,
        boxShadow: '0 1px 2px rgba(43,29,20,0.08)',
      }}
    >
      {/* target 型（LV→指標 的接入端）；不開放手動連線 */}
      <Handle type="target" position={Position.Top} isConnectable={false} style={{ background: COCOA[200], border: 'none', width: 6, height: 6 }} />
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      {Number.isFinite(loading) && (
        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: tone, fontSize: 9.5, marginTop: 1 }}>
          {isWeight ? `w ${fmtNum(loading, 2)}` : fmtNum(loading, 2)}
        </div>
      )}
    </div>
  )
}

/** 高階構念（唯讀顯示；在表單編輯）：琥珀虛線橢圓 */
function HocNode({ data }) {
  const { label, r2, badge } = data
  return (
    <div
      style={{
        position: 'relative', width: 130, height: 84, borderRadius: 44,
        background: '#fff', border: `2px dashed ${AMBER[500]}`,
        boxShadow: '0 1px 3px rgba(43,29,20,0.12)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4,
      }}
    >
      <Handle type="source" position={Position.Left} id="l" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} id="r" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Top} id="t" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} isConnectable={false} />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COCOA[700], textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
        {label}
      </div>
      <div style={{ marginTop: 1, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.4, color: AMBER[500] }}>{badge}</div>
      {Number.isFinite(r2) && (
        <div style={{ marginTop: 2, fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: COCOA[500] }}>
          R² {fmtNum(r2, 3)}
        </div>
      )}
    </div>
  )
}

/** 交互項（唯讀顯示；在表單編輯）：cocoa 虛線圓角矩形 */
function IntNode({ data }) {
  const { label, badge } = data
  return (
    <div
      style={{
        position: 'relative', minWidth: 96, maxWidth: 150, padding: '6px 8px', borderRadius: 10,
        background: CREAM[50], border: `1.5px dashed ${COCOA[400]}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        boxShadow: '0 1px 2px rgba(43,29,20,0.08)',
      }}
    >
      <Handle type="source" position={Position.Left} id="l" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} id="r" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Top} id="t" style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} isConnectable={false} />
      <div style={{ fontSize: 11.5, fontWeight: 600, color: COCOA[700], textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
        {label}
      </div>
      <div style={{ marginTop: 1, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.4, color: COCOA[400] }}>{badge}</div>
    </div>
  )
}

const NODE_TYPES = { lvNode: LvNode, indicatorNode: IndicatorNode, hocNode: HocNode, intNode: IntNode }

/* ─────────────────────  指標掛載小面板  ───────────────────── */

function IndicatorPanel({ lvName, lvs, numericCols, labelMap, onToggle, onSetMode, onClose, t }) {
  const c = t.pls.config
  const lv = lvs.find((f) => f.name === lvName)
  if (!lv) return null
  const mode = lv.mode === 'formative' ? 'formative' : 'reflective'
  // 已被其他 LV 佔用的指標（不可勾）
  const usedByOthers = new Set()
  lvs.forEach((f) => { if (f.name !== lvName) f.indicators.forEach((i) => usedByOthers.add(i)) })
  const avail = numericCols.filter((col) => !usedByOthers.has(col))
  return (
    <div
      className="absolute top-3 right-3 z-20 w-56 bg-white border border-duo-cocoa-100 rounded-lg shadow-lg p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-duo-cocoa-800 truncate">{lvName}</div>
        <button type="button" onClick={onClose} className="text-duo-cocoa-300 hover:text-duo-cocoa-600 text-sm leading-none">×</button>
      </div>
      <div className="text-[11px] text-duo-cocoa-500 mb-1">{c.modeLabel}</div>
      <div className="inline-flex rounded-lg bg-duo-cream-50 border border-duo-cream-200 p-0.5 w-full mb-2">
        {[['reflective', c.modeReflective], ['formative', c.modeFormative]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSetMode(lvName, key)}
            className={[
              'flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition',
              mode === key
                ? 'bg-white text-duo-cocoa-800 shadow-sm'
                : 'text-duo-cocoa-500 hover:text-duo-cocoa-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-duo-cocoa-500 mb-1.5">{c.indicatorsLabel}（{lv.indicators.length}）</div>
      <ul className="space-y-1 max-h-56 overflow-y-auto">
        {avail.map((col) => {
          const checked = lv.indicators.includes(col)
          return (
            <li key={col}>
              <label className={['flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition', checked ? 'bg-duo-amber-50' : 'hover:bg-duo-cream-50'].join(' ')}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(lvName, col)} className="accent-duo-amber-500 w-3.5 h-3.5 cursor-pointer" />
                <span className="text-xs text-duo-cocoa-800 truncate">{labelMap[col] || col}</span>
              </label>
            </li>
          )
        })}
        {avail.length === 0 && (
          <li className="text-[11px] text-duo-cocoa-400 italic px-2 py-1">{c.noIndicatorsLeft}</li>
        )}
      </ul>
    </div>
  )
}

/* ─────────────────────  畫布主體  ───────────────────── */

function CanvasInner() {
  const { dataset, variables, lang, t } = useApp()
  const [state, update] = useAnalysisState()
  const flowWrapRef = useRef(null)
  const [openPanelLv, setOpenPanelLv] = useState(null)
  const [selectedLv, setSelectedLv] = useState(null)
  const [exporting, setExporting] = useState(false)
  const cc = t.pls.canvas

  const lvs = useMemo(() => state.lvs || [], [state.lvs])
  const paths = useMemo(() => state.paths || [], [state.paths])
  const positions = useMemo(() => state.positions || {}, [state.positions])
  // W4：交互項與高階構念（表單為 source of truth，畫布唯讀呈現）
  const ints = useMemo(() => validInteractions(state.ints), [state.ints])
  const hocs = useMemo(() => validHigherOrder(state.hocs), [state.hocs])
  const hocMethod = ['repeated', 'disjoint', 'two-stage'].includes(state.hocMethod)
    ? state.hocMethod : 'disjoint'
  const intMethod = ['two-stage', 'product-indicator', 'orthogonal'].includes(state.intMethod)
    ? state.intMethod : 'two-stage'
  // 被 HOC 吸收的一階構念：仍畫出來，但結構路徑掛在 HOC 上
  const absorbed = useMemo(() => new Set(hocs.flatMap((h) => h.components || [])), [hocs])

  // 拖動中的即時座標（drag stop 才寫回共用 state）：
  // 讓邊在拖動過程即時重選最近的 handle、指標小矩形跟著 LV 走
  const [livePositions, setLivePositions] = useState({})
  const effPositions = useMemo(() => ({ ...positions, ...livePositions }), [positions, livePositions])

  const labelMap = useMemo(
    () => dataset?.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {},
    [dataset, lang]
  )
  const numericCols = useMemo(
    () => Object.keys(variables).filter((col) => variables[col].type === 'continuous' || variables[col].type === 'ordinal'),
    [variables]
  )

  // 結果覆蓋層（僅在已執行分析時）
  const res = useMemo(
    () => (dataset && state.committed ? runPLSAnalysis(dataset.rows, state.committed) : null),
    [dataset, state.committed]
  )
  const overlay = useMemo(() => {
    const r2 = {}, loading = {}, weight = {}, path = {}
    const autoPaths = []
    if (res && !res.error && res.estimate) {
      const est = res.estimate
      for (const s of est.structural) r2[s.lv] = s.r2
      // W4 的最終估計在分數層（指標名為 *_score）；原始指標的 loading/weight 在 stage1。
      // 不切到 stage1 的話，含交互項或高階構念的模型在畫布上一律沒有指標數字。
      const outer = est.stage1 || est
      for (const q of outer.outerLoadings) loading[`${q.lv}｜${q.indicator}`] = q.loading
      for (const q of outer.outerWeights) weight[`${q.lv}｜${q.indicator}`] = q.weight
      const boot = res.bootstrap && !res.bootstrap.error ? res.bootstrap : null
      if (boot) for (const q of boot.paths) path[`${q.from}→${q.to}`] = { beta: q.original, p: q.p }
      else for (const q of est.pathCoefficients) path[`${q.from}→${q.to}`] = { beta: q.coef, p: null }
      // 引擎自動補的主效果路徑（two-stage 調節的階層完整性要求）
      for (const q of (est.meta?.autoAddedPaths || [])) autoPaths.push({ from: q.from, to: q.to })
    }
    return { r2, loading, weight, path, autoPaths }
  }, [res])

  /* ── 模型寫回（共用 state） ── */
  const setLvs = useCallback((next) => update({ lvs: next }), [update])
  const setPaths = useCallback((next) => update({ paths: next }), [update])
  const setPositions = useCallback((next) => update({ positions: next }), [update])

  const renameLv = useCallback((oldName, newName) => {
    if (lvs.some((f) => f.name === newName)) return // 重名不改
    setLvs(lvs.map((f) => (f.name === oldName ? { ...f, name: newName } : f)))
    setPaths(paths.map((p) => ({ from: p.from === oldName ? newName : p.from, to: p.to === oldName ? newName : p.to })))
    const np = { ...positions }
    if (np[oldName]) { np[newName] = np[oldName]; delete np[oldName] }
    setPositions(np)
    if (openPanelLv === oldName) setOpenPanelLv(newName)
  }, [lvs, paths, positions, setLvs, setPaths, setPositions, openPanelLv])

  const deleteLv = useCallback((name) => {
    setLvs(lvs.filter((f) => f.name !== name))
    setPaths(paths.filter((p) => p.from !== name && p.to !== name))
    const np = { ...positions }; delete np[name]; setPositions(np)
    if (openPanelLv === name) setOpenPanelLv(null)
  }, [lvs, paths, positions, setLvs, setPaths, setPositions, openPanelLv])

  const toggleIndicator = useCallback((lvName, col) => {
    setLvs(lvs.map((f) => {
      if (f.name !== lvName) return f
      const has = f.indicators.includes(col)
      return { ...f, indicators: has ? f.indicators.filter((x) => x !== col) : [...f.indicators, col] }
    }))
  }, [lvs, setLvs])

  const setLvMode = useCallback((lvName, mode) => {
    setLvs(lvs.map((f) => (f.name === lvName ? { ...f, mode } : f)))
  }, [lvs, setLvs])

  const addLv = useCallback(() => {
    const existing = new Set(lvs.map((f) => f.name))
    let n = lvs.length + 1
    let name = `LV${n}`
    while (existing.has(name)) { n += 1; name = `LV${n}` }
    setLvs([...lvs, { name, indicators: [], mode: 'reflective' }])
    setPositions({ ...positions, [name]: defaultPosFor(lvs.length) })
  }, [lvs, positions, setLvs, setPositions])

  const deletePath = useCallback((from, to) => {
    setPaths(paths.filter((p) => !(p.from === from && p.to === to)))
  }, [paths, setPaths])

  /* ── 建構 React Flow nodes / edges ── */
  const nodes = useMemo(() => {
    const out = []
    lvs.forEach((f, fi) => {
      const pos = effPositions[f.name] || defaultPosFor(fi)
      out.push({
        id: `lv:${f.name}`,
        type: 'lvNode',
        position: pos,
        data: {
          label: f.name,
          r2: overlay.r2[f.name],
          mode: f.mode === 'formative' ? 'formative' : 'reflective',
          modeBadge: cc.modeBadge,
          absorbedBadge: absorbed.has(f.name) ? cc.absorbedBadge : undefined,
          selected: selectedLv === f.name,
          onRename: renameLv,
          onOpenPanel: (name) => setOpenPanelLv((cur) => (cur === name ? null : name)),
          onDelete: deleteLv,
        },
      })
      // 指標圍繞 LV 下方水平鋪開（不可拖）
      const k = f.indicators.length
      const formative = f.mode === 'formative'
      f.indicators.forEach((ind, ii) => {
        const spread = 74
        const x = pos.x + 65 - ((k - 1) * spread) / 2 + ii * spread - 30
        out.push({
          id: `ind:${f.name}:${ind}`,
          type: 'indicatorNode',
          position: { x, y: pos.y + 130 },
          draggable: false,
          selectable: false,
          data: {
            label: labelMap[ind] || ind,
            loading: formative ? overlay.weight[`${f.name}｜${ind}`] : overlay.loading[`${f.name}｜${ind}`],
            isWeight: formative,
          },
        })
      })
    })
    // W4：高階構念（唯讀）
    hocs.forEach((h, hi) => {
      const name = h.name.trim()
      out.push({
        id: `hoc:${name}`,
        type: 'hocNode',
        position: effPositions[name] || defaultPosFor(lvs.length + hi),
        data: { label: name, r2: overlay.r2[name], badge: `HOC · ${cc.hocMethodBadge[hocMethod]}` },
      })
    })
    // W4：交互項（唯讀）
    ints.forEach((q, ii) => {
      const name = intName(q)
      out.push({
        id: `int:${name}`,
        type: 'intNode',
        position: effPositions[name] || defaultPosFor(lvs.length + hocs.length + ii),
        data: { label: name, badge: cc.intMethodBadge[intMethod] },
      })
    })
    return out
  }, [lvs, hocs, ints, absorbed, hocMethod, intMethod, effPositions, overlay, selectedLv, renameLv, deleteLv,
    labelMap, cc.modeBadge, cc.absorbedBadge, cc.hocMethodBadge, cc.intMethodBadge])

  const edges = useMemo(() => {
    const out = []
    // 構念名 → React Flow 節點 id（一般 LV / 高階構念 / 交互項三種前綴共用一張表）。
    // 舊版只認得 lv:，所以任何以交互項或高階構念為端點的路徑都被靜默丟棄。
    const idByName = new Map()
    const orderIndex = new Map()
    lvs.forEach((f, i) => { idByName.set(f.name, `lv:${f.name}`); orderIndex.set(f.name, i) })
    hocs.forEach((h, i) => {
      const nm = h.name.trim()
      idByName.set(nm, `hoc:${nm}`)
      orderIndex.set(nm, lvs.length + i)
    })
    ints.forEach((q, i) => {
      const nm = intName(q)
      idByName.set(nm, `int:${nm}`)
      orderIndex.set(nm, lvs.length + hocs.length + i)
    })
    const posFor = (name) => effPositions[name] || defaultPosFor(orderIndex.get(name) ?? 0)

    /** 結構路徑（含引擎自動補的主效果）共用的邊構造 */
    const pushStructural = (from, to, auto) => {
      if (!from || !to) return
      if (!idByName.has(from) || !idByName.has(to)) return
      const [sh, th] = pickPathHandles(posFor(from), posFor(to))
      const info = overlay.path[`${from}→${to}`]
      let label
      let color = COCOA[400]
      if (info && Number.isFinite(info.beta)) {
        const tone = toneForP(info.p)
        color = tone === 'ok' ? SIG.ok : tone === 'bad' ? SIG.bad : COCOA[500]
        label = `${fmtNum(info.beta, 3)}${fmtSig(info.p)}`
      }
      if (auto) label = label ? `${label} ${cc.autoPathMark}` : cc.autoPathMark
      out.push({
        id: `path:${from}->${to}`,
        source: idByName.get(from),
        target: idByName.get(to),
        sourceHandle: sh,
        targetHandle: th,
        type: 'default',
        animated: false,
        label,
        labelStyle: { fill: color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
        labelBgStyle: { fill: CREAM[50], fillOpacity: 0.9 },
        labelBgPadding: [3, 2],
        labelBgBorderRadius: 4,
        style: { stroke: color, strokeWidth: 1.75, ...(auto ? { strokeDasharray: '5 3' } : {}) },
        markerEnd: { type: 'arrowclosed', color, width: 16, height: 16 },
        // 自動補的路徑不在表單裡，點擊刪除會刪不到東西 → 不掛 kind:'path'
        data: auto ? { kind: 'autoPath' } : { kind: 'path', from, to },
      })
    }

    // 結構路徑：箭頭 + β/星號；依相對位置就近選 handle（近似直線，不繞遠路）
    const declared = new Set()
    paths.forEach((p) => {
      if (!p.from || !p.to) return
      declared.add(`${p.from}→${p.to}`)
      pushStructural(p.from, p.to, false)
    })
    // 引擎自動補的主效果路徑（two-stage 調節的階層完整性；meta.autoAddedPaths）
    overlay.autoPaths.forEach((p) => {
      if (declared.has(`${p.from}→${p.to}`)) return
      pushStructural(p.from, p.to, true)
    })
    // 高階構念 → 成分構念（虛線）：反映型箭頭朝成分、形成型朝 HOC
    hocs.forEach((h) => {
      const nm = h.name.trim()
      const formative = h.mode === 'formative'
      ;(h.components || []).forEach((comp) => {
        if (!idByName.has(comp)) return
        const [sh, th] = pickPathHandles(posFor(nm), posFor(comp))
        out.push({
          id: `hoc:${nm}->${comp}`,
          source: formative ? idByName.get(comp) : idByName.get(nm),
          target: formative ? idByName.get(nm) : idByName.get(comp),
          sourceHandle: formative ? th : sh,
          targetHandle: formative ? sh : th,
          type: 'default',
          selectable: false,
          style: { stroke: AMBER[500], strokeWidth: 1.25, strokeDasharray: '4 3' },
          markerEnd: { type: 'arrowclosed', color: AMBER[500], width: 12, height: 12 },
        })
      })
    })
    // 因子 → 交互項（虛線、無箭頭）：表示交互項由這兩（三）個構念構成
    ints.forEach((q) => {
      const nm = intName(q)
      ;[q.a, q.b, q.c].filter(Boolean).forEach((factor) => {
        if (!idByName.has(factor)) return
        const [sh, th] = pickPathHandles(posFor(factor), posFor(nm))
        out.push({
          id: `int:${factor}->${nm}`,
          source: idByName.get(factor),
          target: idByName.get(nm),
          sourceHandle: sh,
          targetHandle: th,
          type: 'default',
          selectable: false,
          style: { stroke: COCOA[400], strokeWidth: 1, strokeDasharray: '3 3' },
        })
      })
    })
    // 指標連線：LV → 指標，跑完顯示 loading
    lvs.forEach((f) => {
      const formative = f.mode === 'formative'
      f.indicators.forEach((ind) => {
        const l = formative ? overlay.weight[`${f.name}｜${ind}`] : overlay.loading[`${f.name}｜${ind}`]
        out.push({
          id: `load:${f.name}:${ind}`,
          source: `lv:${f.name}`,
          target: `ind:${f.name}:${ind}`,
          sourceHandle: 'b',
          type: 'straight',
          selectable: false,
          label: Number.isFinite(l) ? (formative ? `w ${fmtNum(l, 2)}` : fmtNum(l, 2)) : undefined,
          labelStyle: { fill: COCOA[500], fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
          labelBgPadding: [2, 1],
          style: { stroke: COCOA[200], strokeWidth: 1 },
        })
      })
    })
    return out
  }, [paths, lvs, hocs, ints, overlay, effPositions, cc.autoPathMark])

  /* ── 互動 ── */
  const onNodeDrag = useCallback((_e, node) => {
    const name = constructNameOf(node.id)
    if (!name) return
    setLivePositions((prev) => ({ ...prev, [name]: { x: node.position.x, y: node.position.y } }))
  }, [])

  const onNodeDragStop = useCallback((_e, node) => {
    const name = constructNameOf(node.id)
    if (!name) return
    setLivePositions((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setPositions({ ...positions, [name]: { x: Math.round(node.position.x), y: Math.round(node.position.y) } })
  }, [positions, setPositions])

  const onConnect = useCallback((conn) => {
    if (!conn.source?.startsWith('lv:') || !conn.target?.startsWith('lv:')) return
    const from = conn.source.slice(3)
    const to = conn.target.slice(3)
    if (from === to) return
    if (paths.some((p) => p.from === from && p.to === to)) return
    // 直接環（反向已存在）先擋，其餘由引擎 validatePLSModel 的無環檢查把關
    if (paths.some((p) => p.from === to && p.to === from)) return
    setPaths([...paths, { from, to }])
  }, [paths, setPaths])

  const onEdgeClick = useCallback((e, edge) => {
    if (edge?.data?.kind === 'path') {
      e.stopPropagation()
      deletePath(edge.data.from, edge.data.to)
    }
  }, [deletePath])

  const onNodeClick = useCallback((_e, node) => {
    if (node.id.startsWith('lv:')) setSelectedLv(node.id.slice(3))
  }, [])

  const onPaneClick = useCallback(() => { setOpenPanelLv(null); setSelectedLv(null) }, [])

  /* ── 匯出 PNG（白底、論文用） ── */
  const handleExport = useCallback(async () => {
    const target = flowWrapRef.current?.querySelector('.react-flow')
    if (!target) return
    setExporting(true)
    try {
      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        ignoreElements: (node) =>
          node.classList?.contains('react-flow__controls') ||
          node.classList?.contains('react-flow__background') ||
          node.classList?.contains('pls-export-ignore'),
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'pls-model.png'
      a.click()
    } finally {
      setExporting(false)
    }
  }, [])

  /* ── 空狀態 ── */
  if (lvs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-sm text-duo-cocoa-400">
        {cc.empty}
        <button type="button" onClick={addLv} className="mt-3 px-3 py-1.5 text-xs font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition">
          + {t.pls.config.addLv}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 工具列 */}
      <div className="flex items-center justify-between gap-2 mb-2 pls-export-ignore">
        <div className="text-[11px] text-duo-cocoa-400 leading-snug">
          {cc.hint}
          {(ints.length > 0 || hocs.length > 0) && <> {cc.w4Hint}</>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={addLv} className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition">
            + {t.pls.config.addLv}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            title={cc.exportHint}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-white border border-duo-cocoa-100 text-duo-cocoa-600 hover:border-duo-amber-400 hover:text-duo-amber-700 transition disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M4 6l4 4 4-4M3 13h10" />
            </svg>
            {exporting ? cc.exporting : cc.exportBtn}
          </button>
        </div>
      </div>

      {/* 畫布 */}
      <div
        ref={flowWrapRef}
        className="relative rounded-lg border border-duo-cocoa-100 overflow-hidden"
        style={{ height: 520, background: CREAM[100] }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          connectionMode={ConnectionMode.Loose}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.3}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'default' }}
        >
          <Background color={CREAM[200]} gap={20} size={1} />
          <Controls showInteractive={false} className="pls-export-ignore" />
        </ReactFlow>

        {openPanelLv && (
          <IndicatorPanel
            lvName={openPanelLv}
            lvs={lvs}
            numericCols={numericCols}
            labelMap={labelMap}
            onToggle={toggleIndicator}
            onSetMode={setLvMode}
            onClose={() => setOpenPanelLv(null)}
            t={t}
          />
        )}
      </div>

      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">
        {cc.legend}
        {(ints.length > 0 || hocs.length > 0) && <> {cc.legendW4}</>}
      </p>
    </div>
  )
}

function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}

export default Canvas
