# 多多快跑 公式溯源登記表（formula provenance）v1（2026-07-13）

**機器可讀版本**：`tests/fixtures/provenance.json`（單一真相來源）
**硬擋測試**：`tests/provenance.test.js`

---

## 1. 這份文件為什麼存在

`compare.test.js` 的標題是「統計核心 vs Python 黃金標準」。這個標題**對其中一部分方法而言是錯的**。

`reference.json` 的 81 組基準裡，有 29 組的 `source` 寫著「numpy 手算」——意思是：那個所謂的
「黃金標準」，是同一個作者、照同一次對論文的理解、用 numpy 再寫了一遍。JS 和 Python
**兩邊編碼的是同一個猜測**。這種比對能抓到「兩邊抄不一致」，**永遠抓不到「公式本身讀錯」**。

它是一個自我一致性檢查，穿著驗證的外衣。

2026-07-13 的 R 抽驗（seminr / cSEM / R NCA）證實了這件事。當天找到的四個問題：

| 問題 | 基準類型 |
|---|---|
| MGA 的 Welch t 分母漏了 (n−1)/n 加權 | 手算 |
| MICOM step 3 的變異數比較用「差」而非 Henseler 原式的「log 比」 | 手算 |
| Henseler MGA 的偏誤校正錨點用點估計 θ̂ 而非 bootstrap 平均 θ̄* | 手算 |
| d_G 的對數底數（ln vs log₁₀）未經查證 | 手算 |

**四個問題全部落在手算基準。對照 scipy / statsmodels / pingouin / sklearn 等第三方實作的
52 組，一個都沒出事。** 這不是運氣，是結構。

## 2. 規範

每一個進入 `reference.json` 的方法，都必須在 `tests/fixtures/provenance.json` 登記。

| tier | 定義 | 要求 |
|---|---|---|
| **A** | fixture 值**直接由第三方實作產生** | `authority` 指名該套件 |
| **B** | fixture 值為手算 | `authority` 必須指名**可執行的獨立實作**，或**有方程式編號的原始文獻**——「我對論文的轉述」不算數。`verification` 必須寫明用什麼方式交叉核對過。 |
| **I** | 純輸入型 fixture（固定重抽索引／排列） | 不含公式，無溯源義務。命名須以 `_inputs` 結尾。 |

**新增統計方法的順序（不可顛倒）**：

1. 先查權威來源——優先找**可執行的第三方實作**（沙盒 pip 裝得到的、或 Kevin 本機 R 跑得動的）
2. 找不到實作，才回到**原始論文並記下方程式編號**
3. 兩者都做不到 → 不做這個方法，或明確標為「無法驗證」並在 UI 警告
4. **然後**才寫 `generate_reference.py` 的基準與 `pls.js` 的實作
5. 同時登記 provenance，否則 `provenance.test.js` 紅燈、進不了 commit

**權威來源依方法族而異**（「查 SPSS/JASP」不是通則）：

| 方法族 | 權威 |
|---|---|
| 基礎統計（t／ANOVA／迴歸／無母數／效果量） | R／scipy／statsmodels；SPSS 與 JASP 有慣例分歧時**兩邊都記**（見 `levene_mean_spss_default`） |
| PLS-SEM | SmartPLS 4 ＋ Hair／Henseler／Ringle／Sarstedt 的原始論文；開源代理：**seminr**（Hair 團隊）、**cSEM**（Henseler 團隊） |
| CB-SEM | lavaan（R）／Mplus |
| NCA | Dul 的 R `NCA` 套件 |
| EFA／CFA | factor_analyzer／semopy；R `psych`／`lavaan` 為第二道 |

## 3. 棘輪（ratchet）

`tests/provenance.test.js` 的 `MAX_PENDING` 是一個**只能往下調**的常數。

- 新增方法沒登記 → 紅燈
- 待審計數量增加 → 紅燈
- 審計完一組 → status 改 `verified`、`MAX_PENDING` 減 1

**為什麼要用測試擋而不是寫進規範文件**：規範靠自律，而 2026-07-13 這一天已經證明自律會失效。

**起始值 15。**

**棘輪履歷**：15 →（2026-07-13 溯源審計 Session Q1）→ **11**。
- −2：`pls_gof`、`pls_itcriteria`（沙盒第三方＋重生 assert）
- +1：`lda_group3` 覆核由 tier A 改列待審計（scipy 只是特徵分解原語，SPSS 慣例縮放從未對過完整第三方）
- −1：`pls_q2`（程序文獻路線——在世第三方不存在）
- −2：`pls_formative`、`pls_ipma`（Kevin 本機 R 抽驗）
- −1（2026-07-14）：`lda_group3`（MASS::lda 全項逐值一致）→ **10，Session Q1 結案**

## 4. 待審計清單（15 組）與審計路徑

盤點：29 組手算基準中，10 組已由 2026-07-13 的 R 抽驗逐項核對、4 組為純輸入型 fixture，
真正待審計 15 組。依「能否找到可執行的第三方實作」分成三批——**先打能升 Tier A 的**。

### 批次 1：有第三方實作可對，一查就能升級（6 組）

| 方法 | 可對照的實作 | 備註 |
|---|---|---|
| `pls_formative` | seminr（`composite(..., weights = mode_B)`）／cSEM（`<~`） | Mode B 形成型；本 session 的 cSEM 抽驗誤用 `<~` 反而正好是 Mode B，可直接複用該腳本 |
| `pls_q2` | seminr `blindfold()`／cSEM | blindfolding D=7 的 omission 樣式是慣例重災區，必查 |
| `pls_predict` 的 Q²predict | seminr `predict_pls()` | 本 session 只驗了量級與方向（fold 隨機無法逐值）；Q²predict 的 naive baseline 定義可逐值查 |
| `pls_ipma` | SmartPLS 4（授權過期）／seminr 無 → **回論文** Ringle & Sarstedt (2016) | 量表重縮放（0–100）的公式必須有方程式編號 |
| `pls_itcriteria` | statsmodels（AIC/BIC/HQ 的一般定義）＋ Sharma et al. (2019) 的 PLS 特化 | 參數計數 k 的定義是分歧點 |
| `pls_gof` | Tenenhaus et al. (2005) 原式；plspm 有 `gof` | plspm 直接可對 |

### 批次 2：無主流實作，必須回到論文方程式編號（6 組）

| 方法 | 權威文獻（審計時須記下方程式編號） | 風險點 |
|---|---|---|
| `pls_cta` | Gudergan, Ringle, Wende & Will (2008), JBR 61(12)；tetrad 定義 Bollen & Ting (1993) | 非冗餘 tetrad 的選取集、Bonferroni 的施加層級 |
| `pls_copula` | Park & Gupta (2012), Mktg Sci 31(4)；Hult et al. (2018), JIM 26(3) | ECDF 的並列處理、H=1 的夾擠值——已對 Hult 的公開程式碼，但需記下出處 |
| `pls_fimix` | Hahn, Johnson, Herrmann & Huber (2002), SBR 54(3)；準則 Sarstedt et al. (2011), SBR 63(1) | 參數計數 N_k、EN 的正規化、是否含截距 |
| `pls_pos` | Becker, Rai, Ringle & Völckner (2013), MISQ 37(3) | 目標函數的定義、最小段大小 |
| `pls_cipma` | Hauff, Richter, Sarstedt & Ringle (2024) | NCA × IPMA 的組合口徑 |
| `pls_bca_reference` | Efron & Tibshirani (1993) §14.3 | BCa 的 z₀ 與 a 的估計式 |

### 批次 3：本 session 新做、公式已在程式碼與 validation-report 中詳記，補登記即可（3 組）

| 方法 | 說明 |
|---|---|
| `pls_pairwise_wpls` | pairwise-complete 相關與加權相關的定義是封閉式且無爭議；`full_*` 自我一致性欄位已鎖住「相關矩陣驅動的迭代必須重現 pls_basic」 |
| `pls_quadratic` | 二次效果＝分數平方，機制同 two-stage（已對 seminr） |
| `pls_mod_threeway` | 三向交互＝分數連乘，機制同上 |
| `pls_hoc_embedded` | embedded two-stage HOC（Sarstedt et al. 2019）；disjoint 已對 seminr，embedded 需補 |

## 5. 全表

| 方法 | tier | 狀態 | 權威來源 |
|---|---|---|---|
| `ancova` | A | ✅ | pingouin |
| `anova_oneway` | A | ✅ | scipy |
| `cfa_2factor` | A | ✅ | semopy |
| `cfa_2factor_loadings` | A | ✅ | semopy |
| `cfa_noncentral_chi2` | A | ✅ | scipy |
| `cfa_rmsea_ci` | A | ✅ | scipy |
| `chisquare_2x2` | A | ✅ | scipy |
| `cluster_kmeans_k3` | A | ✅ | scikit-learn |
| `cluster_ward_k3` | A | ✅ | scikit-learn |
| `cohen_kappa` | A | ✅ | scikit-learn |
| `cronbach_alpha_6items` | A | ✅ | pingouin |
| `cronbach_alpha_f1` | A | ✅ | pingouin |
| `descriptive_y` | A | ✅ | scipy |
| `efa_pca_none` | A | ✅ | factor_analyzer |
| `efa_pca_varimax` | A | ✅ | factor_analyzer |
| `efa_pca_varimax_k3` | A | ✅ | factor_analyzer |
| `fisher_exact` | A | ✅ | scipy |
| `icc` | A | ✅ | pingouin |
| `kruskal_wallis` | A | ✅ | scipy |
| `ks_lilliefors` | A | ✅ | statsmodels |
| `lda_group3` | B | ✅ | MASS 7.3.65＋base R manova（2026-07-14 全項逐值，含分類表） |
| `levene_mean_spss_default` | A | ✅ | scipy |
| `levene_median` | A | ✅ | scipy |
| `logistic_regression` | A | ✅ | statsmodels |
| `mann_whitney` | A | ✅ | scipy |
| `mann_whitney_small` | A | ✅ | scipy |
| `mann_whitney_ties` | A | ✅ | scipy |
| `manova` | A | ✅ | statsmodels |
| `mixed_anova` | A | ✅ | pingouin |
| `nca_bottleneck` | B | ✅ | NCA (R)（覆核改列 B，同上） |
| `nca_ce_fdh` | B | ✅ | R NCA 5.0.2（Dul 2016） |
| `nca_cr_fdh` | B | ✅ | NCA (R)（覆核改列 B，與 nca_ce_fdh 同批同證據） |
| `pearson_x1_x2` | A | ✅ | scipy |
| `pls_basic` | B | ✅ | seminr 2.5.0 |
| `pls_bca_reference` | B | ⬜ 待審計 | 待審計 |
| `pls_cipma` | B | ⬜ 待審計 | 待審計 |
| `pls_copula` | B | ⬜ 待審計 | 待審計 |
| `pls_copula_inputs` | I | — | 不適用（純輸入型 fixture） |
| `pls_cta` | B | ⬜ 待審計 | 待審計 |
| `pls_fimix` | B | ⬜ 待審計 | 待審計 |
| `pls_fimix_inputs` | I | — | 不適用（純輸入型 fixture） |
| `pls_fit` | B | ✅ | cSEM 0.6.1；Henseler et al. (2014) ORM 17(2)；Dijkstra & He… |
| `pls_formative` | B | ✅ | plspm（fixture 來源）＋seminr mode_B（2026-07-13 逐值） |
| `pls_gof` | A | ✅ | plspm 0.5.7（Tenenhaus et al. 2005）；重生時 assert <1e-6 |
| `pls_hoc_disjoint` | B | ✅ | seminr (R)（2026-07-13 逐值；覆核改列 B——重生無第三方 assert） |
| `pls_hoc_embedded` | B | ⬜ 待審計 | 待審計 |
| `pls_hoc_repeated` | A | ✅ | plspm |
| `pls_ipma` | B | ✅ | Ringle & Sarstedt (2016)；cSEM doIPMA 原始碼逐式＋數值複算（灰區見 note） |
| `pls_itcriteria` | B | ✅ | seminr compute_metrics.R 同式＋本機 R 逐值；statsmodels 恆等式（重生 assert）；Sharma et al. 2019 JAIS／2021 Dec. Sci. |
| `pls_mediation` | A | ✅ | plspm |
| `pls_mga_formulas` | B | ✅ | seminr (R)、cSEM (R)（覆核改列 B——固定輸入 numpy，一次性抽驗） |
| `pls_mga_perm` | B | ✅ | Chin & Dibbern (2010)；cSEM 0.6.1 的 Chin approach |
| `pls_mga_perm_inputs` | I | — | 不適用（純輸入型 fixture） |
| `pls_micom` | B | ✅ | Henseler, Ringle & Sarstedt (2016)；cSEM 0.6.1 原始碼（postest… |
| `pls_mod_ortho` | B | ✅ | seminr 2.5.0；Little, Bovaird & Widaman (2006) |
| `pls_mod_pi` | B | ✅ | seminr 2.5.0；Chin, Marcolin & Newsted (2003) |
| `pls_mod_threeway` | B | ⬜ 待審計 | 待審計 |
| `pls_mod_twostage` | B | ✅ | seminr 2.5.0；Chin et al. (2003)；SmartPLS 4 Moderation 文件 |
| `pls_pairwise_wpls` | B | ⬜ 待審計 | 待審計 |
| `pls_plsc` | B | ✅ | cSEM 0.6.1 |
| `pls_pos` | B | ⬜ 待審計 | 待審計 |
| `pls_pos_inputs` | I | — | 不適用（純輸入型 fixture） |
| `pls_predict` | B | ✅ | seminr 2.5.0；Shmueli et al. (2016, 2019) |
| `pls_q2` | B | ✅ | Hair et al. (2017) 第 6 章＋SmartPLS Blindfolding 官方文件（程序四要點）；無在世第三方實作 |
| `pls_quadratic` | B | ⬜ 待審計 | 待審計 |
| `pls_scheme_centroid` | A | ✅ | plspm |
| `pls_scheme_factorial` | A | ✅ | plspm |
| `regression_hierarchical` | A | ✅ | statsmodels |
| `regression_multiple` | A | ✅ | statsmodels |
| `regression_simple` | A | ✅ | statsmodels |
| `repeated_anova` | A | ✅ | pingouin |
| `shapiro_wilk` | A | ✅ | scipy |
| `spearman_x1_x2` | A | ✅ | scipy |
| `ttest_independent_welch` | A | ✅ | scipy |
| `ttest_one_sample` | A | ✅ | scipy |
| `ttest_paired` | A | ✅ | scipy |
| `tukey_hsd` | A | ✅ | scipy |
| `twoway_anova_type3` | A | ✅ | statsmodels |
| `wilcoxon_signed_rank` | A | ✅ | scipy |
| `zprop_one` | A | ✅ | statsmodels |
| `zprop_two` | A | ✅ | statsmodels |

（各條目的完整 `verification` 內容見 `tests/fixtures/provenance.json`。）

## 版本紀錄

- v1（2026-07-13）：初版。起因為 2026-07-13 R 抽驗暴露「手算基準＝自我一致性檢查」的結構缺陷。
  建立 tier/authority 登記、`provenance.test.js` 硬擋與 MAX_PENDING 棘輪（起始 15）。
## 6. 盤點覆核與 Session Q1 審計摘要（2026-07-13，Fable 5）

**盤點覆核**（81 筆申報 vs generate_reference.py 實碼）：45 組 tier A 乾淨；3 組維持 A 加註
（`pls_hoc_repeated`／`pls_mediation` 重生時 assert 對 plspm、`cfa_rmsea_ci` 值出自 scipy 機制）；
4 組 tier A 申報過寬改列 B verified（`pls_hoc_disjoint`、`pls_mga_formulas`、`nca_cr_fdh`、
`nca_bottleneck`——證據皆為一次性 R 抽驗，fixture 重生為純 numpy）；1 組申報不實改列待審計
（`lda_group3`）。「一次性抽驗」與「每次重生都由第三方產生／assert」防護力不同：前者不攔截
之後對手算碼的改動。

**批次 1 的兩處工單誤判**（原：6 組都有第三方可對）：
- `pls_q2`：seminr **沒有** blindfold()（作者明確拒做，GitHub issue #156）；SmartPLS 4 官方已移除
  blindfolding；matrixpls／semPLS 已從 CRAN 下架——**在世第三方不存在**，走程序文獻路線結案。
- `pls_ipma`：cSEM **有** doIPMA（原工單漏查），已用原始碼逐式＋數值複算結案。

**新增的重生時第三方 assert**（結構性防護，非一次性）：`pls_gof` 對 plspm goodness_of_fit()
<1e-6；`pls_itcriteria` 對 statsmodels llf 式 AIC/BIC 恆等式（差高斯常數）<1e-8。

**引用修正**：`pls_itcriteria` 原誤標「Sharma, Shmueli, Sarstedt, Danks & Ray 2019」——
該作者組合是 2021 Decision Sciences 52(3)；2019 JAIS 20(4) 是 Sharma, Sarstedt, Shmueli, Kim & Thiele。

**IPMA 灰區（記錄在案）**：塊內指標量尺不一時，「先縮 0–100 再解權重」（cSEM 建議工作流）與
「先以原始 sd 解權重再套 0–100 資料」（本工具與 cSEM 餵原始資料時的行為，兩者逐式等價）分岔；
官方 cIPMA 教程（Sarstedt, Richter, Hauff & Ringle 2024, J. Marketing Analytics）明列混合量尺為
未滿足假設情境。已建議 UI 警告（roadmap P1）。
