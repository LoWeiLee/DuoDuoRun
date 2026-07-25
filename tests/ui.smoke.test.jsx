// @vitest-environment jsdom
/**
 * 全模組 UI 煙霧測試（R5）
 *
 * 紅隊審查時的第 2 號發現：**零 UI 測試**——測試全部在統計層，Config / Result /
 * Narrative / Notes 的條件分支（error code 顯示、i18n 切換、mode 切換）沒有任何
 * 自動化防護。統計核心對到小數點後 10 位，但只要 Result.jsx 裡一個 `result.foo.bar`
 * 的 foo 是 undefined，使用者看到的就是白畫面。
 *
 * 本測試對每個「有示範設定」的分析走一遍：
 *   載入示範資料 → 設定分析參數 → render Result / Narrative / Notes
 *   → 斷言 (a) 沒有拋錯、(b) 有實際內容、(c) 沒有落進 ErrorBoundary 的錯誤卡片
 *
 * 並額外驗證：中英文切換、教學／報告兩種 mode 都不會炸。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { useEffect } from 'react'
import AppProvider from '../src/context/AppProvider'
import { useApp } from '../src/context/AppContext'
import { getAnalysisModule } from '../src/analyses/registry'
import { ANALYSIS_DEMOS } from '../src/config/demos'
import ErrorBoundary from '../src/components/ErrorBoundary'
import zh from '../src/i18n/zh-TW'

// PLS-SEM 在瀏覽器走 Web Worker；jsdom 沒有 Worker 實作，引擎會走同步 fallback，
// 但 reactflow 畫布需要 ResizeObserver → 另行補 stub。
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let errSpy
beforeEach(() => {
  globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  cleanup()
})

/** 依 demo 設定好 context，再渲染指定的模組面板 */
function Harness({ id, demo, part, lang, mode }) {
  const { setActiveDataset, setActiveAnalysis, updateAnalysisState, setLang, setMode, t, dataset, activeAnalysis } = useApp()

  useEffect(() => {
    setLang(lang)
    setMode(mode)
    setActiveDataset(demo.dataset)
    setActiveAnalysis(id)
    updateAnalysisState(id, demo.settings)
  }, [id, demo, lang, mode, setActiveDataset, setActiveAnalysis, updateAnalysisState, setLang, setMode])

  const mod = getAnalysisModule(id)
  const Component = mod?.[part]
  if (!dataset || activeAnalysis !== id || !Component) return <div data-testid="pending" />
  return (
    <div data-testid="panel">
      <ErrorBoundary t={t} resetKey={id}>
        <Component />
      </ErrorBoundary>
    </div>
  )
}

function renderPanel(id, demo, part, lang = 'zh-TW', mode = 'teaching') {
  act(() => {
    render(<AppProvider><Harness id={id} demo={demo} part={part} lang={lang} mode={mode} /></AppProvider>)
  })
  return screen.queryByTestId('panel')
}

const IDS = Object.keys(ANALYSIS_DEMOS)

describe('全模組 UI 煙霧測試', () => {
  it(`涵蓋所有有示範設定的分析（共 ${IDS.length} 個）`, () => {
    expect(IDS.length).toBeGreaterThanOrEqual(25)
  })

  describe.each(IDS)('%s', (id) => {
    const demo = ANALYSIS_DEMOS[id]

    it('Result 渲染出實際內容，且未落進錯誤卡片', () => {
      const panel = renderPanel(id, demo, 'Result')
      expect(panel, `${id}: Result 面板沒有掛上`).toBeTruthy()
      // 沒有掉進 ErrorBoundary
      expect(
        screen.queryByText(zh.errors.boundaryTitle),
        `${id}: Result 在 render 期炸掉，落進 ErrorBoundary`
      ).not.toBeInTheDocument()
      // 有實際內容（非空殼）
      expect(panel.textContent.trim().length, `${id}: Result 渲染結果是空的`).toBeGreaterThan(20)
    })

    it('Narrative（報告模式）不會炸', () => {
      const panel = renderPanel(id, demo, 'Narrative', 'zh-TW', 'report')
      expect(panel).toBeTruthy()
      expect(screen.queryByText(zh.errors.boundaryTitle), `${id}: Narrative 炸了`).not.toBeInTheDocument()
    })

    it('Notes（教學模式）不會炸', () => {
      const panel = renderPanel(id, demo, 'Notes')
      expect(panel).toBeTruthy()
      expect(screen.queryByText(zh.errors.boundaryTitle), `${id}: Notes 炸了`).not.toBeInTheDocument()
    })

    it('Config 不會炸', () => {
      const panel = renderPanel(id, demo, 'Config')
      expect(panel).toBeTruthy()
      expect(screen.queryByText(zh.errors.boundaryTitle), `${id}: Config 炸了`).not.toBeInTheDocument()
    })

    it('切換到英文介面不會炸', () => {
      const panel = renderPanel(id, demo, 'Result', 'en')
      expect(panel).toBeTruthy()
      // 英文介面下錯誤卡片的標題是英文版
      expect(screen.queryByRole('alert'), `${id}: 英文介面下 Result 炸了`).not.toBeInTheDocument()
    })
  })
})

/**
 * W4 畫布顯示層（2026-07-25）
 *
 * 為什麼要另外寫：W4（交互項／高階構念）與 W5／W6 互斥——MICOM・PLSpredict・IPMA・
 * CTA・copula・FIMIX・PLS-POS 全部 rejectW4——所以 `ANALYSIS_DEMOS['pls-sem']`
 * 只能二選一。示範設定選了 W5／W6（覆蓋 5 個結果區塊），W4 的畫布就沒有任何煙霧涵蓋，
 * 而畫布正是 2026-07-25 之前完全不畫交互項／高階構念的地方（`Canvas.jsx` 根本沒讀
 * state.ints / state.hocs，路徑端點對不上 lv: 前綴就被靜默丟棄）。
 *
 * 這裡用合成的 state 直接把 Result 切到畫布模式（plsView: 'canvas'）render 一遍。
 */
const PLS_W4_BASE = {
  bootstrapN: 500,
  plsView: 'canvas',
  configErrors: [],
}
const W4_MOD_STATE = {
  ...PLS_W4_BASE,
  lvs: [
    { name: '滿意', indicators: ['q1', 'q2', 'q3'], mode: 'reflective' },
    { name: '薪資', indicators: ['q4'], mode: 'reflective' },
    { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
  ],
  paths: [{ from: '滿意', to: '績效' }, { from: '滿意×薪資', to: '績效' }],
  ints: [{ a: '滿意', b: '薪資' }],
  intMethod: 'two-stage',
  committed: {
    model: {
      schemaVersion: 1,
      latentVariables: [
        { name: '滿意', indicators: ['q1', 'q2', 'q3'], mode: 'reflective' },
        { name: '薪資', indicators: ['q4'], mode: 'reflective' },
        { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
      ],
      interactions: [{ name: '滿意×薪資', factors: ['滿意', '薪資'], method: 'two-stage' }],
      paths: [{ from: '滿意', to: '績效' }, { from: '滿意×薪資', to: '績效' }],
    },
    bootstrapN: 500,
  },
}
const W4_HOC_STATE = {
  ...PLS_W4_BASE,
  lvs: [
    { name: '環境', indicators: ['q1', 'q2'], mode: 'reflective' },
    { name: '待遇', indicators: ['q3', 'q4'], mode: 'reflective' },
    { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
  ],
  paths: [{ from: '總體滿意', to: '績效' }],
  hocs: [{ name: '總體滿意', components: ['環境', '待遇'], mode: 'reflective' }],
  hocMethod: 'disjoint',
  committed: {
    model: {
      schemaVersion: 1,
      latentVariables: [
        { name: '環境', indicators: ['q1', 'q2'], mode: 'reflective' },
        { name: '待遇', indicators: ['q3', 'q4'], mode: 'reflective' },
        { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
      ],
      higherOrder: [{ name: '總體滿意', components: ['環境', '待遇'], mode: 'reflective', method: 'disjoint' }],
      paths: [{ from: '總體滿意', to: '績效' }],
    },
    bootstrapN: 500,
  },
}

// 調節式中介：W4 專屬（與 W5／W6 互斥），示範設定涵蓋不到 → 用合成 state 補測
const W4_MODMED_STATE = {
  bootstrapN: 300,
  plsView: 'form',
  configErrors: [],
  lvs: [
    { name: '滿意', indicators: ['q1', 'q2', 'q3'], mode: 'reflective' },
    { name: '投入', indicators: ['q4'], mode: 'reflective' },
    { name: '年資', indicators: ['tenure_years'], mode: 'reflective' },
    { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
  ],
  paths: [
    { from: '滿意', to: '投入' }, { from: '滿意×年資', to: '投入' },
    { from: '投入', to: '績效' }, { from: '滿意', to: '績效' },
  ],
  ints: [{ a: '滿意', b: '年資' }],
  intMethod: 'two-stage',
  committed: {
    model: {
      schemaVersion: 1,
      latentVariables: [
        { name: '滿意', indicators: ['q1', 'q2', 'q3'], mode: 'reflective' },
        { name: '投入', indicators: ['q4'], mode: 'reflective' },
        { name: '年資', indicators: ['tenure_years'], mode: 'reflective' },
        { name: '績效', indicators: ['performance_score'], mode: 'reflective' },
      ],
      interactions: [{ name: '滿意×年資', factors: ['滿意', '年資'], method: 'two-stage' }],
      paths: [
        { from: '滿意', to: '投入' }, { from: '滿意×年資', to: '投入' },
        { from: '投入', to: '績效' }, { from: '滿意', to: '績效' },
      ],
    },
    bootstrapN: 300,
  },
}

describe('PLS 結果：調節式中介（條件間接效果）', () => {
  it('條件間接效果區塊 render 不炸，且命名保留說明有出現', () => {
    const panel = renderPanel('pls-sem', { dataset: 'employee', settings: W4_MODMED_STATE }, 'Result')
    expect(panel).toBeTruthy()
    expect(screen.queryByText(zh.errors.boundaryTitle), '條件間接效果區塊炸了').not.toBeInTheDocument()
    expect(panel.textContent).toContain(zh.pls.result.modmedTitle)
    // ★ 這條不是形式：命名保留（Hayes 2015 原文未取得）必須出現在使用者看得到的地方
    expect(panel.textContent).toContain('index of moderated mediation')
  })

  it('Narrative（報告模式）含條件間接效果句，且帶標籤保留說明', () => {
    const panel = renderPanel(
      'pls-sem', { dataset: 'employee', settings: W4_MODMED_STATE }, 'Narrative', 'zh-TW', 'report'
    )
    expect(panel).toBeTruthy()
    expect(screen.queryByText(zh.errors.boundaryTitle)).not.toBeInTheDocument()
    expect(panel.textContent).toContain('條件間接效果')
    expect(panel.textContent).toContain('Hayes')
  })
})

describe('PLS 畫布：W4 交互項與高階構念的顯示層', () => {
  it('交互項模型：畫布 render 不炸，且交互項構念名出現在畫布上', () => {
    const panel = renderPanel('pls-sem', { dataset: 'employee', settings: W4_MOD_STATE }, 'Result')
    expect(panel).toBeTruthy()
    expect(screen.queryByText(zh.errors.boundaryTitle), '畫布在交互項模型下炸了').not.toBeInTheDocument()
    // 修好之前：Canvas 沒讀 state.ints，這個節點不存在
    expect(panel.textContent).toContain('滿意×薪資')
  })

  it('高階構念模型：畫布 render 不炸，HOC 與其成分標記都出現', () => {
    const panel = renderPanel('pls-sem', { dataset: 'employee', settings: W4_HOC_STATE }, 'Result')
    expect(panel).toBeTruthy()
    expect(screen.queryByText(zh.errors.boundaryTitle), '畫布在高階構念模型下炸了').not.toBeInTheDocument()
    expect(panel.textContent).toContain('總體滿意')
    // 被 HOC 吸收的一階構念會標記，避免使用者以為畫布漏畫結構路徑
    expect(panel.textContent).toContain(zh.pls.canvas.absorbedBadge)
  })

  it('表單模式（非畫布）在同一份 W4 state 下也不炸', () => {
    const panel = renderPanel(
      'pls-sem',
      { dataset: 'employee', settings: { ...W4_MOD_STATE, plsView: 'form' } },
      'Result'
    )
    expect(panel).toBeTruthy()
    expect(screen.queryByText(zh.errors.boundaryTitle)).not.toBeInTheDocument()
  })
})

/**
 * 沒有示範設定的模組，煙霧測試涵蓋不到——twoWayAnova 就是漏網之魚：
 * 內建的四個資料集裡沒有任何一個同時有兩個類別因子 ＋ 一個連續依變項，
 * 所以它沒有 demo，也就沒被上面的 describe.each 掃到。
 * 它與 ANCOVA 有**完全相同**的 `error` 欄位撞名（2026-07-13 紅隊 R5 修復），
 * 用合成資料補一條專屬煙霧測試。
 */
describe('twoWayAnova（無 demo，用合成的兩因子資料補測）', () => {
  it('計算成功時 result.error 必須是 undefined（不可是誤差項物件）', async () => {
    const { runTwoWayAnova } = await import('../src/analyses/twoWayAnova/compute')
    const rows = []
    let seed = 1
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
    for (const a of ['A1', 'A2']) {
      for (const b of ['B1', 'B2']) {
        for (let i = 0; i < 10; i++) {
          rows.push({ fa: a, fb: b, y: 10 + (a === 'A2' ? 3 : 0) + (b === 'B2' ? 2 : 0) + rnd() * 4 })
        }
      }
    }
    const r = runTwoWayAnova(rows, { depVar: 'y', factorA: 'fa', factorB: 'fb' })
    // 修復前這裡會是 { ss, df, ms } 物件 → Result.jsx 走進錯誤分支 → 渲染物件 → 白畫面
    expect(r.error, `result.error 應為 undefined，實際是 ${JSON.stringify(r.error)}`).toBeUndefined()
    expect(r.errorTerm).toMatchObject({ ss: expect.any(Number), df: expect.any(Number), ms: expect.any(Number) })
    expect(r.effectA.F).toBeGreaterThan(0)
  })
})

/**
 * 結構防線：統計核心的 `error` 欄位一律保留給「字串錯誤碼」。
 * 任何統計量（誤差項、殘差項）都不得叫 error——那會與 analyses 包裝層
 * `if (result.error)` 的失敗判斷撞名，讓成功分支永遠到不了。
 */
describe('結構防線：error 欄位只能是字串錯誤碼', () => {
  it('所有 lib/stats 模組都沒有 `error: { ... }` 形式的物件欄位', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/stats')
    const bad = []
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.js')) continue
      const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, '')
      src.split('\n').forEach((line, i) => {
        if (/^\s*error:\s*\{/.test(line)) bad.push(`${f}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(bad, `這些地方把 error 當成物件欄位（應改名為 errorTerm）：\n  ${bad.join('\n  ')}`).toEqual([])
  })
})
