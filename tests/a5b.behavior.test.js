/**
 * 階段 A / A5b 的行為鎖（2026-07-30）
 *
 * 對應紅隊 R54–R57。本批**無 L4**，但有兩個「數值比對抓不到」的問題：
 *   R54 — 效果量的名稱與值域（基準端與實作端犯同一個命名錯誤 ⇒ compare.test.js 永遠說「一致」）
 *   R55 — 尾端抵消（受影響區間在 p < 1e-10，既有 fixture 全在安全區 ⇒ 逐值比對永遠綠燈）
 *
 * ★ 這裡鎖的是**結構性質**（值域、單調性、不得塌成 0、上尾與下尾的一致性），
 *   比逐點比對更難繞過——比照 A5a 對 ptukey 加的單調性與 df 連續性兩條。
 */
import { describe, it, expect } from 'vitest'
import { normalSf, normalCdf } from '../src/lib/stats/pvalue.js'
import { kruskalWallis, dunnPostHoc, mannWhitneyU, wilcoxonSignedRank } from '../src/lib/stats/nonparametric.js'
import { oneProp, twoProp } from '../src/lib/stats/zProp.js'
import { chiSquareIndependence } from '../src/lib/stats/chiSquare.js'
import { fisherExact } from '../src/lib/stats/fisherExact.js'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

/* ─────────────────────  R55：尾端不得塌成 0  ───────────────────── */

describe('R55（L3）：雙尾 p 在大 |z| 不得塌成 0', () => {
  // 期望值為單尾 P(Z > z)，來自 mpmath 的 0.5·erfc(z/√2)（dps = 40），
  // 與引擎的 Numerical Recipes 路徑無關。
  // ★ 容差取 1e-12：沙盒實測 normalSf 在 z ∈ [0.5, 35] 的相對誤差穩定在 5e-14 級；
  //   z ≥ 38.5 才失準，而那裡的真值已在 double 的非正規數邊界（~1e-322），
  //   屬 IEEE 754 的表示極限而非實作缺陷。
  const cases = [
    [6.0, 9.8658764503769809e-10],
    [7.0, 1.2798125438858350e-12],
    [8.0, 6.2209605742717839e-16],
    [8.5, 9.4795348222033177e-18],
    [10.0, 7.6198530241605255e-24],
    [15.0, 3.6709661993127508e-51],
    [20.0, 2.7536241186062337e-89],
    [30.0, 4.9067139271481872e-198],
  ]
  for (const [z, expected] of cases) {
    it(`normalSf(${z}) 的相對誤差 < 1e-12（不得回傳 0）`, () => {
      const got = normalSf(z)
      expect(got, `normalSf(${z}) 回傳 ${got}`).toBeGreaterThan(0)
      expect(Math.abs(got - expected) / expected).toBeLessThan(1e-12)
    })
  }

  it('★ normalSf 必須嚴格遞減到 z = 35（舊寫法在 z ≥ 8.3 起恆為 0，會讓這條失敗）', () => {
    let prev = Infinity
    for (let z = 0.5; z <= 35.0001; z += 0.5) {
      const cur = normalSf(z)
      expect(cur, `z=${z} 不得為 0`).toBeGreaterThan(0)
      expect(cur, `z=${z} 未嚴格遞減（前值 ${prev}）`).toBeLessThan(prev)
      prev = cur
    }
  })

  it('normalSf 與 normalCdf 在中央區必須互補（sf = 1 − cdf）', () => {
    for (const z of [-3, -1.5, -0.5, 0, 0.5, 1.5, 3]) {
      expect(Math.abs(normalSf(z) - (1 - normalCdf(z)))).toBeLessThan(1e-12)
    }
  })

  it('normalSf 的對稱性：sf(−z) = 1 − sf(z)', () => {
    for (const z of [0.3, 1, 2, 4]) {
      expect(Math.abs(normalSf(-z) - (1 - normalSf(z)))).toBeLessThan(1e-12)
    }
  })

  it('★ 可達性回歸：單樣本比例 n=8、x=0、p0=0.9 的 p 不得為 0（|z| = 8.49）', () => {
    const rows = Array.from({ length: 8 }, () => ({ v: '0' }))
    const r = oneProp(rows, 'v', '1', 0.9)
    expect(Math.abs(r.z)).toBeGreaterThan(8.4)
    expect(r.p, `p 回傳 ${r.p}（舊寫法為 0）`).toBeGreaterThan(0)
    expect(r.p).toBeLessThan(1e-16)
  })

  it('normalSf 對非有限輸入回 NaN', () => {
    expect(Number.isNaN(normalSf(NaN))).toBe(true)
    expect(Number.isNaN(normalSf(Infinity))).toBe(true)
  })
})

/* ─────────────────────  R54：效果量的值域  ───────────────────── */

describe('R54（L3）：Kruskal-Wallis 的效果量欄名與值域', () => {
  const mk = (arrs) => arrs.map((v, i) => ({ name: String.fromCharCode(65 + i), values: v }))

  it('★ 欄名必須是 eta2H，且不得再存在 epsilon2（名稱本身就是 R54 的錯處）', () => {
    const r = kruskalWallis(mk([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
    expect(r).toHaveProperty('eta2H')
    expect(r.epsilon2, 'epsilon2 應已改名，殘留即代表改名未改乾淨').toBeUndefined()
  })

  it('★ eta2H 必須落在 [0, 1]——偏誤校正的原式可為負，floor 是 R54 的處置', () => {
    // 三組幾乎無差異 ⇒ H 極小 ⇒ (H−k+1)/(N−k) 為負
    const groups = mk([[5, 5, 5, 5, 5], [5, 5, 5, 5, 6], [5, 5, 5, 6, 5]])
    const r = kruskalWallis(groups)
    expect(r.eta2H).toBeGreaterThanOrEqual(0)
    expect(r.eta2H).toBeLessThanOrEqual(1)
  })

  it('★ eta2HRaw 保留未 floor 的原值，且在近乎無效果時確實為負（證明 floor 有在作用）', () => {
    const groups = mk([[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]])
    const r = kruskalWallis(groups)
    expect(r.eta2HRaw).toBeLessThan(0)
    expect(r.eta2H).toBe(0)
  })

  it('eta2H 在強效果時應接近 1 且不超過 1', () => {
    const r = kruskalWallis(mk([[1, 2, 3, 4], [11, 12, 13, 14], [21, 22, 23, 24]]))
    expect(r.eta2H).toBeGreaterThan(0.7)
    expect(r.eta2H).toBeLessThanOrEqual(1)
  })

  it('★ i18n 兩語都必須把欄位標為 η²_H，且不得再出現 ε² 的標籤鍵', () => {
    for (const [name, t] of [['zh-TW', zh], ['en', en]]) {
      expect(t.np.result.cols.eta2H, `${name} 缺 eta2H 標籤`).toContain('η²')
      expect(t.np.result.cols.eps2, `${name} 仍留有 eps2 標籤鍵`).toBeUndefined()
      expect(t.np.apa.kw, `${name} 的 APA 句仍用 {eps2}`).toContain('{eta2H}')
      expect(t.np.apa.kw).not.toContain('{eps2}')
    }
  })

  it('★ 效果量分級必須有四級（含 trivial），否則「微弱」永遠不會被顯示', () => {
    for (const [name, t] of [['zh-TW', zh], ['en', en]]) {
      for (const k of ['trivial', 'small', 'medium', 'large']) {
        expect(t.np.result.effect[k], `${name} 的 np.result.effect 缺 ${k}`).toBeTruthy()
      }
    }
  })
})

/* ─────────────────────  R57：慣例說明必須誠實  ───────────────────── */

describe('R57（L2）：連續性校正的說明不得再宣稱與 SPSS 一致', () => {
  it('★ continuityNote 不得同時出現 SPSS 與「一致」的宣稱（SPSS 的 Asymp. Sig. 不套 CC）', () => {
    expect(zh.np.result.continuityNote).not.toMatch(/與 SPSS \/ R wilcox\.test 預設一致/)
    expect(en.np.result.continuityNote).not.toMatch(/matches SPSS \/ R wilcox\.test default/)
  })
  it('continuityNote 兩語都必須提到 SPSS 的差異', () => {
    expect(zh.np.result.continuityNote).toContain('SPSS')
    expect(en.np.result.continuityNote).toContain('SPSS')
  })
  it('★ formulaMWZ 必須寫出實作實際扣掉的 0.5', () => {
    expect(zh.np.notes.formulaMWZ).toContain('0.5')
    expect(en.np.notes.formulaMWZ).toContain('0.5')
  })
})

/* ─────────────────────  邊界條件的結構鎖  ───────────────────── */

describe('A5b 邊界條件：退化情形不得回傳偽裝成成功的數字', () => {
  it('Mann-Whitney：全部並列時 σ = 0 ⇒ z = 0、p = 1', () => {
    const r = mannWhitneyU([3, 3, 3, 3], [3, 3, 3, 3])
    expect(r.z).toBe(0)
    expect(r.p).toBe(1)
  })

  it('Wilcoxon：全部差值為 0 ⇒ 明示 allZeroDiffs、p = 1、不報錯', () => {
    const r = wilcoxonSignedRank([2, 4, 6], [2, 4, 6])
    expect(r.allZeroDiffs).toBe(true)
    expect(r.p).toBe(1)
    expect(r.error).toBeUndefined()
    expect(r.nDropped).toBe(3)
  })

  it('★ Wilcoxon：nDropped 必須等於零差值配對數（不含缺失列）', () => {
    const r = wilcoxonSignedRank([1, 2, 3, 4, 5], [1, 2, 9, 9, 9])
    expect(r.nDropped).toBe(2)
    expect(r.n).toBe(3)
  })

  it('雙樣本比例：兩組同為 0% ⇒ pooled SE = 0 ⇒ z/p 為 NaN（不得偽裝成顯著）', () => {
    const rows = [...Array(6)].map(() => ({ g: 'A', v: '0' }))
      .concat([...Array(6)].map(() => ({ g: 'B', v: '0' })))
    const r = twoProp(rows, 'g', 'v', '1')
    expect(Number.isNaN(r.z)).toBe(true)
    expect(Number.isNaN(r.p)).toBe(true)
  })

  it('★ 卡方：Yates 校正只能施加在 2×2（非 2×2 時 chi2Yates 為 NaN、yatesApplied 為 false）', () => {
    const rows = []
    for (const [ri, ci, n] of [[0, 0, 5], [0, 1, 6], [0, 2, 7], [1, 0, 8], [1, 1, 4], [1, 2, 3]]) {
      for (let i = 0; i < n; i++) rows.push({ R: `r${ri}`, C: `c${ci}` })
    }
    const r = chiSquareIndependence(rows, 'R', 'C')
    expect(r.yatesApplied).toBe(false)
    expect(Number.isNaN(r.chi2Yates)).toBe(true)
  })

  it('卡方：2×2 且任一期望次數 < 5 ⇒ suggestFisher 為 true', () => {
    const rows = []
    for (const [rk, ck, n] of [['Yes', 'High', 1], ['Yes', 'Low', 8], ['No', 'High', 7], ['No', 'Low', 2]]) {
      for (let i = 0; i < n; i++) rows.push({ R: rk, C: ck })
    }
    const r = chiSquareIndependence(rows, 'R', 'C')
    expect(r.minExpected).toBeLessThan(5)
    expect(r.suggestFisher).toBe(true)
  })

  it('★ Fisher：有 0 格時套 Haldane +0.5 並明示，OR 必須為有限值', () => {
    const rows = []
    for (const [rk, ck, n] of [['Yes', 'High', 0], ['Yes', 'Low', 7], ['No', 'High', 6], ['No', 'Low', 3]]) {
      for (let i = 0; i < n; i++) rows.push({ R: rk, C: ck })
    }
    const r = fisherExact(rows, 'R', 'C', 'Yes', 'High')
    expect(r.haldaneApplied).toBe(true)
    expect(Number.isFinite(r.or)).toBe(true)
    expect(r.p).toBeGreaterThan(0)
    expect(r.p).toBeLessThanOrEqual(1)
  })

  it('★ Fisher：對稱表的 p 必須為 1（並列容差不得漏收機率相同的表）', () => {
    for (const m of [3, 10, 40, 120]) {
      const rows = []
      for (const [rk, ck] of [['Yes', 'High'], ['Yes', 'Low'], ['No', 'High'], ['No', 'Low']]) {
        for (let i = 0; i < m; i++) rows.push({ R: rk, C: ck })
      }
      const r = fisherExact(rows, 'R', 'C', 'Yes', 'High')
      expect(Math.abs(r.p - 1), `m=${m} 的對稱表 p = ${r.p}`).toBeLessThan(1e-9)
    }
  })

  it('★ Dunn：Bonferroni 校正後的 p 必須 ≥ 未校正 p，且皆落在 [0, 1]', () => {
    const groups = [[1, 2, 3, 4, 5], [4, 5, 6, 7, 8], [9, 10, 11, 12, 13], [2, 3, 4, 5, 6]]
      .map((v, i) => ({ name: String.fromCharCode(65 + i), values: v }))
    const r = dunnPostHoc(groups)
    expect(r.m).toBe(6)
    for (const c of r.comparisons) {
      expect(c.pAdj).toBeGreaterThanOrEqual(c.p - 1e-15)
      expect(c.p).toBeGreaterThanOrEqual(0)
      expect(c.p).toBeLessThanOrEqual(1)
      expect(c.pAdj).toBeLessThanOrEqual(1)
    }
  })

  it('Dunn：組數 < 3 必須回錯誤而非硬算', () => {
    const r = dunnPostHoc([{ name: 'A', values: [1, 2] }, { name: 'B', values: [3, 4] }])
    expect(r.error).toBeTruthy()
  })
})
