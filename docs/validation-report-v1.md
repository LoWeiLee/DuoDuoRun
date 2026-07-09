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

## 如何重跑

```bash
python3 tests/run_nca_ref_only.py       # 只重生 NCA 基準（沙盒可跑，不需 R/semopy）
npm test                                # 回歸比對（不需 Python）
python3 tests/generate_reference.py     # 重生基準值（改測試資料時才需要）
node tests/probe.mjs                    # 除錯：逐欄位列出實際 vs 基準與相對差
```

## 給後續階段的提示

- Phase 2 UI 重構期間，任何觸碰 `src/lib/stats/` 的改動都必須過 `npm test`
- Phase 3 PLS-SEM 開發時，把 `seminr` 基準值加進同一套管線（`generate_reference.py` 加區塊即可）
- 測試資料集刻意設計為平衡 2×3 交叉；曾發現不平衡空格設計會讓 twoWayANOVA 正確回報
  singular-matrix，錯誤訊息可更友善（→ backlog P3：偵測空格提示「交叉格有空格」）
