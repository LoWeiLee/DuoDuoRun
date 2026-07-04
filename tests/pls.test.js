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
