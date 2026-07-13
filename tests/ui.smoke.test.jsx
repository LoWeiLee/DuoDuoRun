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
