/**
 * VarSelect — 變數選擇下拉（label ＋ select ＋ hint）
 *
 * 2026-07-13 紅隊 R4：原本在 11 個 Config 檔各自定義。比對後發現「5 種版本」其實
 * 只有 **2 種真實差異**（其餘是解構順序 / 換行的排版差異）：
 *
 *   A（7 檔）：rounded-md ＋ border-duo-cocoa-100 ＋ hover cocoa-200
 *   B（4 檔）：rounded-lg ＋ border-duo-cream-200 ＋ hover amber-300
 *
 * 這是設計系統本身的不一致，不是刻意的語意區分。以設計稿
 * `docs/mockups/mockup-d-final-hybrid.html` 的 `.select` 為準（Kevin 2026-07-13 拍板統一）：
 *
 *   邊框色 `--line: #e8dcc9`
 *     → duo-cocoa-100 (#ebd9c4) 的 RGB 距離 6.6；duo-cream-200 (#f4ddb2) 是 26.0
 *     → 採 **border-duo-cocoa-100**
 *   圓角 10px
 *     → Tailwind 標準階梯無 10px；rounded-lg (8px) 比 rounded-md (6px) 接近
 *     → 採 **rounded-lg**
 *   hover 設計稿未規範
 *     → 採 **hover:border-duo-amber-300**：amber 是全站的互動強調色（focus ring 亦為
 *        amber），hover 與 focus 用同一色系，互動訊號才一致
 *
 * 要改回其他組合，只需動下面這一個常數。
 *
 * 無障礙：select 的 aria-label 一律綁 label 文字（R3 的要求）。
 */
const BOX = 'rounded-lg bg-white border border-duo-cocoa-100 hover:border-duo-amber-300'

function VarSelect({ label, value, onChange, options, placeholder, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-duo-cocoa-700 mb-1">{label}</label>
      <select
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full h-9 px-3 pr-8 text-sm text-duo-cocoa-800 focus-ring focus:border-duo-amber-500 cursor-pointer ${BOX}`}
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
