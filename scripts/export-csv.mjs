/**
 * 匯出 5 個示範資料集為 CSV，輸出到 public/<dataset>.csv
 *
 * 用途：
 *   - 提供給使用者下載原始資料（部署後可從 https://loweilee.github.io/DuoDuoRun/<id>.csv 取得）
 *   - 用 JASP / SPSS / R 驗證計算結果一致性
 *
 * 執行：
 *   node scripts/export-csv.mjs
 *
 * CSV 規範：
 *   - UTF-8 with BOM（Excel 讀中文不會亂碼）
 *   - LF 行尾（跨平台一致；Excel 與 JASP 都吃）
 *   - 含欄位名稱列（從第一筆資料的 keys 取）
 *   - 遺漏值輸出為空白
 *   - 字串值若含逗號／換行／引號則以雙引號包覆並 escape
 */
import fs from 'node:fs'
import path from 'node:path'

import { EMPLOYEE_DATA } from '../src/data/employee.js'
import { INTERVENTION_DATA } from '../src/data/intervention.js'
import { MULTIGROUP_DATA } from '../src/data/multigroup.js'
import { CATEGORICAL_DATA } from '../src/data/categorical.js'
import { FACTORIAL_DATA } from '../src/data/factorial.js'

function escapeCell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCsv(rows) {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const lines = [cols.join(',')]
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(','))
  }
  return lines.join('\n')
}

const BOM = '\uFEFF'
const OUT_DIR = path.resolve(process.cwd(), 'public')

const datasets = [
  ['employee.csv',     EMPLOYEE_DATA],
  ['intervention.csv', INTERVENTION_DATA],
  ['multigroup.csv',   MULTIGROUP_DATA],
  ['categorical.csv',  CATEGORICAL_DATA],
  ['factorial.csv',    FACTORIAL_DATA],
]

for (const [filename, data] of datasets) {
  const out = path.join(OUT_DIR, filename)
  fs.writeFileSync(out, BOM + toCsv(data), 'utf8')
  console.log(`Wrote ${out}  (${data.length} rows)`)
}
