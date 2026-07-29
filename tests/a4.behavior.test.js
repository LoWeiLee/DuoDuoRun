/**
 * 階段 A / A4 的行為鎖（2026-07-29）
 *
 * 這一批鎖的都不是「數字對不對」——那由 compare.test.js 管——
 * 而是紅隊 R37–R41 修掉的**呈現層與守衛層**行為。它們的共同特徵是：
 * 引擎照樣算得出數字、逐值比對照樣全綠，但使用者看到的東西是錯的或不存在的。
 *
 * 對應的紅隊編號寫在各 describe 上。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exploratoryFactorAnalysis } from '../src/lib/stats/efa.js'
import { runEFA } from '../src/analyses/efa/compute.js'
import { runNCACompute } from '../src/analyses/nca/compute.js'
import { runLDA } from '../src/analyses/lda/compute.js'
import { ncaVerdict, NCA_ALPHA, NCA_MIN_EFFECT } from '../src/lib/stats/nca.js'
import zh from '../src/i18n/zh-TW.js'
import en from '../src/i18n/en.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DS = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/datasets.json'), 'utf8'))
const main = DS.main
const ITEMS = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']

describe('R40-h：EFA 對零變異變項硬擋（原本靜默放行）', () => {
  const withDead = main.map((r) => ({ ...r, dead: 1 }))

  it('零變異欄 → 專屬錯誤碼，並指名是哪幾個變項', () => {
    const r = exploratoryFactorAnalysis(withDead, ['dead', ...ITEMS], { nFactors: 2 })
    expect(r.error).toBe('zero-variance-vars')
    expect(r.vars).toEqual(['dead'])
  })

  it('多個零變異欄要全部列出（訊息才能一次講完）', () => {
    const two = main.map((r) => ({ ...r, dead: 1, dead2: 7 }))
    const r = exploratoryFactorAnalysis(two, ['dead', 'dead2', ...ITEMS], { nFactors: 2 })
    expect(r.vars).toEqual(['dead', 'dead2'])
  })

  it('compute 層要把變項名帶給 UI（比照 A1 的 R7「指名構念」）', () => {
    const r = runEFA(withDead, { selectedVars: ['dead', ...ITEMS], nFactors: 2 })
    expect(r.error).toBe('zero-variance-vars')
    expect(r.vars).toEqual(['dead'])
  })

  it('★ 回歸鎖：正常資料不得被誤擋', () => {
    const r = exploratoryFactorAnalysis(main, ITEMS, { nFactors: 2, rotation: 'varimax' })
    expect(r.error).toBeUndefined()
    expect(r.nFactors).toBe(2)
  })
})

describe('R40-i：EFA 完全共線時不再亮綠燈', () => {
  const collinear = main.map((r) => ({ ...r, xdup: r.x1 }))
  const r = exploratoryFactorAnalysis(collinear, ['x1', 'xdup', 'x2'], { nFactors: 2 })

  it('|R| = 0 → Bartlett 標記 singular，chi2/p 為 NaN 而不是 Infinity/0', () => {
    // 修復前回 { chi2: Infinity, p: 0 }：UI 的 fmtNum(Infinity) 印「—」、fmtP(0) 印「< .001」，
    // 於是完全共線的資料會亮綠燈「球形檢定顯著，適合 EFA」。
    expect(r.bartlett.singular).toBe(true)
    expect(Number.isNaN(r.bartlett.chi2)).toBe(true)
    expect(Number.isNaN(r.bartlett.p)).toBe(true)
  })

  it('KMO 不可得時回傳原因，而不是 null（原本整張卡片會靜默消失）', () => {
    expect(r.kmo.unavailable).toBe('singular')
  })

  it('★ 回歸鎖：正常資料的 KMO 仍算得出來且 unavailable 為 null', () => {
    const ok = exploratoryFactorAnalysis(main, ITEMS, { nFactors: 2 })
    expect(ok.kmo.unavailable).toBe(null)
    expect(ok.kmo.overall).toBeGreaterThan(0.7)
    expect(ok.bartlett.singular).toBeUndefined()
  })
})

describe('R40-d：EFA 選了 varimax 但因子數 < 2 時不再靜默', () => {
  it('k = 1 → rotationSkipped 為 true（UI 據此顯示說明）', () => {
    const r = runEFA(main, { selectedVars: ITEMS, nFactors: 1, rotation: 'varimax' })
    expect(r.rotation).toBe('none')
    expect(r.rotationSkipped).toBe(true)
  })

  it('k = 2 → 正常轉軸，不顯示說明', () => {
    const r = runEFA(main, { selectedVars: ITEMS, nFactors: 2, rotation: 'varimax' })
    expect(r.rotation).toBe('varimax')
    expect(r.rotationSkipped).toBe(false)
  })

  it('使用者本來就選「不轉軸」時不算被略過', () => {
    const r = runEFA(main, { selectedVars: ITEMS, nFactors: 1, rotation: 'none' })
    expect(r.rotationSkipped).toBe(false)
  })
})

describe('R37-b／R38-e：listwise 剔除筆數必須被揭露', () => {
  const holed = main.map((r, i) => (i < 7 ? { ...r, x1: null } : r))

  it('NCA compute 回傳 nDropped 與 nTotal', () => {
    const r = runNCACompute(holed, { xVar: 'x1', yVar: 'y' })
    expect(r.nTotal).toBe(main.length)
    expect(r.nDropped).toBe(7)
    expect(r.nca.n).toBe(main.length - 7)
  })

  it('LDA compute 回傳 nDropped 與 nTotal', () => {
    const r = runLDA(holed, { groupVar: 'group3', predictors: ['x1', 'x2', 'x3'] })
    expect(r.nTotal).toBe(main.length)
    expect(r.nDropped).toBe(7)
    expect(r.n).toBe(main.length - 7)
  })

  it('★ 回歸鎖：完整資料的 nDropped 為 0（UI 才不會多印一段警語）', () => {
    expect(runNCACompute(main, { xVar: 'x1', yVar: 'y' }).nDropped).toBe(0)
    expect(runLDA(main, { groupVar: 'group3', predictors: ['x1', 'x2', 'x3'] }).nDropped).toBe(0)
  })
})

describe('R37-a／R41：含 > 與 = 的錯誤碼在兩份 i18n 都要查得到', () => {
  // 這 16 個錯誤碼全部含 `>` 或 `=`，因此一直被 errorCodes.test.js 的舊正規式
  // （/'([A-Za-z][\w-]*)'/）靜默略過 —— 觸發時使用者螢幕上直接看到程式碼。
  // errorCodes.test.js 的正規式已放寬，這裡再把 A4 實際踩到的那一個單獨釘住。
  it("nca.js 的 'need-n>=5' 中英都有訊息（實測使用者原本看到裸代碼）", () => {
    expect(zh.errors.stats['need-n>=5']).toBeTruthy()
    expect(en.errors.stats['need-n>=5']).toBeTruthy()
    expect(zh.errors.stats['need-n>=5']).not.toBe('need-n>=5')
  })

  it('EFA 零變異的訊息帶得動 {vars} 插槽', () => {
    for (const t of [zh, en]) {
      expect(t.efa.config['zero-variance-vars']).toContain('{vars}')
    }
  })
})

describe('R38-a／R38-b／R38-c：LDA 的三項揭露有對應字串', () => {
  it('未標準化係數表、符號任意性、事前機率慣例中英都齊', () => {
    for (const t of [zh, en]) {
      expect(t.lda.result.unstdCoefTitle).toBeTruthy()
      expect(t.lda.result.unstdCoefHint).toBeTruthy()
      expect(t.lda.result.signNote).toBeTruthy()
      expect(t.lda.result.priorNote).toBeTruthy()
    }
    // 事前機率的慣例分歧必須點名 SPSS，否則使用者不會知道要去比對哪一項設定
    expect(zh.lda.result.priorNote).toContain('SPSS')
    expect(en.lda.result.priorNote).toContain('SPSS')
  })

  it('未標準化係數確實存在於引擎回傳（表格才有東西可印）', () => {
    const r = runLDA(main, { groupVar: 'group3', predictors: ['x1', 'x2', 'x3'] })
    expect(r.functions.length).toBe(2)
    for (const fn of r.functions) {
      expect(fn.unstandardizedCoefficients).toHaveLength(3)
      expect(fn.unstandardizedCoefficients.every(Number.isFinite)).toBe(true)
    }
  })
})

describe('R39-a／R39-b：CFA 敘述句的未收斂與 SE 不可得警語', () => {
  it('兩條警語中英都有，且措辭要明確到會讓人停手', () => {
    for (const t of [zh, en]) {
      expect(t.cfa.apa.notConvergedCaveat).toBeTruthy()
      expect(t.cfa.apa.noSeCaveat).toBeTruthy()
    }
    // 「不可靠 / unreliable」是這句話的重點，弱化成「請注意」等於沒說
    expect(zh.cfa.apa.notConvergedCaveat).toContain('不可靠')
    expect(en.cfa.apa.notConvergedCaveat).toContain('unreliable')
  })
})

describe('R40-b／R40-c：EFA 的 MSA 與 |R| 不再是孤兒欄位', () => {
  const r = exploratoryFactorAnalysis(main, ITEMS, { nFactors: 2, rotation: 'varimax' })

  it('perVar 逐變項齊全（MSA 表逐列要有值）', () => {
    expect(r.kmo.perVar).toHaveLength(ITEMS.length)
    expect(r.kmo.perVar.every((v) => Number.isFinite(v) && v > 0 && v < 1)).toBe(true)
  })

  it('determinant 為 |R|，與特徵值乘積一致', () => {
    const prod = r.eigenvalues.reduce((a, b) => a * b, 1)
    expect(Math.abs(r.determinant - prod)).toBeLessThan(1e-12)
  })

  it('MSA 與 |R| 的中英字串都在（否則表格印出空白標題）', () => {
    for (const t of [zh, en]) {
      expect(t.efa.result.msaTitle).toBeTruthy()
      expect(t.efa.result.msaHint).toBeTruthy()
      expect(t.efa.result.detR).toContain('{det}')
      expect(t.efa.result.cols.msa).toBeTruthy()
    }
  })
})

describe('R42：NCA 的整體判準只有一份，且複合口徑必須說得出是哪一項沒過', () => {
  it('判準常數就是實際使用的那兩個數字', () => {
    expect(NCA_ALPHA).toBe(0.05)
    expect(NCA_MIN_EFFECT).toBe(0.1)
  })

  it('★ 兩項皆過才算支持——p 過但 d 不過必須判不支持', () => {
    // 實測案例：內建示範資料 x2 → rater1，d = .0787、p = .0036。
    // 修復前報表印「不足以作為必要條件」而完全不解釋是效果量那一關沒過。
    const v = ncaVerdict({ p_ce: 0.0036 }, 0.0787)
    expect(v.pOk).toBe(true)
    expect(v.dOk).toBe(false)
    expect(v.supported).toBe(false)
  })

  it('d 過但 p 不過同樣判不支持，且兩個旗標分得開', () => {
    const v = ncaVerdict({ p_ce: 0.42 }, 0.31)
    expect(v.pOk).toBe(false)
    expect(v.dOk).toBe(true)
    expect(v.supported).toBe(false)
  })

  it('★ 回歸鎖：兩項皆過才回 true', () => {
    expect(ncaVerdict({ p_ce: 0.002 }, 0.24).supported).toBe(true)
  })

  it('沒有 permutation 結果時不得誤判為支持（p 為 NaN）', () => {
    const v = ncaVerdict(null, 0.9)
    expect(Number.isNaN(v.p)).toBe(true)
    expect(v.supported).toBe(false)
  })

  it('★ 實跑內建示範資料：確實存在「p < .05 但被判不支持」的配對，這一段說明不是假想情境', () => {
    const holed = main
    const r = runNCACompute(holed, { xVar: 'x2', yVar: 'rater1' })
    const v = ncaVerdict(r.nca.test, r.nca.ceilings.ce_fdh.effectSize)
    expect(v.p).toBeLessThan(0.05)
    expect(v.supported).toBe(false)
  })

  it('判準說明的四種情境字串中英都在，且點名兩項門檻', () => {
    for (const t of [zh, en]) {
      expect(t.nca.result.verdictNote).toContain('{alpha}')
      expect(t.nca.result.verdictNote).toContain('{dMin}')
      expect(t.nca.result.verdictNote).toContain('{reason}')
      expect(t.nca.result.verdictBoth).toBeTruthy()
      expect(t.nca.result.verdictNeither).toBeTruthy()
      expect(t.nca.result.verdictPOnly).toBeTruthy()
      expect(t.nca.result.verdictDOnly).toBeTruthy()
    }
  })
})

describe('R43：NCA 的 APA 句必須帶「必要非充分」與觀察資料的限制', () => {
  it('caveat 中英都在，且 APA 句本體掛得上這個插槽', () => {
    for (const t of [zh, en]) {
      expect(t.nca.apa.caveat).toBeTruthy()
      expect(t.nca.apa.sentence).toContain('{caveat}')
    }
    // 「不蘊含充分」是這句話的重點，弱化成「請謹慎解讀」等於沒說
    expect(zh.nca.apa.caveat).toContain('充分')
    expect(en.nca.apa.caveat).toContain('sufficiency')
    // 觀察資料的因果限制也要在
    expect(zh.nca.apa.caveat).toContain('因果')
    expect(en.nca.apa.caveat).toContain('causal')
  })

  it('★ 未達顯著的那一句不掛 caveat（沒有做出宣稱就不必收回）', () => {
    for (const t of [zh, en]) expect(t.nca.apa.sentenceNs).not.toContain('{caveat}')
  })
})

describe('R47：CR-FDH 的線方程式與瓶頸表的 ceiling 來源必須說得出來', () => {
  it('引擎確實回傳 CR-FDH 的截距與斜率（表格才有東西可印）', () => {
    const r = runNCACompute(main, { xVar: 'x1', yVar: 'y' })
    const cr = r.nca.ceilings.cr_fdh
    expect(Number.isFinite(cr.intercept)).toBe(true)
    expect(Number.isFinite(cr.slope)).toBe(true)
  })

  it('★ cr_fdh.bottleneck 目前是 ce_fdh 的複本——這條鎖住現況，回傳契約若改動必須同步改文件', () => {
    // 見 nca-cr-fdh.md 的 R47：移除／改名屬回傳契約變更，Kevin 2026-07-29 裁決留階段 B。
    const r = runNCACompute(main, { xVar: 'x1', yVar: 'y' })
    expect(JSON.stringify(r.nca.ceilings.cr_fdh.bottleneck))
      .toBe(JSON.stringify(r.nca.ceilings.ce_fdh.bottleneck))
  })

  it('ceiling 方程式欄與瓶頸表來源說明的中英字串都在', () => {
    for (const t of [zh, en]) {
      expect(t.nca.result.cols.equation).toBeTruthy()
      expect(t.nca.result.ceilingStep).toBeTruthy()
      expect(t.nca.result.bottleneckSource).toBeTruthy()
    }
    // 說明必須點名 CE-FDH，否則等於沒說是哪一條
    expect(zh.nca.result.bottleneckSource).toContain('CE-FDH')
    expect(en.nca.result.bottleneckSource).toContain('CE-FDH')
  })
})
