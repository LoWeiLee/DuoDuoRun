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
 */

const isBadNumber = (v) =>
  typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)

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
