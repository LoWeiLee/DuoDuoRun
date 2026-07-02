# 多多快跑 優化路線圖 v1（2026-07-02）

## 現況盤點

- 技術棧：React 19 + Vite + Tailwind，26 個分析模組（每模組 compute / Config / Result / Narrative / Notes 分離），統計核心獨立於 `src/lib/stats/`（30 支）
- 2026-05-13 code review 的 A 階段（統計可信度）與 B 階段（示範現場）修正已 commit
- 已有 GitHub Pages 部署（`.github/workflows/deploy.yml`）
- **最大缺口：無任何自動化測試**（`package.json` 無 test script）。所有統計正確性目前只靠人工抽驗，任何重構都有無聲回歸的風險

## 執行順序與理由

驗證 → UI 重構 → PLS-SEM。驗證建立的回歸測試集是後兩階段的安全網：UI 重構不怕改壞計算，PLS-SEM 開發直接沿用同一套基準比對流程。

---

## Phase 1：演算法驗證 + 常設回歸測試（預估 2–3 個工作階段）

目標：26 個分析模組全數與 R 黃金標準比對，並把比對固化為 `npm test`。

1. 建立測試資料集：每方法一般案例 + 邊界案例（小樣本、大量並列、零變異、缺失值、極端不平衡組）
2. 用 R 產生基準值 JSON（R 與 JASP 底層一致，等於間接對齊 JASP；沙盒若裝不了 R，退回 Python statsmodels/pingouin/factor_analyzer，差異項再由 Kevin 本機 JASP 複核）
3. Vitest 自動比對至小數 4–6 位，差異分三級：演算法錯誤（必修）／預設值不同（SPSS vs R vs JASP，文件標註）／浮點誤差（容忍）
4. 產出：驗證報告（逐方法對照表）+ 常設測試集，之後每次改動一鍵重驗

重點盯防區（複雜度最高、最易有出入）：CFA（估計法與適配指標）、Mixed ANOVA（球形性校正、SS type）、MANOVA（四種統計量換算 F）、EFA（轉軸收斂）、邏輯斯迴歸（迭代收斂與分離問題）、Tukey HSD（ptukey 近似精度）。

## Phase 2：UI 儀表板化改版（預估 3–4 個工作階段）

1. 先出 2–3 個互動 mockup（深色科技風／淺色現代 SaaS 風／混合方案），Kevin 選定方向
2. 建 design tokens（色彩、字體、間距、元件規格），逐步替換，不一次大改
3. 資訊架構調整方向：側邊導覽（分析方法分類樹取代下拉選單）+ 主工作區分頁（資料預覽／變數設定／結果）+ 假設檢核紅綠燈常駐面板 + 頂部狀態列（資料集資訊、語言、模式切換）
4. 分階段 PR，每階段可獨立上線，Phase 1 測試集保證計算不被改壞

## Phase 3：PLS-SEM（預估 4–6 個工作階段）

對齊基準：SmartPLS 4 / R `seminr`。

1. 演算法核心：PLS 迭代估計、測量模型評估（外部負荷量、CR、AVE、HTMT、Fornell-Larcker）、結構模型（路徑係數、R²、f²、VIF）
2. Bootstrap 信賴區間：跑在 Web Worker，避免凍結 UI（此工程同時解 EFA/CFA 大樣本效能問題）
3. 介面：潛在變數與路徑的模型宣告器（表單式起步，拖拉式列為進階）——建在 Phase 2 新介面上，避免做兩次
4. 驗證沿用 Phase 1 基礎設施，`seminr` 產基準值
5. CB-SEM 排下一波：需 ML 估計收斂處理與完整適配指標族，先做瀏覽器端可行性 spike 再承諾時程

## Backlog（次波，依價值排序）

1. 效果量與 95% CI 全面補齊（APA 7 剛需，也是與 JASP 對齊的一部分）
2. 資料前處理模組：反向計分、量表加總、變數計算、缺失值策略明示、離群值檢查
3. APA 三線表直接輸出 .docx
4. 專案檔本地保存/載入（JSON，維持資料不外流賣點）
5. 內建範例資料集 + 新手導覽（教學場景）
6. CB-SEM

## 版本紀錄

- v1（2026-07-02）：初版，Kevin 確認驗證基準（R）、UI 方向（mockup 先行）、SEM 順序（PLS 先）
