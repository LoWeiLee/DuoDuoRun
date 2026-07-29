/**
 * 階段 A / A5a 的行為鎖（2026-07-29）
 *
 * 對應紅隊 R50–R52。R50 是本階段第一個 **L4 真 bug**（數字算錯），
 * 其餘兩項是「引擎算了、使用者看不到」與「該檢核沒檢核」。
 */
import { describe, it, expect } from 'vitest'
import { ptukeyUpper } from '../src/lib/stats/ptukey.js'
import { independentT, pairedT, oneSampleT } from '../src/lib/stats/ttest.js'
import { runTwoWayAnova } from '../src/analyses/twoWayAnova/compute.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DS = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/datasets.json'), 'utf8'))
const main = DS.main

describe('R50（L4）：ptukey 在高 df 不得再失準', () => {
  // 舊實作的外層積分上限隨 √df 外擴、節點固定 200，df ≥ 100 起誤差達 1e-2 ~ 7.6e-1。
  // 這裡的期望值來自 scipy.stats.studentized_range.sf（同 tukey_ptukey_grid 基準）。
  const cases = [
    [3.5, 3, 57, 0.0425178906],
    [3.5, 3, 100, 0.0394954634],
    [3.5, 3, 120, 0.0388333749],   // ★ 舊實作 0.0685593 —— .05 判定翻面
    [3.0, 3, 200, 0.0880983418],   // ★ 舊實作 0.0481682 —— .05 判定翻面（反向）
    [4.5, 3, 999, 0.0042991124],   // ★ 舊實作 0.7864176
  ]
  for (const [q, k, df, expected] of cases) {
    it(`q=${q} k=${k} df=${df} → p ≈ ${expected}`, () => {
      expect(ptukeyUpper(q, k, df)).toBeCloseTo(expected, 6)
    })
  }

  it('★ 單調性：固定 k 與 df，p 必須隨 q 遞減（舊實作在高 df 會亂跳）', () => {
    for (const df of [20, 57, 120, 300, 999]) {
      let prev = 1
      for (const q of [1, 2, 3, 4, 5, 6]) {
        const p = ptukeyUpper(q, 3, df)
        expect(p, `df=${df} q=${q} 不遞減`).toBeLessThanOrEqual(prev + 1e-12)
        prev = p
      }
    }
  })

  it('★ df 方向的連續性：p 隨 df 的變化必須平滑（舊實作在 df≈100 與 df=1000 有跳斷）', () => {
    for (const df of [95, 99, 100, 101, 105, 995, 999, 1000, 1001, 1005]) {
      const p = ptukeyUpper(3.5, 3, df)
      expect(p, `df=${df} 落在合理帶外`).toBeGreaterThan(0.030)
      expect(p).toBeLessThan(0.045)
    }
  })
})

describe('R51（L2）：t 檢定零變異時不得偽裝成顯著', () => {
  const flat = [5, 5, 5, 5, 5, 5, 5, 5]

  it('成對 t：差值全同 → 旗標為真（引擎行為不變）', () => {
    const r = pairedT(flat, flat.map((x) => x + 2))
    expect(r.zeroVarianceWarning).toBe(true)
    expect(Number.isFinite(r.t)).toBe(false)
  })

  it('單樣本 t：常數欄 → 旗標為真', () => {
    expect(oneSampleT(flat, 4).zeroVarianceWarning).toBe(true)
  })

  it('★ 回歸鎖：正常資料的旗標必須為假（否則整個報表都會掛警語）', () => {
    const x1M = main.filter((r) => r.group2 === 'M').map((r) => Number(r.x1))
    const x1F = main.filter((r) => r.group2 === 'F').map((r) => Number(r.x1))
    expect(independentT(x1M, x1F).zeroVarianceWarning).toBe(false)
    expect(pairedT(main.map((r) => Number(r.cond1)), main.map((r) => Number(r.cond2))).zeroVarianceWarning).toBe(false)
    expect(oneSampleT(main.map((r) => Number(r.y)), 40).zeroVarianceWarning).toBe(false)
  })

  it('警告與 APA 警語的中英字串都在，且措辭要明確到會讓人停手', () => {
    for (const t of [zh, en]) {
      expect(t.ttest.result.zeroVarianceWarn).toBeTruthy()
      expect(t.ttest.apa.zeroVarianceCaveat).toBeTruthy()
    }
    expect(zh.ttest.apa.zeroVarianceCaveat).toContain('不可解讀')
    expect(en.ttest.apa.zeroVarianceCaveat).toContain('can be interpreted')
    expect(en.ttest.apa.zeroVarianceCaveat).toContain('must not be reported')
  })
})

describe('R52（L2）：雙因子 ANOVA 必須有前提檢核', () => {
  const r = runTwoWayAnova(main, { depVar: 'y', factorA: 'group2', factorB: 'group3' })

  it('回傳 assumptions：細格 Levene ＋ 殘差 Shapiro-Wilk', () => {
    expect(r.assumptions).toBeTruthy()
    expect(r.assumptions.nCells).toBe(6)
    expect(Number.isFinite(r.assumptions.homogeneity.F)).toBe(true)
    expect(Number.isFinite(r.assumptions.normality.W)).toBe(true)
  })

  it('★ Levene 跑的是 A×B 細格，不是單一因子的水準（df1 = 細格數 − 1）', () => {
    expect(r.assumptions.homogeneity.df1).toBe(5)
    expect(r.assumptions.homogeneity.df2).toBe(54)
  })

  it('★ 回歸鎖：新增 assumptions 不得動到任何既有數值', () => {
    expect(r.effectA.ss).toBeCloseTo(77.423852913, 6)
    expect(r.effectB.ss).toBeCloseTo(503.238107056, 6)
    expect(r.effectAB.ss).toBeCloseTo(74.463110577, 6)
    expect(r.errorTerm.ss).toBeCloseTo(2635.250336338, 6)
  })

  it('前提檢核的中英字串都齊，且說明要點出「細格」與「殘差」兩個關鍵詞', () => {
    for (const t of [zh, en]) {
      expect(t.anova2.result.assumpTitle).toBeTruthy()
      expect(t.anova2.result.homogeneityCells).toBeTruthy()
      expect(t.anova2.result.normalityResid).toBeTruthy()
      expect(t.anova2.result.assumpHint).toBeTruthy()
    }
    expect(zh.anova2.result.assumpHint).toContain('細格')
    expect(zh.anova2.result.assumpHint).toContain('殘差')
    expect(en.anova2.result.assumpHint).toContain('cell')
    expect(en.anova2.result.assumpHint).toContain('residual')
  })
})
