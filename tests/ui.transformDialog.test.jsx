// @vitest-environment jsdom
/**
 * TransformDialog 行為測試（R4 重構的回歸防線）
 *
 * R4 把它從「永遠掛載 ＋ 兩個 useEffect 重設 state」改成「開才掛載 ＋ render 期
 * 調整 state」。以下四條把重構前的行為釘死，確保只是換寫法、不是換行為：
 *   1. 開啟時 source 預設第一個候選、type 預設 zscore
 *   2. name 自動跟著 source/type 連動
 *   3. 使用者手動改 name 後，輸入被保留
 *   4. 使用者改過 name 之後再換 source/type，name 重新回到自動建議值
 *   5. 關閉再開啟 → state 全部回到初值（原本靠 useEffect，現在靠重新掛載）
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import AppProvider from '../src/context/AppProvider'
import { useApp } from '../src/context/AppContext'
import TransformDialog from '../src/components/TransformDialog'

afterEach(cleanup)

/** 載入示範資料集後開啟轉換對話框 */
function Harness() {
  const { setActiveDataset, dataset } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setActiveDataset('employee')}>載入資料</button>
      <button type="button" onClick={() => setOpen(true)}>開啟</button>
      <span data-testid="ds">{dataset ? 'ready' : 'none'}</span>
      <TransformDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function setup() {
  render(<AppProvider><Harness /></AppProvider>)
  fireEvent.click(screen.getByRole('button', { name: '載入資料' }))
  expect(screen.getByTestId('ds')).toHaveTextContent('ready')
  fireEvent.click(screen.getByRole('button', { name: '開啟' }))
}

/** 名稱輸入框 = 對話框內唯一的 text input */
const nameInput = () =>
  screen.getByRole('dialog').querySelector('input[type="text"]')
const sourceSelect = () => screen.getByRole('dialog').querySelectorAll('select')[0]
const typeSelect = () => screen.getByRole('dialog').querySelectorAll('select')[1]

describe('TransformDialog（R4 重構後）', () => {
  it('關閉時完全不掛載（不留 dialog 在 DOM）', () => {
    render(<AppProvider><Harness /></AppProvider>)
    fireEvent.click(screen.getByRole('button', { name: '載入資料' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('開啟時 source 預設第一個候選、type 預設 zscore、name 為自動建議值', () => {
    setup()
    const src = sourceSelect().value
    expect(src).toBeTruthy()
    expect(typeSelect().value).toBe('zscore')
    // suggestName 的慣例是前綴：z_<source> / log_<source> / rev_<source>
    expect(nameInput().value).toBe(`z_${src}`)
  })

  it('name 隨 type 變動自動更新', () => {
    setup()
    const src = sourceSelect().value
    fireEvent.change(typeSelect(), { target: { value: 'log' } })
    expect(nameInput().value).not.toBe(`z_${src}`)
    expect(nameInput().value).toContain(src)
  })

  it('使用者手動改 name 後，輸入被保留（不被自動建議覆蓋）', () => {
    setup()
    fireEvent.change(nameInput(), { target: { value: 'my_custom_name' } })
    expect(nameInput().value).toBe('my_custom_name')
  })

  it('手動改過 name 之後再換 type，name 回到自動建議值', () => {
    setup()
    const src = sourceSelect().value
    fireEvent.change(nameInput(), { target: { value: 'my_custom_name' } })
    expect(nameInput().value).toBe('my_custom_name')
    fireEvent.change(typeSelect(), { target: { value: 'log' } })
    // 覆寫被清掉，回到隨 source/type 連動的建議值
    expect(nameInput().value).not.toBe('my_custom_name')
    expect(nameInput().value).toContain(src)
  })

  it('關閉再開啟 → state 回到初值（原本靠 useEffect，現在靠重新掛載）', () => {
    setup()
    fireEvent.change(typeSelect(), { target: { value: 'log' } })
    fireEvent.change(nameInput(), { target: { value: 'dirty' } })
    // 用 Esc 關閉（Modal 提供）；不另加 harness 按鈕，避免與 Modal 的關閉鈕撞無障礙名稱
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '開啟' }))
    expect(typeSelect().value).toBe('zscore')
    expect(nameInput().value).toBe(`z_${sourceSelect().value}`)
  })
})
