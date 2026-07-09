/**
 * NCA 引擎行為測試（Dul 2016）。
 * compare.test.js 已用 numpy 封閉式基準做數值交叉驗證（1e-6）；
 * 本檔以「手算可驗證的小資料集」錨定演算法正確性，並斷言性質與邊界行為。
 */
import { describe, it, expect } from 'vitest'
import { runNCA, ceFdhPeers, effectSizeLabel, areaAboveClampedLine } from '../src/lib/stats/nca.js'

// 手算範例：點 (1,2)(2,1)(3,4)(4,3)(5,5)
// scope=4*4=16；CE-FDH peers=(1,2)(3,4)(5,5)；
// C=(5-2)(3-1)+(5-4)(5-3)+0=6+2=8；d=8/16=0.5
const HX = [1, 2, 3, 4, 5]
const HY = [2, 1, 4, 3, 5]

describe('NCA CE-FDH — 手算錨定', () => {
  const r = runNCA(HX, HY, { bottleneckLevels: [0, 25, 50, 75, 100] })

  it('scope 由實證 min/max 決定', () => {
    expect(r.scope).toMatchObject({ xmin: 1, xmax: 5, ymin: 1, ymax: 5, area: 16 })
  })
  it('CE-FDH peers = 記錄點 (1,2)(3,4)(5,5)', () => {
    expect(r.ceilings.ce_fdh.peers).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 5 }])
  })
  it('ceiling zone C=8、effect size d=0.5（大效果）', () => {
    expect(r.ceilings.ce_fdh.ceilingZone).toBeCloseTo(8, 10)
    expect(r.ceilings.ce_fdh.effectSize).toBeCloseTo(0.5, 10)
    expect(r.ceilings.ce_fdh.effectLabel).toBe('veryLarge')
  })
  it('CE-FDH 準確度恆為 100%', () => {
    expect(r.ceilings.ce_fdh.accuracy).toBe(1)
  })
  it('bottleneck：Y 各水準反讀所需 X（單調非遞減，低水準為 NN）', () => {
    const b = r.ceilings.ce_fdh.bottleneck
    expect(b.map((q) => q.xValue)).toEqual([1, 1, 3, 3, 5])
    expect(b[0].nn).toBe(true)   // ystar=ymin → 所需 X=xmin → 不必要
    expect(b[4].nn).toBe(false)  // ystar=ymax → 所需 X=xmax
    for (let i = 1; i < b.length; i++) expect(b[i].xValue).toBeGreaterThanOrEqual(b[i - 1].xValue)
  })
})

describe('NCA CR-FDH — 過 peers 的 OLS', () => {
  const cr = runNCA(HX, HY).ceilings.cr_fdh
  it('slope=0.75、intercept=17/12（過 (1,2)(3,4)(5,5)）', () => {
    expect(cr.slope).toBeCloseTo(0.75, 10)
    expect(cr.intercept).toBeCloseTo(17 / 12, 10)
  })
  it('d_cr ≈ 0.3345（線性 ceiling 於 scope 內夾擠）', () => {
    expect(cr.effectSize).toBeCloseTo(0.334491, 5)
    expect(cr.effectSize).toBeGreaterThan(0)
    expect(cr.effectSize).toBeLessThan(1)
  })
})

describe('areaAboveClampedLine — 夾擠積分', () => {
  it('線完全在 scope 上緣之上 → 空白區為 0', () => {
    // y=10（>ymax=5）於 [0,4]×[0,5] → clamp 至 5 → 空白 0
    expect(areaAboveClampedLine(10, 0, 0, 4, 0, 5)).toBeCloseTo(0, 10)
  })
  it('線完全在 scope 下緣之下 → 空白區 = 整個 scope', () => {
    // y=-10（<ymin=0）→ clamp 至 0 → 空白 = (4-0)*(5-0)=20
    expect(areaAboveClampedLine(-10, 0, 0, 4, 0, 5)).toBeCloseTo(20, 10)
  })
  it('水平線位於中間 → 空白 = 上半矩形', () => {
    // y=2 於 [0,4]×[0,5] → 空白 = 4*(5-2)=12
    expect(areaAboveClampedLine(2, 0, 0, 4, 0, 5)).toBeCloseTo(12, 10)
  })
})

describe('NCA permutation 檢定', () => {
  it('注入相同 permutations → p 決定性一致', () => {
    const perms = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 0, 4, 1, 3]]
    const a = runNCA(HX, HY, { permutations: perms }).test
    const b = runNCA(HX, HY, { permutations: perms }).test
    expect(a.p_ce).toBe(b.p_ce)
    expect(a.nPermutations).toBe(3)
    expect(a.p_ce).toBeGreaterThanOrEqual(0)
    expect(a.p_ce).toBeLessThanOrEqual(1)
  })
  it('整數 P + 固定 seed → 生成路徑決定性', () => {
    const a = runNCA(HX, HY, { permutations: 50, seed: 7 }).test
    const b = runNCA(HX, HY, { permutations: 50, seed: 7 }).test
    expect(a.p_ce).toBe(b.p_ce)
  })
  it('未指定 permutations → 不做檢定', () => {
    expect(runNCA(HX, HY).test).toBeNull()
  })
})

describe('NCA 效果量標籤與邊界', () => {
  it('effectSizeLabel 依 Dul 基準分級', () => {
    expect(effectSizeLabel(0.05)).toBe('small')
    expect(effectSizeLabel(0.1)).toBe('medium')
    expect(effectSizeLabel(0.3)).toBe('large')
    expect(effectSizeLabel(0.5)).toBe('veryLarge')
  })
  it('長度不符 / n<5 / 無變異 → 明確錯誤', () => {
    expect(runNCA([1, 2, 3], [1, 2]).error).toBe('length-mismatch')
    expect(runNCA([1, 2, 3], [1, 2, 3]).error).toBe('need-n>=5')
    expect(runNCA([2, 2, 2, 2, 2], [1, 2, 3, 4, 5]).error).toBe('no-variation')
  })
  it('ceFdhPeers 對同 x 取最大 y', () => {
    const { rx, ry } = ceFdhPeers([1, 1, 2], [3, 5, 4])
    expect(rx).toEqual([1]) // x=1 取 max y=5；x=2 的 y=4 < 5 非記錄
    expect(ry).toEqual([5])
  })
})
