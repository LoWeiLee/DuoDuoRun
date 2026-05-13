/**
 * 使用者上傳檔案的解析器（純前端）
 *
 * 對外 API：
 *   parseFile(file) → Promise<{ name, rows, columns, warnings }>
 *
 *   支援副檔名：.csv (Papa Parse) / .xlsx / .xls (SheetJS)
 *
 * 設計原則：
 *   - 動態 import 避免初載入體積膨脹
 *   - 第一列當欄位名稱（自動偵測）
 *   - 數值字串自動轉 number
 *   - CSV 自動偵測 UTF-8 / Big5 編碼（Windows 中文 Excel 常見）
 *   - 多工作表的 XLSX 只取第一張，並回報忽略清單
 *   - 完全在瀏覽器解析，不上傳到任何伺服器
 *
 * 隱私聲明：本函式只在 user 的瀏覽器執行，檔案內容永遠不會離開本機。
 *
 * 警告（warnings）回傳結構：
 *   { code: string, meta?: object }
 *   - 'decoded-as-big5'      CSV 偵測為 Big5（meta: { fileType })
 *   - 'encoding-suspect'     UTF-8/Big5 都解析失敗，保留 UTF-8 但可能亂碼
 *   - 'ignored-sheets'       XLSX 有多 sheet（meta: { sheets, used }）
 *   - 'large-row-count'      列數 > LARGE_ROW_THRESHOLD（meta: { n }）
 */

const SUPPORTED_EXTENSIONS = ['csv', 'xlsx', 'xls']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const LARGE_ROW_THRESHOLD = 100000
// CSV 編碼偵測：UTF-8 解析後若替換字元（U+FFFD）比例 > 此閾值，視為可能非 UTF-8
const ENCODING_REPLACEMENT_RATIO = 0.001 // 0.1%

/** 取出小寫副檔名（無副檔名回傳空字串） */
function getExt(filename) {
  const i = filename.lastIndexOf('.')
  if (i < 0) return ''
  return filename.slice(i + 1).toLowerCase()
}

/** 嘗試把字串轉成數值，若無法則保留原 string */
function tryNumber(v) {
  if (v === null || v === undefined) return v
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (trimmed === '') return null
    // 純數字（含正負號、小數、科學記號）
    if (/^[+-]?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(trimmed)) {
      const n = Number(trimmed)
      return Number.isFinite(n) ? n : v
    }
  }
  return v
}

/** 把 row 中所有欄位嘗試轉數字，並把空字串視為 null（遺漏值） */
function normalizeRow(row) {
  const out = {}
  for (const k of Object.keys(row)) {
    const v = row[k]
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else {
      out[k] = tryNumber(v)
    }
  }
  return out
}

/**
 * 計算字串中 U+FFFD（unicode replacement character）數量
 * 用來判斷編碼解析品質：替換字元越多代表編碼不對
 */
function countReplacementChars(s) {
  let count = 0
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === 0xFFFD) count++
  }
  return count
}

/**
 * 偵測編碼並解碼為文字
 * 流程：先試 UTF-8，若替換字元 > 0.1% 改試 Big5；都不行就回 UTF-8 並警告
 *
 * @param {ArrayBuffer} buffer
 * @returns {{ text: string, warning?: { code: string } }}
 */
function decodeWithFallback(buffer) {
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false })
  const utf8Text = utf8Decoder.decode(buffer)
  const utf8Repl = countReplacementChars(utf8Text)
  const utf8Ratio = utf8Text.length > 0 ? utf8Repl / utf8Text.length : 0

  if (utf8Ratio <= ENCODING_REPLACEMENT_RATIO) {
    return { text: utf8Text }
  }

  // UTF-8 看起來不對，試 Big5
  try {
    const big5Decoder = new TextDecoder('big5', { fatal: false })
    const big5Text = big5Decoder.decode(buffer)
    const big5Repl = countReplacementChars(big5Text)
    // Big5 解出來的替換字元明顯比 UTF-8 少 → 採用 Big5
    if (big5Repl < utf8Repl * 0.5) {
      return { text: big5Text, warning: { code: 'decoded-as-big5' } }
    }
  } catch {
    // 瀏覽器不支援 big5 TextDecoder（罕見）
  }

  // 兩種都不理想，保留 UTF-8 並警告編碼可疑
  return { text: utf8Text, warning: { code: 'encoding-suspect' } }
}

async function parseCsv(file) {
  const Papa = (await import('papaparse')).default
  // 先以 ArrayBuffer 讀取，做編碼偵測
  const buffer = await file.arrayBuffer()
  const decoded = decodeWithFallback(buffer)
  const warnings = decoded.warning ? [decoded.warning] : []

  return new Promise((resolve, reject) => {
    Papa.parse(decoded.text, {
      header: true,
      dynamicTyping: false, // 我們自己控制 type conversion
      skipEmptyLines: true,
      transformHeader: (h) => String(h).trim(),
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('empty-file'))
          return
        }
        const rows = results.data.map(normalizeRow)
        resolve({ rows, warnings })
      },
      error: (err) => reject(err),
    })
  })
}

async function parseXlsx(file) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('empty-workbook')
  }
  const warnings = []
  const usedSheet = wb.SheetNames[0]
  if (wb.SheetNames.length > 1) {
    warnings.push({
      code: 'ignored-sheets',
      meta: {
        used: usedSheet,
        ignored: wb.SheetNames.slice(1),
      },
    })
  }
  const sheet = wb.Sheets[usedSheet]
  // header row 用第一列；defval: '' 把空 cell 補空字串，後續 normalizeRow 轉 null
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
  if (json.length === 0) throw new Error('empty-sheet')
  return { rows: json.map(normalizeRow), warnings }
}

/**
 * 解析使用者上傳的檔案。
 *
 * @param {File} file
 * @returns {Promise<{ name: string, rows: object[], columns: string[], warnings: object[] }>}
 */
export async function parseFile(file) {
  if (!file) throw new Error('no-file')

  // 檔案大小防護
  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('file-too-large')
    err.maxMb = Math.round(MAX_FILE_SIZE / 1024 / 1024)
    err.actualMb = (file.size / 1024 / 1024).toFixed(1)
    throw err
  }

  const ext = getExt(file.name)
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    const err = new Error('unsupported-format')
    err.ext = ext
    throw err
  }

  let parsed
  if (ext === 'csv') parsed = await parseCsv(file)
  else parsed = await parseXlsx(file)

  const { rows, warnings } = parsed
  if (!rows || rows.length === 0) throw new Error('empty-after-parse')
  const columns = Object.keys(rows[0])
  if (columns.length === 0) throw new Error('no-columns')

  // 列數警告
  if (rows.length > LARGE_ROW_THRESHOLD) {
    warnings.push({
      code: 'large-row-count',
      meta: { n: rows.length, threshold: LARGE_ROW_THRESHOLD },
    })
  }

  return { name: file.name, rows, columns, warnings }
}
