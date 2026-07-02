# 多多快跑 程式碼審查報告 — 2026-05-13

審查由三個獨立維度的 agent 並行進行：
1. 統計算法正確性與數值穩健性
2. React 元件層（state、a11y、效能、可維護性）
3. 基礎設施與整體一致性（檔案上傳、PDF、i18n、配置、dead code）

審查視角：期刊審稿人 + production 上線前最後一關。

---

## 維度一：統計算法正確性

### 高優先（會影響論文可信度）

**1. 卡方 2×2 缺 Yates 連續性校正**
- `src/lib/stats/chiSquare.js` (chiSquareIndependence, L99-144)
- SPSS 2×2 預設同時報 Pearson 與 Yates；目前完全沒做。
- 修正：R=2 且 C=2 時加算 `Σ max(0,|O-E|-0.5)²/E`，輸出加 `chi2Yates`、`pYates` 欄位；最小期望次數 <5 時自動建議用 Fisher exact（你們有 fisherExact.js）。

**2. `runOneWayAnova` 對 k=2 報錯而非導向 t-test**
- `src/analyses/oneWayAnova/compute.js` L34-36
- 底層 `oneWayANOVA` 允許 k≥2，但 compute 強制 k≥3。
- 修正：error code 改為 `'useTTestForTwoGroups'`，UI 顯示「2 組請改用 t-test」。

**3. Mann-Whitney / Wilcoxon 缺連續性校正**
- `src/lib/stats/nonparametric.js`（mannWhitneyU L35-72、wilcoxonSignedRank L94-133）
- 小樣本（n≤20）p 值比 SPSS 偏小（更顯著），差距可達數個百分點。
- 還有兩處未防呆：全並列 `sigma²=0` → z=NaN；小 n + 大量並列 `sigma² -= tieSum/48` 可能變負。
- 修正：`z = (|U₁-μ| - 0.5) / sigma`；`sigma² = Math.max(sigma², 0)`，sigma=0 時 p=1。

**4. 各處 sd=0 / variance=0 未防呆**
- 配對 t Cohen's d (`ttest.js` L111)、Cronbach α `totalVar=0` (`alpha.js` L64-66)、Spearman 完全相同序列 (`correlation.js` L62-70)、多元迴歸 `sdY=0` (`multipleRegression.js` L136)。
- 全班同分（Likert 量表常見）會直接炸出 NaN / Infinity，沒有清楚錯誤訊息。
- 修正：每處加 zero-variance 偵測 + 回傳明確 warning。

**5. Levene 註解誤導**
- `src/lib/stats/levene.js` L6 註解寫「與 SPSS / JASP 預設一致」。
- 實際上 SPSS 預設是 mean-based Levene，median-based 是選項。
- 修正：改為「對齊 JASP 預設與 R::car::leveneTest 預設；SPSS 預設為 mean-based」。

### 中優先

- 配對 t 用的是 Cohen's dz（`ttest.js` L111），但 SPSS 預設報 d_av。建議同時回傳兩版本。
- Welch t 的 d 用 pooled SD 與 Welch 假設不等變異不一致；建議同時提供 d_pooled / d_glass / d_av。
- `chiSquareGoodnessOfFit` 期望機率自動正規化但未通知使用者（L179-185）。
- VIF 嚴重共線（>100）應在回傳物件加 `warning: 'severe-multicollinearity'`。
- `wilcoxonSignedRank` 全零差異報 error，應回 t=0, p=1。
- `independentT`、`runOneWayAnova` 等多處 error code 不夠具體（k=1 vs k>2 vs k=0 應分別處理）。
- `ptukey` 對 df<5 精度下降，需 UI 警示。
- `twoWayANOVA` SS 可能因浮點誤差為負微小值 → partial η² 為負；加 `Math.max(0, ssA)`。

### 已驗證 OK
descriptive、Welch-Satterthwaite df、pT/pF（Numerical Recipes 實作）、簡單迴歸全部公式、多元迴歸 OLS + VIF、One-way ANOVA + Tukey-Kramer、Two-way Type III SS、Pearson r、Cronbach α 主公式、Shapiro-Wilk Royston AS R94、KS-Lilliefors、ranks/pooledRanks、Kruskal-Wallis、Bonferroni 校正、matrix.js Gauss-Jordan、transforms.js zscore/log/reverse coding。整體核心公式正確且有明確 SPSS 對標意圖。

---

## 維度二：React 元件層

### 高優先

**1. ttest Narrative 把所有 error 都顯示成「請選擇依變項」**
- `src/analyses/ttest/Narrative.jsx` L120-126
- 真實場景：使用者已選依變項但分組變數是 3 組 → 看到誤導訊息以為自己沒選變項。
- 修正：比照 Result.jsx L316-323 區分不同 error code。

**2. AppContext value 物件每次 render 都新建**
- `src/context/AppContext.jsx` L196-215
- 所有 useApp() consumer 全部重新渲染。在平板/手機輸入 μ₀ 等 keystroke-heavy 場景特別明顯。
- 修正：value 用 `useMemo` 包；或拆 LangContext / DatasetContext / AnalysisStateContext / UiContext。

**3. Result.jsx 每次 render 直接呼叫 runX(...)**
- `src/analyses/descriptive/Result.jsx` L113、`correlation/Result.jsx` L36、`ttest/Result.jsx` L314 等。
- 語言切換、模式切換、resize 都會重算完整統計（1k 列 × 5 變數的相關矩陣不便宜）。
- 修正：用 `useMemo([dataset.rows, settings 必要欄位])` 包；建議抽 `useAnalysisResult(id, dataset, settings)` hook 統一處理。

**4. AppContext mobile detection 只在初次掛載偵測一次**
- L48-50（我這輪剛改的）。
- 使用者把瀏覽器從桌面寬度縮到手機寬度，sidebar 狀態不會調整。
- 修正：用 `window.matchMedia('(min-width: 768px)')` listener。

**5. 24+ 處 setTimeout 沒 cleanup**
- TopToolbar L111、L120（uploadStatus toast 3s/5s）；HomePage L36；MainContent L74；22 個 CopyButton；DecisionHelper L146-149 等。
- 元件 unmount 後 setState 會 warning；快速連續操作會互相覆蓋。
- 修正：抽 `useTimedFlash(duration)` hook 統一處理 cleanup。

**6. DataPreviewTable 用 array index 當 key**
- `DataPreviewTable.jsx` L59；同類 `charts.jsx` L80、L122、L181。
- 切換 dataset 時 React 不會卸載重建，hover state / CSS transition 會殘留。
- 修正：用 `${dataset.id}-${idx}` 或穩定欄位。

**7. PDF 匯出失敗用 `alert()` block UI**
- `TopToolbar.jsx` L151；HistoryDialog L92 用 `confirm()` 同樣問題。
- 修正：走 toast 系統。

**8. Modal 沒做 a11y**
- TransformDialog 與 HistoryDialog 都缺：`role="dialog"`、`aria-modal`、`aria-labelledby`、focus trap、開啟 focus 移入、關閉 focus 還回。
- 修正：抽共用 `<Modal>` 元件統一處理。

### 中優先

- `coming-soon` 項目用 `<div title>` 而非 `<button disabled aria-disabled>`（Sidebar L167-173）。
- TopToolbar 資料集 `<select>` 缺 `aria-label`（L256）。
- 手機 backdrop（TopToolbar / Sidebar / DecisionHelper）沒接 Esc。
- TransformDialog source 候選列表變動時，目前的 source 可能停留在已不存在的 column id（L46-52）。
- `structuredClone` 在 Safari 15.4 前不支援，建議加 fallback（AppContext L155-167）。
- PDF 匯出用 `document.querySelector('main')` 是 fragile，應改 ref。

### 低優先

- `aria-label="menu"` / `"tools"` 硬編碼英文（TopToolbar L166）。
- 邊框色 token 不一致：Toolbar/Sidebar 用 `duo-cocoa-100`，Result 表格與 Dialog 用 `duo-cream-200`。
- 多處 button 用 `focus:outline-none` 但沒補 `focus-visible:ring`，鍵盤聚焦看不出在哪。
- 手機 `hover:` 樣式會 stuck（觸控裝置 tap 後保留），建議用 `[@media(hover:hover)]:hover:` 變體。
- brand 是 `<button>` 內含 `<h1>`，語意上 h1 不該在 button 裡。

### 結構性建議
跨檔重複碼可抽出：
- `<CopyButton>`（22 處 + HomePage + MainContent）
- `<Heading>`（22 份 Result.jsx 各自定義）
- `<NotesSection>` + `<Formula>`（23 份 Notes.jsx）
- `<NarrativeBlock>`（22 份 Narrative.jsx）
- `<VarSelect>` + `<MultiVarPicker>`（10+ Config.jsx）
- `<PanelCollapseButton>`（Sidebar + MainContent 兩處 chevron SVG）
- `<Modal>` 統一 a11y

預估可移除 800-1000 行重複碼。

---

## 維度三：基礎設施與一致性

### 高優先（學生示範現場會炸）

**1. CSV 編碼僅支援 UTF-8，Big5 會全亂碼**
- `src/lib/fileParser.js` L58-77
- Windows 中文版 Excel 「另存為 CSV」預設 Big5。教學現場學生 90% 會遇到。
- 修正：用 `await file.text()` 先讀 string + 偵測 U+FFFD 替換字元；或 UI 加編碼下拉。最低限度：偵測到大量 U+FFFD 時提示「請改用 .xlsx 或另存為 UTF-8 CSV」。

**2. 無檔案大小 / 列數防護**
- `fileParser.js` L99-117
- 學生上傳 100MB 檔案會讓瀏覽器假死。
- 修正：`file.size > 50MB` 直接擋；`rows.length > 100000` 警告。

**3. html2canvas scale=2 + 長報告超過 canvas 上限**
- `src/lib/pdfExport.js` L72-82
- Safari 4096-8192px 上限，長 ANOVA 報告會空白。
- 修正：scale 改 `Math.min(2, 16000/targetEl.offsetHeight)`，或 Safari 降為 1.5。

**4. i18n placeholder 不對稱**
- `src/i18n/en.js` L2699 `alpha.apa.sentence` 缺 `{itemList}`（zh 有）。
- `en.js` L2512 `anova.apa.sentenceNs` 缺 `{sigWord}` 直接寫死「no significant」。

### 中優先

- XLSX 多 sheet 靜默只取第一張（`fileParser.js` L79-91）。
- PDF 沒設 `setProperties()`，metadata 全空。
- PDF footer URL 硬編碼 `https://qqamp.github.io/duoduorun/`，與 vite.config.js base 重複。
- PDF backgroundColor `#fbeed8` 硬編碼，未來改色票會不一致。
- transforms.js zscore aggregates 用 tr.name 為 key，同名 transform 會覆蓋。
- `index.html` 缺 OG meta、theme-color、canonical、png favicon。
- `deploy.yml` 沒跑 lint。
- categorical.js 註解與資料表不一致；employee.js clamp 風格與其他資料集不一致。

### 低優先（dead code 清理）

**確認可刪**：
- `reference/statlite.jsx`（586 行 dead code，僅註解提及）
- `src/App.css`（Vite scaffold 殘留，無人引用）
- `src/assets/hero.png`、`react.svg`、`vite.svg`
- `public/employee.csv`、`intervention.csv`、`multigroup.csv`、`categorical.csv`（UI 無連結引用；或加「下載原始 CSV」連結）

**文件更新**：
- README.md L85-92 開發里程碑 checkbox 全空，與實況不符
- README.md L44 提到「reference/ 之後抽出至 src/lib/stats/」已完成，文字過時

**雜項**：
- fileParser.js 數字正規式不接受 `+` 前綴
- en.js L30 typo「Maritime Potrol」→「Patrol」
- vite.config.js base 開發/生產可分流
- xlsx 用 CDN tarball URL（避開 npm 上 deprecated 版本，OK 但需 README 註明）

---

## 學生上傳體驗問題排序（按發生機率）

1. Big5 CSV → 全部亂碼（極高，Windows 預設）
2. 第一行不是欄名（學生留說明在第一行）→ Papa 沒明確訊息（中高）
3. 多 sheet xlsx → 默默丟掉其他 sheet（高）
4. 超大檔（>50MB）→ 瀏覽器假死（中）
5. 空欄位名或重複欄位名 → Papa 自動補 `"_1"` 或直接覆蓋（中）

建議 fileParser.js 加 `validate(rows, columns)` 函式回傳 warnings 陣列，UI 用 banner 顯示。

---

## 建議優先處理順序（如果只能挑做）

**第一階段（影響論文可信度，必修）**
- Yates 校正（chiSquare.js）
- Mann-Whitney / Wilcoxon 連續性校正（nonparametric.js）
- 各處 sd=0 防呆（ttest.js / alpha.js / correlation.js / multipleRegression.js）
- ttest Narrative 錯誤訊息修正
- runOneWayAnova k=2 error code
- Levene 註解「對齊 SPSS」措辭修正

**第二階段（影響學生示範現場）**
- fileParser.js 加 Big5 偵測 + 檔案大小上限 + 多 sheet 警告
- pdfExport.js 動態 scale
- AppContext value 用 useMemo + Result.jsx 用 useMemo 包 compute

**第三階段（結構性整理）**
- 抽 `<CopyButton>`、`<Heading>`、`<NotesSection>`、`<NarrativeBlock>`、`<VarSelect>`、`<Modal>` 共用元件
- 抽 `useTimedFlash` hook 統一 timer cleanup
- 補 i18n（取消 25+ 處 inline 中英三元）
- 加 ErrorBoundary

**第四階段（上線前清理）**
- 刪除 dead code（reference/、App.css、assets 殘留、public/ CSV）
- 補 i18n placeholder 不對稱（alpha.apa / anova.apa）
- 更新 README
- 補 index.html 的 OG meta
- deploy.yml 加 lint step
