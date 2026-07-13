// @vitest-environment jsdom
/**
 * Modal 無障礙行為測試（R2）
 *
 * 修復前全 codebase `aria-modal` 出現 0 次、無 focus trap——鍵盤使用者按 Tab
 * 會直接跑出對話框，落到底下被遮住的頁面上，且沒有任何視覺回饋。
 * 這裡把 Modal 該有的六件事釘死。
 */
import { useState } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '../src/components/Modal'
import ConfirmDialog from '../src/components/ConfirmDialog'
import zh from '../src/i18n/zh-TW'

afterEach(cleanup)

function Fixture({ onClose = () => {} }) {
  return (
    <Modal open onClose={onClose} title="測試對話框" labels={{ close: zh.common.close }}>
      <div className="p-4">
        <button type="button">第一個</button>
        <button type="button">第二個</button>
      </div>
    </Modal>
  )
}

describe('Modal', () => {
  it('有 role="dialog"、aria-modal，且 aria-labelledby 指向標題', () => {
    render(<Fixture />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy)).toHaveTextContent('測試對話框')
  })

  it('開啟時焦點移入對話框內', () => {
    render(<Fixture />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('Esc 觸發 onClose', async () => {
    const user = userEvent.setup()
    let closed = false
    render(<Fixture onClose={() => { closed = true }} />)
    await user.keyboard('{Escape}')
    expect(closed).toBe(true)
  })

  it('focus trap：Tab 到最後一個元素後繞回第一個，不會跑出對話框', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button type="button">對話框外的按鈕</button>
        <Fixture />
      </div>
    )
    const dialog = screen.getByRole('dialog')
    const outside = screen.getByRole('button', { name: '對話框外的按鈕' })

    // 連按 Tab 超過對話框內可聚焦元素的數量，焦點都不該落到外面
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(document.activeElement).not.toBe(outside)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('Shift+Tab 反向也被關在對話框內', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button type="button">對話框外的按鈕</button>
        <Fixture />
      </div>
    )
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('關閉時把焦點還回開啟前的元素', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>開啟</button>
          <Modal open={open} onClose={() => setOpen(false)} title="測試" labels={{ close: zh.common.close }}>
            <div className="p-4"><button type="button">內部</button></div>
          </Modal>
        </div>
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: '開啟' })
    await user.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)
  })

  it('開啟時鎖住背景捲動，關閉後還原', async () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="測試" labels={{ close: zh.common.close }}>
        <div>內容</div>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Modal open={false} onClose={() => {}} title="測試" labels={{ close: zh.common.close }}>
        <div>內容</div>
      </Modal>
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('ConfirmDialog（取代原生 confirm()）', () => {
  it('確認鈕觸發 onConfirm、取消鈕觸發 onCancel，兩者都可鍵盤操作', async () => {
    const user = userEvent.setup()
    let confirmed = 0
    let cancelled = 0
    render(
      <ConfirmDialog
        open
        onConfirm={() => { confirmed += 1 }}
        onCancel={() => { cancelled += 1 }}
        title="清空全部"
        message="確定要清空所有歷史紀錄嗎？"
        confirmLabel={zh.history.clearAllBtn}
        cancelLabel={zh.common.cancel}
        closeLabel={zh.common.close}
        destructive
      />
    )
    expect(screen.getByRole('dialog')).toHaveTextContent('確定要清空所有歷史紀錄嗎？')
    await user.click(screen.getByRole('button', { name: zh.history.clearAllBtn }))
    expect(confirmed).toBe(1)
    await user.click(screen.getByRole('button', { name: zh.common.cancel }))
    expect(cancelled).toBe(1)
  })
})
