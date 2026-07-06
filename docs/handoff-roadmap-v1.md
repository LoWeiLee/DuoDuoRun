# 多多快跑 功能新增與升級規畫路徑書 v1（2026-07-06）

**讀者**：接手本專案的 AI 協作者（Opus 4.8）與 Kevin。
**目的**：把「已完成的狀態、不可破壞的架構不變量、剩餘工作的完整規格與驗證策略」
一次交接清楚，讓後續 session 不需要重新考古。

---

## 1. 現況總覽（截至 2026-07-06）

- 26 個傳統統計模組（W0 前既有）＋ PLS-SEM 引擎 **W0–W5 全數交付**：
  - W1 核心引擎＋標準報表；W2 拖拉畫布；W3 形成型／三 scheme／PLSc／BCa／
    model fit／Q²；W4 調節（two-stage＋PI/ortho）／二次／三向／HOC 三法／
    中介分解；W5 MGA／MICOM／PLSpredict＋CVPAT／IT 準則／IPMA／GoF／
    CCA 指引／Worker 接線
- 測試：`npm test` **541 過、6 記錄性跳過**；61 組基準方法（reference.json）
- 關鍵文件：`docs/pls-sem-roadmap-v1.md`（波次規畫與進度）、
  `docs/pls-model-schema.md`（模型 JSON v3.1 與引擎 API）、
  `docs/validation-report-v1.md`（逐波驗證記錄與 Kevin 本機抽驗清單）、
  `CLAUDE.md`（專案慣例）
- 最近提交：W4（9fd451f）→ 本次 W3 順延項＋Worker＋W5

## 2. 架構不變量（改壞任何一條都算回歸）

1. **模型宣告與畫布解耦**：PLS 引擎唯一輸入是模型 JSON、唯一輸出是結果物件；
   引擎（`src/lib/stats/pls.js`）純函式、Node/Worker 雙環境同構、無 UI 依賴。
2. **先基準後實作（fixture-first）**：任何新統計量先在
   `tests/generate_reference.py` 產基準（附文獻出處）→ `tests/adapters.mjs`
   加 adapter → 紅燈 → 實作 → 綠燈。隨機性程序（bootstrap/permutation/k-fold）
   用「固定 draws／指派入 fixture ＋ 注入選項」做引擎層級交叉驗證
   （範例：`pls_bca_reference`、`pls_mga_perm`、`pls_predict`）。
3. **交付三判準**：數字對齊基準＋`npm test` 綠燈＋可獨立上線（不留半成品入口）。
4. **數值誠實**：不收斂就報錯不回半成品；PLSc 越界警告不截斷；
   範圍限制用明確中文錯誤（如 `plsc-w4-not-supported`），不靜默降級。
5. **模型 JSON 向後相容**：schemaVersion 只加欄位不改語意。
6. **UI 慣例**：duo.sig 綠黃紅、LED 燈號、數字 mono、p 值一律
   `fmtP`/`toneForP`（`src/lib/format.js`）；中英 i18n 同步增改
   （`src/i18n/zh-TW.js`、`en.js`）。
7. **Kevin 非工程師**：要他本機執行的東西一律做成雙擊 .bat（見根目錄 push.bat）。

## 3. 沙盒作業手冊（Cowork 環境的硬限制與對策）

1. **單次 bash 呼叫 45 秒上限，背景程序不跨呼叫存活**（bwrap
   --die-with-parent --unshare-pid；nohup/setsid 無效，`pgrep -f` 會誤匹配
   自己）。完整 `generate_reference.py`（含 semopy）會超時 →
   **用 `tests/run_pls_ref_only.py`**（exec 抽取 PLS 區塊，2–3 秒，
   單一事實來源不變）。
2. **掛載目錄禁止 unlink**：`git stash` 會半途失敗並打壞 .git/index。
   修復：以 Cowork 的檔案刪除授權工具開權限 → `rm .git/index.lock .git/index`
   → `git reset`。**比對 HEAD 用 `git show HEAD:path`，永遠不要 stash**。
   `npm run build` 需 `--outDir /tmp/... --emptyOutDir`。
3. **Edit/Write 工具長插入可能掛載截斷**：大改用 bash heredoc 或 python
   錨定替換腳本，寫完 `tail` 驗尾＋eslint/compile 驗 parse。
4. **eslint 現況**：`npm run lint`（eslint .）有 **59 個既有問題**，
   全部在 W1–W2 時期的非 PLS 檔案（cluster.js、pvalue.js、各分析 Result/Narrative
   等）。PLS 相關檔案單檔 lint 全綠。整理這 59 個屬獨立小任務（見 §6.8）。
5. Python 套件就緒清單：numpy/pandas/scipy/plspm/statsmodels/pingouin/
   factor_analyzer/scikit-learn/semopy（沙盒重建後要重裝：
   `pip install ... --break-system-packages`）。

## 4. Kevin 本機抽驗清單（優先於任何新開發）

累積三波，見 `validation-report-v1.md` 各節。高優先：
SmartPLS 4 的 two-stage 交互係數（不標準化慣例）、HOC 兩階段流程、
MICOM step 2 的 c、SRMR/fit 家族；R 側：seminr（PI/orthogonal、PLSpredict）、
cSEM（testMICOM/testMGD）。抽驗腳本可請 AI 依 fixture 模型設定代產（R 腳本
＋對照表），Kevin 只需執行與回報數字。

## 5. W6 執行規格（探索與長尾；各項獨立、可單獨出貨，每項 ≈ 1 session）

共通模式：先在 generate_reference.py 加基準區塊（用 run_pls_ref_only 跑）→
adapter → 引擎（pls.js 新 export，沿 W5 的 `rejectW4` 與錯誤慣例）→
pls.test.js 行為測試 → Config/Result/i18n → 文件三件套更新。

### 6.1 FIMIX-PLS（潛在異質性分段）
- 演算法：有限混合迴歸的 EM（Hahn et al. 2002；Sarstedt et al. 2011 教學）。
  對每個內生構念的結構方程做 K 段混合；E 步算後驗屬段機率、M 步加權 OLS。
- 基準：無主流 Python/R 完整實作 → (a) 模擬資料還原測試（兩段已知係數，
  引擎需還原段結構）；(b) EM 單調收斂斷言；(c) Hair et al. 教科書範例數字。
  段數選擇：AIC/BIC/CAIC/EN（entropy）——公式封閉可手算入 fixture。
- 注意：局部最優 → 多起點（固定種子集）取最佳；UI 報 EN ≥ .50 判準。
### 6.2 PLS-POS（prediction-oriented segmentation）
- Becker et al. (2013)；與 FIMIX 互補。距離量 = 預測誤差；
  逐案重新指派的爬山法。基準策略同 FIMIX（模擬還原＋性質斷言）。
### 6.3 CTA-PLS（confirmatory tetrad analysis）
- Gudergan et al. (2008)：每構念 4 指標以上，算 model-implied nonredundant
  tetrads τ = σ12σ34 − σ13σ24 等，bootstrap CI（Bonferroni 調整）判反映型/形成型。
- 基準：tetrad 封閉式 numpy 手算；bootstrap 用固定 draws 模式。
### 6.4 NCA（必要條件分析）＋ cIPMA
- CE-FDH/CR-FDH ceiling、effect size d、bottleneck 表、permutation p。
- 基準：R `NCA` 套件（Kevin 本機產 fixture JSON，管線支援外部貢獻 fixture）；
  沙盒可先手算 CE-FDH（階梯函數封閉式）。完成後 cIPMA（與既有 ipmaPLS 組合）。
### 6.5 Gaussian copula 內生性檢查
- Park & Gupta (2012)；Hult et al. (2018) 流程：copula 項 = Φ⁻¹(ECDF(x))，
  加入迴歸檢定顯著性；前提：解釋變數非常態（先做 KS 檢定把關）。
- 基準：numpy 手算（ECDF＋qnorm 既有）；Hult et al. 公開程式碼複算。
### 6.6 WPLS（加權 PLS）
- 抽樣權重進入：加權相關矩陣（封閉式）→ 既有引擎的相關矩陣入口。
  依賴 §6.7 的相關矩陣驅動重構，一併做省力。
### 6.7 pairwise deletion（W3 順延，設計已完成）
- 設計：Lohmöller 迭代完全可由指標相關矩陣 R 驅動——
  `estimateCoreFromCorr(R, spec)`：Mode A 權重 corr(z_h,Z_j) ∝ (R·相鄰組合)、
  Mode B 用 S_bb⁻¹r、scheme 三種皆 R-運算；loadings/lvCorr/信效度/HTMT/fit
  本來就吃 indCorr。缺失時 R 用 pairwise-complete 相關；
  LV 分數輸出用 zero-imputed 標準化值加權（僅供 scores/derived，文件註明）。
  blindfolding 與 pairwise 互斥（報錯）。基準：numpy 同程序複算＋
  固定 MCAR 缺失遮罩入 fixture。做完 WPLS 順手（同一入口）。
### 6.8 品質小任務（可塞縫隙）
- 既有 59 個 eslint 問題清理（非 PLS 檔案）
- W4 canvas 顯示層（互動項/HOC 目前不出現在畫布；表單為 source of truth）
- MGA/PLSpredict/IPMA 的 APA Narrative 句（i18n 已有表格判讀文字，缺敘述句）
- PLSpredict 多次重複取平均（SmartPLS 預設 10 reps）；MGA 的 PLSc 版
- IPMA 量表理論界線的 UI 設定（目前用觀察 min/max，已註記差異）
- moderated mediation（條件間接效果；W4 機制同源，PROCESS 式輸出）
- 示範資料集：加一個含調節/HOC/群組欄位的 PLS 示範（src/config/demos.js）

## 6. CB-SEM 銜接（維持原承諾：先 spike 再承諾時程）

可行性 spike 範圍：瀏覽器端 ML 估計收斂（既有 CFA 模組為起點、semopy 基準
管線已在）＋完整適配指標族。通過才排 wave。風險：數值優化在低階裝置的
收斂穩定性；建議 spike 先做 2–3 構念小模型全流程。

## 7. PLS 之外的產品 backlog（優先序沿 optimization-roadmap-v1.md）

1. 效果量與 95% CI 全面補齊（APA 7 剛需）——各傳統模組逐一過
2. 資料前處理模組：反向計分、量表加總、變數計算、缺失值策略明示、離群值檢查
3. APA 三線表直接輸出 .docx（可先做 PLS 報表，論文使用者最痛）
4. 專案檔本地保存/載入（模型 JSON 已 schemaVersion 化，是現成基礎）
5. 內建範例資料集＋新手導覽
6. validation-report 記錄的統計 backlog：MW 小樣本 exact、Levene center 選項、
   Student t 並列、卡方空格提示

## 8. 與 Kevin 的協作方式（重要）

- 結構先於細節、直接給判斷與選項；需求不明用 AskUserQuestion，不自行腦補。
- 範圍取捨要明說（本次 pairwise 延後的決策模式：說明理由＋完整設計交接）。
- 學術嚴謹是硬需求：每個統計量附文獻出處、慣例差異雙處標註
  （UI Notes＋validation-report）、不確定就標「待抽驗」。
- Kevin 的已知寫作/研究慣性不適用於本專案，但「文獻回顧易擴張」的對應物是
  「功能範圍易擴張」——每波守住 roadmap 邊界，增補走 backlog。

## 9. 建議 session 切分（供排程）

1. 抽驗回饋消化 session：Kevin 本機數字回來後對表、修正慣例差異
2. W6 依價值序：NCA → CTA-PLS → Gaussian copula → FIMIX → PLS-POS →
   WPLS＋pairwise（合併）
3. 品質 session：§6.8 清單＋docx 報表輸出
4. CB-SEM spike session

## 版本紀錄

- v1（2026-07-06）：初版。W5 交付當日撰寫，Fable 5 → Opus 4.8 交接。
