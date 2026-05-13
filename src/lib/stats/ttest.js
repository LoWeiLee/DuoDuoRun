/**
 * t 檢定 — 三種型別 + Cohen's d
 *
 * 對外 API：
 *   independentT(x1, x2)  → Welch's 獨立樣本 t（不假設等變異）
 *   pairedT(x1, x2)        → 配對樣本 t
 *   oneSampleT(x, mu0)     → 單一樣本 t
 *
 * 共同回傳欄位：
 *   t        — t 統計量
 *   df       — 自由度（Welch's 為 Welch–Satterthwaite 修正）
 *   p        — 雙尾 p-value
 *   d        — Cohen's d 標準化效果量
 *   meanDiff — 平均數差
 *   se       — 平均數差的標準誤
 *
 * 額外欄位（依型別）：
 *   independentT  → grp1 / grp2 各組 { n, mean, sd, var }
 *   pairedT       → n / meanDiff / sdDiff（配對差）+ 兩變數各自 mean/sd
 *   oneSampleT    → n / mean / sd / mu0
 *
 * Cohen's d：
 *   獨立 — 用 pooled SD（n1+n2-2 自由度）
 *   配對 — 用配對差的 SD（standardized mean change）
 *   單一 — 用樣本 SD
 *
 * 呼叫者負責先剔除遺漏值、配對 t 兩變數已對齊、獨立 t 兩組已分開。
 *
 * 參考實作：reference/statlite.jsx 的 indepT / pairedT / oneT，已對標 SPSS。
 */
import { mean, variance, sd } from './descriptive.js'
import { pT } from './pvalue.js'

/** Cohen's d 效果量解讀（依絕對值大小） */
export function cohenDInterpretation(d) {
  const ad = Math.abs(d)
  if (ad < 0.2) return 'trivial'
  if (ad < 0.5) return 'small'
  if (ad < 0.8) return 'medium'
  return 'large'
}

/**
 * Welch's 獨立樣本 t 檢定
 *
 * @param {number[]} x1 第一組樣本
 * @param {number[]} x2 第二組樣本
 */
export function independentT(x1, x2) {
  const n1 = x1.length
  const n2 = x2.length
  if (n1 < 2 || n2 < 2) {
    return { error: 'each-group-needs-n>=2' }
  }
  const m1 = mean(x1)
  const m2 = mean(x2)
  const v1 = variance(x1)
  const v2 = variance(x2)
  const s1 = Math.sqrt(v1)
  const s2 = Math.sqrt(v2)

  // Welch's t 與 Welch–Satterthwaite df
  const se = Math.sqrt(v1 / n1 + v2 / n2)
  const meanDiff = m1 - m2
  // 邊界：兩組變異皆 0 → se=0，依平均差是否為 0 給退化結果
  let t, df, p
  if (se === 0) {
    if (meanDiff === 0) {
      t = 0; df = n1 + n2 - 2; p = 1
    } else {
      t = meanDiff > 0 ? Infinity : -Infinity
      df = n1 + n2 - 2
      p = 0
    }
  } else {
    t = meanDiff / se
    df =
      Math.pow(v1 / n1 + v2 / n2, 2) /
      (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1))
    p = pT(Math.abs(t), df)
  }

  // Cohen's d 用 pooled SD；pooledSd=0 時依方向給 0 / Infinity
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  const pooledSd = Math.sqrt(pooledVar)
  let d
  if (pooledSd === 0) {
    d = meanDiff === 0 ? 0 : (meanDiff > 0 ? Infinity : -Infinity)
  } else {
    d = meanDiff / pooledSd
  }
  const zeroVariance = se === 0 || pooledSd === 0

  return {
    type: 'independent',
    t,
    df,
    p,
    d,
    meanDiff,
    se,
    grp1: { n: n1, mean: m1, sd: s1, var: v1 },
    grp2: { n: n2, mean: m2, sd: s2, var: v2 },
    pooledSd,
    zeroVarianceWarning: zeroVariance,
  }
}

/**
 * 配對樣本 t 檢定
 *
 * @param {number[]} x1 配對第一組（前測等）
 * @param {number[]} x2 配對第二組（後測等）— 長度需與 x1 相同
 */
export function pairedT(x1, x2) {
  if (x1.length !== x2.length) {
    return { error: 'paired-arrays-must-match-length' }
  }
  if (x1.length < 2) {
    return { error: 'need-n>=2' }
  }
  const diffs = x1.map((v, i) => v - x2[i])
  const n = diffs.length
  const m_d = mean(diffs)
  const sd_d = sd(diffs)
  const se = sd_d / Math.sqrt(n)
  const df = n - 1
  // 邊界：sd_d=0（所有配對差完全相同）
  let t, p, d
  if (sd_d === 0) {
    if (m_d === 0) { t = 0; p = 1; d = 0 }       // 兩變數完全相同
    else {
      // 所有差都同號同值，t/d 為無窮大但無變異 → 顯示為 Infinity 並警示
      t = m_d > 0 ? Infinity : -Infinity
      p = 0
      d = t
    }
  } else {
    t = m_d / se
    p = pT(Math.abs(t), df)
    d = m_d / sd_d  // Cohen's dz（standardized mean change）
  }

  return {
    type: 'paired',
    t,
    df,
    p,
    d,
    meanDiff: m_d,
    se,
    n,
    sdDiff: sd_d,
    var1: { mean: mean(x1), sd: sd(x1) },
    var2: { mean: mean(x2), sd: sd(x2) },
    zeroVarianceWarning: sd_d === 0,
  }
}

/**
 * 單一樣本 t 檢定
 *
 * @param {number[]} x   樣本
 * @param {number} mu0   比較值
 */
export function oneSampleT(x, mu0) {
  const n = x.length
  if (n < 2) {
    return { error: 'need-n>=2' }
  }
  if (typeof mu0 !== 'number' || !Number.isFinite(mu0)) {
    return { error: 'mu0-must-be-finite-number' }
  }
  const m = mean(x)
  const s = sd(x)
  const se = s / Math.sqrt(n)
  const df = n - 1
  const meanDiff = m - mu0
  // 邊界：s=0（樣本全部相同）
  let t, p, d
  if (s === 0) {
    if (meanDiff === 0) { t = 0; p = 1; d = 0 }
    else {
      t = meanDiff > 0 ? Infinity : -Infinity
      p = 0
      d = t
    }
  } else {
    t = meanDiff / se
    p = pT(Math.abs(t), df)
    d = meanDiff / s
  }

  return {
    type: 'oneSample',
    t,
    df,
    p,
    d,
    meanDiff,
    se,
    n,
    mean: m,
    sd: s,
    mu0,
    zeroVarianceWarning: s === 0,
  }
}
