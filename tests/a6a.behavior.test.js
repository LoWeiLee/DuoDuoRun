/**
 * 階段 A / A6a 的行為鎖（2026-07-30）
 *
 * 對應紅隊 R60（L4）與 R61（L2）。
 *
 *   R60 — Lilliefors p 值的兩個定義域錯誤。**唯一的基準點（n = 60）落在安全區**，
 *         而失效區在 n ≳ 325 與 n = 4~7 兩端，逐值比對永遠綠燈。
 *   R61 — 零變異欄的退化值（W = 1 / D = 0 / p = 1）被判成「符合常態」綠燈，
 *         同 A4 的 R40-h、A5a 的 R51 之型：**失敗偽裝成成功的報表**。
 *
 * ★ 這裡鎖的是**結構性質**（兩個方向的單調性、換式邊界的連續性、表格上下界、
 *   兩個舊 clamp 區的判定方向），比逐點比對更難繞過——比照 A5a 對 ptukey 的做法。
 *   逐點的數值防線在 compare.test.js 的 `ks_lilliefors_grid`（12 n × 7 D = 84 欄）。
 */
import { describe, it, expect } from 'vitest'
import { lillieforsPValue, kolmogorovSmirnov, shapiroWilk } from '../src/lib/stats/normality.js'
import { runNormality } from '../src/analyses/normality/compute.js'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

/* ─────────────────────  R60：兩個舊 clamp 區的判定方向  ───────────────────── */

describe('R60（L4）：舊實作的兩個自製 clamp 區，判定方向必須正確', () => {
  // 舊版：`if (D < 0.05) return 1` ⇒ 大樣本的顯著樣本被印成 p = 1.000。
  // n ≳ 325 時 .05 臨界 D 已跌破 0.05（n = 500 時約 0.0404）。
  const clampLow = [
    [500, 0.045],
    [800, 0.038],
    [1000, 0.034],
    [2000, 0.026],
  ]
  for (const [n, D] of clampLow) {
    it(`n = ${n}、D = ${D}：必須顯著（舊版回傳恰好 1）`, () => {
      const p = lillieforsPValue(D, n)
      expect(p).toBeLessThan(0.05)
      expect(p).toBeGreaterThan(0)
    })
  }

  // 舊版：`if (D > 0.30) p = min(p, 0.05·e^(-5(D-0.30)))` ⇒ 極小樣本被強制判顯著。
  // n = 4 時 .05 臨界 D 約 0.375，D = 0.32 應為不顯著。
  it('n = 4、D = 0.32：必須不顯著（舊版被 clamp 強制 ≤ .05）', () => {
    expect(lillieforsPValue(0.32, 4)).toBeGreaterThan(0.05)
  })
  it('n = 5、D = 0.33：必須不顯著', () => {
    expect(lillieforsPValue(0.33, 5)).toBeGreaterThan(0.05)
  })
})

describe('R60：兩個方向的單調性', () => {
  it('固定 n，p 必須隨 D 嚴格遞減', () => {
    for (const n of [4, 15, 60, 150, 500, 1600, 4000]) {
      let prev = Infinity
      for (const D of [0.01, 0.03, 0.05, 0.08, 0.12, 0.2, 0.3, 0.45, 0.6]) {
        const p = lillieforsPValue(D, n)
        expect(Number.isFinite(p), `n=${n} D=${D} 應為有限值`).toBe(true)
        expect(p, `n=${n} D=${D} 未隨 D 遞減`).toBeLessThanOrEqual(prev)
        prev = p
      }
    }
  })

  it('固定 D，p 必須隨 n 遞減（同樣的偏離、更大的樣本 ⇒ 更顯著）', () => {
    for (const D of [0.04, 0.08, 0.15]) {
      let prev = Infinity
      for (const n of [30, 60, 100, 200, 400, 800, 1600, 3000]) {
        const p = lillieforsPValue(D, n)
        expect(p, `D=${D} n=${n} 未隨 n 遞減`).toBeLessThanOrEqual(prev + 1e-12)
        prev = p
      }
    }
  })
})

describe('R60：兩個換式邊界必須連續', () => {
  // n = 100 是 DW 重標定的門檻；n = 1600 是臨界值表轉漸近式的門檻。
  it('n = 100 兩側連續（重標定門檻）', () => {
    const a = lillieforsPValue(0.09, 100)
    const b = lillieforsPValue(0.09, 100.0001)
    expect(Math.abs(a - b)).toBeLessThan(1e-5)
  })
  it('n = 1600 兩側連續（表格轉漸近式）', () => {
    const a = lillieforsPValue(0.02, 1600)
    const b = lillieforsPValue(0.02, 1601)
    expect(Math.abs(a - b)).toBeLessThan(5e-3)
  })
})

describe('R60：臨界值表的上下界就是 statsmodels 的行為', () => {
  it('極小 D ⇒ p 夾在 0.99（表格最大的 α），不得回傳 1', () => {
    expect(lillieforsPValue(0.001, 30)).toBeCloseTo(0.99, 12)
    expect(lillieforsPValue(0.0005, 400)).toBeCloseTo(0.99, 12)
  })
  it('極大 D 且走表格路徑 ⇒ p 不小於 0.001', () => {
    // D 大到走 DW 近似（p < 0.1）時可以低於 0.001，這裡鎖的是表格路徑的下界
    expect(lillieforsPValue(0.02, 30)).toBeGreaterThanOrEqual(0.001)
  })
  it('回傳值恆在 [0, 1]', () => {
    for (const n of [4, 10, 60, 325, 1600, 5000])
      for (const D of [0, 0.01, 0.1, 0.5, 0.99, 1]) {
        const p = lillieforsPValue(D, n)
        expect(p >= 0 && p <= 1, `n=${n} D=${D} → ${p}`).toBe(true)
      }
  })
  it('n < 4 或 D 非有限 ⇒ NaN，不得靜默給值', () => {
    expect(Number.isNaN(lillieforsPValue(0.1, 3))).toBe(true)
    expect(Number.isNaN(lillieforsPValue(NaN, 60))).toBe(true)
    expect(Number.isNaN(lillieforsPValue(-0.1, 60))).toBe(true)
  })
})

describe('R60：對 statsmodels 的定點回歸鎖', () => {
  // 期望值取自 statsmodels 的 pvalmethod='approx' 路徑（pval_lf → p > 0.1 時改走 TableDist.prob）
  const cases = [
    [0.045, 500, 0.017129473885440293],
    [0.32, 4, 0.17317550462368259],
    [0.06, 200, 0.07680709550922944],
    [0.02, 1600, 0.14284636552402985],
    [0.02, 3000, 0.007656116366017917],
    [0.55, 4, 9.077255952397182e-5],
    [0.1, 60, 0.18008781698087123],
    [0.18, 325, 1.0808953778793685e-28],
  ]
  for (const [D, n, expected] of cases) {
    it(`p(D = ${D}, n = ${n}) 相對誤差 < 1e-10`, () => {
      const got = lillieforsPValue(D, n)
      expect(Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-300)).toBeLessThan(1e-10)
    })
  }

  it('★ 基準資料集那一點（n = 60、D ≈ 0.0784）：修正前為 0.4425，修正後對齊權威', () => {
    const p = lillieforsPValue(0.07844227871718523, 60)
    expect(Math.abs(p - 0.5160544697900533)).toBeLessThan(1e-9)
  })
})

/* ─────────────────────  R61：零變異不得偽裝成常態  ───────────────────── */

describe('R61（L2）：零變異欄必須帶旗標，不得被判成「符合常態」', () => {
  const constRows = Array.from({ length: 50 }, () => ({ konst: 7, normalish: 0 }))
  // 給 normalish 一組有變異的值（固定、不用亂數）
  constRows.forEach((r, i) => {
    r.normalish = Math.sin(i) * 3 + i * 0.11
  })

  it('常數欄的 shapiroWilk 與 kolmogorovSmirnov 都要回 zeroVariance', () => {
    const x = new Array(50).fill(7)
    expect(shapiroWilk(x).zeroVariance).toBe(true)
    expect(kolmogorovSmirnov(x).zeroVariance).toBe(true)
  })

  it('★ 回歸鎖：有變異的資料，旗標必須為假（不得誤報）', () => {
    const x = constRows.map((r) => r.normalish)
    expect(shapiroWilk(x).zeroVariance).toBeFalsy()
    expect(kolmogorovSmirnov(x).zeroVariance).toBeFalsy()
  })

  it('退化值本身維持不變（W = 1、D = 0、p = 1），只是多了旗標', () => {
    const x = new Array(50).fill(7)
    const sw = shapiroWilk(x)
    const ks = kolmogorovSmirnov(x)
    expect(sw.W).toBe(1)
    expect(sw.p).toBe(1)
    expect(ks.D).toBe(0)
    expect(ks.p).toBe(1)
  })

  it('分析層（runNormality）會把旗標帶到結果列', () => {
    const out = runNormality(constRows, { selectedVars: ['konst', 'normalish'] })
    const konst = out.rows.find((r) => r.col === 'konst')
    const ok = out.rows.find((r) => r.col === 'normalish')
    expect(konst.sw.zeroVariance).toBe(true)
    expect(konst.ks.zeroVariance).toBe(true)
    expect(ok.sw.zeroVariance).toBeFalsy()
    expect(ok.ks.zeroVariance).toBeFalsy()
  })

  it('中英 i18n 都要有零變異警告與「無法檢定」判讀字串', () => {
    for (const [name, pack] of [['zh-TW', zh], ['en', en]]) {
      expect(typeof pack.norm.zeroVarianceWarn, `${name} 缺 norm.zeroVarianceWarn`).toBe('string')
      expect(pack.norm.zeroVarianceWarn.length, `${name} 的警告字串過短`).toBeGreaterThan(40)
      expect(typeof pack.norm.verdict.undefinedTest, `${name} 缺 norm.verdict.undefinedTest`).toBe('string')
    }
  })
})
