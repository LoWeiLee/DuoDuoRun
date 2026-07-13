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
- 測試：`npm test` **1126 過、6 記錄性跳過**；**73 組**基準方法（reference.json）
  （541→589：NCA＋cIPMA；589→651：CTA-PLS。見下 §6.3／§6.4 與 validation-report
  「W6 增補 I–III」）
- **Session A 抽驗回饋消化已完成（2026-07-13）**：R 側（seminr 2.5.0／cSEM 0.6.1／NCA 5.0.2）
  16 項逐值銷帳；發現並修復 2 個實作錯誤（MGA 的 Welch t 漏 (n−1)/n 加權、MICOM step 3
  變異數應為 log 比）；1 項定性為慣例差異（調節交互項尺度）；查出 cSEM 0.6.1 自身 2 個缺陷。
  詳見 validation-report「R 抽驗銷帳（Session A）」節。**剩 SmartPLS 4 專屬 2 項待抽驗。**
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
   自己）。
   ~~完整 `generate_reference.py`（含 semopy）會超時~~ —— **此敘述已過時**
   （2026-07-13 實測）：全量 `python3 tests/generate_reference.py` 在沙盒
   **6.5 秒**跑完 74 組基準，且既有基準值零漂移（可安全全量重生）。
   `run_pls_ref_only.py` / `run_cta_ref_only.py` 仍保留為「只重生單一區塊」的
   快捷路徑，但不再是規避超時的必要手段。
   注意：沙盒重建後 Python 套件會消失，需先
   `pip install numpy pandas scipy scikit-learn statsmodels pingouin factor_analyzer semopy plspm --break-system-packages`。
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

累積四波，見 `validation-report-v1.md` 各節。高優先：
SmartPLS 4 的 two-stage 交互係數（不標準化慣例）、HOC 兩階段流程、
MICOM step 2 的 c、SRMR/fit 家族、CTA-PLS 的 tetrad 選取集；
R 側：seminr（PI/orthogonal、PLSpredict）、cSEM（testMICOM/testMGD）、NCA 套件。

**抽驗工具包已代產（2026-07-13）；R 側已執行並銷帳，SmartPLS 4 側待做**：`scripts/validation/`
- 雙擊 `跑抽驗腳本.bat` → 自動跑 R 的 seminr / cSEM / NCA 三支腳本，結果寫入 `out/`
- SmartPLS 4 部分為手動操作，步驟見該夾 `README.md`（含 CTA-PLS §2.7）
- 數字對照表 `抽驗對照表.md`：左欄已填入多多快跑的值，Kevin 只需填右欄
- 資料檔 `data/`：main.csv（n=60）、nca.csv（n=48）、cta.csv（n=60），皆與 fixture 同源

## 5. W6 執行規格（探索與長尾；各項獨立、可單獨出貨，每項 ≈ 1 session）

共通模式：先在 generate_reference.py 加基準區塊（用 run_pls_ref_only 跑）→
adapter → 引擎（pls.js 新 export，沿 W5 的 `rejectW4` 與錯誤慣例）→
pls.test.js 行為測試 → Config/Result/i18n → 文件三件套更新。

### 6.1 FIMIX-PLS（潛在異質性分段）— **已交付（2026-07-13）**
- 引擎：`fimixPLS`（`src/lib/stats/pls.js`）。有限混合迴歸的 EM（Hahn, Johnson,
  Herrmann & Huber 2002；不含截距）；段數準則依 Sarstedt, Becker, Ringle &
  Schwaiger (2011)：AIC／AIC3／AIC4／BIC／CAIC／HQ／MDL5／EN（normed entropy）。
  N_k = (K−1) + K·R + K·M。多起點（預設 10，固定種子）取 lnL 最高者；
  段別依佔比 ρ 遞減排序以消除 label switching。
- 基準：`pls_fimix`（71 值，K = 1–4）＋`pls_fimix_inputs`（固定初始後驗機率）。
  **無主流 Python/R 完整實作** → 三重驗證策略：
  (a) 模擬還原——`datasets.json:fimix`（n=300，兩段 β = +0.80 / −0.80、180/120，
      對稱設計使全域路徑被大幅相消）；引擎還原率 0.853、EN 0.566、K=2 在所有
      資訊準則上皆最佳；
  (b) EM 單調性——lnL 每步不得下降（基準端 assert ＋ 引擎端 warnings 斷言）；
  (c) JS↔numpy 逐值——初始後驗機率固定注入，繞開兩邊 RNG 不同的問題，71 欄位全對齊。
- UI：段數選擇表（K = 1–4）＋段別解＋EN ≥ .50 燈號；EN < .50 或有微小段時警告。
### 6.2 PLS-POS（prediction-oriented segmentation）— **已交付（2026-07-13）**
- 引擎：`posPLS`（`src/lib/stats/pls.js`）。Becker, Rai, Ringle & Völckner (2013), MISQ 37(3)。
  目標函數＝各段各內生構念的殘差平方和（預測誤差）；硬指派＋逐案重新指派的爬山法；
  以充分統計量（Σxx'、Σxy、Σy²、n）增量更新（搬移一案 O(k²)，不必重跑整段 OLS）；
  同分取段索引較小者；段別大小下限為硬約束；多起始分割取目標函數最小者；
  段別依大小遞減排序以消除 label switching。
- 基準：`pls_pos`（36 值，K = 2、3 ＋ 全域 K=1 對照）＋`pls_pos_inputs`（固定起始分割）。
  與 FIMIX 共用 `datasets.json:fimix`。全域 β = +0.318（R² = 0.101，正負相消的「平均」）；
  K=2 拆出 +0.915 / −0.831（n = 175/125），整體 R² 躍升至 **0.787**，還原率 **0.837**。
- **關鍵界線（UI 強制警告）**：POS 的目標函數必然隨段數下降（無懲罰項）→ **不能用來選段數**。
  段數依 FIMIX 的資訊準則、理論、或段別可解釋性決定。已寫成行為測試。
### 6.3 CTA-PLS（confirmatory tetrad analysis）— **已交付（2026-07-13）**
- `ctaPLS`（`src/lib/stats/pls.js`）：Gudergan et al. (2008)；非冗餘 tetrad
  k(k−3)/2 個（「逐一加入指標」的確定性構造，生成端以 Jacobian 秩 assert 驗證極大獨立）；
  bias-corrected ＋ 區塊內 Bonferroni 的 bootstrap CI。指標 < 4 的構念明確列入
  `skipped`（不靜默略過）；全部 < 4 → `cta-no-eligible-construct`；含 W4 元素 → `rejectW4`。
- 基準 `pls_cta`：numpy 封閉式手算＋300 組固定重抽索引注入；專屬資料集
  `datasets.json:cta`（cr1–cr5 單因子反映型、cm1–cm4 非單因子），
  沙盒可跑 `tests/run_cta_ref_only.py`（含 datasets.json 既有鍵零漂移校驗）。
- UI：PLS 模組新報表區（tetrad 表＋判讀燈號＋宣告/判讀衝突提示）、Notes「測量模式判讀」、
  中英 i18n 22 鍵；Config 開關含「無合格構念」的前置擋關。
- 共用工具增補：`pvalue.js` 的 `qT(alpha, df)`（t 雙尾臨界值，對齊 scipy 1e-10 級）。
- **待抽驗**：SmartPLS 4 的 tetrad 選取集、Bonferroni 族系範圍、CI 變體
  （R 側無 CTA 套件 → 只能靠 SmartPLS；見 validation-report「CTA-PLS 待抽驗清單」
  與 `scripts/validation/README.md` §2.7）。
### 6.4 NCA（必要條件分析）＋ cIPMA
- **核心 NCA 已交付（2026-07-09）**：`src/lib/stats/nca.js`（CE-FDH/CR-FDH
  ceiling、scope、effect size d、bottleneck 表、permutation p），分析模組六件套
  ＋側欄（sem 群組）＋示範（employee: tenure→performance）＋中英 i18n。
  基準 3 組（nca_ce_fdh/cr_fdh/bottleneck，`run_nca_ref_only.py` 沙盒可跑），
  JS↔numpy bit-for-bit；行為測試 `tests/nca.test.js` 16 項（手算錨定 d=0.5）。
- **cIPMA 已交付（2026-07-10）**：`cipmaPLS`（`ipmaPLS`＋`runNCA` 組合；
  Hauff et al. 2024——0–100 分數、直接前置構念、d≥.1 且 p<.05、bottleneck
  附未達案例 %）。UI 為 PLS 模組 IPMA 下的 cIPMA 開關（同步＋Worker 雙路徑）、
  條件表＋bottleneck 表；基準 `pls_cipma`（numpy 重用 _s100＋NCA 助手、
  199 組固定排列）。
- **待辦（NCA 剩餘）**：(a) Kevin 本機 R `NCA` 套件抽驗慣例對齊
  （見 validation-report「W6/NCA 待抽驗清單」7 項）＋ SmartPLS 4 cIPMA 抽驗；
  (b) 可選：散佈圖＋ceiling line 視覺化（目前為表格呈現）、scope 理論界線
  UI 設定。
- **管線備忘**：新版 plspm 會使 generate_reference.py 的 W1/W3/W4 交叉驗證
  區塊失敗（W5 正常）；重生基準後務必 diff reference.json 確認既有鍵零改動
  （詳 validation-report「plspm 版本敏感性」）。
### 6.5 Gaussian copula 內生性檢查 — **已交付（2026-07-13）**
- Park & Gupta (2012)；Hult et al. (2018) 流程：copula 項 = Φ⁻¹(ECDF(x))，
  加入該內生構念的結構迴歸檢定顯著性；前提：解釋變數非常態（KS 把關並警告，不靜默擋掉）。
- 引擎：`copulaPLS`／`copulaTerm`（`src/lib/stats/pls.js`）。每個內生構念一組方程，
  k 個候選 copula → 2^k − 1 個模型全組合（k > 5 時只跑「各自單獨」與「全部」）。
  bootstrap 為完整巢套：每次重抽都重估 PLS 權重 → 重算 copula 項 → 重跑擴充迴歸。
- 基準：`pls_copula`（30 值）＋`pls_copula_inputs`（300 組固定重抽索引）。
  慣例鎖定：H = ecdf(P)(P)（並列取最大秩），H = 1 夾為 1−1e−7（Hult et al. 2018 程式碼）。
  KS 只鎖 D 統計量（p 為已知慣例差異，見 validation-report）。
- 尚未做：SmartPLS 4 的 Gaussian Copula 抽驗（其選取與 SE 細節未文件化）。
### 6.6 WPLS（加權 PLS）— **已交付（2026-07-13）**
- `options.weights`：欄位名（字串）或與 rows 等長的數值陣列。相關矩陣改以抽樣權重加權
  （加權平均／加權共變異／加權相關）→ 走 §6.7 的同一個相關矩陣入口。
- 權重同乘常數不影響結果（相關為尺度不變量）；權重為 0 的列實質不參與估計（已寫成測試）。
- **推論仍以未加權重抽**：加權 bootstrap 的設計 SmartPLS 未文件化，不擅自實作，UI Notes 明說。
### 6.7 pairwise deletion — **已交付（2026-07-13）**
- **核心重構已完成**：`estimateCoreFromCorr(R, spec)` 是引擎的**單一迭代實作**。
  `estimateCore(cols, n, spec)` 退化為薄包裝（R ← 欄位相關矩陣 → 迭代 → 由欄位算分數）。
  三個入口共用：完整資料／pairwise-complete 相關／加權相關。
  一個關鍵簡化：外部權重改用 cov(z_h, Z_j) 而非 corr——sd(Z_j) 對整個區塊是同一純量，
  隨後的單位變異縮放會把它消掉，兩者逐位相同，少一次開根號。
- **零回歸**：重構後既有 733 個基準欄位逐值全過（未改動任何 fixture）。
- pairwise：R[a][b] 只用該配對同時可觀察的列；配對 < 3 筆 → 報錯（不給不可靠的相關）；
  R 非半正定時警告（不同格來自不同子樣本，彼此可能不相容）。
  LV 分數以 zero-imputed 標準化值（＝原尺度均值補值）加權，僅供 IPMA／預測／分段等下游使用；
  統計量（loadings／lvCorr／信效度／HTMT／fit）一律走 R。
- **blindfolding × pairwise 互斥**（報錯）：blindfolding 要刻意挖洞再預測，
  資料本身已有缺失時無法區分「被挖掉的」與「原本就缺的」。
- 基準：`pls_pairwise_wpls`（59 值）＋`datasets.json:pw`（固定 MCAR 遮罩 11.4%、固定抽樣權重）。
  含 `full_*` 自我一致性欄位：完整資料走相關矩陣路徑必須重現 `pls_basic`。
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

1. ~~抽驗回饋消化 session~~（✓ R 側完成 2026-07-13；SmartPLS 4 的 d_G 與 Henseler MGA p
   兩項待 Kevin 抽驗，不擋開發）
2. W6 依價值序：~~NCA＋cIPMA~~（✓ 交付 2026-07-09/10）→ ~~CTA-PLS~~（✓ 交付 2026-07-13）
   → ~~Gaussian copula~~（✓ 交付 2026-07-13）→ ~~FIMIX~~（✓ 交付 2026-07-13）
   → ~~PLS-POS~~（✓ 交付 2026-07-13）→ ~~WPLS＋pairwise~~（✓ 交付 2026-07-13）
   **→ W6 的 A–F 全數交付；剩 §6.8 品質小任務（可塞縫隙）。**
3. 品質 session：§6.8 清單＋docx 報表輸出
4. CB-SEM spike session

## 版本紀錄

- v1（2026-07-06）：初版。W5 交付當日撰寫，Fable 5 → Opus 4.8 交接。
- v1.1（2026-07-09）：W6.1 NCA 核心交付後更新 §1／§6.4／§9（Opus 4.8）。
- v1.2（2026-07-10）：cIPMA 交付，§6.4 收尾；補 plspm 版本敏感性備忘（Fable 5）。
- v1.3（2026-07-13）：CTA-PLS 交付，§6.3 收尾；§1／§9 更新；§4 補抽驗工具包（Opus 4.8）。
- v1.4（2026-07-13）：Session A 抽驗回饋消化完成；§1／§4／§9 更新（Opus 4.8）。
- v1.5（2026-07-13）：Gaussian copula 交付，§6.5 收尾；§1／§9 更新（Opus 4.8）。
- v1.6（2026-07-13）：FIMIX-PLS 交付，§6.1 收尾；§1／§9 更新（Opus 4.8）。
- v1.7（2026-07-13）：PLS-POS 交付，§6.2 收尾；§1／§9 更新（Opus 4.8）。
- v1.8（2026-07-13）：pairwise deletion ＋ WPLS 交付（核心改為相關矩陣驅動，零回歸），
  §6.6／§6.7 收尾；§1／§9 更新。**W6 的 Session A–F 全數完成**（Opus 4.8）。
