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

### 未處理（已知）

- **CFA 的 CFI 截斷於 1、TLI 不截斷**（本 fixture TLI = 1.0223），截斷慣例不一致。
- **VarSelect 的兩種外觀待設計拍板**（見上）。
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
