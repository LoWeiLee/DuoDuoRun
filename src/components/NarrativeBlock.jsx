/**
 * APA 敘述區塊共用元件（2026-07 UI 改版）
 *
 * 定版樣式源自 src/analyses/ttest/Narrative.jsx
 * （對齊 docs/mockups/mockup-d-final-hybrid.html 的 .apa 區塊：
 *   cream 底 + hairline 邊框 + 左上 mono 小標籤 + 右上 ghost 複製鈕，
 *   複製後按鈕轉 copied 態 text-duo-sig-ok，1.5 秒還原）。
 * 各分析的 Narrative 統一改用本元件。
 *
 * Props:
 *   - heading   左上 mono 標籤文字（如「中文（APA）」/「English (APA)」）
 *   - text      APA 敘述內文（同時是複製鈕寫入剪貼簿的內容）
 *   - copyLabel { copy, copied } 複製鈕兩態文字
 *   - copyHint  複製鈕 title 提示
 *   - preLine   內文保留換行（whitespace-pre-line；供多行敘述使用，預設關）
 */
import { useState } from 'react'

function CopyButton({ text, label, hint }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={hint}
      className={[
        'px-2.5 py-1 text-[11px] font-medium rounded-md border bg-white transition',
        copied
          ? 'border-duo-sig-ok text-duo-sig-ok'
          : 'border-duo-cocoa-100 text-duo-cocoa-500 hover:border-duo-amber-400 hover:text-duo-amber-700',
      ].join(' ')}
    >
      {copied ? label.copied : label.copy}
    </button>
  )
}

function NarrativeBlock({ heading, text, copyLabel, copyHint, preLine = false }) {
  return (
    <section className="mb-5 rounded-xl border hairline bg-duo-cream-50 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-duo-amber-700">
          {heading}
        </h4>
        <CopyButton text={text} label={copyLabel} hint={copyHint} />
      </div>
      <div className={'text-sm text-duo-cocoa-800 leading-relaxed' + (preLine ? ' whitespace-pre-line' : '')}>
        {text}
      </div>
    </section>
  )
}

export default NarrativeBlock
