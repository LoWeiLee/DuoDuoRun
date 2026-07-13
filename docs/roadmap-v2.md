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

### Session Q1：批次 1 —— 有第三方實作可對，一查就能升 Tier A（6 組）

`pls_formative`、`pls_q2`、`pls_predict`（Q²predict 定義）、`pls_ipma`、`pls_itcriteria`、`pls_gof`

做法：擴充 `scripts/validation/` 的 R 腳本（seminr 的 `blindfold()`／`predict_pls()`、
cSEM 的 Mode B）＋沙盒 plspm 的 `gof`。有差異即修並記入 validation-report；
慣例差異雙處標註。逐組完成後把 provenance 的 status 改 `verified`、`MAX_PENDING` 減 1。

**Session Q1 交付判準**：6 組全部 verified、`MAX_PENDING` 降至 9、`npm test` 全綠。

### Session Q2：批次 2 —— 無主流實作，回到論文方程式編號（6 組）

`pls_cta`、`pls_copula`、`pls_fimix`、`pls_pos`、`pls_cipma`、`pls_bca_reference`

做法：逐組回到原始論文，**記下方程式編號**寫進 provenance 的 `authority`。
重點查核各自的已知風險點（見 `formula-provenance.md` §4 批次 2 表）。
無法用第三方驗證者，`verification` 必須寫明替代的交叉驗證方式
（如 FIMIX 的「模擬還原＋EM 單調性＋JS↔numpy 逐值」三重策略）。

**Session Q2 交付判準**：6 組全部 verified 且 authority 含方程式編號、`MAX_PENDING` 降至 3。

### Session Q3：批次 3 —— 補登記與補驗（3 組）

`pls_pairwise_wpls`、`pls_quadratic`／`pls_mod_threeway`（機制同 two-stage，已對 seminr）、
`pls_hoc_embedded`（disjoint 已對 seminr，embedded 需補）

**Session Q3 交付判準**：`MAX_PENDING` 降至 **0**。

---

## 2. P1：品質殘項打包（1 session，低成本清帳）

來自 `redteam-audit-workplan` 與 `handoff §6.8` 的殘項，全部併成一包：

- **刪 `reference/statlite.jsx`**（586 行 dead code）。redteam 原計畫註明「刪檔前先問 Kevin」——
  這是「不刪除任何檔案」通則的例外授權，**執行前仍須確認**
- W4 canvas 顯示層：互動項／HOC 目前不出現在畫布（表單為 source of truth）
- MGA／PLSpredict／IPMA 的 APA Narrative 敘述句（i18n 已有表格判讀文字，缺敘述句）
- PLSpredict 多次重複取平均（SmartPLS 預設 10 reps）；MGA 的 PLSc 版
- IPMA 量表理論界線的 UI 設定（目前用觀察 min/max，已註記差異）
- moderated mediation（條件間接效果；W4 機制同源，PROCESS 式輸出）
- 示範資料集：加一個含調節／HOC／群組欄位的 PLS 示範（`src/config/demos.js`）
- `code-review-2026-05-13.md` 第四階段殘項：README 里程碑、OG meta、PDF metadata／動態 scale、
  多 sheet 警告、`deploy.yml` 加 lint step

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
