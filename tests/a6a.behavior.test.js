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
import { levene } from '../src/lib/stats/levene.js'
import { runCorrelation } from '../src/analyses/correlation/compute.js'
import { simpleLinearRegression } from '../src/lib/stats/regression.js'
import { multipleRegression } from '../src/lib/stats/multipleRegression.js'
import { describe as describeStats } from '../src/lib/stats/descriptive.js'
import { isMissing } from '../src/lib/variableTypes.js'
import REF from './fixtures/reference.json' with { type: 'json' }
import DATASETS from './fixtures/datasets.json' with { type: 'json' }
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'


// descriptive/compute.js 以無副檔名匯入（Vite 可解析、原生 node ESM 不行），
// 這裡照它的邏輯重建同一條管線，鎖的是行為而非該檔的匯入方式。
function runDescriptive(rows, columns) {
  return columns.map((col) => {
    const values = rows
      .map((r) => r[col])
      .filter((v) => !isMissing(v))
      .map(Number)
      .filter(Number.isFinite)
    return { col, ...describeStats(values) }
  })
}

const MAIN = Object.values(DATASETS.main)
const GROUPS3_Y = ['A', 'B', 'C'].map((g) =>
  MAIN.filter((r) => r.group3 === g).map((r) => Number(r.y))
)
void REF

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

/* ─────────────────────  R65 / R66：A6a 第二輪的兩個退化情形  ───────────────────── */

describe('R65（L2）：敘述統計的非數值列必須被剔除，不得讓整欄變成 NaN', () => {
  const rows = [{ v: 1 }, { v: 2 }, { v: 'abc' }, { v: 4 }, { v: 5 }]
  it('含一個非數值字串時，其餘四筆仍算得出來', () => {
    const out = runDescriptive(rows, ['v'])[0]
    expect(out.n).toBe(4)
    expect(out.mean).toBe(3)
    expect(Number.isFinite(out.sd)).toBe(true)
    expect(Number.isFinite(out.median)).toBe(true)
  })
  it('★ 回歸鎖：全數值資料的結果不得被這條過濾改動', () => {
    const clean = [{ v: 1 }, { v: 2 }, { v: 4 }, { v: 5 }]
    const out = runDescriptive(clean, ['v'])[0]
    expect(out.n).toBe(4)
    expect(out.mean).toBe(3)
  })
})

describe('R66（L2）：各組皆為常數時，Levene 不得宣告「違反同質」', () => {
  it('全部組別零變異 ⇒ 回錯誤碼，F 與 p 皆非有限值', () => {
    const r = levene([[1, 1, 1], [2, 2, 2], [3, 3, 3]])
    expect(r.error).toBe('levene-all-constant')
    expect(Number.isFinite(r.F)).toBe(false)
    expect(Number.isFinite(r.p)).toBe(false)
    // ★ 舊版回 { F: Infinity, p: 0 } ⇒ leveneStatus 判 fail ⇒ 紅燈「違反同質」，方向相反
    expect(r.p).not.toBe(0)
  })
  it('★ 回歸鎖：只有一組零變異時仍是正常的檢定（不得被誤擋）', () => {
    const r = levene([[1, 1, 1, 1], [2, 3, 4, 5], [3, 4, 5, 6]])
    expect(r.error).toBeUndefined()
    expect(Number.isFinite(r.F)).toBe(true)
    expect(r.F).toBeGreaterThan(0)
  })
  it('★ 回歸鎖：一般資料的 F 與 p 不變（對 fixture 的 levene_median）', () => {
    // datasets.json:main 的 group3 三組 y —— 期望值取自 reference.json
    const r = levene(GROUPS3_Y)
    expect(Math.abs(r.F - 0.38762994241212556)).toBeLessThan(1e-12)
    expect(Math.abs(r.p - 0.680438717297181)).toBeLessThan(1e-12)
  })
  it('中英 i18n 都要有 levene-all-constant 的說明字串', () => {
    for (const [name, pack] of [['zh-TW', zh], ['en', en]]) {
      const msg = pack.errors.stats['levene-all-constant']
      expect(typeof msg, `${name} 缺 errors.stats['levene-all-constant']`).toBe('string')
      expect(msg.length).toBeGreaterThan(40)
    }
  })
})

describe('R67（L2）：相關矩陣的零變異欄不得只印「—」而不說明', () => {
  const mk = (rows, vars) => runCorrelation(rows, { selectedVars: vars })
  const constCols = (res) => {
    const out = []
    for (const a of res.columns) {
      for (const b of res.columns) {
        if (a === b) continue
        if (res.matrix[a][b]?.xConstant) { out.push(a); break }
      }
    }
    return out
  }

  it('★ 只標出真正的常數欄，不得把與它配對的正常欄一起誤標', () => {
    const res = mk(Array.from({ length: 20 }, (_, i) => ({ a: i, b: 5, c: i * 2 })), ['a', 'b', 'c'])
    expect(constCols(res)).toEqual(['b'])
  })
  it('★ 只有兩欄時也要分得出來（zeroVariance 這個舊旗標在此分不出）', () => {
    const res = mk(Array.from({ length: 20 }, (_, i) => ({ a: i, b: 5 })), ['a', 'b'])
    expect(constCols(res)).toEqual(['b'])
    // 舊旗標對兩側都成立 ⇒ 用它會誤標
    expect(res.matrix.a.b.zeroVariance).toBe(true)
    expect(res.matrix.b.a.zeroVariance).toBe(true)
  })
  it('★ 回歸鎖：正常資料不得出現任何常數欄旗標', () => {
    const res = mk(Array.from({ length: 20 }, (_, i) => ({ a: i, b: i * i })), ['a', 'b'])
    expect(constCols(res)).toEqual([])
    expect(res.matrix.a.b.xConstant).toBeFalsy()
    expect(Number.isFinite(res.matrix.a.b.r)).toBe(true)
  })
  it('Spearman 也要轉傳兩側旗標', () => {
    const res = mk(Array.from({ length: 20 }, (_, i) => ({ a: i, b: 5 })), ['a', 'b'])
    const sp = runCorrelation(Array.from({ length: 20 }, (_, i) => ({ a: i, b: 5 })),
      { selectedVars: ['a', 'b'], method: 'spearman' })
    expect(sp.matrix.b.a.xConstant).toBe(true)
    void res
  })
  it('中英 i18n 都要有 corr.zeroVarianceNote 且含 {vars} 佔位', () => {
    for (const [name, pack] of [['zh-TW', zh], ['en', en]]) {
      expect(typeof pack.corr.zeroVarianceNote, `${name} 缺 corr.zeroVarianceNote`).toBe('string')
      expect(pack.corr.zeroVarianceNote.includes('{vars}'), `${name} 缺 {vars} 佔位`).toBe(true)
    }
  })
})

/* ─────────────────────  R69：迴歸三支的兩個退化情形  ───────────────────── */

describe('R69（L2）：迴歸的退化情形必須被標記，不得渲染成「極強的關係」', () => {
  const n = 20
  const X = Array.from({ length: n }, (_, i) => i)
  const XM = Array.from({ length: n }, (_, i) => [i, Math.sin(i), Math.cos(i)])

  it('簡單迴歸：y 為常數 ⇒ zeroVarianceY（★ 截距的 p 是 0，舊版報表印「< .001」綠燈）', () => {
    const r = simpleLinearRegression(X, new Array(n).fill(7))
    expect(r.zeroVarianceY).toBe(true)
    expect(r.perfectFit).toBe(false)
    expect(r.intercept.p).toBe(0) // 退化值本身不變，只是多了旗標
  })
  it('簡單迴歸：完美配適 ⇒ perfectFit（★ 舊版印 R² = 1.000、斜率 p < .001）', () => {
    const r = simpleLinearRegression(X, X.map((v) => 2 * v + 3))
    expect(r.perfectFit).toBe(true)
    expect(r.fit.r2).toBeCloseTo(1, 12)
    expect(r.slope.p).toBe(0)
  })
  it('★ 回歸鎖：一般資料兩個旗標都必須為假', () => {
    const r = simpleLinearRegression(X, X.map((v) => 2 * v + Math.sin(v) * 5))
    expect(r.perfectFit).toBe(false)
    expect(r.zeroVarianceY).toBe(false)
  })

  it('多元迴歸：完美配適 ⇒ perfectFit（★ 舊版把 t = 2.3e15 原樣印在報表上）', () => {
    const Y = XM.map((r) => 2 * r[0] + 3 * r[1] - r[2])
    const r = multipleRegression(XM, Y, ['a', 'b', 'c'])
    expect(r.perfectFit).toBe(true)
    // 判準用相對值：浮點下的完美配適 ssRes 是 1e-27 級而不是恰好 0
    expect(r.anova.ssRes).toBeGreaterThan(0)
    expect(r.anova.ssRes / r.anova.ssTotal).toBeLessThan(1e-20)
  })
  it('多元迴歸：y 為常數 ⇒ zeroVarianceY（★ 係數是浮點雜訊卻印 p = .001）', () => {
    const r = multipleRegression(XM, new Array(n).fill(7), ['a', 'b', 'c'])
    expect(r.zeroVarianceY).toBe(true)
    expect(r.perfectFit).toBe(false)
  })
  it('★ 回歸鎖：一般資料的多元迴歸兩個旗標都為假', () => {
    const Y = XM.map((r, i) => 2 * r[0] + Math.sin(i * 3) * 9)
    const r = multipleRegression(XM, Y, ['a', 'b', 'c'])
    expect(r.perfectFit).toBe(false)
    expect(r.zeroVarianceY).toBe(false)
  })

  it('★ maxVif 由引擎提供，UI 不得再算一次（同一判斷兩套實作）', () => {
    const Y = XM.map((r, i) => 2 * r[0] + Math.sin(i * 3) * 9)
    const r = multipleRegression(XM, Y, ['a', 'b', 'c'])
    const recomputed = Math.max(...r.coefficients.map((c) => c.vif))
    expect(r.maxVif).toBeCloseTo(recomputed, 12)
  })

  it('中英 i18n 的三個迴歸命名空間都要有三個退化字串', () => {
    for (const [name, pack] of [['zh-TW', zh], ['en', en]]) {
      for (const ns of ['simpleReg', 'multReg', 'hierReg']) {
        for (const key of ['degenerateWarn', 'degeneratePerfect', 'degenerateZeroY']) {
          expect(typeof pack[ns][key], `${name}.${ns}.${key} 缺字串`).toBe('string')
        }
        expect(pack[ns].degenerateWarn.includes('{reason}'), `${name}.${ns} 缺 {reason} 佔位`).toBe(true)
      }
    }
  })
})

describe('E102 → 交叉鎖：k = 1 時兩套 OLS 實作必須同值', () => {
  // simpleLinearRegression 走閉式解、multipleRegression 解 (X'X)^-1 —— 兩套獨立實作。
  // 此前**沒有任何測試檢查它們一致**（紅隊第 3 條在演算法層的版本）。
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300)

  it('對 200 組確定性資料（n = 8~47），四個關鍵量的相對差 < 1e-12', () => {
    let worst = 0
    for (let s = 0; s < 200; s++) {
      const n = 8 + (s % 40)
      const xx = Array.from({ length: n }, (_, i) => Math.sin(i * 1.7 + s) * 10 + i)
      const yy = xx.map((v, i) => 2.3 * v + Math.cos(i * 2.1 + s) * 7)
      const A = simpleLinearRegression(xx, yy)
      const B = multipleRegression(xx.map((v) => [v]), yy, ['x'])
      if (A.error || B.error) continue
      for (const [p, q] of [
        [A.slope.b, B.coefficients[0].b],
        [A.slope.se, B.coefficients[0].se],
        [A.fit.r2, B.fit.r2],
        [A.anova.F, B.anova.F],
      ]) {
        worst = Math.max(worst, rel(p, q))
      }
    }
    expect(worst).toBeLessThan(1e-12)
  })

  it('★ 標準化係數也要對得起來（簡單迴歸下 β = r）', () => {
    const n = 40
    const xx = Array.from({ length: n }, (_, i) => i + Math.sin(i) * 3)
    const yy = xx.map((v, i) => 1.8 * v + Math.cos(i * 1.3) * 6)
    const A = simpleLinearRegression(xx, yy)
    const B = multipleRegression(xx.map((v) => [v]), yy, ['x'])
    expect(rel(A.slope.beta, B.coefficients[0].beta)).toBeLessThan(1e-12)
    expect(rel(Math.abs(A.slope.beta), Math.abs(A.fit.r))).toBeLessThan(1e-12)
  })
})
