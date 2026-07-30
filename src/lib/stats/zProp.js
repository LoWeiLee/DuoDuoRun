/**
 * z 檢定（比例 / Proportion z-test）
 *
 * 對外 API：
 *   oneProp(rows, var1, successLevel, p0)
 *     單樣本比例：H0: p = p0, H1: p ≠ p0
 *     z = (p̂ - p0) / √(p0(1-p0)/n)
 *
 *   twoProp(rows, groupVar, valueVar, successLevel)
 *     雙獨立樣本比例：H0: p1 = p2
 *     pooled SE: √( p̄(1-p̄)(1/n1 + 1/n2) ), p̄ = (x1+x2)/(n1+n2)
 *     效果量 Cohen's h = 2·(arcsin√p1 − arcsin√p2)
 *
 * 兩種型別都使用常態雙尾 p。
 */
import { normalSf } from './pvalue.js'

// ★ R55（2026-07-30）：走 normalSf（上尾）而非 1 - normalCdf——
// 後者在 |z| ≥ 8.3 會回傳恰好 0（例：n=8、x=0、p0=0.9 ⇒ |z|=8.49）
function twoSidedZP(z) {
  if (!Number.isFinite(z)) return NaN
  return 2 * normalSf(Math.abs(z))
}

export function oneProp(rows, varName, successLevel, p0) {
  if (!varName) return { error: 'pickVar' }
  if (successLevel === null || successLevel === undefined || successLevel === '') {
    return { error: 'pickSuccess' }
  }
  const p0Val = Number(p0)
  if (!Number.isFinite(p0Val) || p0Val <= 0 || p0Val >= 1) {
    return { error: 'badP0' }
  }
  let n = 0, x = 0
  const successKey = String(successLevel)
  for (const r of rows) {
    const v = r[varName]
    if (v === null || v === undefined || v === '') continue
    n += 1
    if (String(v) === successKey) x += 1
  }
  if (n < 5) return { error: 'tooFewN' }
  const phat = x / n
  const se = Math.sqrt(p0Val * (1 - p0Val) / n)
  const z = (phat - p0Val) / se
  const p = twoSidedZP(z)
  // 95% Wilson CI
  const zc = 1.959963984540054
  const denom = 1 + zc * zc / n
  const center = (phat + zc * zc / (2 * n)) / denom
  const half = zc * Math.sqrt(phat * (1 - phat) / n + zc * zc / (4 * n * n)) / denom
  return {
    type: 'one',
    n, x, phat, p0: p0Val, z, p, se,
    ciLow: center - half,
    ciHigh: center + half,
    successLevel: successKey,
  }
}

export function twoProp(rows, groupVar, valueVar, successLevel) {
  if (!groupVar) return { error: 'pickGroup' }
  if (!valueVar) return { error: 'pickValueVar' }
  if (groupVar === valueVar) return { error: 'sameVar' }
  if (successLevel === null || successLevel === undefined || successLevel === '') {
    return { error: 'pickSuccess' }
  }
  const successKey = String(successLevel)
  // 蒐集兩組（取前兩個出現的 levels；提示使用者若 >2）
  const seen = new Map()
  for (const r of rows) {
    const g = r[groupVar]
    const v = r[valueVar]
    if (g === null || g === undefined || g === '') continue
    if (v === null || v === undefined || v === '') continue
    const key = String(g)
    if (!seen.has(key)) seen.set(key, { n: 0, x: 0 })
    const cell = seen.get(key)
    cell.n += 1
    if (String(v) === successKey) cell.x += 1
  }
  const groups = [...seen.entries()]
  if (groups.length < 2) return { error: 'needTwoGroups' }
  if (groups.length > 2) return { error: 'tooManyGroups', extra: { groups: groups.map(g => g[0]) } }
  const [[g1Name, g1], [g2Name, g2]] = groups
  if (g1.n < 5 || g2.n < 5) return { error: 'tooFewN' }

  const p1 = g1.x / g1.n
  const p2 = g2.x / g2.n
  const pPool = (g1.x + g2.x) / (g1.n + g2.n)
  const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / g1.n + 1 / g2.n))
  const z = (p1 - p2) / sePool
  const p = twoSidedZP(z)
  // Cohen's h
  const h = 2 * (Math.asin(Math.sqrt(p1)) - Math.asin(Math.sqrt(p2)))
  // 差距 95% CI（unpooled SE）
  const seDiff = Math.sqrt(p1 * (1 - p1) / g1.n + p2 * (1 - p2) / g2.n)
  const zc = 1.959963984540054
  const diff = p1 - p2
  return {
    type: 'two',
    g1Name, g2Name,
    n1: g1.n, x1: g1.x, p1,
    n2: g2.n, x2: g2.x, p2,
    pPool, sePool, z, p,
    h,
    diff,
    diffCiLow: diff - zc * seDiff,
    diffCiHigh: diff + zc * seDiff,
    successLevel: successKey,
  }
}
