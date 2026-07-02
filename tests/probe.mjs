/** 除錯用：逐 adapter 執行，列出 JS 實際值 vs Python 基準值與相對差。 */
import { ADAPTERS, REF } from './adapters.mjs'

const relDiff = (a, b) => {
  if (a === null || b === null || a === undefined || b === undefined) return NaN
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12)
  return Math.abs(a - b) / scale
}

for (const key of Object.keys(REF)) {
  const ref = REF[key]
  if (!ADAPTERS[key]) { console.log(`\n## ${key}  [NO ADAPTER]`); continue }
  console.log(`\n## ${key}  (${ref.source})`)
  let actual
  try { actual = ADAPTERS[key]() } catch (e) {
    console.log(`   ERROR: ${e.message}`)
    continue
  }
  for (const [field, expected] of Object.entries(ref.values)) {
    const got = actual[field]
    if (Array.isArray(expected)) {
      const diffs = expected.map((e, i) => relDiff(e, got?.[i]))
      const worst = Math.max(...diffs)
      console.log(`   ${field}: worst relDiff=${worst.toExponential(2)}  exp=${JSON.stringify(expected)}  got=${JSON.stringify(got?.map((x) => +x.toFixed(6)))}`)
    } else {
      const d = relDiff(expected, got)
      const flag = Number.isFinite(d) ? (d < 1e-6 ? 'OK ' : d < 1e-3 ? '~  ' : 'DIFF') : 'N/A '
      console.log(`   [${flag}] ${field}: exp=${expected}  got=${got}  relDiff=${Number.isFinite(d) ? d.toExponential(2) : 'NA'}`)
    }
  }
}
