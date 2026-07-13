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

## ★ 新增統計方法的鐵律（2026-07-13 起強制，測試會擋）

**順序不可顛倒**：

1. 先找**可執行的第三方實作**（沙盒 pip 裝得到，或 Kevin 本機 R 跑得動）
2. 找不到才回到**原始論文並記下方程式編號**
3. 兩者都做不到 → **不做這個方法**，或明確標為「無法驗證」並在 UI 警告
4. **然後**才寫 tests/generate_reference.py 的基準與 src/lib/stats/ 的實作
5. 同時在 tests/fixtures/provenance.json 登記溯源，否則 tests/provenance.test.js 紅燈

**為什麼**：generate_reference.py 的「numpy 手算」基準與 JS 實作出自同一個作者對論文的
同一次理解——兩邊編碼的是同一個猜測。compare.test.js 抓得到「兩邊抄不一致」，
**抓不到「公式讀錯」**。2026-07-13 的 R 抽驗找到的四個 bug 全部落在手算基準；
對照 scipy/statsmodels/pingouin/sklearn 的 52 組，一個都沒出事。

**權威來源依方法族而異**（「查 SPSS/JASP」不是通則）：
基礎統計→R/scipy/statsmodels（SPSS 與 JASP 分歧時兩邊都記）；
PLS-SEM→SmartPLS 4 ＋ Hair/Henseler/Ringle 原始論文，開源代理 seminr（Hair 團隊）／cSEM（Henseler 團隊）；
CB-SEM→lavaan/Mplus；NCA→Dul 的 R NCA 套件；EFA/CFA→factor_analyzer/semopy，R psych/lavaan 為第二道。

完整規範見 **docs/formula-provenance.md**；工單見 **docs/roadmap-v2.md**（單一主工單）。
