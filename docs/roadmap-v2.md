# 多多快跑 主工單 v2（2026-07-13）

**讀者**：後續執行的 AI 與 Kevin。
**定位**：**單一主工單**。合併並取代下列四份已完成或已過期的工單——

| 被取代的文件 | 狀態 | 處置 |
|---|---|---|
| `pls-sem-w6-workplan-v1.md` | Session A–F **全數交付**（2026-07-13），只剩 G（品質小任務） | **可刪**；G 已併入本文件 §2 |
| `redteam-audit-workplan-v1.md` | R1–R5 **全數交付**，只剩 `reference/statlite.jsx` 未刪 | **可刪**；殘項已併入本文件 §2 |
| `handoff-roadmap-v1.md` §6.8／§7 | W6 全交付；§6.8 品質小任務與 §7 產品 backlog 仍未做 | **不可刪**——§2（架構不變量）／§3（沙盒作業手冊）／§5–§6（執行規格）仍然有效。待辦已搬入本文件 |
| `feature-priority-roadmap-v1.md` | 20 項功能**一項都沒做**（COMING_SOON 34 個側欄項目全在） | **可刪**；全部內容已併入本文件 §3 |

保留不動：`validation-report-v1.md`（活的驗證紀錄）、`formula-provenance.md`（新建，溯源登記）、
`pls-model-schema.md`（規格）、`w0-engine-spike-report.md`（歷史證據）、
`pls-sem-roadmap-v1.md`（W0–W6 波次史，標記完成）、`cb-sem-design-plan-v1.md`（見 §4）。

> ⚠️ `optimization-roadmap-v1.md` 在 2026-07-13 這個 session 中途從工作目錄消失
> （session 開始時還在）。其內容大致已被 `feature-priority-roadmap-v1.md` 吸收，
> 但 Kevin 若在意，可從 git 歷史確認是否為誤刪。

---

## 0. ★ 品質規範（2026-07-13 新增，最高位階，凌駕本文件所有排序）

**背景**：2026-07-13 的 R 抽驗（seminr / cSEM / R NCA）暴露一個結構性缺陷——
`reference.json` 有 29 組基準的「黃金標準」是 numpy 手算，**與 JS 實作出自同一個作者對論文的
同一次理解**。兩邊編碼同一個猜測，`compare.test.js` 只能抓到「兩邊抄不一致」，
抓不到「公式本身讀錯」。當天找到的四個 bug **全部落在手算基準**；對照第三方實作的
52 組，一個都沒出事。

**規範**（完整版見 `docs/formula-provenance.md`）：

新增任何統計方法，順序**不可顛倒**：

1. 先找**可執行的第三方實作**（沙盒 pip 裝得到，或 Kevin 本機 R 跑得動）
2. 找不到才回到**原始論文並記下方程式編號**
3. 兩者都做不到 → **不做這個方法**，或明確標為「無法驗證」並在 UI 警告
4. **然後**才寫 `generate_reference.py` 的基準與引擎實作
5. 同時在 `tests/fixtures/provenance.json` 登記溯源

**權威來源依方法族而異**——「查 SPSS/JASP」不是通則：

| 方法族 | 權威 |
|---|---|
| 基礎統計 | R／scipy／statsmodels；SPSS 與 JASP 有分歧時**兩邊都記** |
| PLS-SEM | SmartPLS 4 ＋ Hair／Henseler／Ringle／Sarstedt 原始論文；開源代理 **seminr**（Hair 團隊）、**cSEM**（Henseler 團隊） |
| CB-SEM | lavaan／Mplus |
| NCA | Dul 的 R `NCA` 套件 |
| EFA／CFA | factor_analyzer／semopy；R `psych`／`lavaan` 為第二道 |

**執行機制**：`tests/provenance.test.js` 硬擋。未登記的新方法 → 紅燈；
待審計數量增加 → 紅燈。`MAX_PENDING` 是**只能往下調的棘輪**（起始 15）。
規範靠自律，而 2026-07-13 已證明自律會失效。

---

## 1. P0：公式溯源審計（15 組，3 批）

**Kevin 已裁決：29 組全查、不分級。** 盤點後真正待審計 15 組
（10 組已由 2026-07-13 R 抽驗核對、4 組為純輸入型 fixture）。

正確性是地基。這一項排在所有新功能之前。

### Session Q1：批次 1（6 組）——【2026-07-13 執行，接近完成】

`pls_formative` ✅、`pls_q2` ✅、`pls_predict` Q²predict 定義 ✅、`pls_ipma` ✅、
`pls_itcriteria` ✅、`pls_gof` ✅、盤點覆核新收的 `lda_group3` ✅（2026-07-14，
MASS::lda 全項逐值含分類表）。**Session Q1 已結案。**

**原工單兩處誤判已修正**（詳見 formula-provenance §6）：
- seminr 沒有 `blindfold()`——blindfolding 在世第三方不存在（SmartPLS 4 已移除），
  `pls_q2` 走程序文獻路線結案；
- cSEM 有 `doIPMA`（原工單漏查），`pls_ipma` 以原始碼逐式＋數值複算結案。

**交付判準修正**：原「MAX_PENDING 降至 9」算術有誤——`pls_predict` 本就 verified，
批次 1 只銷 5 筆 pending；加上覆核的 lda_group3 進（+1）出（−1），
Q1 的正確落點是 **10**——已於 2026-07-14 達成。`npm test` 全綠 ✅。
下一步：Session Q2（批次 2 六組，回論文記方程式編號）。

### Session Q2：批次 2 —— 無主流實作，回到論文方程式編號（6 組）——【執行中】

`pls_cta` ✅、`pls_copula` ✅、`pls_fimix` ⬜、`pls_pos` ✅、`pls_cipma` ✅、`pls_bca_reference` ⬜

做法：逐組回到原始論文，**記下方程式編號**寫進 provenance 的 `authority`。
重點查核各自的已知風險點（見 `formula-provenance.md` §4 批次 2 表）。
無法用第三方驗證者，`verification` 必須寫明替代的交叉驗證方式
（如 FIMIX 的「模擬還原＋EM 單調性＋JS↔numpy 逐值」三重策略）。

**交付判準修正**：原「`MAX_PENDING` 降至 3」為算術誤植——批次 2 恰 6 組，10 − 6 = **4**；
批次 3 實為 4 組（`pls_pairwise_wpls`、`pls_quadratic`、`pls_mod_threeway`、`pls_hoc_embedded`）
→ 4 − 4 = 0，與 Q3 判準相容。

**進度（2026-07-25）：Q2 部分交付，未結案。** 4 組 verified，`MAX_PENDING` 10 → **6**。

剩 2 組**卡在文獻取得**（非技術問題，開放存取管道已窮盡，Kevin 的機構訂閱亦未涵蓋，
2026-07-25 確認取不到）：

| 組 | 缺的文獻 | 待核的風險點 | 現行替代驗證 |
|---|---|---|---|
| `pls_fimix` | Hahn, Johnson, Herrmann & Huber (2002), SBR 54(3), 243-269；Sarstedt, Becker, Ringle & Schwaiger (2011), SBR 63(1), 34-62 | 參數計數 N_k、EN 正規化分母、是否含截距 | 模擬還原＋EM 單調性＋JS↔numpy 逐值（三重，已通過） |
| `pls_bca_reference` | Efron & Tibshirani (1993)《An Introduction to the Bootstrap》§14.3（原始出處 Efron 1987, JASA 82(397)） | z₀ 的並列／端點夾擠、a 的 jackknife 估計式與分母指數 | 固定 draws＋jackknife 注入、JS↔numpy 六欄逐值（已通過） |

★ **這兩組的替代驗證都只鎖得住「JS 與 numpy 一致」，鎖不住「公式讀錯」**——正是 §0 規範
點名的結構缺陷。Q2 抓到的兩個 bug（見下）證明了這個區別是實質的，因此**不接受以替代驗證
充當結案**，維持 pending 直到取得原文。

**解除封鎖的可行路徑（依成本排序）**：
1. 館際互借／文獻傳遞（Kevin 的機構圖書館），三篇都適用，通常 1–3 個工作天
2. Efron & Tibshirani 該書為統計系標準教科書，實體館藏取得第 14 章即可
3. `pls_bca_reference` 可先做一道**非權威但獨立的**抽驗：沙盒 `scipy.stats.bootstrap(method='BCa')`
   對同一批 draws 比對（見 provenance 條目 verification 末段）——不能結案，但能提前抓出實作錯誤
4. 寫信向作者索取（Ringle／Sarstedt 團隊對 PLS 社群索取一向回覆）

**Session Q2 剩餘工作**：上述 2 組銷帳後 `MAX_PENDING` 6 → **4**，Q2 才算結案。

★ **本輪的實質產出是兩處公式偏離的修正**（詳見 `validation-report-v1.md` Session Q2 節「一之二」）：

`pls_cta` 的 CI 臨界值誤用 Student t（原文 Eq. 2 為常態 z）；`pls_pos` 的目標函數誤用
ΣSSE（原文為 ΣR²，兩者不等價，改正後段別還原率 0.837 → 0.857）。
這證實了 §0 的判斷——手算基準的自我一致性檢查抓不到公式誤讀，只有回原文能抓到。

**Q2 順帶產生的兩筆待辦（不擋 Q2 結案，記入 §2 品質殘項）**：
- `pls_cta` 的**非冗餘 tetrad 選取集**代數在 Bollen & Ting (1993), Sociological Methodology 23
  （亦未取得）。本工具的構造已以 Jacobian 秩 assert 保證極大獨立、omnibus 判讀等價，
  但個別 tetrad 的 CI 會隨選取集而異——取得該文後應覆核。
- `pls_pos` 的完整演算法（目標函數是否另含加權、距離量測定義）在 Becker et al. (2013)
  線上補充 **Appendix B**（未取得）。本工具已明示為結構模型層簡化版。

### Session Q3：批次 3 —— 補登記與補驗（4 組）——【2026-07-25 全數交付】

`pls_pairwise_wpls` ✅、`pls_quadratic` ✅、`pls_mod_threeway` ✅、`pls_hoc_embedded` ✅

**原工單誤植兩處，已修**：(a) 標題寫「3 組」但實際列出 4 個方法（`pls_quadratic` 與
`pls_mod_threeway` 是兩組獨立 fixture，非一組）；(b) 交付判準「`MAX_PENDING` 降至 0」
建立在 Q2 已降到 4 的前提上，Q2 因文獻未取得只降到 6 → 本 session 的正確落點是 **2**。

| 組 | 路線 | 證據 |
|---|---|---|
| `pls_pairwise_wpls` | **沙盒第三方（最強）** | pairwise-complete 相關 vs `pandas.DataFrame.corr()`（預設即 pairwise）差 3.886e-16；加權相關 vs `statsmodels DescrStatsW` 差 4.441e-16、vs `numpy.cov(aweights, ddof=0)` 差 2.220e-16。**三道已升為重生時 assert**（容差 1e-12），不再是一次性抽驗。另註：相關為尺度不變量，ddof 取 0 或 1 得同一相關矩陣（實測 <1e-15），無慣例分歧風險 |
| `pls_hoc_embedded` | 權威文獻逐點＋第一階段有第三方錨 | Becker et al. (2023), IJCHM 35(1) accepted MS pp. 15-16（OA）逐點核對四項口徑全中；**引用補正**：方法源出 Ringle, Sarstedt & Straub (2012)，Sarstedt et al. (2019)／Becker et al. (2023) 為程序指引。第一階段即 `pls_hoc_repeated`，已有對 plspm 的重生時 assert <1e-6 |
| `pls_quadratic` | 官方文件逐點＋機制同源 | SmartPLS 4「Nonlinear Relationships」：二次效果「is like a self-moderation」、走 two-stage、第一階段取**主效果模型（不含二次項）**的 LV 分數、平方為第二階段指標——三項全中。**並在 `pls.js` 查核第一階段確實排除全部交互／二次項**（`estimateStage(curPaths)` 在 `intPaths` 併入前執行） |
| `pls_mod_threeway` | 權威文獻逐字＋機制同源 | Becker et al. (2023) guidance 表逐字：「As with two-way interactions, researchers should draw on the two-stage approach… The resulting product should not be standardized, and the researchers should estimate and interpret the unstandardized coefficient.」＋階層完整規格（3 主效果＋3 兩向＋1 三向，Aiken & West 1991） |

**誠實標註的殘餘限制**：`pls_quadratic`／`pls_mod_threeway`／`pls_hoc_embedded` 三組
**沒有專屬的第三方數值對照**（SmartPLS 4 授權過期、seminr 無 quadratic／三向／embedded 支援）。
它們的保證來自「權威文獻逐字或逐點 ＋ 機制與已對 seminr 的 `pls_mod_twostage`／`pls_hoc_disjoint`
同一條程式路徑 ＋ 規格完整性查核」三者疊加，已寫入各自的 provenance `verification`。

**Session Q3 交付判準（修正後）**：批次 3 四組全部 verified、`MAX_PENDING` 降至 **2**
（＝Q2 卡文獻的 `pls_fimix`、`pls_bca_reference`）。✅ 2026-07-25 達成。

### P0 現況（2026-07-25）

`MAX_PENDING` **15 → 2**。剩餘 2 組全部卡在文獻取得，無技術障礙——
取得 Hahn (2002)／Sarstedt et al. (2011)／Efron & Tibshirani (1993) §14.3 後即可降至 **0**，
P0 公式溯源審計全數結案。解除封鎖路徑見 §1 Session Q2 節。

---

## 2. P1：品質殘項打包

來自 `redteam-audit-workplan` 與 `handoff §6.8` 的殘項。**原估「1 session 低成本清帳」是誤判**——
清單有九類、其中數項會動到統計核心，實際需要 2–3 個 session。2026-07-25 已完成第一批。

### 2.1 已完成

- ✅ **MGA／PLSpredict／IPMA 的 APA Narrative 敘述句**（2026-07-25）。
  **實際缺口是 8 項不是 3 項**——原清單寫於 W5 時期，W6 新增的 CTA、Gaussian copula、
  FIMIX、PLS-POS、cIPMA 同樣沒有敘述句。本次一次補齊 8 項（中英各一份）。
  同時把句子組裝自 `Narrative.jsx` 抽成純函式模組 `src/analyses/pls/apaNarrative.js`
  （對齊架構不變量 1；並讓它能在 node 環境測試——jsdom 在沙盒跑不動）。
  新增 `tests/pls.narrative.test.js` 11 項行為測試。

### 2.2 已確認不需要做（工單過期，經 2026-07-25 查核）

- ~~既有 59 個 eslint 問題清理~~ → **已歸零**。`npx eslint src tests` 目前 0 problems。
- ~~`deploy.yml` 加 lint step~~ → **已存在**，2026-07-13 紅隊 R4 就補上了（連 `npm test` 一起）。
- ~~刪 `reference/statlite.jsx`~~ → **Kevin 2026-07-25 裁決保留，本條刪除**。
  理由：它不是可安全刪除的 dead code——`descriptive.js`、`pvalue.js`、`ttest.js`
  三個檔的檔頭都以它為溯源出處（「從 reference/statlite.jsx 抽出，已對標 SPSS」）；
  且 `eslint.config.js` 已用 `globalIgnores(['dist', 'reference'])` 排除它，
  原本「它讓 lint 破表」的刪除理由已不成立。在剛建立完溯源鏈的專案裡刪掉一份被引用的
  溯源出處，代價不對稱。

### 2.3 待辦（依成本與風險分層）

**不動統計核心（低風險）**
- IPMA 量表理論界線的 UI 設定（目前用觀察 min/max，差異已在 Notes 與敘述句中註記）
- IPMA 塊內指標量尺不一時的 UI 警告（官方 cIPMA 教程列為未滿足假設；見 formula-provenance §6）
- blindfolding Q² 的 UI legacy 註記（SmartPLS 4 已移除、官方改推 PLSpredict/CVPAT——本工具皆已內建）
- W4 canvas 顯示層：互動項／HOC 目前不出現在畫布（`Canvas.jsx` 完全未讀 interactions／
  higherOrder，表單為 source of truth）
- 示範資料集：加一個含調節／HOC／群組欄位的 PLS 示範（`src/config/demos.js`）——
  順帶擴大 `ui.smoke` 的涵蓋（現行 PLS 示範沒有開任何 W5／W6 開關）
- `code-review-2026-05-13.md` 第四階段殘項：README 里程碑、OG meta、
  PDF metadata／動態 scale、多 sheet 警告

**會動統計核心（需 fixture 與重生）**
- PLSpredict 多次重複取平均（SmartPLS 預設 10 reps）；MGA 的 PLSc 版
- moderated mediation（條件間接效果；W4 機制同源，PROCESS 式輸出）——
  這其實是**新功能不是殘項**，建議移入 §3 波次

**卡外部資源**
- 【Q2】`pls_cta` 的非冗餘 tetrad 選取集：取得 Bollen & Ting (1993) 後覆核
  （現行構造已保證極大獨立，僅個別 tetrad 的 CI 可能隨選取集而異）
- 【Q2】`pls_pos`：取得 Becker et al. (2013) 線上 Appendix B 後覆核目標函數與距離量測；
  若要補足「段別測量權重重估」則屬獨立一波（非殘項，見 §3 需求觸發再排）
- 【Q2】`pls_bca_reference` 加一道 `scipy.stats.bootstrap(method='BCa')` 的獨立抽驗
  （非權威、不能結案，但能提前抓實作錯誤；重生時 assert 化）——此項**不卡文獻，可隨時做**

---

## 3. P2 起：待上線統計功能（20 項，波次化）

排序準則（權重由高至低）：台灣社科（公行／管理／教育）學位論文與 TSSCI 的**使用頻率** →
**受眾契合**（中文問卷型研究者，量表流程加權）→ **實作成本與複用** → **基準可得性**。

> **每一波都受 §0 的品質規範約束**：先查權威來源 → 再寫基準與實作 → 同步登記 provenance。
> 「基準」欄位若寫不出可執行的第三方實作，該項就必須回到論文方程式編號，否則不做。

### Wave F1：快贏包（低成本、高頻）
| 功能 | 權威來源 | tier |
|---|---|---|
| McDonald's ω（含 ω_h） | R `psych::omega`（Kevin 本機）／semopy | A 可達 |
| Friedman 檢定 | scipy `friedmanchisquare` | A |
| McNemar 檢定 | statsmodels `mcnemar` | A |
| 專案檔本地保存／載入 | 非統計功能（round-trip 測試） | — |

### Wave F2：效果量＋95% CI 全面補齊（APA 7 剛需，跨模組橫切）
權威：pingouin（`compute_effsize`／`compute_esci`）；**無 pingouin 對應者須回論文**。
工作量大但機械性高。

### Wave F3：資料前處理模組
反向計分、量表加總、變數計算、缺失策略明示、離群值檢查。
確定性轉換，基準為手算但**公式無爭議**（tier B 但可快速 verified）。

### Wave F4：迴歸式調節／中介（PROCESS 對標：Model 1、4、7、8、14）
權威：Hayes (2022) PROCESS 手冊的 Model 編號與方程式；**Kevin 本機 R `processR`／SPSS PROCESS 抽驗**。
bootstrap 間接效果、簡單斜率。複用 PLS 的 bootstrap Worker 協定。
★ 這一項的慣例分歧最多（中心化、CI 類型、簡單斜率的取值點），**必須先抽驗再實作**。

### Wave F5：統計檢定力與樣本數計算（G*Power 對標）
權威：statsmodels `stats.power`；**G*Power 為第二道**（Kevin 本機可裝）。

### Wave F6：docx 輸出第一版（APA 三線表）
先做迴歸／ANOVA／PLS 三類。格式對標 APA 7。

### Wave F7：GLM 家族打包
ordinal logit／multinomial logit／probit／Poisson／負二項。
權威：statsmodels（`OrderedModel`／`MNLogit`／`Probit`／`Poisson`／`NegativeBinomial`）——全部 tier A 可達。

### Wave F8：HLM（隨機截距／斜率、ICC、組平減）
權威：statsmodels `MixedLM`；**Kevin 本機 `lme4` 為第二道**（估計法 REML/ML 的分歧必查）。
高成本、獨立波。

### 需求觸發再排（不排時程）
meta-analysis、polynomial regression、ROC/AUC、CCA、IRT、ARIMA、Bayesian 三支、Cox。

**COMING_SOON 側欄**（34 項）：每波上線後同步從灰色轉正式入口，不留死入口。
長期不做的（Bayesian／ARIMA／Cox／IRT）建議加註「長期」標記，避免過度承諾。

---

## 4. CB-SEM（Kevin 裁決：暫緩）

`cb-sem-design-plan-v1.md` 保留不動。已定案的兩個決策點：

- **量尺設定**：固定首負荷，對齊 lavaan（cfa.js 不動）
- **啟動順序**：PLS 收尾完成後再啟動 —— **PLS W6 已於 2026-07-13 全數交付，此前提已滿足**

未決：CFA 模組去留（建議並列）、Wave C4 範圍（建議 spike 報告後再議）。

★ **CB-SEM 的 spike 也受 §0 規範約束**：lavaan 是權威，semopy 是沙盒代理，
gate 判準第 3 條「Kevin 本機 lavaan 抽驗」正是 tier A 的要求。

---

## 5. 執行紀律（沿用，不重述）

沙盒限制、fixture-first 紅綠流程、架構不變量七條、git 流程
→ `handoff-roadmap-v1.md` §2–§3。

**唯一新增的硬約束**：§0 的公式溯源規範與 `provenance.test.js` 棘輪。

---

## 版本紀錄

- v2（2026-07-13）：初版。合併 `pls-sem-w6-workplan-v1`（A–F 已交付）、
  `redteam-audit-workplan-v1`（R1–R5 已交付）、`handoff §6.8/§7`、
  `feature-priority-roadmap-v1`（20 項未做）；新增 §0 品質規範與 P0 公式溯源審計。
- v2.1（2026-07-25）：Session Q2 部分交付。§1 補 Q2 進度表、交付判準算術修正（3 → 4）、
  兩組卡文獻的解除封鎖路徑；§2 補 Q2 產生的三筆品質殘項。
  棘輪 10 → 6；抓到並修正 `pls_cta`（t → z）與 `pls_pos`（ΣSSE → ΣR²）兩處公式偏離。
  完整測試套件本機驗收 1136 過、6 跳過、零失敗。
- v2.3（2026-07-25）：P1 第一批交付——APA 敘述句補齊 8 項（原工單寫 3 項為 W5 時期的過期盤點）、
  句子組裝抽成 `apaNarrative.js` 純函式模組並補 11 項行為測試。§2 全面改寫：
  移除兩條已完成的過期項（59 個 eslint 已歸零、deploy.yml lint step 已存在）、
  記錄 `statlite.jsx` 保留裁決與理由、待辦依「是否動統計核心」分層、
  修正「1 session 低成本清帳」的原始誤判。
- v2.2（2026-07-25）：Session Q3 全數交付。批次 3 四組 verified，`MAX_PENDING` 6 → **2**；
  `pls_pairwise_wpls` 取得三道沙盒第三方對照並升為重生時 assert；`pls_hoc_embedded` 引用補正
  （方法源出 Ringle et al. 2012）。修正原工單兩處誤植（批次 3 是 4 組非 3 組；Q3 判準 0 → 2）。
  P0 只剩 Q2 卡文獻的兩組。
