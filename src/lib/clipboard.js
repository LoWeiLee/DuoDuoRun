/**
 * 表格 → TSV 複製工具
 *
 * 主要 API：
 *   tableElToTsv(tableEl)        — 單一 <table> DOM 轉 TSV 字串
 *   copyAllTablesIn(rootEl)      — 掃描容器內所有 table，串接成多段 TSV，自動偵測各表格上方標題
 *   copyToClipboard(text)        — 寫入剪貼簿（含 textarea fallback）
 *
 * TSV 格式：每列以 \t 分隔，列間以 \n。直接貼到 Excel / Google Sheets 會自動分欄。
 * 多表時用「# 標題」+ 空行分隔。
 */

/** 抽取 cell 純文字並 normalize（清掉 \t \n 等會破壞 TSV 的字元） */
function cellText(cellEl) {
  // innerText 會處理樣式相關的隱藏（display:none）— 比 textContent 更接近視覺
  let txt = cellEl.innerText ?? cellEl.textContent ?? ''
  // nbsp（U+00A0）→ 普通空格。必須用 \u00A0 跳脫而非字面字元：
  // 字面 nbsp 會觸發 eslint 的 no-irregular-whitespace，且肉眼與一般空格無異，
  // 極易在後續編輯中被誤改成普通空格（2026-07-13 紅隊清理時就踩過一次）。
  txt = txt.replace(/\u00A0/g, ' ')
  txt = txt.replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
  txt = txt.replace(/\s+/g, ' ').trim()
  return txt
}

export function tableElToTsv(tableEl) {
  if (!tableEl) return ''
  const rows = []
  for (const part of ['thead', 'tbody', 'tfoot']) {
    const section = tableEl.querySelector(part)
    if (!section) continue
    for (const tr of section.querySelectorAll('tr')) {
      const cells = []
      for (const c of tr.querySelectorAll('th,td')) {
        cells.push(cellText(c))
      }
      if (cells.length > 0) rows.push(cells.join('\t'))
    }
  }
  // 若沒 thead/tbody，直接掃 tr（少數簡單 table 的情況）
  if (rows.length === 0) {
    for (const tr of tableEl.querySelectorAll('tr')) {
      const cells = []
      for (const c of tr.querySelectorAll('th,td')) cells.push(cellText(c))
      if (cells.length > 0) rows.push(cells.join('\t'))
    }
  }
  return rows.join('\n')
}

/** 找到 table 之前最近的 heading 文字（h1-h4 或 .heading-eyebrow） */
function findTableTitle(tableEl, rootEl) {
  // 1. 同層往前找最近的 heading
  let cursor = tableEl.previousElementSibling
  while (cursor) {
    if (/^H[1-4]$/.test(cursor.tagName) || cursor.classList?.contains('heading-eyebrow')) {
      const t = cellText(cursor)
      if (t) return t
    }
    cursor = cursor.previousElementSibling
  }
  // 2. 往上找最接近的 wrapper，掃 wrapper 內 table 之前的 heading
  let parent = tableEl.parentElement
  while (parent && parent !== rootEl) {
    // 找 parent 中比 table 早出現的 h1-h4
    const all = parent.querySelectorAll('h1, h2, h3, h4, .heading-eyebrow')
    let last = ''
    for (const h of all) {
      if (h.compareDocumentPosition(tableEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
        // h 在 table 之前
        const t = cellText(h)
        if (t) last = t
      }
    }
    if (last) return last
    parent = parent.parentElement
  }
  return ''
}

export function copyAllTablesIn(rootEl) {
  if (!rootEl) return { count: 0, text: '' }
  const tables = rootEl.querySelectorAll('table')
  if (tables.length === 0) return { count: 0, text: '' }
  const sections = []
  let i = 1
  for (const table of tables) {
    const tsv = tableElToTsv(table)
    if (!tsv) continue
    const rawTitle = findTableTitle(table, rootEl)
    const title = rawTitle || `Table ${i}`
    sections.push(`# ${title}\n${tsv}`)
    i += 1
  }
  return { count: sections.length, text: sections.join('\n\n') }
}

export async function copyToClipboard(text) {
  if (!text) return false
  // 1. 現代瀏覽器：navigator.clipboard
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // navigator.clipboard 在非 HTTPS／權限被拒時會 throw → 落到下方的 fallback
    }
  }
  // 2. fallback：textarea + execCommand
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    console.error('Copy failed', e)
    return false
  }
}
