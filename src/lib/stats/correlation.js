/**
 * Pearson 積差相關
 *
 * 對外 API：
 *   pearsonCorr(x, y)         → { r, t, df, p, n }
 *   correlationMatrix(rows, columns) → 對所有變數兩兩配對計算
 *
 * 顯著性檢定：
 *   t = r * √(n-2) / √(1 - r²)
 *   df = n - 2
 *   p = 雙尾 t 分布
 *
 * 注意：兩變數其中一個全為常數時 r 無定義（denominator = 0），回傳 NaN。
 */
import { mean } from './descriptive.js'
import { pT } from './pvalue.js'
import { isMissing } from '../variableTypes.js'
import { ranks } from './ranks.js'

/**
 * 計算 Pearson r 與其顯著性檢定
 *
 * 呼叫者已確保 x.length === y.length 且兩陣列已同步剔除 missing。
 */
export function pearsonCorr(x, y) {
  const n = x.length
  if (n < 3) return { r: NaN, t: NaN, df: NaN, p: NaN, n }
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let dxx = 0
  let dyy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    num += dx * dy
    dxx += dx * dx
    dyy += dy * dy
  }
  if (dxx === 0 || dyy === 0) return { r: NaN, t: NaN, df: NaN, p: NaN, n, zeroVariance: true }
  const r = num / Math.sqrt(dxx * dyy)
  const df = n - 2
  // 處理 r = ±1 的邊界（會讓分母為 0）
  if (Math.abs(r) >= 1) return { r, t: r > 0 ? Infinity : -Infinity, df, p: 0, n }
  const t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r)
  const p = pT(Math.abs(t), df)
  return { r, t, df, p, n }
}

/**
 * Spearman ρ（rank-based correlation）
 *
 * 演算法：對 x 與 y 各自取平均秩後，套用 Pearson 公式。
 * 處理並列：用平均秩，所以這版適用「有並列」的資料。
 *
 * 顯著性檢定（與 Pearson 相同）：
 *   t = ρ √(n-2) / √(1-ρ²)，df = n-2
 *
 * 注意：嚴格的 Spearman 對小樣本（n < 30）應該用精確分布或 permutation；
 *       這裡用 t 近似，n ≥ 20 時偏差通常可接受。
 */
export function spearmanRho(x, y) {
  const n = x.length
  if (n !== y.length) return { rho: NaN, t: NaN, df: NaN, p: NaN, n }
  if (n < 3) return { rho: NaN, t: NaN, df: NaN, p: NaN, n }
  const rx = ranks(x).ranks
  const ry = ranks(y).ranks
  const out = pearsonCorr(rx, ry)
  return {
    rho: out.r,
    t: out.t,
    df: out.df,
    p: out.p,
    n,
    zeroVariance: out.zeroVariance || false,
  }
}

/** Spearman ρ 矩陣（同 correlationMatrix 但用 rank-based） */
export function spearmanMatrix(rows, columns) {
  const matrix = {}
  for (const a of columns) {
    matrix[a] = {}
    for (const b of columns) {
      if (a === b) {
        const nA = rows.filter((row) => !isMissing(row[a])).length
        matrix[a][b] = { rho: 1, p: 0, n: nA, t: Infinity, df: Math.max(0, nA - 2) }
        continue
      }
      const xs = []
      const ys = []
      for (const row of rows) {
        const va = row[a]
        const vb = row[b]
        if (isMissing(va) || isMissing(vb)) continue
        const na = Number(va)
        const nb = Number(vb)
        if (!Number.isFinite(na) || !Number.isFinite(nb)) continue
        xs.push(na)
        ys.push(nb)
      }
      matrix[a][b] = spearmanRho(xs, ys)
    }
  }
  return { columns, matrix }
}

/**
 * 計算多個變數兩兩之間的相關矩陣（pair-wise listwise deletion）
 *
 * 回傳：
 *   {
 *     columns: string[],
 *     matrix: { [colA]: { [colB]: { r, p, n } } }
 *   }
 *
 * 對角線（colA === colB）為 r=1, p=0, n 為該欄非 missing 數
 */
export function correlationMatrix(rows, columns) {
  const matrix = {}
  for (const a of columns) {
    matrix[a] = {}
    for (const b of columns) {
      if (a === b) {
        // 自相關 = 1
        const nA = rows.filter((row) => !isMissing(row[a])).length
        matrix[a][b] = { r: 1, p: 0, n: nA, t: Infinity, df: Math.max(0, nA - 2) }
        continue
      }
      // pair-wise listwise: 兩欄都有值才納入
      const xs = []
      const ys = []
      for (const row of rows) {
        const va = row[a]
        const vb = row[b]
        if (isMissing(va) || isMissing(vb)) continue
        const na = Number(va)
        const nb = Number(vb)
        if (!Number.isFinite(na) || !Number.isFinite(nb)) continue
        xs.push(na)
        ys.push(nb)
      }
      matrix[a][b] = pearsonCorr(xs, ys)
    }
  }
  return { columns, matrix }
}
