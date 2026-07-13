/**
 * 無障礙靜態防線（R3）
 *
 * 這不是行為測試，而是**防回歸的 lint 級檢查**——用測試而非 eslint 規則實作，
 * 是因為這些條件牽涉「跨檔案的樣式慣例」，寫成 eslint plugin 成本過高。
 *
 * 守住三件 2026-07-13 紅隊修掉的事，避免未來新增模組時又長回來：
 *   1. 不得再出現裸的 `focus:outline-none`（拔掉焦點外框卻不補 focus-visible 環）
 *      → 一律用 .focus-ring / .focus-ring-bad utility
 *   2. 每個 <select> 都要有可及名稱（aria-label）
 *   3. 不得使用 alert() / confirm()（改走 Toast / ConfirmDialog）
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p)
  }
  return out
}

const FILES = walk(SRC).map((p) => ({ p: path.relative(SRC, p), src: fs.readFileSync(p, 'utf8') }))

// Modal 的面板容器（tabIndex={-1}）刻意不顯示焦點環——它不是可操作元素，
// 焦點只是為了讓 Esc / focus trap 有落點。這是唯一允許的例外。
const OUTLINE_NONE_ALLOWED = new Set(['components/Modal.jsx'])

describe('無障礙靜態防線', () => {
  it('沒有裸的 focus:outline-none（一律用 .focus-ring utility）', () => {
    const bad = FILES
      .filter(({ p }) => !OUTLINE_NONE_ALLOWED.has(p.replace(/\\/g, '/')))
      .filter(({ src }) => /focus:outline-none/.test(src))
      .map(({ p }) => p)
    expect(bad, `這些檔案用了裸的 focus:outline-none，請改用 .focus-ring：\n  ${bad.join('\n  ')}`)
      .toEqual([])
  })

  it('每個 <select> 都有 aria-label（否則螢幕報讀念不出它是哪個欄位）', () => {
    const bad = []
    for (const { p, src } of FILES) {
      const re = /<select\b((?:[^>]|\n)*?)>/gm
      let m
      while ((m = re.exec(src)) !== null) {
        if (!/aria-label/.test(m[1])) {
          bad.push(`${p}:${src.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(bad, `這些 <select> 缺少 aria-label：\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it('沒有使用 alert() / confirm()（改走 Toast / ConfirmDialog）', () => {
    const bad = []
    for (const { p, src } of FILES) {
      // 先整檔剝掉區塊註解與行註解——本專案的註解大量提到這兩個名字。
      // ⚠ 必須先去掉 \r：工作副本是 CRLF，JS 的 `.` 不匹配 \r，
      //   `/\/\/.*$/` 在 CRLF 行上會整條失效（2026-07-13 踩過）。
      const code = src
        .replace(/\r/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
      code.split('\n').forEach((line, i) => {
        if (/(?<![.\w])(alert|confirm)\s*\(/.test(line)) bad.push(`${p}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(bad, `這些地方用了原生 alert()/confirm()：\n  ${bad.join('\n  ')}`).toEqual([])
  })
})
