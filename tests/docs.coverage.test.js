/**
 * 方法文件涵蓋率的防漂移硬擋（2026-07-29 建立，階段 A / A3c；roadmap-v2.md §6.7 判準 5）
 *
 * ── 這個測試存在的理由 ──
 *
 * 專案已經有兩道防線，但它們之間有一道縫：
 *
 *   `provenance.test.js`  管「每組基準有沒有登記溯源」
 *   `compare.test.js`     管「JS 與 Python 兩邊的數值對不對得起來」
 *   ★ 沒有任何一道管「這組基準有沒有人說得清它是什麼」
 *
 * 階段 A 的整個工作就是把這件事補起來：每個可報告的統計方法一份 `docs/methods/<id>.md`，
 * 第 6 節「對照與驗證狀態」逐一點名它涵蓋 `reference.json` 的哪幾組基準。
 * 但文件是人寫的，而人會忘記——新增一個方法、加了 fixture、加了 adapter、測試綠燈，
 * 然後沒有人補文件。半年後沒有人記得那一組基準在鎖什麼。
 *
 * ★ 本測試上線的第一天就抓到一組：`pls_scheme_centroid` 與 `pls_scheme_factorial`
 *   有基準、有 adapter、`compare.test.js` 也逐值比對，但 A1 的 `pls-basic.md` 第 6 節
 *   只點名了 `pls_basic`——兩組 34 個欄位沒有任何文件承認它們的存在。已於同日補上。
 *
 * ── 棘輪 ──
 *
 * 階段 A 尚未做完（A4：NCA/LDA/CFA/EFA；A5：推論統計；A6：敘述／相關／迴歸／量表／多變量），
 * 所以現在不可能要求「零未涵蓋」。比照 `provenance.test.js` 的 `MAX_PENDING`，
 * 這裡用 `MAX_UNDOCUMENTED`：**只能往下調**。
 *
 *   · 寫完一批方法文件 → 未涵蓋數下降 → 把這個數字調到新的實際值
 *   · 新增基準卻沒寫文件 → 未涵蓋數上升 → **紅燈**
 *
 * 這樣「新增方法忘了寫文件」會被擋下來，而不是靠自律。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/reference.json'), 'utf8'))
const METHODS_DIR = path.join(HERE, '..', 'docs', 'methods')

/**
 * 未被任何方法文件第 6 節引用的基準組數上限（棘輪，只能往下調）。
 *
 * 2026-07-29（A5a 交付後）實際值 **27**（前值 36，A4 交付後；再前 44，A3c 交付後）：
 *   · ★ A5a 新涵蓋 10 組：ttest_one_sample／ttest_independent_welch／ttest_paired、
 *     anova_oneway、tukey_hsd、★ tukey_ptukey_grid（本批新增，見 R50）、
 *     twoway_anova_type3、ancova、repeated_anova、mixed_anova
 *   · 基準組總數 83 → **84**（tukey_ptukey_grid 為 R50 的高 df 回歸防線）
 *
 * A4 交付後的實際值 36：
 *   · PLS 側 36 組（A1–A3）全數涵蓋
 *   · ★ A4 新涵蓋 11 組：nca_ce_fdh／nca_cr_fdh／nca_bottleneck、lda_group3、
 *     cfa_2factor／cfa_2factor_loadings／cfa_noncentral_chi2／cfa_rmsea_ci、
 *     efa_pca_none／efa_pca_varimax／efa_pca_varimax_k3
 *   · 剩下的 36 組全部落在尚未動工的 A5／A6（t 檢定、ANOVA 家族、無母數、相關、
 *     迴歸、量表、多變量、集群、敘述統計）
 *
 * ★ 寫完一批就把這個數字改成新的實際值——它是階段 A 的進度計。
 *
 * ★ 2026-07-29 紅隊 R49（階段 A / A4）：下方 `mentions()` 是**寬鬆比對**——
 *   只要基準鍵當作獨立字詞出現在第 6 節的任何地方（含散文與程式碼片段）就算涵蓋。
 *   A4 撰寫時實際踩到：`lda.md` 第 6 節寫「base R 的 manova() 給出的 Wilks Λ 亦同」，
 *   結果 `manova` 這一組（屬 A6、尚未寫文件）被**誤判為已涵蓋**，未涵蓋數少算 1。
 *   已把該處改寫為大寫 MANOVA 規避。⇒ **A5／A6 撰寫時要留意**：
 *   第 6 節提到別組方法的套件名或函式名時，避免寫成與基準鍵完全相同的小寫字串。
 *   （收緊為「只認 `reference.json → \`key\`` 宣告式」需回頭改 30 份 A1–A3 文件，本批不做。）
 */
// ★ 2026-07-30（A6a）：18 → 16。normality.md 交付，涵蓋 shapiro_wilk／ks_lilliefors，
//   並認領本批新增的 ks_lilliefors_grid（R60）——新增一組同時寫入文件，棘輪淨降 2。
const MAX_UNDOCUMENTED = 16

/** 取出一份方法文件的第 6 節（到第 7 節為止）。 */
function sectionSix(text) {
  const m = text.match(/^## 6\.[\s\S]*?(?=^## 7\.)/m)
  return m ? m[0] : null
}

const docFiles = fs.existsSync(METHODS_DIR)
  ? fs.readdirSync(METHODS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md')
  : []

const sections = docFiles.map((f) => ({
  file: f,
  text: fs.readFileSync(path.join(METHODS_DIR, f), 'utf8'),
}))

/** 基準鍵是否被某段文字點名（要求完整字詞，避免 pls_mga 誤命中 pls_mga_perm）。 */
function mentions(text, key) {
  return new RegExp(`(?<![A-Za-z0-9_])${key}(?![A-Za-z0-9_])`).test(text)
}

describe('方法文件涵蓋率（docs/methods 對 reference.json）', () => {
  it('docs/methods/ 必須存在且有文件', () => {
    expect(docFiles.length, `找不到任何方法文件於 ${METHODS_DIR}`).toBeGreaterThan(0)
  })

  it('每份方法文件都必須有完整的八節（第 6 節與第 7 節缺一不可）', () => {
    const bad = sections
      .filter((s) => sectionSix(s.text) === null)
      .map((s) => s.file)
    expect(
      bad,
      '以下文件抓不到「## 6.」到「## 7.」的區段——'
      + `八節模板（roadmap-v2.md §6.2）不可增刪節次：\n  ${bad.join('\n  ')}`,
    ).toEqual([])
  })

  it('README.md 索引必須連到每一份方法文件', () => {
    const idx = path.join(METHODS_DIR, 'README.md')
    expect(fs.existsSync(idx), 'docs/methods/README.md 索引不存在').toBe(true)
    const index = fs.readFileSync(idx, 'utf8')
    const missing = docFiles.filter((f) => !index.includes(f))
    expect(
      missing,
      `以下方法文件沒有被索引連到——請補進 docs/methods/README.md：\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it(`★ 未被任何第 6 節引用的基準組數不得超過 ${MAX_UNDOCUMENTED}（棘輪，只能往下調）`, () => {
    const allSectionSix = sections.map((s) => sectionSix(s.text) || '').join('\n')
    const undocumented = Object.keys(REF).filter((k) => !mentions(allSectionSix, k))
    expect(
      undocumented.length,
      `未被任何方法文件第 6 節引用的基準組有 ${undocumented.length} 組，上限 ${MAX_UNDOCUMENTED}。\n`
      + '新增基準必須同步寫方法文件（roadmap-v2.md §6.2 的八節模板），'
      + '第 6 節要逐一點名它涵蓋哪幾組基準；寫完一批就把 MAX_UNDOCUMENTED 調降到新的實際值。\n'
      + `目前未涵蓋：\n  ${undocumented.join('\n  ')}`,
    ).toBeLessThanOrEqual(MAX_UNDOCUMENTED)
  })

  it('已寫成文件的 PLS 側基準（A1–A3）必須全部被引用——這一批不得回頭掉出去', () => {
    const allSectionSix = sections.map((s) => sectionSix(s.text) || '').join('\n')
    const plsKeys = Object.keys(REF).filter((k) => k.startsWith('pls_'))
    const missing = plsKeys.filter((k) => !mentions(allSectionSix, k))
    expect(
      missing,
      'A1–A3 已交付，PLS 側的每一組基準都應被某份文件的第 6 節點名。'
      + `以下掉出涵蓋：\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('方法文件不得引用不存在於 reference.json 的基準鍵（防止文件寫了幽靈基準）', () => {
    const known = new Set(Object.keys(REF))
    const ghosts = []
    for (const s of sections) {
      const six = sectionSix(s.text) || ''
      // 只檢查「reference.json → <key>」這種明確宣告，避免誤判散文中的字詞
      for (const m of six.matchAll(/reference\.json\s*→\s*`?([A-Za-z0-9_]+)`?/g)) {
        if (!known.has(m[1])) ghosts.push(`${s.file}: ${m[1]}`)
      }
    }
    expect(
      ghosts,
      `以下文件的第 6 節宣告了 reference.json 裡不存在的基準鍵：\n  ${ghosts.join('\n  ')}`,
    ).toEqual([])
  })
})
