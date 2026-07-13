/**
 * Heading — 分析結果區塊的小節標題
 *
 * 2026-07-13 紅隊 R4：這個元件原本在 24 個 Result/Config 檔裡各自複製了一份
 * **完全相同**的定義（md5 比對確認 24 份位元相同）。任何樣式調整都得改 24 個檔，
 * 漏掉一個就出現不一致——抽成單一來源。
 */
function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

export default Heading
