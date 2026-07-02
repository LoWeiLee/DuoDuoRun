/**
 * 把 src/analyses 下所有 Result.jsx 與 Narrative.jsx 內
 * 「const result = runX(dataset.rows, args)」這類直接呼叫包成 useMemo，
 * 避免每次 re-render 都重算統計。
 *
 * 用法：
 *   node scripts/wrap-compute-with-memo.mjs
 *
 * 安全特性：
 *   - 只處理符合 pattern 的行；不符的略過
 *   - 若該檔已含 useMemo import，不重複加
 *   - 同檔多處呼叫都會替換
 *   - dry-run 模式：DRY=1 node scripts/wrap-compute-with-memo.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const DRY = !!process.env.DRY
const ROOT = path.resolve('src/analyses')

/** 遞迴找出所有 Result.jsx 與 Narrative.jsx */
function collect(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collect(full))
    else if (entry.name === 'Result.jsx' || entry.name === 'Narrative.jsx') out.push(full)
  }
  return out
}

const files = collect(ROOT)
let totalChanged = 0
let totalReplacements = 0

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8')
  const before = src

  // 偵測：const result/results = runFoo(dataset.rows, ARGS)
  //   ARGS 可能是任何單一識別字（state、settings、selectedVars 等）
  const re = /(\n[ \t]*)const (results?) = (run[A-Za-z]\w*)\((dataset\.rows),\s*([A-Za-z_]\w*)\)/g
  src = src.replace(re, (m, ws, varName, fn, rows, args) => {
    totalReplacements++
    return `${ws}const ${varName} = useMemo(() => ${fn}(${rows}, ${args}), [dataset, ${args}])`
  })

  if (src !== before) {
    // 確保 useMemo 已 import
    const hasReactNamed = /import\s+\{([^}]*)\}\s+from\s+(['"])react\2/.test(src)
    const hasUseMemo = /import\s+\{[^}]*\buseMemo\b[^}]*\}\s+from\s+(['"])react\1/.test(src)
    if (!hasUseMemo) {
      if (hasReactNamed) {
        src = src.replace(
          /import\s+\{([^}]*)\}\s+from\s+(['"])react\2/,
          (mAll, names, q) => {
            const list = names.split(',').map((s) => s.trim()).filter(Boolean)
            if (!list.includes('useMemo')) list.push('useMemo')
            return `import { ${list.join(', ')} } from ${q}react${q}`
          }
        )
      } else {
        // 在第一個 import 之前插入新行
        src = src.replace(/^(import .+\r?\n)/m, `import { useMemo } from 'react'\n$1`)
      }
    }

    if (DRY) {
      console.log(`[dry] ${path.relative('.', f)}`)
    } else {
      fs.writeFileSync(f, src)
      console.log(`updated ${path.relative('.', f)}`)
    }
    totalChanged++
  }
}

console.log(`\n${totalChanged} files changed, ${totalReplacements} compute call(s) wrapped.`)
if (DRY) console.log('(dry-run only — pass without DRY=1 to apply)')
