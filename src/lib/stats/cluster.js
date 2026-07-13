/**
 * 集群分析 — k-means 與階層 Ward 法
 *
 * Cluster analysis: k-means (Lloyd's algorithm with k-means++ seeding,
 * 10 random restarts) and hierarchical agglomerative clustering with
 * Ward's linkage (minimum variance criterion).
 *
 * 對外 API：
 *   kmeans(rows, vars, k, opts)               — 純 k-means
 *   hierarchicalWard(rows, vars, k, opts)     — Ward 階層 + 切樹
 *   clusterAnalysis(rows, settings)           — 介面端統一入口
 *
 * settings = { vars, method: 'kmeans' | 'hierarchical', k, standardize }
 *
 * Listwise deletion：任一變數缺值即剔除整列。
 *
 * 演算法概要：
 *   k-means (Lloyd):
 *     1. greedy k-means++ seeding：第 1 顆種子均勻隨機；第 j 顆依與最近既有種子的
 *        距離平方加權抽出 2+⌊ln k⌋ 個候選，取加入後 potential 最小者
 *        （＝ scikit-learn init='k-means++' 的實作）
 *     2. assign each x_i to nearest centroid (Euclidean)
 *     3. update centroids = group means
 *     4. repeat until assignments unchanged or 100 iterations
 *     5. 重啟 25 次，保留 WSS 最小者
 *
 *   Hierarchical (Ward):
 *     1. start with n clusters, each containing one point
 *     2. iteratively merge two clusters minimising
 *        ΔSS = (n_i · n_j / (n_i + n_j)) · ||c_i − c_j||²
 *     3. record linkage matrix (cluster_i, cluster_j, distance, new_size)
 *     4. cut tree at k clusters by stopping at iteration n − k
 *
 *   品質指標：
 *     TSS = Σ_i ||x_i − x̄||²
 *     WSS = Σ_g Σ_{i∈g} ||x_i − μ_g||²
 *     BSS = Σ_g n_g · ||μ_g − x̄||²
 *     silhouette s(i) = (b(i) − a(i)) / max(a(i), b(i))
 *       a(i) = mean dist from i to others in same cluster
 *       b(i) = min over other clusters of (mean dist from i to that cluster)
 *
 *   Standardization：以全樣本 mean / SD（z-score, sample SD with N − 1）
 *   centroids 在輸出時還原成原始尺度（若 standardize=true）。
 *
 *   注意：使用確定性的 Mulberry32 PRNG 種子（基於 N、p、k），
 *   確保相同輸入得到相同結果，便於教學與除錯。
 */
import { isMissing } from '../variableTypes.js'

/* ─────────────────────────  PRNG  ───────────────────────── */

/**
 * Deterministic PRNG (Mulberry32). Returns float in [0, 1).
 * 確保相同 settings 下得到相同分群結果。
 */
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─────────────────────────  資料前處理 / Data prep  ───────────────────────── */

/**
 * 從 rows 中抽取選定變項，listwise 刪除缺值，回傳 number[][] 矩陣。
 * Extract numeric matrix with listwise deletion.
 */
function extractMatrix(rows, vars) {
  const X = []
  for (const row of rows) {
    let bad = false
    const r = []
    for (const v of vars) {
      const val = row[v]
      if (isMissing(val)) { bad = true; break }
      const num = Number(val)
      if (!Number.isFinite(num)) { bad = true; break }
      r.push(num)
    }
    if (!bad) X.push(r)
  }
  return X
}

/** 計算各欄的 mean / SD（樣本 SD, N − 1）。 */
function colStats(X) {
  const n = X.length
  const p = X[0].length
  const mean = new Array(p).fill(0)
  for (const r of X) for (let j = 0; j < p; j++) mean[j] += r[j]
  for (let j = 0; j < p; j++) mean[j] /= n
  const sd = new Array(p).fill(0)
  for (const r of X) for (let j = 0; j < p; j++) {
    const d = r[j] - mean[j]
    sd[j] += d * d
  }
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j] / Math.max(1, n - 1))
  return { mean, sd }
}

/** 把 X 標準化（z-score, with sample SD）。原矩陣不動，回傳新矩陣。 */
function standardizeMatrix(X, mean, sd) {
  const p = X[0].length
  return X.map((r) => {
    const out = new Array(p)
    for (let j = 0; j < p; j++) {
      const s = sd[j] === 0 ? 1 : sd[j]
      out[j] = (r[j] - mean[j]) / s
    }
    return out
  })
}

/* ─────────────────────────  距離 / Distance  ───────────────────────── */

function euclid2(a, b) {
  let s = 0
  for (let j = 0; j < a.length; j++) {
    const d = a[j] - b[j]
    s += d * d
  }
  return s
}
function euclid(a, b) { return Math.sqrt(euclid2(a, b)) }

/* ─────────────────────────  k-means  ───────────────────────── */

/**
 * greedy k-means++ seeding（Arthur & Vassilvitskii 2007 §3.1 的 local-trials 變體，
 * 亦即 scikit-learn `init='k-means++'` 的實際實作）。
 *
 * 第 1 顆種子均勻隨機；第 j 顆先依「與最近既有種子的平方距離」加權抽出
 * nTrials 個**候選**，再取「加入後全樣本 potential（Σ 最近距離平方）最小」者。
 * nTrials = 2 + ⌊ln k⌋，與 scikit-learn 同式。
 *
 * ⚠ 2026-07-13 紅隊修復：修復前為原始的單抽 k-means++（每顆種子只抽一個候選），
 *   收斂品質系統性劣於 sklearn 同等重啟數。fixture（x1,x2,x3、10 次重啟、
 *   30 個基礎種子的中位數 WSS）：
 *     k=7  單抽 45.60 / greedy 45.35 / sklearn n_init=10 45.45
 *     k=8  單抽 40.94 / greedy 39.77 / sklearn n_init=10 39.78
 *     k=10 單抽 33.16 / greedy 32.06 / sklearn n_init=10 32.03
 *   單一不利種子下差距更大（原 k=7 的手肘點 49.10，全域最佳約 44.1）。
 *   改為 greedy 後與 sklearn 同級。見 docs/validation-report-v1.md。
 */
function kmeansPPSeed(X, k, rand) {
  const n = X.length
  const nTrials = 2 + Math.floor(Math.log(k))
  const centroids = []
  centroids.push([...X[Math.floor(rand() * n)]])
  let minD2 = new Array(n)
  for (let i = 0; i < n; i++) minD2[i] = euclid2(X[i], centroids[0])

  // 依 minD2 加權抽一個索引
  const drawIdx = (total) => {
    if (total <= 0) return Math.floor(rand() * n) // 退化：所有點重合
    let r = rand() * total
    for (let i = 0; i < n; i++) {
      r -= minD2[i]
      if (r <= 0) return i
    }
    return n - 1
  }

  for (let c = 1; c < k; c++) {
    let total = 0
    for (let i = 0; i < n; i++) total += minD2[i]

    let bestIdx = -1
    let bestPotential = Infinity
    let bestMinD2 = null
    for (let t = 0; t < nTrials; t++) {
      const idx = drawIdx(total)
      // 試算把 X[idx] 納為種子後的 potential 與新的 minD2
      const cand = new Array(n)
      let potential = 0
      for (let i = 0; i < n; i++) {
        const d = euclid2(X[i], X[idx])
        cand[i] = d < minD2[i] ? d : minD2[i]
        potential += cand[i]
      }
      if (potential < bestPotential) {
        bestPotential = potential
        bestIdx = idx
        bestMinD2 = cand
      }
    }
    centroids.push([...X[bestIdx]])
    minD2 = bestMinD2
  }
  return centroids
}

/**
 * 對 X 跑單次 Lloyd's algorithm。
 * 回傳 { assignments, centroids, wss, iterations, converged }
 */
function runLloyd(X, k, initCentroids, maxIter = 100) {
  const n = X.length
  const p = X[0].length
  let centroids = initCentroids.map((c) => [...c])
  const assignments = new Array(n).fill(-1)
  let converged = false
  let iter = 0
  for (; iter < maxIter; iter++) {
    let changed = false
    // assign
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestD = euclid2(X[i], centroids[0])
      for (let c = 1; c < k; c++) {
        const d = euclid2(X[i], centroids[c])
        if (d < bestD) { bestD = d; best = c }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true }
    }
    if (!changed && iter > 0) { converged = true; break }
    // update
    const sums = Array.from({ length: k }, () => new Array(p).fill(0))
    const counts = new Array(k).fill(0)
    for (let i = 0; i < n; i++) {
      const c = assignments[i]
      counts[c]++
      const xi = X[i]
      const sc = sums[c]
      for (let j = 0; j < p; j++) sc[j] += xi[j]
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        // 空群：把最遠的點當作新質心，避免崩潰
        let farIdx = 0
        let farD = -1
        for (let i = 0; i < n; i++) {
          const d = euclid2(X[i], centroids[assignments[i]])
          if (d > farD) { farD = d; farIdx = i }
        }
        centroids[c] = [...X[farIdx]]
      } else {
        const newC = new Array(p)
        for (let j = 0; j < p; j++) newC[j] = sums[c][j] / counts[c]
        centroids[c] = newC
      }
    }
  }
  // WSS
  let wss = 0
  for (let i = 0; i < n; i++) wss += euclid2(X[i], centroids[assignments[i]])
  return { assignments, centroids, wss, iterations: iter + 1, converged }
}

/**
 * k-means with multiple restarts。回傳 WSS 最小的解。
 * X 為（已視需要標準化的）數值矩陣；不做尺度轉換。
 *
 * 重啟次數預設 25（2026-07-13 紅隊由 10 提高）。搭配 greedy k-means++ 後，
 * fixture 上各 k 的解已達到或優於 sklearn `n_init=25`；10 次時仍會撞到不利種子
 * （k=8 落在 41.73，25 次為 40.07），在手肘圖上造成假轉折。
 * 成本：n=60 的完整 clusterAnalysis（含 k=2..10 的 elbow）約 4 ms → 10 ms，
 * 與 n 呈線性。需要更快時可由 opts.restarts / opts.elbowRestarts 覆寫。
 */
function kmeansCore(X, k, opts = {}) {
  const restarts = opts.restarts ?? 25
  const maxIter = opts.maxIter ?? 100
  const seed = opts.seed ?? (X.length * 1000 + (X[0]?.length || 0) * 31 + k)
  const rand = mulberry32(seed)
  let best = null
  for (let r = 0; r < restarts; r++) {
    const init = kmeansPPSeed(X, k, rand)
    const sol = runLloyd(X, k, init, maxIter)
    if (!best || sol.wss < best.wss) best = sol
  }
  return best
}

/* ─────────────────────────  Hierarchical Ward  ───────────────────────── */

/**
 * 階層聚合 Ward 法：以 Lance-Williams 更新公式維護群間距離平方矩陣。
 *
 * 內部表示：每個 active cluster 用 id（0..n−1 為原始點，n..2n−2 為合併產生）。
 * 距離矩陣 D[i][j] 儲存 ΔSS（合併兩群所增加的 within-cluster SS）。
 *
 * Lance-Williams（Ward）：
 *   d(I∪J, K) = ((n_I + n_K) d(I,K) + (n_J + n_K) d(J,K) − n_K d(I,J))
 *               / (n_I + n_J + n_K)
 *
 * 回傳 { linkageMatrix, assignments } — assignments 為切到 k 群後的 0..k-1 標籤。
 */
function hierarchicalWardCore(X, k) {
  const n = X.length
  if (n < k) throw new Error('hierarchical: n < k')
  // 初始 active clusters：每個原始點是一群
  const active = new Set()
  for (let i = 0; i < n; i++) active.add(i)
  const sizes = new Map()
  for (let i = 0; i < n; i++) sizes.set(i, 1)
  const members = new Map()
  for (let i = 0; i < n; i++) members.set(i, [i])
  // 以 sparse object 儲存距離（key = "i,j", i < j）
  // 對 n 不算太大時夠用；DuoDuoRun 的數據集普遍 N < 1000
  const D = new Map()
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 對單點，ΔSS = 0.5 · ||x_i − x_j||²
      D.set(key(i, j), 0.5 * euclid2(X[i], X[j]))
    }
  }
  const linkageMatrix = []
  let nextId = n
  for (let step = 0; step < n - 1; step++) {
    // 找最小距離
    let bestKey = null
    let bestD = Infinity
    let bestA = -1
    let bestB = -1
    for (const [kk, dd] of D) {
      if (dd < bestD) {
        bestD = dd
        bestKey = kk
        const [a, b] = kk.split(',').map(Number)
        bestA = a; bestB = b
      }
    }
    if (bestKey === null) break
    const newId = nextId++
    const newSize = sizes.get(bestA) + sizes.get(bestB)
    const newMembers = [...members.get(bestA), ...members.get(bestB)]
    linkageMatrix.push([bestA, bestB, bestD, newSize])
    // Lance-Williams 更新：對所有其他活躍群 K
    const nA = sizes.get(bestA)
    const nB = sizes.get(bestB)
    for (const kk of active) {
      if (kk === bestA || kk === bestB) continue
      const nK = sizes.get(kk)
      const dAK = D.get(key(bestA, kk))
      const dBK = D.get(key(bestB, kk))
      const dAB = bestD
      const newD =
        ((nA + nK) * dAK + (nB + nK) * dBK - nK * dAB) / (nA + nB + nK)
      D.set(key(newId, kk), newD)
    }
    // 移除 A 與 B 的所有距離條目
    for (const kk of active) {
      D.delete(key(bestA, kk))
      D.delete(key(bestB, kk))
    }
    D.delete(key(bestA, bestB))
    active.delete(bestA)
    active.delete(bestB)
    active.add(newId)
    sizes.set(newId, newSize)
    members.set(newId, newMembers)
    // 提早停止：active 的數量到 k 即可（但仍想要完整 linkageMatrix → 跑完）
  }
  // 切樹：取最後 k 個合併之前的狀態 → 等價於做 n − k 步合併後的活躍群
  // 我們重做切樹：從原始 n 個 leaves 開始，依序執行前 n − k 步，得到 k 群
  const cutMembers = new Map()
  for (let i = 0; i < n; i++) cutMembers.set(i, [i])
  const cutActive = new Set()
  for (let i = 0; i < n; i++) cutActive.add(i)
  let cutNextId = n
  const stepsToDo = Math.max(0, n - k)
  for (let s = 0; s < stepsToDo; s++) {
    const [a, b] = linkageMatrix[s]
    const merged = [...cutMembers.get(a), ...cutMembers.get(b)]
    cutActive.delete(a); cutActive.delete(b)
    cutMembers.set(cutNextId, merged)
    cutActive.add(cutNextId)
    cutNextId++
  }
  // 為 active 群分配 0..k-1
  const assignments = new Array(n).fill(-1)
  let label = 0
  for (const id of cutActive) {
    for (const idx of cutMembers.get(id)) assignments[idx] = label
    label++
  }
  return { linkageMatrix, assignments }
}

/* ─────────────────────────  品質指標 / Quality metrics  ───────────────────────── */

/** 從 X + assignments 計算 centroids（各群在 X 空間的平均） */
function computeCentroids(X, assignments, k) {
  const n = X.length
  const p = X[0].length
  const sums = Array.from({ length: k }, () => new Array(p).fill(0))
  const counts = new Array(k).fill(0)
  for (let i = 0; i < n; i++) {
    const c = assignments[i]
    counts[c]++
    for (let j = 0; j < p; j++) sums[c][j] += X[i][j]
  }
  return sums.map((s, c) => {
    if (counts[c] === 0) return new Array(p).fill(NaN)
    return s.map((v) => v / counts[c])
  })
}

/** 全樣本 SS：Σ_i ||x_i − x̄||² */
function totalSS(X) {
  const n = X.length
  const p = X[0].length
  const m = new Array(p).fill(0)
  for (const r of X) for (let j = 0; j < p; j++) m[j] += r[j]
  for (let j = 0; j < p; j++) m[j] /= n
  let s = 0
  for (const r of X) for (let j = 0; j < p; j++) {
    const d = r[j] - m[j]
    s += d * d
  }
  return s
}

/** Per-cluster within-SS + 總 WSS。 */
function withinSS(X, assignments, centroids) {
  const k = centroids.length
  const wssPerCluster = new Array(k).fill(0)
  for (let i = 0; i < X.length; i++) {
    const c = assignments[i]
    wssPerCluster[c] += euclid2(X[i], centroids[c])
  }
  let total = 0
  for (const v of wssPerCluster) total += v
  return { total, perCluster: wssPerCluster }
}

/** 平均 silhouette。回傳 NaN 若 k = 1 或某群只剩 1 點時無法計算。 */
function silhouetteScore(X, assignments, k) {
  const n = X.length
  if (k < 2) return NaN
  // 預先把每群的成員 idx 收集
  const members = Array.from({ length: k }, () => [])
  for (let i = 0; i < n; i++) members[assignments[i]].push(i)
  let sum = 0
  let valid = 0
  for (let i = 0; i < n; i++) {
    const cI = assignments[i]
    const own = members[cI]
    if (own.length <= 1) continue
    let aSum = 0
    for (const j of own) {
      if (j === i) continue
      aSum += euclid(X[i], X[j])
    }
    const aI = aSum / (own.length - 1)
    let bI = Infinity
    for (let c = 0; c < k; c++) {
      if (c === cI) continue
      const grp = members[c]
      if (grp.length === 0) continue
      let dSum = 0
      for (const j of grp) dSum += euclid(X[i], X[j])
      const meanD = dSum / grp.length
      if (meanD < bI) bI = meanD
    }
    if (!Number.isFinite(bI)) continue
    const denom = Math.max(aI, bI)
    if (denom === 0) continue
    sum += (bI - aI) / denom
    valid++
  }
  return valid > 0 ? sum / valid : NaN
}

/* ─────────────────────────  Public API  ───────────────────────── */

/**
 * k-means 主入口：rows + 變數名稱 + k → 完整結果
 * Public k-means entry point.
 */
export function kmeans(rows, vars, k, opts = {}) {
  const standardize = opts.standardize !== false
  const Xraw = extractMatrix(rows, vars)
  const n = Xraw.length
  const p = vars.length
  if (n < k + 1) return { error: 'tooFewN', meta: { N: n, k, p } }
  if (k < 2) return { error: 'kTooSmall' }
  const stats = colStats(Xraw)
  const X = standardize ? standardizeMatrix(Xraw, stats.mean, stats.sd) : Xraw
  const sol = kmeansCore(X, k, opts)
  // centroids — 還原成原始尺度（若有標準化）
  const rawCentroids = standardize
    ? sol.centroids.map((c) =>
        c.map((v, j) => v * (stats.sd[j] === 0 ? 1 : stats.sd[j]) + stats.mean[j])
      )
    : sol.centroids.map((c) => [...c])
  const wssObj = withinSS(X, sol.assignments, sol.centroids)
  const tss = totalSS(X)
  const bss = Math.max(0, tss - wssObj.total)
  const silhouette = silhouetteScore(X, sol.assignments, k)
  const clusterSizes = new Array(k).fill(0)
  for (const c of sol.assignments) clusterSizes[c]++
  return {
    n, p, k,
    assignments: sol.assignments,
    centroids: rawCentroids,
    centroidsStd: sol.centroids,
    clusterSizes,
    wss: wssObj.total,
    wssPerCluster: wssObj.perCluster,
    bss,
    tss,
    silhouette,
    iterations: sol.iterations,
    converged: sol.converged,
    _Xstd: X,
    _Xraw: Xraw,
    _stats: stats,
  }
}

/**
 * Hierarchical Ward 主入口：rows + 變數名稱 + k → 完整結果
 * Public hierarchical-Ward entry point.
 */
export function hierarchicalWard(rows, vars, k, opts = {}) {
  const standardize = opts.standardize !== false
  const Xraw = extractMatrix(rows, vars)
  const n = Xraw.length
  const p = vars.length
  if (n < k + 1) return { error: 'tooFewN', meta: { N: n, k, p } }
  if (k < 2) return { error: 'kTooSmall' }
  const stats = colStats(Xraw)
  const X = standardize ? standardizeMatrix(Xraw, stats.mean, stats.sd) : Xraw
  const { linkageMatrix, assignments } = hierarchicalWardCore(X, k)
  const centroidsStd = computeCentroids(X, assignments, k)
  const rawCentroids = standardize
    ? centroidsStd.map((c) =>
        c.map((v, j) => v * (stats.sd[j] === 0 ? 1 : stats.sd[j]) + stats.mean[j])
      )
    : centroidsStd.map((c) => [...c])
  const wssObj = withinSS(X, assignments, centroidsStd)
  const tss = totalSS(X)
  const bss = Math.max(0, tss - wssObj.total)
  const silhouette = silhouetteScore(X, assignments, k)
  const clusterSizes = new Array(k).fill(0)
  for (const c of assignments) clusterSizes[c]++
  return {
    n, p, k,
    assignments,
    centroids: rawCentroids,
    centroidsStd,
    clusterSizes,
    wss: wssObj.total,
    wssPerCluster: wssObj.perCluster,
    bss,
    tss,
    silhouette,
    linkageMatrix,
    _Xstd: X,
    _Xraw: Xraw,
    _stats: stats,
  }
}

/**
 * 為不同 k 值計算 WSS（elbow 分析）。
 * Run the chosen method across k = 2..min(10, n − 1) for an elbow plot.
 *
 * ⚠ 重啟次數必須與主分析一致（kmeansCore 預設 10）。2026-07-13 紅隊修復前這裡
 *   寫死 5 次，導致 elbow 落在較差的區域最佳解——手肘圖在選定的 k 上顯示的 WSS
 *   與報表主數字不一致（fixture main / x1,x2,x3 / k=3：elbow 87.156 vs 報表 85.730），
 *   且整條曲線被系統性抬高、手肘形狀失真。見 docs/validation-report-v1.md。
 */
function computeElbow(rows, vars, method, opts) {
  const Xraw = extractMatrix(rows, vars)
  const n = Xraw.length
  if (n < 3) return []
  const standardize = opts.standardize !== false
  const stats = colStats(Xraw)
  const X = standardize ? standardizeMatrix(Xraw, stats.mean, stats.sd) : Xraw
  const maxK = Math.min(10, n - 1)
  const out = []
  for (let kk = 2; kk <= maxK; kk++) {
    if (method === 'kmeans') {
      // restarts 與主分析同步（預設 10），確保 elbow 曲線與報表 WSS 對得起來
      const sol = kmeansCore(X, kk, { ...opts, restarts: opts.elbowRestarts ?? opts.restarts ?? 25 })
      out.push({ k: kk, wss: sol.wss })
    } else {
      const { assignments } = hierarchicalWardCore(X, kk)
      const centroids = computeCentroids(X, assignments, kk)
      const wssObj = withinSS(X, assignments, centroids)
      out.push({ k: kk, wss: wssObj.total })
    }
  }
  return out
}

/**
 * 介面端統一入口：依 settings.method 分派到對應的計算函式，
 * 並補上 elbow 曲線 + 變項側 profile（mean / z-score by cluster）。
 *
 * Unified analysis entry point dispatched by settings.method.
 */
export function clusterAnalysis(rows, settings) {
  const vars = settings?.vars || []
  const method = settings?.method || 'kmeans'
  const k = Number(settings?.k) || 3
  const standardize = settings?.standardize !== false
  if (vars.length < 2) return { error: 'needAtLeastTwoVars' }
  if (!Number.isInteger(k) || k < 2 || k > 10) return { error: 'kRange' }

  const opts = { standardize }
  let r
  if (method === 'kmeans') r = kmeans(rows, vars, k, opts)
  else if (method === 'hierarchical') r = hierarchicalWard(rows, vars, k, opts)
  else return { error: 'unknownMethod' }
  if (r.error) return r

  // 變項側 profile：每群每變項的 mean（原始尺度）+ 標準化 z-score
  // 標準化 z = (cluster_mean − overall_mean) / overall_sd
  const { mean, sd } = r._stats
  const varMeansByCluster = []  // shape: k × p (raw scale)
  const varZScoresByCluster = []
  for (let c = 0; c < k; c++) {
    const m = r.centroids[c]
    varMeansByCluster.push([...m])
    const z = m.map((v, j) => (sd[j] === 0 ? 0 : (v - mean[j]) / sd[j]))
    varZScoresByCluster.push(z)
  }

  const elbow = computeElbow(rows, vars, method, opts)

  // 清掉不外露的內部欄位
  const { _Xstd, _Xraw, _stats, centroidsStd, ...publicResult } = r
  return {
    ...publicResult,
    method,
    vars,
    standardize,
    varMeansByCluster,
    varZScoresByCluster,
    elbow,
  }
}
