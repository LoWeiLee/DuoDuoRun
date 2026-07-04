/**
 * PLS-SEM 引擎專屬測試：schema 驗證器、引擎邊界行為、bootstrap 確定性、
 * Worker 協定煙霧測試。與 Python 基準的數字比對在 compare.test.js（pls_basic）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { validatePLSModel, runPLS, bootstrapPLS, PLS_SCHEMA_VERSION } from '../src/lib/stats/pls.js'
import { handleMessage } from '../src/lib/plsWorker.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/datasets.json'), 'utf8'))
const main = D.main

const MODEL = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'], mode: 'reflective' },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'], mode: 'reflective' },
  ],
  paths: [{ from: 'F1', to: 'F2' }],
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
    expect(r.outerLoadings).toHaveLength(6)
    expect(r.outerWeights).toHaveLength(6)
    expect(r.pathCoefficients).toHaveLength(1)
    expect(r.scores.data[0]).toHaveLength(60)
    expect(r.htmt.matrix[0][1]).toBeCloseTo(r.htmt.matrix[1][0], 12)
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
  it('W1 拒絕形成型（formative）並指向 Wave 3', () => {
    const m = clone(MODEL); m.latentVariables[0].mode = 'formative'
    const r = runPLS(main, m)
    expect(r.error).toBe('formative-not-supported')
    expect(r.message).toContain('Wave 3')
  })
  it('W1 拒絕 path 以外的 scheme', () => {
    const r = runPLS(main, MODEL, { scheme: 'centroid' })
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
    // plspm 同模型 bootstrap SE ≈ 0.079（w0-engine-spike-report），統計容差帶
    expect(p0.se).toBeGreaterThan(0.04)
    expect(p0.se).toBeLessThan(0.2)
    expect(p0.ciLower).toBeLessThan(p0.ciUpper)
    expect(p0.original).toBeCloseTo(0.3603108815, 4)
    expect(p0.t).toBeCloseTo(p0.original / p0.se, 12)
    expect(p0.p).toBeGreaterThan(0)
    expect(p0.p).toBeLessThan(0.05)
    expect(b.loadings).toHaveLength(6)
    for (const l of b.loadings) {
      expect(l.se).toBeGreaterThan(0)
      expect(l.ciLower).toBeLessThanOrEqual(l.ciUpper)
    }
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
  })
  it('bootstrap: false → 只回點估計', () => {
    const out = []
    handleMessage({ type: 'run', rows: main, model: MODEL, options: { bootstrap: false } }, (m) => out.push(m))
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('result')
    expect(out[0].bootstrap).toBeNull()
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
