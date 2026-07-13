/**
 * PLS-SEM 引擎專屬測試：schema 驗證器、引擎邊界行為、bootstrap 確定性、
 * Worker 協定煙霧測試；W3 新功能（形成型、三 scheme、PLSc、BCa、model fit、Q²）。
 * 與 Python 基準的數字比對在 compare.test.js（pls_basic 與 pls_* W3 系列）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import {
  validatePLSModel, runPLS, bootstrapPLS, blindfoldPLS, bcaInterval, PLS_SCHEMA_VERSION,
  mgaPLS, micomPLS, plspredictPLS, ipmaPLS, cipmaPLS, ctaPLS, henselerMgaP,
  copulaPLS, copulaTerm, fimixPLS, posPLS,
} from '../src/lib/stats/pls.js'
import { handleMessage } from '../src/lib/plsWorker.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/datasets.json'), 'utf8'))
const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/reference.json'), 'utf8'))
const main = D.main

const MODEL = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'], mode: 'reflective' },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'], mode: 'reflective' },
  ],
  paths: [{ from: 'F1', to: 'F2' }],
}

// M4（同 adapters.mjs / generate_reference.py W3 區塊）：C 有兩個前置 LV，
// 且 F1→Y 路徑刻意省略 → 飽和與估計模型的 fit 不同、path 與 factorial scheme 不同
const M4 = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
    { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
    { name: 'Y', indicators: ['y'] },
  ],
  paths: [
    { from: 'F1', to: 'F2' },
    { from: 'F1', to: 'C' },
    { from: 'F2', to: 'C' },
    { from: 'F2', to: 'Y' },
  ],
}

const FORMATIVE = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'XF', indicators: ['x1', 'x2', 'x3'], mode: 'formative' },
    { name: 'Y', indicators: ['y'] },
  ],
  paths: [{ from: 'XF', to: 'Y' }],
}

const clone = (o) => JSON.parse(JSON.stringify(o))

describe('validatePLSModel（schema 驗證器）', () => {
  it('合法模型通過並補上預設 mode', () => {
    const m = clone(MODEL)
    delete m.latentVariables[0].mode
    const v = validatePLSModel(m)
    expect(v.ok).toBe(true)
    expect(v.model.latentVariables[0].mode).toBe('reflective')
  })
  it('formative 是合法 mode（W3 起引擎支援）', () => {
    const m = clone(MODEL)
    m.latentVariables[0].mode = 'formative'
    const v = validatePLSModel(m)
    expect(v.ok).toBe(true)
    expect(v.model.latentVariables[0].mode).toBe('formative')
  })
  it('目前 schema 版本為 1', () => {
    expect(PLS_SCHEMA_VERSION).toBe(1)
  })
  it('拒絕非物件模型', () => {
    expect(validatePLSModel(null).ok).toBe(false)
    expect(validatePLSModel([]).ok).toBe(false)
  })
  it('拒絕缺少/超前的 schemaVersion', () => {
    const m1 = clone(MODEL); delete m1.schemaVersion
    expect(validatePLSModel(m1).ok).toBe(false)
    const m2 = clone(MODEL); m2.schemaVersion = 99
    expect(validatePLSModel(m2).ok).toBe(false)
  })
  it('拒絕少於 2 個 LV', () => {
    const m = clone(MODEL); m.latentVariables = [m.latentVariables[0]]
    expect(validatePLSModel(m).ok).toBe(false)
  })
  it('拒絕 LV 名稱重複', () => {
    const m = clone(MODEL); m.latentVariables[1].name = 'F1'
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('重複')
  })
  it('拒絕指標跨 LV 重複掛載', () => {
    const m = clone(MODEL); m.latentVariables[1].indicators = ['i1', 'i5', 'i6']
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('重複掛載')
  })
  it('拒絕同 LV 內指標重複', () => {
    const m = clone(MODEL); m.latentVariables[0].indicators = ['i1', 'i1', 'i3']
    expect(validatePLSModel(m).ok).toBe(false)
  })
  it('拒絕未知 mode', () => {
    const m = clone(MODEL); m.latentVariables[0].mode = 'magic'
    expect(validatePLSModel(m).ok).toBe(false)
  })
  it('拒絕路徑指向未宣告的 LV', () => {
    const m = clone(MODEL); m.paths = [{ from: 'F1', to: 'F9' }]
    expect(validatePLSModel(m).ok).toBe(false)
  })
  it('拒絕自環與重複路徑', () => {
    const m1 = clone(MODEL); m1.paths = [{ from: 'F1', to: 'F1' }, { from: 'F1', to: 'F2' }]
    expect(validatePLSModel(m1).ok).toBe(false)
    const m2 = clone(MODEL); m2.paths = [{ from: 'F1', to: 'F2' }, { from: 'F1', to: 'F2' }]
    expect(validatePLSModel(m2).ok).toBe(false)
  })
  it('拒絕循環結構模型', () => {
    const m = clone(MODEL)
    m.paths = [{ from: 'F1', to: 'F2' }, { from: 'F2', to: 'F1' }]
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('循環')
  })
  it('拒絕孤立 LV', () => {
    const m = clone(MODEL)
    m.latentVariables.push({ name: 'F3', indicators: ['x1'], mode: 'reflective' })
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('孤立')
  })
})

describe('runPLS（引擎行為）', () => {
  it('教科書模型收斂且結構完整', () => {
    const r = runPLS(main, MODEL)
    expect(r.error).toBeUndefined()
    expect(r.meta.converged).toBe(true)
    expect(r.meta.iterations).toBeLessThan(300)
    expect(r.meta.scheme).toBe('path')
    expect(r.meta.consistent).toBe(false)
    expect(r.outerLoadings).toHaveLength(6)
    expect(r.outerWeights).toHaveLength(6)
    expect(r.pathCoefficients).toHaveLength(1)
    expect(r.scores.data[0]).toHaveLength(60)
    expect(r.htmt.matrix[0][1]).toBeCloseTo(r.htmt.matrix[1][0], 12)
    expect(r.lvModes).toEqual({ F1: 'reflective', F2: 'reflective' })
  })
  it('LV 分數單位變異（ddof=1）且權重滿足 w′Rw=1', () => {
    const r = runPLS(main, MODEL)
    for (const scores of r.scores.data) {
      const m = scores.reduce((s, v) => s + v, 0) / scores.length
      const varr = scores.reduce((s, v) => s + (v - m) ** 2, 0) / (scores.length - 1)
      expect(varr).toBeCloseTo(1, 10)
    }
  })
  it('單一前置 LV 的內部 VIF = 1', () => {
    const r = runPLS(main, MODEL)
    expect(r.structural[0].predictors[0].vif).toBeCloseTo(1, 12)
  })
  it('拒絕未知 scheme', () => {
    const r = runPLS(main, MODEL, { scheme: 'magic' })
    expect(r.error).toBe('scheme-not-supported')
  })
  it('無效模型回傳中文錯誤', () => {
    const r = runPLS(main, { schemaVersion: 1, latentVariables: [], paths: [] })
    expect(r.error).toBe('invalid-model')
    expect(typeof r.message).toBe('string')
  })
  it('零變異指標報錯並指名指標', () => {
    const rows = main.map((row) => ({ ...row, i1: 3 }))
    const r = runPLS(rows, MODEL)
    expect(r.error).toBe('zero-variance')
    expect(r.message).toContain('i1')
  })
  it('casewise deletion：含缺失列被剔除並列入警告', () => {
    const rows = clone(main)
    rows[0].i1 = null
    rows[1].i5 = ''
    const r = runPLS(rows, MODEL)
    expect(r.error).toBeUndefined()
    expect(r.meta.n).toBe(58)
    expect(r.meta.nDropped).toBe(2)
  })
  it('mean replacement：不減少樣本數', () => {
    const rows = clone(main)
    rows[0].i1 = null
    const r = runPLS(rows, MODEL, { missing: 'mean' })
    expect(r.error).toBeUndefined()
    expect(r.meta.n).toBe(60)
  })
  it('找不到指標欄位時報錯', () => {
    const m = clone(MODEL); m.latentVariables[0].indicators = ['i1', 'i2', 'nope']
    const r = runPLS(main, m)
    expect(r.error).toBe('missing-column')
    expect(r.message).toContain('nope')
  })
  it('小樣本邊界（n=8，2×2 指標模型）不炸並給低樣本警告', () => {
    const rows = D.small.map((q, i) => ({
      a1: q.v, a2: q.v * 0.8 + (i % 3) * 0.5,
      b1: q.v * 0.5 + ((i * 7) % 5), b2: q.v * 0.4 + ((i * 3) % 4) * 0.7,
    }))
    const m = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'A', indicators: ['a1', 'a2'] },
        { name: 'B', indicators: ['b1', 'b2'] },
      ],
      paths: [{ from: 'A', to: 'B' }],
    }
    const r = runPLS(rows, m)
    if (!r.error) {
      expect(r.meta.warnings.join()).toContain('樣本數偏低')
    } else {
      // 允許明確報錯（不收斂/退化），但不允許丟例外或回半成品
      expect(typeof r.message).toBe('string')
    }
  })
})

describe('W3：形成型測量（Mode B）', () => {
  it('形成型模型收斂，權重滿足 w′Sw=1、附外部 VIF', () => {
    const r = runPLS(main, FORMATIVE)
    expect(r.error).toBeUndefined()
    expect(r.meta.converged).toBe(true)
    expect(r.lvModes.XF).toBe('formative')
    const wts = r.outerWeights.filter((q) => q.lv === 'XF')
    expect(wts).toHaveLength(3)
    for (const w of wts) {
      expect(Number.isFinite(w.weight)).toBe(true)
      expect(w.vif).toBeGreaterThanOrEqual(1)
    }
    // 反映型（單指標）不回報外部 VIF
    expect(r.outerWeights.find((q) => q.lv === 'Y').vif).toBeNull()
  })
  it('形成型構念不定義 α/rho_A/CR/AVE（null），Fornell-Larcker 對角線 null、HTMT 配對 null', () => {
    const r = runPLS(main, FORMATIVE)
    const rel = r.reliability.find((q) => q.lv === 'XF')
    expect(rel.mode).toBe('formative')
    expect(rel.alpha).toBeNull()
    expect(rel.rhoA).toBeNull()
    expect(rel.rhoC).toBeNull()
    expect(rel.ave).toBeNull()
    expect(r.fornellLarcker.matrix[0][0]).toBeNull()
    expect(r.htmt.matrix[0][1]).toBeNull()
  })
  it('形成型權重 ∝ 對內部代理的 OLS 迴歸（與多元迴歸標準化係數同向）', () => {
    const r = runPLS(main, FORMATIVE)
    const wts = Object.fromEntries(
      r.outerWeights.filter((q) => q.lv === 'XF').map((q) => [q.indicator, q.weight]))
    // y 由 0.4·x1 + 0.3·x2 生成（x3 無關）→ x1 權重應最大且顯著為正
    expect(wts.x1).toBeGreaterThan(wts.x2)
    expect(wts.x1).toBeGreaterThan(wts.x3)
    expect(wts.x1).toBeGreaterThan(0.5)
  })
  it('bootstrap 回報 outer weights 的 SE/t/p/CI（形成型檢定表）', () => {
    const b = bootstrapPLS(main, FORMATIVE, { n: 300, seed: 42 })
    expect(b.error).toBeUndefined()
    expect(b.weights).toHaveLength(4)
    const wx1 = b.weights.find((q) => q.lv === 'XF' && q.indicator === 'x1')
    expect(wx1.se).toBeGreaterThan(0)
    expect(wx1.ciLower).toBeLessThan(wx1.ciUpper)
    expect(wx1.p).toBeLessThan(0.05) // x1 是 y 的真實成因
  })
})

describe('W3：weighting schemes（path / factorial / centroid）', () => {
  it("接受 'factor' 為 'factorial' 的別名", () => {
    const r = runPLS(main, M4, { scheme: 'factor' })
    expect(r.error).toBeUndefined()
    expect(r.meta.scheme).toBe('factorial')
  })
  it('三種 scheme 都收斂，且多前置構念下 path 與 factorial 結果不同', () => {
    const rp = runPLS(main, M4, { scheme: 'path' })
    const rf = runPLS(main, M4, { scheme: 'factorial' })
    const rc = runPLS(main, M4, { scheme: 'centroid' })
    for (const r of [rp, rf, rc]) {
      expect(r.error).toBeUndefined()
      expect(r.meta.converged).toBe(true)
    }
    const pathTo = (r, from, to) => r.pathCoefficients.find((q) => q.from === from && q.to === to).coef
    // C 有兩個前置 LV → path scheme 的內部權重（OLS）與 factorial（相關）不同
    expect(pathTo(rp, 'F1', 'C')).not.toBeCloseTo(pathTo(rf, 'F1', 'C'), 9)
    expect(pathTo(rp, 'F1', 'C')).not.toBeCloseTo(pathTo(rc, 'F1', 'C'), 9)
    // 但差異應是小量（同一模型的不同內部權重法）
    expect(Math.abs(pathTo(rp, 'F1', 'C') - pathTo(rc, 'F1', 'C'))).toBeLessThan(0.05)
  })
})

describe('W3：PLSc（consistent PLS）', () => {
  it('反衰減：|校正後構念相關| ≥ |未校正|（rho_A ≤ 1 的構念間），路徑改用校正後矩陣', () => {
    const r0 = runPLS(main, M4)
    const r1 = runPLS(main, M4, { consistent: true })
    expect(r1.error).toBeUndefined()
    expect(r1.meta.consistent).toBe(true)
    expect(r1.plsc.rhoA.F2).toBeGreaterThan(0)
    expect(r1.plsc.rhoA.F2).toBeLessThan(1)
    // F2–Y：Y 單指標（q=1）、F2 的 rho_A < 1 → 校正後相關放大
    const c0 = Math.abs(r0.latentCorrelations.matrix[1][3])
    const c1 = Math.abs(r1.latentCorrelations.matrix[1][3])
    expect(c1).toBeGreaterThan(c0)
    // 路徑 F2→Y = 校正後相關（單前置）
    const p1 = r1.pathCoefficients.find((q) => q.from === 'F2' && q.to === 'Y').coef
    expect(p1).toBeCloseTo(r1.latentCorrelations.matrix[1][3], 12)
  })
  it('單指標構念 rho_A = 1、不校正；α 與 rho_A 報表值不因 PLSc 而變', () => {
    const r0 = runPLS(main, M4)
    const r1 = runPLS(main, M4, { consistent: true })
    expect(r1.plsc.rhoA.Y).toBe(1)
    const rel0 = r0.reliability.find((q) => q.lv === 'F2')
    const rel1 = r1.reliability.find((q) => q.lv === 'F2')
    expect(rel1.alpha).toBeCloseTo(rel0.alpha, 12)
    expect(rel1.rhoA).toBeCloseTo(rel0.rhoA, 12)
    // CR/AVE 改用一致 loadings → 與 composite 版不同
    expect(rel1.rhoC).not.toBeCloseTo(rel0.rhoC, 6)
  })
  it('一致 loadings > 1 或校正後 |r| > 1 時警告不截斷', () => {
    // M4 的 F1 區塊 rho_A > 1（cloading_i2 > 1，見 pls_plsc 基準）→ 應有警告
    const r = runPLS(main, M4, { consistent: true })
    expect(r.meta.warnings.some((w) => w.includes('PLSc'))).toBe(true)
    const li2 = r.outerLoadings.find((q) => q.indicator === 'i2').loading
    expect(li2).toBeGreaterThan(1) // 不截斷
  })
})

describe('W3：model fit（SRMR / d_ULS / d_G / NFI）', () => {
  it('飽和與估計模型皆回報四指標；估計模型 SRMR ≥ 飽和模型', () => {
    const r = runPLS(main, M4)
    expect(r.fit).not.toBeNull()
    for (const key of ['saturated', 'estimated']) {
      const f = r.fit[key]
      expect(f.srmr).toBeGreaterThan(0)
      expect(f.dUls).toBeGreaterThan(0)
      expect(f.dG).toBeGreaterThan(0)
      expect(Number.isFinite(f.nfi)).toBe(true)
    }
    // M4 省略 F1→Y 路徑 → 估計模型殘差 ≥ 飽和模型
    expect(r.fit.estimated.srmr).toBeGreaterThanOrEqual(r.fit.saturated.srmr)
    expect(r.fit.estimated.dUls).toBeGreaterThanOrEqual(r.fit.saturated.dUls)
  })
  it('結構飽和的模型（無省略路徑）：估計 = 飽和', () => {
    const r = runPLS(main, MODEL) // 2 LV、1 路徑 → 結構模型飽和
    expect(r.fit.estimated.srmr).toBeCloseTo(r.fit.saturated.srmr, 12)
    expect(r.fit.estimated.dG).toBeCloseTo(r.fit.saturated.dG, 12)
  })
})

describe('W3：blindfolding Q²', () => {
  it('只回報內生構念；同設定完全可重現', () => {
    const q1 = blindfoldPLS(main, M4)
    const q2 = blindfoldPLS(main, M4)
    expect(q1.error).toBeUndefined()
    expect(q1.omissionDistance).toBe(7)
    expect(q1.constructs.map((c) => c.lv)).toEqual(['F2', 'C', 'Y'])
    expect(JSON.stringify(q1)).toBe(JSON.stringify(q2))
    for (const c of q1.constructs) {
      expect(Number.isFinite(c.q2)).toBe(true)
      expect(c.q2).toBeLessThan(1)
    }
  })
  it('omission distance 可設定；無效值報錯；n 為 D 整數倍時警告', () => {
    expect(blindfoldPLS(main, M4, { omissionDistance: 1 }).error).toBe('bad-omission-distance')
    expect(blindfoldPLS(main, M4, { omissionDistance: 2.5 }).error).toBe('bad-omission-distance')
    const q = blindfoldPLS(main, M4, { omissionDistance: 6 }) // n=60 是 6 的整數倍
    expect(q.error).toBeUndefined()
    expect(q.warnings.join()).toContain('整數倍')
  })
})

describe('W3：BCa bootstrap CI', () => {
  it('bcaInterval 對齊 numpy 手算基準（固定 draws + jackknife，Efron 1987）', () => {
    const ref = REF.pls_bca_reference.values
    const ci = bcaInterval(ref.draws, ref.jackknife, ref.original, 0.05)
    const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12)
    expect(rel(ci.z0, ref.z0)).toBeLessThan(1e-6)
    expect(rel(ci.a, ref.a)).toBeLessThan(1e-6)
    expect(rel(ci.ciLower, ref.ciLower)).toBeLessThan(1e-6)
    expect(rel(ci.ciUpper, ref.ciUpper)).toBeLessThan(1e-6)
  })
  it('無偏誤且無偏態時（z0=0, a=0）BCa 退化為 percentile', () => {
    // 對稱 draws（原始值 = 中位數）＋ 對稱 jackknife → z0 = 0、a = 0
    const draws = []
    for (let i = 0; i < 999; i++) draws.push(0.5 + Math.sin((i / 999) * Math.PI * 2) * 0.1)
    const jack = []
    for (let i = 0; i < 60; i++) jack.push(0.5 + (i % 2 === 0 ? 1 : -1) * (0.01 + i * 1e-4))
    const ci = bcaInterval(draws, jack, 0.5, 0.05)
    expect(Math.abs(ci.z0)).toBeLessThan(0.01)
    expect(Math.abs(ci.a)).toBeLessThan(0.01)
    const sorted = [...draws].sort((a, b) => a - b)
    const lo = sorted[Math.floor(0.025 * 998)]
    const hi = sorted[Math.ceil(0.975 * 998)]
    expect(ci.ciLower).toBeGreaterThanOrEqual(sorted[0])
    expect(ci.ciLower).toBeCloseTo(lo, 2)
    expect(ci.ciUpper).toBeCloseTo(hi, 2)
  })
  it('引擎內 BCa：同種子與 percentile 共用點估計/SE，僅 CI 端點不同', () => {
    const bp = bootstrapPLS(main, MODEL, { n: 400, seed: 42, ciType: 'percentile' })
    const bb = bootstrapPLS(main, MODEL, { n: 400, seed: 42, ciType: 'bca' })
    expect(bb.error).toBeUndefined()
    expect(bb.ciType).toBe('bca')
    expect(bb.nJackknife).toBe(60)
    expect(bb.paths[0].se).toBe(bp.paths[0].se)
    expect(bb.paths[0].original).toBe(bp.paths[0].original)
    expect(bb.paths[0].ciLower).toBeLessThan(bb.paths[0].ciUpper)
    expect(bb.paths[0].ciLower).not.toBe(bp.paths[0].ciLower)
  })
  it('拒絕未知 ciType', () => {
    const b = bootstrapPLS(main, MODEL, { n: 50, seed: 42, ciType: 'magic' })
    expect(b.error).toBe('ci-type-not-supported')
  })
})

describe('bootstrapPLS（確定性與統計性質）', () => {
  const OPT = { n: 300, seed: 42 }
  it('同種子完全可重現、不同種子不同', () => {
    const b1 = bootstrapPLS(main, MODEL, OPT)
    const b2 = bootstrapPLS(main, MODEL, OPT)
    const b3 = bootstrapPLS(main, MODEL, { n: 300, seed: 7 })
    expect(b1.error).toBeUndefined()
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
    expect(b1.paths[0].se).not.toBe(b3.paths[0].se)
  })
  it('路徑係數 SE / CI / t / p 的統計性質合理', () => {
    const b = bootstrapPLS(main, MODEL, OPT)
    const p0 = b.paths[0]
    expect(b.nValid).toBeGreaterThan(280)
    expect(b.ciType).toBe('percentile')
    // plspm 同模型 bootstrap SE ≈ 0.079（w0-engine-spike-report），統計容差帶
    expect(p0.se).toBeGreaterThan(0.04)
    expect(p0.se).toBeLessThan(0.2)
    expect(p0.ciLower).toBeLessThan(p0.ciUpper)
    expect(p0.original).toBeCloseTo(0.3603108815, 4)
    expect(p0.t).toBeCloseTo(p0.original / p0.se, 12)
    expect(p0.p).toBeGreaterThan(0)
    expect(p0.p).toBeLessThan(0.05)
    expect(b.loadings).toHaveLength(6)
    expect(b.weights).toHaveLength(6)
    for (const l of b.loadings) {
      expect(l.se).toBeGreaterThan(0)
      expect(l.ciLower).toBeLessThanOrEqual(l.ciUpper)
    }
  })
  it('consistent bootstrap：PLSc 下同樣確定性可重現', () => {
    const b1 = bootstrapPLS(main, M4, { n: 100, seed: 42, consistent: true })
    const b2 = bootstrapPLS(main, M4, { n: 100, seed: 42, consistent: true })
    expect(b1.error).toBeUndefined()
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
    // 原始值 = PLSc 校正後的路徑
    const r1 = runPLS(main, M4, { consistent: true })
    const pB = b1.paths.find((q) => q.from === 'F2' && q.to === 'Y')
    const pR = r1.pathCoefficients.find((q) => q.from === 'F2' && q.to === 'Y')
    expect(pB.original).toBeCloseTo(pR.coef, 12)
  })
  it('onProgress 有被呼叫且最終回報 total', () => {
    const calls = []
    bootstrapPLS(main, MODEL, { ...OPT, onProgress: (d, t) => calls.push([d, t]) })
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1]).toEqual([300, 300])
  })
})

describe('plsWorker 協定（Node 端 handleMessage 煙霧測試）', () => {
  it('run → progress + result', () => {
    const out = []
    handleMessage(
      { type: 'run', rows: main, model: MODEL, options: { bootstrap: { n: 100, seed: 42 } } },
      (m) => out.push(m),
    )
    const types = out.map((m) => m.type)
    expect(types).toContain('progress')
    expect(types[types.length - 1]).toBe('result')
    const result = out[out.length - 1]
    expect(result.estimate.meta.converged).toBe(true)
    expect(result.bootstrap.nRequested).toBe(100)
    expect(result.q2).toBeNull()
  })
  it('bootstrap: false → 只回點估計', () => {
    const out = []
    handleMessage({ type: 'run', rows: main, model: MODEL, options: { bootstrap: false } }, (m) => out.push(m))
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('result')
    expect(out[0].bootstrap).toBeNull()
  })
  it('q2: true → 附 blindfolding 結果', () => {
    const out = []
    handleMessage(
      { type: 'run', rows: main, model: M4, options: { bootstrap: false, q2: true } },
      (m) => out.push(m),
    )
    const result = out[out.length - 1]
    expect(result.type).toBe('result')
    expect(result.q2.omissionDistance).toBe(7)
    expect(result.q2.constructs.map((c) => c.lv)).toEqual(['F2', 'C', 'Y'])
  })
  it('壞模型 → error 訊息', () => {
    const out = []
    handleMessage({ type: 'run', rows: main, model: {}, options: {} }, (m) => out.push(m))
    expect(out[0].type).toBe('error')
  })
  it('未知訊息類型 → error', () => {
    const out = []
    handleMessage({ type: 'nope' }, (m) => out.push(m))
    expect(out[0].type).toBe('error')
    expect(out[0].error).toBe('bad-message')
  })
})

/* ─────────────────────────  W4：調節 / 高階構念 / 中介  ───────────────────────── */

const MOD_MODEL = () => ({
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
    { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
    { name: 'Y', indicators: ['y'] },
  ],
  interactions: [{ name: 'F1xC', factors: ['F1', 'C'] }],
  paths: [{ from: 'F1', to: 'Y' }, { from: 'F1xC', to: 'Y' }],
})

const HOC_MODEL = (method) => ({
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
    { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
    { name: 'Y', indicators: ['y'] },
  ],
  higherOrder: [{ name: 'G', components: ['F1', 'F2'], mode: 'reflective', method }],
  paths: [{ from: 'G', to: 'C' }, { from: 'C', to: 'Y' }],
})

describe('W4：模型驗證（interactions / higherOrder）', () => {
  it('合法調節模型通過並補上預設 method（two-stage）', () => {
    const v = validatePLSModel(MOD_MODEL())
    expect(v.ok).toBe(true)
    expect(v.model.interactions[0].method).toBe('two-stage')
  })
  it('拒絕交互項作為路徑 to', () => {
    const m = MOD_MODEL()
    m.paths.push({ from: 'Y', to: 'F1xC' })
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('交互項')
  })
  it('拒絕未宣告的 factor', () => {
    const m = MOD_MODEL()
    m.interactions[0].factors = ['F1', 'Nope']
    expect(validatePLSModel(m).ok).toBe(false)
  })
  it('拒絕沒有任何路徑的交互項', () => {
    const m = MOD_MODEL()
    m.paths = [{ from: 'F1', to: 'Y' }]
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('F1xC')
  })
  it('拒絕混用交互 method', () => {
    const m = MOD_MODEL()
    m.interactions.push({ name: 'I2', factors: ['F1', 'C'], method: 'product-indicator' })
    m.paths.push({ from: 'I2', to: 'Y' })
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('一致')
  })
  it('product indicator 拒絕二次效果（同構念兩次），two-stage 允許', () => {
    const m = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'Y', indicators: ['y'] },
      ],
      interactions: [{ name: 'F1sq', factors: ['F1', 'F1'], method: 'product-indicator' }],
      paths: [{ from: 'F1', to: 'Y' }, { from: 'F1sq', to: 'Y' }],
    }
    expect(validatePLSModel(m).ok).toBe(false)
    m.interactions[0].method = 'two-stage'
    expect(validatePLSModel(m).ok).toBe(true)
  })
  it('調節變數不可是交互項的依變數（循環）', () => {
    const m = MOD_MODEL()
    m.paths = [{ from: 'F1', to: 'C' }, { from: 'F1xC', to: 'C' }]
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('循環')
  })
  it('HOC：合法宣告通過並補上預設（reflective / repeated）', () => {
    const m = HOC_MODEL(undefined)
    delete m.higherOrder[0].mode
    delete m.higherOrder[0].method
    const v = validatePLSModel(m)
    expect(v.ok).toBe(true)
    expect(v.model.higherOrder[0].mode).toBe('reflective')
    expect(v.model.higherOrder[0].method).toBe('repeated')
  })
  it('HOC：低階構念不可直接出現在路徑中', () => {
    const m = HOC_MODEL('repeated')
    m.paths.push({ from: 'F1', to: 'Y' })
    const v = validatePLSModel(m)
    expect(v.ok).toBe(false)
    expect(v.errors.join()).toContain('低階構念')
  })
  it('HOC：名稱與既有構念衝突被拒；LOC 不可作為交互項 factor', () => {
    const m1 = HOC_MODEL('repeated')
    m1.higherOrder[0].name = 'F1'
    expect(validatePLSModel(m1).ok).toBe(false)
    const m2 = HOC_MODEL('repeated')
    m2.interactions = [{ name: 'I', factors: ['F1', 'C'] }]
    m2.paths.push({ from: 'I', to: 'Y' })
    const v2 = validatePLSModel(m2)
    expect(v2.ok).toBe(false)
    expect(v2.errors.join()).toContain('低階構念')
  })
})

describe('W4：two-stage 調節（引擎行為）', () => {
  it('自動補主效果路徑（C→Y）並記錄於 meta.autoAddedPaths', () => {
    const r = runPLS(main, MOD_MODEL())
    expect(r.error).toBeUndefined()
    expect(r.meta.autoAddedPaths).toEqual([{ from: 'C', to: 'Y' }])
    expect(r.pathCoefficients.some((q) => q.from === 'C' && q.to === 'Y')).toBe(true)
  })
  it('交互項係數＝標準化係數 ÷ sd(乘積)；simple slopes 代數一致', () => {
    const r = runPLS(main, MOD_MODEL())
    const p = r.pathCoefficients.find((q) => q.from === 'F1xC')
    const int = r.interactions[0]
    expect(p.coef).toBeCloseTo(p.coefStd / int.sdProduct, 12)
    const tg = int.targets[0]
    const s = Object.fromEntries(tg.slopes.map((q) => [q.level, q.slope]))
    expect(s[1] - s[-1]).toBeCloseTo(2 * p.coef, 10)
    expect(s[0]).toBeCloseTo(r.pathCoefficients.find((q) => q.from === 'F1' && q.to === 'Y').coef, 12)
  })
  it('stage1 子報表提供原始指標量測；最終（分數層）模型不報 fit', () => {
    const r = runPLS(main, MOD_MODEL())
    expect(r.stage1).toBeDefined()
    expect(r.stage1.outerLoadings.some((q) => q.indicator === 'i1')).toBe(true)
    expect(r.stage1.fit).not.toBeNull()
    expect(r.fit).toBeNull()
    expect(r.outerLoadings.every((q) => q.indicator.endsWith('_score'))).toBe(true)
  })
  it('derived 新資料檔：構念分數欄＋交互項欄、列數 = n', () => {
    const r = runPLS(main, MOD_MODEL())
    expect(r.derived.columns).toContain('F1_score')
    expect(r.derived.columns).toContain('F1xC_score')
    expect(r.derived.rows).toHaveLength(r.meta.n)
  })
  it('PLSc 與調節／高階構念併用被拒', () => {
    const r1 = runPLS(main, MOD_MODEL(), { consistent: true })
    expect(r1.error).toBe('plsc-w4-not-supported')
    const r2 = runPLS(main, HOC_MODEL('repeated'), { consistent: true })
    expect(r2.error).toBe('plsc-w4-not-supported')
  })
  it('blindfoldPLS 拒絕 W4 模型', () => {
    expect(blindfoldPLS(main, MOD_MODEL()).error).toBe('q2-not-supported')
    expect(blindfoldPLS(main, HOC_MODEL('repeated')).error).toBe('q2-not-supported')
  })
})

describe('W4：高階構念（引擎行為）', () => {
  it('repeated：HTMT 對 G×LOC 配對為 null，其他配對照常', () => {
    const r = runPLS(main, HOC_MODEL('repeated'))
    expect(r.error).toBeUndefined()
    const names = r.htmt.lvNames
    const g = names.indexOf('G')
    const f1 = names.indexOf('F1')
    const c = names.indexOf('C')
    expect(r.htmt.matrix[g][f1]).toBeNull()
    expect(r.htmt.matrix[f1][c]).not.toBeNull()
  })
  it('disjoint / embedded：G 以 LOC 分數為指標，stage1 提供 LOC 量測', () => {
    for (const method of ['disjoint', 'two-stage']) {
      const r = runPLS(main, HOC_MODEL(method))
      expect(r.error).toBeUndefined()
      const gInds = r.outerLoadings.filter((q) => q.lv === 'G').map((q) => q.indicator)
      expect(gInds).toEqual(['F1_score', 'F2_score'])
      expect(r.stage1.outerLoadings.some((q) => q.lv === 'F1' && q.indicator === 'i1')).toBe(true)
      expect(r.derived.rows).toHaveLength(r.meta.n)
    }
  })
})

describe('W4：中介與 bootstrap', () => {
  it('M4 中介分解代數一致：indirect = 路徑乘積、total = direct + totalIndirect、VAF', () => {
    const r = runPLS(main, M4)
    const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b).coef
    const f1c = r.mediation.effects.find((q) => q.from === 'F1' && q.to === 'C')
    expect(f1c.chains).toHaveLength(1)
    expect(f1c.chains[0].coef).toBeCloseTo(path('F1', 'F2') * path('F2', 'C'), 12)
    expect(f1c.total).toBeCloseTo(f1c.direct + f1c.totalIndirect, 12)
    expect(f1c.vaf).toBeCloseTo(f1c.totalIndirect / f1c.total, 12)
    const f1y = r.mediation.effects.find((q) => q.from === 'F1' && q.to === 'Y')
    expect(f1y.direct).toBeNull()
    expect(f1y.total).toBeCloseTo(f1y.totalIndirect, 12)
  })
  it('單一路徑模型（無中介鏈）mediation 為 null', () => {
    const r = runPLS(main, MODEL)
    expect(r.mediation).toBeNull()
  })
  it('bootstrap 回報中介效果 CI 且同種子完全可重現', () => {
    const b1 = bootstrapPLS(main, M4, { n: 150, seed: 42 })
    const b2 = bootstrapPLS(main, M4, { n: 150, seed: 42 })
    expect(b1.error).toBeUndefined()
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
    const ind = b1.indirectEffects.find((q) => q.from === 'F1' && q.to === 'C')
    expect(ind.via).toEqual(['F2'])
    expect(ind.se).toBeGreaterThan(0)
    expect(ind.ciLower).toBeLessThan(ind.ciUpper)
    const tot = b1.totalEffects.find((q) => q.from === 'F1' && q.to === 'C')
    expect(tot.original).toBeCloseTo(
      runPLS(main, M4).mediation.effects.find((q) => q.from === 'F1' && q.to === 'C').total, 12)
  })
  it('調節模型 bootstrap：可重現、paths 用未標準化交互係數、slopes 附 CI', () => {
    const b1 = bootstrapPLS(main, MOD_MODEL(), { n: 100, seed: 42 })
    const b2 = bootstrapPLS(main, MOD_MODEL(), { n: 100, seed: 42 })
    expect(b1.error).toBeUndefined()
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
    const r = runPLS(main, MOD_MODEL())
    const pInt = b1.paths.find((q) => q.from === 'F1xC')
    expect(pInt.original).toBeCloseTo(
      r.pathCoefficients.find((q) => q.from === 'F1xC').coef, 12)
    expect(b1.slopes).toHaveLength(3)
    for (const s of b1.slopes) {
      expect(s.ciLower).toBeLessThan(s.ciUpper)
      expect(Number.isFinite(s.se)).toBe(true)
    }
    // loadings 來自第一階段（原始指標）
    expect(b1.loadings.some((q) => q.indicator === 'i1')).toBe(true)
  })
  it('HOC repeated 模型 bootstrap 可重現且路徑含 G→C', () => {
    const b = bootstrapPLS(main, HOC_MODEL('repeated'), { n: 80, seed: 42 })
    expect(b.error).toBeUndefined()
    expect(b.paths.some((q) => q.from === 'G' && q.to === 'C')).toBe(true)
    const ind = b.indirectEffects.find((q) => q.from === 'G' && q.to === 'Y')
    expect(ind.via).toEqual(['C'])
  })
})

/* ─────────────────────────  W5：群組與預測  ───────────────────────── */

const MODEL2 = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
  ],
  paths: [{ from: 'F1', to: 'F2' }],
}
const GRP = { groupColumn: 'group2', groups: ['M', 'F'] }

describe('W5：PLS-MGA', () => {
  it('同種子完全可重現；三法並列且 p 值合法', () => {
    const o = { ...GRP, bootstrapN: 60, permutations: 25, seed: 42 }
    const r1 = mgaPLS(main, MODEL2, o)
    const r2 = mgaPLS(main, MODEL2, o)
    expect(r1.error).toBeUndefined()
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    const p0 = r1.paths[0]
    expect(p0.group1.coef).not.toBeCloseTo(p0.group2.coef, 2)
    for (const pv of [p0.henselerP, p0.parametric.p, p0.welch.p, p0.permutation.p]) {
      expect(pv).toBeGreaterThan(0)
      expect(pv).toBeLessThanOrEqual(1)
    }
    expect(p0.henselerP2).toBeCloseTo(2 * Math.min(p0.henselerP, 1 - p0.henselerP), 12)
  })
  it('henselerMgaP：完全分離的 draws → p ≈ 0；同分布 → p ≈ .5', () => {
    const d1 = Array.from({ length: 50 }, (_, i) => 0.8 + i * 1e-4)
    const d2 = Array.from({ length: 50 }, (_, i) => 0.1 + i * 1e-4)
    expect(henselerMgaP(d1, d2, 0.8, 0.1)).toBeLessThan(0.01)
    expect(henselerMgaP(d1, d1, 0.8, 0.8)).toBeGreaterThan(0.4)
  })
  it('壞群組設定報錯', () => {
    expect(mgaPLS(main, MODEL2, { groupColumn: 'group2', groups: ['M'] }).error).toBe('mga-bad-groups')
    expect(mgaPLS(main, MODEL2, { groupColumn: 'group2', groups: ['M', 'X'] }).error).toBe('mga-too-few')
  })
})

describe('W5：MICOM', () => {
  it('c ≤ 1、報表結構完整；W4 模型被拒', () => {
    const r = micomPLS(main, MODEL2, { ...GRP, permutations: 25, seed: 42 })
    expect(r.error).toBeUndefined()
    expect(r.constructs).toHaveLength(2)
    for (const c of r.constructs) {
      expect(c.c).toBeLessThanOrEqual(1)
      expect(c.c).toBeGreaterThan(0.5)
      expect(c.mean.ciLower).toBeLessThan(c.mean.ciUpper)
    }
    expect(micomPLS(main, MOD_MODEL(), { ...GRP }).error).toBe('w4-model-not-supported')
  })
})

describe('W5：PLSpredict ＋ CVPAT', () => {
  it('同種子可重現；Q²predict 合理；CVPAT 對 IA 顯著（模型有預測力）', () => {
    const r1 = plspredictPLS(main, M4, { k: 5, seed: 42 })
    const r2 = plspredictPLS(main, M4, { k: 5, seed: 42 })
    expect(r1.error).toBeUndefined()
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    expect(r1.indicators).toHaveLength(7) // F2(3) + C(3) + Y(1)
    for (const q of r1.indicators) {
      expect(q.rmse).toBeGreaterThan(0)
      expect(q.mae).toBeLessThanOrEqual(q.rmse + 1e-12)
      expect(q.q2predict).toBeLessThan(1)
    }
    expect(Number.isFinite(r1.cvpat.vsIA.t)).toBe(true)
    expect(Number.isFinite(r1.cvpat.vsLM.p)).toBe(true)
  })
  it('壞 k 報錯；W4 模型被拒', () => {
    expect(plspredictPLS(main, M4, { k: 1 }).error).toBe('bad-k')
    expect(plspredictPLS(main, MOD_MODEL(), {}).error).toBe('w4-model-not-supported')
  })
})

describe('W5：IT 準則與 IPMA', () => {
  it('IT 準則代數一致（AIC 與 BIC 之差 = (k+1)(ln n − 2)）', () => {
    const r = runPLS(main, M4)
    for (const st of r.structural) {
      const k = st.predictors.length
      expect(st.itCriteria.bic - st.itCriteria.aic)
        .toBeCloseTo((k + 1) * (Math.log(60) - 2), 10)
      expect(st.itCriteria.aicc).toBeGreaterThan(st.itCriteria.aic)
    }
  })
  it('IPMA：performance 落在 0–100、目標必須內生、指標層 importance 分解一致', () => {
    const r = ipmaPLS(main, M4, { target: 'C' })
    expect(r.error).toBeUndefined()
    for (const c of r.constructs) {
      expect(c.performance).toBeGreaterThan(0)
      expect(c.performance).toBeLessThan(100)
    }
    const f1 = r.constructs.find((q) => q.lv === 'F1')
    const sumInd = r.indicators
      .filter((q) => q.lv === 'F1')
      .reduce((s, q) => s + q.importance, 0)
    expect(sumInd).toBeCloseTo(f1.importance, 10) // Σ w̃ = 1
    expect(ipmaPLS(main, M4, { target: 'F1' }).error).toBe('ipma-bad-target')
    expect(ipmaPLS(main, MOD_MODEL(), { target: 'Y' }).error).toBe('w4-model-not-supported')
  })
})

describe('W6：cIPMA（IPMA × NCA 組合）', () => {
  const PERMS3 = [
    Array.from({ length: 60 }, (_, i) => (i + 7) % 60),
    Array.from({ length: 60 }, (_, i) => (i + 23) % 60),
    Array.from({ length: 60 }, (_, i) => 59 - i),
  ]
  const r = cipmaPLS(main, M4, { target: 'C', ncaPermutations: PERMS3 })

  it('回傳 ipmaPLS 完整結果＋cipma.conditions（只含目標的直接前置構念）', () => {
    expect(r.error).toBeUndefined()
    expect(r.target).toBe('C')
    expect(r.constructs.length).toBeGreaterThan(0)
    // M4 中 C 的直接前置 = F1、F2（F1 經 F2 的間接不進 cIPMA 的 NCA）
    expect(r.cipma.conditions.map((c) => c.lv).sort()).toEqual(['F1', 'F2'])
  })
  it('每個 condition 帶 IPMA 座標＋NCA 統計量＋必要性判準', () => {
    for (const c of r.cipma.conditions) {
      expect(Number.isFinite(c.importance)).toBe(true)
      expect(Number.isFinite(c.performance)).toBe(true)
      expect(c.effectSizeCE).toBeGreaterThanOrEqual(0)
      expect(c.effectSizeCE).toBeLessThanOrEqual(1)
      expect(c.p).toBeGreaterThanOrEqual(0)
      expect(c.p).toBeLessThanOrEqual(1)
      expect(c.necessary).toBe(c.p < 0.05 && c.effectSizeCE >= 0.1)
    }
  })
  it('bottleneck 帶 pctBelow（0–100、隨水準單調非遞減、NN 時為 0）', () => {
    for (const c of r.cipma.conditions) {
      let prev = -1
      for (const b of c.bottleneck) {
        expect(b.pctBelow).toBeGreaterThanOrEqual(0)
        expect(b.pctBelow).toBeLessThanOrEqual(100)
        if (b.nn) expect(b.pctBelow).toBe(0)
        expect(b.pctBelow).toBeGreaterThanOrEqual(prev)
        prev = b.pctBelow
      }
    }
  })
  it('scores100 已隨 ipmaPLS 回傳且範圍為 0–100', () => {
    for (const lv of ['F1', 'F2', 'C', 'Y']) {
      const s = r.scores100[lv]
      expect(s.length).toBe(60)
      expect(Math.min(...s)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...s)).toBeLessThanOrEqual(100)
    }
  })
  it('注入同一批 permutations → p 決定性一致', () => {
    const r2 = cipmaPLS(main, M4, { target: 'C', ncaPermutations: PERMS3 })
    expect(r2.cipma.conditions[0].p).toBe(r.cipma.conditions[0].p)
  })
  it('錯誤傳遞：壞 target 與 W4 模型沿 ipmaPLS 慣例', () => {
    expect(cipmaPLS(main, M4, { target: 'F1' }).error).toBe('ipma-bad-target')
    expect(cipmaPLS(main, MOD_MODEL(), { target: 'Y' }).error).toBe('w4-model-not-supported')
  })
})

/* ═══════════════════════ CTA-PLS（W6.3；Gudergan et al. 2008） ═══════════════════════ */

describe('CTA-PLS', () => {
  const CTA_IND = ['cr1', 'cr2', 'cr3', 'cr4', 'cr5', 'cm1', 'cm2', 'cm3', 'cm4']
  const ctaRows = D.cta.cr1.map((_, i) => Object.fromEntries(
    CTA_IND.map((c) => [c, D.cta[c][i]]),
  ))
  const CTA_MODEL = () => ({
    schemaVersion: 1,
    latentVariables: [
      { name: 'R', indicators: ['cr1', 'cr2', 'cr3', 'cr4', 'cr5'], mode: 'reflective' },
      { name: 'M', indicators: ['cm1', 'cm2', 'cm3', 'cm4'], mode: 'reflective' },
    ],
    paths: [{ from: 'R', to: 'M' }],
  })

  const r = ctaPLS(ctaRows, CTA_MODEL(), { bootstrapIndices: D.cta.boot })
  const blk = Object.fromEntries(r.blocks.map((b) => [b.lv, b]))

  it('非冗餘 tetrad 數 = k(k−3)/2（Bollen & Ting 1993 的自由度）', () => {
    expect(blk.R.nIndicators).toBe(5)
    expect(blk.R.nTetrads).toBe((5 * (5 - 3)) / 2) // 5
    expect(blk.M.nIndicators).toBe(4)
    expect(blk.M.nTetrads).toBe((4 * (4 - 3)) / 2) // 2
    expect(blk.R.tetrads).toHaveLength(5)
    expect(blk.M.tetrads).toHaveLength(2)
  })

  it('tetrad 值 = σ_gh·σ_ij − σ_gi·σ_hj（對第一個 tetrad 手算錨定）', () => {
    // R 區塊第一個 tetrad 依構造為 (cr1,cr2,cr3,cr4) → σ12·σ34 − σ13·σ24
    const c = (a, b) => {
      const xa = ctaRows.map((row) => row[a])
      const xb = ctaRows.map((row) => row[b])
      const n = xa.length
      const ma = xa.reduce((s, v) => s + v, 0) / n
      const mb = xb.reduce((s, v) => s + v, 0) / n
      let sab = 0, saa = 0, sbb = 0
      for (let i = 0; i < n; i++) {
        const da = xa[i] - ma
        const db = xb[i] - mb
        sab += da * db; saa += da * da; sbb += db * db
      }
      return sab / Math.sqrt(saa * sbb)
    }
    const t1 = blk.R.tetrads[0]
    expect(t1.label).toBe('cr1,cr2,cr3,cr4')
    const manual = c('cr1', 'cr2') * c('cr3', 'cr4') - c('cr1', 'cr3') * c('cr2', 'cr4')
    expect(Math.abs(t1.value - manual)).toBeLessThan(1e-12)
  })

  it('單因子反映型區塊（cr1–cr5）→ tetrads 消失 → 判反映型', () => {
    expect(blk.R.verdict).toBe('reflective')
    expect(blk.R.nNonVanishing).toBe(0)
    for (const t of blk.R.tetrads) {
      expect(t.ciLower).toBeLessThan(0)
      expect(t.ciUpper).toBeGreaterThan(0)
      expect(t.nonVanishing).toBe(false)
    }
    expect(blk.R.conflict).toBe(false) // 宣告 reflective、判讀 reflective
  })

  it('非單因子區塊（cm1–cm4）→ tetrads 不消失 → 判形成型並標記與宣告衝突', () => {
    expect(blk.M.verdict).toBe('formative')
    expect(blk.M.nNonVanishing).toBe(2)
    for (const t of blk.M.tetrads) {
      expect(t.nonVanishing).toBe(true)
      expect(t.ciLower).toBeGreaterThan(0) // 兩對高相關結構 → tetrad 顯著為正
    }
    expect(blk.M.declaredMode).toBe('reflective')
    expect(blk.M.conflict).toBe(true) // 宣告 reflective、判讀 formative
  })

  it('Bonferroni：α_adj = α/T，臨界值隨 T 變大而變嚴', () => {
    expect(blk.R.alphaAdjusted).toBeCloseTo(0.05 / 5, 12)
    expect(blk.M.alphaAdjusted).toBeCloseTo(0.05 / 2, 12)
    expect(blk.R.tCrit).toBeGreaterThan(blk.M.tCrit) // T 較多 → 臨界值較大
  })

  it('CI 為 bias-corrected：中心 = τ̂ − bias、半寬 = tCrit·se', () => {
    for (const b of r.blocks) {
      for (const t of b.tetrads) {
        const centre = (t.ciLower + t.ciUpper) / 2
        expect(Math.abs(centre - (t.value - t.bias))).toBeLessThan(1e-12)
        expect(Math.abs((t.ciUpper - t.ciLower) / 2 - b.tCrit * t.se)).toBeLessThan(1e-12)
      }
    }
  })

  it('指標少於 4 的構念：明確列入 skipped 並附中文說明，不靜默略過', () => {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'R', indicators: ['cr1', 'cr2', 'cr3', 'cr4', 'cr5'] },
        { name: 'S', indicators: ['cm1', 'cm2', 'cm3'] },
      ],
      paths: [{ from: 'R', to: 'S' }],
    }
    const out = ctaPLS(ctaRows, model, { bootstrapIndices: D.cta.boot })
    expect(out.error).toBeUndefined()
    expect(out.blocks.map((b) => b.lv)).toEqual(['R'])
    expect(out.skipped).toHaveLength(1)
    expect(out.skipped[0].lv).toBe('S')
    expect(out.skipped[0].nIndicators).toBe(3)
    expect(out.skipped[0].reason).toContain('至少需要 4 個指標')
    expect(out.warnings.some((w) => w.includes('S'))).toBe(true)
  })

  it('所有構念都不足 4 指標 → 明確中文錯誤（不回半成品）', () => {
    const out = ctaPLS(main, MODEL, {})
    expect(out.error).toBe('cta-no-eligible-construct')
    expect(out.message).toContain('4 個以上指標')
  })

  it('注入同一批重抽索引 → 逐位元決定性重現', () => {
    const a = ctaPLS(ctaRows, CTA_MODEL(), { bootstrapIndices: D.cta.boot })
    expect(a.blocks[0].tetrads[0].se).toBe(blk.R.tetrads[0].se)
    expect(a.blocks[1].tetrads[0].ciLower).toBe(blk.M.tetrads[0].ciLower)
  })

  it('未注入索引時：固定種子 → 同種子重現、不同種子不同', () => {
    const a = ctaPLS(ctaRows, CTA_MODEL(), { n: 200, seed: 7 })
    const b = ctaPLS(ctaRows, CTA_MODEL(), { n: 200, seed: 7 })
    const c = ctaPLS(ctaRows, CTA_MODEL(), { n: 200, seed: 8 })
    expect(a.blocks[0].tetrads[0].se).toBe(b.blocks[0].tetrads[0].se)
    expect(a.blocks[0].tetrads[0].se).not.toBe(c.blocks[0].tetrads[0].se)
    expect(a.nBootstrap).toBe(200)
    // 判讀結論不因種子而翻轉（訊號夠強）
    expect(c.blocks[1].verdict).toBe('formative')
  })

  it('參數把關：壞 alpha／bootstrap 次數不足／壞注入索引 → 明確中文錯誤', () => {
    expect(ctaPLS(ctaRows, CTA_MODEL(), { ciAlpha: 0 }).error).toBe('cta-bad-alpha')
    expect(ctaPLS(ctaRows, CTA_MODEL(), { n: 50 }).error).toBe('cta-too-few-bootstrap')
    const bad = ctaPLS(ctaRows, CTA_MODEL(), { bootstrapIndices: [[1, 2, 3]] })
    expect(bad.error).toBe('cta-bad-bootstrap-indices')
    expect(bad.message).toContain('樣本數')
  })

  it('W4 範圍限制：含調節／高階構念的模型明確報錯（沿 rejectW4 慣例）', () => {
    const out = ctaPLS(main, MOD_MODEL(), {})
    expect(out.error).toBe('w4-model-not-supported')
    expect(out.message).toContain('CTA-PLS')
  })
})

describe('Gaussian copula 內生性檢查', () => {
  const OPT = { tolerance: 1e-12, maxIterations: 2000 }
  const FAST = { ...OPT, bootstrapN: 30, seed: 7 }

  it('copulaTerm：Φ⁻¹(ecdf)，長度不變、有限值、嚴格保序', () => {
    const v = [3, 1, 4, 1, 5, 9, 2, 6]
    const c = copulaTerm(v)
    expect(c).toHaveLength(v.length)
    expect(c.every(Number.isFinite)).toBe(true)
    // 保序：原值較大者，copula 值不得較小（並列取最大秩 → 並列值相等）
    const idx = v.map((_, i) => i).sort((a, b) => v[a] - v[b])
    for (let i = 1; i < idx.length; i++) {
      expect(c[idx[i]]).toBeGreaterThanOrEqual(c[idx[i - 1]] - 1e-12)
    }
  })

  it('copulaTerm：最大值不產生 Infinity（H=1 夾為 1−1e−7）', () => {
    const c = copulaTerm([1, 2, 3, 4, 100])
    expect(Number.isFinite(c[4])).toBe(true)
    expect(c[4]).toBeGreaterThan(3) // qnorm(1−1e−7) ≈ 5.2
  })

  it('copulaTerm：對單調遞增變換不變（秩基底）', () => {
    const v = main.map((r) => Number(r.i1))
    const a = copulaTerm(v)
    const b = copulaTerm(v.map((x) => 3 * x + 7))
    for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(1e-12)
  })

  it('主流程：每個內生構念一組方程，k 個候選 → 2^k − 1 個模型', () => {
    const r = copulaPLS(main, M4, FAST)
    expect(r.error).toBeUndefined()
    expect(r.equations.map((e) => e.endogenous)).toEqual(['F2', 'C', 'Y'])
    const eqC = r.equations.find((e) => e.endogenous === 'C')
    expect(eqC.candidates).toEqual(['F1', 'F2'])
    expect(eqC.models).toHaveLength(3) // [F1] [F2] [F1,F2]
    expect(eqC.models.map((m) => m.copulas.join('+'))).toEqual(['F1', 'F2', 'F1+F2'])
    // 每個模型的係數：預測構念 + copula 項
    const full = eqC.models[2]
    expect(full.coefficients.map((c) => c.name)).toEqual(['F1', 'F2', 'c(F1)', 'c(F2)'])
    expect(full.coefficients.filter((c) => c.isCopula)).toHaveLength(2)
  })

  it('每個 copula 係數都有 se / t / p / CI，且 CI 含 coef 附近', () => {
    const r = copulaPLS(main, M4, FAST)
    const cop = r.equations.flatMap((e) => e.models).flatMap((m) => m.coefficients).filter((c) => c.isCopula)
    expect(cop.length).toBeGreaterThan(0)
    for (const c of cop) {
      expect(Number.isFinite(c.se)).toBe(true)
      expect(Number.isFinite(c.t)).toBe(true)
      expect(c.p).toBeGreaterThanOrEqual(0)
      expect(c.p).toBeLessThanOrEqual(1)
      expect(c.ciLower).toBeLessThanOrEqual(c.ciUpper)
    }
  })

  it('常態前置把關：LV 分數未拒絕常態時給出警告，但仍照算（不靜默擋掉）', () => {
    const r = copulaPLS(main, M4, FAST)
    // main 為常態模擬資料 → 至少一個構念會被判為常態
    const normalOnes = r.normality.filter((x) => !x.nonNormal)
    expect(normalOnes.length).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.includes('非常態'))).toBe(true)
    // 仍然有結果
    expect(r.equations.length).toBeGreaterThan(0)
  })

  it('bootstrapIndices 注入 → 結果決定性（同索引兩次跑相同）', () => {
    const idx = REF.pls_copula_inputs.values.bootIdx.slice(0, 40)
    const a = copulaPLS(main, M4, { ...OPT, bootstrapIndices: idx })
    const b = copulaPLS(main, M4, { ...OPT, bootstrapIndices: idx })
    const pick = (r) => r.equations[1].models[2].coefficients.map((c) => [c.coef, c.se, c.ciLower, c.ciUpper])
    expect(pick(a)).toEqual(pick(b))
    expect(a.nBootstrap).toBe(40)
  })

  it('constructs 可限定只檢定部分構念', () => {
    const r = copulaPLS(main, M4, { ...FAST, constructs: ['F2'] })
    expect(r.normality.map((x) => x.lv)).toEqual(['F2'])
    const eqC = r.equations.find((e) => e.endogenous === 'C')
    expect(eqC.candidates).toEqual(['F2'])
    expect(eqC.models).toHaveLength(1)
    // F2 ~ F1 這條方程沒有候選（F1 未選）→ 不出現
    expect(r.equations.map((e) => e.endogenous)).not.toContain('F2')
  })

  it('拒絕 W4 模型（調節／高階構念）', () => {
    const out = copulaPLS(main, MOD_MODEL(), FAST)
    expect(out.error).toBe('w4-model-not-supported')
    expect(out.message).toContain('Gaussian copula')
  })

  it('沒有結構路徑 → 明確報錯', () => {
    const noPath = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
      ],
      paths: [],
    }
    const out = copulaPLS(main, noPath, FAST)
    expect(out.error).toBeDefined()
  })

  it('指定不存在的構念 → 明確中文報錯', () => {
    const out = copulaPLS(main, M4, { ...FAST, constructs: ['NOPE'] })
    expect(out.error).toBe('copula-unknown-construct')
    expect(out.message).toContain('NOPE')
  })

  it('指定的構念不是任何路徑的起點（純內生）→ 明確報錯', () => {
    const out = copulaPLS(main, M4, { ...FAST, constructs: ['Y'] })
    expect(out.error).toBe('copula-no-candidate')
  })

  it('ciAlpha 超出範圍 → 明確報錯', () => {
    const out = copulaPLS(main, M4, { ...FAST, ciAlpha: 1.5 })
    expect(out.error).toBe('copula-bad-alpha')
  })

  it('樣本過少 → 明確報錯', () => {
    const out = copulaPLS(main.slice(0, 8), M4, FAST)
    expect(out.error).toBeDefined()
  })
})

describe('FIMIX-PLS（潛在異質性分段）', () => {
  const FX_COLS = ['fx1', 'fx2', 'fx3', 'fy1', 'fy2', 'fy3']
  const fxRows = D.fimix.fx1.map((_, i) => Object.fromEntries(
    FX_COLS.map((c) => [c, D.fimix[c][i]]),
  ))
  const FX_MODEL = () => ({
    schemaVersion: 1,
    latentVariables: [
      { name: 'FX', indicators: ['fx1', 'fx2', 'fx3'], mode: 'reflective' },
      { name: 'FY', indicators: ['fy1', 'fy2', 'fy3'], mode: 'reflective' },
    ],
    paths: [{ from: 'FX', to: 'FY' }],
  })
  const OPT = { tolerance: 1e-10, maxIterations: 2000 }
  const INIT2 = REF.pls_fimix_inputs.values.init_K2

  it('★ 還原已知的兩段結構：資料由 β=+0.80 與 β=−0.80 兩段組成', () => {
    const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initPosteriors: INIT2 })
    expect(r.error).toBeUndefined()
    const b1 = r.segments[0].equations[0].coefficients[0].coef
    const b2 = r.segments[1].equations[0].coefficients[0].coef
    // 一正一負、量級接近 0.8（LV 分數含測量衰減）
    expect(b1).toBeGreaterThan(0.6)
    expect(b2).toBeLessThan(-0.6)
    // 段別大小接近真實的 180 / 120
    expect(r.segments[0].share).toBeGreaterThan(0.55)
    expect(r.segments[0].share).toBeLessThan(0.75)
    // 段別還原率（對照 datasets.fimix.truth；label switching 取較大者）
    const truth = D.fimix.truth
    let same = 0
    for (let i = 0; i < truth.length; i++) if (r.assignment[i] === truth[i]) same++
    const acc = Math.max(same / truth.length, 1 - same / truth.length)
    expect(acc).toBeGreaterThan(0.80)
  })

  it('★ 全域單一模型會掩蓋這個結構（FIMIX 存在的理由）', () => {
    const g = runPLS(fxRows, FX_MODEL(), OPT)
    const globalBeta = g.structural[0].predictors[0].coef
    // 全域路徑遠小於任一段的絕對值（兩段方向相反、正負相消）
    expect(Math.abs(globalBeta)).toBeLessThan(0.4)
    const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initPosteriors: INIT2 })
    const segBetas = r.segments.map((s) => Math.abs(s.equations[0].coefficients[0].coef))
    for (const b of segBetas) expect(b).toBeGreaterThan(Math.abs(globalBeta))
  })

  it('★ EM 的對數概似單調不減（數學保證，違反即為實作錯誤）', () => {
    // monotone 由引擎內部逐步檢查；任何下降都會寫進 warnings
    for (const K of [2, 3]) {
      const init = REF.pls_fimix_inputs.values[`init_K${K}`]
      const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: K, initPosteriors: init })
      expect(r.error).toBeUndefined()
      expect(r.warnings.some((w) => w.includes('對數概似出現下降'))).toBe(false)
    }
  })

  it('段數選擇：K=2 在 AIC/BIC/CAIC 上皆優於 K=1、K=3、K=4', () => {
    const sel = {}
    for (const K of [1, 2, 3, 4]) {
      const init = K > 1 ? REF.pls_fimix_inputs.values[`init_K${K}`] : undefined
      const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: K, ...(init ? { initPosteriors: init } : {}) })
      sel[K] = r.criteria
    }
    for (const crit of ['aic', 'bic', 'caic']) {
      for (const K of [1, 3, 4]) {
        expect(sel[2][crit], `${crit}: K=2 應優於 K=${K}`).toBeLessThan(sel[K][crit])
      }
    }
  })

  it('EN（normed entropy）：K=1 為 null、K=2 超過 .50 判準', () => {
    const r1 = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 1 })
    expect(r1.criteria.en).toBeNull()
    const r2 = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initPosteriors: INIT2 })
    expect(r2.criteria.en).toBeGreaterThan(0.5)
    expect(r2.warnings.some((w) => w.includes('分離不佳'))).toBe(false)
  })

  it('EN < .50 時給出「分離不佳」警告（main 資料沒有真實段結構）', () => {
    const r = fimixPLS(main, M4, { tolerance: 1e-10, segments: 3, restarts: 3, seed: 5 })
    expect(r.error).toBeUndefined()
    if (r.criteria.en < 0.5) {
      expect(r.warnings.some((w) => w.includes('分離不佳'))).toBe(true)
    }
  })

  it('參數個數 N_k = (K−1) + K·R + K·M', () => {
    for (const K of [1, 2, 3, 4]) {
      const init = K > 1 ? REF.pls_fimix_inputs.values[`init_K${K}`] : undefined
      const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: K, ...(init ? { initPosteriors: init } : {}) })
      expect(r.criteria.nParams).toBe((K - 1) + K * 1 + K * 1) // R=1 路徑、M=1 內生構念
    }
  })

  it('後驗機率逐列和為 1；assignment = argmax', () => {
    const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initPosteriors: INIT2 })
    for (let i = 0; i < r.posteriors.length; i++) {
      const s = r.posteriors[i].reduce((a, v) => a + v, 0)
      expect(Math.abs(s - 1)).toBeLessThan(1e-9)
      const mx = Math.max(...r.posteriors[i])
      expect(r.posteriors[i][r.assignment[i]]).toBe(mx)
    }
  })

  it('label switching：段別依佔比遞減排序 → 輸出決定性', () => {
    const a = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, restarts: 6, seed: 11 })
    const b = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, restarts: 6, seed: 11 })
    expect(a.segments.map((s) => s.share)).toEqual(b.segments.map((s) => s.share))
    for (let i = 1; i < a.segments.length; i++) {
      expect(a.segments[i - 1].share).toBeGreaterThanOrEqual(a.segments[i].share)
    }
  })

  it('kMax → 產生段數選擇表', () => {
    const r = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, kMax: 4, restarts: 3, seed: 3 })
    expect(r.selection).toHaveLength(4)
    expect(r.selection.map((s) => s.k)).toEqual([1, 2, 3, 4])
    for (const s of r.selection) {
      expect(Number.isFinite(s.aic)).toBe(true)
      expect(Number.isFinite(s.bic)).toBe(true)
    }
  })

  it('拒絕 W4 模型（調節／高階構念）', () => {
    const out = fimixPLS(main, MOD_MODEL(), { segments: 2 })
    expect(out.error).toBe('w4-model-not-supported')
    expect(out.message).toContain('FIMIX-PLS')
  })

  it('沒有結構路徑 → 明確報錯', () => {
    const noPath = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
      ],
      paths: [],
    }
    // schema 驗證器更早擋下（無路徑的模型本身就不合法）；
    // 引擎內的 fimix-no-structural-path 是防禦性守衛，正常路徑到不了
    const out = fimixPLS(main, noPath, { segments: 2 })
    expect(out.error).toBe('invalid-model')
  })

  it('段數不合法 → 明確報錯', () => {
    expect(fimixPLS(fxRows, FX_MODEL(), { segments: 0 }).error).toBe('fimix-bad-segments')
    expect(fimixPLS(fxRows, FX_MODEL(), { segments: 2.5 }).error).toBe('fimix-bad-segments')
  })

  it('樣本不足以支撐段數 → 明確報錯（每段 10 筆下限）', () => {
    const out = fimixPLS(fxRows.slice(0, 15), FX_MODEL(), { segments: 2 })
    expect(out.error).toBe('too-few-cases')
    expect(out.message).toContain('20')
  })

  it('initPosteriors 形狀錯誤 → 明確報錯', () => {
    const out = fimixPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initPosteriors: [[0.5, 0.5]] })
    expect(out.error).toBe('fimix-bad-init')
  })
})

describe('PLS-POS（prediction-oriented segmentation）', () => {
  const FX_COLS = ['fx1', 'fx2', 'fx3', 'fy1', 'fy2', 'fy3']
  const fxRows = D.fimix.fx1.map((_, i) => Object.fromEntries(
    FX_COLS.map((c) => [c, D.fimix[c][i]]),
  ))
  const FX_MODEL = () => ({
    schemaVersion: 1,
    latentVariables: [
      { name: 'FX', indicators: ['fx1', 'fx2', 'fx3'], mode: 'reflective' },
      { name: 'FY', indicators: ['fy1', 'fy2', 'fy3'], mode: 'reflective' },
    ],
    paths: [{ from: 'FX', to: 'FY' }],
  })
  const OPT = { tolerance: 1e-12, maxIterations: 2000 }
  const INIT2 = REF.pls_pos_inputs.values.init_K2

  it('★ 還原已知的兩段結構（與 FIMIX 同一份模擬資料）', () => {
    const r = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: INIT2 })
    expect(r.error).toBeUndefined()
    const b1 = r.segments[0].equations[0].coefficients[0].coef
    const b2 = r.segments[1].equations[0].coefficients[0].coef
    expect(b1).toBeGreaterThan(0.6)
    expect(b2).toBeLessThan(-0.6)
    const truth = D.fimix.truth
    let same = 0
    for (let i = 0; i < truth.length; i++) if (r.assignment[i] === truth[i]) same++
    expect(Math.max(same / truth.length, 1 - same / truth.length)).toBeGreaterThan(0.80)
  })

  it('★ 分段大幅降低預測誤差（POS 的目標函數就是預測誤差）', () => {
    const r = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: INIT2 })
    expect(r.objective).toBeLessThan(r.global.sse)
    expect(r.r2Overall).toBeGreaterThan(r.global.r2)
    // 全域 R² 很低（正負相消），分段後大幅提升
    expect(r.global.r2).toBeLessThan(0.2)
    expect(r.r2Overall).toBeGreaterThan(0.6)
  })

  it('★ 爬山法的目標函數單調遞減（違反即為實作錯誤）', () => {
    for (const K of [2, 3]) {
      const r = posPLS(fxRows, FX_MODEL(), {
        ...OPT, segments: K, initAssignment: REF.pls_pos_inputs.values[`init_K${K}`],
      })
      expect(r.warnings.some((w) => w.includes('目標函數出現上升'))).toBe(false)
    }
  })

  it('★ 目標函數必然隨段數下降 → 明確警告不可用 POS 選段數', () => {
    const r2 = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: INIT2 })
    const r3 = posPLS(fxRows, FX_MODEL(), {
      ...OPT, segments: 3, initAssignment: REF.pls_pos_inputs.values.init_K3,
    })
    // K=3 的 SSE 必然更小——這正是不能用 POS 選段數的原因
    expect(r3.objective).toBeLessThan(r2.objective)
    expect(r2.warnings.some((w) => w.includes('不能用來選段數'))).toBe(true)
  })

  it('段別大小下限為硬約束', () => {
    const r = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 3, starts: 3, seed: 9, minSize: 40 })
    expect(r.error).toBeUndefined()
    for (const s of r.segments) expect(s.size).toBeGreaterThanOrEqual(40)
  })

  it('label switching：段別依大小遞減排序 → 輸出決定性', () => {
    const a = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, starts: 5, seed: 21 })
    const b = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, starts: 5, seed: 21 })
    expect(a.segments.map((s) => s.size)).toEqual(b.segments.map((s) => s.size))
    expect(a.objective).toBe(b.objective)
    for (let i = 1; i < a.segments.length; i++) {
      expect(a.segments[i - 1].size).toBeGreaterThanOrEqual(a.segments[i].size)
    }
  })

  it('assignment 值域正確、段別大小與 assignment 一致', () => {
    const r = posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: INIT2 })
    const counts = [0, 0]
    for (const a of r.assignment) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(2)
      counts[a]++
    }
    expect(counts).toEqual(r.segments.map((s) => s.size))
  })

  it('拒絕 W4 模型（調節／高階構念）', () => {
    const out = posPLS(main, MOD_MODEL(), { segments: 2 })
    expect(out.error).toBe('w4-model-not-supported')
    expect(out.message).toContain('PLS-POS')
  })

  it('K < 2 → 明確報錯（K=1 就是全域模型）', () => {
    expect(posPLS(fxRows, FX_MODEL(), { segments: 1 }).error).toBe('pos-bad-segments')
    expect(posPLS(fxRows, FX_MODEL(), { segments: 2.5 }).error).toBe('pos-bad-segments')
  })

  it('樣本不足以支撐段數 → 明確報錯', () => {
    const out = posPLS(fxRows.slice(0, 10), FX_MODEL(), { segments: 3, minSize: 10 })
    expect(out.error).toBe('too-few-cases')
  })

  it('initAssignment 不合法 → 明確報錯', () => {
    expect(posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: [0, 1] }).error)
      .toBe('pos-bad-init')
    const allZero = new Array(fxRows.length).fill(0)
    expect(posPLS(fxRows, FX_MODEL(), { ...OPT, segments: 2, initAssignment: allZero }).error)
      .toBe('pos-bad-init')
  })
})

describe('pairwise deletion ＋ WPLS（相關矩陣驅動）', () => {
  const OPT = { tolerance: 1e-12, maxIterations: 2000 }
  const M1 = () => ({
    schemaVersion: 1,
    latentVariables: [
      { name: 'F1', indicators: ['i1', 'i2', 'i3'], mode: 'reflective' },
      { name: 'F2', indicators: ['i4', 'i5', 'i6'], mode: 'reflective' },
    ],
    paths: [{ from: 'F1', to: 'F2' }],
  })
  const PW = D.pw
  const pwRows = main.map((row, i) => {
    const o = {}
    PW.cols.forEach((c, j) => { o[c] = PW.mask[i][j] ? null : row[c] })
    return o
  })

  it('★ 相關矩陣驅動的重構：完整資料、無權重 → 與既有基準逐值相同（零回歸的根本保證）', () => {
    const r = runPLS(main, M1(), OPT)
    const ld = Object.fromEntries(r.outerLoadings.map((q) => [q.indicator, q.loading]))
    const ref = REF.pls_basic.values
    for (const c of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']) {
      expect(Math.abs(ld[c] - ref[`loading_${c}`])).toBeLessThan(1e-6)
    }
    const path = r.pathCoefficients.find((q) => q.from === 'F1' && q.to === 'F2').coef
    expect(Math.abs(path - ref.path_F1_F2)).toBeLessThan(1e-6)
  })

  it('★ pairwise：不剔除任何列（n 維持 60），casewise 則會剔除', () => {
    const rPw = runPLS(pwRows, M1(), { ...OPT, missing: 'pairwise' })
    expect(rPw.error).toBeUndefined()
    expect(rPw.meta.n).toBe(60)
    expect(rPw.meta.nDropped).toBe(0)

    const rCw = runPLS(pwRows, M1(), { ...OPT, missing: 'casewise' })
    expect(rCw.meta.n).toBeLessThan(60)
    expect(rCw.meta.nDropped).toBeGreaterThan(0)
    // pairwise 用到更多資訊 → 兩者的估計會不同（這正是 pairwise 的用意）
    const pPw = rPw.pathCoefficients.find((q) => q.from === 'F1').coef
    const pCw = rCw.pathCoefficients.find((q) => q.from === 'F1').coef
    expect(pPw).not.toBe(pCw)
  })

  it('pairwise：報表明確告知「最少配對數」與分數的來源', () => {
    const r = runPLS(pwRows, M1(), { ...OPT, missing: 'pairwise' })
    expect(r.meta.warnings.some((w) => w.includes('pairwise deletion'))).toBe(true)
    expect(r.meta.warnings.some((w) => w.includes('均值補值'))).toBe(true)
  })

  it('★ blindfolding（Q²）與 pairwise 互斥 → 明確報錯', () => {
    const out = blindfoldPLS(pwRows, M1(), { ...OPT, missing: 'pairwise' })
    expect(out.error).toBe('blindfold-pairwise-conflict')
    expect(out.message).toContain('blindfolding')
  })

  it('★ WPLS：全 1 權重 = 未加權（加權相關的自我一致性）', () => {
    const ones = new Array(main.length).fill(1)
    const rW = runPLS(main, M1(), { ...OPT, weights: ones })
    const r0 = runPLS(main, M1(), OPT)
    const pW = rW.pathCoefficients.find((q) => q.from === 'F1').coef
    const p0 = r0.pathCoefficients.find((q) => q.from === 'F1').coef
    expect(Math.abs(pW - p0)).toBeLessThan(1e-8)
  })

  it('★ WPLS：權重同乘常數不改變結果（相關為尺度不變量）', () => {
    const a = runPLS(main, M1(), { ...OPT, weights: PW.w })
    const b = runPLS(main, M1(), { ...OPT, weights: PW.w.map((v) => v * 7.3) })
    const pa = a.pathCoefficients.find((q) => q.from === 'F1').coef
    const pb = b.pathCoefficients.find((q) => q.from === 'F1').coef
    expect(Math.abs(pa - pb)).toBeLessThan(1e-10)
  })

  it('WPLS：權重可用欄位名指定', () => {
    const rows = main.map((r, i) => ({ ...r, sw: PW.w[i] }))
    const byName = runPLS(rows, M1(), { ...OPT, weights: 'sw' })
    const byArr = runPLS(main, M1(), { ...OPT, weights: PW.w })
    const pa = byName.pathCoefficients.find((q) => q.from === 'F1').coef
    const pb = byArr.pathCoefficients.find((q) => q.from === 'F1').coef
    expect(Math.abs(pa - pb)).toBeLessThan(1e-12)
  })

  it('WPLS：權重為 0 的列實質不參與估計（報表明說）', () => {
    const w = main.map((_, i) => (i < 10 ? 0 : 1))
    const rW = runPLS(main, M1(), { ...OPT, weights: w })
    const rSub = runPLS(main.slice(10), M1(), OPT)
    const pW = rW.pathCoefficients.find((q) => q.from === 'F1').coef
    const pS = rSub.pathCoefficients.find((q) => q.from === 'F1').coef
    expect(Math.abs(pW - pS)).toBeLessThan(1e-6)
    expect(rW.meta.warnings.some((x) => x.includes('WPLS'))).toBe(true)
  })

  it('WPLS：非法權重 → 明確中文報錯', () => {
    expect(runPLS(main, M1(), { weights: [1, 2] }).error).toBe('wpls-bad-weights')
    expect(runPLS(main, M1(), { weights: main.map(() => -1) }).error).toBe('wpls-bad-weights')
    expect(runPLS(main, M1(), { weights: main.map(() => 0) }).error).toBe('wpls-bad-weights')
    expect(runPLS(main, M1(), { weights: 'nosuchcolumn' }).error).toBe('wpls-bad-weights')
    expect(runPLS(main, M1(), { weights: 42 }).error).toBe('wpls-bad-weights')
  })

  it('pairwise：配對過少 → 明確報錯（不給不可靠的相關）', () => {
    // 把 i1 與 i4 弄成幾乎不同時出現
    const rows = main.map((row, i) => ({
      ...row,
      i1: i % 2 === 0 ? row.i1 : null,
      i4: i % 2 === 0 ? null : row.i4,
    }))
    const out = runPLS(rows, M1(), { ...OPT, missing: 'pairwise' })
    expect(out.error).toBe('pairwise-too-sparse')
    expect(out.message).toContain('i1')
  })

  it('pairwise 與 WPLS 可併用（同一條相關矩陣入口）', () => {
    const r = runPLS(pwRows.map((row, i) => ({ ...row, sw: PW.w[i] })), M1(), {
      ...OPT, missing: 'pairwise', weights: 'sw',
    })
    expect(r.error).toBeUndefined()
    expect(r.meta.n).toBe(60)
  })
})
