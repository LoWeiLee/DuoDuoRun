/**
 * VarSelect — 變數選擇下拉（label ＋ select ＋ hint）
 *
 * 2026-07-13 紅隊 R4：原本在 11 個 Config 檔各自定義。比對後發現「5 種版本」其實
 * 只有 **2 種真實差異**，其餘是解構順序 / 換行的排版差異：
 *
 *   variant="cocoa"（原 15 處用法）：rounded-md ＋ border-duo-cocoa-100 ＋ hover cocoa-200
 *   variant="cream"（原 16 處用法）：rounded-lg ＋ border-duo-cream-200 ＋ hover amber-300
 *
 * ⚠ 這兩種外觀的分歧是**設計系統本身的不一致**，不是刻意的語意區分——
 *   `docs/mockups/mockup-d-final-hybrid.html` 的 `.select` 用 `--line: #e8dcc9`、
 *   `border-radius: 10px`，兩者都對不上。統一成哪一種是設計決策，需要 Kevin 拍板。
 *   在拍板之前，本元件**兩種都保留**，確保 R4 的「UI 目視無回歸」判準成立。
 *   拍板後只要改這個檔的 DEFAULT_VARIANT 一行即可全站統一。
 *
 * 無障礙：select 的 aria-label 一律綁 label 文字（R3 的要求）。
 */
const VARIANTS = {
  cocoa: 'rounded-md bg-white border border-duo-cocoa-100 hover:border-duo-cocoa-200',
  cream: 'rounded-lg bg-white border border-duo-cream-200 hover:border-duo-amber-300',
}

function VarSelect({ label, value, onChange, options, placeholder, hint, variant = 'cocoa' }) {
  const box = VARIANTS[variant] || VARIANTS.cocoa
  return (
    <div>
      <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">{label}</label>
      <select
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full h-9 px-3 pr-8 text-sm text-duo-cocoa-800 focus-ring focus:border-duo-amber-500 cursor-pointer ${box}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-duo-cocoa-400 mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

export default VarSelect
