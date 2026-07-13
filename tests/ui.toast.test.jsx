// @vitest-environment jsdom
/**
 * Toast 測試（R2：取代 alert()）
 *
 * 重點在無障礙語意與非阻塞：
 *   - tone='bad' 用 role="alert"（assertive），其餘用 role="status"（polite）
 *   - toast 不搶焦點（原生 alert() 會，且會凍住整個分頁）
 *   - 可手動關閉、逾時自動消失
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToastProvider from '../src/components/Toast'
import { useToast } from '../src/context/toastContext'

afterEach(cleanup)

function Trigger({ toast }) {
  const { showToast } = useToast()
  return <button type="button" onClick={() => showToast(toast)}>觸發</button>
}

function setup(toast) {
  return render(
    <ToastProvider closeLabel="關閉">
      <Trigger toast={toast} />
    </ToastProvider>
  )
}

describe('Toast', () => {
  it('tone=bad 用 role="alert"（螢幕報讀立即打斷）', async () => {
    const user = userEvent.setup()
    setup({ tone: 'bad', title: '匯出失敗', message: 'canvas is empty' })
    await user.click(screen.getByRole('button', { name: '觸發' }))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('匯出失敗')
    expect(alert).toHaveTextContent('canvas is empty')
  })

  it('tone=ok 用 role="status"（polite，不打斷）', async () => {
    const user = userEvent.setup()
    setup({ tone: 'ok', title: '已複製' })
    await user.click(screen.getByRole('button', { name: '觸發' }))
    expect(screen.getByRole('status')).toHaveTextContent('已複製')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('不搶焦點——觸發後焦點仍留在原按鈕（原生 alert() 做不到）', async () => {
    const user = userEvent.setup()
    setup({ tone: 'bad', title: '匯出失敗' })
    const btn = screen.getByRole('button', { name: '觸發' })
    await user.click(btn)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(document.activeElement).toBe(btn)
  })

  it('可手動關閉', async () => {
    const user = userEvent.setup()
    setup({ tone: 'bad', title: '匯出失敗' })
    await user.click(screen.getByRole('button', { name: '觸發' }))
    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('逾時後自動消失', () => {
    // 用 fireEvent 而非 user-event：user-event 內部有自己的 delay/timer 排程，
    // 與 vi.useFakeTimers() 併用會互相等待而卡死。
    vi.useFakeTimers()
    try {
      setup({ tone: 'bad', title: '匯出失敗', duration: 3000 })
      fireEvent.click(screen.getByRole('button', { name: '觸發' }))
      expect(screen.getByRole('alert')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(3100) })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
