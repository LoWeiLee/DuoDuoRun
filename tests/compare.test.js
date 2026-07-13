/**
 * 統計核心 vs Python 黃金標準（scipy/statsmodels/pingouin/factor_analyzer/sklearn/semopy/plspm）
 * 回歸測試。基準值由 tests/generate_reference.py 產生（固定種子，勿手改 fixtures/*.json）。
 *
 * 容差分級：
 *   預設 1e-6（相對誤差）— 演算法必須逐位對齊
 *   放寬項目見 TOL — 數值積分 / 迭代收斂細節造成的可容忍差異
 *   PLS 迭代估計量統一 1e-4（TOL_PLS_ITERATIVE）；封閉式公式（標準化 α、HTMT）維持 1e-6
 *   SKIP — 已知且已記錄的慣例差異（詳見 docs/validation-report-v1.md）
 *
 * ★ 這個測試的**能力邊界**（2026-07-13 補記，務必理解）：
 *   標題寫「Python 黃金標準」，但 reference.json 有一部分方法的基準是
 *   generate_reference.py 裡的 **numpy 手算**——與 JS 實作出自同一個作者對論文的
 *   同一次理解。對那些方法而言，本測試只能抓到「兩邊抄不一致」，
 *   **抓不到「公式本身讀錯」**。
 *   哪些方法屬於這一類、各自的權威來源與查證狀態，見
 *   tests/fixtures/provenance.json 與 docs/formula-provenance.md；
 *   tests/provenance.test.js 會硬擋未登記的新方法。
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
  // 2026-07-13 紅隊：efa_pca_varimax 原本放寬到 5e-3（absLoadings）／1e-4（communalities），
  // 查證後發現差距來自 factor_analyzer 的 varimax 預設容差沒收斂完全，不是 JS 錯
  // （JS 解的 varimax 準則值反而較高）。基準改用 rotation tol=1e-12 重生後，
  // 兩者最大相對誤差 2.7e-7 → 容差收回預設 1e-6，不再需要條目。
  'efa_pca_varimax_k3.loadings': 1e-4, // 第 3 因子有 ~0.005 的極小負荷，絕對差僅 2e-7、相對差被放大
  'cfa_2factor_loadings.lambdaStd_i1': 5e-4, // ML 最佳化收斂細節（semopy vs JS）；絕對差 < 1.1e-4
  'cfa_2factor_loadings.lambdaStd_i2': 5e-4,
  'cfa_2factor_loadings.lambdaStd_i3': 5e-4,
  'cfa_2factor_loadings.lambdaStd_i4': 5e-4,
  'cfa_2factor_loadings.lambdaStd_i5': 5e-4,
  'cfa_2factor_loadings.lambdaStd_i6': 5e-4,
  'cfa_2factor_loadings.factorCorr_F1F2': 5e-4,
  'logistic_regression.p_x1': 1e-5,
}

// PLS 迭代估計量（loadings/weights/path/R²/f²/rho_A/PLSc/fit/Q² 等皆由迭代收斂的
// 權重導出）→ 1e-4，適用所有 pls_* 方法；封閉式公式（直接由指標相關矩陣計算，
// 如標準化 α、HTMT、形成型外部 VIF）→ 預設 1e-6
const TOL_PLS_ITERATIVE = 1e-4
const PLS_CLOSED_FORM = new Set(['alphaStd_F1', 'alphaStd_F2', 'htmt_F1F2', 'vif_x1', 'vif_x2', 'vif_x3'])

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
        const tol = TOL[skipKey] ??
          (method.startsWith('pls_') && !PLS_CLOSED_FORM.has(field) ? TOL_PLS_ITERATIVE : DEFAULT_TOL)
        it(`${field} (tol=${tol})`, () => {
          const got = actual[field]
          if (Array.isArray(expected)) {
            expect(Array.isArray(got), `${field} 應為陣列`).toBe(true)
            expect(got.length).toBe(expected.length)
            for (let i = 0; i < expected.length; i++) {
              expect(relDiff(expected[i], got[i]), `${field}[${i}] exp=${expected[i]} got=${got[i]}`).toBeLessThan(tol)
            }
          } else if (typeof expected === 'string') {
            // 字串基準（如 CTA-PLS 的 tetrad 標籤與判讀結論）— 逐字比對
            expect(got, `${field} exp=${expected} got=${got}`).toBe(expected)
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
