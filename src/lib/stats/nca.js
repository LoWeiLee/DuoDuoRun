/**
 * 必要條件分析（Necessary Condition Analysis, NCA）
 *
 * 方法出處：Dul, J. (2016). Necessary Condition Analysis (NCA): Logic and
 * methodology of "necessary but not sufficient" causality. Organizational
 * Research Methods, 19(1), 10–52. 統計檢定：Dul, van der Laan & Kuik (2020),
 * A statistical significance test for NCA. Organizational Research Methods.
 *
 * NCA 檢視「X 是否為 Y 的必要條件」：高 Y 需要高 X（散佈圖左上角為空）。
 * ceiling line 把有觀察值（右下）與無觀察值（左上）的區域分開，左上空白區
 * （ceiling zone）除以整個可容納觀察值的矩形（scope）即效果量 d。
 *
 * 對外 API：
 *   runNCA(x, y, options?) → 完整結果物件
 *
 * 兩條預設 ceiling line：
 *   CE-FDH：非遞減階梯函數（envelopment / free disposal hull），
 *           ceiling(x) = max{ y_i : x_i ≤ x }（跑動最大值），準確度恆為 100%。
 *   CR-FDH：對 CE-FDH ceiling 點做 OLS 迴歸得線性 ceiling（於 scope 內夾擠）。
 *
 * 效果量基準（Dul 2016）：0<d<.1 小、.1≤d<.3 中、.3≤d<.5 大、d≥.5 非常大。
 *
 * 隨機性（permutation 檢定）採「固定 draws 注入」以利引擎層級交叉驗證：
 *   options.permutations 可為整數（用 options.seed 產生）或 number[][]（外部注入）。
 */

const EFFECT_BENCHMARKS = [
  { min: 0.5, key: 'veryLarge' },
  { min: 0.3, key: 'large' },
  { min: 0.1, key: 'medium' },
  { min: 0.0, key: 'small' },
]

export function effectSizeLabel(d) {
  for (const b of EFFECT_BENCHMARKS) if (d >= b.min) return b.key
  return 'small'
}

/** mulberry32 — 小型決定性 PRNG（僅供 permutation 預設生成；測試走注入不觸此路徑） */
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffledIndices(n, rand) {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

/**
 * CE-FDH peers（階梯轉角點）：ceiling(x)=max{y_i:x_i≤x} 的記錄點。
 * 依 x 遞增（同 x 取最大 y），每當跑動最大值被刷新即為一個 peer。
 */
export function ceFdhPeers(x, y) {
  const n = x.length
  const order = Array.from({ length: n }, (_, i) => i)
    .sort((p, q) => (x[p] - x[q]) || (y[p] - y[q]))
  const rx = []
  const ry = []
  let run = -Infinity
  let i = 0
  while (i < n) {
    const xv = x[order[i]]
    let m = y[order[i]]
    let j = i
    while (j < n && x[order[j]] === xv) {
      if (y[order[j]] > m) m = y[order[j]]
      j++
    }
    if (m > run) { rx.push(xv); ry.push(m); run = m }
    i = j
  }
  return { rx, ry }
}

function scopeOf(x, y) {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
  for (let i = 0; i < x.length; i++) {
    if (x[i] < xmin) xmin = x[i]
    if (x[i] > xmax) xmax = x[i]
    if (y[i] < ymin) ymin = y[i]
    if (y[i] > ymax) ymax = y[i]
  }
  return { xmin, xmax, ymin, ymax, area: (xmax - xmin) * (ymax - ymin) }
}

/** CE-FDH ceiling zone（階梯上方空白面積）= Σ (ymax−ry_j)(下一轉角x − rx_j) */
function ceilingZoneCE(rx, ry, xmax, ymax) {
  let C = 0
  for (let j = 0; j < rx.length; j++) {
    const nx = j + 1 < rx.length ? rx[j + 1] : xmax
    C += (ymax - ry[j]) * (nx - rx[j])
  }
  return C
}

/** 線性 ceiling y=a+bx 在 scope 矩形內、於 [ymin,ymax] 夾擠後的上方空白面積（分段線性精確） */
export function areaAboveClampedLine(a, b, xmin, xmax, ymin, ymax) {
  const bps = new Set([xmin, xmax])
  if (b !== 0) {
    for (const yv of [ymin, ymax]) {
      const xc = (yv - a) / b
      if (xc > xmin && xc < xmax) bps.add(xc)
    }
  }
  const pts = [...bps].sort((p, q) => p - q)
  const gap = (xv) => {
    const L = a + b * xv
    const Lc = L < ymin ? ymin : (L > ymax ? ymax : L)
    return ymax - Lc
  }
  let C = 0
  for (let k = 0; k < pts.length - 1; k++) {
    C += (pts[k + 1] - pts[k]) * (gap(pts[k]) + gap(pts[k + 1])) / 2
  }
  return C
}

/** CR-FDH：對 CE-FDH peers 做 OLS 得線性 ceiling */
function crFdh(rx, ry, scope) {
  const k = rx.length
  let mx = 0, my = 0
  for (let i = 0; i < k; i++) { mx += rx[i]; my += ry[i] }
  mx /= k; my /= k
  let sxy = 0, sxx = 0
  for (let i = 0; i < k; i++) { const dx = rx[i] - mx; sxy += dx * (ry[i] - my); sxx += dx * dx }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = my - slope * mx
  const C = areaAboveClampedLine(intercept, slope, scope.xmin, scope.xmax, scope.ymin, scope.ymax)
  return { intercept, slope, ceilingZone: C, effectSize: scope.area === 0 ? 0 : C / scope.area }
}

/** 準確度：落在 ceiling line 上或其下（右下區）的觀察值比例（CE-FDH 恆為 1） */
function accuracyLinear(x, y, a, b) {
  let onOrBelow = 0
  const eps = 1e-9
  for (let i = 0; i < x.length; i++) if (y[i] <= a + b * x[i] + eps) onOrBelow++
  return onOrBelow / x.length
}

/**
 * bottleneck：對每個 Y 水準（% of range）讀出 CE-FDH ceiling 所需的 X。
 * 回傳 { level, yValue, xValue, xPercent, nn }，nn（Not Necessary）表所需 X≤xmin。
 */
export function bottleneckCE(rx, ry, scope, levels) {
  const { xmin, xmax, ymin, ymax } = scope
  const yr = ymax - ymin
  const xr = xmax - xmin
  return levels.map((pct) => {
    const ystar = ymin + (pct / 100) * yr
    let idx = 0
    while (idx < ry.length && ry[idx] < ystar) idx++
    const xValue = idx >= ry.length ? xmax : rx[idx]
    return {
      level: pct,
      yValue: ystar,
      xValue,
      xPercent: xr === 0 ? 0 : ((xValue - xmin) / xr) * 100,
      nn: xValue <= xmin + 1e-9,
    }
  })
}

const DEFAULT_LEVELS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/**
 * NCA 主入口。
 * @param {number[]} x 條件變數
 * @param {number[]} y 結果變數
 * @param {object} [options] { bottleneckLevels, permutations, seed }
 *   permutations：整數 P（以 seed 生成 P 個排列）或 number[][]（注入固定排列）
 */
export function runNCA(x, y, options = {}) {
  if (!Array.isArray(x) || !Array.isArray(y)) return { error: 'need-arrays' }
  if (x.length !== y.length) return { error: 'length-mismatch' }
  const n = x.length
  if (n < 5) return { error: 'need-n>=5' }

  const scope = scopeOf(x, y)
  if (scope.xmax === scope.xmin || scope.ymax === scope.ymin) return { error: 'no-variation' }

  const { rx, ry } = ceFdhPeers(x, y)
  const zoneCE = ceilingZoneCE(rx, ry, scope.xmax, scope.ymax)
  const dCE = scope.area === 0 ? 0 : zoneCE / scope.area

  const levels = options.bottleneckLevels || DEFAULT_LEVELS
  const bottleneck = bottleneckCE(rx, ry, scope, levels)

  const ce = {
    method: 'ce_fdh',
    peers: rx.map((xi, i) => ({ x: xi, y: ry[i] })),
    ceilingZone: zoneCE,
    effectSize: dCE,
    effectLabel: effectSizeLabel(dCE),
    accuracy: 1,
    bottleneck,
  }

  const crRaw = crFdh(rx, ry, scope)
  const cr = {
    method: 'cr_fdh',
    intercept: crRaw.intercept,
    slope: crRaw.slope,
    ceilingZone: crRaw.ceilingZone,
    effectSize: crRaw.effectSize,
    effectLabel: effectSizeLabel(crRaw.effectSize),
    accuracy: accuracyLinear(x, y, crRaw.intercept, crRaw.slope),
    bottleneck: bottleneckCE(rx, ry, scope, levels), // 讀值錨定於 CE ceiling（NCA 慣例：bottleneck 用實際 ceiling）
  }

  // permutation 檢定（統計量 = CE-FDH d）
  let test = null
  if (options.permutations != null) {
    let perms
    if (Array.isArray(options.permutations)) {
      perms = options.permutations
    } else {
      const rand = mulberry32((options.seed ?? 42) >>> 0)
      perms = Array.from({ length: options.permutations }, () => shuffledIndices(n, rand))
    }
    let count = 0
    for (const perm of perms) {
      const yp = perm.map((i) => y[i])
      const { rx: prx, ry: pry } = ceFdhPeers(x, yp)
      const dPerm = scope.area === 0 ? 0 : ceilingZoneCE(prx, pry, scope.xmax, scope.ymax) / scope.area
      if (dPerm >= dCE) count++
    }
    test = { nPermutations: perms.length, p_ce: count / perms.length, statistic: dCE }
  }

  return { n, scope, ceilings: { ce_fdh: ce, cr_fdh: cr }, test }
}
