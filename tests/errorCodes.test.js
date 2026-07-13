/**
 * error code → i18n 訊息對映測試（R5）
 *
 * 統計核心在無法計算時回傳字串錯誤碼（`{ error: 'tooFewN' }`），
 * UI 再用 `t.<ns>.config[code] || t.<ns>.errors[code]` 查訊息。
 * 若某個錯誤碼在 i18n 沒有對應字串，使用者會看到裸的英文代碼
 * （例如畫面上直接出現 `factorBadGroups`）——這在中文教學工具裡特別刺眼。
 *
 * 本測試掃出統計核心實際會回傳的所有錯誤碼，逐一確認中英 i18n 都查得到。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 掃出「**需要 i18n 查表**」的字串錯誤碼。
 *
 * 判準：回傳時沒有一併附上 `message` 的錯誤碼。
 *   - PLS-SEM 引擎的 37 個錯誤碼一律寫成 `{ error: 'x', message: '中文說明' }`，
 *     UI 顯示 `res.message || res.error` → 不會裸露代碼，不需 i18n 查表。
 *   - 其餘模組只回 `{ error: 'tooFewN' }`，UI 走 `t.<ns>.config[code]` 查訊息，
 *     查不到就會把代碼原樣印在畫面上（中文教學工具裡出現 `factorBadGroups` 特別刺眼）。
 */
function collectCodes(dir) {
  const codes = new Set()
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name)
      if (fs.statSync(p).isDirectory()) { walk(p); continue }
      if (!/\.(js|jsx)$/.test(name)) continue
      const src = fs.readFileSync(p, 'utf8')
      // 只收「error: 'code'」後面沒有緊接 message: 的
      for (const m of src.matchAll(/error:\s*'([A-Za-z][\w-]*)'(\s*,\s*message\s*:)?/g)) {
        if (!m[2]) codes.add(m[1])
      }
    }
  }
  walk(dir)
  return codes
}

const CODES = new Set([
  ...collectCodes(path.join(ROOT, 'src/lib/stats')),
  ...collectCodes(path.join(ROOT, 'src/analyses')),
])

/** 把 i18n 樹扁平化成一個「所有葉節點 key」的集合（不含路徑） */
function leafKeys(obj, out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') leafKeys(v, out)
    else out.add(k)
  }
  return out
}

const ZH_KEYS = leafKeys(zh)
const EN_KEYS = leafKeys(en)

describe('error code → i18n 訊息對映', () => {
  it(`統計核心確實會回傳字串錯誤碼（掃到 ${CODES.size} 個）`, () => {
    expect(CODES.size).toBeGreaterThan(10)
  })

  it('每個錯誤碼在 zh-TW 都查得到訊息（否則畫面會出現裸代碼）', () => {
    const missing = [...CODES].filter((c) => !ZH_KEYS.has(c)).sort()
    expect(
      missing,
      `這些錯誤碼在 zh-TW.js 沒有對應訊息，觸發時畫面會直接顯示代碼：\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })

  it('每個錯誤碼在 en 都查得到訊息', () => {
    const missing = [...CODES].filter((c) => !EN_KEYS.has(c)).sort()
    expect(
      missing,
      `這些錯誤碼在 en.js 沒有對應訊息：\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})
