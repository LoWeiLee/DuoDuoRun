# 多多快跑 紅隊審查與優化工作計畫書 v1（2026-07-12）

**讀者**：Opus 4.8（執行者）與 Kevin。
**定位**：對既有功能（26 傳統模組＋PLS-SEM＋NCA）的正確性、易用性、可用性紅隊審查結果，
與據以執行的優化工作計畫。PLS-SEM 新功能收尾另見 `pls-sem-w6-workplan-v1.md`，不在本文件範圍。

## 1. 本次紅隊查核證據（2026-07-12 實測）

- `npm test`：589 過、6 記錄性跳過（3 檔：pls 87、nca 16、compare 492）——與文件宣稱一致 ✓
- `eslint .`：**61 個問題（57 error、4 warning），散布 33 檔**（handoff 記 59，已微增）
- 對照基準：`code-review-2026-05-13.md`（三維度審查報告）逐項覆核修復狀態

### 1.1 2026-05-13 審查發現的修復狀態（逐項覆核）

已修 ✓（第一、二階段大致完成）：
Yates 校正、Mann-Whitney/Wilcoxon 連續性校正（`Math.max(0,|raw|-0.5)`）、
各處 zero-variance 防呆（ttest/correlation 皆有 `zeroVariance` 欄位）、
one-way ANOVA k=2 導向 t-test（`useTTestForTwoGroups`）、Big5 編碼偵測、
50MB 檔案上限、AppContext useMemo、i18n `alpha.apa` placeholder、NarrativeBlock 抽出。

**未修 ✗（本計畫的主要工作來源）**：
- Modal 無障礙：全 codebase `aria-modal` 出現 0 次；無 focus trap
- 無 ErrorBoundary（任一模組 render 炸掉＝白畫面）
- `TopToolbar.jsx:184` 仍用 `alert()` 報匯出失敗
- 鍵盤可視焦點：`focus:outline-none` 41 處 vs `focus-visible` 僅 1 處
- dead code：`reference/statlite.jsx`（586 行）仍在且貢獻 eslint 錯誤
- 共用元件抽取只完成 NarrativeBlock；CopyButton/Heading/NotesSection/Modal/VarSelect 未抽
- 61 個 eslint 問題（含 manova/efa/cluster 等統計檔的 no-unused-vars）

### 1.2 本次紅隊新增發現

1. **基準覆蓋缺口（正確性最高風險）**：`reference.json` 65 組方法中，
   **cluster 與 lda 完全沒有 Python/R 基準**——這兩個模組的數字從未被交叉驗證。
   EFA 只驗了一組設定（pca_varimax）；CFA 基準只到適配指標（χ²/df/CFI/TLI/RMSEA），
   **loadings 與因子相關未比對**。
2. **零 UI 測試**：測試全部在統計層；Config/Result/Narrative 的條件分支
   （error code 顯示、i18n 切換）無任何自動化防護。
3. **i18n 平衡未系統化驗證**：zh-TW 3,189 行 vs en 3,134 行；無 key 對稱性檢查腳本，
   缺譯只會在使用者切英文時發現。
4. `pvalue.js` 兩處 no-loss-of-precision 為 Numerical Recipes lgamma 常數（良性），
   應加註解＋eslint-disable-line 說明而非放任報錯，避免掩蓋未來真警報。

## 2. 工作計畫（session 切分，依風險排序）

### Session R1：正確性防線補齊（最高優先）
- cluster、lda 依 fixture-first 流程補基準（scikit-learn：KMeans/階層式、LinearDiscriminantAnalysis；
  沙盒已裝）；有差異即修，慣例差異雙處標註
- EFA 補第二、三組設定基準（promax 斜交、ML 萃取——若模組支援；不支援則記載邊界）
- CFA 基準擴充：semopy loadings＋因子相關逐值比對（現只驗適配指標）
- i18n key 對稱性檢查腳本（`tests/i18n.test.js`：zh/en 扁平化後 key 集合相等＋
  placeholder `{x}` 集合相等），一次抓出所有缺譯
- `pvalue.js` 精度常數加註＋定向 disable
- 交付判準：新基準全綠、i18n 測試綠、`npm test` 全綠

### Session R2：可用性防線（穩健性）
- ErrorBoundary（模組級：單一分析炸掉顯示中文錯誤卡片，不白畫面）
- 共用 `<Modal>` 元件（role="dialog"、aria-modal、aria-labelledby、focus trap、
  Esc 關閉、focus 還回），TransformDialog／HistoryDialog 改接
- `alert()`／`confirm()` 全數改走 toast／Modal
- 交付判準：手動煙霧清單（開關每個 dialog、觸發一個人工錯誤）＋ `npm test` 綠

### Session R3：無障礙與鍵盤（易用性）
- 41 處 `focus:outline-none` 補 `focus-visible:ring`（可做全域 utility）
- coming-soon 項目改 `<button disabled aria-disabled>`；select 補 aria-label；
  backdrop 接 Esc；aria-label 硬編碼英文改 i18n
- 手機：matchMedia listener 修 mobile 偵測；`hover:` 改 `[@media(hover:hover)]` 變體
- 交付判準：鍵盤走完「上傳→選分析→設定→複製結果」全流程不用滑鼠

### Session R4：結構清理
- eslint 61 → 0（含刪 `reference/statlite.jsx`——先確認 pvalue.js 註解提及的
  出處說明改寫進 docs；**刪檔前先問 Kevin**，遵守「不刪除任何檔案」通則的例外授權）
- 抽 CopyButton／Heading／NotesSection／VarSelect 共用元件；useTimedFlash hook 收 timer
- 2026-05-13 報告第四階段殘項：README 里程碑、OG meta、PDF metadata／動態 scale、
  多 sheet 警告、deploy.yml 加 lint step
- 交付判準：eslint 0 error、`npm test` 綠、UI 目視無回歸

### Session R5：UI 煙霧測試（選做，防未來回歸）
- vitest ＋ @testing-library/react 起步：每個分析模組一條「載示範資料→render Result
  →斷言關鍵統計量出現」的煙霧測試；error code → 訊息對映測試
- 交付判準：全模組煙霧測試綠；跑進 `npm test`

## 3. 執行紀律

- 沙盒限制、fixture-first、架構不變量沿 `handoff-roadmap-v1.md` §2–§3；
  沙盒跑 vitest 用 `node node_modules/vitest/vitest.mjs run tests/`（.bin 缺 vitest shim）
- UI 改動遵循 `docs/mockups/mockup-d-final-hybrid.html` 設計系統與 `fmtP`/`toneForP` 慣例
- 統計行為變更（R1 若修 cluster/lda）必須記入 `validation-report-v1.md`
- git：Kevin 先 Desktop Fetch/Pull → AI 改 → Kevin 檢視 Changes → Commit → Push

## 版本紀錄

- v1（2026-07-12）：初版（Fable 5 紅隊審查產出，供 Opus 4.8 執行）。
