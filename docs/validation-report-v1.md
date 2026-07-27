# 多多快跑 統計演算法驗證報告 v1（2026-07-02）

Phase 1 首輪驗證。26 個分析模組的統計核心與黃金標準逐欄位比對，
比對已固化為常設回歸測試：`npm test`（180 項斷言通過、6 項記錄性跳過）。

## 基準環境

- 首選 R 因沙盒限制無法安裝，依路線圖退援 **Python**：
  scipy 1.15.3、statsmodels 0.14.6、pingouin 0.6.1、factor_analyzer、scikit-learn、semopy 2.3.11
- 這批套件與 R / JASP 底層演算法一致；標記為「慣例差異」的項目建議 Kevin 本機 JASP 抽驗複核
- 測試資料：固定種子（seed=42），n=60 主資料集 + 小樣本（n=8）與大量並列（Likert）邊界資料集
- 管線：`tests/generate_reference.py` → `fixtures/*.json` → `tests/compare.test.js`（Vitest）

## 總結

| 結果 | 數量 | 說明 |
|---|---|---|
| 完全對齊（相對誤差 < 1e-6） | 23 個模組 | 多數欄位達 1e-12 以上精度 |
| 可容忍數值差異（1e-6 ~ 5e-4） | Tukey HSD p、小樣本 MW p、EFA 轉軸負荷 | 數值積分 / 迭代收斂細節 |
| 修正後對齊 | 加權 Kappa、尾端 p 值 | 見「本輪修正」 |
| 記錄性慣例差異 | KS p 值、CFA χ² 家族、MW exact | 見「慣例差異」 |

## 本輪修正（2 項，均已修復並通過測試）

### 1. 加權 Cohen's Kappa 層級順序錯誤（嚴重）
- `src/lib/stats/kappa.js`
- 原實作以「rater1 出現順序」決定層級順序，且取兩位評分者層級**交集**。
  加權 κ 的權重 w_ij 取決於序位距離 |i−j|，順序錯 → 權重矩陣整個錯位。
  實測 linear κ 0.517 vs 正確 0.656、quadratic κ 0.580 vs 正確 0.802。
  無加權 κ 與順序無關，故未被發現。
- 修正：層級改取**聯集**並依自然序（數值優先）排序——對齊 SPSS crosstabs 與 sklearn。
  修正後三種加權與 sklearn 對齊至 1e-16。
- 影響評估：曾用本工具跑加權 Kappa 的結果需重跑。無加權 Kappa 不受影響。

### 2. 常態分布尾端 p 值精度不足（中等）
- `src/lib/stats/pvalue.js`
- 原 erf 用 Abramowitz & Stegun 7.1.26（絕對誤差 1.5e-7）。分布中央無妨，
  但 |z| > 4 時 p 值「相對」誤差放大至千分之一量級（Wilcoxon 實測 p 差 0.13%）。
- 修正：erf/normalCdf 改經規則化不完全 Gamma 函數（相對精度收斂），
  並將 betacf 收斂閾值由 3e-7 收緊至 3e-14。
  影響所有 z 檢定類 p 值（Mann-Whitney、Wilcoxon、Kappa z、比例檢定、Dunn）
  與 t/F 尾端 p 值，修正後對齊 scipy 至 1e-13 級。
- 影響評估：僅影響極小 p 值的第 3 位有效數字之後，不影響任何顯著性判定。

## 記錄性慣例差異（非錯誤，測試中以 skip + 註記管理）

1. **Mann-Whitney U 慣例**：JS 報 min(U₁,U₂)（SPSS 慣例），scipy 報第一組 U₁。可互換（U₁+U₂=n₁n₂），測試以 R1 換算比對。
2. **MW 小樣本 exact 法缺席**：SPSS/scipy 在小樣本無並列時預設 exact p；JS 目前只有常態近似（n=8 實測 asymptotic .0304 vs exact .0286）。→ **backlog P2：小樣本自動切 exact**
3. **K-S (Lilliefors) p 近似**：JS 用 Dallal-Wilkinson，statsmodels 用查表內插，p 相差可達 14%；D 統計量對齊至 1e-6。SPSS 亦用 Dallal-Wilkinson，JS 與 SPSS 屬同一家族。建議 JASP 抽驗。
4. **CFA χ² 慣例**：JS 用 (N−1)·F_ML（AMOS/Wishart 慣例），semopy 用 N·F_ML。比值恰為 N/(N−1)，測試含換算斷言。CFI JS 截斷於 1（lavaan 慣例）。
5. **Levene 預設**：JS 預設 median-based（Brown-Forsythe，穩健），SPSS 預設 mean-based。基準含兩版本參考值（`levene_mean_spss_default`），JS 目前無 mean-based 選項。→ backlog P3：提供 center 選項並在 UI 標註
6. **Welch t 為唯一獨立 t**：JS 僅 Welch（JASP 推薦方向）；SPSS 同時報 Student t。→ backlog P3（可選）

## 尚未納入首輪的模組（batch 2 待補）

cluster（k-means/Ward：隨機重啟，需以不變量與固定種子驗證）、LDA（需手算 canonical correlation 基準）、
Dunn 事後檢定（需 scikit-posthocs）、卡方適合度、Spearman/Pearson 矩陣版、
bonferroni 事後、ICC 信賴區間、EFA 未轉軸負荷、階層迴歸多步版、z 檢定單樣本 CI。
核心演算法已由同族函式覆蓋（如 anova→tukey 已驗、矩陣核心由迴歸/MANOVA 間接驗證），
batch 2 屬完整性補強，非風險缺口。

## W3 增補（2026-07-04）：PLS-SEM 對齊深化的基準驗證

W3 新增 6 組 PLS 基準（`generate_reference.py` 的「PLS-SEM Wave 3 基準」區塊），
`reference.json` **只增不改**（37 → 44 個方法、既有值逐位元不變、`datasets.json` 不變）。
測試由 246 項增至 343 項（337 過、6 記錄性跳過；compare +78、PLS 單元測試 +19）。

| 基準 | 來源 | 實測最大相對差 |
|---|---|---|
| `pls_scheme_centroid` | plspm 0.5.7（CENTROID scheme） | 2.3e-8 |
| `pls_scheme_factorial` | plspm 0.5.7（FACTORIAL scheme） | 6.6e-8 |
| `pls_formative`（Mode B ＋ 外部 VIF） | plspm（Mode B）＋ numpy 手算 VIF | 2.4e-15 |
| `pls_plsc`（rho_A／一致 loadings／校正路徑） | numpy 手算（Dijkstra & Henseler 2015） | 1.1e-15 |
| `pls_fit`（SRMR／d_ULS／d_G／NFI，飽和＋估計） | numpy 手算（Henseler et al. 2014; DH 2015; Bentler & Bonett 1980） | 1.5e-15 |
| `pls_q2`（blindfolding，D=7） | numpy 手算（Stone 1974/Geisser 1974；程序依 Hair et al. 2017） | 1.7e-15 |
| `pls_bca_reference`（BCa z₀/a/CI） | numpy 手算（Efron 1987），固定 draws＋jackknife 入 fixture | 1.1e-9（受 qnorm Acklam 近似 1.15e-9 限制） |

手算基準的獨立性：PLSc／fit／Q² 由 `generate_reference.py` 內**獨立實作的 numpy PLS 引擎**
（`_pls_engine`，與 JS 為兩套程式碼）計算，該引擎先以內建 assert 與 plspm（path scheme）
交叉驗證 < 1e-6 才放行。BCa 因 bootstrap 隨機性無法跨實作逐值比對，改為「固定 draws ＋
jackknife 入 fixture、JS `bcaInterval()` 複算公式」的逐值比對。

### W3 慣例差異與待抽驗清單（Kevin 本機 SmartPLS 4 / seminr / cSEM）

> **已抽驗 ✓（2026-07-13）**：R 可驗項全數銷帳，見下「R 抽驗銷帳（Session A）」節。SmartPLS 4 專屬項（d_G、Henseler MGA p）仍待。

以下項目 plspm 不支援、SmartPLS 未完整公開實作細節，目前依原始文獻公式手算入基準，
**建議 Kevin 本機抽驗複核**（同一模型、同設定跑 SmartPLS 4 或 R seminr/cSEM 比對）：

1. **SRMR / d_ULS / d_G / NFI**：模型隱含矩陣採「區塊內 λλ′、區塊間 λ·r·λ′」
   （Henseler et al. 2014 的 composite factor model）；「估計模型」構念相關以遞迴
   path tracing 隱含。cSEM 與 SmartPLS 在此已知存在實作差異，屬高優先抽驗項。
2. **Blindfolding Q²**：略去點的走訪順序（本實作：區塊內 row-major、(i·k+h) mod D）
   與補值細節 SmartPLS 未文件化；程序依 Hair et al. (2017) 第 6 章。抽驗時 D=7 同設定比對。
3. **PLSc**：校正公式本身封閉（DH 2015 式 12），但校正後 |r|>1／一致 loading>1 的
   處理慣例（本實作：警告不截斷，對齊 cSEM）需與 SmartPLS 行為互證。
4. **BCa**：z₀ 用「嚴格小於」計數、加速常數 a 用 jackknife 三階動差（Efron & Tibshirani
   1993 §14.3）；SmartPLS 的 BCa 變體未文件化，屬中優先抽驗項。
5. **construct-level 符號校正**（沿 W1 記錄）：SmartPLS 預設 individual sign change 的
   精確定義沙盒不可查證，本實作用 construct-level（與原始 loadings 內積為負則翻轉）。

## W4 增補（2026-07-04）：調節／高階構念／中介的基準驗證

W4 新增 9 組 PLS 基準（`generate_reference.py` 的「PLS-SEM Wave 4 基準」區塊），
`reference.json` **只增不改**（44 → 53 個方法、既有值逐位元不變、`datasets.json` 不變）。
測試由 343 項增至 429 項（423 過、6 記錄性跳過；compare +63、PLS 單元測試 +23）。

| 基準 | 來源 | 實測最大相對差 |
|---|---|---|
| `pls_mediation`（間接效果分解＋VAF） | numpy PLS 路徑乘積（Baron & Kenny 1986；VAF: Hair et al. 2017） | 6.2e-16 |
| `pls_mod_twostage`（含 simple slopes、f²、sd 乘積） | numpy 手算（Chin et al. 2003；SmartPLS 4 慣例），第一階段與 plspm 交叉驗證 | 1.5e-14 |
| `pls_quadratic`（二次效果） | numpy 手算（同 two-stage 機制） | 4.4e-15 |
| `pls_mod_threeway`（三向＋全部兩向項） | numpy 手算 | 1.5e-14 |
| `pls_mod_pi`（product indicator） | numpy 手算（Chin et al. 2003；對齊 seminr） | 1.1e-15 |
| `pls_mod_ortho`（orthogonalizing） | numpy 手算（Little et al. 2006；對齊 seminr） | 1.1e-15 |
| `pls_hoc_repeated`（repeated indicators HOC） | numpy PLS ＋ **plspm（欄位複製別名）雙實作交叉驗證** | 5.6e-16 |
| `pls_hoc_disjoint`（disjoint two-stage HOC） | numpy 手算（Becker et al. 2023 程序） | 4.0e-16 |
| `pls_hoc_embedded`（embedded two-stage HOC） | numpy 手算（Sarstedt et al. 2019 程序） | 5.8e-16 |

沙盒單次指令有 45 秒上限、完整 `generate_reference.py`（含 semopy/pingouin）會超時，
新增 `tests/run_pls_ref_only.py`：以 exec 抽取 generate_reference.py 的 PLS 區塊執行並
合併回 `reference.json`（單一事實來源不變；本機／CI 仍可整支重跑，2026-07-04 已驗證
兩種跑法對既有 44 個方法逐位元一致）。

### W4 慣例決策與待抽驗清單（Kevin 本機 SmartPLS 4 / seminr）

> **已抽驗 ✓（2026-07-13）**：seminr 可驗項全數銷帳（含 HOC、三種調節法），交互項尺度定性為慣例差異。見「R 抽驗銷帳（Session A）」節。

1. **two-stage 調節的兩個 SmartPLS 4 行為**（roadmap v1 依官方 Moderation 文件查證）：
   (a) 自動補調節變數主效果路徑（引擎記錄於 `meta.autoAddedPaths`）；
   (b) **交互項不標準化**——回報係數 = 標準化係數 ÷ sd(第一階段分數乘積)，
   標準化值保留於 `coefStd`。高優先抽驗：同模型在 SmartPLS 4 的交互項係數。
2. **product indicator / orthogonalizing 為 seminr 對齊**（SmartPLS 4 不提供）：
   係數為標準化量尺，與 two-stage 數值不同屬預期。建議 seminr
   `product_indicator` / `orthogonal` 抽驗。
3. **HOC 三法程序**：repeated 已由 plspm 雙實作互證；disjoint / embedded 為文獻程序的
   忠實手算（分數銜接、第二階段重新標準化），建議 SmartPLS 4 內建 HOC 流程抽驗。
4. **中介 bootstrap CI**：specific indirect 以「逐重抽的路徑乘積」建 CI
   （Preacher & Hayes 2008 慣例，同 SmartPLS）；bootstrap 隨機性使跨實作逐值比對不可能，
   以點估計逐值（機器精度）＋ JS 內部確定性（同種子逐位元重現）測試取代。
5. **W4 範圍限制（已在引擎與 UI 雙處把關）**：PLSc 與 blindfolding Q² 不支援含
   調節／高階構念的模型（明確中文錯誤訊息，不靜默降級）。

## W5 增補（2026-07-06）：群組與預測＋W3 順延項的基準驗證

W5 新增 8 組 PLS 基準（`generate_reference.py` 的「Wave 5」與「W3 順延項」區塊），
`reference.json` 只增不改（53 → 61 個方法）。測試由 429 項增至 547 項
（541 過、6 記錄性跳過）。

| 基準 | 來源 | 實測最大相對差 |
|---|---|---|
| `pls_gof`（GoF index，W3 順延） | numpy 手算（Tenenhaus et al. 2005） | 4.4e-16 |
| `pls_mga_formulas`（pooled t／Welch／Henseler p） | 固定 se/draws 輸入的公式層驗證（Keil et al. 2000；Sarstedt et al. 2011；Henseler et al. 2009） | 7.9e-13 |
| `pls_mga_perm`（permutation 檢定） | **40 組固定標籤指派的引擎層級交叉驗證**（每組 pseudo-group 的 PLS 路徑差逐值比對） | 1.8e-14 |
| `pls_micom`（step 2 c＋step 3 平均/變異差＋permutation 分位） | numpy 手算（Henseler et al. 2016 程序）＋同一批固定指派 | 1.9e-15 |
| `pls_predict`（k=10、LM 基準、Q²predict）＋CVPAT | 固定 fold 指派的引擎層級交叉驗證（Shmueli et al. 2016/2019；Liengaard et al. 2021） | 3.9e-12 |
| `pls_itcriteria`（AIC/AICc/BIC/HQ） | 封閉式（Sharma et al. 2019） | 1.1e-14 |
| `pls_ipma`（0–100 重標定、非標準化總效果） | numpy 手算（Ringle & Sarstedt 2016 程序） | 2.4e-14 |

### W5 慣例決策與待抽驗清單（Kevin 本機 SmartPLS 4 / R）

> **已抽驗 ✓（2026-07-13）**：PLSc、MICOM、MGA、PLSpredict 全數銷帳；期間發現並修復 2 個實作錯誤（Welch t、MICOM step 3 log 變異數比）。見「R 抽驗銷帳（Session A）」節。

1. **MGA 判讀主從**：permutation 為主判準（報表 LED 掛 permutation p）；
   Henseler MGA 回報單尾 P(β₁≤β₂)。SmartPLS 的 Henseler p 定義向（單/雙尾）
   建議本機抽驗一次確認方向一致。
2. **MICOM step 2 的 c**：各組權重估自組內標準化資料、分數算在 pooled 標準化資料；
   SmartPLS 的實作細節未完整文件化，屬高優先抽驗項（cSEM `testMICOM` 可交叉）。
3. **PLSpredict**：預設 10 folds、1 次重複（SmartPLS 預設 10 次重複取平均——
   本實作為單次固定種子，數字會與 SmartPLS 有小差；與 seminr `predict_pls`
   同設定可逐值抽驗）。LM 基準 = 內生指標對全部外生指標之 OLS（Shmueli 2019 慣例）。
4. **IPMA 重標定**：用觀察 min/max（SmartPLS 用量表理論界線）——量表極端值
   未被觀察到時兩者會不同，UI 註記此差異；量表界線設定介面列入 backlog。
5. **CVPAT**：損失 = 內生指標平方誤差的逐案平均（全模型層級檢定）；
   Liengaard et al. (2021) 的公開程式碼可複算。
6. **W3 順延項處置**：三種估計尺度已併入 IPMA 的非標準化流程；pairwise deletion
   設計完成但實作交接 W6+（見 handoff-roadmap）；CCA 以報表導覽呈現（Notes 步驟 7）；
   GoF 已實作（附「不建議」註記）。

## W6 增補（2026-07-09）：NCA 必要條件分析的基準驗證

W6 首項交付 NCA（Dul 2016）。新增 3 組基準（`generate_reference.py` 的
「NCA 基準區塊」，附專屬固定種子資料集 `datasets.json:nca`，n=48），
`reference.json` 只增不改（61 → 64 個方法）。測試由 547 項增至 579 項
（573 過、6 記錄性跳過）；另加 `tests/nca.test.js` 16 項行為測試
（含手算錨定 d=0.5 的小資料集）。

| 基準 | 來源 | 實測最大相對差 |
|---|---|---|
| `nca_ce_fdh`（scope／peers／ceiling zone／effect size d） | numpy 封閉式手算（Dul 2016：ceiling(x)=max{y:xᵢ≤x} 階梯、空白區/scope=d） | < 1e-9 |
| `nca_cr_fdh`（線性 ceiling 截距/斜率／zone／d） | numpy 手算（過 CE-FDH ceiling 點的 OLS＋scope 內夾擠分段線性積分） | < 1e-9 |
| `nca_bottleneck`（各 Y 水準所需 X）＋`p_ce`（permutation 檢定） | **199 組固定 permutation 注入的引擎層級交叉驗證**（統計量=CE-FDH d，逐值比對） | < 1e-9 |

引擎（`src/lib/stats/nca.js`）JS 對 numpy 逐欄位相對差為 0（bit-for-bit），
全項以預設 1e-6 容差通過（非迭代、皆封閉式）。

### W6 增補 II（2026-07-10）：cIPMA（IPMA × NCA 組合）

Hauff, Richter, Sarstedt & Ringle (2024, J. Retailing & Consumer Services) 的
combined importance-performance map analysis。新增 1 組基準
（`pls_cipma`，64 → 65 個方法；`datasets.json` 加 `cipma` 固定排列），
測試由 579 增至 595（589 過、6 跳過；compare 10 欄位＋pls.test.js 6 項行為）。

| 基準 | 來源 | 驗證方式 |
|---|---|---|
| `pls_cipma`（F1/F2→C 的 d_ce/d_cr/p＋bottleneck@80% 值與未達案例 %） | numpy 手算：重用 `pls_ipma` 的 0–100 分數（_s100）＋ NCA 區塊助手；199 組固定 permutation | 引擎 `cipmaPLS`（`ipmaPLS`＋`runNCA` 組合）注入同批排列，PLS 迭代容差 1e-4 全過 |

**cIPMA 慣例（依 Hauff et al. 2024）**：NCA 跑在 IPMA 的 0–100 重標定 LV 分數上
（作者證明與 standardized/unstandardized 分數等值，前提為同構念指標同量尺）；
只測目標的**直接前置構念**（IPMA importance 為總效果，兩者口徑不同屬設計）；
必要性判準 d ≥ .1 且 permutation p < .05（＋理論支持）；實證 scope（較保守）；
bottleneck 以 0–100 實際值＋未達所需水準之案例 %（論文 Table 5 雙格式）。

**待抽驗（SmartPLS 4 內建 cIPMA）**：同模型（M4 對應之設定）開 NCA/cIPMA，
比對 d 與 bottleneck 值。注意兩個已知口徑差：(a) 本工具 0–100 重標定用觀察
min/max、SmartPLS 用量表理論界線（同 IPMA 的既有差異，UI 已註記）；
(b) permutation 為近似檢定，p 相近但非逐位相同。

**plspm 版本敏感性（管線備忘）**：本輪在沙盒重跑 `run_pls_ref_only.py` 時，
新裝的 plspm 版本使 W1/W3/W4 區塊的交叉驗證程式碼失敗（`zip()` 嚴格模式），
W5/ipma 區塊正常且既有基準值零漂移（最大相對差 3.58e-16）。既有 61 鍵已從
git HEAD 原樣還原、只疊加新鍵。**日後重生基準時：跑完務必 diff reference.json
確認既有鍵未被改動**；W1/W3/W4 區塊的 plspm 相容性修復列入 backlog。

### W6/NCA 慣例決策與待抽驗清單（Kevin 本機 R `NCA` 套件）

> **已抽驗 ✓（2026-07-13）**：七項全數逐值對齊 R `NCA` 5.0.2，零差異。見「R 抽驗銷帳（Session A）」節。

沙盒無 R `NCA` 套件 → 本輪基準以「Dul (2016) 封閉式定義」由 numpy 手算，
JS 引擎與其 bit-for-bit 一致；**慣例對齊仍待本機 R 抽驗**。抽驗方式：同一
資料（可用 employee 示範或匯出 `datasets.json:nca` 的 x/y）跑 R：
`NCA::nca_analysis(data, x, y, ceilings=c("ce_fdh","cr_fdh"))`，比對下列各項。

1. **scope 界線**：本實作用實證 min/max（R 預設同）；若 Kevin 要用理論界線
   （`scope.theory`），效果量 d 會變——雙軌報告時本機各跑一次確認。屬高優先。
2. **CE-FDH ceiling zone**：階梯上方空白區 = Σ(y_max−ry_j)(下一轉角x−rx_j)。
   R 的 `ceiling` 面積演算法逐值比對（d 應與 `effect size` 欄一致）。高優先。
3. **CR-FDH 迴歸線**：本實作對「CE-FDH ceiling 記錄點（peers）」做 OLS；
   R 的 CR-FDH 迴歸樣本點選取細節（是否含水平段上的觀察值）未完整文件化，
   屬高優先抽驗項——截距/斜率若不同會連動 d_cr。
4. **CR-FDH scope 內夾擠**：線性 ceiling 超出 [y_min,y_max] 的部分以夾擠處理
   （分段線性精確積分）；確認 R 是否同樣夾擠或允許外溢。
5. **permutation 檢定**：p = #{d_perm ≥ d_obs}/P，統計量取 CE-FDH d（Dul,
   van der Laan & Kuik 2020 近似檢定）。UI 用固定 seed 生成 permutations
   （近似、可重現），R 的 `test.rep` 預設 10000、隨機種子不同——p 應相近但非逐位相同；
   引擎正確性已由 199 組**注入**排列在 fixture 中逐值鎖定。
6. **bottleneck 表達**：本輪回報「所需 X 實際值＋% of range」，NN=所需 X≤x_min；
   R `bottleneck` 另支援 percentile/actual 等表達，數字口徑一致即可。
7. **cIPMA（後續）**：§6.4 的 cIPMA（與既有 `ipmaPLS` 組合）本輪未做，
   列為 NCA 的下一步（handoff-roadmap §6.4）。

### W6 增補 III（2026-07-13）：CTA-PLS（驗證性 tetrad 分析）

Gudergan, Ringle, Wende & Will (2008), JBR 61(12) 的 confirmatory tetrad analysis；
tetrad 定義依 Bollen & Ting (1993)。新增 1 組基準（`pls_cta`，65 → **66 個方法**），
並加專屬固定種子資料集 `datasets.json:cta`（獨立 rng seed=31，n=60）。
測試由 595 增至 657（**651 過、6 跳過**；compare 50 欄位＋pls.test.js 12 項行為）。

| 基準 | 來源 | 驗證方式 |
|---|---|---|
| `pls_cta`（R 區塊 5 個 tetrad、M 區塊 2 個；各附 value/bias/se/CI＋區塊判讀） | numpy 封閉式手算（指標相關矩陣上的 tetrad）＋300 組固定 bootstrap 重抽索引 | 引擎 `ctaPLS` 注入同一批索引 → JS↔numpy 全 50 欄位逐值對齊 |

**專屬資料集的設計**：main 的四個區塊都只有 3 個指標，tetrad 在 k < 4 時**數學上不存在**，
無法檢定 → 另建 `cta` 資料集：
- `cr1–cr5`：單因子反映型（loadings .85/.80/.75/.70/.65）→ tetrads 應消失（判反映型）
- `cm1–cm4`：兩對高相關、跨對僅 .3 相關的非單因子結構 → tetrads 不消失（判形成型）

基準生成端以 assert 鎖死這兩個設計預期（`R_verdict == reflective`、`M_verdict == formative`），
資料設計若失效會直接讓基準生成失敗，不會靜默產出無鑑別力的基準。

**CTA-PLS 慣例決策（三項，皆待抽驗）**

1. **非冗餘 tetrad 的選取**：k 個指標的區塊有 3·C(k,4) 個 tetrad，其中恰 **k(k−3)/2** 個
   非冗餘（= k(k−1)/2 個共變異數 − k 個 loading 的自由度差）。本實作用「逐一加入指標」
   的確定性構造：加入第 m 個指標時取 {0,1,2,m} 上 2 個獨立 tetrad ＋ 對 c=3..m−1 各 1 個
   {0,1,c,m}。生成端以 **Jacobian 秩 assert** 驗證所選集合為極大獨立。
   ※ 任一極大獨立子集張成**相同的約束空間** → 區塊層級的 omnibus 判讀等價；
   但**個別 tetrad 的 CI 會隨選取而異**。SmartPLS 的選取細節未文件化 → 高優先抽驗項。
2. **CI 形式**：bias-corrected ＋ **區塊內** Bonferroni：
   CI = (τ̂ − bias) ± t_{1−α/(2T), B−1} · SE，bias = mean(τ*) − τ̂、T = 該區塊 tetrad 數。
   兩個未定點：(a) Bonferroni 的族系範圍是「單一構念」還是「全模型所有 tetrad」；
   (b) t 的自由度用 B−1 還是 n−1（B 大時兩者近乎相同）。SmartPLS 皆未文件化 → 中優先抽驗項。
3. **運算矩陣**：在**標準化資料的指標相關矩陣**上算 tetrad（PLS 慣例；SmartPLS 亦標準化）。
   tetrad 在尺度變換下按 c_g·c_h·c_i·c_j 縮放，消失與否不受影響 → 判讀不受此選擇影響。

**範圍限制（引擎與 UI 雙處把關）**：
- 指標 < 4 的構念一律列入 `skipped` 並附中文說明（`不靜默略過`，架構不變量 4）；
  全部構念都 < 4 → 明確錯誤 `cta-no-eligible-construct`。
- 含調節／高階構念的模型不支援（沿 `rejectW4` 慣例，錯誤碼 `w4-model-not-supported`）。

**新增共用工具**：`src/lib/stats/pvalue.js` 的 `qT(alpha, df)`（t 分布雙尾臨界值，
以 pT 二分搜尋；對齊 scipy `t.ppf` 至 1e-10 級，實測 4 組）。

### CTA-PLS 待抽驗清單（Kevin 本機 SmartPLS 4）

沙盒無 SmartPLS，R 亦無主流 CTA-PLS 套件（cSEM/seminr 皆不提供）→ 本輪基準為
Gudergan et al. (2008) 公式的忠實手算，**慣例對齊待本機抽驗**。

1. **tetrad 選取集**（高優先）：同資料在 SmartPLS 4 跑 CTA，比對「回報幾個 tetrad」
   與「各 tetrad 的指標組合」。數量若非 k(k−3)/2 → 選取邏輯不同，需雙處標註。
2. **Bonferroni 族系範圍**（中優先）：看 SmartPLS 的 adjusted CI 是按單一構念的 tetrad 數
   還是全模型 tetrad 總數調整——多構念模型上兩者的 CI 寬度會明顯不同。
3. **CI 變體**（中優先）：確認是 bias-corrected（本實作）還是 percentile／BCa。
4. **判讀門檻**：確認 SmartPLS 是否同樣採「任一 adjusted CI 不含 0 → 形成型」。

抽驗資料：`scripts/validation/data/cta.csv`（n=60，cr1–cr5 ＋ cm1–cm4 九欄），
操作步驟見 `scripts/validation/README.md` §2.7。

## W6 增補 VII（2026-07-13）：pairwise deletion ＋ WPLS（核心改為相關矩陣驅動）

handoff-roadmap §6.6（WPLS）＋§6.7（pairwise deletion）。新增 1 組基準
（`pls_pairwise_wpls` 59 值）＋`datasets.json:pw`，**72 → 73 個方法**；
測試由 1056 增至 **1126 過、6 跳過**。

**這是 W6 唯一動到引擎心臟的一項**，也是 workplan 標為「回歸風險最高」的一項。

### 一、核心重構：`estimateCoreFromCorr(R, spec)`

Lohmöller 迭代**完全可由指標相關矩陣 R 驅動**：

| 量 | 純 R 的算式 |
|---|---|
| 分數變異 | Var(y_j) = w_j'·R_jj·w_j |
| LV 相關 | corr(y_j, y_k) = w_j'·R_jk·w_k |
| 指標–LV 相關 | corr(z_h, y_k) = Σ_g w_kg·R[h][g] |
| 內部估計的共變異 | cov(z_h, Z_j) = Σ_k e_jk·corr(z_h, y_k) |
| Mode B 外部權重 | S_bb⁻¹·r（S_bb 為 R 的區塊子矩陣） |
| loadings／信效度／HTMT／model fit | 本來就只吃 R |

重構後 `estimateCore(cols, n, spec)` 只剩薄包裝：R ← 欄位相關矩陣 → 迭代 → 由欄位算分數。
**迭代邏輯只有一份**，三個入口共用（完整資料／pairwise／WPLS），不會出現兩份會漂移的實作。

一個關鍵簡化：外部權重原用 `corr(z_h, Z_j)`（要除以 sd(Z_j)），改用 `cov(z_h, Z_j)`。
sd(Z_j) 對整個區塊是同一個純量，權重隨後又被縮放成 Var(y_j)=1 → **該因子完全相消**，
兩者的正規化結果逐位相同，還少一次開根號與一個誤差來源。

**零回歸**：重構完成後，既有 **733 個基準欄位逐值全過**，未改動任何 fixture。
另加 `full_*` 自我一致性欄位（完整資料走相關矩陣路徑必須重現 `pls_basic`）與行為測試雙重把關。

> 一個誠實的註記：numpy 端的相關矩陣驅動引擎與原欄位驅動引擎在完整資料上相差約 **1.3e-8**
> （path 係數）。兩者代數等價，差異來自**收斂終止的浮點位置**——原引擎的內部權重由分數向量的
> 相關累加而得，新式為代數乘積。1.3e-8 遠在 PLS 迭代量的比對容差（1e-4）之內，
> 基準端的自我一致性 assert 因此設為 1e-6 而非機器精度。

### 二、pairwise deletion

R[a][b] 只用「a、b 兩欄同時可觀察」的列計算。本測資（固定 MCAR 遮罩、缺失率 11.4%）
最少的一格有 42 筆配對，R 的最小特徵值 0.328（半正定）。

三個主動防呆：

1. **配對 < 3 筆 → 報錯**（`pairwise-too-sparse`），不給不可靠的相關。
2. **R 非半正定 → 警告**：不同格來自不同子樣本、彼此可能不相容，信效度與 model fit
   可能落在合理範圍外。缺失比例高時建議改用 casewise 或多重插補。
3. **blindfolding（Q²）× pairwise 互斥 → 報錯**（`blindfold-pairwise-conflict`）：
   blindfolding 的機制是「刻意挖洞再預測」，資料本身已有缺失時無法區分
   「被挖掉的格子」與「原本就缺的格子」。Config 端也做了前置驗證。

**分數的來源必須說清楚**：LV 分數以 zero-imputed 標準化值（＝原尺度的均值補值）加權，
只供 IPMA／預測／分段等下游使用；統計量（loadings、lvCorr、信效度、HTMT、model fit）
**一律走 R**，不從分數重算。這一點已寫進 UI Notes 與報表警告。

### 三、WPLS（加權 PLS）

`options.weights` 接受欄位名或與資料等長的數值陣列。R 改以加權平均／加權共變異／加權相關計算。

| 性質 | 驗證方式 |
|---|---|
| 全 1 權重 = 未加權 | 行為測試（差 < 1e-8） |
| 權重同乘常數不改變結果（相關為尺度不變量） | 行為測試（差 < 1e-10） |
| 權重為 0 的列實質不參與估計 | 行為測試：前 10 列權重 0 ≡ 直接刪前 10 列（差 < 1e-6） |
| 欄位名與陣列兩種指定方式等價 | 行為測試（差 < 1e-12） |
| 非法權重（長度不符／負值／全 0／欄位不存在／型別錯） | 五項各自的中文報錯 |

**一個刻意不做的東西**：推論（bootstrap）仍以**未加權**方式重抽。加權重抽的設計
SmartPLS 未文件化，不擅自實作——UI Notes 與報表警告都明說這一點，避免使用者誤以為
CI 也反映了加權。

### 四、pairwise 與 WPLS 可併用

兩者都只是「換一個 R 進同一個入口」，故可疊加（已寫成行為測試）。

## W6 增補 VI（2026-07-13）：PLS-POS（prediction-oriented segmentation）

Becker, Rai, Ringle & Völckner (2013), MIS Quarterly 37(3)。新增 2 組基準
（`pls_pos` 36 值、`pls_pos_inputs`），**70 → 72 個方法**；測試由 1009 增至 **1056 過、6 跳過**。

與 FIMIX 共用 `datasets.json:fimix`（兩段 β = ±0.80）——**同一份資料、兩種完全不同的演算法，
結果應相互印證**，這本身就是一道驗證。

| | FIMIX | PLS-POS |
|---|---|---|
| 指派 | 軟（後驗機率） | 硬（每案屬一段） |
| 目標 | 混合模型對數概似 | 內生構念的預測誤差（SSE） |
| 演算法 | EM | 逐案重新指派的爬山法 |
| 分布假設 | 常態 | 無 |
| 段別解（K=2） | β = +0.864 / −0.827；n ≈ 194/106 | β = +0.915 / −0.831；n = 175/125 |
| 段別還原率 | 0.853 | 0.837 |

兩法獨立收斂到相近的段結構（真實為 180/120、β = ±0.80），互為佐證。

**分段前後的對比（POS 的核心敘事）**

| | 路徑係數 | 預測誤差 SSE | R² |
|---|---|---|---|
| 全域單一模型 | +0.318 | 268.70 | 0.101 |
| 分段後（K=2） | +0.915 / −0.831 | 63.61 | **0.787** |

全域係數 +0.318 是一個**誰都不代表的平均**——正負兩段相消的產物。這正是未觀察異質性的危害，
也是 FIMIX/POS 存在的理由。已寫成行為測試（`全域單一模型會掩蓋這個結構`）。

**驗證策略（同 FIMIX，無主流實作可對照）**

1. **模擬還原**：還原率 0.837；段別大小 175/125（真實 180/120）。
2. **目標函數單調遞減**：爬山法的數學保證——每一輪的 SSE 不得上升。基準端 `assert` ＋
   引擎端 `monotone` 旗標與 warnings 斷言。
3. **JS↔numpy 逐值**：起始分割固定注入（`pls_pos_inputs`），繞開兩邊 RNG 不同。
   36 欄位全部對齊，連 `passes`（爬山輪數 3 / 4）與 `moves`（搬移次數 144）都逐值相同——
   這代表兩邊的**搬移決策序列完全一致**，是比數值對齊更強的驗證。

**確定性的關鍵設計**：爬山法的結果對「掃描順序」與「同分處理」極度敏感。兩端統一為——
逐案依索引序、候選段依段索引序、取「改善最大且 > 1e-12」者、**嚴格 `>` 比較使同分時取段索引較小者**。
任一端偏離都會導致搬移序列發散、`passes` 與 `moves` 對不上。這也是為什麼把這兩個欄位放進 fixture。

**★ 本法的關鍵弱點（已在 UI 強制警告並寫成測試）**

POS 的目標函數（預測誤差）**必然隨段數增加而下降**——段數愈多、配適愈好，因為 POS 自己沒有懲罰項。
本資料上 K=3 的 SSE（50.48）確實低於 K=2（63.61），但第三段的 β = −0.164、R² = 0.276，
明顯是雜訊。**POS 不能用來選段數**；段數要靠 FIMIX 的資訊準則、理論、或段別的可解釋性決定。
UI 每次都會顯示這個警告（不是「有問題才警告」，而是無條件警告——這是方法本身的性質）。

## W6 增補 V（2026-07-13）：FIMIX-PLS（潛在異質性分段）

Hahn, Johnson, Herrmann & Huber (2002), Schmalenbach Business Review 54(3)；段數選擇準則依
Sarstedt, Becker, Ringle & Schwaiger (2011), Schmalenbach BR 63(1)。新增 2 組基準
（`pls_fimix` 71 值、`pls_fimix_inputs`），**68 → 70 個方法**；測試由 923 增至 **1009 過、6 跳過**。

**這一波的驗證問題最尖銳**：FIMIX **沒有主流 Python/R 完整實作**可對照。
不能像其他方法那樣「跑一個公認的參考實作、逐值比對」。採三重策略：

| 策略 | 做法 | 結果 |
|---|---|---|
| (a) 模擬還原 | 新建 `datasets.json:fimix`（n=300）：兩段已知係數 β = +0.80 / −0.80、段別大小 180/120、殘差 σ=0.25、loadings .90/.85/.85 | 引擎還原率 **0.853**；段別解 β = +0.864 / −0.827（LV 分數含測量衰減，故略偏離 ±0.80）；ρ = 0.647 / 0.353（真實 0.60/0.40）；**K=2 在 AIC/AIC3/AIC4/BIC/CAIC/HQ/MDL5 七個準則上全部最佳**；EN = 0.566 > .50 |
| (b) EM 單調性 | lnL 每步不得下降（EM 的數學保證） | 基準端 `assert` ＋ 引擎端 `monotone` 旗標與 warnings；K=2、K=3 皆通過 |
| (c) JS↔numpy 逐值 | 初始後驗機率固定注入（`pls_fimix_inputs`），繞開兩邊 RNG 不同 | 71 欄位（K=1–4 的 lnL／八個準則／段別 ρ、β、σ²／還原率）**全部對齊** |

**資料集的設計理由（對稱兩段）**

第一版模擬用 β = +0.70 / −0.30、σ = 0.6，結果**還原率只有 0.57、EN = 0.31、K≥3 退化**——
兩條迴歸線重疊，EM 落入局部最優。這樣的基準什麼都驗證不了，等於自欺。
改為對稱設計後三個好處：(a) 兩段 Var(η) 相同 → 全樣本標準化不會把兩段斜率縮放成不同倍率，
段別解可直接對照真實值；(b) 兩段方向相反 → 全域路徑被大幅相消，**「整體只看到微弱關係，
其實是一強正、一強負兩個段」正是 FIMIX 存在的理由**，也寫成了行為測試；
(c) 段別大小不等（180/120）→ ρ 有資訊量，且能檢驗 label switching 的處理。

**慣例決策**

1. **無截距**（Hahn et al. 原式）。LV 分數已全樣本標準化，但段別平均未必為 0；
   原式不設截距，本實作忠實照做並在 UI Notes 註明。
2. **參數個數** N_k = (K−1) + K·R + K·M（R = 結構路徑總數、M = 內生構念數），依 Sarstedt et al. (2011)。
3. **EN（normed entropy）** = 1 − [−ΣΣ p_ik ln p_ik] / (n ln K)（Ramaswamy, DeSarbo, Reibstein &
   Robinson 1993）。K = 1 時 ln K = 0 → 回報 `null`（不是 0，也不是 1）。
4. **label switching**：段別依佔比 ρ 遞減排序（基準端與引擎端同規則），確保輸出決定性。
5. **局部最優**：EM 只保證局部最優 → 多起點（UI 預設 10 次、固定種子）取 lnL 最高者。
   注入 `initPosteriors` 時只跑該起點（基準交叉驗證用）。

**主動防呆**：EN < .50 → 警告「段別分離不佳，不宜據以行動」；有段的成員數 < 5% 樣本 → 警告段數過多；
n < 10K → 直接報錯（不給無意義的解）。

**未做**：Hair et al. 教科書範例數字（原規劃的第三道基準）。教科書的 FIMIX 範例未公開原始資料，
無法重建；以模擬還原＋EM 單調性＋逐值交叉驗證三者替代，已足以支撐正確性主張。

## W6 增補 IV（2026-07-13）：Gaussian copula 內生性檢查

Park & Gupta (2012), Marketing Science 31(4)；PLS-SEM 應用流程依 Hult, Hair, Proksch,
Sarstedt, Pinkwart & Ringle (2018), JIM 26(3)。新增 2 組基準（`pls_copula` 30 值、
`pls_copula_inputs` 1 值），**66 → 68 個方法**；測試由 879 增至 **923 過、6 跳過**。

| 基準 | 來源 | 驗證方式 |
|---|---|---|
| `pls_copula`（KS D ×2、copula 項全向量 ×2、四個結構方程的擴充迴歸係數與 R²、bootstrap SE／CI） | numpy 手算（ECDF＋qnorm）＋300 組固定 bootstrap 重抽索引 | 引擎 `copulaPLS` 注入同一批索引 → JS↔numpy 全 30 欄位逐值對齊 |

**慣例決策（三項，均已鎖入 fixture）**

1. **經驗 CDF 的並列處理**：H = `ecdf(P)(P)`，即「≤ 該值的個數 ÷ n」（並列取**最大**秩）。
   Hult et al. (2018) 公開程式碼即此作法。改用平均秩或 (rank−0.5)/n 會得到不同的 copula 項。
2. **H = 1 的處理**：最大值會使 H = 1 → Φ⁻¹(1) = +∞。夾為 **1 − 1e−7**（Hult et al. 的
   `ifelse(H.p == 1, 1 - .0000001, H.p)`）。行為測試明確斷言最大值不產生 Infinity。
3. **標準化與否不影響**：copula 項為秩基底，對單調變換不變 → LV 分數是否標準化不改變 c。
   已由 `copulaTerm(3x + 7) == copulaTerm(x)` 的行為測試鎖定。

**KS 前置把關**：Park & Gupta 的識別條件要求解釋變數非常態。本實作以 KS（Lilliefors）
把關，**未拒絕常態時給出警告但仍照算**（不靜默擋掉，沿「數值誠實」不變量）。
基準只鎖 **D 統計量**——p 值屬已知慣例差異（JS 用 Dallal-Wilkinson、statsmodels 用查表內插，
見本報告「記錄性慣例差異」節），與 `ks_lilliefors` 同一處理。

**模型組合**：Hult et al. (2018) 建議檢視所有 copula 組合。k 個候選 → 2^k − 1 個模型；
k > 5 時只跑「各自單獨」與「全部同時」並警告（避免組合爆炸）。

**bootstrap 為完整巢套**：copula 項的漸近 SE 非標準（Hult et al. 明言需 bootstrap）。
每次重抽都**重估 PLS 權重 → 重算 copula 項 → 重跑擴充迴歸**，而非固定權重只重抽殘差。
基準端（numpy）與引擎端（JS）採同一巢套順序，故可逐值對齊。

**待抽驗**：SmartPLS 4 的 Gaussian Copula（其候選選取與 SE 細節未文件化）。
本工具在 M4 上兩個候選構念的 copula 係數 95% CI 均含 0（無內生性證據），
且兩者的 LV 分數在 KS 下均未拒絕常態 → 依 Park & Gupta 的識別條件，此結果本就不可據以判定內生性，
UI 已明確標黃警告。這是**方法的正確使用邊界**，不是實作缺陷。

## R 抽驗銷帳（Session A，2026-07-13）：seminr 2.5.0 / cSEM 0.6.1 / NCA 5.0.2
Kevin 本機 R 執行 `scripts/validation/` 的三支腳本，逐項對照上列各波「待抽驗清單」。
以下為結案判定；**本節取代各波清單中屬 R 可驗範圍的項目**（SmartPLS 4 專屬項仍待抽驗）。

### 一、逐值對齊，銷帳（16 項）

| 波次 | 項目 | 對照 | 結果 |
|---|---|---|---|
| W3 | M1 核心：loadings／weights／path／R²／adjR²／alpha／rhoA／rhoC／AVE／HTMT／LV 相關 | seminr | 全部至小數 6 位一致 |
| W3 | M4 路徑、總效果、中介分解 | seminr | 一致 |
| W3 | model fit：SRMR（飽和 0.0975623／估計 0.1043736） | cSEM | 一致（cSEM 的 `.saturated` 兩口徑皆對上） |
| W3 | model fit：d_ULS（0.5235117／0.5991614） | cSEM | 一致 |
| W3 | model fit：NFI（0.6684221） | cSEM | 一致 |
| W4 | product indicator 調節 | seminr | 一致（見下「慣例差異」） |
| W4 | two-stage 調節 | seminr | 一致 |
| W4 | HOC 兩階段（對到 `pls_hoc_disjoint`：G→C −0.402148、loading 0.803529／0.826177） | seminr | 逐值一致 |
| W5 | **PLSc**：rhoA（F1 1.017597／F2 0.707796／C 0.888324）、一致 loadings（含 i2 = 1.151977）、校正後路徑、R² | cSEM | 全部一致 |
| W5 | **rhoA > 1 與一致 loading > 1 的處置** | cSEM | cSEM 同樣「不截斷、照報」→ 本工具「警告但不截斷」的行為確認對齊 |
| W5 | MICOM step 2 的 c（0.9823249／0.9573535） | cSEM | 見下「cSEM 自身缺陷」——本工具正確 |
| W5 | MICOM step 3 平均差 | cSEM（排序後） | 一致（0.076929／0.028477，方向為 M−F） |
| W5 | MGA 路徑差 `diffObs` = 0.332255 | cSEM Chin（F−M = −0.3323） | 同值，僅群組相減方向不同 |
| W5 | MGA permutation p（1000 次：0.042 vs cSEM 0.032） | cSEM Chin | 一致（近似檢定，種子不同；同決策） |
| W5 | PLSpredict | seminr | 量級與 PLS-vs-LM 方向一致（fold 隨機指派，本就不逐值比） |
| W6 | NCA 全部：scope 3501.5488、CE zone 835.0134、d_ce 0.238470、CR 截距 13.142064／斜率 0.516124、CR zone 808.5301、d_cr 0.230906、peers 8、bottleneck 逐 level、NN 語意、permutation p | R `NCA` 5.0.2 | 全部一致，零差異 |

NCA 的兩點澄清：（a）`nca_bottleneck` fixture 的 `p_ce = 0.005025`（= 1/199）來自**注入的 199 組固定排列**，UI 實際跑 10,000 次（`src/analyses/nca/compute.js`），與 R 的 `test.rep` 預設同口徑；（b）本工具以 `nn` 旗標表達 R 的 `NN`，語意等價。

### 二、本次修正的實作錯誤（2 項，已修並通過測試）

**錯誤 1：MGA 的 Welch t 分母漏了 (n−1)/n 加權**（`src/lib/stats/pls.js` `mgaParametricTest`）

原式 `sw = sqrt(se1² + se2²)`，正確式為 Sarstedt, Henseler & Ringle (2011) 的
`sw = sqrt((n1−1)/n1 · se1² + (n2−1)/n2 · se2²)`。t 被低估 √((n−1)/n) 倍（n=30 時 1.7%），p 偏保守。

**發現方式**：n₁ = n₂ 時 Keil 的 pooled t 與 Sarstedt 的 Welch t 數學上恆等——cSEM 對本資料兩者皆報 −1.1450，而本工具卻報 1.1483 / 1.1290。修正後兩者恆等，`pls_mga_formulas` 的 `tWelch` 2.364247 → **2.404664**（= `tPooled`）、`pWelch` 0.021819 → 0.019767。`dfWelch` 在 n₁ = n₂ 時為尺度不變，未變動（n₁ ≠ n₂ 時已一併改用加權變異數）。

**錯誤 2：MICOM step 3 的變異數比較用了「差」而非「log 比」**（`src/lib/stats/pls.js` `micomPLS`）

Henseler, Ringle & Sarstedt (2016) 的 step 3 統計量為 `log(var₁) − log(var₂)`；cSEM 原始碼亦為
`log(y[[1]]) − log(y[[2]])`。原實作用 `v1 − v2`。本資料兩者恰好接近（−0.116466 vs −0.114790）
只因兩組變異數都在 1 附近；變異數遠離 1 時會明顯發散。

修正後 `pls_micom` 的 `varDiff_F1` −0.116466 → **−0.114790**、`varDiff_F2` −0.432812 → **−0.432167**，
恰為 cSEM（排序後）所報 0.1147895／0.4321670 的鏡射，逐值吻合。CI 四欄同步更新。
UI 欄位標題已由「變異差」改為「log 變異數比」（zh-TW／en 同步）。

### 三、慣例差異（不修，雙處標註）

**調節效果的交互構念尺度。** product indicator 與 orthogonalizing 的交互項係數，本工具回報
**標準化**值（與其他所有路徑同口徑），seminr 回報**未標準化**值。決定性證據（`04_ortho_check.R`）：
seminr 的 orthogonal 交互構念分數 `sd = 0.835227`，以標準化分數重跑 OLS 得
−0.115582 / −0.223428 / **0.334718**、R² = 0.177043，與本工具逐值吻合；seminr 直接報 0.400751。
product indicator 亦同一慣例，只是其 `sd = 1.001905` ≈ 1，故表面上看似一致
（0.194320 = 0.194690 ÷ 1.001905）。**配適與其餘路徑完全相同**，僅交互項係數差一個常數。
已標註於 `intMethodHint`（zh-TW／en）。

### 四、cSEM 0.6.1 自身的缺陷（其對應輸出不可作為基準）

**缺陷 A：`testMICOM` step 3 的群組錯位。** 其
`id <- rep(1:length(X_list), sapply(X_list, nrow))` 假設 `Data_pooled` 已按群組排序，
但 `main.csv` 為 M/F 交錯。以「前 30 列 vs 後 30 列」重算得 0.189317／0.121241／0.212971／−0.028920，
與 cSEM 報表印出的每一位相同（`06_micom_sorted.R` 已用排序後資料重跑驗證：排序後 cSEM 給出
−0.076929／−0.028477 與 0.1147895／0.4321670，即本工具的正確值）。

**缺陷 B：`testMICOM` step 2 的 c 在未標準化資料上計算。** 其原始碼註解稱
「it does not matter if the data is scaled or unscaled as this does not affect the correlation」——
此說有誤：`H = X·w`，X 未標準化時等效權重變為 `diag(s)·w`，兩組複合體方向同時被重新加權，
相關係數會變。用 cSEM 自己報的組別權重驗證：標準化 X 得 0.9823249／0.9573535（＝本工具值），
未標準化 X 得 0.9826037／0.9575659（＝cSEM 報表值）。**PLS 的複合體應建立在標準化指標上，本工具正確。**

### 五、原「待 SmartPLS 4 抽驗」的兩項 —— 已改由開源實作結案（2026-07-13）

**SmartPLS 4 授權已過期**（開啟後只有 "License expired"，功能全鎖），無法作為第三方證人。
改以**開源參考實作**裁決——這其實比 GUI 抽驗更可靠：可以直接讀公式，不必從畫面數字反推。

#### 5-1. Henseler MGA p 的偏誤校正錨點 → **本工具有小錯，已修**

seminr 的 `estimate_pls_mga.R` 是 Hair/Ray/Danks 團隊的實作，`@references` 明確引 Henseler,
Ringle & Sinkovics (2009)——正是本工具宣稱對齊的那篇。其核心兩行：

```r
beta$group1_beta_mean <- apply(boot1_betas, MARGIN = 2, FUN = mean)   # bootstrap 平均 θ̄*
beta_comparison <- 2*group1_beta_mean - draw1 - 2*group2_beta_mean + draw2
pls_mga_p <- 1 - sum(Theta(beta_comparison)) / J^2
```

**偏誤校正的錨點是 bootstrap 平均 θ̄\*，不是點估計 θ̂。** 本工具原用 `2·θ̂ − θ*`。

在 main（M vs F）上以同一批 draws 實測：

| 公式 | p（group1 = M） |
|---|---|
| 本工具（原）：以點估計 θ̂ 鏡射 | 0.1129 |
| **seminr：以 bootstrap 平均 θ̄\* 鏡射** | **0.1131** |
| cSEM 0.6.1（其值與「不做偏誤校正、直接比原始 draws」一致） | 0.0322 |

兩個獨立實作（本工具 0.1129、seminr 0.1131）幾乎重合，**cSEM 才是離群值**。
本工具的公式方向正確，只有錨點用錯，已改為 bootstrap 平均（`henselerMgaP` 簽章由
`(draws1, draws2, th1, th2)` 簡化為 `(draws1, draws2)`，錨點在函式內部算）。
`pls_mga_formulas` 的 `henselerP` 由 0.011750 → **0.014675**。

#### 5-2. d_G 的對數底數 → **維持 ln，不改**

cSEM `calculateDG` 的原始碼（`R/helper_assess.R`）：

> `(log(Eigen$values, base = 10))^2`

**且該處另有一條註解，明說作者不確定應該用自然對數還是以 10 為底的對數。**
這與本報告先前由數值反推的結論一致——比值 1.046563 / 0.197394 = 5.30190 = (ln 10)²。

判定：**維持自然對數。** 理由：
1. 測地距離在正定矩陣流形上的定義（Riemann 度量）就是 ½·Σ(ln λ)²——用自然對數是數學定義，
   不是慣例選擇。Dijkstra & Henseler (2015) 寫 `log` 未指定底數，但幾何定義沒有歧義。
2. cSEM 的實作在自己的原始碼裡就標記為不確定，不足以推翻數學定義。
3. d_G 的判準是 bootstrap 分位數（相對比較）→ **統計結論完全不受底數影響**，
   只有報表數字的尺度差 5.3019 倍。

已在 UI Notes（zh-TW／en）明確標註這個 5.3019 倍差異與其來源。
若日後 Kevin 續了 SmartPLS 授權、且 SmartPLS 報 0.197 / 0.207，改成 log₁₀ 是單行修改
（`Math.log` → `Math.log10`，加上 fixture 重生）；此決定是**可逆的**。

### 六、工具包本身的三個缺陷（已修）

- `scripts/validation/跑抽驗腳本.bat`：假設 R 裝好即可裝套件。Kevin 本機 R 的唯一 library
  （`C:/Program Files/R/R-4.6.0/library`）不可寫且無個人套件庫 → `install.packages` 全數失敗、
  三支腳本靜默無輸出。已改為先建 `R_LIBS_USER`（`%LOCALAPPDATA%\R\win-library\<ver>`）再安裝。
- `scripts/validation/02_csem.R`：（a）模型宣告誤用 `<~`（cSEM 語法為**形成型 Mode B**），
  估的不是 Mode A，與本工具及 seminr 不可比；（b）檔案在第 97 行截斷，`testMGD` 與 `sink()`
  從未執行。兩者均已修（`=~` ＋ 補完 MGD 段）。
- `tests/run_pls_ref_only.py`：切片終點原為 json dump，會連帶執行 PLS 之後新增的
  集群／LDA／EFA／CFA 區塊——它們依賴切片外的變數與 semopy，且 CFA 段包在 try/except 內，
  缺套件時會把既有基準**覆寫成 FAILED**。已將終點收斂至集群區塊之前。

### 七、回歸驗證

`npm test` 全綠：879 過、6 記錄性跳過、零失敗。`compare.test.js` 的 adapter 確實涵蓋
`tWelch`／`dfWelch`／`pWelch` 與 `varDiff_*`／`varCi*_*`，故上述修正是真的被逐值驗證，非空過。


## 紅隊 R1 增補（2026-07-13）：cluster / lda 首次建立基準，CFA 非中央 χ² 修復

依 `docs/redteam-audit-workplan-v1.md` Session R1。基準組數 **66 → 74**，
`npm test` **716 過、6 記錄性跳過**（原 589+6；增量含 i18n 對稱性 5 條）。

### 修復 1：CFA 的 RMSEA 90% CI 完全失效（嚴重，使用者可見）

修復前 CFA 結果卡與敘述段印出 `RMSEA = 0.000, 90% CI [59.954, 59.954]`
（RMSEA 定義域為 [0, 1]）。兩個獨立缺陷疊加：

1. **`pChiSqNoncentral` 級數提前截斷**。Poisson 混合權重的眾數在 j ≈ ncp/2，
   但原本的截斷條件 `if (term < 1e-12 && inc < 1e-12) break` 以 w₀ = exp(−ncp/2)
   起算——ncp ≳ 60 時 w₀ 已 < 1e-12，迴圈在 j = 1 就中斷，級數在爬上眾數之前
   被砍掉。實測 ncp = 100 回傳 **7e-21**（正確值 ≈ 1）。
   修法：(a) 只有跑過眾數（j > λ/2）才允許截斷；(b) 權重改走 log 域，
   避免 λ/2 > 709 時 exp(−λ/2) 下溢；(c) 加極端 ncp 的飽和快捷。
2. **RMSEA CI 上下界標籤對調**。原碼 `ncpLow` 取尾機率 = 1−α 的 ncp（那其實是
   上界）、`ncpHigh` 取 α（那是下界）。修好級數後此缺陷才會浮現。

修復後對照 `scipy.stats.ncx2`：尾機率在 ncp ∈ [0, 2000] 全域對到 **1e-10**；
fixture 的 RMSEA 90% CI 由 [59.954, 59.954] 修正為 **[0.000, 0.141248]**（scipy 同值）。

連帶影響：同一函式支撐 close-fit p 檢定。本 fixture 的 ncp_close = 1.18 未觸發缺陷，
但大模型（如 df = 50、N = 500 → ncp_close ≈ 62）修復前會塌成 0 → **誤報 close fit 被拒**。

回歸防線：新增 `cfa_noncentral_chi2`（8 個格點，刻意涵蓋 ncp ≳ 100）與
`cfa_rmsea_ci`（4 組 (χ², df, N)，含上下界與 close-fit p）兩組基準。

### 修復 2：LDA 的「標準化係數」其實是未標準化係數（解釋層錯誤）

`standardizedCoefficients` 回傳的是縮放使 wᵀ S_p w = 1 的向量——那是 SPSS 的
**未標準化**典型判別函數係數，保留原始單位。SPSS 的標準化係數 = 未標準化 ×
該預測變項的組內合併 SD。

fixture（group3 ~ x1+x2+x3，函數 1）：

| | x1 | x2 | x3 |
|---|---|---|---|
| 修復前（誤標為標準化） | −0.091 | 0.100 | 0.047 |
| 正確的標準化係數 | −0.724 | 0.754 | 0.718 |

標準化係數存在的唯一目的就是讓預測變項的相對重要性可比較。修復前的值讓使用者
讀成「x3 幾乎不重要」，實際三者貢獻相當——**這是解釋層的實質錯誤，不只是命名**。

同時修正 `structureCoefficients`：原用全樣本 Pearson 相關，SPSS / R `MASS::lda`
用**組內合併**（pooled within-group）相關。本 fixture 組間分離弱（最大特徵值僅 .054），
差異約 1%（.7417 → .7330）；組間分離強時差異會放大。全樣本版另存為
`structureCoefficientsTotal` 供對照。

連帶修正：判別分數的投影向量。修復前 `scores` 用被重新定義的 wStd 計算，
會把 structure matrix 與 group centroids 一起算錯——已改回未標準化係數。

**API 變更**：`functions[i]` 新增 `unstandardizedCoefficients` 與
`structureCoefficientsTotal`；`standardizedCoefficients` 與 `structureCoefficients`
的**數值語意改變**（UI 欄位不變，i18n 說明文字同步更新）。

### 修復 3：k-means 手肘圖與報表 WSS 自相矛盾

`computeElbow` 寫死 `restarts: opts.elbowRestarts ?? 5`，主分析用 10 次 →
elbow 落在較差的區域最佳解。fixture（x1,x2,x3、k=3）：手肘圖顯示 87.156，
同一張報表的 WSS 欄位寫 85.730。修法：elbow 的重啟次數改為繼承主分析（預設 10）。
修復後 k = 3 兩處皆為 **85.729849**。

### 新建基準（cluster / lda 過去從未被交叉驗證）

| 基準 | 對照 | 最大相對誤差 |
|---|---|---|
| `cluster_kmeans_k3` | sklearn KMeans(k-means++, n_init=50) | 7.1e-11 |
| `cluster_ward_k3`（含 k=2..10 elbow） | sklearn AgglomerativeClustering(ward) | 1.2e-10 |
| `lda_group3` | scipy.linalg.eigh(B, W) 廣義特徵分解 | 1.5e-11 |
| `cfa_2factor_loadings` | semopy(ML) 標準化解 | 1.5e-4（ML 收斂細節） |
| `cfa_noncentral_chi2` | scipy.stats.ncx2.sf | 1.4e-10 |
| `cfa_rmsea_ci` | scipy ncx2 + brentq | 3.7e-9 |
| `efa_pca_none` | factor_analyzer(principal, 未轉軸) | 7.3e-9 |
| `efa_pca_varimax_k3` | factor_analyzer(principal, varimax, 3 因子) | 4.0e-5 |

比對用的正規化（消除與統計內容無關的任意性，兩側同規則）：
- 分群標籤依「首次出現順序」重新編號 → 分割相同即陣列逐值相等（ARI = 1.0）
- 判別函數符號使「函數內絕對值最大的未標準化係數為正」
- 負荷矩陣每欄符號使 |最大| 元素為正、欄序依平方和遞減

### 基準本身的缺陷：EFA varimax 容差（反向發現）

`efa_pca_varimax` 的轉軸後負荷原本與 `factor_analyzer` 差 1.75e-3，
`compare.test.js` 因此把容差放寬到 **5e-3**。查證後結論反轉——

```
varimax 準則值（越大越優）        JS = 2.4540420909
                    factor_analyzer = 2.4540048152
嚴格收斂 SVD varimax（tol=1e-12） = 2.4540420909   ← 與 JS 一致（差 5.3e-7）
```

**是 factor_analyzer 的預設容差沒收斂完全，不是 JS 錯。** 基準改用
`rotation_kwargs={'tol': 1e-12, 'max_iter': 1000}` 重生後，兩者最大相對誤差
降至 **2.7e-7**，容差得以從 5e-3 收回預設 **1e-6**——放寬的容差本身就是防線的破口。

### 模組邊界（記載，非缺陷）

- **EFA 只支援 PCA 萃取（principal）＋ varimax | none**。工作計畫原訂的
  「promax 斜交、ML 萃取」模組尚未實作 → 無法建立基準。第二、三組設定改以
  `efa_pca_none`（未轉軸全矩陣）與 `efa_pca_varimax_k3`（3 因子）補齊。
- **CFA 適配指標的 χ² 慣例差異**（JS 用 (N−1)·F、semopy 用 N·F）維持既有 skip；
  但參數估計不受影響，故 loadings 與因子相關可逐值比對——這正是本次補上的防線
  （修復前 `cfa_2factor` 的 chi2/cfi/tli/rmsea 全部 skip，實質上只驗了 df）。

### i18n 對稱性防線（新增 `tests/i18n.test.js`）

zh-TW 與 en 扁平化後各 **2,202** 個 key，實測完全對稱（key 集合、placeholder
集合、型別、空字串四項全綠）。此測試把「缺譯只在使用者切英文時才被發現」轉為
CI 可攔截的回歸。

### 修復 4：k-means 用的是原始 k-means++，不是 sklearn 的 greedy 版

k ≥ 4 時 JS 的解系統性劣於 sklearn 同等重啟數（k=7 的手肘點 49.10，全域最佳約 44.1）。

**先排除的錯誤假設**：一度懷疑 `runLloyd` 的空群修復邏輯（兩個空群會取到同一點
造成質心重合）。實測 fixture 上 k = 3/4/7/8 的 100 次重啟中，**空群事件為 0、
最終重複質心為 0** → 假設不成立。

**真正的根因**：`kmeansPPSeed` 實作的是原始 k-means++（每顆種子依 D² 加權**抽一個**
候選）；scikit-learn 的 `init='k-means++'` 預設是 **greedy 變體**——每顆種子抽
`2 + ⌊ln k⌋` 個候選，取「加入後全樣本 potential 最小」者（Arthur & Vassilvitskii
2007 §3.1）。單抽版的種子品質較差，Lloyd 收斂到較差的區域最佳解。

改為 greedy 後（30 個基礎種子的中位數 WSS，10 次重啟）：

| k | 原始單抽 | greedy | sklearn n_init=10 |
|---|---|---|---|
| 7 | 45.60 | 45.35 | 45.45 |
| 8 | 40.94 | 39.77 | 39.78 |
| 10 | 33.16 | 32.06 | 32.03 |

**greedy 版與 sklearn 同級（差異落在雜訊內）**，原始單抽版則全面落後。

同時把重啟次數預設由 10 提高到 **25**：greedy + 10 次仍會撞到不利種子
（fixture k=8 落在 41.73，25 次為 40.07），在手肘圖上造成假轉折。
25 次後各 k 的解達到或優於 sklearn `n_init=25`。成本：n=60 的完整
`clusterAnalysis`（含 k=2..10 elbow）約 4 ms → 10 ms，與 n 呈線性；
需要更快時可由 `opts.restarts` / `opts.elbowRestarts` 覆寫。

修復後的手肘曲線（fixture、x1,x2,x3）：114.21 / 85.73 / 70.71 / 59.39 / 52.01 /
44.46 / 40.07 / 34.40 / 31.46——單調且無假轉折，k=3 與報表 WSS 一致。

基準不受影響：`cluster_kmeans_k3` 在 k=3 時所有設定都收斂到同一組全域最佳解
（85.729849），修復前後皆對到 sklearn 的 1e-11。

### 未處理（已知）

- **CFA 的 CFI 截斷於 1、TLI 不截斷**（本 fixture TLI = 1.0223），截斷慣例不一致。

## 紅隊 R2–R5 增補（2026-07-13）：可用性、無障礙、結構清理、UI 測試

依 `docs/redteam-audit-workplan-v1.md` Session R2–R5，同日接續 R1 完成。

**驗收數字**：`npm test` **874 過、6 記錄性跳過**（R1 結束時為 743）；
`eslint .` **0 problems**（原 61）；`vite build` 綠。

### R5 最重要的發現：ANCOVA 在 UI 上從來沒有運作過

新增的全模組 UI 煙霧測試第一次執行就攔到：**ANCOVA 的 Result 面板必定在 render 期
崩潰**。根因是欄位撞名——

`src/lib/stats/ancova.js` 的回傳物件裡有一個叫 `error` 的**合法統計欄位**
（變異數分析表的誤差項 `{ ss, df, ms }`），但全 app 的慣例是
「`result.error` 為真 ＝ 計算失敗」。於是包裝層：

```js
const out = ancovaCore(rows, yVar, factorVar, covariateVars)
if (out.error) return { error: out.error, meta: out.meta }   // ← 誤差項物件恆為 truthy
return { ...out, yVar, factorVar, covariateVars }             // ← 永遠執行不到
```

計算**成功**時 `out.error` 就是 `{ ss: 3446.09, df: 43, ms: 80.14 }`，
包裝層照樣走進失敗分支。Result.jsx 接著 `t.ancova.errors[result.error] || result.error`
→ 查表用物件當 key 得到 undefined → 把物件本身當成 React child 渲染 →
`Objects are not valid as a React child` → 整個面板卸載 → 白畫面。

**743 條統計測試抓不到它**，因為它們直接測 `lib/stats/ancova.js`，那一層的
`error` 欄位語意正確、數字也對到 Python 基準。錯的是「統計層的欄位命名」與
「應用層的錯誤慣例」之間的介面。這正是紅隊審查第 2 號發現（零 UI 測試）的代價。

**`twoWayAnova` 有完全相同的撞名**（`error: { ss, df, ms }`）。它逃過煙霧測試是因為
**內建的四個資料集裡沒有任何一個同時具備兩個類別因子 ＋ 一個連續依變項**，所以它
沒有示範設定、不在 `ANALYSIS_DEMOS` 裡。使用者只要上傳自己的兩因子資料就會撞上。

**修法**：統計核心的誤差項欄位改名 `error` → `errorTerm`（ancova.js、twoWayAnova.js
及其 Result / Narrative / adapters 消費端）。`error` 一律保留給字串錯誤碼。
**基準值不受影響**（`reference.json` 的 ancova 只驗 factor / covariate 的 F、p、SS）。

回歸防線：`tests/ui.smoke.test.jsx` 新增「所有 lib/stats 模組都不得有 `error: { ... }`
物件欄位」的結構檢查，以及 twoWayAnova 的合成兩因子資料專屬測試。

### R2：可用性（穩健性）

- **ErrorBoundary**（`src/components/ErrorBoundary.jsx`）：包住 Config / Result /
  Narrative / Notes 四個面板。修復前任一分析在 render 期炸掉 ＝ 整棵 React 樹卸載
  ＝ 白畫面 ＋ 已載入的資料與設定全失。現在爆炸半徑限制在該欄，其他欄仍可操作，
  切換分析自動復原（`resetKey`）。
  ⚠ 錯誤邊界只攔 render/lifecycle 期例外；事件處理器與非同步流程（PDF 匯出、
  Worker 回呼）必須自行 try/catch。
- **共用 `<Modal>`**（`src/components/Modal.jsx`）：修復前全 codebase `aria-modal`
  出現 **0 次**、無 focus trap——鍵盤使用者按 Tab 會直接跑出對話框、落到被遮住的
  頁面上。現在具備 `role="dialog"` ＋ `aria-modal` ＋ `aria-labelledby` ＋ focus trap
  ＋ Esc 關閉 ＋ **focus 還回**開啟前的元素 ＋ 背景捲動鎖定。
  TransformDialog / HistoryDialog 改接。
- **`alert()` / `confirm()` 全數移除**：改走 `<Toast>`（role="alert"／"status"，
  不搶焦點、不阻塞主執行緒）與 `<ConfirmDialog>`（可 i18n、可鍵盤操作）。
  原生 `alert()` 的致命問題是使用者可勾選「不再顯示此類對話框」——之後所有匯出
  失敗都會無聲消失。

### R3：無障礙與鍵盤

- **`.focus-ring` utility**（`src/index.css`）：修復前有 **42 處 `focus:outline-none`**
  而 `focus-visible` 只有 1 處——瀏覽器預設焦點外框被拔掉，只剩 1px 邊框換色當替代，
  在暖色底上對比不足。41 處統一改用 `.focus-ring`（`:focus-visible` 才顯示，
  滑鼠點擊不會留醜框）。唯一例外是 Modal 的面板容器（`tabIndex={-1}`，非可操作元素）。
- **30 個 `<select>` 全數補上 `aria-label`**：修復前 `<label>` 與 `<select>` **沒有
  `htmlFor`/`id` 關聯**，螢幕報讀只會念「下拉選單」，不會念出它是哪個變數。
- **coming-soon 項目**：`<div>` → `<button disabled aria-disabled>`，輔具會明確播報
  停用狀態（原本只念項目名稱，使用者以為可以點）。
- **`hoverOnlyWhenSupported`**（tailwind.config.js 一行）：175 處 `hover:` 全部編成
  `@media (hover: hover)`。觸控裝置沒有真 hover，瀏覽器會把 `:hover` 狀態「黏」在
  tap 過的元素上，看起來像被選取。
- **手機偵測改用 matchMedia ＋ listener**：原本只在初次 mount 讀一次
  `window.innerWidth`，旋轉螢幕／縮放視窗都不會重算。同時加上「使用者手動切換過
  側欄後就不再被斷點覆寫」的意圖尊重。
- **硬編碼英文 aria-label 歸零**（menu / tools / IPMA 改走 i18n）。
- 回歸防線：`tests/a11y.guard.test.js`（禁止裸 `focus:outline-none`、`<select>` 必須
  有 aria-label、禁止 `alert()`/`confirm()`）。

### R4：結構清理

- **eslint 61 → 0**。其中 **4 個 `react-hooks/immutability` 是真缺陷**，不是風格問題：
  - `ttest/Result.jsx`：`labelMap.__depLabel = ...`——`labelMap` 在 `dataset.labels`
    存在時**就是資料集的 label 物件本身**，那行等於把 `__depLabel` 永久寫進資料集，
    切換分析／語言後不會被清掉。改為複製後再加欄位。
  - `twoWayAnova/Result.jsx`：在 `useMemo` 之外就地寫入 `result.factorA = ...`——
    修改 memo 快取住的物件，且 error 分支會提前 return，導致 result 有時帶欄位、
    有時沒有。改為在 memo 內組出新物件。
- **`AppContext.jsx` 拆分**：context ＋ hooks 留原檔、Provider 移到 `AppProvider.jsx`。
  原本三者混在一起觸發 `react-refresh/only-export-components`——Fast Refresh 失效，
  每次改動都整頁重載、已載入的資料全丟。全 codebase 既有的
  `import { useApp } from '../context/AppContext'` 完全不受影響。
- **`TransformDialog` 重構**：從「永遠掛載 ＋ 兩個 useEffect 重設 state」改為
  「開才掛載」，兩個 `set-state-in-effect` 直接消失。name 欄位改為
  「自動建議值 ＋ 使用者覆寫」的 render 期調整模式。行為以 6 條測試釘死。
- **共用元件抽取**：`Heading`（24 份**位元完全相同**的複製 → 1 份）、
  `VarSelect`（11 份 → 1 份）。
  ⚠ VarSelect 原本的「5 種版本」其實只有 **2 種真實外觀差異**
  （`rounded-md`＋cocoa 邊框 vs `rounded-lg`＋cream/amber 邊框），其餘是排版差異。
  **這兩種外觀的分歧是設計系統本身的不一致**（設計稿的 `.select` 用
  `--line: #e8dcc9`、`border-radius: 10px`，兩者都對不上）。統一成哪一種是設計決策
  → 本次**兩種都保留**（`variant` prop），確保「UI 目視無回歸」；
  拍板後只要改 `VarSelect.jsx` 的 DEFAULT 一行即可全站統一。
- **`reference/statlite.jsx` 不刪，改為 eslint 排除**（Kevin 2026-07-13 裁決）：
  它是專案最初的單檔原型，三個統計檔的檔頭註解以它為出處。加檔頭警語 ＋
  `globalIgnores(['dist', 'reference'])`。
- **`clipboard.js` 的 nbsp regex**：`no-irregular-whitespace` 抱怨的那個字面 nbsp
  **是寫在 regex 裡當比對目標的**，不是誤植空白。清理時一度把它換成普通空格
  （等於讓 regex 去比對普通空格），已改回 ` ` 跳脫寫法並加註警告。
- **CI 補上把關**：`deploy.yml` 原本只跑 build——統計核心改壞、eslint 破表都能一路
  部署上線。現在 lint ＋ 全測試 ＋ build 三關，任一失敗即擋下。
- index.html 補 OG / Twitter meta ＋ theme-color ＋ canonical；產出 1200×630 的
  `public/og-image.jpg`（原 `duoduo.jpg` 在 repo 根目錄、不會進 dist，OG 圖會 404）。

### R5：UI 測試

- **`tests/ui.smoke.test.jsx`**：對 25 個有示範設定的分析各跑 5 條
  （Result / Narrative / Notes / Config / 英文介面），共 **128 條**。
  斷言「沒落進 ErrorBoundary」＋「Result 有實際內容」。
- **`tests/errorCodes.test.js`**：掃出統計核心會回傳的 **91 個需 i18n 的字串錯誤碼**
  （PLS-SEM 的 37 個一律自帶中文 `message`，不需查表，已排除），逐一確認中英都查得到。
  攔到 **16 個缺漏**（`no-data`、`y-not-binary`、`singular-reduced-model` 等低階防呆碼）
  → 補上 `t.errors.stats.*` 共用命名空間，並在 44 處錯誤查表加上 fallback。
  修復前這些碼觸發時，畫面會直接印出裸的英文代碼。
- Modal（7 條）、Toast（5 條）、ErrorBoundary（5 條）、TransformDialog（6 條）行為測試。

### R2–R5 收尾（2026-07-13，Kevin 裁決後）

**VarSelect 兩種外觀已統一。** 以設計稿 `mockup-d-final-hybrid.html` 的 `.select` 為準：

| 設計稿 | 判定 | 採用 |
|---|---|---|
| `--line: #e8dcc9` | duo-cocoa-100 (#ebd9c4) RGB 距離 **6.6**；duo-cream-200 (#f4ddb2) 是 **26.0** | `border-duo-cocoa-100` |
| `border-radius: 10px` | Tailwind 無 10px；`rounded-lg` (8px) 比 `rounded-md` (6px) 接近 | `rounded-lg` |
| hover 未規範 | amber 是全站互動強調色（focus ring 亦為 amber），hover 與 focus 同色系才一致 | `hover:border-duo-amber-300` |

`VarSelect.jsx` 的 `variant` prop 移除；另有 24 處非 VarSelect 的 inline `<select>`
一併收斂到同一組合。全站欄位樣式現為單一來源，要改只需動 `VarSelect.jsx` 的 `BOX` 常數。

**新增 `factorial` 示範資料集**（`src/data/factorial.js`，90 筆，2 × 3 完全交叉）。

補的是一個結構性缺口：原本內建的四個資料集**沒有任何一個同時具備兩個類別因子 ＋
一個連續依變項**，因此 `two-way-anova` 沒有示範設定、不在 `ANALYSIS_DEMOS` 裡，
也就逃過了全模組 UI 煙霧測試——而它其實藏著與 ANCOVA 完全相同的 `error` 欄位撞名
（白畫面等級）。

設計（三個效果都刻意做成可偵測，讓雙因子 ANOVA 的教學重點看得到）：

| 效果 | F | p | ηp² |
|---|---|---|---|
| 主效果 A（teaching_mode：線上／實體） | 15.39 | 1.8e-4 | .158 |
| 主效果 B（feedback_type：無／書面／口頭） | 17.28 | 5.5e-7 | .296 |
| **交互作用 A×B** | 5.39 | 6.3e-3 | .116 |

交互作用的實質意義（格平均）：口頭回饋只在實體課有大幅加成（80.1）、線上課幾乎沒有
（68.3）——這正是「交互作用」要教的東西。另含 `pretest` 連續共變項（與 posttest
r ≈ .5）供 ANCOVA 示範，以及 2 筆遺漏值示範 listwise deletion。

已註冊進 `src/data/index.js`、`src/config/analyses.js`（DEMO_DATASETS）、
`src/config/demos.js`（two-way-anova 示範設定）、中英 i18n、`scripts/export-csv.mjs`
（產出 `public/factorial.csv` 供使用者下載、用 SPSS/JASP/R 交叉驗證）。

**煙霧測試涵蓋率**：25 → **26 個分析**（128 → 133 條）。twoWayAnova 不再是漏網之魚。

**最終驗收**：`npm test` **879 過、6 記錄性跳過**；`eslint .` **0 problems**；`vite build` 綠。

### 未處理（已知）

- **CFA 的 CFI 截斷於 1、TLI 不截斷**（本 fixture TLI = 1.0223），截斷慣例不一致。
- **PLS-SEM 引擎的錯誤訊息是硬編碼中文**：英文介面下會看到中文引擎訊息。
  37 個 message 需要翻譯，屬獨立工作項。
- **`twoWayAnova` 沒有示範資料集**：內建四個資料集都缺「兩個類別因子 ＋ 連續依變項」
  的組合，使用者只能自行上傳。補一個 factorial 示範資料集可讓它進入煙霧測試的
  `describe.each` 涵蓋範圍。

## 如何重跑

```bash
python3 tests/run_nca_ref_only.py       # 只重生 NCA 基準（沙盒可跑，不需 R/semopy）
python3 tests/run_cta_ref_only.py       # 只重生 CTA-PLS 基準（沙盒可跑；會校驗 datasets.json 既有鍵零漂移）
npm test                                # 回歸比對（不需 Python）
python3 tests/generate_reference.py     # 重生基準值（改測試資料時才需要）
node tests/probe.mjs                    # 除錯：逐欄位列出實際 vs 基準與相對差
```

## 給後續階段的提示

- Phase 2 UI 重構期間，任何觸碰 `src/lib/stats/` 的改動都必須過 `npm test`
- Phase 3 PLS-SEM 開發時，把 `seminr` 基準值加進同一套管線（`generate_reference.py` 加區塊即可）
- 測試資料集刻意設計為平衡 2×3 交叉；曾發現不平衡空格設計會讓 twoWayANOVA 正確回報
  singular-matrix，錯誤訊息可更友善（→ backlog P3：偵測空格提示「交叉格有空格」）
## 公式溯源審計 Session Q1（2026-07-13，Fable 5）：批次 1 銷帳＋盤點覆核

依 `roadmap-v2.md` §1／`formula-provenance.md`。棘輪 `MAX_PENDING` 15 → **11**。
本節只記結果與證據；規範層說明見 formula-provenance §6。

### 一、銷帳（6 組）

| 組 | 路線 | 證據 |
|---|---|---|
| `pls_gof` | 沙盒 plspm | `goodness_of_fit()` 0.2577074252 vs fixture 0.2577074227（差 2.6e-9，迭代容差內）；單指標排除慣例一致；**已加重生時 assert <1e-6** |
| `pls_itcriteria` | seminr 原始碼＋本機 R＋statsmodels | `AIC_func`/`BIC_func` 與 fixture 同式（pk+1 計數）；本機 seminr `it_criteria` 印出與 fixture 全同；statsmodels llf 式恆等（差高斯常數 n(ln2π+1)，≤2e-14）——**已加重生時 assert**；引用錯置已修（2019 JAIS 作者組合 ≠ 2021 Dec. Sci.） |
| `pls_q2` | 程序文獻（在世第三方不存在） | SmartPLS 4 官方已移除 blindfolding；seminr 拒做（issue #156）；matrixpls/semPLS 下架。對照 SmartPLS 官方程序文件四要點（輪數=D、序列省略樣式、缺失均值補、n/D 非整數）逐項一致 |
| `pls_predict` Q²predict | SmartPLS 官方文件 | naive＝訓練樣本平均、Q²predict＝1−SSE/SSE_naive，與實作一致；本機 cSEM `predict()` 量級佐證（i4 0.0966 vs 0.102 等，方向全同） |
| `pls_formative` | seminr mode_B（本機 R） | weights/loadings/path/R²/VIF 顯示位數內全同（0.921/0.114/0.131；0.986/0.645/0.143；0.700；0.491；1.482/1.486/1.003） |
| `pls_ipma` | cSEM doIPMA（本機 R，原始碼 dump） | 逐式等價（w̃=w_unstd/Σ，cSEM 文件 "length of 1" 為措辭不精確）；cSEM `W_used` 與 fixture w̃ 逐值同（含 C 塊 0.250203）；numpy 複算 cSEM 全輸出逐位重現；fixture 慣例複算 perf 至 1e-7。**灰區**：塊內量尺不一時 0–100 先後順序分岔（perf_C 54.54 vs 55.97）——官方教程列為未滿足假設，UI 警告入 P1 |

### 二、盤點覆核（81 筆申報 vs 實碼）

45 組 tier A 乾淨；`pls_hoc_repeated`／`pls_mediation`／`cfa_rmsea_ci` 維持 A 加註；
`pls_hoc_disjoint`／`pls_mga_formulas`／`nca_cr_fdh`／`nca_bottleneck` 改列 B verified
（一次性抽驗 ≠ 重生時第三方產生）；`lda_group3` 申報不實改列**待審計**——
authority「scipy」只是特徵分解原語，SPSS 慣例縮放（wᵀSpw=1、×pooled SD、structure、
Bartlett χ²、分類）從未對過完整第三方，且 R1 已在此抓過實質錯誤。

### 三、lda_group3（2026-07-14 全項銷帳）

本機 MASS::lda 已逐值吻合：未標準化係數（LD1 −0.090887/0.099743/0.046781）、
標準化係數（−0.723571/0.754252/0.717626）、pooled SD（7.9612/7.5620/15.3400）、
特徵值換算（svd² = λ·(N−g)/(g−1)，proportion of trace 0.895133/0.104867 同）；
LD2 整體翻號＝特徵向量符號任意性。2026-07-14（v4/v5）補齊其餘四項，全數一致：
組重心（fn1 0.239776／−0.302967／0.063191）、structure matrix（fn1 −0.274692／0.364920／
0.732972）、manova Wilks Λ=0.94302、再代入分類表（對角 8/10/7、accuracy 0.416667）。
Λ₂ 與 Bartlett χ² 由已驗特徵值之封閉式推得。`lda_group3` → verified，棘輪降至 **10**，
Session Q1 結案。

**工具鏈陷阱（記錄在案）**：`library(cSEM)` 會遮蔽 `stats::predict`——對 lda 物件呼叫
`predict()` 直接進 cSEM 內部碼（錯誤出在 `abs(x2$Loading_estimates)`），且其簽章無
newdata。v1–v3 的 LDA 段失敗皆源於此（v1 的 round 診斷、v2 的同步診斷均為誤判）。
規則：R 抽驗腳本凡與 cSEM 同場，泛型一律顯式命名空間（`stats::predict`）。

### 四、回歸驗證

`npm test` 全綠：976 過、6 記錄性跳過（provenance 7、compare 792、pls+nca 166、
a11y/errorCodes/i18n 11）。reference.json 全量重生零數值漂移（僅 pls_gof／pls_itcriteria
兩條 source 字串更新），兩道新 assert 於重生時通過。

## 公式溯源審計 Session Q2（2026-07-14 起，Fable 5）：批次 2——回論文記方程式編號

依 `roadmap-v2.md` §1／`formula-provenance.md` §4 批次 2 表。六組無主流第三方實作，
逐組回原始論文記方程式編號寫入 provenance 的 `authority`；無法第三方驗證者，
`verification` 寫明替代交叉驗證方式。棘輪 `MAX_PENDING` 10 → 目標 **4**
（原工單「降至 3」為算術誤植：批次 2 恰 6 組，10 − 6 = 4；批次 3 實為 4 組 → 0）。
付費牆論文（MISQ／Mktg Sci／SBR／JBR／Sociological Methodology）由 Kevin 以機構訂閱
提供 PDF；可得 OA 全文者先行銷帳。

### 一、銷帳

| 組 | 路線 | 證據 |
|---|---|---|
| `pls_cipma` | Hauff et al. (2024) OA 全文（researchonline.jcu.edu.au/87274，出版社版式）逐項口徑核對 | 全文無編號方程式 → authority 記節號＋原式：§3 d=C/S、必要性判準 d≥.1 且 p<.05＋理論支持；§4.3 IPMA 0–100 重標定分數為 NCA 輸入；§4.4 實證 scope、僅直接前置構念、CE-FDH bottleneck（實際值／百分位雙格式）；§4.5 目標水準讀未達案例 %（Fig. 4 即 Y=80）。fixture 六項口徑逐項一致；NCA 計算核心逐式重用已驗 nca_*（R NCA 5.0.2）；permutation p 同式 #{d_perm≥d_obs}/199。→ verified，棘輪 **9** |
| `pls_copula` | Park & Gupta (2012) 原文 PDF＋Hult et al. (2018) accepted MS | P&G Eq. (6) 定義 Gaussian copula 與 P* = Φ⁻¹(U_P)、U_P = H(P_t)；Eq. (10) 為加項迴歸並明言「Given P* as an additional regressor … least squares」「similar to the control function」；**p. 572 註 3 明文授權以 ECDF 取代核密度數值積分**（「provides comparable results」）；bootstrap SE 的理由為 generated-regressor 使資訊矩陣 SE 失效；非常態識別條件（P 為常態時 P* 是 P 的線性變換，α 與 σ_ξρ 不可分別識別）＝本工具 KS 前置把關的依據。Hult Eq. (5)/(6) 與四個結構方程寫法一致、2^k−1 全組合同。並列取最大秩與 H=1 夾 1−1e−7 不出自論文，出自 Hult 公開碼 CRP_copula_code.r（2026-07-25 覆查仍在線）。→ verified，棘輪 **8** |
| `pls_cta` | Gudergan et al. (2008) 原文 PDF | Eq. (1) tetrad 定義、Eq. (2) bias-corrected CI、Step 1–5、Bonferroni α′=α/n 施加於單一測量模型內——與本工具的區塊內 Bonferroni 一致。**發現並修正一處偏離**（見下「一之二」）。選取集代數指向 Bollen & Ting (1993)，該文未取得 → 本工具構造以 Jacobian 秩 assert 保證極大獨立，限制已入 provenance note。→ verified，棘輪 **7** |
| `pls_pos` | Becker et al. (2013) 原文 PDF | 正文無編號方程式（完整演算法在線上 Appendix B，未取得）；p. 676 原句錨定目標準則與三項區辨特徵。**發現並修正一處實質偏離**（見下「一之二」）。本工具定位為結構模型層簡化版，三處範圍限制已在 UI Notes／i18n／generate_reference.py／provenance note 四處揭露。→ verified，棘輪 **6** |

### 一之二、本輪抓到的兩處公式偏離（審計的實質產出）

溯源審計的目的不是補文件，是抓「兩邊編碼同一個猜測」抓不到的公式誤讀。本輪抓到兩個：

**(1) `pls_cta` 的 CI 臨界值用錯分布家族。** 原實作半寬為 Student t（df = B−1）；
Gudergan et al. (2008) Eq. (2) 為 τ̂ − b_B ± v_B^{1/2}·**z**_{1−α/2}，用常態分位數。
t 取 df = B−1 亦無理論依據——B 是 bootstrap 重抽次數，不是樣本數，自由度不該隨 B 走。
已改為 z_{1−α/(2T)}，欄位 `tCrit` → `zCrit`。影響：B=300、T=5 時 CI 縮 0.64%（原為偏保守）；
R 塊仍判 reflective、M 塊仍判 formative，**判讀結論不變**。

**(2) `pls_pos` 的目標函數用錯。** 原實作為「各段 SSE 之和，最小化」；
Becker et al. (2013) p. 676 為「各段各內生構念的 R² 之和，最大化」
（原句：maximize the sum of the endogenous latent variables' explained variance (R²) across all groups）。
兩者**不等價**——SST 隨段別組成改變，不是差一個常數。實測於 fixture 資料：
分割由 125/175 變為 195/105，段別還原率由 0.8367 升至 **0.8567**（真值為兩段 β = ±0.80）。
已改 `pls.js` 與 `generate_reference.py`，`objective` 改為 ΣR²、另加 `sseTotal` 欄位保留預測誤差可讀性；
UI 的「不能用 POS 選段數」警告方向由「必然下降」改為「必然上升」（結論不變：無懲罰項）。
**交叉驗證**：改碼前先以獨立 numpy 原型（不共用本工具程式碼）求解 ΣR² 目標，得 195/105、
ΣR² = 1.5765、還原率 0.8567；重生後 fixture 為 195/105、`objective_K2` = 1.57649436、
`recovery_K2` = 0.856667——獨立重現。

**同時記錄的範圍限制（`pls_pos`，非缺陷但必須誠實揭露）**：本工具實作的是 Becker 原法的
**結構模型層簡化版**——(a) LV 分數取自全樣本 PLS 權重、不做段別測量模型權重重估（這正是原文
批評 FIMIX-PLS 的第 2 項限制、也是原文的區辨特徵之一，故偵測不到僅存在於測量模型層的異質性）；
(b) 未實作原文的距離量測，改為逐案窮舉評估目標改善（距離量測是原文用來挑候選的啟發式）；
(c) 段別大小下限為本工具的數值穩定性約束，原文無此設定且強調能找出極小利基段。
Appendix B 取得後應覆核目標函數是否另含加權或修正。

### 二、回歸驗證與沙盒限制

`reference.json` 全量重生（11.1 秒）：**僅 `pls_cta`、`pls_pos` 兩組變動**，其餘 79 組零漂移
（含重生時的兩道第三方 assert：plspm gof、statsmodels 恆等式）。變動明細——
`pls_cta`：`*_tCrit` → `*_zCrit`、各 tetrad 的 `ciLower`／`ciUpper`（判讀欄位 verdict／
nNonVanishing 不變）；`pls_pos`：`objective_*` 改為 ΣR² 口徑、新增 `sseTotal_*` 三鍵、
段別解與 recovery 依新分割更新。

沙盒可跑的測試**全綠：979 過、6 記錄性跳過**
（compare 795＋6 skipped、provenance 7、pls 150、nca 16、a11y/errorCodes/i18n 11）。
較 Q1 的 976 多 3 筆＝`pls_pos` 新增的三個 `sseTotal_*` 比對鍵。

**本機補跑（2026-07-25，Kevin 執行）**：五個 `ui.*.test.jsx` 全數通過——
ui.smoke 133、ui.modal 8、ui.transformDialog 6、ui.errorBoundary 5、ui.toast 5。
**完整套件合計 1136 過、6 記錄性跳過、零失敗。**

★ **沙盒限制（記錄在案）**：五個 `ui.*.test.jsx` 用 jsdom 環境，在本沙盒**卡在環境初始化**、
無法完成——以一個只斷言 `typeof document` 的最小探針檔驗證過，同樣卡住，
故確認為環境層問題，與本次改動無關。Session Q1 的「976 過」同樣未含 UI 測試
（7＋792＋166＋11 = 976，恰為非 jsdom 檔）。已補 `跑UI測試.bat`／`只跑UI煙霧測試.bat`
（雙擊執行，被 .gitignore 擋、不進 repo），供本機補驗。

**兩則本機執行的操作教訓（給後續 session）**：
1. **cmd 沒有 `tee`**。用 `> 檔名` 導向會讓黑視窗全程空白，Kevin 無從判斷是跑完還是卡住。
   要即時顯示又要存檔，走 `powershell -NoProfile -Command "... | Tee-Object -FilePath '...'"`。
2. **Tee-Object 預設寫 UTF-16LE**。回傳的 log 在 Linux 端看起來像「每個字元中間有空格」的亂碼，
   需 `iconv -f UTF-16LE` 才讀得到。下次在 Tee-Object 後加 `-Encoding UTF8`。
3. `ui.smoke` **並不慢**（本機 4.11 秒、133 項）。先前整套跑的 log 缺 ui.smoke 與總結區塊，
   是 log 在 vitest 收尾前被取走，**不是**效能或掛起問題——不要再據此推論它是瓶頸。

## 公式溯源審計 Session Q3（2026-07-25，Opus 5）：批次 3 補登記與補驗

依 `roadmap-v2.md` §1／`formula-provenance.md` §4 批次 3。四組全數 verified，
棘輪 `MAX_PENDING` 6 → **2**（剩下的 2 組是 Q2 卡文獻者，非本批）。
本批的定位是「機制已在 W6 詳記、補上權威來源與可執行的交叉驗證」，
但實際做下來有一組升級成第三方對照、三組抓到引用或口徑需要補正的地方。

### 一、銷帳（4 組）

| 組 | 路線 | 證據 |
|---|---|---|
| `pls_pairwise_wpls` | **沙盒第三方（本批最強）** | pairwise-complete 相關 vs `pandas.DataFrame.corr()`（pandas 預設即 pairwise-complete）最大差 **3.886e-16**；加權相關 vs `statsmodels DescrStatsW(ddof=0).corrcoef` **4.441e-16**、vs `numpy.cov(aweights, ddof=0)` **2.220e-16**。三道**已寫入 `generate_reference.py` 成為重生時 assert**（容差 1e-12）——與 Q1 的 `pls_gof`／`pls_itcriteria` 同級的結構性防護，不是一次性抽驗。另實測確認 ddof 取 0 或 1 得到同一個相關矩陣（差 <1e-15，因相關為尺度不變量），排除了慣例分歧風險 |
| `pls_hoc_embedded` | 權威文獻逐點＋第一階段第三方錨 | Becker, Cheah, Gholamzade, Ringle & Sarstedt (2023), IJCHM 35(1) accepted MS pp. 15-16（OA: ueaeprints 171785）逐點核對四項口徑：第一階段＝repeated indicators 識別 HOC ✓、第二階段 HOC 指標＝第一階段 LOC 分數 ✓、**全部非階層構念改以第一階段分數為單指標** ✓、反映型 HOC 用 Mode A ＋ path scheme ✓。第一階段即 `pls_hoc_repeated`，該組已有對 plspm 的重生時 assert <1e-6 → embedded 的輸入分數是第三方錨定的 |
| `pls_quadratic` | 官方文件逐點＋實作層查核 | SmartPLS 4「Nonlinear Relationships」官方文件：二次效果「is like a self-moderation」、「uses the two-stage approach」、「uses the latent variable scores of the latent predictor variable **from the main effects model (without the quadratic effect term)**」、「used to calculate the **squared indicator** for the second stage」——四項全中 |
| `pls_mod_threeway` | 權威文獻逐字 | Becker et al. (2023) guidance 表：「As with two-way interactions, researchers should draw on the two-stage approach to estimate models with three-way interactions. The resulting product should not be standardized, and the researchers should estimate and interpret the unstandardized coefficient.」逐字對上；階層完整規格（3 主效果＋3 兩向＋1 三向）依 Aiken & West (1991) |

### 二、本輪的三筆補正

1. **`pls_hoc_embedded` 的引用不精確**。原標「Sarstedt et al. 2019」為方法出處；依 Becker et al.
   (2023) p. 15，embedded two-stage 的方法源出 **Ringle, Sarstedt & Straub (2012)**，
   Sarstedt et al. (2019) 與 Becker et al. (2023) 是程序指引。已補正 provenance 與
   `generate_reference.py` 的 source 字串（**不影響任何數值**，重生後僅該組 source 更新）。
   ——與 Q1 的 `pls_itcriteria` 引用錯置（2019 JAIS vs 2021 Dec. Sci. 作者組合）同一類問題。
2. **工單誤植兩處**。批次 3 標題寫「3 組」但列出 4 個方法（`pls_quadratic` 與 `pls_mod_threeway`
   是兩組獨立 fixture）；Q3 判準「`MAX_PENDING` 降至 0」建立在 Q2 降到 4 的前提上，
   Q2 因文獻未取得只到 6，故 Q3 的正確落點是 **2**。已修 `roadmap-v2.md`。
3. **`pls_quadratic` 的第一階段乾淨性做了實作層查核**（不只讀文件）。SmartPLS 要求第一階段
   取「主效果模型（不含二次項）」的分數。查 `pls.js` 的 two-stage 分支：先以 `curPaths`
   （僅主效果）呼叫 `estimateStage`，交互路徑 `intPaths` 在該次估計**之後**才併入——確認乾淨。

### 三、誠實標註的殘餘限制

`pls_quadratic`／`pls_mod_threeway`／`pls_hoc_embedded` 三組**沒有專屬的第三方數值對照**：
SmartPLS 4 授權已過期，seminr 沒有 quadratic、三向交互、embedded 變體的支援。
它們的保證來自三者疊加——**權威文獻逐字或逐點 ＋ 與已對 seminr 逐值的 `pls_mod_twostage`／
`pls_hoc_disjoint` 走同一條程式路徑 ＋ 規格完整性查核**。這比 Q1 的「純手算＋自我一致」強，
但比 `pls_pairwise_wpls` 的重生時第三方 assert 弱。各組的 provenance `verification`
已逐條寫明強度到哪裡為止，不做過度宣稱。

### 四、回歸驗證

`reference.json` 全量重生（約 11 秒）：**數值零漂移**，僅 `pls_hoc_embedded` 一條 source
字串更新；重生時通過的第三方 assert 由 Q1 的 2 道（plspm gof、statsmodels 恆等式）
＋ HOC repeated 對 plspm，增加到**加上本輪 3 道 = 共 6 道**。

沙盒可跑的測試全綠：**979 過、6 記錄性跳過**（compare 795＋6、pls 150、nca 16、
provenance 7、a11y/errorCodes/i18n 11）。五個 jsdom `ui.*.test.jsx` 沙盒仍跑不動
（環境層問題，見 Q2 節），需由 Kevin 雙擊 `跑UI測試.bat` 在本機補驗。

## P1 品質殘項 第一批（2026-07-25，Opus 5）：APA 敘述句補齊 8 項

依 `roadmap-v2.md` §2。本批只做「不動統計核心」的部分，交付一項並順帶清掉兩條過期工單。

### 一、交付：APA 敘述句 8 項（中英各一份）

原工單寫「MGA／PLSpredict／IPMA 缺敘述句」——那是 W5 時期的盤點。實查 `Narrative.jsx`：
已有測量、適配、Q²、路徑、R²、調節（含二次）、中介；**W6 新增的 CTA、Gaussian copula、
FIMIX、PLS-POS、cIPMA 同樣沒有敘述句**，實際缺口是 8 項。本次一次補齊。

**撰寫原則（寫進 i18n 檔頭註解，供後續維護遵守）**：句子只重述報表已呈現的判讀，
不引入新的統計主張；**每一項方法的界線必須進入句子**，因為使用者會把敘述直接貼進論文——
敘述句是最後一道防止過度宣稱的關卡。各項強制寫入的界線：

| 區塊 | 強制入句的界線 |
|---|---|
| MGA | 測量恆等性（MICOM）未達 partial invariance 時，群組間係數比較不具意義 |
| PLSpredict | Q²predict 與 RMSE-vs-LM 的計數如實呈現，三種判讀（全優／部分／未優）不含糊 |
| IPMA | 0–100 重標定用的是**觀察極值**而非理論界線，數值會與採理論界線者不同 |
| cIPMA | 判準為 d ≥ .10 且 permutation p < .05；且「必要」不等於「充分」 |
| CTA-PLS | 結論僅及於「反映型設定是否與資料相容」，不證成形成型的內容效度；指標 < 4 者已排除 |
| Gaussian copula | 候選構念未拒絕常態時，**明說結果不足以判定內生性**（Park & Gupta 的識別條件） |
| FIMIX | EN < .50 時明說分段區隔度不足、不宜據此分群解讀 |
| PLS-POS | 目標函數隨段數上升且無懲罰項，**不可用於決定段數**；並揭露本實作為結構模型層簡化版 |

### 二、順帶的架構調整

句子組裝自 `Narrative.jsx` 抽成純函式模組 **`src/analyses/pls/apaNarrative.js`**
（`buildNarrative(res, lang)`）。兩個理由：對齊架構不變量 1「邏輯與 UI 解耦」；
以及讓敘述句能在 **node 環境**被測試——`Narrative` 是 jsdom 元件，而 jsdom 在
Cowork 沙盒卡在環境初始化（見 Session Q2 節），抽出後就繞開了這個限制。

新增 `tests/pls.narrative.test.js`（11 項）：涵蓋未開啟時不得出現、error 時整段略過、
八個區塊各自的數值與界線關鍵字、以及「八項同時開啟時中英兩版都不得殘留未填模板或 NaN」。

**測試當場抓到一個 bug**：`copulaIntro` 含 `{b}`（bootstrap 次數）但組裝時忘了走
`fillTemplate`，輸出會殘留字面的 `bootstrap（{b} 次）`。若只靠肉眼看畫面很容易漏掉——
這正是把它變成可測純函式的價值。已修。

另外 `i18n.test.js` 的 placeholder 對稱性檢查也擋下一次真實不對稱
（zh 用 `{predVerdict}`／`{enVerdict}` 佔位、en 版原本寫成句尾接續），已改為兩語一致。

### 三、清掉兩條過期工單 ＋ 一條裁決

- **59 個既有 eslint 問題** → 已歸零。`npx eslint src tests` 現為 0 problems。
- **`deploy.yml` 加 lint step** → 早已存在（2026-07-13 紅隊 R4 同時補上 lint 與 test）。
- **刪 `reference/statlite.jsx`** → **Kevin 裁決保留**。它不是可安全刪除的 dead code：
  `descriptive.js`／`pvalue.js`／`ttest.js` 三個檔的檔頭以它為溯源出處；
  且 `eslint.config.js` 已將 `reference/` 排除，原本「讓 lint 破表」的刪除理由不成立。

### 四、回歸驗證

沙盒可跑的測試：**990 過、6 記錄性跳過**（較 Q3 的 979 多 11 ＝ 新增的敘述句測試）；
`npx eslint src tests` 0 problems。統計核心未變動，`reference.json` 未重生。
五個 jsdom `ui.*.test.jsx` 仍需 Kevin 本機以 `跑UI測試.bat` 補驗
（本批動到 `Narrative.jsx`，`ui.smoke` 會渲染它）。

### 五、★ 本批抓到的跨平台事故（記錄在案，勿重蹈）

句子模組**最初命名為 `narrative.js`**，與同目錄的 `Narrative.jsx` 只差首字母大小寫。

- **沙盒（Linux，檔名分大小寫）**：`import Narrative from './Narrative'` 精準解析到
  `Narrative.jsx`，990 項測試全綠，看不出任何問題。
- **Kevin 本機（Windows，檔名不分大小寫）**：同一行 import 解析到 `narrative.js`——
  該檔沒有 default export → `Narrative` 為 undefined → 元件掛不上 →
  `ui.smoke > pls-sem > Narrative` 紅燈（`expected null to be truthy`）。

**已改名為 `apaNarrative.js`**，並在該檔與 `Narrative.jsx` 檔頭都寫下「不可改回 narrative.js」
的原因，避免後人「整理命名」時又撞回去。

**教訓（對後續 session 有效）**：本專案的開發環境是 **Linux 沙盒**、使用者環境是 **Windows**。
凡是新增檔案，**檔名不得與同目錄既有檔案僅差在大小寫**——這類錯誤在沙盒 100% 測不出來。
這也是「五個 jsdom `ui.*.test.jsx` 沙盒跑不動、必須由 Kevin 本機補驗」不只是形式的證明：
本次正是 `ui.smoke` 在本機抓到了沙盒全綠的實質缺陷。
---

## P1 品質殘項 第二批（2026-07-25，Opus 5）：低風險殘項清帳 ＋ BCa 第三方抽驗

工單來源：`roadmap-v2.md` §2.3「不動統計核心（低風險）」全部 7 項 ＋ §2.3「卡外部資源」
中不卡文獻的 1 項（BCa scipy 抽驗）。

### 一、交付清單

| # | 項目 | 實作 |
|---|---|---|
| 1 | IPMA 量表理論界線 | `ipmaPLS` 新增 `scaleMin`/`scaleMax`；未傳時**逐值等同原行為**（不動 fixture 口徑）。Config 加勾選＋兩個數字輸入，走 `buildW5Options` 一路傳到 worker 與同步路徑 |
| 2 | IPMA 塊內量尺不一警告 | 塊內指標觀察全距比值 ≥ 3 時警告，訊息附各指標 min–max 並指向「改用理論界線」 |
| 3 | Q² legacy 註記 | Q² 表上方常駐說明：SmartPLS 4 已移除 blindfolding，官方改推 PLSpredict／CVPAT（本工具皆已內建） |
| 4 | W4 Canvas 顯示層 | 交互項與高階構念節點、HOC↔成分虛線、因子→交互項虛線、引擎自動補的主效果路徑（虛線＋標註）、W4 模型改讀 `stage1` 取指標 loading |
| 5 | PLS 示範資料集 | 開啟 Q²／PLSpredict／IPMA＋cIPMA／CTA-PLS 五個結果區塊；並修掉示範模型缺 `mode` 欄位導致「載入示範即顯示設定已變更」的既有缺陷 |
| 6 | 刪 `src/App.css` | 全 repo 零 import，確認死碼後移除 |
| 7 | README 里程碑 | 新增里程碑表；順帶更新過期的防線規模（基準組數 74 → 81、回歸測試 743 → 1,155） |
| 8 | BCa 第三方抽驗 | 見下方第三節 |

### 二、★ 本批抓到的一處錯誤敘述（測試的實質產出）

實作 IPMA 理論界線時，我在說明文字與 JSDoc 都寫了「只影響 performance，不影響
importance（重標定是線性變換）」。寫成測試斷言後**當場紅燈**：

```
expected -1.5401294178693405 to be close to -0.2305819592149086
```

原因：觀察界線是「每個指標各用自己的全距」縮放，理論界線是「全部共用同一個分母」，
兩者對同一個塊產生的合成分數**不是同一條線性變換**（除非塊內各指標的觀察全距恰好相等）。
importance 是這組 0–100 分數尺度上的非標準化總效果，分數尺度變了係數就跟著變。

三處說明（`pls.js` JSDoc、內嵌註解、中英 UI hint）已改為：兩種界線會**同時**改變
performance 與 importance，得到的是**兩張不同的 IPMA 圖，不可混著解讀**。
`tests/pls.test.js` 留下一條斷言鎖住這個事實，並在註解寫明「這條斷言存在的理由：
本工具原本宣稱 importance 不變，是錯的」。

另一個校準：塊內量尺警告的門檻原訂 1.5 倍，實測對 `datasets.json` 的 C 塊（三個同尺度
連續指標）比值即 1.53 → 純抽樣變異就會誤報。改為 3 倍（真正的量尺混用如 1–7 混 0–100
比值在 15 倍以上）。代價已寫入程式碼註解：1–5 混 1–7（比值 1.5）抓不到。

### 三、`pls_bca_reference` 的 scipy 獨立抽驗（狀態維持 pending）

做法：把 fixture 既有的 999 筆 draws 與同一筆資料餵給
`scipy.stats._resampling._bca_interval`（可注入 `theta_hat_b`，比 `scipy.stats.bootstrap`
更適合逐值比對），逐值比對四個量：

| 量 | 本檔手算 | scipy | 差 |
|---|---|---|---|
| z₀ | −0.021329285143835579 | −0.021329285143835579 | 0 |
| a | 0.0088110813280405237 | 0.008811081328040522 | 1.7e−18 |
| alphaLower | 0.024497917673457204 | 0.024497917673457204 | 0 |
| alphaUpper | 0.97447121653014035 | 0.97447121653014046 | 1.1e−16 |

已升為 `generate_reference.py` 的**重生時 assert**（容差 1e-12），不是一次性抽驗。

**這不能結案，理由寫在 provenance 與程式碼註解裡**：scipy 的 BCa 同樣是「某人讀
Efron & Tibshirani §14.3 後的再實作」，未逐式文件化，屬同一族公式的另一次編碼，
不是 §0 意義下的權威來源。它能抓「本檔把公式打錯」，抓不到「Efron 的式子本身讀錯」。
另有一處未被涵蓋的差異：並列（ties）慣例——本檔用 #{θ̂*<θ̂}/B 再夾擠到
[1/(B+1), B/(B+1)]，scipy 用 (#{<}+#{≤})/(2B) 不夾擠；本批資料為連續型平均、實測無並列，
兩者恰好同值，**此路徑仍待原文核定**。`MAX_PENDING` 維持 2。

### 四、回歸驗證

沙盒（8 個 node 環境測試檔）：**995 過、6 跳過、零失敗**；`npx eslint src tests` 0 problems。
`provenance.test.js` 全綠（棘輪 2 未動）。

**本機全套驗收（2026-07-25 13:58，Kevin 執行 `跑UI測試.bat`）：13 檔全綠、
1,155 過、6 跳過、零失敗。** 沙盒推算的落點是 1,159，實測 1,155——差 4，
推算方式（沙盒總數 ＋ 用上一輪本機數字反推的 jdsom 增量）本來就只是估計，
以本機實跑為準。

本批新增的 3 條 jsdom 測試（`ui.smoke.test.jsx`「PLS 畫布：W4 交互項與高階構念的顯示層」）
**在沙盒完全沒執行過**，本機一次全過：

| 測試 | 結果 |
|---|---|
| 交互項模型：畫布 render 不炸，且交互項構念名出現在畫布上 | ✓ 72ms |
| 高階構念模型：畫布 render 不炸，HOC 與其成分標記都出現 | ✓ 53ms |
| 表單模式（非畫布）在同一份 W4 state 下也不炸 | ✓ 58ms |

順帶排除一個先前列為風險的疑慮：**reactflow 在 jsdom 確實會渲染節點內容**
（`滿意×薪資`、`總體滿意`、`HOC 成分` 三個字串都斷言到了），
所以畫布節點的文字內容可以放心用 jsdom 斷言，不必退回「只測不炸」。
---

## PLS 收尾（2026-07-25，Opus 5）：P1 會動統計核心的兩項 ＋ 調節式中介

工單來源：`roadmap-v2.md` §2.3「會動統計核心（需 fixture 與重生）」全部三項。
Kevin 裁決把 moderated mediation 一併納入本波（工單原註記它「其實是新功能不是殘項」）。

### 〇、前置關卡：fixture 重生在沙盒可否執行

三項工作的共同前提。沙盒原本只有 numpy／pandas／scipy，補裝 statsmodels、scikit-learn、
pingouin、factor_analyzer、semopy、plspm 後，`tests/generate_reference.py` **可完整執行**，
且輸出與現行 `reference.json` **逐位元相同**（唯一差異是本輪刻意改寫的
`pls_bca_reference` source 描述），`datasets.json` 完全相同。重生因此是安全的。

★ 沙盒**沒有 R、也沒有 root**（`apt` 需要 dpkg lock、`sudo` 被 no-new-privileges 擋下），
所以工單 §0 指定的 PLS-SEM 開源權威代理 **seminr／cSEM 只能在 Kevin 本機跑**。
這個限制直接決定了下面三項的溯源路線。

### 一、MGA 的 PLSc 版 —— 實際是「已可用但沒鎖住」

盤點結果與工單假設不同：`mgaPLS` 的 `consistent` 隨 `baseOpts` 一路傳進 `runPLS`／
`bootstrapPLS`／**每一次 permutation 的重估**，引擎層本來就通。實測 PLSc 版與一般版的
群組係數確實不同（F1→F2 群組 1：0.556 → 0.740）。

所以本項的實際缺口是三件事，都已補上：

1. **測試鎖住**（`tests/pls.test.js` 新增一個 describe，3 條）。最關鍵的一條刻意去測
   **bootstrap SE 與 permutation 差異分布**也隨之改變——真正的風險不是「跑不出來」，
   而是日後有人把 `baseOpts` 改成白名單、把 `consistent` 濾掉，造成「點估計校正、
   推論未校正」的靜默混用；那種 bug 只看點估計是看不出來的。
2. **結果明確標記**：`mgaPLS` 回傳新增 `consistent` 欄位，Result 的 MGA 表頭加註
   「PLSc（consistent PLS）」，並把群組層的 PLSc 警告（一致 loadings > 1、校正後 |r| > 1）
   逐條轉呈。
3. **解讀代價寫進警告**：反衰減的分母是**各群組各自**的 rho_A，群組樣本小時 rho_A 不穩，
   跨群係數差異會同時反映信度估計的差異——這句話會直接出現在使用者的報表上。

**不新增基準組**：這是兩個各自 verified 的組件（`pls_plsc` 與 `pls_mga_formulas`／
`pls_mga_perm`）的組合，不引入新公式。改在 `pls_plsc` 的 provenance `verification` 補記。

### 二、PLSpredict 多次重複 —— 聚合層，以恆等式取代新基準組

單次 k-fold 的結果會隨「這一次剛好怎麼切」而變動；重複 R 次再彙總可降低分摺噪音
（SmartPLS 預設 10）。本工具預設仍為 1，UI 提供 1／5／10。

**彙總口徑（兩個量規則不同，刻意如此）**：

| 量 | 規則 |
|---|---|
| 指標層 RMSE／MAE／Q²predict（含 LM 基準） | 取 R 次的算術平均 |
| CVPAT | 先把**逐案損失**在 R 次之間平均，再跑一次既有的成對 t 檢定 |

CVPAT 不平均 t 或 p——平均 p 值沒有統計意義；CVPAT 的虛無假設本來就是關於平均損失差，
對損失取平均正是「降低分摺噪音」要做的事。

**溯源路線（Kevin 2026-07-25 裁決）**：這一層是聚合不是新公式，故**不建立新的基準組**，
改以兩條沙盒可精確驗證的恆等式鎖住：

- `repetitions=1` 的輸出與原本的單次 k-fold **逐值相同** → 既有 `pls_predict` fixture 零回歸；
- 注入 R 組分摺時，指標層逐值等於 R 次單跑的算術平均（實測 **max diff = 0**）。

測試另有兩條「反向」保護：一條確認三組注入的分摺**實質不同**（否則上面那條恆等式沒有意義——
把 fold 編號換位會得到同一組分割，第一次寫測試時就踩到這個坑）；一條確認 CVPAT 的 t
**不等於**各次 t 的平均（若實作誤把 t 平均，這條會紅燈）。

★ **口徑分歧已核對完畢（2026-07-25），結論：不跟隨 seminr**。核對過程與依據見下方第六節。

### 三、調節式中介（moderated mediation）—— 新方法，新基準組 `pls_modmed`

範圍：兩步鏈 X → M → Y，a 路徑（X→M）與／或 b 路徑（M→Y）被 two-stage、恰兩個相異因子的
交互項調節。條件間接效果 = (a1 + a3·w)·(b1 + b3·w)，w ∈ {−1, 0, +1}（構念分數已標準化，
即 ∓1 SD；與本工具既有 simple slopes 同一組取值）。bootstrap CI 沿用主設定的
percentile／BCa，不另立一套。

**溯源策略：把最容易出錯的部分交給第三方，把不會出錯的部分用代數鎖死。**

| 層 | 作法 |
|---|---|
| 第二階段兩條方程 | M ~ X + W + z(X·W) 與 Y ~ M + X 的**全部係數與 R²** 對 **statsmodels OLS** 逐值 assert（容差 1e-10，重生時執行）。本檔原以 `np.linalg.lstsq` 計算，兩者為獨立實作 |
| 第一階段 | ＝主效果模型的 LV 分數，與 `pls_mod_twostage` 同一條程式路徑，該組第一階段已對 plspm assert <1e-6 |
| 合成層 | 代數斷言：w=0 的條件間接效果 **必須等於**一般中介的 a1·b1（與已 verified 的 `pls_mediation` 口徑相接）；相鄰兩個 w 的差**必須恰等於** slopeOverW；兩段皆被調節時 slopeOverW 為 null 且三點不共線 |

第一層 assert 攔的正是 moderated mediation 最容易錯的地方——**「哪些變項進哪條方程」**
（a 方程漏放 W 主效果、b 方程誤放交互項）與係數擷取位置，而不是乘積本身。

★ **命名的誠實標註**：恰一段被調節時，條件間接效果對 w 的斜率（a3·b1 或 a1·b3）在文獻上
稱為 **index of moderated mediation**，出處為 Hayes (2015), *Multivariate Behavioral
Research* 50(1), 1-22。**該原文未取得**，因此本工具：

- 以描述性名稱「對調節變數的斜率」（`slopeOverW`）回報這個量；
- 在 Result 區塊、APA 敘述句、provenance `authority` 三處都寫明「文獻上稱為 index of
  moderated mediation，本工具未取得原文，未實作該文指定的檢定程序，引用該術語前請自行核對」；
- `ui.smoke` 有一條測試專門斷言這句保留說明**確實出現在使用者看得到的地方**——
  這條不是形式，它擋的是日後有人「順手把 UI 文案精簡掉」。

**另一項誠實標註**：交互項本身沒有方向性，同一個交互項會同時產生「X 被 W 調節」與
「W 被 X 調節」兩組解讀，本工具兩組都列出來（模型本身沒有指定哪一個是理論上的調節變數）。
UI 明說「請依你的理論選讀對應的那一組，不要兩組都報」。

**範圍限制（程式碼與 UI 都明示）**：只處理兩步鏈；只支援 two-stage、恰兩個相異因子的交互項
（product-indicator／orthogonal 的係數尺度與 simple slopes 慣例不同，混用會出錯，故不納入）；
a、b 兩段同時被調節時條件間接效果對 w 是二次的，`slopeOverW` 回 **null 而非硬給一個數**。

### 四、回歸驗證

- `tests/generate_reference.py` 完整重生通過，含本輪新增的 statsmodels assert；
  `reference.json` 由 81 組增為 **82 組**。
- 沙盒 8 個 node 環境測試檔：**全數通過**（`tests/pls.test.js` 由 155 增為 170 條）。
- `npx eslint src tests`：0 problems。
- `provenance.test.js` 全綠，`MAX_PENDING` 維持 **2**（新增的 `pls_modmed` 為 verified，
  不動棘輪；這也是為什麼 PLSpredict 的重複層刻意不建新條目——若建成 pending 會直接撞棘輪）。

五個 jsdom `ui.*.test.jsx` 沙盒仍跑不動。**本機全套驗收（2026-07-25，Kevin 執行）：
13 檔全綠、1,184 過、6 跳過、零失敗**——含本輪新增的 2 條沙盒未執行過的 jsdom 測試
（`PLS 結果：調節式中介` 的 Result 與 Narrative），兩條皆一次通過，
其中「命名保留說明必須出現在畫面上」那條確認生效。

### 五、殘留一項待核（不阻塞）

`跑seminr核對.bat` 第一版靠 `where Rscript` 找 R，Kevin 本機的 R 不在 PATH 上而失敗。
已改為四段式尋找：PATH → 登錄檔 `HKLM/HKCU\SOFTWARE\R-core\R` 的 InstallPath
（64 與 32 位元檢視都查）→ `%ProgramFiles%\R\R-*`、`%LOCALAPPDATA%\Programs\R\R-*`、
`C:\R\R-*` 逐一掃（取版本號最大者）→ 都找不到才給出「還沒裝 R」與「裝了但路徑特殊」
兩種處理指引。找到後會先印出實際使用的 Rscript 路徑再執行。
### 六、★ PLSpredict 重複口徑核對（2026-07-25）：查到的東西比預期重要

原本只是要回答一個是非題：seminr 重複 k-fold 後是 (A) 平均各次指標、還是 (B) 彙總各次預測值
再算一次指標？答案是 (B)，但過程中查到兩件更該記下來的事。

**第一件：seminr 的 `reps` 實際上不生效。**

Kevin 本機實測（seminr 2.5.0 / R 4.6.0、n = 60、k = 5）`reps = 1` 與 `reps = 10` 的
`PLS_out_of_sample` 與 `LM_out_of_sample` **逐位元相同**。回頭讀原始碼
（sem-in-r/seminr master，`R/feature_plspredict.R`）找到原因：

```r
order <- sample(nrow(model$data), nrow(model$data), replace = FALSE)   # ← 洗牌在迴圈外
ordered_data <- model$data[order,]
...
for (i in 1:reps) {
  pred_matrices <- prediction_matrices(noFolds, ordered_data, model, technique, cores)
  ...
}
```

而 `prediction_matrices()` 內的分摺是
`folds <- cut(seq(1, nrow(ordered_data)), breaks = noFolds, labels = FALSE)`——**決定性的**。
洗牌只做一次、迴圈內不再重新洗，所以每一次重複拿到的是**完全相同的分割**，
`apply(array, c(1,2), mean)` 平均的是 R 份一模一樣的預測值。

兩條獨立證據（實測 ＋ 讀原始碼）指向同一結論，因此 **seminr 無法作為這一層的數值基準**——
它產不出有差異的數字可供比對。

**第二件：seminr 意圖採用的 (B) 口徑本身有系統性樂觀偏誤。**

若 `reps` 修好了，(B) 會把各次預測值先平均、再算一次 RMSE。由模糊分解
（ambiguity decomposition）：

```
mean_r MSE_r  −  MSE(p̄)  =  mean_r mean_i (p_ri − p̄_i)²  ≥  0
```

先平均預測值再算指標，必然給出**不高於**「平均各次指標」的誤差，差額恰為各次預測值之間的
變異。重複次數越多看起來越準——但那是**集成（ensembling）效果**，不是模型的樣本外表現。
沙盒已用該恆等式數值驗證（誤差 < 1e-12）。

**結論與處置**：本工具維持 (A)「平均各次指標」，這也是重複 k-fold 交叉驗證的標準作法。
判讀依據已寫入三處使用者／維護者看得到的地方：`plspredictPLS` 的 JSDoc、reps > 1 時的
結果警告、以及 `pls_predict` 的 provenance `verification`。

`tests/verify_plspredict_reps.R` 保留（自我診斷式：先印出 seminr 的實際 API 與回傳結構，
再用該版本真的有的參數呼叫），供日後 seminr 修正 `reps` 後重驗。
雙擊用的 `跑seminr核對.bat` 因 `.gitignore` 擋 `*.bat` 不進版控，重 clone 後需重建。

★ 這一節同時是 §0 規範的一個註腳：「找可執行的第三方實作」不等於「照抄它的數字」。
第三方也可能有 bug，或採用一個**可辯論的**口徑。查核的價值在於**知道它做了什麼**，
而不是無條件對齊。

---

## 階段 A（2026-07-26，Opus 5）：方法文件與紅隊盤點 —— A1 試點 `pls_basic`

工單來源：`roadmap-v2.md` §6。Kevin 2026-07-26 定的三項執行規格：
**先試點 1 份再展開**、**文件以繁中為主**（方法名／專有名詞／引用保留英文）、
**紅隊第 1 條做到逐式核對並記行號**（不是抽查核心公式）。
產出：`docs/methods/pls-basic.md`（八節）＋ `docs/methods/README.md`（索引，隨批次補齊）。

### 〇、這一批的定位（不是補說明文件）

工單 §6.1 已說清楚：真正的交付是把散在 `provenance.json` 三個欄位（`authority`／`note`／
`verification`）裡的保留系統性攤開檢查一遍。本次試點就驗證了這個判斷——
一份文件跑完八條檢查表，**開出 4 項待辦，其中 2 項是實質缺口**（見二、三）。

### 一、R1：逐式核對通過，並做了一道「第四次獨立編碼」

文件第 3 節每條公式都回到 `src/lib/stats/pls.js` 定位並記下行號區間，符號與運算順序逐項相符。
另外做了兩件超出「對照」的事：

1. **代數等價驗證**：`pls.js:914` 的標準化 α 寫成 `k/(k−1)·(1 − k/ΣS)`，與教科書式
   `k·r̄/(1+(k−1)r̄)` 代數等價（`ΣS = k + k(k−1)r̄` 代入即得）；實測差 0.00e+00 / 1.11e−16。
2. **★ 依文件描述獨立重寫**：不看 `pls.js`，只讀方法文件第 3 節的文字描述，用 numpy 從頭重寫
   整條 Lohmöller 迭代（Mode A、path scheme、w'Rw=1 正規化、符號定向），對 `pls_basic` 的
   28 個純量欄位比對，**最大絕對差 7.15e−8**（17 次迭代收斂，殘差量級與 plspm 的迭代容差相符）。

★ 第 2 項是這批文件真正的價值所在，也建議列為後續每一份的標準步驟：它證明的不是「程式碼算得對」
（那由 compare.test.js 與第三方對照負責），而是**「文件寫的公式就是產生基準值的那組公式」**——
文件與實作之間沒有漂移。少了這一道，方法文件就只是一份看起來很像的說明書。

### 二、R3／R4：兩個區塊的區塊內平均相關同為負時，報表會給出「通過」的區辨效度

這是本批的第一個實質缺口，病灶單一：**反向題未事先反向計分**（問卷研究最常見的資料錯誤之一）。

`htmtMatrix` 的分母是兩區塊「區塊內平均相關」的幾何平均 √(r̄ᵃ·r̄ᵇ)。
當**兩個**區塊的 r̄ 都是負的時，乘積為正、開根號有實數解，
原本的守衛 `Number.isFinite(denom) && denom > 0` 擋不住這條路徑。
（只有**一個**區塊為負時開根號得 NaN，守衛正確回傳 null——所以這個洞只在「兩邊都壞」時出現，
而未反向計分往往就是每個構念都有一題。）

沙盒實測（n=80 合成資料，每個構念含一題未反向計分）：

```
HTMT(F1,F2) = 0.083     ← UI 綠燈「區辨效度通過」
α  = −1.81（紅）  rho_A = 0.926（綠）  CR = 0.690（紅）  AVE = 0.871（綠）
loadings = +0.923, −0.937, +0.940（三個全綠——loadingStatus 取絕對值）
warnings = []           ← 零警告
```

使用者看到「兩紅四綠、零警告」，而真正的診斷沒有任何地方講出來。

★ 一個概念要分清楚：`loadingStatus` 取絕對值**本身是對的**——PLS 的符號不確定性確實存在，
但那是「整個構念一起翻轉」（本引擎在 `pls.js:791–796` 做 dominant orientation 定向）。
**區塊內正負混雜不屬於符號不確定性，是資料錯誤。** 舊實作把兩者混為一談。

**處置（Kevin 當場裁決）**：

- r̄ ≤ 0 時 HTMT 回傳 `null`，與其他不合格配對（單指標／形成型）一致 → `pls.js:956–958`
- 引擎層新增兩條警告：區塊內負荷量正負混雜、區塊內平均相關不為正 → `pls.js:1792–1808`
- 新增 4 條行為測試，其中一條鎖住 `pls_basic` 的 HTMT 不受守衛影響
- 既有 fixture 無此情境 → 重生後數值零變動，`MAX_PENDING` 不變

### 三、R2：rho_A 的引用出處誤植（文獻真實性）

`pls.js` 檔頭、`generate_reference.py` 註解與 `reference.json` 的 `pls_plsc` source 字串，
共 5 處把 rho_A 記為 **「Dijkstra & Henseler 2015, *Psychometrika* 80(2) 式 12」**。查核結果：

- Dijkstra & Henseler (2015) 只有兩篇：*Computational Statistics & Data Analysis*, 81, 10–23；
  與 *MIS Quarterly*, 39(2), 297–316。**沒有 Psychometrika 80(2) 這一篇。**
- Hair 團隊自家的 seminr 套件在 `rho_A` 說明文件中引的是 **MIS Quarterly, 39(2)**。
- 推測誤植來源：Dijkstra & Schermelleh-Engel (2014), *Psychometrika*, 79(4)（不同共同作者、不同年）。
- **「式 12」的編號無法核實**（MISQ 原文未取得）；seminr 文件另有指向 equation 3 的說法。

**處置**：卷期改為 MISQ 39(2), 297–316，式號刪除並改標「方程式編號待原文核定」。
`reference.json` 的 source 字串經**完整重生** fixture 更新——重生後 diff 只有那一行，
82 組數值與 `datasets.json` 逐位元相同（這同時再驗證了一次工單 §8.2 的可重現性宣稱）。

★ 給後續的註腳：這一項本身不影響任何數字，但它正是 §0 規範要防的東西——
溯源欄位一旦寫錯，**後人會拿著錯的卷期去找原文，找不到就會以記憶補上**，
而那正是 2026-07-13 抓到四個 bug 的成因鏈的起點。

### 四、R5 與 provenance 欄位的精確化

- **R5（L2）**：APA 敘述句未載明 α 為**標準化 α**（相關矩陣版）。讀者拿 SPSS 報表
  （原始分數 α）對照會對不上，而兩者在題目變異數不等時數值本就不同。
  中英各補一處：`zh-TW.js:3301`、`en.js:3243`。
- **`provenance.json` 的 `pls_basic` 三個欄位**（Kevin 2026-07-26 核定一併修）：
  原 `note` 稱「fixture 值為 numpy 手算」不精確——loadings／weights／path／R²／adjR²／
  LV 相關／cross-loadings 其實出自 **plspm 0.5.7**，只有 alphaStd／rho_A／rho_c／AVE／HTMT
  五項是 numpy 手算；原 `authority` 只寫 seminr 2.5.0，**漏列實際產生 fixture 的 plspm**
  （對照 `pls_formative` 的 authority 就正確列了兩者）。三欄已改寫，並把本次紅隊三道加入
  `verification`、把「原文全部未取得」的限制寫進同一欄。

### 五、回歸驗證

| 檢查 | 結果 |
|---|---|
| 沙盒 node 測試（8 檔） | 全綠 |
| Kevin 本機全套（13 檔，雙擊 `跑UI測試.bat`） | **1,188 過、6 跳過、零失敗**（1,184 → 1,188，＝新增 4 條） |
| `npx eslint src tests` | 0 problems |
| fixture 完整重生 | `reference.json` 僅 `pls_plsc` 一行 source 字串變動；`datasets.json` 逐位元相同 |
| `provenance.json` diff | 僅 `pls_basic` 的 authority／note／verification 三欄（6 行） |

### 六、給後續批次的三條提醒

1. **行號引用在改動 `pls.js` 後全部會位移。** 本次修完 R2–R5 後 `pls.js` 增加 24 行，
   文件裡 50 餘處行號全部失效，是程式化重新定位後才交付的。**每批交付前必須重驗一次行號**，
   否則這批文件的「可追溯」承諾當場破功。
2. **「不看程式碼獨立重寫」要放在寫完第 3 節之後、不是之前。** 順序顛倒就變成抄程式碼，
   驗不到漂移。
3. **第 6 節「尚未驗證的部分」不准留白。** `pls_basic` 是全專案對照最厚的一組（plspm ＋ seminr
   兩個獨立第三方全中），它的「尚未驗證」清單仍有 6 項——其中第 1 項是「七篇方法出處原文全部
   未取得」。如果連這一組都能誠實列出 6 項，後面 tier B 的組別就沒有理由寫「已完整驗證」。

### 七、A1 全批交付（2026-07-26 同日續作）

Kevin 裁決「一波做完 9 份」，故 A1 其餘九個方法群一次交付：`pls-formative`、`pls-plsc`、
`pls-reliability-validity`、`pls-fit`、`pls-gof`、`pls-bootstrap`、`pls-bca`、`pls-q2`、
`pls-pairwise-wpls`。加上試點共 **10 份**，A1 結案。

#### 7.1 十組獨立重寫的結果

每一組都做了「依方法文件第 3 節的文字規格，用 numpy 從頭重寫」再對 `reference.json` 逐值比對：

| 組 | 欄位 | 最大絕對差 | 對照性質 |
|---|---|---|---|
| `pls_basic` | 28 | 7.15e−8 | 對 plspm（真第三方；殘差＝plspm 迭代容差） |
| `pls_formative` | 11 | 2.22e−16 | 對 plspm |
| `pls_scheme_centroid` | 17 | 1.37e−8 | 對 plspm |
| `pls_scheme_factorial` | 17 | 2.58e−8 | 對 plspm |
| `pls_plsc` | 22 | 1.55e−15 | 同族公式二次編碼（cSEM 已另證） |
| `pls_fit` | 8 | 2.22e−15 | 同族公式二次編碼（cSEM 已另證 3/4 項） |
| `pls_gof` | 3 | 2.22e−16 | 對 plspm（重生時 assert） |
| `pls_q2` | 3 | 1.11e−16 | 同族公式二次編碼（**無在世第三方**） |
| `pls_bca_reference` | 6 | **0.0** | 同族公式二次編碼（scipy 已另證） |
| `pls_pairwise_wpls` | 40 | 3.33e−16 | 對 pandas／statsmodels |
| bootstrap 摘要 | 6 | 1.33e−15 | **$p$ 值對 scipy `t.sf`（真第三方）** |

★ **這張表要分兩類讀**。對 plspm／pandas／statsmodels／scipy 的那幾列是**真第三方對照**；
其餘幾列的 fixture 值本身就是 numpy 手算，我的重寫屬**同一族公式的第二次編碼**——
它抓文件↔實作的轉寫漂移，**抓不到「對原文的理解本身有誤」**。這正是 §0 規範的核心區分，
十份文件的第 6 節都逐組標明了自己屬於哪一類。

★ **方法論修正**：試點階段我把這道驗證描述為「不看程式碼」。這個說法不精確——
執行者在撰寫第 3 節時已經讀過 `pls.js`，所以**不是盲重寫**。準確的說法是：
「依文件第 3 節的文字規格重寫，過程中不回頭參照程式碼」，驗的是**文件的文字是否構成充分且正確的規格**。
十份文件已統一改用後者的措辭。

#### 7.2 ★ R6（L4）：本批唯一的真 bug

完整記錄見 `docs/methods/pls-plsc.md` 第 8 節。摘要：

`plscAdjust`（`pls.js:995`）從**欄位**重算區塊相關矩陣。但 pairwise deletion 下欄位是
補值過的（NaN→0，＝原尺度均值補值）、WPLS 下是未加權標準化的，真正的相關矩陣在 `spec.corrMatrix`。
引擎其他每一處都走 `spec.corrMatrix`，**只有 `plscAdjust` 漏了**。

| | rho_A F1 | rho_A F2 | path F1→F2 | R² |
|---|---|---|---|---|
| 設計應為（走 pairwise R） | 0.7945 | 0.7979 | 0.4252 | 0.1808 |
| **修正前的引擎回報** | **0.7025** | **0.6460** | **0.5026** | **0.2526** |

rho_A 低估 0.09–0.15，**跨過 .70 的判準門檻**（0.646 判紅、正確值 0.798 判綠）；
PLSc 以 $q_aq_b$ 反衰減，分母被低估 → 路徑高估約 18%。WPLS 模式同樣低估約 0.10。
兩者都是 UI 選項，修正前**沒有守衛也沒有任何警告**。

★ **為什麼能活到現在**：不是公式讀錯，而是**「PLSc × pairwise／WPLS」這個組合沒有任何基準組覆蓋**。
這是階段 A 之前的溯源制度看不見的死角——`provenance.test.js` 的棘輪只管「每個方法有沒有登記」，
管不到「方法之間的組合有沒有被驗證」。同批的 R9（GoF 的 communality 平均方式在等寬區塊下同值，
故慣例未被覆蓋）是同一類成因，只是後果輕微。

**處置（Kevin 當日核定）**：

1. `plscAdjust` 改走 `spec.corrMatrix`。完整資料時該欄位為 `undefined`、回到欄位相關 →
   `pls_plsc` 基準組與既有測試**逐位元不變**。
2. 新增基準組 **`pls_plsc_pw`**（22 欄，tier B / verified），並在 `generate_reference.py` 下
   **結構性 assert**：由迭代所用 R 的區塊子矩陣重算 rho_A 必須逐位元（1e−12）等於本組值。
   ★ 這條 assert 才是真正的防線——它鎖的不是某個數字，而是**「PLSc 的 S 必須等於迭代所用的 R」**
   這個結構性約束。後人把實作改回由欄位重算就會紅燈。
3. 新增 5 條行為測試，含一條「rho_A(F2) > 0.75」直接鎖住「不會再退回未達 .70 判準的那一側」。
4. 同類的第二處（`crossLoadings` 在 pairwise／WPLS 下算在補值資料上）一併改走 R（L3）。

#### 7.3 其餘七項紅隊發現

| 編號 | 級別 | 內容 | 狀態 |
|---|---|---|---|
| R7 | L2／L3 | Mode B 區塊奇異時錯誤訊息未指名構念 | ⬜ 待裁決 |
| R8 | L1 | SRMR 分母與 NFI 虛無模型兩項慣例從未書面化（改分母後飽和 SRMR 0.0976 → 0.1079，跨過 .10） | ✅ 已補 |
| R9 | L1 | GoF 的 communality 平均方式未被基準覆蓋 | ✅ 已記錄 |
| R10 | L2 | `nSkipped` 未在報表揭露 | ⬜ 待裁決 |
| R11 | L1 | `pw_minPairs`／`pw_minEig` 實際未被比對覆蓋（59 欄實為 57 欄） | ✅ 已記錄 |
| R12 | L2 | APA 敘述句未揭露缺失值處理與抽樣權重 | ⬜ 待裁決 |
| — | — | bootstrap 的 $p$ 值口徑未對 seminr 核對 | ⬜ 卡本機資源 |

#### 7.4 ★ 一則方法論教訓（R7 的兩次判讀）

R7 第一次的判讀是**讀程式碼推論**得出的：看到 `estimateCoreFromCorr` 在 Mode B 區塊反矩陣失敗時
回傳 `null`，推斷呼叫端會翻譯成「PLS 迭代未收斂」，判為歸因錯誤。

**實測後證明這是錯的**。建構 $x_3=2x_1+3x_2$ 的完全共線資料實跑，得到的是
`estimation-failed`／「PLS 迭代過程出現數值退化（零變異 LV 分數或奇異矩陣），請檢查指標間是否極度共線」——
歸因方向正確、也點到共線。真正剩下的缺口只是「沒指名是哪個構念」，嚴重度低得多。

⇒ **凡涉及「使用者實際會看到什麼」的檢查項（錯誤訊息、警告文字、燈號），一律必須實跑，
不接受讀碼推論。** 已寫入 `roadmap-v2.md §6.8` 給後續批次。

#### 7.5 行號引用的維護成本（給後續批次的實務提醒）

十份文件共 **238 處** `pls.js` 行號引用。本批修完 R3／R4／R6 後 `pls.js` 增加 16 行，
**94 處引用當場失效**——包括試點文件裡先前已驗過一次的那批。

最後是用「內容錨定核對」修回來的：對每一處引用取出當前檔案的實際內容，
比對它是否仍指向預期的程式碼片段，不符者用錨定字串重新定位。

⇒ **每批交付前必須跑一次行號重驗**，而且要放在**所有程式碼修改之後**。
這是這批文件「可追溯」承諾的成本，不是可以省的步驟。

#### 7.6 回歸驗證

| 檢查 | 結果 |
|---|---|
| 沙盒 node 測試（8 檔） | **1,053 過、6 跳過** |
| Kevin 本機全套（13 檔） | 本批當下預期 1,215；三項待裁決項一併修完後，**2026-07-26 本機實測 1,224 過、6 跳過、13 檔全綠**（見第八節 8.6） |
| `npx eslint src tests` | 0 problems |
| fixture 重生 | 既有 82 組**零變動**；新增 `pls_plsc_pw` 一組；`datasets.json` 逐位元相同 |
| `provenance.json` | 新增 `pls_plsc_pw` 一組（tier B / verified）；棘輪 `MAX_PENDING` 維持 **2** |
| 行號引用 | 238 處全部重新定位並核對，無指向空行或孤立括號者 |

### 八、三項待裁決項的處置（2026-07-26 同日）

A1 收尾時留下 R7／R10／R12 三項待 Kevin 裁決，當日全部核定並執行。

#### 8.1 R7（L2）Mode B 區塊奇異時的錯誤訊息

**裁決**：在 `estimateStage` 做前置檢查，**不動 `estimateCoreFromCorr` 的回傳契約**。

進迭代前對每個形成型多指標區塊先驗一次區塊相關子矩陣的可逆性：

```
error   = formative-block-singular
message = 形成型構念「數位治理能力」的指標相關矩陣不可逆——指標（x1、x2、x3）之間完全共線
          或線性相依，Mode B 的迴歸權重無法計算。請刪除重複／可由其他指標線性組成的指標，
          或把該構念改為反映型
```

→ `pls.js:1451–1467`。代價是多一次區塊反矩陣計算（區塊尺寸小，可忽略）；
迭代內部才失敗的路徑（LV 分數零變異、前置構念相關矩陣奇異）仍回較籠統的 `estimation-failed`。

#### 8.2 R10（L2）bootstrap 剔除比例偏高無警示

★ **本項的第一次判讀是錯的，記錄在此以免後人重蹈。**

原判讀：「`nSkipped` 引擎有算但 UI 完全不顯示」。實查 `Result.jsx` 與 i18n 後發現，
數量**早已揭露在兩個地方**——路徑表上方的設定行（`bootstrapMeta`：「bootstrap 799 / 800 次有效重抽」）
與頂部統計卡（值 `nValid`、副標 `/ nRequested`）。

真正的缺口比原判讀小得多：**比例偏高時沒有警示**，也沒說明 $df=B'-1$ 會跟著變小。
看到「745 / 800」的使用者不會意識到那是模型有問題的訊號。

**裁決與處置**：剔除比例 **> 5%** 時於結果頂部顯示警告，內容含剔除數／總數／百分比／
實際有效重抽數／對應 $df$，並點名可能成因（接近共線、樣本量不足、測量模型有問題）。
數量的常態顯示維持原樣。→ `Result.jsx` 的 `bootstrapHighSkip`；i18n 中英各一組。

★ 誠實標註：**5% 這個門檻是實作判斷，無文獻依據**，已寫入 `pls-bootstrap.md` 第 6 節。

#### 8.3 R12（L2）APA 敘述句未揭露資料處理

**裁決**：缺失值處理與抽樣權重**都補**。

`intro`／`introNoBoot` 各加 `{data}`／`{weighted}` 兩個插槽，由 `apaNarrative.js` 依
`meta.missing`、`meta.nDropped`、`meta.weighted` 組出條件片語。四種情境實跑（中英各一）：

| 情境 | 中文首句節錄 |
|---|---|
| 完整資料 | …檢驗研究模型（N = 60），並以 bootstrap 重抽 200 次… |
| casewise 有剔除 | …（N = 29；listwise deletion 剔除 31 筆含缺失值之樣本，原始樣本 60 筆）… |
| pairwise | …（N = 60；缺失值採 pairwise deletion，相關矩陣的每一格僅使用該配對同時可觀察之樣本）… |
| WPLS | …（N = 60），且以抽樣權重加權估計（統計推論仍以未加權重抽建立），並以 bootstrap… |

★ WPLS 的片語**刻意把「推論仍以未加權重抽建立」寫進句子**——這是實質限制，
使用者複製敘述句投稿時必須一併揭露。

**引擎配合的一處改動**：`meta` 新增 `weighted` 布林欄位（`pls.js:1888`），
原本 `meta` 沒有任何欄位能判斷是否加權。

**未採用的一項**：原建議 pairwise 時寫出「最少配對數」。實作時發現 `minPairs` 只存在於警告字串、
不在 `meta`，要進句子得先讓引擎回傳該診斷量（功能變更）。改為描述做法而不給數字。

#### 8.4 ★ 兩次錯誤判讀的共同模式

R7 與 R10 的第一次判讀**都是讀程式碼推論出來的，實測後都證明過度指控**：

| | 讀碼推論的判讀 | 實測／實查後的真相 |
|---|---|---|
| R7 | 錯誤訊息會誤報為「迭代未收斂」，歸因錯誤 | 實際是 `estimation-failed`，訊息已點到「奇異矩陣／極度共線」，歸因正確，只是沒指名構念 |
| R10 | `nSkipped` 完全沒有揭露 | `nValid / nRequested` 早已顯示在兩個地方，缺的只是比例偏高時的警示 |

兩份文件都**完整保留了兩次判讀**，不把錯誤判讀刪掉改寫成「本來就是這樣」——
因為紅隊報告的價值在於可稽核，掩蓋自己的誤判會讓整批文件的可信度打折。

⇒ 已寫入 `roadmap-v2.md §6.8`：**凡涉及「使用者實際會看到什麼」的檢查項
（錯誤訊息、警告文字、燈號、報表欄位），一律必須實跑或打開 UI 程式碼，不接受讀碼推論。**

#### 8.5 行號引用的第二次重驗

三項修完後 `pls.js` 由 4,742 增至 **4,761 行**，238 處行號引用中 **29 處當場失效**；
第二次內容錨定重驗後全部歸零。這是同一天內第二次——
再次印證 §6.8 的「行號重驗必須放在所有程式碼修改之後」。

#### 8.6 回歸驗證

| 檢查 | 結果 |
|---|---|
| `tests/pls.test.js` | **182 過**（179 → 182，＋R7 2 條、R12 meta 1 條） |
| `tests/pls.narrative.test.js` | **17 過**（11 → 17，＋R12 敘述句 6 條） |
| `npx eslint src tests` | 0 problems |
| 行號引用 | 238 處全部重新定位，指向空行／孤立括號者 0 |
| 新增 i18n key | `bootstrapHighSkip`、`dataCasewise`、`dataPairwise`、`dataMean`、`dataWeighted`（中英對稱，`i18n.test.js` 通過） |
| ★ **Kevin 本機全套（13 檔，jsdom 含在內）** | **1,224 過、6 跳過、零失敗**（2026-07-26 實測；1,188 → 1,224，＋36 條：pls 8、narrative 6、compare 22） |
