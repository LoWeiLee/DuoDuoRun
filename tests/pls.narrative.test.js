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

  it('★ PLSpredict：Shmueli et al. (2019) 四級判讀各自對應，且「多數／少數」的門檻說明必須入句', () => {
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
    // 2026-07-29 A3b 紅隊 R32：先前敘述句只有三級，把「多數」與「少數」壓成同一句，
    // 與說明文字寫的四級不符。四級各測一次，並鎖住門檻的誠實標註。
    const majority = mk([
      { lv: 'F2', indicator: 'i4', q2predict: 0.21, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: 0.15, rmse: 0.85, mae: 0.6, lm: { rmse: 0.91 } },
      { lv: 'F2', indicator: 'i6', q2predict: -0.05, rmse: 0.98, mae: 0.7, lm: { rmse: 0.91 } },
    ])
    const minority = mk([
      { lv: 'F2', indicator: 'i4', q2predict: 0.21, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: -0.02, rmse: 0.95, mae: 0.7, lm: { rmse: 0.91 } },
      { lv: 'F2', indicator: 'i6', q2predict: -0.05, rmse: 0.98, mae: 0.7, lm: { rmse: 0.91 } },
    ])
    expect(buildNarrative(allGood, 'zh-TW')).toContain('高度樣本外預測力')
    expect(buildNarrative(allBad, 'zh-TW')).toContain('未展現樣本外預測力')
    expect(buildNarrative(majority, 'zh-TW')).toContain('中度樣本外預測力')
    expect(buildNarrative(minority, 'zh-TW')).toContain('樣本外預測力偏低')
    // ★ 恰好半數（2/4）必須落在「少數」而不是「多數」——門檻是「超過半數」
    const half = mk([
      { lv: 'F2', indicator: 'i4', q2predict: 0.2, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i5', q2predict: 0.2, rmse: 0.80, mae: 0.6, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'i6', q2predict: -0.1, rmse: 0.95, mae: 0.7, lm: { rmse: 0.90 } },
      { lv: 'F2', indicator: 'y', q2predict: -0.1, rmse: 0.95, mae: 0.7, lm: { rmse: 0.90 } },
    ])
    expect(buildNarrative(half, 'zh-TW')).toContain('樣本外預測力偏低')
    expect(buildNarrative(half, 'zh-TW')).not.toContain('中度樣本外預測力')
    // ★ 門檻是本工具的口徑選擇而非引用，這件事必須寫在使用者複製得到的句子裡
    expect(buildNarrative(mixed, 'zh-TW')).toContain('原文未明定')
    expect(buildNarrative(mixed, 'en')).toMatch(/fixes no numeric threshold/)
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
          { copulas: ['F1'], singular: false, r2: 0.32, endogeneitySignal: true,
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
          { copulas: ['F1'], singular: false, r2: 0.32, endogeneitySignal: false,
            coefficients: [{ name: 'c(F1)', coef: -0.02, se: 0.08, ciLower: -0.2, ciUpper: 0.16, p: 0.8, isCopula: true }] },
        ] }],
      },
    })
    const zhGate = buildNarrative(gated, 'zh-TW')
    expect(zhGate).toContain('未能拒絕常態')
    expect(zhGate).toContain('不足以作為內生性的判準')
    expect(buildNarrative(gated, 'en')).toContain('cannot be used to decide the endogeneity question')
  })

  it('★ copula（R33-b 回歸鎖）：判準必須跟報表一致（percentile CI），不得改回 p < .05', () => {
    // bootstrap 分布偏斜時兩者會給相反答案——A3c 實測到雙向不一致各一例。
    // 情境 1：p = .043（< .05）但 CI 含 0 → 報表無訊號 → 敘述句必須說「未發現證據」
    const pSigCiNot = baseResult({
      copula: {
        nBootstrap: 400, n: 60,
        normality: [{ lv: 'F2', D: 0.12, p: 0.01, nonNormal: true }],
        equations: [{ endogenous: 'C', predictors: ['F2'], models: [
          { copulas: ['F2'], singular: false, r2: 0.21, endogeneitySignal: false,
            coefficients: [{ name: 'c(F2)', coef: -0.5254, se: 0.2591, p: 0.0433,
              ciLower: -0.7158, ciUpper: 0.3501, isCopula: true }] },
        ] }],
      },
    })
    expect(buildNarrative(pSigCiNot, 'zh-TW')).toContain('未發現內生性的證據')

    // 情境 2：p = .104（> .05）但 CI 排除 0 → 報表有訊號 → 敘述句必須說「可能存在內生性」
    const ciSigPNot = baseResult({
      copula: {
        nBootstrap: 400, n: 60,
        normality: [{ lv: 'F2', D: 0.12, p: 0.01, nonNormal: true }],
        equations: [{ endogenous: 'C', predictors: ['F2'], models: [
          { copulas: ['F2'], singular: false, r2: 0.21, endogeneitySignal: true,
            coefficients: [{ name: 'c(F2)', coef: -0.2044, se: 0.1255, p: 0.1043,
              ciLower: -0.4956, ciUpper: -0.0081, isCopula: true }] },
        ] }],
      },
    })
    expect(buildNarrative(ciSigPNot, 'zh-TW')).toContain('可能存在內生性')
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
          singular: false, r2: 0.3, endogeneitySignal: true,
          coefficients: [{ name: 'c(F1)', coef: -0.2, se: 0.08,
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

describe('APA 敘述句：資料處理揭露（階段 A 紅隊 R12）', () => {
  /** 只組 intro 句需要的最小結果物件 */
  const res = (metaOverride) => ({
    estimate: {
      meta: {
        n: 60, nRows: 60, nDropped: 0, missing: 'casewise', weighted: false,
        scheme: 'path', consistent: false, warnings: [],
        ...metaOverride,
      },
      lvNames: [], outerLoadings: [], reliability: [], structural: [],
      pathCoefficients: [], htmt: { lvNames: [], matrix: [] }, fit: null, gof: null,
    },
    bootstrap: null,
  })
  const first = (r, lang) => String(buildNarrative(r, lang)).split('\n')[0]

  it('完整資料：不出現任何缺失值或加權片語', () => {
    for (const lang of ['zh-TW', 'en']) {
      const t = first(res({}), lang)
      expect(t).not.toMatch(/deletion|缺失值|加權|sampling weights/)
    }
  })

  it('casewise 有剔除：句子寫出剔除筆數與原始樣本數', () => {
    const zh = first(res({ n: 29, nDropped: 31 }), 'zh-TW')
    expect(zh).toContain('31')
    expect(zh).toContain('60')
    expect(zh).toMatch(/listwise deletion/)
    const en = first(res({ n: 29, nDropped: 31 }), 'en')
    expect(en).toMatch(/31 cases/)
    expect(en).toMatch(/listwise deletion/)
  })

  it('pairwise：句子寫出 pairwise deletion 而非只給 N', () => {
    expect(first(res({ missing: 'pairwise' }), 'zh-TW')).toContain('pairwise deletion')
    expect(first(res({ missing: 'pairwise' }), 'en')).toMatch(/pairwise deletion/)
  })

  it('均值補值：句子寫出以平均數取代', () => {
    expect(first(res({ missing: 'mean' }), 'zh-TW')).toContain('平均數取代')
    expect(first(res({ missing: 'mean' }), 'en')).toMatch(/item means/)
  })

  it('★ WPLS：句子必須同時寫出加權估計與「推論仍未加權」的限制', () => {
    const zh = first(res({ weighted: true }), 'zh-TW')
    expect(zh).toContain('抽樣權重')
    expect(zh).toContain('未加權')
    const en = first(res({ weighted: true }), 'en')
    expect(en).toMatch(/sampling weights/)
    expect(en).toMatch(/unweighted/)
  })

  it('缺失值處理與加權可同時出現，且不留未填模板', () => {
    for (const lang of ['zh-TW', 'en']) {
      const t = first(res({ n: 29, nDropped: 31, weighted: true }), lang)
      expect(t).not.toMatch(/\{[a-zA-Z]+\}/)
      expect(t).not.toContain('undefined')
      expect(t).not.toContain('NaN')
    }
  })
})

/**
 * MICOM 敘述句（2026-07-29 階段 A / A3a 紅隊 R29）
 *
 * 修這一項的理由：MGA 的敘述句結尾要求讀者「先確認恆等性」，而 MICOM 先前沒有任何句子——
 * 句子指向一個它自己不報的東西。測的是三種綜合判定各自對應正確的界線措辭，
 * 以及「沒有 MICOM 結果時不得憑空出現這一段」。
 */
describe('PLS APA 敘述句：MICOM', () => {
  /** c／CI 皆可控的最小 MICOM 結果 */
  const mk = (over = {}) => ({
    groups: ['男', '女'], n1: 150, n2: 148, nPermValid: 999,
    constructs: [{
      lv: 'F1', c: 0.998, cQuantile5: 0.972, cP: 0.41,
      mean: { diff: 0.05, ciLower: -0.22, ciUpper: 0.23 },
      variance: { diff: -0.08, ciLower: -0.31, ciUpper: 0.30 },
      ...over,
    }],
  })

  it('完全恆等：三步皆過 → 判定可比較潛在平均', () => {
    const res = baseResult({ micom: mk() })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('MICOM')
    expect(zh).toContain('0.998')
    expect(zh).toContain('完全測量恆等')
    expect(zh).toContain('configural')
    const en = buildNarrative(res, 'en')
    expect(en).toMatch(/full measurement invariance/)
  })

  it('★ 部分恆等：step 2 過、step 3 不過 → 必須寫出「不可比較潛在平均」', () => {
    // 平均差落在 CI 外 → step 3 不成立
    const res = baseResult({ micom: mk({ mean: { diff: 0.9, ciLower: -0.22, ciUpper: 0.23 } }) })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('部分測量恆等')
    expect(zh).toContain('潛在變數平均')
    expect(zh).not.toContain('完全測量恆等')
    const en = buildNarrative(res, 'en')
    expect(en).toMatch(/partial measurement invariance/)
    expect(en).toMatch(/latent means must/)
  })

  it('★ step 2 未過 → 必須寫出「路徑係數比較不具意義」，不得只說部分恆等', () => {
    const res = baseResult({ micom: mk({ c: 0.80, cQuantile5: 0.97 }) })
    const zh = buildNarrative(res, 'zh-TW')
    expect(zh).toContain('不具意義')
    expect(zh).not.toContain('部分測量恆等')
    expect(zh).not.toContain('完全測量恆等')
    const en = buildNarrative(res, 'en')
    expect(en).toMatch(/not meaningful/)
  })

  it('permutation p 與 5% 分位兩個判準都要入句（報表有幾欄，句子就要交代幾欄）', () => {
    const zh = buildNarrative(baseResult({ micom: mk() }), 'zh-TW')
    expect(zh).toContain('5% 分位')
    expect(zh).toContain('permutation')
    expect(zh).toContain('log 變異數比')
  })

  it('★ 防止修過頭：沒有 MICOM 結果（null／error）時不得出現該段落', () => {
    for (const micom of [null, undefined, { error: 'micom-too-few', message: 'x' }]) {
      for (const lang of LANGS) {
        const t = buildNarrative(baseResult({ micom }), lang)
        expect(t).not.toContain('MICOM')
        expect(t).not.toContain('invariance')
        expect(t).not.toContain('恆等')
      }
    }
  })

  it('不留未填模板、不吐 undefined／NaN', () => {
    for (const lang of LANGS) {
      const t = buildNarrative(baseResult({ micom: mk() }), lang)
      expect(t).not.toMatch(/\{[a-zA-Z]+\}/)
      expect(t).not.toContain('undefined')
      expect(t).not.toContain('NaN')
    }
  })
})
