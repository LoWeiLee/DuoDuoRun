// @vitest-environment jsdom
/**
 * ErrorBoundary 行為測試（R2 防白畫面）
 *
 * 核心保證：單一分析模組在 render 期炸掉時，
 *   1. 不把整棵樹卸載（同層的其他內容仍在畫面上）
 *   2. 顯示可讀的中文錯誤卡片（role="alert"）
 *   3. 「重新嘗試」可清除錯誤狀態
 *   4. resetKey 變動（＝切換分析）時自動復原，不會卡在錯誤卡片
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../src/components/ErrorBoundary'
import zh from '../src/i18n/zh-TW'

function Boom({ explode }) {
  if (explode) throw new Error('炸了：cannot read properties of undefined')
  return <div>分析結果正常</div>
}

let errSpy
beforeEach(() => {
  // ErrorBoundary 會 console.error；測試時靜音以免污染輸出
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  cleanup()
})

describe('ErrorBoundary', () => {
  it('子元件正常時原樣渲染', () => {
    render(
      <ErrorBoundary t={zh}><Boom explode={false} /></ErrorBoundary>
    )
    expect(screen.getByText('分析結果正常')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('子元件炸掉時顯示錯誤卡片，不讓畫面變空白', () => {
    render(
      <div>
        <div>同層的其他內容</div>
        <ErrorBoundary t={zh} where={zh.panels.resultTitle}><Boom explode /></ErrorBoundary>
      </div>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(zh.errors.boundaryTitle)
    // 關鍵：同層內容沒被一起卸載
    expect(screen.getByText('同層的其他內容')).toBeInTheDocument()
    // 發生位置有標示
    expect(alert).toHaveTextContent(zh.panels.resultTitle)
  })

  it('技術細節預設收起，可展開看到原始錯誤訊息', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary t={zh}><Boom explode /></ErrorBoundary>)
    expect(screen.queryByText(/cannot read properties of undefined/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: zh.errors.boundaryShowDetails }))
    expect(screen.getByText(/cannot read properties of undefined/)).toBeInTheDocument()
  })

  it('「重新嘗試」清除錯誤狀態（子元件不再炸則恢復正常）', async () => {
    const user = userEvent.setup()
    let explode = true
    function Toggle() { return <Boom explode={explode} /> }
    render(<ErrorBoundary t={zh}><Toggle /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    explode = false
    await user.click(screen.getByRole('button', { name: zh.errors.boundaryRetry }))
    expect(screen.getByText('分析結果正常')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('resetKey 變動（切換分析）時自動復原，不卡在錯誤卡片', () => {
    const { rerender } = render(
      <ErrorBoundary t={zh} resetKey="ttest"><Boom explode /></ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    // 切到另一個分析：即使新子元件正常，若未重置狀態就會繼續顯示錯誤卡片
    rerender(
      <ErrorBoundary t={zh} resetKey="anova"><Boom explode={false} /></ErrorBoundary>
    )
    expect(screen.getByText('分析結果正常')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
