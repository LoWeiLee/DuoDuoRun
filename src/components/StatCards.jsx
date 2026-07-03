/**
 * 關鍵統計量卡片列（2026-07 UI 改版，對齊 docs/mockups/mockup-d-final-hybrid.html）
 *
 * 用法：
 *   <StatCards items={[
 *     { label: 't 統計量', value: '−0.475', sub: 'df = 57.93' },
 *     { label: 'p 值（雙尾）', value: '.637', sub: '未達顯著', tone: 'bad' },
 *     { label: "Cohen's d", value: '−0.123', sub: '微小效果' },
 *   ]} />
 *
 * tone：'ok'（綠，如 p 顯著）| 'warn'（黃）| 'bad'（紅，未達顯著/需注意）| undefined（中性 cocoa）
 *       p 值請用 lib/format.js 的 toneForP(p) 產生 tone。
 * 語意原則（Kevin 2026-07-02 定案）：全站統一綠黃紅；「特別需要注意」一律紅色。
 */

const TONE_TEXT = {
  ok:   'text-duo-sig-ok',
  warn: 'text-duo-sig-warn',
  bad:  'text-duo-sig-bad',
}

function StatCards({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="grid gap-3 mb-4 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-duo-cocoa-100 bg-duo-cream-50/70 px-3.5 py-3">
          <div className="text-[11px] text-duo-cocoa-400 mb-1">{it.label}</div>
          <div className={`font-mono font-bold leading-tight ${it.long ? 'text-sm' : 'text-xl'} ${TONE_TEXT[it.tone] || 'text-duo-cocoa-800'}`}>
            {it.value}
          </div>
          {it.sub && (
            <div className={`text-[11px] mt-0.5 font-mono ${TONE_TEXT[it.tone] || 'text-duo-cocoa-400'}`}>
              {it.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default StatCards
