/**
 * PLS-SEM APA 敘述句的行為測試（2026-07-25，P1）
 *
 * 為什麼要獨立測：`Narrative` 是 UI 元件、只在 jsdom 環境跑，而 jsdom 在 Cowork 沙盒
 * 卡在環境初始化（見 validation-report「Session Q2」節）。把句子組裝抽成純函式
 * `buildNarrative` 之後，就能在 node 環境直接餵合成結果物件驗證——這也是本專案
 * 「邏輯與 UI 解耦」不變量的實際好處。
 *
 * 測的是「句子是否忠實反映結果，且方法界線有沒有被寫進去」，
 * 不是逐字比對文案（文案會改，界線不能掉）。
 */
import { describe, it, expect } from 'vitest'
import { buildNarrative } from '../src/analyses/pls/apaNarrative.js'

/** 最小可用的基底結果（只含 buildNarrative 必讀的欄位） */
function baseResult(extra = {}) {
  return {
    estimate: {
      meta: { scheme: 'path', consistent: false, n: 300 },
      reliability: [
        { lv: 'F1', nIndicators: 3, alpha: 0.82, rhoC: 0.89, ave: 0.73 },
        { lv: 'F2', nIndicators: 3, alpha: 0.80, rhoC: 0.88, ave: 0.71 },
      ],
      lvModes: { F1: 'reflective', F2: 'reflective' },
      outerLoadings: [
        { lv: 'F1', indicator: 'i1', loading: 0.86 }, { lv: 'F1', indicator: 'i2', loading: 0.85 },
        { lv: 'F1', indicator: 'i3', loading: 0.85 },
        { lv: 'F2', indicator: 'i4', loading: 0.84 }, { lv: 'F2', indicator: 'i5', loading: 0.85 },
        { lv: 'F2', indicator: 'i6', loading: 0.84 },
      ],
      outerWeights: [],
      htmt: { lvNames: ['F1', 'F2'], matrix: [[null, 0.62], [0.62, null]] },
      fit: { estimated: { srmr: 0.05 } },
      pathCoefficients: [{ from: 'F1', to: 'F2', coef: 0.42 }],
      structural: [{ lv: 'F2', r2: 0.18, predictors: [] }],
    },
    bootstrap: null,
    q2: null,
    mga: null, predict: null, ipma: null, cta: null, copula: null, fimix: null, pos: null,
    ...extra,
  }
}

const LANGS = ['zh-TW', 'en']

describe('APA 敘述句：W5／W6 區塊', () => {
  it('基底結果不含任何 W5／W6 句子（未開啟就不該出現）', () => {
    for (const lang of LANGS) {
      const text = buildNarrative(baseResult(), lang)
      expect(text.length).toBeGreaterThan(20)
      for (const kw of ['MGA', 'PLSpredict', 'IPMA', 'CTA', 'copula', 'FIMIX', 'POS']) {
        expect(text).not.toContain(kw)
      }
    }
  })

  it('★ 任一區塊回傳 error 時整段略過，不吐半成品句子', () => {
    const res = baseResult({
      mga: { error: 'mga-bad-groups', message: 'x' },
      predict: { error: 'boom' }, ipma: { error: 'boom' }, cta: { error: 'boom' },
      copula: { error: 'boom' }, fimix: { error: 'boom' }, pos: { error: 'boom' },
    })
    for (const lang of LANGS) {
      const text = buildNarrative(res, lang)
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('NaN')
      expect(text).not.toContain('{')
    }
  })

  it('MGA：兩群係數、差異、permutation p 與顯著判讀入句；恆等性前提必須提及', () => {
    const res = baseResult({
      mga: {
        groups: ['男', '女'], n1: 150, n2: 148, nPermValid: 999,
        paths: [{
          from: 'F1', to: 'F2', diff: 0.31,
          group1: { coef: 0.58 }, group2: { coef: 0.27 },
          permutation: { p: 0.004 }, henselerP: 0.006,
          parametric: { p: 0.005 }, welch: { p: 0.005 },
        }],
      },
    })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('0.58')
    expect(zh).toContain('0.27')
    expect(zh).toContain('0.31')
    expect(zh).toContain('兩群差異顯著')
    expect(zh).toContain('MICOM')          // ★ 恆等性前提
    const en = buildNarrative(res, 'en')
    expect(en).toContain('significant group difference')
    expect(en).toContain('measurement invariance')
  })

  it('PLSpredict：Q²predict 與 RMSE 對 LM 的計數正確，三種判讀各自對應', () => {
    const mk = (inds) => baseResult({
      predict: { k: 10, indicators: inds, cvpat: {
        vsIA: { dBar: -0.031, t: -2.4, p: 0.017 },
        vsLM: { dBar: -0.008, t: -0.9, p: 0.371 },
      } },
    })
    const allGood = mk([
      { lv: 'F2', indicator: 'i4', q2predict: 0.21, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: 0.15, rmse: 0.85, mae: 0.6, lm: { rmse: 0.91 } },
    ])
    const allBad = mk([
      { lv: 'F2', indicator: 'i4', q2predict: -0.02, rmse: 0.95, mae: 0.7, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: -0.05, rmse: 0.98, mae: 0.7, lm: { rmse: 0.91 } },
    ])
    const mixed = mk([
      { lv: 'F2', indicator: 'i4', q2predict: 0.21, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: -0.05, rmse: 0.98, mae: 0.7, lm: { rmse: 0.91 } },
    ])
    expect(buildNarrative(allGood, 'zh-TW')).toContain('優於基準的樣本外預測力')
    expect(buildNarrative(allBad, 'zh-TW')).toContain('未展現優於基準')
    expect(buildNarrative(mixed, 'zh-TW')).toContain('僅在部分指標上')
    // CVPAT 兩個對照都要出現
    const en = buildNarrative(allGood, 'en')
    expect(en).toContain('CVPAT')
    expect(en).toContain('-0.031')
    expect(en).toContain('-0.008')
  })

  it('IPMA：重要性／績效入句，且必須聲明 0–100 重標定用的是觀察極值', () => {
    const res = baseResult({
      ipma: {
        target: 'Y', targetPerformance: 68.4,
        constructs: [{ lv: 'F1', importance: 0.42, performance: 71.2 }],
        indicators: [],
      },
    })
    expect(buildNarrative(res, 'zh-TW')).toContain('觀察到的最小／最大值')
    expect(buildNarrative(res, 'en')).toContain('observed minimum and maximum')
  })

  it('cIPMA：d 與 p 入句，且必須寫出「必要不等於充分」與 d≥.10、p<.05 判準', () => {
    const res = baseResult({
      ipma: {
        target: 'Y', targetPerformance: 68.4,
        constructs: [{ lv: 'F1', importance: 0.42, performance: 71.2 }],
        indicators: [],
        cipma: { conditions: [
          { lv: 'F1', importance: 0.42, performance: 71.2, effectSizeCE: 0.24,
            effectSizeCR: 0.19, p: 0.008, necessary: true, bottleneck: [] },
          { lv: 'F2', importance: 0.11, performance: 60.0, effectSizeCE: 0.03,
            effectSizeCR: 0.02, p: 0.412, necessary: false, bottleneck: [] },
        ] },
      },
    })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('構成必要條件')
    expect(zh).toContain('未構成必要條件')
    expect(zh).toContain('必要」不等於「充分')
    expect(zh).toContain('.10')
    const en = buildNarrative(res, 'en')
    expect(en).toContain('does not imply being sufficient')
  })

  it('CTA：形成型／反映型判讀與 Bonferroni 校正後 α 入句', () => {
    const res = baseResult({
      cta: { blocks: [
        { lv: 'F1', nIndicators: 5, nTetrads: 5, alphaAdjusted: 0.01,
          verdict: 'reflective', declaredMode: 'reflective', conflict: false, tetrads: [] },
        { lv: 'F2', nIndicators: 4, nTetrads: 2, alphaAdjusted: 0.025,
          verdict: 'formative', declaredMode: 'reflective', conflict: true, tetrads: [] },
      ] },
    })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('Bonferroni')
    expect(zh).toContain('反映型設定被否證')
    expect(zh).toContain('與反映型設定一致')
    expect(zh).toContain('0.0100')
    expect(zh).toContain('少於四個')   // 指標 <4 無法檢定的界線
  })

  it('★ copula：候選構念未拒絕常態時，必須明說結果不足以判定內生性', () => {
    const sig = baseResult({
      copula: {
        nBootstrap: 300, n: 300,
        normality: [{ lv: 'F1', D: 0.09, p: 0.002, nonNormal: true }],
        equations: [{ endogenous: 'F2', predictors: ['F1'], models: [
          { copulas: ['F1'], singular: false, r2: 0.32,
            coefficients: [{ name: 'F1', coef: 0.5, se: 0.1, ciLower: 0.3, ciUpper: 0.7, p: 0.001, isCopula: false },
              { name: 'c(F1)', coef: -0.22, se: 0.08, ciLower: -0.38, ciUpper: -0.06, p: 0.007, isCopula: true }] },
        ] }],
      },
    })
    const zhSig = buildNarrative(sig, 'zh-TW')
    expect(zhSig).toContain('可能存在內生性')
    expect(zhSig).toContain('符合 Park & Gupta (2012) 的識別條件')

    const gated = baseResult({
      copula: {
        nBootstrap: 300, n: 300,
        normality: [{ lv: 'F1', D: 0.03, p: 0.42, nonNormal: false }],
        equations: [{ endogenous: 'F2', predictors: ['F1'], models: [
          { copulas: ['F1'], singular: false, r2: 0.32,
            coefficients: [{ name: 'c(F1)', coef: -0.02, se: 0.08, ciLower: -0.2, ciUpper: 0.16, p: 0.8, isCopula: true }] },
        ] }],
      },
    })
    const zhGate = buildNarrative(gated, 'zh-TW')
    expect(zhGate).toContain('未能拒絕常態')
    expect(zhGate).toContain('不足以作為內生性的判準')
    expect(buildNarrative(gated, 'en')).toContain('cannot be used to decide the endogeneity question')
  })

  it('★ FIMIX：EN 未達 .50 時必須明說不宜據此分群解讀', () => {
    const mk = (en) => baseResult({
      fimix: {
        n: 300, lnL: -410.2, iterations: 42, restarts: 10,
        criteria: { en }, selection: [],
        segments: [
          { index: 1, share: 0.6, assignedSize: 180, equations: [] },
          { index: 2, share: 0.4, assignedSize: 120, equations: [] },
        ],
      },
    })
    expect(buildNarrative(mk(0.62), 'zh-TW')).toContain('達 .50 門檻')
    const bad = buildNarrative(mk(0.31), 'zh-TW')
    expect(bad).toContain('未達 .50 門檻')
    expect(bad).toContain('不宜據此分群解讀')
    // K=1 時 EN 為 null，不應吐出 NaN
    const noEn = buildNarrative(mk(null), 'zh-TW')
    expect(noEn).not.toContain('NaN')
    expect(noEn).not.toContain('{en}')
  })

  it('★ POS：必須明說目標函數隨段數上升、不可用來選段數，並揭露簡化版範圍', () => {
    const res = baseResult({
      pos: {
        n: 300, passes: 4, moves: 190, starts: 10, minSize: 15,
        objective: 1.576, sseTotal: 65.77, r2Overall: 0.78,
        global: { sse: 268.7, objective: 0.101, r2: 0.101, equations: [] },
        segments: [
          { index: 1, size: 195, share: 0.65, sse: 30.1, equations: [] },
          { index: 2, size: 105, share: 0.35, sse: 35.7, equations: [] },
        ],
      },
    })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('不可用於決定段數')
    expect(zh).toContain('簡化版')
    expect(zh).toContain('195 / 105')
    expect(buildNarrative(res, 'en')).toContain('cannot be used to choose K')
  })

  it('★ 八個區塊同時開啟：中英兩版都不得殘留未填模板或 NaN', () => {
    const res = baseResult({
      mga: {
        groups: ['A', 'B'], n1: 150, n2: 150, nPermValid: 999,
        paths: [{ from: 'F1', to: 'F2', diff: 0.3, group1: { coef: 0.6 }, group2: { coef: 0.3 },
          permutation: { p: 0.01 }, henselerP: 0.01, parametric: { p: 0.01 }, welch: { p: 0.01 } }],
      },
      predict: { k: 10, indicators: [
        { lv: 'F2', indicator: 'i4', q2predict: 0.2, rmse: 0.8, mae: 0.6, lm: { rmse: 0.9 } },
      ], cvpat: { vsIA: { dBar: -0.03, t: -2.4, p: 0.02 }, vsLM: { dBar: -0.01, t: -0.9, p: 0.37 } } },
      ipma: {
        target: 'Y', targetPerformance: 68.4, indicators: [],
        constructs: [{ lv: 'F1', importance: 0.42, performance: 71.2 }],
        cipma: { conditions: [{ lv: 'F1', importance: 0.42, performance: 71.2,
          effectSizeCE: 0.24, effectSizeCR: 0.19, p: 0.008, necessary: true, bottleneck: [] }] },
      },
      cta: { blocks: [{ lv: 'F1', nIndicators: 5, nTetrads: 5, alphaAdjusted: 0.01,
        verdict: 'reflective', declaredMode: 'reflective', conflict: false, tetrads: [] }] },
      copula: { nBootstrap: 300, n: 300,
        normality: [{ lv: 'F1', D: 0.09, p: 0.002, nonNormal: true }],
        equations: [{ endogenous: 'F2', predictors: ['F1'], models: [{ copulas: ['F1'],
          singular: false, r2: 0.3, coefficients: [{ name: 'c(F1)', coef: -0.2, se: 0.08,
            ciLower: -0.36, ciUpper: -0.04, p: 0.01, isCopula: true }] }] }] },
      fimix: { n: 300, lnL: -410.2, iterations: 42, restarts: 10, criteria: { en: 0.62 },
        selection: [], segments: [
          { index: 1, share: 0.6, assignedSize: 180, equations: [] },
          { index: 2, share: 0.4, assignedSize: 120, equations: [] }] },
      pos: { n: 300, passes: 4, moves: 190, starts: 10, minSize: 15,
        objective: 1.576, sseTotal: 65.77, r2Overall: 0.78,
        global: { sse: 268.7, objective: 0.101, r2: 0.101, equations: [] },
        segments: [
          { index: 1, size: 195, share: 0.65, sse: 30.1, equations: [] },
          { index: 2, size: 105, share: 0.35, sse: 35.7, equations: [] }] },
    })
    for (const lang of LANGS) {
      const text = buildNarrative(res, lang)
      expect(text).not.toMatch(/\{[a-zA-Z]+\}/)   // 未填的模板變數
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('NaN')
      expect(text.length).toBeGreaterThan(1500)
    }
  })
})
