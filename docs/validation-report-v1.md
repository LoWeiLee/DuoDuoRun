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

---

## 階段 A / A2（2026-07-26 同日）：PLS 調節／高階／中介，10 份全數交付

A2 十個方法群：`pls_mediation`、`pls_mod_twostage`、`pls_mod_pi`、`pls_mod_ortho`、
`pls_quadratic`、`pls_mod_threeway`、`pls_hoc_repeated`、`pls_hoc_disjoint`、
`pls_hoc_embedded`、`pls_modmed`。加上 A1 共 **20 份方法文件**。

### 一、十組獨立重寫的結果

| 組 | 欄位 | 最大絕對差 | 對照性質 |
|---|---|---|---|
| `pls_mediation` | 6 | 1.11e−16 | 輸入路徑對 plspm（重生時 assert） |
| `pls_mod_twostage` | 10 | 2.22e−16 | **對 seminr 逐值**（A2 唯一有第三方對交互係數） |
| `pls_mod_pi` | 4 | 1.39e−16 | 對 seminr（換算後） |
| `pls_mod_ortho` | 4 | 1.67e−16 | 對 seminr（換算後） |
| `pls_quadratic` | 7 | 9.71e−17 | 官方文件逐點＋機制同源 |
| `pls_mod_threeway` | 8 | 4.30e−16 | 權威文獻逐字＋機制同源（**無第三方數值**） |
| `pls_hoc_repeated` | 12 | 2.22e−16 | 對 plspm（重生時 assert） |
| `pls_hoc_disjoint` | 6 | 2.22e−16 | 對 seminr（一次性抽驗） |
| `pls_hoc_embedded` | 6 | 2.22e−16 | 第一階段有 plspm 錨 |
| `pls_modmed` | 12 | 4.44e−16 | 兩條方程對 statsmodels（重生時 assert） |

★ 全部通過。重寫涵蓋的機制包括：路徑乘積分解、兩階段調節的分數乘積與量尺還原、
全配對乘積指標、對六個一階指標的殘差化、平方項、三向連乘＋全部兩向項、
重複掛載的 HOC 區塊、兩種兩階段 HOC、條件間接效果的合成。

### 二、★ R13：A1 的修正在 A2 被驗出有假陽性

**這是本批最值得記的一項。**

A1 的紅隊 R4 為了抓「反向題未反向計分」，加了一條警告：反映型區塊內同時出現正負 loading 時提醒。
A2 實跑 product-indicator 與 orthogonalizing 兩法時，**每次都跳出這則警告**：

```
交互構念 F1xC 的 9 個 loading: 0.050  0.233  −0.047  0.766  0.767  0.835  0.429  0.579  0.354
警告：構念「F1xC」的指標負荷量正負混雜——…常見原因為反向題未事先反向計分；請先反向計分再重跑
```

但**乘積指標的 loading 正負混雜是正常性質**（兩個標準化變數的乘積與構念分數的相關本來就可正可負），
正交化法還先取了殘差。這則診斷在此完全是錯的。

**處置**：`reportFromStage` 的資料品質警訊迴圈排除交互構念（`ctx.interactionLVs`，由 `runPLS` 從 `plan.ints` 帶入）。
新增 3 條測試，其中一條**專門防止修過頭**——確認一般構念的未反向計分仍會被抓到。

⇒ **教訓：「加警告」本身也需要跨情境驗證。** A1 的 R4 在它自己的情境（一般反映型構念）測過，
但沒有在「交互構念」這個情境測過。這與 A1 的 R6（PLSc × pairwise 組合未被基準覆蓋）是同一類
——**新增的行為要問「它會在哪些我沒想到的情境被觸發」**。

### 三、另外兩項實質發現（皆為實跑所得）

**R15（L3）repeated HOC 下 GoF 仍照算且數值虛高**

```
repeated HOC 模型 → fit: null（矩陣奇異警告）  gof: 0.4722
同資料的一般 M4   → fit: has                    gof: 0.2577
```

兩件事同時成立：邏輯不一致（適配指標不算但 GoF 算），且 communality 平均把重複掛載的 loading
算了兩次。Kevin 裁決「跟進 fit 的守衛」——`fit === null` 時 GoF 一併回 `null`。

**R16（L2）中介 VAF 會跑出 $[0,1]$**

```
直接與間接反號時：direct = −0.0765、totalIndirect = +0.0527 → VAF = −222.0%
無 direct path 時：VAF = 100.0%（模型設定的套套邏輯）
```

表下註記原本已寫「僅在直接與間接同向時具意義」，但逐列沒有標記——使用者的視線在數字上。
Kevin 裁決「逐列標記不適用」：兩種情形顯示「—」並附滑鼠提示。

### 四、三項待裁決

| 編號 | 級別 | 內容 |
|---|---|---|
| R19 | L2／L3 | 三向交互的**階層完整性不檢核**——只宣告三向項時照跑，但係數無法解釋 |
| R21 | L1／L2 | embedded 法在語法中叫 `'two-stage'`，寫 `'embedded'` 撞牆且訊息不說明 |
| R22 | L2 | 調節式中介不符範圍限制時**靜默無輸出**，使用者以為功能不支援 |

### 五、★ 行號重驗的一則實務教訓（本批第三次）

20 份文件共 **412 處** `pls.js` 行號引用。本批的 R13／R15 修完後 `pls.js` 由 4,761 增至 **4,770 行**。

第一次修正時我用了「分段位移」的做法（依區間加固定偏移），結果踩到一個坑：
**範圍引用的起點被單一引用的規則二次替換**（例如 `pls.js:1930–1951` 先產生，
接著 `pls.js:1930 → 1939` 的規則又把它的起點改掉，變成 `1939–1951`）。

最後是改用**內容錨定逐項重建**才收斂：對每一處引用印出當前檔案的實際內容與文件語境，
逐條比對後一次性替換（用佔位符避免二次替換）。

⇒ **行號維護不要用位移法，要用內容錨定法。** 位移法在單次小改動時可行，
多次改動疊加後必然出錯。已寫入 `roadmap-v2.md §6.8`。

### 六、回歸驗證

| 檢查 | 結果 |
|---|---|
| `tests/pls.test.js` | **188 過**（182 → 188，＋R13 3 條、R15／R16 3 條） |
| 沙盒其餘 7 檔 | 全綠 |
| `npx eslint src tests` | 0 problems |
| `reference.json`／`provenance.json` | **本批未改動**（A2 全部使用既有基準組） |
| 行號引用 | 412 處全部內容錨定重驗，可疑 0 處 |
| 新增 i18n key | `interactionTag`、`vafNaLabel`、`vafNoDirect`、`vafOpposite`（中英對稱） |
| 本機全套（Kevin） | 待確認——預期 **1,230 過、6 跳過**（1,224 ＋ 6 條新測試） |

### 七、三項待裁決的處置（2026-07-26 同日）

Kevin 裁決「按建議修」，三項當日完成。

| 編號 | 處置 | 位置 |
|---|---|---|
| **R19** | `buildPlan` 檢查相異因子數 ≥ 3 的交互項，逐一比對其**全部二元子集**是否有對應宣告；缺少時**指名缺了哪幾個**並警告，**不擋** | `pls.js:1373–1396`、`2229` |
| **R21** | 驗證器接受 `'embedded'` 並正規化為 `'two-stage'`；錯誤訊息一併列出別名 | `pls.js:311–316`、`330` |
| **R22** | 偵測到「含交互項、有中介鏈、但無條件間接效果」時說明原因，依情形分兩種訊息 | `pls.js:2281–2300` |

**實測輸出**

```
R19（只宣告三向項）
  交互項「F1xCxF2」有 3 個因子，但模型缺少下列低階交互項：F1 × C、F1 × F2、C × F2。
  階層不完整時高階交互係數會吸收低階項的變異，**無法解釋**（Aiken & West 1991 的規格要求）；
  若無特殊理由，請補上全部低階交互項後重跑

R21（method: 'embedded'）
  正常執行，G→C = −0.3452（與 'two-stage' 逐值相同）
R21（method: 'bogus'）
  高階構念「G」的 method 必須是 'repeated'、'two-stage'（別名 'embedded'）或 'disjoint'，收到「bogus」

R22（product-indicator 交互項＋中介鏈）
  模型含交互項與中介鏈，但未產生條件間接效果（調節式中介）：交互項的估計法為「product-indicator」。
  條件間接效果目前只支援 two-stage 且恰兩個相異因子的交互項——其他估計法的係數尺度與簡單斜率
  慣例不同，混用會造成口徑不一致，故不輸出
```

★ **三項各自都補了「防止修過頭」的測試**——這是 A2 從 R13 學到的做法：

| 修正 | 防止修過頭的那一條 |
|---|---|
| R19 | **二次效果（同構念兩次）不得誤觸發**階層警告（`factors` 去重後只有 1 個因子） |
| R21 | `'embedded'` 與 `'two-stage'` 必須**逐值等價**（`toBeCloseTo(..., 12)`）且 `meta.stages` 相同 |
| R22 | **正常的 two-stage 調節式中介不得**觸發該警告 |

**回歸驗證**：`tests/pls.test.js` **188 → 195**（＋7 條）；沙盒其餘 7 檔全綠；eslint 0 errors；
`reference.json`／`provenance.json` 未改動；行號引用 418 處重驗後可疑 0 處。
**2026-07-26 本機實測 1,237 過、6 跳過、13 檔全綠**（1,224 ＋ A2 的 6 條 ＋ 本節的 7 條，與預期一致）。

★ **行號重驗這次又踩了一個新變化**：`pls.js` 由 4,770 增至 **4,822 行**，且增量分布在**三個不同區段**
（R21 在 ~311、R19 在 ~1377、R22 在 ~2281），位移量分別是 +4／+30／+52。
本次改用「單次 `re.sub` 加分段位移函式」——**一次掃描、每個引用只被替換一次**，
從根本避免了 A2 第一次踩到的「範圍起點被二次替換」問題。
殘餘的 6 處（引用的是本批新增的程式碼，寫文件時已是新行號、不該再位移）以內容錨定逐條修正。

⇒ 至此 **A1 與 A2 的紅隊 R2–R23 共 23 項全部處置完畢**，
唯一未結案的是「bootstrap 的 $p$ 值口徑未對 seminr 核對」（卡本機 R）。

---

## 階段 A / A3a（2026-07-29，Opus 5）：PLS 進階分析第一批，3 份交付

**範圍**：`pls-mga`（含 `pls_mga_formulas`＋`pls_mga_perm`＋`pls_mga_perm_inputs`）、
`pls-micom`、`pls-itcriteria`。Kevin 裁決本 session 只吃 A3a 三份，L3／L4 當場問。

### 一、四組獨立重寫的結果

依各文件第 3 節的**文字規格**以 numpy 重寫（過程中不回頭參照 `pls.js`）。
`pls_mga_perm` 與 `pls_micom` 需要**完整重寫 PLS 核心**（依 `pls-basic.md` §3.2–3.5），
再各跑 40 次雙群估計。

| 組 | 欄位 | 最大絕對差 |
|---|---|---|
| `pls_mga_formulas` | 7 | **0.0**（逐位元相同） |
| `pls_mga_perm` | 2 ＋ 40 筆 `permDiffs` 逐值 | 3.886e−16 |
| `pls_micom` | 18 | 2.220e−16 |
| `pls_itcriteria` | 12 | 8.882e−15（對數運算順序差） |

★ **`pls_micom` 的重寫有一個容易寫錯的細節**：step 2 的權重估在**組內**標準化資料上，
但分數算在**合併**標準化資料上——兩個標準化用不同的 $\mu$ 與 $\sigma$。
任一邊寫錯都不可能對到 1e−16。這正是「文件的文字是否構成充分規格」要驗的東西。

★ **一則程序教訓**：`roadmap-v2.md` 原記載 2026-07-26 已完成三組獨立重寫「可直接沿用，不需重跑」，
但本報告**沒有對應章節**，重寫腳本也未留存。本批選擇重做一次（順帶補上 `pls_micom`）。
⇒ **獨立重寫的結果要寫進 validation-report 才算數**，只寫在工單表格裡等於沒有證據。

### 二、★ 本批的實質發現：一個系統性樣式

紅隊 6 項發現裡有 **4 項**（R24–R27）是同一件事：
**引擎算了、回傳了、`compare.test.js` 也逐值比對了，但沒有任何 UI 元件讀它。**

| 編號 | 欄位 | 引擎 | 測試 | UI |
|---|---|---|---|---|
| R24 | `structural[].itCriteria`（4 個準則 × 3 構念） | ✓ `pls.js:881–892` | ✓ `compare.test.js` 12 欄＋`pls.test.js` 代數斷言 | **✗ 零元件讀取** |
| R25 | `mga.paths[].henselerP2` | ✓ `pls.js:2929` | ✓ `pls.test.js:808` | **✗** |
| R26 | `micom.constructs[].cP` | ✓ `pls.js:3092` | ✓ `compare.test.js` | **✗** |
| R27 | `micom.n1`／`n2`／`nPermValid` | ✓ | — | **✗ 無 meta 行** |

**R24 最嚴重**，因為它不只是「少一張表」：說明區（`Notes.jsx:31` 渲染的 `pls.notes.w5`）
對使用者寫著「IT 準則（AIC/AICc/BIC/HQ）：比較『同一內生構念的不同前置組合』哪個更簡約有效，
越小越好」——**工具在說明一張不存在的報表**。

⇒ **這是既有兩道防線之間的縫隙**：`provenance.test.js` 的棘輪管「方法有沒有登記」，
`compare.test.js` 管「數字對不對」，**沒有任何一道管「這個數字使用者看得到嗎」**。
A1 的 R6（PLSc × pairwise 這個組合沒有基準）是同一類死角的另一面：
**防線各自都有效，但它們之間有沒被覆蓋的區域。**

檢查方式很便宜，已寫入 `roadmap-v2.md §6.5` 供後續批次沿用：

```
grep -rn "<欄位名>" src/ | grep -v src/lib/stats/
```

零命中就是一個發現。

### 三、Kevin 的兩次裁決與處置

**第一次（R24）**：四個選項——另立表＋警語／併入 R² 表／只改說明文字／只記錄。
裁決**另立表＋警語**。

不併入 R² 表的理由：**AIC 跨構念不可比，而 R² 跨構念是可以並列看的**。
放同一張表會讓兩種可比性不同的量並排，強化誤讀。分表可以掛自己的警語，
而註記的**第一句**就是三條界線（不可跨構念、不可跨資料集、只比同一構念的不同前置組合）。

**第二次（R25–R27 打包 ＋ R29）**：裁決三項都補、MICOM 敘述句也補。

| 編號 | 處置 | 位置 |
|---|---|---|
| R24 | 新增 `ItCriteriaTable`，掛在 R² 表之後；`itCriteria` 為 `null` 的構念整列不顯示 | `Result.jsx:509–540`、`1993` |
| R25 | MGA 表新增「p (Henseler 雙尾)」欄，沿用 `toneForP` 語意色 | `Result.jsx:1086`、`1107` |
| R26 | MICOM 表新增「p (permutation)」欄＋`micomNote` 說明兩者是同一判準的兩種呈現 | `Result.jsx:1136`、`1156` |
| R27 | 比照 `mgaMeta` 新增 `micomMeta` 行 | `Result.jsx:1124–1130` |
| R28 | `mgaNote` 措辭精確化（L1 當場修） | i18n 中英各一 |
| R29 | 新增 MICOM APA 敘述句，**排在 MGA 之前** | `apaNarrative.js:298–332`、i18n 中英各 9 鍵 |

**R28 的實測輸出**（這一項是讀敘述時起疑、實跑才確認的）：

```
n1 = n2 = 30    t_pooled = t_Welch = 2.404991730065274（差 0）
                df 58 vs 52.2325        p .01938 vs .01975
n1 = 40, n2 = 20   t 2.403844 vs 2.415409（差 .0116）
                   p .01944 vs .02056
```

原文字「兩組人數相等時與 pooled t 恆等」**沒有錯**（說的是 $t$），
但容易被讀成「結果一樣」。已改為明示「$t$ 逐位元相同，但自由度與 $p$ 不同」並附上述數字。

**R29 的實跑輸出**（示範資料 `group2` 的 M vs F、200 次重排）：

```
測量恆等性方面，依 Henseler, Ringle 與 Sarstedt（2016）的 MICOM 程序檢驗 M（n = 30）與
F（n = 30）兩群（permutation 200 次有效重排）。Step 1（configural invariance）由本工具的
執行方式滿足……F1（c = 0.982，5% 分位 = 0.827，permutation p = .542，step 2 成立；
平均差 = 0.077，95% CI [-0.465, 0.503]；log 變異數比 = -0.115，95% CI [-0.591, 0.614]，
step 3 等平均與等變異均成立）；F2（…）。綜合判定：全部構念達完全測量恆等
（full measurement invariance），可進行群組間的路徑比較，亦可比較潛在變數平均。
```

★ 第一次實跑時句尾出現「）。。綜合判定」——`period` 與 `micomTail` 的句號重複。
MGA 段的寫法是 `items.join(sep) + a.mgaTail`（不加 `period`），照抄即修好。
**這種東西讀碼看不出來，只有實跑會現形**——與 `roadmap-v2.md §6.8` 第一條同理。

★ **三條「防止修過頭」的測試**（A2 的 R13 教訓）：
部分恆等時**必須**出現「不可比較潛在平均」、step 2 不過時**必須**出現「不具意義」
且**不得**只說部分恆等、`micom` 為 `null`／`error` 時**不得**憑空出現整段。

### 四、實跑確認的一項未記錄行為

MICOM 對**單指標構念**的 $c$ 恆為 1。實跑 M4（`group2` 的 M vs F、50 次重排）：

```
F1  c=0.976  q5=0.875   F2  c=0.953  q5=0.803
C   c=0.987  q5=0.945   Y   c=1      q5=1      cP=1
```

`Y` 是單指標構念——三個數字全是套套邏輯（兩群的權重都被正規化成同一個純量），
而燈號判準 $c\ge Q_{0.05}$ 恆成立，報表顯示一個綠燈的 1.000。
**示範模型自己就有一個這樣的構念**，先前未記錄於任何地方。屬功能擴充，記入 §6.6 的 E4。

### 五、回歸驗證

| 項目 | 結果 |
|---|---|
| 沙盒 8 檔 | **1,082 過、6 跳過、全綠**（`pls.test.js` 195 → **196**、`pls.narrative.test.js` 17 → **23**） |
| eslint | 0 problems |
| `reference.json`／`provenance.json` | **未改動**（`MAX_PENDING` 維持 2、基準組維持 83） |
| `pls.js` | **未改動**（4,821 行不變）——本批改動全在呈現層 |
| 行號引用重驗 | 98 處，內容錨定法逐條比對，修正 6 處（i18n 因插入新鍵位移、MICOM 燈號行原本指向錯誤位置） |

**本機全套（Kevin 2026-07-29 執行）**：13 檔、1,245 過、6 跳過、**1 失敗**——
失敗的正是本批新增的 UI 測試之一。

### 五之二、★ 本機補跑抓到的一項：測試自己選錯了資料

`R24`（IT 準則表）**本機通過**，報表實際渲染出：

```
結構模型 — 模型選擇準則（IT criteria）
構念  AIC   AICc  BIC   HQ
績效  0.31  0.57  4.09  1.74
★ 這四個準則只用來比較「同一個內生構念」的不同前置組合……不可跨構念比較……
```

`R25–R27` 那條**失敗**，但**不是 UI 壞了**——訊息裡寫得很清楚：

```
MICOM 無法計算：MICOM：群組估計未收斂或退化
PLS-MGA 無法計算：群組「人事」估計失敗：指標「q2」變異數為零，無法標準化
```

⇒ 我為這條測試挑的合成 state 用了 `department` 的 **人事／資訊**。`employee` 資料集
50 筆但五個部門**分佈不均**（casewise 剔除後人事只剩 5、資訊 8），且 **q2 在人事組內零變異**。
兩群估計直接失敗 → `W5Section` 只渲染警告框 → 表格根本沒 render。

**修正（沙盒逐對實測後選定）**：改用 **財務／研發**（15 / 11，30 次重排全部有效）。
沙盒實測該組合 `mgaPLS` 與 `micomPLS` 皆成功，`henselerP2 = 0.113`、
`cP = 滿意 0.129 / 績效 1.000`，四個新欄位都有值。

★ **同時補了一條「防假通過」的斷言**：先斷言畫面上**沒有** `w5ErrorPrefix` 的
「無法計算：」字樣，再去找那三個欄位。理由是——這次的失敗訊息長達數千字，
真正的原因（估計失敗）埋在最後一行；沒有這條斷言，下次再踩到會被誤判成「UI 壞了」。
斷言訊息直接寫出處置方向（「請改群組欄位或指標組合」）。

★ **這一項也是「涉及使用者看得到什麼一律實跑」的又一次驗證**——
只是這次實跑的是**測試自己**。沙盒能跑引擎但跑不動 jsdom，我在沙盒驗證了
「引擎算得出四個值」，卻沒驗證「我挑的那兩個群組估計得起來」。
⇒ 教訓：**寫 jsdom 測試時，凡是選了特定資料子集，先在沙盒把該子集餵給引擎跑一次。**

**修正後本機複跑（2026-07-29）**：**13 檔全綠、1,246 過、6 跳過、零失敗**，與預期一致。
R24 與 R25–R27 兩條 UI 測試皆通過。⇒ **A3a 全批交付完成。**

### 六、給 A3b／A3c 的三條提醒

1. **第 7 節（報表欄位對照）要從 `grep` 開始，不是從讀 UI 開始**。本批 4 項發現都是這樣抓到的。
2. **獨立重寫的結果要寫進本報告**，不要只寫在工單表格裡（第一節末的教訓）。
3. **A3c 的四組（CTA／copula／FIMIX／POS）需要重寫 bootstrap tetrad、copula 迴圈、EM、爬山法**，
   成本遠高於本批。`pls_fimix` 維持 pending，文件據實標註「取得管道已窮盡」，不以替代驗證充當結案。

---

## 階段 A / A3b（2026-07-29 同日，Opus 5）：PLSpredict／IPMA／cIPMA，3 份交付

**範圍**：`pls-predict`（含多次重複與 CVPAT）、`pls-ipma`、`pls-cipma`。A3 累計 6 / 10。

### 一、三組獨立重寫的結果

依各文件第 3 節的**文字規格**以 numpy 重寫（PLS 核心沿用 `pls-basic.md` §3.2–3.5 的重寫）。

| 組 | 欄位 | 最大絕對差 |
|---|---|---|
| `pls_predict` | 48 | 8.882e−15 |
| `pls_ipma` | 10 | 1.421e−14 |
| `pls_cipma` | 10 | 3.553e−15 |

★ `pls_predict` 的重寫是本批成本最高的一項：要重現逐摺標準化、逐摺重估 PLS、
holdout 分數的拓撲遞迴、loading 還原、LM 基準、CVPAT。能對到 1e−15 表示三個容易寫錯的地方
都寫對了：**只用訓練摺標準化**、**內生構念的分數走結構係數而不是自己的指標**、
**naive 是訓練摺平均而非全樣本平均**。

★ `pls_cipma` 的重寫需要 CE-FDH 階梯、CR-FDH 的**夾擠面積**（直線可能穿出 scope 矩形，
要分段線性精確計算）、199 次 permutation 與 bottleneck 的 pctBelow。

### 二、★ R32：新的一類發現——說明承諾的「級數」與實作不符

A3a 的樣式是「算了但看不到」。R32 不是：

- `predictNote`（中英各一）與說明區 W5 段落**都明寫** Shmueli et al. (2019) 的四級判讀
  「全部較低＝高預測力、多數較低＝中、少數較低＝低、全部較高＝缺乏」
- 但**報表上沒有任何整體判讀欄位**
- **APA 敘述句只有三級**：`predAll`／`predSome`／`predNone`——把「多數」與「少數」壓成同一句

⇒ 讀者拿敘述句去對註記會對不上，而兩邊都是本工具自己寫的。

**處置（Kevin 核定：補成四級）**

判準抽成**匯出純函式** `plspredictVerdict`（`pls.js:3128–3151`），由 `plspredictPLS` 回傳
`verdict`／`nIndicators`／`nBeatLm`／`nQ2ok`（`pls.js:3418–3438`），
報表與 APA 敘述句**讀同一份**。抽出來的理由正是 R32 抓到的病灶：**各算各的**。

★ **留下一個必須誠實標註的口徑**：原文**未明定**「多數／少數」的數值門檻。
本工具取「超過半數＝多數」，所以**恰好半數落在「低」**。這是本工具的選擇而非引用，
寫進三處（報表註記、APA 敘述句的 `predVerdictCaveat`、方法文件 §3.5），
並以測試鎖住——`plspredictVerdict` 對 2/4 必須回 `'low'`、敘述句必須含「原文未明定」。

示範資料恰好踩在這條界線上（2 個內生指標中 1 個優於 LM → 判「低」），
沙盒實測 `verdict='low'`、`nBeatLm=1`、`nIndicators=2`、`nQ2ok=1`。

### 三、另外兩項（皆為 A3a 的樣式重現）

| 編號 | 欄位 | 引擎 | 測試 | UI |
|---|---|---|---|---|
| R30 | `ipma.unstandardizedPaths` | ✓ `pls.js:3579` | ✓ fixture 3 欄＋`adapters.mjs:741` | **✗ 零元件讀取** |
| R31 | `predict.indicators[].lm.q2predict`／`.mae` | ✓ | ✓ fixture 8 欄＋`compare.test.js` | **✗** |

**R30 比單純少一欄嚴重一點**：importance 就是這些非標準化路徑沿路徑相乘再相加得到的。
使用者看到 `importance_F1 = −0.231` 卻看不到它由 `F1→F2 = 0.322`、`F1→C = −0.163`、
`F2→C = −0.209` 怎麼組出來——等於報了一個無法追溯的合成量。

補表時**同時補了註記**：這些係數與結構模型表的標準化 $\beta$ **不同尺度、不可互相比較**。
UI 測試除了驗表格存在，也斷言這句話必須出現——**R30 真正的風險不是少一張表，
而是多一張看起來像路徑係數的表卻沒說它與 $\beta$ 不同尺度**。

### 四、cIPMA：本批唯一零待修，但記到一項全域慣例分歧

cIPMA 是 PLS 側溯源強度最高的幾組之一——**原文已取得**（OA）、
NCA 核心已對過官方 R `NCA` 5.0.2。八條檢查表跑完沒有開出待修項。

但紅隊在它身上記到一件先前沒有任何地方寫下來的事：

★ **permutation $p$ 的 ±1 修正，在同一個工具裡有兩種慣例。**

| 位置 | 公式 | 依據 |
|---|---|---|
| NCA／cIPMA | $p=\#/P$ | 沿用已對 R `NCA` 5.0.2 逐值驗過的助手 |
| MGA／MICOM | $p=(\#+1)/(P+1)$ | permutation 檢定的標準做法（避免 $p=0$） |

兩者各自都對得起自己的來源，但**一個工具給出兩種 $p$ 值定義**這件事本身應該被使用者知道。
改任一側都會動到已對過第三方的基準，故本批只做書面處置（寫入方法文件 §6 與 §8），
是否統一留給階段 B（記入 `roadmap-v2.md §6.6` 的 E14）。

### 五、回歸驗證

| 項目 | 結果 |
|---|---|
| 沙盒 8 檔 | **1,084 過、6 跳過、全綠**（`pls.test.js` 196 → **198**） |
| eslint | 0 problems |
| `reference.json`／`provenance.json` | **未改動**（`MAX_PENDING` 維持 2、基準組維持 83） |
| `pls.js` | 4,821 → **4,864** 行（新增 `plspredictVerdict` 與四個回傳欄位，**無數值變動**） |
| 行號引用重驗 | 本批三份 121 處，內容錨定法逐條比對，修正 2 處；另確認 A3a 三份的 68 處 pls.js 引用**全部落在本批插入點之前**，不受影響 |

⚠ **需 Kevin 本機補跑**：本批動到 `src/lib/stats/pls.js`、`src/analyses/pls/Result.jsx`、
`src/analyses/pls/apaNarrative.js`、`src/i18n/**`。新增的 3 條 UI 測試
（`tests/ui.smoke.test.jsx`）**沙盒未執行過**。
★ 依 A3a 的教訓，本批的 UI 測試用**預設示範設定**，並已在沙盒確認該設定產出
`verdict='low'`、`unstandardizedPaths` 2 條、cIPMA 1 個條件——不會重演「測試自己選錯資料」。

### 六、給 A3c 的提醒

1. **A3c 四組（CTA／copula／FIMIX／POS）需要重寫 bootstrap tetrad、copula 迴圈、EM、爬山法**，
   成本明顯高於前兩批，建議單獨一個 session。
2. **兩條檢查習慣要繼續跑**：(a) 寫第 7 節前先 `grep` 每個回傳欄位確認有 UI 消費者；
   (b) 讀第 2／3 節時把每一句「本工具會…」當成待驗證的斷言（R32 就是這樣抓到的）。
3. `pls_fimix` **維持 pending**，文件據實標註「取得管道已窮盡」，不以替代驗證充當結案。

---

## 階段 A / A3c（2026-07-29 同日，Opus 5）：copula／POS／CTA／FIMIX，4 份交付，A3 收官

**範圍**：`pls-copula.md`、`pls-pos.md`、`pls-cta.md`、`pls-fimix.md`。
本階段成本最高的一批——四組都要重寫完整演算法（Gaussian copula 迴圈、爬山法、
bootstrap tetrad、EM），基準欄位合計 190。

### 一、獨立重寫（四組全數通過）

依各文件第 3 節的**文字規格**以 numpy 重寫，過程中不回頭參照 `src/lib/stats/pls.js`
與 `tests/generate_reference.py`；PLS 核心依 `docs/methods/pls-basic.md` §3.2–3.5 重寫
（約 70 行：標準化 → 相關矩陣 → Lohmöller 迭代 → 符號定向 → 分數）。
★ 依 Kevin 2026-07-29 裁決，**重寫腳本不入庫**——每次重寫都是一次獨立檢驗，
沿用舊腳本會弱化這個作用。

| 基準組 | 欄位 | 注入的 tier I 輸入 | 最大絕對差 |
|---|---|---|---|
| `pls_copula` | 30（展開後 148 個數值） | `pls_copula_inputs`（300 組重抽索引） | **3.775e−15** |
| `pls_pos` | 39 | `pls_pos_inputs`（$K=2,3$ 的起始分割） | **2.132e−13** |
| `pls_cta` | 50（含 7 個字串欄，**字串全數相符**） | `datasets.json:cta.boot`（300 組） | **6.661e−16** |
| `pls_fimix` | 71（1 欄為 `null`，兩邊皆 `null`） | `pls_fimix_inputs`（$K=2,3,4$ 初始後驗） | **4.547e−13** |

★ **兩處誤差量級高於 A3a／A3b 的 1e−15，原因已查明且屬演算法性質**：

- `pls_pos`（1e−13）：充分統計量（$\mathbf{A}$、$\mathbf{b}$、$\sum y^2$）經數百次增量加減累積浮點誤差。
  **整數欄位（`passes`、`moves`、`size`、`recovery`）逐位元相同（差 0）**，表示兩套實作的搬移序列完全一致。
- `pls_fimix`（1e−13）：差在 `aic_K4` 等 $-2\ln L$ 量級（約 690）的欄位，相對誤差 ~7e−16。

★ 重寫順帶確認了四個容易寫錯的地方都寫對了：
**ECDF 並列取最大秩**（取最小秩會讓整條 $c_P$ 位移）、**bootstrap 內重估 PLS 權重而非沿用**、
**CTA 的 bias 方向與 Bonferroni 進的是分位數而非 SE**、**POS 的 $R^2$ 分母是未置中的 $\sum y^2$**。

### 二、EM 的一項性質：`pls_fimix` 的 $K=3$／$K=4$ 是「未收斂」狀態快照

實測（tol $=10^{-10}$、上限 2000）：

| $K$ | 迭代數 | 收斂 | $\ln L$ | EN |
|---|---|---|---|---|
| 1 | 2 | ✅ | −409.152 | — |
| 2 | 34 | ✅ | −334.163 | 0.566 |
| 3 | **2000（用盡）** | ❌ | −334.162 | 0.360 |
| 4 | **2000（用盡）** | ❌ | −334.160 | 0.284 |

⇒ 71 欄裡 **$K=3$／$K=4$ 的 24 欄鎖的是「跑滿 2000 次迭代時的狀態」，不是 EM 的不動點**。
兩套實作能對到 1e−13，是因為跑了完全相同的確定性迭代序列。
這**不是 bug**（$K>2$ 對這份資料過度參數化，概似面是脊線），但有兩個後果已寫入 `pls-fimix.md` 第 6 節：
(a) **改 `maxIterations` 預設值會靜默改變 24 個基準欄位**；(b) 引擎在此情境會發出「未收斂」警告，
使用者端是誠實的，但 fixture 沒有記錄「這是未收斂狀態」。

### 三、紅隊 15 項（無 L4）——12 修 3 記錄

完整表格見 `roadmap-v2.md §6.6`（R33-a…R36-d）。此處只記三項最值得留下的：

**R33-b（copula）同一件事有兩套判準，且會給相反結論**

報表的內生性訊號用 percentile CI 是否含 0（註記亦明寫），APA 敘述句用 $p<.05$。
$p$ 走 $t=\hat\alpha/\text{SE}$、CI 走分位數——bootstrap 分布偏斜時不等價。
掃描 60 個重抽資料集，**兩個方向的不一致都出現**：

| 案例 | coef | SE | $p$ | 95% CI | 敘述句 | 報表 |
|---|---|---|---|---|---|---|
| seed 1 | −0.5254 | 0.2591 | **.0433** | [−0.7158, 0.3501] | **顯著** | 無訊號 |
| seed 2 | −0.5500 | 0.2699 | **.0422** | [−0.7661, 0.3241] | **顯著** | 無訊號 |
| seed 10 | −0.2044 | 0.1255 | .1043 | **[−0.4956, −0.0081]** | 不顯著 | **有訊號** |

處置：敘述句改讀引擎既有的 `endogeneitySignal`，判準只留 CI 一份；
`pls.narrative.test.js` 補一條回歸鎖，以上表的兩個方向各一例斷言敘述句必須跟著 CI 走。

★ 這是 A3b 的 R32（級數不符）的加強版：R32 是詳略之差，**R33-b 是結論相反**。
⇒ 已寫成 `roadmap-v2.md §6.5` 的檢查習慣 3：**凡二值判定，就去數它在專案裡被實作了幾次**。

**R34-a（POS）註解沒跟上改碼**

Session Q2（2026-07-25）把 POS 的目標函數由 $\Sigma\text{SSE}$ 最小化改為 $\Sigma R^2$ 最大化，
改了 `pls.js` 實作、`generate_reference.py`、i18n 與 UI 警告，**唯獨漏了 `pls.js` 頂端的區塊註解**
（三處：「目標＝預測誤差」「Obj = ΣSSE，愈小愈好」「目標函數必然隨段數下降」）。
那是後續維護者第一眼會讀的東西。
⇒ 已寫成檢查習慣 4：**改口徑時把「該檔案的區塊註解」列入必改清單**。

**R36-d（FIMIX，L3）溯源字串本身的事實錯誤 → 完整重生 fixture**

`reference.json → pls_fimix.source` 兩處與實作不符：寫「β 遞減排序以消除 label switching」
（實際是 **ρ 遞減**，`pls.js` 與 `generate_reference.py` 兩邊的實作與註解都是 ρ）；
寫模擬真值「+0.70 / −0.30」（實際是 **±0.80、180/120**）。
source 字串是溯源證據的一部分，排序規則寫錯會讓讀者誤解 71 欄裡 12 個 $\beta$ 欄的意義。

處置比照 A1 的 R2：改 `generate_reference.py`（`2095`／`2097`＋註解 `1984`）後**完整重生**。

| 驗證項 | 結果 |
|---|---|
| 基準組數與鍵集合 | 83 → 83，**完全相同** |
| `source` 字串有差異的組 | **只有 `pls_fimix` 一組** |
| **`values` 有差異的組** | ★ **零組——83 組數值逐位元不變** |
| `datasets.json` | **逐位元不變** |

### 四、防漂移測試上線（§6.7 判準 5）

新增 `tests/docs.coverage.test.js`，六條斷言：八節模板完整性、README 索引涵蓋、
**未被任何第 6 節引用的基準組數棘輪**（`MAX_UNDOCUMENTED = 44`，只能往下調）、
A1–A3 的 PLS 側不得掉出涵蓋、文件不得引用不存在的基準鍵。

★ **上線第一天就抓到一組**：`pls_scheme_centroid` 與 `pls_scheme_factorial`
有基準（各 17 欄）、有 adapter、`compare.test.js` 也逐值比對，
**但 A1 的 `pls-basic.md` 第 6 節只點名 `pls_basic`**——34 個欄位沒有任何文件承認它們存在。
已同日補入該文件 §6。

⇒ 這正是本測試存在的理由：`provenance.test.js` 管登記、`compare.test.js` 管數值，
**沒有一道管「有沒有人說得清這組基準是什麼」**。

### 五、驗收

★ **本批的沙盒環境效能極不穩定**（`generate_reference.py` 一度由文獻記載的 6.5 秒變成 **15 秒**、
vitest 單檔一度超過單次 45 秒上限），期間曾改以「adapter 逐值比對」替代數值驗收；
**環境恢復後全部 9 檔沙盒測試已補跑完成**。兩道驗收都保留在此，因為前者比 `compare.test.js` 更嚴格。

| 驗收項 | 方法 | 結果 |
|---|---|---|
| **引擎數值未變（額外一道）** | 以 `git show HEAD:src/lib/stats/pls.js` 還原 HEAD 版到 `/tmp`，兩版**逐一執行全部 77 組 adapter**並遞迴比對輸出 | ★ **零差異**（比的是全部回傳鍵，不只 fixture 涵蓋的欄位） |
| **fixture 未變** | `reference.json` 完整重生後與重生前逐組比對 | ★ **83 組 values 逐位元不變**；`datasets.json` 不變 |
| 沙盒測試 **9 檔**（原 8 檔＋新增 `docs.coverage`） | `compare`＋`provenance` **836 過 / 6 跳過**；`pls`＋`pls.narrative`＋`nca` **238 過**；`i18n`＋`errorCodes`＋`a11y.guard` **11 過**；`docs.coverage` **6 過** | ✅ **全綠，合計 1,091 過、6 跳過** |
| eslint | `npx eslint .` | ✅ **0 problems**（過程中曾因 en.js 的 `\"` 觸發 4 個 `no-useless-escape`，已修） |
| `vite build` | `npx vite build --outDir /tmp/...` | ✅ **614 modules transformed**（其後 lightningcss minify 失敗屬沙盒環境問題，依 §6.5 收尾清單第 5 條看 transformed 行即可） |
| **本機全套 13 檔＋新增 1 檔（Kevin 2026-07-29 執行 `跑A3c驗收.bat`）** | `npx vitest run` 全套 | ★ **14 檔全綠，1,258 過、6 跳過**（含 jsdom 5 檔） |
| 本機 eslint | `npx eslint .` | ★ **0 problems** |
| 本機 build | `npx vite build` | ★ **成功**（614 modules transformed、`built in 1.25s`；僅有既有的「chunk > 500 kB」提醒） |
| 行號引用重驗 | 四份文件共 **227 處**，以 difflib 對 HEAD 版建立 old→new 行號對映後整批重寫，6 處（改動行本身）以內容錨定手動重定位，最後隨機抽 14 處逐一印出當前檔案內容比對 | ✅ 全部命中預期片段 |

✅ **本機補跑已完成（2026-07-29，Kevin 執行 `跑A3c驗收.bat`）**：14 檔全綠、1,258 過、6 跳過、
eslint 0、build 成功。**交付三判準（數字對齊基準＋全套綠燈＋可獨立上線）全部滿足。**

★ 值得記的一件事：**A3a 與 A3b 的本機補跑各抓到一項問題，本批一次通過**。
差別在於本批**沒有新增 jsdom 測試**（新增的 UI 行為留待 A4 補測），
且新增的兩處 UI 改動（CTA 的 WarnBox、POS 全域表改印逐方程 $R^2$）都是既有元件的直接沿用。
⇒ 這不是「本批比較小心」，是**本批把風險延後了**——A4 補寫這兩條 UI 測試時仍須套用
「先在沙盒把選定的資料子集餵給引擎跑一次」的規矩。
本批動到 `src/lib/stats/pls.js`、`src/analyses/pls/Result.jsx`、`src/analyses/pls/apaNarrative.js`、
`src/i18n/**`（中英各兩處）、`tests/pls.narrative.test.js`（3 個 fixture 補欄位＋1 條新測試），
並新增 `tests/docs.coverage.test.js`。**jsdom 5 檔本來就只能在本機跑。**

★ **本批未新增 UI（jsdom）測試**——新增的 UI 行為（CTA 的 WarnBox、POS 全域表改印逐方程 $R^2$）
若要寫 jsdom 測試，依 A3a 的教訓必須先在沙盒把選定的資料子集餵給引擎跑一次；
本批決定期間沙盒連引擎測試都跑不動，**不冒險寫可能擋住 GitHub Pages 部署的測試**，
改列入 A4 的待辦。新增的**引擎層**測試則有一條：`pls.narrative.test.js` 的 R33-b 回歸鎖。

### 六、給 A4 的提醒

1. **`MAX_UNDOCUMENTED = 44` 是階段 A 的進度計**——A4 寫完（NCA 3 組、CFA 4 組、EFA 3 組、
   `lda_group3`）應可降到約 33。**寫完就調降**，否則棘輪失去意義。
2. **四條檢查習慣**（`roadmap-v2.md §6.5`）繼續跑，特別是新增的第 3 條（同一判斷有沒有兩套實作）
   與第 4 條（改口徑時區塊註解跟著改了嗎）。
3. `pls_fimix` **維持 pending**。`pls-fimix.md` 第 6 節已逐條寫明三重替代驗證
   **鎖得住什麼、鎖不住什麼**，並記下一條未執行的路徑：以 R `flexmix` 在
   「無截距 ＋ 本工具的 LV 分數」設定下對照 EM 本身（記為 E18，需本機 R）。
4. **沙盒效能不穩定時，adapter 逐值比對是可用的替代驗收**——它比 `compare.test.js` 更嚴格
   （比的是全部回傳鍵，不只 fixture 涵蓋的欄位），但**不能取代 UI 與行為測試**。

## 階段 A / A4（2026-07-29 同日，Opus 5）：NCA／LDA／CFA／EFA，7 份交付

★ **本批是階段 A 第一批離開 PLS 的文件，溯源結構與前三批相反**：
PLS 側 26 組是 tier B（沒有可執行的第三方數值來源），A4 的 11 組裡 **7 組是 tier A**
（`factor_analyzer`／`semopy`／`scipy` 直接產生基準）。
⇒ 紅隊的主戰場跟著移動：**13 項發現裡沒有一項是公式錯誤。**

### 一、獨立重寫（四支引擎全數通過，且每一支都刻意換路線）

依 `roadmap-v2.md §6.5` 的作業方式，重寫腳本**不入庫**——重寫的目的是驗證
「文件第 3 節的文字是否構成充分且正確的規格」，沿用舊腳本會弱化這個作用。

| 引擎 | 重寫路線（與 `generate_reference.py` 不同） | 結果 |
|---|---|---|
| **NCA** | ceiling zone 改以 **400 萬點網格數值積分**（原為封閉式分段矩形加總）、bottleneck 改**數值反查**、CR-FDH 改 `numpy.polyfit`（原為手寫正規方程） | 純量最大絕對差 **3.695e−5**，恰落在網格解析度 1.83e−5 的量級；$d_{CE}$ 差 1.055e−8、CR 四個量最大 1.137e−13；★ `peers_x`／`peers_y`／`x_required`／`p_ce` **四組逐值零差異** |
| **LDA** | 改用 **sklearn `LinearDiscriminantAnalysis(solver='eigen')`**（真第三方）取判別方向，再依 §3.3–3.6 的 SPSS 慣例換算；特徵值另以「判別分數的組間／組內平方和比」獨立求得（完全不碰特徵分解） | 11 組陣列最大絕對差 **1.288e−14**；★ **sklearn 自己的 `predict` 給出的再代入準確率與 fixture 逐位元相同（0.416666667）**；`sk.priors_` 確認為比例事前，與本工具口徑一致 |
| **CFA** | 改用 **scipy `L-BFGS-B`** 重新求 $F_{ML}$ 的極小（引擎用自寫 BFGS＋中央差分數值梯度，是完全不同的最佳化器）；另重跑 semopy 確認 fixture 可重現 | 與**引擎**差：$\chi^2$ 4.3e−9、TLI 逐位元相同、7 個標準化負荷最大 **6.4e−8**。與 **fixture（semopy）**差：$\chi^2$ 7.1044 vs 7.2248，比值 1.0169499 vs $60/59=1.0169492$ ⇒ **恰為 $N$ vs $N-1$ 慣例**。semopy 重跑差 1.3e−14 |
| **EFA** | numpy 主成分（`numpy.linalg.eigh`）＋**自寫 varimax**；另重跑 `factor_analyzer` | 13 個量最大絕對差 **4.998e−9**（殘差來自 fixture 的 communalities 存為 8 位小數） |

★ **重寫過程本身交出一個發現**：EFA 第一次重寫**漏掉 Kaiser normalization**，
`efa_pca_varimax_k3` 的負荷立刻差 **3.136e−2**、`absLoadingsSorted` 差 4.7e−3；補上後降到 5e−9。
規格文字（`efa.js:8–21` 的區塊註解與 `efa.md` §3.4）**確實寫了**這一步，是重寫者漏讀。
⇒ 這是**規格充分性的正面證據**，同時也量化了「這一步不是細節」。

### 二、★ 本批的兩類新發現

**(1) 「該擋沒擋」的失敗會偽裝成成功的報表**

這是 A1–A3c 沒出現過的形狀。`compare.test.js` 抓不到它，因為那些情境**根本沒有 fixture**。

| 編號 | 情境 | 修復前的報表長什麼樣 |
|---|---|---|
| **R40-i**（L3） | EFA，變項完全共線（實測：複製一欄） | $\chi^2$ 回 `Infinity` → `fmtNum` 印「—」；$p$ 回 0 → `fmtP` 印「< .001」⇒ **「球形檢定顯著，適合做因素分析」的綠燈**。同時 KMO 回 `null`，UI 兩處都寫 `result.kmo && (...)` ⇒ **整張卡片與統計量卡靜默消失** |
| **R40-h**（L3） | EFA，某一欄零變異 | Bartlett 的 df 虛胖（7 題實測 21，應為 15）、$p$ 系統性偏小；KMO `perVar` 出現 null 而 `overall` 照算；★ 當 $k$ 涵蓋到該欄自己的 $\lambda=1$ 特徵向量時，**那個死題目拿到 loading 1.000 / $h^2$ 1.000——在報表上看起來是全套最好的題目**（3 欄 $k=2$ 實測） |

★ **對照組**：同樣是多變量方法，LDA（`singularPooled`）、CFA（`sample-cov-not-pd`）、
NCA（`no-variation`）都硬擋。修復前**只有 EFA 放行**。

**(2) 防線的「漏收」比防線不存在更難發現**

| 編號 | 防線 | 漏收了什麼 |
|---|---|---|
| **R41**（L2） | `errorCodes.test.js` | 正規式為 `/'([A-Za-z][\w-]*)'/`，**只收該形狀的代碼**。含 `>` 或 `=` 的錯誤碼全部溜過——實測 **16 個**（`need-n>=5`、`each-group-needs-n>=2`、`need->=2-groups`…），兩份 i18n 全缺字串，使用者觸發時螢幕上直接看到程式碼，**而測試一路全綠** |
| **R49**（L1） | `docs.coverage.test.js` | `mentions()` 是寬鬆比對——基準鍵只要當作獨立字詞出現在第 6 節任何地方（含散文）就算涵蓋。`lda.md` §6 寫「base R 的 `manova()` …亦同」，使 **`manova`（屬 A6、尚未寫文件）被誤判為已涵蓋**，未涵蓋數少算 1 |

⇒ 兩條已寫成 `roadmap-v2.md §6.5` 的檢查習慣 5、6，供 A5／A6 沿用。

### 三、紅隊 13 項（無 L4）——10 修 3 記錄，1 項待裁決

**L3（3 項，Kevin 2026-07-29 當日核定）**：R40-h（EFA 零變異硬擋）、R40-i（完全共線的顯性化）、
R44（三組 NCA 的 source 字串與生成端註解停在「待抽驗」的舊狀態，比照 R36-d 完整重生）。

**L2 已修（7 項）**：R37-a（`need-n>=5` 顯示裸代碼）、R37-b／R38-e（listwise 剔除未揭露）、
R37-e（permutation 次數／種子／分母慣例未揭露）、R38-a（LDA 未標準化係數是孤兒）、
R38-b／c（符號任意性、事前機率慣例）、R39-a／b（CFA 未收斂與 SE 不可得未進 APA 句）、
R40-a～d（EFA 硬編中文、MSA 與 $|\mathbf R|$ 孤兒、$k<2$ 靜默不轉軸）、
R41（防線正規式放寬）、R42（NCA 判準抽成 `ncaVerdict`）、R43（APA 句補限制子句）。

**書面記錄（3 項）**：R45（LDA 的 `structureCoefficientsTotal` 孤兒——SPSS／R `MASS` 報的都是
組內合併版，並列易讓使用者拿錯）、R46（CFA 的 `chi2Null`／`dfNull`／`fitFunction` 孤兒——屬中介量）、
R48（Box's M 的 $p\le.001$ 三處實作，但門檻已寫在使用者可見文字裡）。

**R47（L2，Kevin 2026-07-29 裁決：修呈現層，回傳契約留階段 B）**：
CR-FDH 的線方程式零 UI；`cr_fdh.bottleneck` 實測與 CE 版**逐字元相同**；
瓶頸表未說明讀的是哪一條 ceiling。★ 改用 CR 線反查逐水準差最大 **11.61**（$x$ 全距 73.4，約 16%），
30%／40% 兩個水準方向相反——**不是捨入等級的差異**。
⇒ ✅ 已修：ceiling 表新增「Ceiling 方程式」欄、瓶頸表新增來源說明（含量化差異）；
⬜ 移除／改名 `cr_fdh.bottleneck` 屬回傳契約變更，比照 A3c 的 R35-b 留階段 B，
本批以**現況鎖**（斷言兩份 bottleneck 序列化後相同）確保日後改動會被測試提醒。

### 四、★ 三項「無基準可鎖」的誠實記錄

這三項不是 bug，是**基準覆蓋的缺口**，已逐一寫進對應文件的第 6 節：

1. ★ **LDA 的事前機率慣例分歧沒有任何基準鎖得住**：`lda_group3` 的三組**各 20 人**，
   ⇒ 比例事前 $n_g/N$ 恰等於等機率事前 $1/k$，兩種口徑在這份資料上**完全同值**。
   R38-c 的說明正確，但「本工具與 SPSS 會不同」這件事從未被驗證過。與 A1 的 R9、R20 同型。
2. ★ **CFA 的 SRMR 與標準誤零第三方對照**：`cfa_2factor` 的 5 欄不含 SRMR，
   Hessian 反矩陣路徑與 delta method 還原亦完全未被逐值驗證。
   ★ 且**本工具從未與 lavaan 對照過**——lavaan 與本工具的 $\chi^2$ 慣例相同，
   是成本最低、價值最高的一次待辦抽驗（Kevin 本機 R 即可）。
3. ★ **EFA 的逐變項 MSA 與 $|\mathbf R|$ 零基準**：R40-b／R40-c 新增顯示，
   但 `compare.test.js` 不比對它們。**EFA 亦從未與 SPSS 或 R `psych` 對照過**。

### 五、驗收

- 沙盒 **11 檔全綠**（新增 `tests/a4.behavior.test.js` 30 條）
- ★ **R44 的完整重生驗證**：83 組鍵集合相同、**只有 `nca_ce_fdh`／`nca_cr_fdh`／`nca_bottleneck`
  三組的 `source` 有差異**、**values 零組有差異（逐位元不變）**、`datasets.json` 不變
- `MAX_UNDOCUMENTED` **44 → 36**（★ 真實值；誤判下會是 35，見 R49）
- `MAX_PENDING` 維持 **2**、基準組維持 **83**
- ⬜ **Kevin 本機待補跑**：`跑UI測試.bat`（jsdom 5 檔）＋ `npm run lint` ＋ `npm run build`

### 六、給 A5 的提醒

1. **`MAX_UNDOCUMENTED = 36` 是階段 A 的進度計**。A5 涵蓋約 19 組（三種 t 檢定、ANOVA 家族、
   無母數、$z$ 檢定、卡方與 Fisher），寫完應可降到約 17。**寫完就調降。**
2. ★ **六條檢查習慣**（`roadmap-v2.md §6.5`）——A4 新增的第 5、6 條特別適用於 A5：
   推論統計的錯誤碼最多（R41 的 16 個裡有 13 個屬 A5／A6 範圍，已提前補齊 i18n），
   且「該擋沒擋」在小樣本、零變異、全部並列這些情境上最容易發生。
3. ★ **A5 全屬 tier A**（scipy／statsmodels／pingouin 直接產生基準）。
   ⇒ 預期發現的分布會更接近 A4 而非 A1–A3：**慣例分歧與可見性，而非公式錯誤**。
   特別注意 Mann-Whitney 的 $U$ 慣例、Levene 的 center、SPSS 與 JASP 分歧處**兩邊都要記**（§0 規範）。
4. **R47 的回傳契約部分（`cr_fdh.bottleneck` 複本）留階段 B**，已加現況鎖；階段 B 動 NCA 回傳結構時要一併處理並改文件。

## 階段 A / A5a（2026-07-29 同日，Opus 5）：t 檢定與 ANOVA 家族，7 份交付

★ **本批是階段 A 第二個抓到 L4 真 bug 的批次**（前一個是 A1 的 R6）。
與 A4 的結論相反——A4 的 13 項發現無一落在數值本體，A5a 卻在數值本體上抓到一個
**會讓 $p$ 值在 .05 兩側翻面、且可達性極高**的錯誤。

### 一、獨立重寫（七支全數通過，且每一支都不呼叫產生基準的那個函式）

| 引擎 | 重寫路線 | 結果 |
|---|---|---|
| t 檢定 ×3 | 手算 Welch–Satterthwaite df 與三種 Cohen's $d$ 的分母（只借 `scipy.stats.t.sf` 查尾機率） | **14 欄逐位元相同（0.000e+00）** |
| 單因子 ANOVA | 手算 SS 拆解與加權總平均，**不用 `f_oneway`** | 9.095e−13 |
| 雙因子 Type III | 自建效果編碼（$-1/0/1$）設計矩陣＋`numpy.linalg.lstsq` 模型比較，**不用 `anova_lm`** | 2.615e−12 |
| ANCOVA | 自建 dummy 設計矩陣＋模型比較，**不用 pingouin** | 4.547e−13 |
| 重複量數 | 自建 Helmert 正交對比、由 $S$ 求 $W$ 與 $\varepsilon_{GG}$，**不用 pingouin** | 2.387e−12（Mauchly 兩欄**逐位元相同**） |
| 混合設計 | 手算 split-plot 五段拆解與**兩個不同的誤差項** | 1.137e−13 |
| **Tukey HSD** | ★ **對學生化全距分布直接做雙層 Gauss-Legendre 數值積分** | ★ **這一支抓到了 R50** |

### 二、★ R50（L4）：Tukey HSD 的 $p$ 值在 df ≥ 100 系統性錯誤

**成因**（`ptukey.js` 舊版 86–91 行）：外層對 $s=\chi_\nu/\sqrt\nu$ 的積分，
上限設為 `max(5, √df · 1.5)`（**隨 df 外擴**），節點**固定 200**；
而該密度的峰寬約 $1/\sqrt{2\nu}$（**隨 df 內縮**）。三件事同向惡化：

| df | 積分上限 | Simpson 步長 | 峰寬 | 步長/峰寬 | 誤差 |
|---|---|---|---|---|---|
| 57 | 11.32 | 0.057 | 0.094 | 0.60 | 1.0e−6 |
| 80 | 13.42 | 0.067 | 0.079 | 0.85 | 3.3e−4 |
| **100** | 15.00 | 0.075 | 0.071 | **1.06** | 6.6e−3 |
| 120 | 16.43 | 0.082 | 0.065 | 1.27 | 3.0e−2 |
| 300 | 25.98 | 0.130 | 0.041 | 3.18 | 3.3e−1 |
| 999 | 47.41 | 0.237 | 0.022 | 10.60 | **7.6e−1** |

★ **後果是判讀翻面，不是小數點誤差**：$k=3,q=3.5,\mathrm{df}=120$ 印 $p=.0686$（不顯著），
正確 $.0388$（**顯著**）；$\mathrm{df}=999,q=4.5$ 印 $p=.786$，正確 $.0043$；
$\mathrm{df}=150$–$500$ 的大 $q$ 直接回 **0**，報表印 `p = .000`。

★ **可達性極高**：`oneWayAnova/compute.js:51` 每次單因子 ANOVA **無條件**跑 Tukey，
$\mathrm{df}=N-k$，三組時 **$N\ge103$ 即進入失準區**——完全是一般問卷樣本。
且 `oneWayAnova/Narrative.jsx:33` 用 `tukey.filter(p => p.p < 0.05)` 決定
**APA 句要點名哪幾對** ⇒ 錯的 $p$ 直接改變使用者貼進論文的結論。

★ **為什麼三道防線都沒抓到**：唯一的基準 `tukey_hsd` 用 `datasets.json:main`（$N=60$、$k=3$）
⇒ **$\mathrm{df}=57$，恰好是失準區前的最後一個安全點**；
而 `compare.test.js` 早已把該三欄的容差放寬到 **5e-4**，註解寫「ptukey 雙層 Simpson vs scipy；
絕對差 <1e-6」——**那句話只在 $\mathrm{df}=57$ 成立，而沒有人問過其他 df**。
**防線正好蓋在唯一安全的那一點上。**

**處置（Kevin 2026-07-29 核定，三件）**

1. **修積分**：區間改為跟隨密度峰寬 $s\in[\max(0,1-12\sigma),\,1+12\sigma]$、$\sigma=1/\sqrt{2\nu}$；
   節點 200 → 400；移除 `df ≥ 1000 走漸近形式`的捷徑（修後不需要，且它本身在 df=999/1000 造成跳斷）
2. **新增基準組 `tukey_ptukey_grid`**：以 `scipy.stats.studentized_range.sf` 產生
   $k\in\{2,3,4,6,10\}\times\mathrm{df}\in\{5,20,57,100,120,200,500,999\}\times q\in\{1.7,3.5,4.5\}$
   共 **120 欄**，直接打 `ptukeyUpper`、**不經過任何資料集**。基準組 83 → **84**，tier A / verified
3. **收緊容差**：`compare.test.js` 的 tukey 三行放寬刪除，改回 `DEFAULT_TOL`（1e-6）

**驗證**：修後 **896 個格點**（$k$ 7 值 × $\mathrm{df}$ 1–2000 共 16 值 × $q$ 8 值）
對獨立的雙層 Gauss-Legendre 積分，**最大絕對差 5.561e−7、零個超過 1e−6、零個 .05 判定翻面**。
既有 `tukey_hsd` 三欄的相對差由 1.3e−6 / 1.3e−4 / 8.2e−6 降到 **2.8e−11 / 3.6e−9 / 1.6e−10**。

★ **順帶一項第三方之間的分歧**：`statsmodels.libqsturng.psturng`（查表插值）與
`scipy.tukey_hsd` 在 $p\approx.46$ 差 **1.9e−3**；直接數值積分與 scipy 差 1.3e−14。
⇒ 「第三方實作 ≠ 可照抄的數字」再一次得到印證——本組的權威只能是 scipy 與直接積分。

### 三、另外三項（R51–R53）

- **R51（L2）t 檢定零變異時失敗偽裝成成功**：`zeroVarianceWarning` 是孤兒旗標。
  實測成對 t（差值全同）→ $t=-\infty$、$p=0$、$d=-\infty$，而
  `fmtNum(±∞)` 回「—」、`fmtP(0)` 回「< .001」、`toneForP(0)` 回**綠燈**
  ⇒ 報表顯示「$t=$ —、$p<.001$（綠）、$d=$ —」，APA 句照樣寫「達顯著差異」。
  ★ 與 A4 的 R40-i **同型且共用同一成因**（格式化函式對發散值的處理）。
  已修：警告框＋抽掉燈號＋APA 句警語，引擎回傳值不變。
- **R52（L2）雙因子 ANOVA 完全沒有前提檢核**：七支裡唯一的空白，而兩支現成函式早就被另兩支使用。
  已補**細格層** Levene（雙因子的誤差項是細格內變異）＋**全模型殘差**的 Shapiro-Wilk。
- **R53（L1）混合設計缺 Box's M**：正確的前提是各組受試者內共變異矩陣相等，而非單變量 Levene。
  `lda.js:545–576` 已有可複用實作。Kevin 裁決書面記錄（E37）。

### 四、★ 三項「無基準可鎖」的誠實記錄

1. ★ **雙因子只有平衡設計被覆蓋**：`datasets.json:main` 的 2×3 六個細格各 10 人 ⇒ 完全平衡，
   而 **Type I／II／III 在平衡設計下完全相同** ⇒「本工具用的是 Type III」**沒有任何基準鎖得住**
   （與 A4 的 LDA 事前機率同型）
2. ★ **混合設計是七組裡基準覆蓋率最低的**：6 欄只鎖三個 $F$ 與三個 $p$；
   SS 五段拆解、兩個誤差項的 MS、Mauchly、三種 $\varepsilon$、partial $\eta^2$ **全部沒有基準**，
   而 §3.3 那一整段（$\nu=N-a$ 與組內彙集 $S$）正是最容易寫錯的部分
3. ★ **單因子 ANOVA 的 9 欄裡只有 2 欄有第三方對照**：`scipy.f_oneway` 不回傳 SS 與效果量，
   其餘 7 欄的基準是 `generate_reference.py` 的 numpy 手算 ⇒ **實質上是 tier B 的性質，掛在 tier A 的組底下**。
   ★ Kevin 本機的 R `aov()` 可一次補齊，成本極低

### 五、驗收

- 沙盒 **12 檔全綠**（新增 `tests/a5a.behavior.test.js` 15 條，含**單調性**與 **df 方向連續性**兩條結構鎖）
- 基準組 **83 → 84**；`MAX_PENDING` 維持 **2**；`MAX_UNDOCUMENTED` **36 → 27**
- ★ 重生驗證：新增 `tukey_ptukey_grid` 後，**83 組既有基準的 `source` 與 `values` 逐位元不變**
- ⬜ **Kevin 本機待補跑**：`跑UI測試.bat`（jsdom 5 檔）＋ `npm run lint` ＋ `npm run build`

### 六、給 A5b 的提醒

1. ★ **只有一個基準點的方法，要對「參數空間」掃描。** R50 的證據全部不在資料集裡，
   而在 **df 這個參數方向**上。A5b 的 Mann-Whitney（常態近似 vs 精確法）、
   Wilcoxon（並列與零差值的處理）、卡方（Yates 校正）都有同樣的形狀——
   **先問基準覆蓋的是參數空間裡的哪一點。**
2. ★ **`compare.test.js` 裡放寬過的容差是紅旗。** A5b 範圍內至少已知兩條：
   `mann_whitney_small.pExact`（JS 無精確法）與 `ks_lilliefors.p`（近似法不同）——
   **兩條都要當成「有一個沒查清楚的差異」重新檢視**，而不是當成已結案。
3. **`MAX_UNDOCUMENTED = 27` 是進度計**。A5b 涵蓋 8 組，寫完應降到 **19**。
4. **A5b 全屬 tier A**，但 A5a 已證明 tier A 不等於安全——`tukey_hsd` 也是 tier A。
   tier 說的是「基準值的來源」，不是「引擎的實作對不對」。

---

## 階段 A / A5b（2026-07-30，Opus 5）：類別與無母數，6 份交付

**範圍**：`chi-square`、`fisher-exact`、`z-prop`、`mann-whitney`、`wilcoxon-signed-rank`、
`kruskal-wallis`（含 Dunn）——6 份文件、8 組基準 ＋ 本批新增的 `kruskal_dunn`。

★ **本批無 L4。** 也是階段 A 掃描規模最大的一批（累計逾 **75,000 個格點**）而**沒有**抓到數值錯誤。
⇒ 這是掃描該有的兩種結果之一：**它不保證找到 bug，它保證你不再需要猜。**

### 一、獨立重寫（六支全數通過，且每一支都不呼叫產生基準的那個函式）

`mannwhitneyu`／`wilcoxon`／`kruskal`／`chi2_contingency`／`fisher_exact`／`proportions_ztest`
**一個都沒碰**。尾機率改走 **mpmath 的高精度 `erfc` 與正規化不完全 gamma**（`mp.dps = 40`），
Fisher 走 **mpmath 精確有理數 `binomial`**——與引擎的 Numerical Recipes 路徑完全無關：

| 方法 | 掃描規模 | 重寫路線 | 最大相對差 |
|---|---|---|---|
| Mann-Whitney | 1,728 情境（$n_1,n_2$ 3–14 × 三種並列強度 × 4 重複） | 自行實作平均秩＋並列校正＋CC | **4.845e−13** |
| Wilcoxon | 1,197 情境（$n$ 4–30 × 零差值 0–5 × 三種並列強度） | 同上；另驗 `nDropped` 1,197 次全對 | **1.318e−12** |
| Kruskal-Wallis | 225 情境（$k$ 2–6 × 每組 $n$ 5 值 × 三種並列強度） | 手算 $H$、並列校正、$\eta^2_H$ | **3.708e−13**（$H$ 逐位元相同） |
| 卡方 | 1,350 張表（含 0 格、期望次數 < 1、最大 $4\times5$） | 手算 $E$、$\chi^2$、Yates、$V$ | **4.876e−13** |
| Fisher exact | 1,621 張表（$N\le3000$） | ★ mpmath 精確有理數列舉 | **1.413e−10** |
| z 比例 | 5,290 格點（單樣本 $x$ 全枚舉 ＋ 雙樣本 625 組） | 手算兩套分母慣例 | $z$ **3.6e−16**；$p$ 見 §三 |
| **Dunn** | 81 情境 × 3–10 對 | ★ 對 **scikit-posthocs** 逐值 | **2.665e−10** |

### 二、★ 窮盡掃描：兩支的精確法缺口被量化（R57）

無並列時，MW 的 $U$ 與 Wilcoxon 的 $W^+$ 的精確分布**只依賴樣本數**，
所以能用動態規劃建出完整分布、**對統計量全枚舉**——不是抽樣，是窮盡：

| 方法 | 格點數 | .05 判定翻面 | ★ 危險方向（近似顯著、精確不顯著） | 最大絕對差 |
|---|---|---|---|---|
| Mann-Whitney（$n_1\le n_2$，3–25，$U$ 全枚舉） | **54,878** | 110（0.20%） | ★ **0** | 0.0375 |
| Wilcoxon（$n$ 4–40，$T$ 全枚舉） | **11,507** | 32（0.278%） | ★ **0** | 0.0488 |

⇒ **缺 exact 法只會少抓到極少數真效果，不會製造假效果。** 與 R50 恰好相反的結論：
R50 的唯一基準落在安全點上、危險就在旁邊；本批的基準所在區域**沒有隱藏的危險方向**。

★ **附帶發現**：Wilcoxon 的翻面在 **$n=40$ 仍持續出現**（$n=10,13,14,15,18,19,24,26,27,30,32,35,36,38,40$
各有一組），不像 MW 集中在極小樣本 ⇒ Notes 裡「$n\ge10$ 常態近似已足夠」的暗示對本方法要打折（E63）。

### 三、★ R55（L3，跨模組 8 處）：雙尾 $p$ 在 $|z|$ 大時塌成 0

**成因**　`normalCdf` 的註解明寫「尾端以 `gammq` 計算，保持相對精度」——
而**每一個呼叫端**都寫成 `2 * (1 - normalCdf(|z|))`，這個 $1-(1-\text{tail})$ 的減法把精度整個抵消掉。

| $\|z\|$ | 正確 $p$（雙尾） | 引擎回傳 | 相對誤差 |
|---|---|---|---|
| 4.0 | 6.334e−05 | 6.334e−05 | 3.6e−15 |
| 6.0 | 1.973e−09 | 1.973e−09 | 5.6e−08 |
| 7.0 | 2.560e−12 | 2.560e−12 | 4.1e−05 |
| 7.5 | 6.382e−14 | 6.373e−14 | 1.4e−03 |
| **8.5** | **1.896e−17** | **0（恰好）** | **1.0** |
| 12.0 | 3.553e−33 | 0（恰好） | 1.0 |

★ **可達性**：單樣本比例 $n=8$、$x=0$、$p_0=0.9$ 就給 $|z|=8.49$，報表印 `p = .000`。
邏輯迴歸與 Cohen's kappa 在效果強時也輕易越過。

★ **為什麼判 L3 而非 L4**：5,240 個 z 比例格點 ＋ 1,728 個 MW 格點掃描，**零個 .05 判定翻面**；
受影響區間全落在 $p<10^{-10}$，而 APA 一律呈現 $p<.001$。與 R50 不同——R50 在可達的 df 上
直接把 $p$ 翻到 .05 的另一側。**Kevin 2026-07-30 核定按 L3 處理、8 處一次改乾淨。**

**處置**：`pvalue.js` 新增 `normalSf(z)`；A5b 內 4 處（MW／Wilcoxon／Dunn／zProp）
＋範圍外 4 處（`kappa.js`、`logisticRegression.js`、`normality.js`）全改；
★ **移除 `cfa.js` 自帶的 `normalCdfApprox`**（A&S 7.1.26，絕對誤差 1.5e−7）——它是同一件事的第二套實作，
且其註解寫「避免相依 pvalue 的可選 import」而該檔第 37 行本來就已 import `pChiSq`。
重生後 84 組既有基準**逐位元不變**（既有 fixture 的 $|z|$ 皆在安全區）。

### 四、★ R54（L3）：效果量的名稱錯誤——一個數值比對永遠抓不到的錯

**發現**　KW 的效果量在**三處**標成 $\varepsilon^2$（UI 欄位、公式說明、APA 句），
而公式 $(H-k+1)/(N-k)$ 經 **rstatix 官方文件**核實是 `eta2[H]`（$\eta^2_H$，偏誤校正）；
真正的 rank $\varepsilon^2$ 是 $H/(N-1)$（**effectsize 官方文件**），實測最大差 **0.376**。

★ **兩層後果**：
1. **名稱錯** ⇒ 使用者把 $\eta^2_H$ 當 $\varepsilon^2$ 貼進論文，審稿人用 effectsize 複算對不上
2. ★ **值域錯** ⇒ 偏誤校正使原式可為負，**225 情境中 111 個（49%）為負、最小 −0.375**，
   報表印出「$\varepsilon^2=-0.278$」這種依定義不可能的值。rstatix 明文 floor 到 0，本工具沒有

★ **這是本批最值得記住的一件事**：`compare.test.js` **永遠不會抓到它**——
`generate_reference.py` 與 `nonparametric.js` 都算 $(H-k+1)/(N-k)$、都叫它 `epsilon2`，
比對只會說「兩邊一致」。**基準端與實作端犯的是同一個命名錯誤。**

**處置**：改名 `eta2H` ＋ `Math.max(0,·)`（另存 `eta2HRaw` 供除錯）；i18n 三處同步（zh／en）；
`generate_reference.py` 欄名與 floor 同步；provenance 的 `authority` 改為
「scipy（H、p）＋ rstatix eta2[H] 定義（效果量）」。重生後其餘 84 組逐位元不變。

### 五、★ R56（L3）：Dunn 事後比較補上第一組基準

Dunn 有引擎實作、有 UI 表格、APA 句還會**點名哪幾對顯著**，而 `compare.test.js` 一欄都沒對
——一個會直接進論文結論的數字，零回歸防線。
新增 `kruskal_dunn`（6 欄，權威 **scikit-posthocs `posthoc_dunn`**），
另在沙盒對 81 情境（$k$ 3–5 × 每組 $n$ 5/10/20 × 三種並列強度）比對最大相對差 **2.665e−10**。
同批把 `cramerV` 由本專案手算改為 **scipy `contingency.association`**（300 組隨機表最大相對差 1.9e−16，
數值零變動）。**基準組 84 → 85。**

### 六、R57（L2 三項，當場修）

| 項 | 內容 | 修法 |
|---|---|---|
| (a) | i18n `continuityNote` 宣稱「與 **SPSS** / R wilcox.test 預設一致」——**SPSS 的 Asymp. Sig. 不套 CC**；且 **R 預設在 $n<50$ 無並列時走精確法**而非套了 CC 的近似法（R 4.6.0 官方手冊，已實際查閱） | 兩語同步改寫，並標明證據等級（R 側查官方手冊；SPSS 側為第三方教學文件，IBM 官方文件未取得） |
| (b) | `formulaMWZ` 顯示 `z = (U₁ − μ) / σ`，**沒寫出實作實際扣掉的 0.5** | 改為 `z = (|U₁ − μ| − 0.5) / σ，含連續性校正與並列校正` |
| (c) | 效果量分級函式**雙實作**：`effectKey`（r）在 `nonparametric/{Result,Narrative}.jsx` 各一份且**只有三級**，而同模組 Notes 宣告四級 ⇒ 使用者永遠看不到「微弱」；`cramerInterpretKey`（V）在 `chiSquare/{Result,Narrative}.jsx` 各一份 | 收斂為 `src/lib/format.js` 的 `effectBandR`／`effectBandV`（共用 Cohen 四級），四處改為 import，i18n 的 `np.result.effect` 補 `trivial` 鍵 |

### 七、★ 容差重驗：範圍內 5 條，4 條是遺留的假放寬

A5a 的習慣 8（「放寬過的容差是紅旗」）在本批的實際收成：

| 條目 | 原容差 | 原註解 | 實測相對差 | 處置 |
|---|---|---|---|---|
| `mann_whitney_small.p` | 1e-4 | 「小樣本常態近似的邊界行為」 | **6.9e−14** | ✅ 刪除放寬 |
| `mann_whitney_ties.p` | 1e-4 | ★ **無註解** | **6.0e−14** | ✅ 刪除放寬 |
| `zprop_one.p` | 1e-4 | ★ **無註解** | **3.1e−13** | ✅ 刪除放寬 |
| `zprop_two.p` | 1e-4 | ★ **無註解** | **1.1e−13** | ✅ 刪除放寬 |
| `mann_whitney_small.pExact` | SKIP | 「JS 尚無 exact 法」 | — | ✅ 註解升級為帶證據的量化說明（見 §二） |

★ 四條都是 **2026-07-02 修 `erf` 之前的遺留**。⇒ 給 A6 的教訓不是「放寬都是 bug」也不是
「放寬都有理由」，而是 **去量**：本批 5 條裡 4 條是假放寬、1 條是真缺口。

### 八、★ 三項「無基準可鎖」的誠實記錄

1. ★ **Wilcoxon 的唯一基準落在最乾淨的一點上**（$n=60$、零並列、零零差值）：
   `wilcox` vs `pratt` 的慣例分歧（實測最大 $|\Delta p|$ **0.444**、翻面率最高 **14.5%**）
   與三條退化路徑（全零差值、$\sigma=0$、$n=1$）**全部無入庫基準**。
   ★ **這是 R50 的形狀**；所幸掃描顯示無危險方向，但缺回歸防線（E62）
2. ★ **$\eta^2_H$ 仍是本專案依定義自算，非 rstatix 實跑**：公式歸屬已由官方文件核實，
   但數值本身沒有第三方產生方 ⇒ 仍是 §0 所指的形狀（E67）
3. ★ **卡方適合度檢定零基準**（引擎與 UI 都在線）、**Cohen's $h$ 零基準**、
   **MW／Wilcoxon 的效果量 $r$ 零基準**（pingouin 報的是 RBC 與 CLES，非 $|z|/\sqrt N$）（E42、E51、E55）

### 九、驗收

- 沙盒 **12 檔全綠、1,303 過 / 6 跳過**（新增 `tests/a5b.behavior.test.js` **32 條**）：
  `pls` 198、`compare` 961（6 skip）、`a4.behavior` 33、`a5b.behavior` 32、`pls.narrative` 24、
  `nca` 16、`a5a.behavior` 15、`provenance` 7、`docs.coverage` 6、`i18n` 5、`errorCodes` 3、`a11y.guard` 3
- `npx eslint`（本批改動的 18 個檔案 ＋ `src/lib/` `src/i18n/` `src/analyses/{nonparametric,chiSquare}/` `tests/` 全目錄）**0 problems**
  ★ eslint 抓到一個測試抓不到的錯：`nonparametric/Narrative.jsx` 的 import 別名漏了
  （`effectBandR` 未別名為 `effectKey`）⇒ 該檔只被 jsdom 測試碰到，非 jsdom 那 12 檔全綠也不會發現。已修
- `vite build` **615 modules transformed**（與 A5a 相同），產物 91 KB CSS ＋ JS chunk 正常產出。
  ★ **但沙盒的 `vite build` 無法跑完 CSS 壓縮**：`node_modules` 只裝了
  `lightningcss-win32-x64-msvc`（Kevin 的 Windows 端安裝），缺 Linux 原生二進位 ⇒
  `[lightningcss minify] Cannot find module '../lightningcss.linux-x64-gnu.node'`。
  這與本批改動無關（未動任何 CSS／tailwind／vite 設定）；以 `cssMinify: false` 驗證 JS 側完整通過。
  **完整 build 需 Kevin 本機確認**
- ★ **行號重驗（內容錨定法，放在所有程式碼修改之後）**：六份文件共 **192 處**行號引用。
  第一輪抓到 **3 處超出檔案長度或指向空白行**、另有一批因加註解而位移（`zProp.js` 與
  `nonparametric.js` 都因 R54／R55 的說明註解使後段行號下移）⇒ 全部依內容錨定重新定位，
  第三輪 **192 處零異常**。另對 111 個關鍵錨點做「該行必須包含指定字串」的硬驗證，亦零異常
- 基準組 **84 → 85**；`MAX_PENDING` 維持 **2**；`MAX_UNDOCUMENTED` **27 → 18**（實際值）
- ★ 重生驗證：新增 `kruskal_dunn`、`epsilon2`→`eta2H` 改名、`cramerV` 換第三方來源後，
  **其餘 84 組既有基準的 `values` 逐位元不變**
- `generate_reference.py` 新增相依 **scikit-posthocs**（handoff §3 套件清單已同步）
- ⬜ **Kevin 本機待補跑**：雙擊 **`A5b本機驗收.bat`**（一次跑完整測試 ＋ lint ＋ build，末尾印三個回傳碼）
  ——本批動到 `src/lib/stats/` 7 檔、`src/analyses/nonparametric/`、`src/analyses/chiSquare/`、
  `src/lib/format.js` 與**兩份 i18n**

### 十、給 A6 的提醒

1. ★ **欄位的名稱也要紅隊，不只值**（新習慣 10）。A6 有 $\eta^2$、$\omega^2$、$\alpha$、ICC、$\kappa$、
   偏態峰度一整批效果量與描述量，每一個都要問：**這個符號在文獻上是這個公式嗎？值域是什麼？工具守住了嗎？**
   R54 證明了基準端與實作端可以一起錯而測試全綠。
2. ★ **數值小工具也會有第二套實作**（新習慣 9）。`cfa.js` 養了一套常態 CDF；
   A6 的偏態／峰度、四分位數、Fisher $z$ 變換都是容易就地重寫的小工具 ⇒ 先 grep。
3. ★ **A6 範圍內的 TOL／SKIP 條目較多**（`ks_lilliefors` 兩條、`shapiro_wilk.p`、`logistic_regression.p_x1`），
   而本批實績是「5 條裡 4 條是假放寬」⇒ 逐條去量，不要預設立場。
4. ★ **`MAX_UNDOCUMENTED = 18` 應在 A6 歸零**。A6 涵蓋的就是剩下的全部 18 組。
5. **`levene_median` 與 `levene_mean_spss_default` 兩組並存**，正好是慣例分歧最好的教材——
   本專案罕見地把兩個慣例都建了基準，第 3 節可以直接示範「本工具採哪一個、為什麼、另一個差多少」。

---

## R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）：五項銷帳、兩項新開出

**入口**：`scripts/validation/05_a5b_r_audit.R`（雙擊 `跑R抽驗.bat`），六段全數執行成功。
**設計原則**：只針對三類「Python 側撐不住」的項目——
(A) 引擎有算、UI 有呈現，但 `reference.json` 零欄對照；
(B) fixture 的值是 `generate_reference.py` 手算，與 JS 出自同一次理解（§0 品質規範要防的那一類）；
(C) 方法文件寫了「與 R 的慣例差異」，但那句話從未實跑核實。

### 一、乾淨銷帳（五項）

| # | 項目 | 類 | 結果 |
|---|---|---|---|
| 1 | **EFA 逐變項 MSA ＋ $\|\mathbf R\|$** | A | ★ `psych::KMO()$MSAi` = 0.699319／0.748324／0.757158／0.792030／0.749689／0.639829，**與本工具六位小數全對**；`det(cor())` = 0.2160639142 亦相符。Bartlett 與六個特徵值逐位相符。**兩個零基準量結案** |
| 2 | **單因子 ANOVA 的 7 欄手算值** | B | ★ base R `aov()`：ssBetween 503.2381071、ssWithin 2787.1373、ssTotal 3290.375407、$\eta^2$ 0.1529424594、$\omega^2$ 0.1214168084 —— **逐項相符**。「9 欄裡有 7 欄是本專案手算」這個 §0 型弱點結案 |
| 3 | **Tukey 對 R `ptukey()`** | C | ★ 5 個格點（含 R50 失準區 df = 100／120／999）相對差 **1.6e−10 ~ 3.9e−08**；`TukeyHSD()` 三對比較逐值相符。⇒ **`ptukey.js:18` 的「對標 R::ptukey()」終於有證據**，且 R50 的修正經獨立 Fortran 實作確認 |
| 4 | **R54 的命名判斷** | B | ★ `effectsize::rank_eta_squared` = 0.13（本工具 0.126471）、`rank_epsilon_squared` = 0.16（$H/(N-1)=0.156082$）⇒ 確為兩個不同的量，**E67 結案**。★ 但只印 2 位小數，僅足以確認「是哪一個量」，不足以逐值驗證 |
| 5 | **prop.test／chisq.test／fisher.test 的 $p$** | C | 全部對上：單樣本 `correct=FALSE` 的 $X^2$ = 2.4 = $z^2$、$p$ = 0.1213；雙樣本 $X^2$ = 1.1111 = $z^2$、$p$ = 0.2918；Wilson CI 對上「R 無校正」那一行；卡方 17.376／15.271 與 Cramér's V 0.538138 全對；Fisher 的 $p$ = 6.318e−05 對上 |

### 二、★ R58（L2）：A5b 的「危險方向為 0」只在無並列時成立

**這是我的敘述錯誤，不是實作退步。** 引擎的數字從頭到尾都是「常態近似 ＋ CC ＋ 並列校正」
這個方法的正確結果（與 scipy 逐值相符至 6e−14）。錯的是我把**無並列**的結論寫成了通則。

A5b 的窮盡枚舉之所以可行，正是因為無並列時精確分布只依賴 $(n_1,n_2,U)$。
而 R 4.6 對**有並列**的情形**不是**退回常態近似，是用 Streitberg–Röhmel 位移演算法算**條件精確分布**：

| | 本專案 `ties` 基準組（$n=12/12$、重度並列） |
|---|---|
| R 條件精確 $p$ | **0.022329** |
| 沙盒獨立列舉 $\binom{24}{12}=2{,}704{,}156$ 種分組重算 | **0.022329**（與 R 逐位一致 ⇒ 不是 R 的實作特性，是分布本身） |
| 本工具常態近似 | **0.018117** ⇒ ★ **偏寬鬆** |

**補掃 900 個有並列情境**（每組 $n=5..9$ × 值域 2–4 個相異值 × 60 重複）：

| 指標 | 結果 |
|---|---|
| 近似 $p$ < 精確 $p$（anti-conservative） | **703 / 900 ＝ 78.1%** |
| ★ .05 判定翻面 | **10 例（1.1%），全部是「近似偽顯著」** |
| 最糟一例 | 近似 $p=0.0447$（報顯著）vs 精確 $p=0.1026$（不顯著），**差 2.3 倍** |
| 近似 − 精確 的最大值 | $+0.1937$ |

**處置（Kevin 2026-07-30 重新裁決）**：文件全面更正（`mann-whitney.md` §6 拆成兩道 ＋ §8 新增 R58、
`compare.test.js` 的 SKIP 註解、`docs/methods/README.md`、`roadmap-v2.md`、本檔）；
★ **UI 加強警告**——`smallSampleWarning && tieCorrection` 時多顯示一句明示
「本工具報的是常態近似 $p$，這個情形下它可能偏小；SPSS 與 R 的精確法會給較大的 $p$」
（i18n 新增 `smallSampleTiesNote`，zh／en 同步）；`a5b.behavior.test.js` 32 → 36 條。
實作條件精確法維持 **backlog P2**（屬新功能）。

### 三、★ R59（L3，未結案）：CFA 的 loading 標準誤對不上 lavaan

| 層次 | 結果 |
|---|---|
| 標準化負荷（6 個）＋ 因子相關 | ✅ **完全吻合**（0.698／0.788／0.665／0.669／0.648／0.690、$\phi_{12}=0.452$） |
| 未標準化負荷 | ★ 差一個**固定比例** $\sqrt{60/59}=1.008439$ ⇒ 與 $\chi^2$ 同源，屬慣例、可解釋 |
| ★ 標準誤與 $z$ | ★★ **差約 4% / 3.5%**（i1：se 0.147094 vs ≈0.1406；$z$ 5.102 vs **5.290**）——**不是尺度可解釋的** |

方向是**保守**（本工具較不容易判顯著），但 se／$z$／$p$ 決定報表上哪些 loading 標星號，
而這一欄**零第三方對照**。三個候選成因：
本工具做法為「數值 Hessian（中央差分 $h=10^{-4}$，`cfa.js:729–777`）＋ $\mathrm{Cov}=\frac{2}{N-1}H^{-1}$」
＝**觀察訊息 ＋ $N-1$**；lavaan 預設為**期望訊息 ＋ $N$**：
(a) 訊息矩陣型別、(b) $N$ vs $N-1$、(c) 數值 Hessian 的截斷誤差。

⬜ **已代產 `scripts/validation/06_cfa_se_probe.R`**（雙擊 `跑CFA標準誤診斷.bat`），
把 lavaan 的 `information`（observed／expected）× `likelihood`（normal／wishart）四種組合
印到 **10 位有效數字**並列出比值，用以逐一排除。**待 Kevin 執行後才能裁決。**

### 四、順帶更正的兩件事實

1. ★ **`cfa.md` 原寫「lavaan 與本工具的 $\chi^2$ 慣例相同」是錯的**：
   lavaan 預設（`likelihood = "normal"`）給 $\chi^2 = 7.224814$，與 **semopy 相同**；
   本工具的 7.104400 比值恰為 $60/59 = 1.016949$
   ⇒ **本工具是相對 semopy 與 lavaan 預設都不同的那一個**（需 `likelihood = "wishart"` 才一致）
2. ★ **E43 升級**：卡方的兩種殘差**在內建示範資料上就已給出不同的判定**——
   同一張 `catR × catC` 表，Pearson 殘差 $\pm2.2188 / \mp1.9403$、調整後標準化殘差 $\pm4.1684$；
   ★ 「No × High」格的 Pearson $|z| = 1.940 < 1.96$ **不標色**，調整後的 $4.168$ **要標色**
   ⇒ 從「理論上不同」變成「工具附的示範資料就已經不同」

### 五、Fisher 的 OR 口徑差距已量化

| 量 | 本工具 | R `fisher.test` | 差距 |
|---|---|---|---|
| 雙尾 $p$ | 6.318e−05 | 6.318e−05 | ✅ 相符 |
| 勝算比 | 11.666667（無條件 $ad/bc$） | 11.089410（條件 MLE） | **+5.21%** |
| 95% CI | [3.384, 40.220]（Woolf） | [2.966, 49.924]（條件精確） | ★ 本工具**窄 22%** |

### 六、這一輪的方法論收穫

★ R 抽驗銷掉了五個「我們自己說沒問題」的項目——但它真正的價值在另外兩個：
**一個推翻了我在 A5b 下的結論（R58）**，一個打開了一個從來沒人看過的欄位（R59）。

⇒ **第二意見的用處不是確認你對，是找出你不知道自己錯在哪。**
A5b 的窮盡掃描做得很徹底，但徹底只在它的前提內有效——
而「這個掃描的前提是什麼、前提外的區域長什麼樣」，正是同一個人最難自己問出來的問題。

---

## R59 結案（2026-07-30 同日）：CFA 標準誤是慣例差異，不是實作偏差

**入口**：`scripts/validation/06_cfa_se_probe.R`（雙擊 `跑CFA標準誤診斷.bat`），
lavaan 0.7.2 / R 4.6.0。把 `information`（observed／expected）× `likelihood`（normal／wishart）
四種組合印到 10 位有效數字。

### 一、兩個軸乾淨分離

| lavaan 設定 | 本工具 ÷ lavaan 的 se 比值（六個指標） | 判讀 |
|---|---|---|
| A：normal ＋ expected（**lavaan 預設**） | 1.026427 ~ 1.063793 | 兩軸都不同 |
| B：normal ＋ **observed** | ★ **1.016945 ~ 1.016951（幾乎常數）** | 剩下的差恰為 $60/59 = 1.0169492$ ⇒ 這一軸**純粹是 $N$ vs $N-1$** |
| C：**wishart** ＋ expected | 1.009320 ~ 1.046063（**隨指標變動**） | 剩下的差不是常數 ⇒ 這一軸是**觀察 vs 期望訊息** |
| ★ D：**wishart ＋ observed** | ★ **0.999995 ~ 1.000002** | ★ **本工具的口徑** |

★ **兩個軸的指紋不同，這是判讀的關鍵**：$N$ vs $N-1$ 只是一個純量，對六個指標的影響**必然相同**；
觀察 vs 期望訊息改的是 Hessian 的結構，影響**必然隨指標變動**。
B 欄整排常數、C 欄整排變動 —— 這個對比本身就證明了兩軸各自的身分。

### 二、殘差 4.5e−06 就是數值 Hessian 的截斷誤差

| 量 | 本工具 | lavaan（設定 D） | 相對差 |
|---|---|---|---|
| se（六個指標的最大偏差） | — | — | **4.51e−06** |
| $z$（i1／i3／i5） | 5.1020／4.8576／4.5046 | 5.101996／4.857563／4.504514 | < 2e−05 |
| $\chi^2$ | 7.104400478 | 7.104400474 | **5.63e−10** |

⇒ $\chi^2$ 對到 5.6e−10（＝最佳化收斂殘差），而 se 對到 4.5e−06——
**兩者相差四個數量級，正好是中央差分 $h=10^{-4}$ 的截斷誤差量級**（理論上 $O(h^2)=10^{-8}$ 的
函數值誤差，經 $H^{-1}$ 放大後落在 $10^{-6}$）。⇒ 數值 Hessian 的實作品質**沒有問題**。

### 三、裁決

★ **純慣例差異，不改實作**（Kevin 2026-07-30 依 `06_cfa_se_probe.R` 檔頭既定的判準結案：
「若某一欄的比值整排 ≈ 1.000000 ⇒ 純慣例差異，雙處標註即可」）。

本工具的 SE 口徑 ＝ **觀察訊息 ＋ $N-1$** ＝ lavaan 的 `likelihood="wishart"` + `information="observed"`，
兩端都是 lavaan 支援的合法設定。與 lavaan **預設**相比本工具的 $z$ 小約 3.5%（**偏保守**）。
已寫入 `cfa.md` §3.5（新增 SE 的兩個慣例軸表）與 §6。

### 四、順帶更正與新開出

1. ★ **`cfa.md` §3.3 的慣例表原本把「lavaan 預設」列在 $(N-1)F$ 那一側，那是錯的**。
   實測 lavaan 預設給 7.224814，**與 semopy 同側**；需 `likelihood="wishart"` 才會得到 7.104400。
   ⇒ **本工具是相對 semopy 與 lavaan 預設都不同的那一個**。已更正
2. **E71**：★ SRMR 相符到 **4.79e−06** 但非逐位元。lavaan 四種設定彼此一致（0.06085815）
   ⇒ SRMR 與上述兩軸無關；本工具 0.06085844336。量級遠小於判讀門檻（.08／.10），
   但**大於 $\chi^2$ 的 5.6e−10** ⇒ 不是收斂殘差，而是 §3.4 的 SRMR 分母慣例可能略有出入
3. **E72**：★ **因子相關的 se 沒有出口**。lavaan（同口徑）給 $\phi_{12}$ 的 se = 0.161708、$z = 2.794$；
   本工具只報點估計。★ Hessian 裡就有這一格（$\Phi$ 走 atanh 重參數化），缺的只是
   delta method 還原與回傳 ⇒ 成本很低

### 五、方法論收穫

★ **這一輪值得記的是「怎麼設計診斷」而不是結論本身**。
第一次抽驗（05 號）只印 3 位小數，得到的是「差 4%，不知道為什麼」——那是一個**無法行動的發現**。
06 號沒有增加任何新資訊來源，只做了兩件事：**把位數印足**，以及**把候選成因排成 2×2 讓它們互相對照**。

⇒ **當一個差異說不清成因時，先問「有沒有辦法讓每個候選成因留下不同的指紋」。**
這裡的指紋就是「比值是常數還是隨指標變動」——一旦想到這一點，四行數字就夠了。
## 階段 A / A6a（2026-07-30 同日，Opus 5）：常態性檢定交付，抓到階段 A 的第三個 L4

**範圍**　A6 依 Kevin 2026-07-30 裁決拆為 A6a（敘述／視覺化／常態／變異數同質／相關／迴歸三支，8 份）
與 A6b（邏輯迴歸／量表信度／ICC／Kappa／MANOVA／集群，6 份）。本節記錄 A6a 的第一份 `normality.md`
與它引出的兩個紅隊項目。

### 一、R60（L4）：Lilliefors $p$ 值的兩個定義域錯誤

**這是階段 A 的第三個 L4，也是三個裡最「不像 bug」的一個。**
R6（A1）是走錯相關矩陣、R50（A5a）是數值積分節點不足——兩者都是實作沒做對。
R60 不同：**公式本身抄對了，錯的是「這條公式可以用在哪裡」**。

Dallal & Wilkinson (1986) 的解析近似有兩個定義域限制，statsmodels 的
`stats/_lilliefors.py` 把它們寫在 `pval_lf` 的第一行與 docstring 裡：

```python
def pval_lf(d_max, n):
    """... This is only valid for pvalues smaller than 0.1 ..."""
    if n > 100:
        d_max *= (n / 100.) ** 0.49
        n = 100
```

本工具兩件都沒做，改用兩個自製 clamp 補洞（`D < 0.05 → p = 1`、
`D > 0.30 → p ≤ 0.05·e^{-5(D-0.30)}`）。

**為什麼三道防線全部沒抓到**（這一段比 bug 本身重要）：

| 防線 | 為什麼失效 |
|---|---|
| `compare.test.js` | `ks_lilliefors.p` 掛著 **SKIP**，理由寫「p 近似法不同：JS 用 Dallal-Wilkinson，statsmodels 用查表內插」——**一句把定義域錯誤描述成慣例差異的註解** |
| 唯一的基準點 | $n=60$、$D\approx0.078$：$D>0.05$ 不觸發下界 clamp、$D<0.30$ 不觸發上界 clamp、$n<100$ 不需要重標定 ⇒ **三個失效條件一個都沒踩到** |
| `provenance.json` | `verification` 欄寫「JS 與其逐值比對」，與 SKIP 的存在直接矛盾，而沒有任何測試檢查這句話是否屬實（R62） |

★ 這與 A5a 的 R50 是同一型：**唯一的基準恰好是最安全的那一點，而它的容差／SKIP 早已被放寬**。
差別在於 R50 的失效方向只有一個（df 大），R60 有**兩個相反方向的失效區**。

**量化（修正前，1,440 例連續分布掃描）**

| 方向 | 觸發條件 | 實測 |
|---|---|---|
| 漏抓 | $n\gtrsim325$（.05 臨界 $D$ 跌破 0.05） | 480 例中 **50 例（10.4%）** 印 $p=1.000$ 而權威 $p<.05$；$n=1000$~$2000$ 為 **25%**。三色燈 47 例 mixed→nonNormal、**3 例給「近似常態」綠燈** |
| 偽顯著 | $n=4$~$7$ 且 $D>0.30$ | 960 例中 **34 例**（$n$=4 佔 17、5 佔 13、6 佔 3、7 佔 1） |
| 基準點 | $n=60$、$p\approx0.44$（近似無效區） | 舊版 0.4425 vs 權威 0.5161 |

臨界 $D$ 隨 $n$ 的實測（statsmodels 反解）：$n$=300 → 0.0518、**$n$=325 → 0.0500**、
$n$=500 → 0.0404、$n$=1000 → 0.0287、$n$=2000 → 0.0205。
⇒ **$n>325$ 之後，那個 `D < 0.05` 的 clamp 就是在把顯著結果改寫成 $p=1$**。
公共行政的問卷研究 $N=400$~$1000$ 是常態，正好落在核心。

**處置（Kevin 2026-07-30 核定：完整移植，含臨界值表）**

1. 忠實移植 statsmodels 的 `pvalmethod='approx'` 路徑：`pval_lf`（含 $n>100$ 重標定）
   ＋ $p>0.1$ 改走 `TableDist.prob`。新增 26×14 臨界值表（statsmodels 以 $10^7$ 次模擬產生）
   與 14×3 漸近式係數，內插邏輯照 `TableDist._critvals` 與 `prob` 逐行對照
2. `lilliforsPValue` → `lillieforsPValue`（原拼字錯誤）並匯出
3. 新增基準組 **`ks_lilliefors_grid`**（12 個 $n$ × 7 個 $D$ ＝ 84 欄），比照 R50 的
   `tukey_ptukey_grid`：**直接對 $p$ 函式建格點，不經過任何資料集**，
   刻意涵蓋兩個舊 clamp 區與 $n=100$（重標定門檻）／$n=1600$（表格轉漸近式）兩個換式邊界。
   基準組 **85 → 86**
4. 收回兩條假放寬與整條 SKIP（見下）
5. 更正 `provenance.json` 兩組的 `verification`（R62）
6. `tests/a6a.behavior.test.js` 28 條行為鎖

**修正後**：1,440 例掃描 max 相對差 **1.2e−11**、.05 判定**零翻面**；
基準點 $p$ 由 0.4425 → 0.516054469789958（權威 0.5160544697900533，相對差 1.8e−13）。
`reference.json` 完整重生，**既有 85 組的 values 與 source 字串逐位元不變**，`datasets.json` 亦逐位元不變。

### 二、R61（L2）：零變異欄被判成「近似常態」綠燈

實跑（不是讀碼推論）：常數欄 → 引擎回 `W=1, p=1, D=0, p=1` → `verdictKey` 判 `normal`
→ UI 印**綠色的「近似常態」**，在報表上是全套最常態的變項；APA 句照樣輸出 `W = 1.000, p = 1.000`。

同 A4 的 R40-h（零變異死題目拿到 loading 1.000）、A5a 的 R51（零變異 t 檢定印「$p<.001$ 綠燈」）。
★ **這是階段 A 第三次遇到同一型**，而三次分屬三個不同模組 ⇒ 這不是個案，是**格式化函式對退化值的處理**
在整個專案裡的系統性盲點。

處置：引擎回 `zeroVariance` 旗標（退化值本身不動，既有 fixture 零影響）、
判讀增加第四種 `undefinedTest`、警告框 ＋ APA 句警語、i18n 中英各 3 鍵、含「正常資料旗標必須為假」的回歸鎖。

### 三、兩條假放寬與一條 SKIP 的重驗（A5b 習慣 8 的第二次應用）

| 條目 | 原放寬 | 實測 | 處置 |
|---|---|---|---|
| `ks_lilliefors.D` | 1e-4 | 相對差 **0.0（與 statsmodels 逐位元相同）** | 刪除，回 `DEFAULT_TOL` |
| `shapiro_wilk.p` | 1e-5 | 基準點 5.8e−8；1,440 例掃描 max\|Δp\| = 7.5e−7、零翻面 | 刪除，回 `DEFAULT_TOL` |
| `ks_lilliefors.p` | **SKIP** | ★ **真缺口，且是 L4** | 整條刪除，改正常比對 |

★ **A5b 的實績是 5 條裡 4 條是假放寬，A6a 是 3 條裡 2 條**——
但**兩批的真缺口都不在 TOL，在 SKIP**（A5b 是 `mann_whitney_small.pExact`，A6a 是 `ks_lilliefors.p`）。
⇒ **TOL 是「知道有差、量過」，SKIP 是「知道有差、沒量」。後者才是紅旗。**

### 四、獨立重寫（依 `normality.md` §3.2／§3.3 的文字規格）

以 mpmath（dps = 40）重建 Shapiro-Wilk 的 $W$ 與 $p$、KS 的 $D$，
**不呼叫 `scipy.shapiro`，也不呼叫 `statsmodels.lilliefors`**；常態 CDF 與分位數走 mpmath 的 `erf`／`erfinv`。

| 量 | 重寫 vs 基準（$n=60$） | 重寫 vs JS 引擎（1,360 例，$n\le400$） |
|---|---|---|
| Shapiro $W$ | 5.418e−10 | **1.020e−09** |
| Shapiro $p$ | 5.707e−08 | 2.667e−08 |
| KS $D$ | **3.185e−15** | 7.626e−13 |

★ **這裡有一個值得記下來的發現**：重寫是在 **40 位精度**下做的，而它與 scipy 的差仍有 5.4e−10——
**這不可能是浮點誤差**（double 的 eps 是 2.2e−16，$W\approx0.976$ 的絕對差約 5e−10）。
⇒ **Royston (1992) AS R94 的多項式路線與 scipy 的 FORTRAN `swilk` 之間存在 1e−9 級的演算法差異。**
`DEFAULT_TOL`（1e-6）涵蓋得住，判讀上完全無影響，但它證明了一件事：
**`shapiro_wilk` 這一組的「tier A / verified」鎖住的是「兩套實作結果相近」，不是「係數抄對了」**——
Royston 原文未取得，§3.2 的十個多項式係數至今沒有回到原文核對過。這已寫進 `normality.md` §6「尚未驗證」第 1 項。

### 五、Lilliefors $p$ 為什麼「無法獨立重寫」

其餘各批的獨立重寫都能給出一個乾淨的數字，這一支不行，理由要寫清楚：
**臨界值表本身就是權威**。statsmodels 的表由 $10^7$ 次模擬產生，
任何「獨立重寫」都只能重新內插同一張表，證明不了表是對的。

⇒ 本支的驗證改採三道替代：(a) 逐行對照 statsmodels 原始碼的 dispatch 邏輯；
(b) `ks_lilliefors_grid` 84 欄逐值比對；(c) 1,680 例實際樣本的端到端掃描。
**三道都鎖不住「statsmodels 的表本身是否正確」** ——那需要 R 的 `nortest`（走 DW ＋ Stephens 的
第三套 dispatch）作為獨立證人，已寫成 `scripts/validation/07_a6_r_audit.R` 第 [2b] 段，**尚未執行**。

### 六、本節的掃描前提（R58 那條）

所有「零翻面」「max 相對差 1.2e−11」的結論，前提是：連續分布六種形狀（常態／對數常態／$t(12)$／
雙峰混合／gamma／均勻）$n\in[4,2000]$，加上 5 點量表四種形狀 $n\in[50,1000]$，權威為 statsmodels 的 approx 路徑。

**前提外、尚未量化**：$n>2000$ 的實際樣本、$n>5000$（SW 硬擋而 KS 不擋）、
與 R `nortest` 的差異、刻意注入單點極端離群值的樣本。

### 七、順帶量化的一件事：這個檢定在 Likert 資料上不提供資訊量

240 組模擬 5 點量表（$n=50$~$1000$、四種分布形狀）**240 組全部顯著**（權威 $p<.05$）。
這不是實作問題，是方法本身的性質——離散變項幾乎必然拒絕常態。
但**報表沒有任何提示**，使用者容易據此改走無母數而不知道這個檢定在此不提供資訊量（E75）。
## R 側交叉驗證 07（2026-07-30 同日，Kevin 本機 R 4.6.0）：A6a 的五段銷帳，一段陣亡

**執行**　`scripts/validation/07_a6_r_audit.R`，雙擊 `跑A6抽驗.bat`。
六段中**五段成功、第 [2b] 段整段陣亡**（腳本 bug，見末節）。

### 一、[1] 敘述統計：一句從未核實的檔頭斷言，這次拿到證據

`descriptive.js` 檔頭寫「與 R 的 `e1071::skewness(type=2)` / `DescTools::Skew(method=2) 一致」。
這是紅隊第 2 條要查的那種**斷言**，而它從未實跑核實過。R 的三種算法：

| type | skewness | kurtosis | 判定 |
|---|---|---|---|
| 1（$g_1$，動差比） | 0.40950205 | 0.50457175 | — |
| **2（$G_1$，SPSS/SAS 預設）** | **0.42007779** | **0.65636834** | ★ **與本工具逐位元相符** |
| 3（$b_1$，Minitab 預設） | 0.39930728 | 0.38872619 | — |

⇒ **斷言屬實，已升為有證據。** 順帶記下三種算法的實際差距：偏態 0.399~0.420、峰度 0.389~0.656
——**峰度的三種算法差了 1.7 倍**，這在方法文件第 3 節必須寫出來。

★ 另記錄一項缺口：本工具的敘述統計**沒有四分位數（Q1／Q3／IQR）**。
R 的 `quantile()` 有九種 type，這是教科書級的慣例分歧點；本工具因為沒有這個欄位，
反而不存在分歧風險，但報表也就缺了 IQR。R 預設（type 7）值供未來實作時當基準：
**Q1 = 35.79982500、Q3 = 44.65025000、IQR = 8.85042500**。

### 二、[2a] 常態性：R60 修正後的第三個證人

| 量 | 本工具（R60 修正後） | R | 差 |
|---|---|---|---|
| Shapiro $W$ | 0.97556912 | 0.97556912 | 逐位元（印到 8 位） |
| Shapiro $p$ | 0.27045225 | 0.27045224 | 1e−8 |
| Lilliefors $D$ | 0.07844228 | 0.07844228 | 逐位元（印到 8 位） |
| ★ Lilliefors $p$ | **0.51605447** | **0.47548932** | **0.0406** |

★ **$p$ 的 0.04 落差是慣例差異，不是實作偏差**，而且是**預期之內**：這一點 $p\approx0.5$，
落在 Dallal-Wilkinson 近似的無效區，本工具（跟隨 statsmodels）走 $10^7$ 次模擬的臨界值表、
R 的 `nortest` 走 Stephens 修正——**兩套 dispatch 在 $p$ 大的區域本來就會差**。

⚠️ **但這一點證明不了決策區（$p\in[.01,.10]$）也一致**——那正是第 [2b] 段要量的，而它陣亡了。
⇒ **R60 至今仍只有「與移植來源 statsmodels 一致」這一道，尚未取得真正的獨立證人。**
已代產 `08_a6_rerun.R`（雙擊 `跑A6補跑.bat`）補跑。

### 三、[3] 變異數同質：兩個慣例都對上，本工具只實作其中一個

`car::leveneTest(center = median)` → F = 0.3876、p = 0.6804（本工具 0.38762994 / 0.68043872）；
`center = mean` → F = 0.3973、p = 0.674（fixture 0.39725811 / 0.67400692）。

⇒ **本工具選的是兩個合法慣例中的一個**（Brown-Forsythe，對齊 JASP 與 car 預設），
SPSS 使用者拿報表對照會對不上 —— 這要寫進 `levene.md` 第 3 節，不是 bug。

★ **但這一段的驗證強度有限**：`leveneTest` 的 print 方法只印到 4 位小數，
只夠確認「是哪一個慣例」，**不足以逐值驗證**——與 A5b 的 E67（`effectsize` 只印 2 位小數）同型。
⇒ 若要把 `levene_mean_spss_default` 升級為逐值 verified，需請 R 端印完整位數（尚未做）。

### 四、[4] 相關：一個慣例分歧被量到，一個功能缺口被確認

**Pearson 完全對上**：$r=0.5700633$、$t=5.2842$、$df=58$、$p=1.99\times10^{-6}$。

★ **Spearman 是本段的重點，而且是 A5b 的 R58 同型**：

| 路線 | $p$ | 說明 |
|---|---|---|
| R 預設（`exact = TRUE`） | **1.705e−05** | 60 筆**無並列**（實測 x1、x2 各 0 個重複值）⇒ R 走精確法 |
| R `exact = FALSE` | 1.252e−05 | 與**本工具逐位元相符**（本工具走 $t$ 近似，同 scipy） |

⇒ **本工具的 $p$ 比精確法小 1.36 倍，方向是偏寬鬆**。
在這一點上兩者都遠小於 .05，判讀不受影響——**但這正是 R58 警告過的那種「一個點的結論」**。
已在 `08_a6_rerun.R` 第 [B] 段設計 216 組確定性排列（$n$ = 6~60，$y$ 為 1..n 的後 $j$ 個反轉，
掃過 $\rho$ 的全域）量化它會不會在 .05 兩側翻面。

★ **順帶確認一個功能缺口**：本工具**完全沒有相關係數的 95% CI**（`grep` 過，`src/` 內無 Fisher $z$ 變換）。
APA 7 要求報告效果量的 CI。R 的值供文件引用：Pearson $r$ 的 95% CI = **[0.36964602, 0.71979535]**。

### 五、[5] 迴歸三支：§0 點名的手算基準，這次被第三方鎖住了

**全部對上**：simple（$b_0$=7.07798、$b_1$=0.65673、se=0.09023、$t$=7.278、$p$=9.99e−10、
$R^2$=0.4774、$F$=52.97）、multiple（四個係數、$R^2$=0.4907、$F$=17.98、$p$=2.696e−08）、
`car::vif` = 1.482454 / 1.486275 / 1.003334（本工具 1.48245386 / 1.48627515 / 1.00333443）。

★ **最重要的一項**：階層迴歸的 $\Delta F$ 與 $\Delta p$ 在 `generate_reference.py` 裡是
**手算的**（source 欄寫 `statsmodels.OLS (manual ΔF)`）——正是 §0 品質規範點名的
「與 JS 出自同一次理解」的高風險類別。R 的 `anova(m1, m2)` 給 **F = 0.7321、Pr(>F) = 0.4855**，
與 fixture 的 0.73208250 / 0.48545161 相符 ⇒ **這個結構性弱點在本組結案。**

★ **另一項零基準量被順手驗掉**：`reference.json` 的 `regression_multiple` **沒有任何 beta 欄位**
（標準化係數在 UI 上有、在基準裡沒有）。R 對標準化資料重跑 `lm` 給
**0.6448894 / 0.07950963 / 0.09147123**，本工具實跑
**0.6448894225727726 / 0.07950963160352827 / 0.09147122623298892** ⇒ **相符到 R 印出的全部位數**。
建議把 beta 三欄補進 `regression_multiple` 基準（E80）。

### 六、[2b] 為什麼整段陣亡：一個我自己寫的、與 R60 同型的錯誤

`nortest::lillie.test` 要求 $n\ge5$，而第一組探針是 `n4_bigD`（$n=4$）。
失敗時腳本填的是**邏輯型 `NA`**，而 `formatC(NA, format = "f")` 對邏輯型回報 `unsupported type`；
又因為**整個 12 組的迴圈包在單一 `tryCatch` 裡**，一組失敗就把 12 組全部帶走。

★ **這與 R60 是同一型的錯誤**：`lillie.test` 有它的定義域（$n\ge5$），
我在呼叫它時**沒有問過那個定義域是什麼**——而我當天才剛因為同一件事開出一個 L4。
★ **第二層錯誤是防禦設計**：把 12 組包在一個 `tryCatch` 裡，等於讓最脆弱的那一組決定整段的成敗。
⇒ **給後續抽驗腳本的兩條**：(a) **呼叫任何第三方檢定前先問它的 $n$ 下限**；
(b) **逐項 `tryCatch`，不要整段包**——這與 §6.3 紅隊第 7 條（邊界條件）是同一件事，
只是對象從「本工具」變成「我寫的驗證腳本」。

`07_a6_r_audit.R` 已修（逐組 `tryCatch` ＋ `NA_real_` ＋ $n<5$ 明示跳過）；
另代產 `08_a6_rerun.R` 只跑未取得的兩段，不必重跑套件檢查。
## R 側交叉驗證 08（2026-07-30 同日）：R60 結案，Spearman 慣例分歧量化

**執行**　`scripts/validation/08_a6_rerun.R`，雙擊 `跑A6補跑.bat`。兩段皆成功。

### 一、[A] R60 拿到真正的獨立證人，而且結果乾淨地分成兩段

`nortest::lillie.test` 走的是**第三套 dispatch**（Dallal-Wilkinson ＋ Stephens 修正），
與本工具的移植來源 statsmodels（DW ＋ $10^7$ 次模擬臨界值表）**互相獨立**。
12 組探針中 11 組可比（`n4_bigD` 因 `lillie.test` 要求 $n\ge5$ 而跳過）：

| 區域 | 組數 | max 絕對差 | 說明 |
|---|---|---|---|
| **$D$ 統計量** | 11 | **逐位元相符** | 統計量本身零爭議，差異全在 $p$ 的路線 |
| ★ **決策區 $p<0.1$**（DW 的有效區） | 6 | **1.5e−8** | 含**五組 clampzone**（$n$ = 400/500/800/1000/2000）——正是舊實作印 $p=1.000$ 的那五個點 |
| $p>0.1$（兩套分道揚鑣） | 5 | 8.9e−3 | $n$=200 為 0.6703 vs 0.6614；$n$=60（07 號）為 0.5161 vs 0.4755，差 0.0406 |

逐組數字：

| probe | $n$ | $p$（本工具） | $p$（R `nortest`） | 絕對差 |
|---|---|---|---|---|
| `n5_bigD` | 5 | 8.851561e−2 | 8.851560e−2 | 5.2e−9 |
| `n400_clampzone` | 400 | 2.454860e−2 | 2.454860e−2 | 4.3e−9 |
| `n500_clampzone` | 500 | 2.486341e−2 | 2.486340e−2 | 1.5e−8 |
| `n800_clampzone` | 800 | 1.015860e−2 | 1.015860e−2 | 4.5e−9 |
| `n1000_clampzone` | 1000 | 8.129741e−3 | 8.129740e−3 | 1.2e−9 |
| `n2000_clampzone` | 2000 | 2.936077e−3 | 2.936080e−3 | 3.2e−9 |
| `likert_n300` | 300 | 6.452751e−35 | 6.452750e−35 | — |
| ★ `likert_n1000` | 1000 | **2.895300e−114** | **2.895300e−114** | — |
| `n30_mid` | 30 | 3.042625e−1 | 3.061730e−1 | 1.9e−3 |
| `n100_mid` | 100 | 6.260967e−1 | 6.254300e−1 | 6.7e−4 |
| `n200_lowD` | 200 | 6.703082e−1 | 6.614490e−1 | 8.9e−3 |

★ **連 $10^{-114}$ 那一格都對上**——這不是「大致相符」，是兩套獨立編寫的實作在 DW 分支上
**逐值相同**。⇒ **R60 的修正取得真正的第三方確認，而且正好在最要緊的區域。**

★ **$p>0.1$ 的落差是慣例差異，不是誰錯**：兩者都是對同一個未知分布的近似，
本工具跟隨 statsmodels 的模擬表、`nortest` 跟隨 Stephens 修正。**沒有第三方能裁決哪一邊比較接近真值**
——這一點已誠實寫進 `normality.md` §6 尚未驗證第 2 項，**不能因為「和 R 對上了」就把它講成已驗證**。

★ **順帶記一件事**：本次的 12 組探針裡，`n4_bigD` 被 `lillie.test` 的 $n\ge5$ 下限擋掉。
本工具的 `kolmogorovSmirnov` 擋在 $n\ge4$ ⇒ **$n=4$ 這一格本工具會算、R 拒算，永遠拿不到第三方對照**。
不是錯誤，但要知道那一格的保證只到「與 statsmodels 一致」。

### 二、[B] Spearman：慣例分歧量化完成，**216 組零翻面**

**設計**：$x=1..n$；$y=1..n$ 但把**最後 $j$ 個元素反轉**（$j=2..n$），
於是 $\sum d^2 = j(j^2-1)/3$、$\rho = 1-2j(j^2-1)/[n(n^2-1)]$——
$j$ 由小到大掃，$\rho$ 從接近 1 平滑降到接近 −1，**保證穿過 .05 臨界區**，且**完全確定性**
（沙盒用同一條構造重算，不依賴亂數）。$n\in\{6,8,10,12,15,20,25,30,40,60\}$，共 **216 組**。

★ **第一件事：確認本工具就是 R 的近似分支。**
41 組決策區附近的資料點，本工具 vs R `exact = FALSE` 的 **max 相對差 3.8e−08**
（＝R 印出的有效位數）⇒ 逐值相符，07 號在 $n=60$ 的單點結論在整個掃描上成立。

★ **第二件事：分歧的方向與大小。**

| $n$ | approx / exact 比值 | 解讀 |
|---|---|---|
| 6 | **0.2883 ~ 0.7044** | ★ 最糟一例：exact 0.01667 vs approx 0.00480，**本工具的 $p$ 小 3.5 倍** |
| 8 | 0.7619 ~ 0.9293 | |
| 10 | 0.6999 ~ 0.9789 | |
| 12 | 0.6835 ~ 0.9896 | |
| 15 | 0.8565 ~ 1.0023 | |
| 20 | 0.8829 ~ 1.0014 | ★ `correlation.js` 檔頭寫「$n\ge20$ 時偏差通常可接受」——實測最大偏低 12%，**這句話成立** |
| 25 | 0.9402 ~ 1.0041 | |
| 30 | 0.9108 ~ 1.0045 | |
| 40 | 0.9636 ~ 1.0025 | |
| 60 | 0.9777 ~ 1.0028 | |

**方向**：比值 < 1 佔絕大多數 ⇒ **本工具的 $p$ 系統性偏小，即偏寬鬆（anti-conservative）**，
與 A5b 的 R58 同向；隨 $n$ 增大迅速收斂到 1。

★★ **但關鍵結論與 R58 相反：216 組中 .05 判定翻面 0 組**（偽顯著 0、漏抓 0）。
原因是小 $n$ 時精確分布的 $p$ 呈**粗糙的階梯**（$n=6$ 時最小可能的雙尾 $p$ 就是 0.0167），
比值雖大，兩者卻落在 .05 的同一側。

⇒ **處置建議：書面化，不改實作、不加 UI 警告。** 與 R58 的差別在於證據方向相反——
R58 量到 1.1% 的偽顯著，本批量到 0%。

### 三、★ 這一段的前提，以及前提外的區域（R58 那條，本批必須寫）

**前提**：
1. **完全無並列**——216 組全是 $1..n$ 的排列
2. **R 的 `exact = TRUE` 只在 $n\le9$ 是真的全枚舉**，$n\ge10$ 走 AS 89 的 Edgeworth 級數
   ⇒ $n\ge10$ 的「精確」本身也是近似，**這一段量到的是「兩種近似的差」，不是「近似與真值的差」**
3. $n\in[6,60]$、$\rho$ 由構造決定（每個 $n$ 只有 $n-1$ 個可能值）

**前提外、尚未量化**：
1. ★★ **有並列的情形完全沒碰到**——而 **A5b 的 R58 正是在這裡翻船的**：
   Mann-Whitney 的無並列結論（危險方向為 0）在有並列時方向相反。
   Spearman 有並列時 R 的 `cor.test` **會退回近似並發警告**，所以 **R 不能當這一格的權威**
   ⇒ 要量這一格需要另找工具（如 `coin` 的條件推論）或自行枚舉
2. $n<6$ 與 $n>60$
3. 單尾檢定（本工具與本掃描皆為雙尾）
## 階段 A / A6a 第二輪（2026-07-30 同日）：descriptive／levene／correlation 三份交付

### 一、獨立重寫（依各文件第 3 節的文字規格，mpmath dps = 40）

**不呼叫 `scipy.levene`、`scipy.pearsonr`、`scipy.spearmanr`，也不用 pandas 的對應函式**；
右尾 $F$ 與雙尾 $t$ 一律改走 mpmath 的正規化不完全 beta，名次自行實作（含並列平均）。

| 量 | 相對差 |
|---|---|
| Levene $F$（Brown-Forsythe，median） | **1.257e−15** |
| Levene $p$ | 3.263e−16 |
| ★ Pearson $r$ | **0.0（逐位元相同）** |
| Pearson $p$ | 6.811e−15 |
| Spearman $\rho$ | 2.089e−16 |
| Spearman $p$ | 6.766e−15 |
| 敘述統計 mean／sd／se／median | 1.2e−16 ~ 2.2e−17 |
| 偏度（type 2） | 4.513e−15 |
| 峰度（type 2） | 2.208e−15 |

### 二、★ 四個紅隊發現，其中三個是同一族

**R66（L2）是本輪最重要的一項，而它的價值不在嚴重度，在「它是第四次」。**

| 批次 | 編號 | 模組 | 症狀 |
|---|---|---|---|
| A4 | R40-i | EFA | 完全共線 ⇒ 報表印「球形檢定顯著，適合做因素分析」**綠燈** |
| A5a | R51 | t 檢定 | 零變異 ⇒ 印「$t=$ —、$p<.001$」**綠燈**，APA 句照寫「達顯著差異」 |
| A6a | R61 | 常態性 | 零變異 ⇒ $W=1$／$D=0$／$p=1$ 判「**近似常態**」綠燈 |
| A6a | **R66** | **Levene** | 各組皆常數 ⇒ 印「**違反變異數同質**」紅燈——**方向與真相相反** |

⇒ **四次分屬四個模組，這已經不是個案，是「格式化函式對退化值的處理」在專案內的系統性盲點。**
`fmtNum(Infinity)` 印「—」、`fmtP(0)` 印「< .001」、`toneForP(0)` 給綠燈——
**三個獨立的格式化決定疊起來，就會把一個數學上無定義的結果，渲染成一個看起來很確定的結論。**

★ **R66 還多了一層**：舊版回 `{F: Infinity, p: 0}` ⇒ 紅燈（錯）。
**但只把 `Infinity` 改成 `NaN` 而不特判 UI，`!(lv.p < 0.05)` 會變成綠燈「通過」——同樣是錯的。**
⇒ 退化情形需要的是**第三種狀態**，不是把它塞進既有的二分法。
單／雙因子 ANOVA 的前提列因此各加了一個中性狀態（灰燈、不下判定、不計入「有前提被違反」的警告）。

★ **另一個代數層面的觀察**：$SS_{\text{within}}=0 \iff$ 各組 $Z$ 全為 0 $\implies SS_{\text{between}}=0$
⇒ $F$ 必然是 $0/0$。**舊版那個 `Infinity` 分支沒有任何情形會是對的**——
這不是「邊界處理不夠好」，是一個**恆偽的分支**。
⇒ **寫退化分支時要問：這個回傳值在什麼情形下是對的？答不出來就代表分支本身錯了。**

### 三、R67：孤兒欄位修到一半才發現旗標本身不夠用

`pearsonCorr` 早就回傳 `zeroVariance: true`，但 `grep` 確認**零 UI 消費者**（同 A3a 的四項）。
修復時才發現：**這個旗標對整組配對都成立**——矩陣裡 $(a,b)$ 被標記時，$a$ 與 $b$ 都可能是常數欄，
**只有兩欄時完全分不出來**。⇒ 引擎改為分開回報 `xConstant`／`yConstant`。

★ **教訓**：孤兒欄位不只是「沒人讀」，還可能是**「當初設計時沒想清楚讀的人需要什麼」**。
把它接上 UI 的那一刻，才會發現它提供的資訊不足以支撐 UI 要說的話。

### 四、R65：同一件事，兩支模組兩套處理

`descriptive/compute.js` 缺 `.filter(Number.isFinite)`，而 `normality/compute.js` 有。
一個非數值字串 ⇒ 整欄八個統計量全變 NaN，報表印 **n = 5 但其餘全「—」**。
⇒ 紅隊第 3 條（同一個判斷有沒有兩套實作）的變體，**其中一支明顯是漏了**。

### 五、R68 與 §6 的誠實度

`descriptive.js` 檔頭寫「與 `e1071::skewness(type=2)` / `DescTools::Skew(method=2)` 一致」。
07 號抽驗把前者驗掉了（type 1/2/3 三種算法逐一對照，確認本工具＝type 2、逐位元相符），
**但 `DescTools` 那一半從未驗過**。

⇒ **一句話裡有兩個第三方宣稱，證據只有一個。** 已在 `descriptive.md` §6 標為未驗證。
★ 這與 R63（`kolmogorovSmirnov` 的檔頭宣稱「與 `nortest` 一致到小數第 3 位」而零證據）是同一型——
**檔頭註解裡的第三方一致性宣稱，要當成引用來查。**

### 六、順帶量到的三件事

1. ★ **偏度／峰度的三種算法差很多**：本資料集偏度 0.3993~0.4201、**峰度 0.3887~0.6564（差 1.7 倍）**
   ⇒ 引用時不說明算法等於沒說。已寫進 `descriptive.md` §3.3
2. ★ **Levene 的 R 對照只印 4 位小數**（`leveneTest` 的 print 方法）⇒ 足以確認「是哪一個慣例」，
   **不足以逐值驗證**。同型：A5b 的 E67（`effectsize` 只印 2 位小數）
3. ★ **相關係數的 95% CI 完全未實作**（APA 7 剛需）。R 的值已記錄：$r$ 的 95% CI = [0.36964602, 0.71979535]

### 七、驗收

沙盒 **13 檔全綠、1,425 過 / 5 跳過**（`a6a.behavior.test.js` 39 條）；
`eslint src tests` **0 problems**；`vite build` **615 modules transformed**
（lightningcss 為沙盒缺 Linux 原生二進位，與本批無關）；
**114 處行號引用內容錨定重驗**（第一批修正 4 處、第二批 8 處）。
`MAX_UNDOCUMENTED` **16 → 11**。
