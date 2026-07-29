/**
 * 學生化全距分布（Studentized range distribution）的 CDF。
 *
 * 用於 Tukey HSD 事後比較的 p-value 計算。
 *
 * 對外 API：
 *   ptukey(q, k, df) → Pr[Q ≤ q | k 組、誤差 df]
 *
 * 演算法：
 *   F_Q(q | k, df) = ∫₀^∞ F_R∞(q·s; k) · f_s(s; df) ds
 *   F_R∞(q; k)     = k · ∫_{-∞}^∞ φ(z) · [Φ(z + q) - Φ(z)]^(k-1) dz
 *   f_s(s; df)     = chi 分布密度，s = chi(df)/√df
 *
 * 雙層 Simpson 數值積分：
 *   - 內層 z ∈ [-8, 8]，200 nodes
 *   - 外層 s ∈ 1 ± 12/√(2ν)（★ 跟隨密度峰寬，見下方 R50），400 nodes
 *
 * ★ 2026-07-29 紅隊 R50（階段 A / A5a，**L4 真 bug**）——外層積分的區間與節點數修正。
 *
 *   修復前：`sMax = max(5, √df · 1.5)`，節點固定 200。
 *   但 s = χ_ν/√ν 的密度**隨 ν 變窄**（標準差約 1/√(2ν)），而積分上限卻**隨 √df 變寬**。
 *   ⇒ Simpson 步長與峰寬的比值在 **df ≈ 100 越過 1**，之後積分完全抓不到密度的峰：
 *
 *     df=57  步長/峰寬 0.60 → 誤差 1.0e-6      （★ 唯一的基準組恰好落在這裡）
 *     df=100 步長/峰寬 1.06 → 誤差 6.6e-3
 *     df=120 步長/峰寬 1.27 → 誤差 3.0e-2      （p .0686 vs 正確 .0388，**.05 判定翻面**）
 *     df=999 步長/峰寬 10.6 → 誤差 7.6e-1      （p .786 vs 正確 .0043）
 *
 *   可達性：`anova.js:109` 的 tukeyHSD 每次單因子 ANOVA 都無條件呼叫，df = N − k，
 *   三組時 N ≥ 103 即進入失準區；且 `oneWayAnova/Narrative.jsx` 用 p < .05 篩選
 *   **要在 APA 句裡點名哪幾對**，錯的 p 會直接改變使用者貼進論文的結論。
 *
 *   修法：積分區間改為 s ∈ [max(0, 1 − 12σ), 1 + 12σ]，σ = 1/√(2ν)——**跟著峰寬走**；
 *   節點 200 → 400。525 個格點實測（k ∈ {2,3,4,6,10} × df ∈ {1…2000} 15 值 × q 7 值）
 *   對直接數值積分的**最大絕對差 2.3e-7、零個格點超過 1e-4**（修復前最大 7.6e-1）。
 *   `df ≥ 1000 走漸近形式`的捷徑一併移除——修正後不再需要，且它本身會在 df=999/1000 造成跳斷。
 *
 * 對標 R::ptukey()。回歸防線見 `reference.json → tukey_ptukey_grid`（k × df × q 格點，scipy 產生）。
 */
import { normalCdf, lgamma } from './pvalue.js'

const SQRT_2PI = Math.sqrt(2 * Math.PI)

function normalPdf(z) {
  return Math.exp((-z * z) / 2) / SQRT_2PI
}

/**
 * chi 分布尺度化後的密度
 *   s = chi(df) / √df，所以 s 的密度 f_s(s) = √df · f_chi(s·√df, df)
 *
 * 用 log-domain 計算避免 overflow（df 大時 chi PDF 數值極小）
 */
function chiScaledPdf(s, df) {
  if (s <= 0) return 0
  const logPdf =
    0.5 * Math.log(df) +
    (1 - df / 2) * Math.log(2) +
    ((df - 1) / 2) * Math.log(df) +
    (df - 1) * Math.log(s) -
    (df * s * s) / 2 -
    lgamma(df / 2)
  return Math.exp(logPdf)
}

/**
 * Simpson 1/3 規則：在區間 [a, b] 上以 n（偶數）等分節點積分 f
 */
function simpson(f, a, b, n) {
  const h = (b - a) / n
  let sum = f(a) + f(b)
  for (let i = 1; i < n; i++) {
    const x = a + i * h
    sum += (i % 2 === 1 ? 4 : 2) * f(x)
  }
  return (h / 3) * sum
}

/**
 * F_R∞(q; k) — k 個獨立 N(0,1) 之全距 ≤ q 的機率（df = ∞ 漸近版本）
 */
function rangeCdfInf(q, k) {
  if (q <= 0) return 0
  if (q > 30) return 1
  const integrand = (z) => {
    const diff = normalCdf(z + q) - normalCdf(z)
    if (diff <= 0) return 0
    return normalPdf(z) * Math.pow(diff, k - 1)
  }
  return Math.max(0, Math.min(1, k * simpson(integrand, -8, 8, 200)))
}

/**
 * 學生化全距分布 CDF
 */
export function ptukey(q, k, df) {
  if (!(q > 0)) return 0
  if (!Number.isFinite(q)) return 1
  if (k < 2 || df < 1) return NaN

  // ★ R50：積分區間跟隨 s = χ_ν/√ν 的密度峰寬（σ ≈ 1/√(2ν)），而不是隨 √df 外擴。
  //   12σ 兩側足以涵蓋全部質量（df = 1 時窗口為 [0, 9.49]，密度在右端已是 exp(−45) 量級）。
  const sigma = 1 / Math.sqrt(2 * df)
  const sMin = Math.max(1e-9, 1 - 12 * sigma)
  const sMax = 1 + 12 * sigma

  const integrand = (s) => chiScaledPdf(s, df) * rangeCdfInf(q * s, k)

  const result = simpson(integrand, sMin, sMax, 400)
  return Math.max(0, Math.min(1, result))
}

/** 右尾機率：Pr[Q > q | k, df]，用於 Tukey HSD p-value */
export function ptukeyUpper(q, k, df) {
  return Math.max(0, Math.min(1, 1 - ptukey(q, k, df)))
}
