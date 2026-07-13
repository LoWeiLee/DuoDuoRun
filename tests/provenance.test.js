/**
 * 公式溯源硬擋（2026-07-13 建立）
 *
 * ── 這個測試存在的理由 ──
 *
 * `compare.test.js` 的標題是「統計核心 vs Python 黃金標準」。但對 `reference.json` 裡
 * 相當一部分的方法而言，那個「黃金標準」是**同一個作者、照同一次對論文的理解、
 * 用 numpy 手算出來的**。JS 與 Python 兩邊編碼的是同一個猜測——
 * 這種比對能抓到「兩邊抄不一致」，**永遠抓不到「公式本身讀錯」**。
 * 它是一個自我一致性檢查，穿著驗證的外衣。
 *
 * 2026-07-13 的 R 抽驗證實了這一點：找到的四個問題
 * （MGA 的 Welch t 漏 (n−1)/n 加權、MICOM step 3 用變異數差而非 log 比、
 *  Henseler MGA 的偏誤校正錨點用點估計而非 bootstrap 平均、d_G 的對數底數）
 * **全部落在手算基準**；對照 scipy／statsmodels／pingouin／sklearn 的 52 組，一個都沒出事。
 * 這不是運氣，是結構。
 *
 * ── 因此的規範 ──
 *
 * 每一個進入 `reference.json` 的方法，都必須在 `tests/fixtures/provenance.json`
 * 登記它的**權威來源**：
 *
 *   tier "A"：fixture 值**直接由第三方實作產生**（scipy / statsmodels / pingouin /
 *             sklearn / factor_analyzer / semopy / plspm / seminr / cSEM / R NCA …）。
 *   tier "B"：fixture 值為手算。此時 `authority` 必須指名
 *             **可執行的獨立實作**，或**有方程式編號的原始文獻**——
 *             「我對論文的轉述」不算數。`verification` 必須寫明用什麼方式交叉核對過。
 *   tier "I"：純輸入型 fixture（固定重抽索引／排列），不含公式，無溯源義務。
 *
 * ── 為什麼要用測試擋，而不是寫進規範文件 ──
 *
 * 規範靠自律，而 2026-07-13 這一天已經證明自律會失效。
 * `MAX_PENDING` 是一個**只能往下調**的棘輪：新增方法若沒登記 → 紅燈；
 * 待審計數量若增加 → 紅燈。查證因此成為 commit 前的硬門，不是叮嚀。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/reference.json'), 'utf8'))
const PROV = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/provenance.json'), 'utf8'))

/**
 * 待審計上限（棘輪）。
 *
 * ★ 這個數字**只能往下調**。審計完一組，把它的 status 改成 "verified"，
 *   然後把這裡減 1。任何讓待審計變多的改動都會讓測試紅燈。
 *
 * 2026-07-13 起始值 15。原始盤點為 29 組手算基準，其中
 *   10 組已由當日的 R 抽驗（seminr / cSEM / R NCA）逐項核對 → verified
 *    4 組為純輸入型 fixture → exempt
 *   15 組待審計 ← 就是這個數字
 *
 * 待審計清單與各自的審計路徑見 `docs/formula-provenance.md`。
 */
const MAX_PENDING = 15

const TIERS = new Set(['A', 'B', 'I'])
const STATUSES = new Set(['verified', 'pending', 'exempt'])

describe('公式溯源登記（provenance）', () => {
  it('reference.json 的每個方法都必須有登記條目', () => {
    const missing = Object.keys(REF).filter((k) => !(k in PROV))
    expect(
      missing,
      `以下方法沒有溯源登記——請在 tests/fixtures/provenance.json 補上，`
      + `並在 docs/formula-provenance.md 說明權威來源：\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('登記表不得有 reference.json 裡不存在的方法（防止遺留條目）', () => {
    const orphan = Object.keys(PROV).filter((k) => !(k in REF))
    expect(orphan, `登記表有孤兒條目：\n  ${orphan.join('\n  ')}`).toEqual([])
  })

  it('每個條目的 tier / status 必須合法，authority 與 verification 不得為空', () => {
    const bad = []
    for (const [k, v] of Object.entries(PROV)) {
      if (!TIERS.has(v.tier)) bad.push(`${k}: tier「${v.tier}」不合法（須為 A / B / I）`)
      if (!STATUSES.has(v.status)) bad.push(`${k}: status「${v.status}」不合法`)
      if (!v.authority || !String(v.authority).trim()) bad.push(`${k}: authority 為空`)
      if (!v.verification || !String(v.verification).trim()) bad.push(`${k}: verification 為空`)
    }
    expect(bad, `登記表欄位問題：\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it('tier A 必須是 verified（A 的定義就是「值直接來自第三方實作」）', () => {
    const bad = Object.entries(PROV)
      .filter(([, v]) => v.tier === 'A' && v.status !== 'verified')
      .map(([k, v]) => `${k}: tier A 但 status = ${v.status}`)
    expect(bad).toEqual([])
  })

  it('tier I 必須是 exempt，且不得用來規避溯源義務（只能是輸入型 fixture）', () => {
    const bad = Object.entries(PROV)
      .filter(([, v]) => v.tier === 'I' && v.status !== 'exempt')
      .map(([k]) => k)
    expect(bad).toEqual([])
    // 輸入型 fixture 的名稱慣例：以 _inputs 結尾。避免有人把公式塞進 tier I。
    const notInputs = Object.entries(PROV)
      .filter(([k, v]) => v.tier === 'I' && !k.endsWith('_inputs'))
      .map(([k]) => k)
    expect(
      notInputs,
      `tier I 只給純輸入型 fixture（命名須以 _inputs 結尾）。以下不符：\n  ${notInputs.join('\n  ')}`,
    ).toEqual([])
  })

  it('tier B 且已 verified 者，authority 不得停在「待審計」', () => {
    const bad = Object.entries(PROV)
      .filter(([, v]) => v.tier === 'B' && v.status === 'verified'
        && (String(v.authority).includes('待審計') || String(v.verification).includes('待審計')))
      .map(([k]) => k)
    expect(bad, `以下條目標為 verified 但溯源仍是「待審計」：\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it(`★ 待審計數量的棘輪：不得超過 ${MAX_PENDING}（只能往下調）`, () => {
    const pending = Object.entries(PROV)
      .filter(([, v]) => v.status === 'pending')
      .map(([k]) => k)
    expect(
      pending.length,
      `待審計 ${pending.length} 組，上限 ${MAX_PENDING}。\n`
      + `新增方法必須同步完成溯源查證；審計完成後把 status 改為 verified 並把 MAX_PENDING 減 1。\n`
      + `目前待審計：\n  ${pending.join('\n  ')}`,
    ).toBeLessThanOrEqual(MAX_PENDING)
  })
})
