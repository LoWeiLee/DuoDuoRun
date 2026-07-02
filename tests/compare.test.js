/**
 * 統計核心 vs Python 黃金標準（scipy/statsmodels/pingouin/factor_analyzer/sklearn/semopy）
 * 回歸測試。基準值由 tests/generate_reference.py 產生（固定種子，勿手改 fixtures/*.json）。
 *
 * 容差分級：
 *   預設 1e-6（相對誤差）— 演算法必須逐位對齊
 *   放寬項目見 TOL — 數值積分 / 迭代收斂細節造成的可容忍差異
 *   SKIP — 已知且已記錄的慣例差異（詳見 docs/validation-report-v1.md）
 */
import { describe, it, expect } from 'vitest'
import { ADAPTERS, REF } from './adapters.mjs'

const DEFAULT_TOL = 1e-6

// 放寬容差：method.field → tol
const TOL = {
  'tukey_hsd.p_AB': 5e-4, // ptukey 雙層 Simpson 積分 vs scipy；絕對差 <1e-6，小 p 時相對差放大
  'tukey_hsd.p_AC': 5e-4,
  'tukey_hsd.p_BC': 5e-4,
  'mann_whitney_small.p': 1e-4, // 小樣本常態近似的邊界行為
  'mann_whitney_ties.p': 1e-4,
  'zprop_one.p': 1e-4,
  'zprop_two.p': 1e-4,
  'ks_lilliefors.D': 1e-4,
  'shapiro_wilk.p': 1e-5, // Royston 近似 vs scipy
  'efa_pca_varimax.absLoadingsSorted': 5e-3, // varimax 收斂容差差異
  'efa_pca_varimax.communalities': 1e-4,
  'logistic_regression.p_x1': 1e-5,
}

// 已知慣例差異，不比對（每項需在驗證報告中有對應記錄）
const SKIP = {
  'mann_whitney_small.pExact': 'JS 尚無 exact 法（SPSS 小樣本預設 exact）— backlog P2',
  'ks_lilliefors.p': 'p 近似法不同：JS 用 Dallal-Wilkinson，statsmodels 用查表內插；D 統計量已對齊',
  'cfa_2factor.chi2': 'χ² 慣例：JS 用 (N−1)·F（AMOS/Wishart），semopy 用 N·F — 見 chi2 換算測試',
  'cfa_2factor.cfi': 'JS 將 CFI 截斷於 1（lavaan 慣例），semopy 不截斷',
  'cfa_2factor.tli': '受 χ² 慣例影響，方向一致',
  'cfa_2factor.rmsea': '受 χ² 慣例影響；模型適配好時兩者皆 ≈ 0',
}

const relDiff = (a, b) => {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12)
  return Math.abs(a - b) / scale
}

describe('統計核心 vs Python 黃金標準', () => {
  for (const [method, ref] of Object.entries(REF)) {
    if (!ADAPTERS[method]) continue // 無 adapter（僅供人工對照的參考值）
    describe(method, () => {
      const actual = ADAPTERS[method]()
      for (const [field, expected] of Object.entries(ref.values)) {
        const skipKey = `${method}.${field}`
        if (SKIP[skipKey]) {
          it.skip(`${field} — ${SKIP[skipKey]}`, () => {})
          continue
        }
        const tol = TOL[skipKey] ?? DEFAULT_TOL
        it(`${field} (tol=${tol})`, () => {
          const got = actual[field]
          if (Array.isArray(expected)) {
            expect(Array.isArray(got), `${field} 應為陣列`).toBe(true)
            expect(got.length).toBe(expected.length)
            for (let i = 0; i < expected.length; i++) {
              expect(relDiff(expected[i], got[i]), `${field}[${i}] exp=${expected[i]} got=${got[i]}`).toBeLessThan(tol)
            }
          } else if (expected === null) {
            // 基準值為 null（Inf/NaN）— 略過
          } else {
            expect(Number.isFinite(got), `${field} 應為有限數值，got=${got}`).toBe(true)
            expect(relDiff(expected, got), `${field} exp=${expected} got=${got}`).toBeLessThan(tol)
          }
        })
      }
    })
  }
})

describe('CFA χ² 慣例換算（(N−1)/N）', () => {
  it('JS χ² × N/(N−1) ≈ semopy χ²', () => {
    const actual = ADAPTERS.cfa_2factor()
    const expected = REF.cfa_2factor.values.chi2
    const n = 60
    expect(relDiff(actual.chi2 * (n / (n - 1)), expected)).toBeLessThan(1e-3)
  })
  it('df 一致', () => {
    expect(ADAPTERS.cfa_2factor().df).toBe(REF.cfa_2factor.values.df)
  })
})
