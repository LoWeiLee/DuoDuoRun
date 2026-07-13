/**
 * i18n 對稱性防線（2026-07-13 紅隊 R1 增補）
 *
 * 缺譯過去只會在使用者切到英文介面時才被發現。本測試把 zh-TW 與 en 兩份字串表
 * 扁平化成 key 集合逐一比對，並檢查同一 key 的 placeholder（{x}）集合一致——
 * placeholder 不對稱會讓 UI 印出未被取代的 `{count}` 這類字面值。
 *
 * 也一併檢查空字串與型別錯置（一邊是字串、另一邊是物件/陣列）。
 */
import { describe, it, expect } from 'vitest'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

/** 把巢狀物件扁平化成 { 'a.b.c': value }。陣列以索引為鍵。 */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

/** 取出字串中的 placeholder，如 '共 {n} 筆' → Set{'n'}。 */
function placeholders(s) {
  if (typeof s !== 'string') return new Set()
  return new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
}

const ZH = flatten(zh)
const EN = flatten(en)
const zhKeys = Object.keys(ZH)
const enKeys = Object.keys(EN)

describe('i18n 對稱性：zh-TW ↔ en', () => {
  it('en 沒有缺任何 zh-TW 的 key', () => {
    const missing = zhKeys.filter((k) => !(k in EN))
    expect(missing, `en.js 缺少 ${missing.length} 個 key:\n  ${missing.join('\n  ')}`).toEqual([])
  })

  it('zh-TW 沒有缺任何 en 的 key', () => {
    const missing = enKeys.filter((k) => !(k in ZH))
    expect(missing, `zh-TW.js 缺少 ${missing.length} 個 key:\n  ${missing.join('\n  ')}`).toEqual([])
  })

  it('同一 key 的 placeholder 集合一致', () => {
    const bad = []
    for (const k of zhKeys) {
      if (!(k in EN)) continue
      const a = placeholders(ZH[k])
      const b = placeholders(EN[k])
      const onlyZh = [...a].filter((x) => !b.has(x))
      const onlyEn = [...b].filter((x) => !a.has(x))
      if (onlyZh.length || onlyEn.length) {
        bad.push(`${k} — zh 獨有 {${onlyZh.join(',')}}｜en 獨有 {${onlyEn.join(',')}}`)
      }
    }
    expect(bad, `placeholder 不對稱 ${bad.length} 處:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it('同一 key 的型別一致（不會一邊字串、一邊物件）', () => {
    const bad = zhKeys
      .filter((k) => k in EN && typeof ZH[k] !== typeof EN[k])
      .map((k) => `${k} — zh:${typeof ZH[k]} en:${typeof EN[k]}`)
    expect(bad, `型別錯置:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it('沒有空字串（未填的翻譯）', () => {
    const bad = [
      ...zhKeys.filter((k) => ZH[k] === '').map((k) => `zh-TW: ${k}`),
      ...enKeys.filter((k) => EN[k] === '').map((k) => `en: ${k}`),
    ]
    expect(bad, `空字串:\n  ${bad.join('\n  ')}`).toEqual([])
  })
})
