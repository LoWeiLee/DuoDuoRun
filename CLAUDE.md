# 多多快跑（duoduorun）

跑在瀏覽器裡的中文統計軟體：React + Vite + Tailwind，所有統計核心為純 JS（src/lib/stats/），
資料不離開本機。每個分析是 src/analyses/<id>/ 的六件套
（index.js / compute.js / Config.jsx / Result.jsx / Narrative.jsx / Notes.jsx），
在 src/analyses/registry.js 註冊、src/config/analyses.js 進側欄選單、
src/config/demos.js 加「載入示範」、src/i18n/{zh-TW,en}.js 加中英字串。

## 關鍵慣例

- **Kevin 非工程師**：需要他本機執行的指令一律做成雙擊 .bat（參考根目錄 push.bat）。
- **統計核心改動必跑 `npm test`**（Vitest；含與 Python/R 基準的數值比對，見 tests/compare.test.js）。
- **檔案寫入用 bash heredoc**（quoted `<<'EOF'` 寫完整全文），避免掛載截斷；寫完 tail 驗尾 + eslint 驗 parse。
- **UI 遵循 docs/mockups/mockup-d-final-hybrid.html 設計系統**：
  duo.sig 綠黃紅語意（顯著=綠、需注意=紅）、LED 發光燈號（shadow-led-*）、數字一律 mono 字體；
  p 值格式與紅綠語意用 src/lib/format.js 的 fmtP / toneForP，不要自己 toFixed。
- **統計驗證管線見 docs/validation-report-v1.md**；PLS-SEM 模型 JSON 格式見 docs/pls-model-schema.md。
