/**
 * 數值格式化工具
 *
 * 統一所有 UI 數值顯示，避免散落在各元件的 toFixed 變成不一致格式。
 *
 * fmtNum(v, decimals=2)  — 一般數字（含 NaN/Infinity 處理 → '—'）
 * fmtInt(v)              — 整數（自動 round）
 * fmtP(p)                — p-value：< .001 顯示 "< .001"，其餘三位小數
 *                          注意：APA 格式不寫 "p = 0.034" 而是 "p = .034"（無前導 0）
 * fmtSig(p)              — 顯著性星號：< .001=***, < .01=**, < .05=*, 其餘=''
 * fmtRange(min, max)     — "1 – 5"
 * fillTemplate(tpl, d)   — 把 "{key}" 占位符換成 d[key]
 *
 * ★ 效果量分級（R54b，2026-07-30 紅隊）：
 * effectBandR(r)  — 無母數的秩相關型效果量 r（Mann-Whitney / Wilcoxon）
 * effectBandV(v)  — Cramér's V
 * 收在這裡的理由：這兩個分級原本各有兩套實作（Result.jsx 與 Narrative.jsx 各一份），
 * 屬「同一個判斷有沒有兩套實作」之型；且 nonparametric 的版本只有三級，
 * 與同模組 notes 文字宣告的四級（含「微弱 < 0.1」）不一致——使用者永遠看不到「微弱」。
 * 統一為 Cohen 四級：< .10 微弱 / < .30 小 / < .50 中 / ≥ .50 大。
 */

const isBadNumber = (v) =>
  typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)

/** Cohen 四級分帶（共用）：回傳 i18n 的 key，值不合法回 null */
function cohenBand(x) {
  if (isBadNumber(x)) return null
  const a = Math.abs(x)
  if (a < 0.1) return 'trivial'
  if (a < 0.3) return 'small'
  if (a < 0.5) return 'medium'
  return 'large'
}

/** 無母數效果量 r（|z|/√N）的分級 */
export const effectBandR = (r) => cohenBand(r)

/** Cramér's V 的分級 */
export const effectBandV = (v) => cohenBand(v)

export function fmtNum(v, decimals = 2) {
  if (isBadNumber(v)) return '—'
  return v.toFixed(decimals)
}

export function fmtInt(v) {
  if (isBadNumber(v)) return '—'
  return Math.round(v).toString()
}

/** APA 格式 p-value（無前導 0） */
export function fmtP(p) {
  if (isBadNumber(p)) return '—'
  if (p < 0.001) return '< .001'
  // 三位小數，去掉前導 "0"
  const s = p.toFixed(3)
  return s.startsWith('0') ? s.slice(1) : s
}

export function fmtSig(p) {
  if (isBadNumber(p)) return ''
  if (p < 0.001) return '***'
  if (p < 0.01) return '**'
  if (p < 0.05) return '*'
  return ''
}

export function fmtRange(min, max) {
  return `${fmtNum(min, 0)} – ${fmtNum(max, 0)}`
}

/**
 * 把 "{key}" 占位符換成 data[key]。
 * 用於 i18n 的 APA 模板字串。
 *
 *   fillTemplate('M = {m}, SD = {sd}', { m: '3.2', sd: '0.8' })
 *   → 'M = 3.2, SD = 0.8'
 */
export function fillTemplate(tpl, data) {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => {
    const v = data[key]
    return v === undefined || v === null ? `{${key}}` : String(v)
  })
}

/**
 * p 值的紅綠語意（2026-07 UI 改版）：顯著=ok（綠）、未達顯著=bad（紅，需注意）
 * @returns 'ok' | 'bad' | undefined（p 非有限數值時）
 */
export function toneForP(p, alpha = 0.05) {
  if (!Number.isFinite(p)) return undefined
  return p < alpha ? 'ok' : 'bad'
}
