# 方法可靠度文件（docs/methods/）

> 多多快跑階段 A 產出（規格見 `docs/roadmap-v2.md §6`）。一個「可報告的統計方法」一份文件，八節固定模板。
> **本索引隨批次逐步補齊，目前為進行中狀態。**

## 這批文件是什麼

每份文件回答同一組問題：這個方法在回答什麼問題、什麼時候不該用、公式是什麼、
本工具在有慣例分歧的地方採了哪一個、假設前提怎麼檢核、**哪些部分還沒被驗證**、
報表上每個數字對應哪條公式、紅隊查過哪幾項。

### 兩個閱讀入口

- **想知道某個數字怎麼算出來的** → 直接看該方法文件的第 3 節（公式，每條都附 `src/lib/stats/pls.js` 的行號區間）與第 7 節（報表欄位對照）
- **想評估這個工具可不可信** → 看第 6 節「對照與驗證狀態」，特別是其中的 **★ 尚未驗證的部分**

★ 第 6 節的「尚未驗證」是這批文件的重點。多多快跑的 83 組基準中有 30 組屬 **tier B**
（沒有可執行的第三方數值對照，只靠權威文獻與機制同源撐住）。把這件事逐項講清楚，
比宣稱「已完整驗證」誠實，也才對得起審稿人。歷來抓到的公式錯誤**全部**落在 tier B 那一側。

### 溯源分級（tier）的意思

| tier | 意思 | 風險 |
|---|---|---|
| **A** | 基準值直接來自可執行的第三方（scipy／statsmodels／pingouin／sklearn／factor_analyzer／semopy／plspm／R 套件） | 低 |
| **B** | 沒有直接的第三方數值來源，靠「權威文獻逐點 ＋ 機制同源 ＋ 代數斷言」撐住 | **主要風險所在** |
| **I** | 純輸入型 fixture（注入的 permutation／bootstrap 索引），豁免 | — |
| **pending** | 卡原始文獻取得，未結案 | 明示於文件 |

完整登記見 `tests/fixtures/provenance.json`，規範見 `docs/formula-provenance.md`，
驗證歷程見 `docs/validation-report-v1.md`。

## 進度

| 批次 | 範圍 | 狀態 |
|---|---|---|
| **A1** | PLS 測量與估計核心 | ✅ **完成（10 / 10）** |
| **A2** | PLS 調節／高階／中介 | ✅ **完成（10 / 10）** |
| **A3** | PLS 進階分析（W5／W6） | 🔄 **進行中（3 / 10）** |
| A4 | NCA／LDA／CFA／EFA | 未開始 |
| A5 | 推論統計與無母數 | 未開始 |
| A6 | 敘述／相關／迴歸／量表／多變量 | 未開始 |

## A1 — PLS 測量與估計核心

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [pls-basic.md](pls-basic.md) | PLS-SEM 基本估計（Lohmöller 迭代、Mode A、三種 weighting scheme、結構模型） | `pls_basic`、`pls_scheme_centroid`、`pls_scheme_factorial` | B / verified |
| [pls-formative.md](pls-formative.md) | 形成型測量（Mode B、regression weights、外部 VIF） | `pls_formative` | B / verified |
| [pls-plsc.md](pls-plsc.md) | 一致化 PLS（PLSc、rho_A 反衰減） | `pls_plsc`、`pls_plsc_pw` | B / verified |
| [pls-reliability-validity.md](pls-reliability-validity.md) | 信度與效度（α／rho_A／CR／AVE／Fornell-Larcker／HTMT） | `pls_basic` 的 11 欄 ＋ `pls_pairwise_wpls` 的 8 欄 | B / verified |
| [pls-fit.md](pls-fit.md) | 模型適配（SRMR／d_ULS／d_G／NFI） | `pls_fit` | B / verified |
| [pls-gof.md](pls-gof.md) | 適合度指數 GoF（**不建議使用**，僅供舊文獻對照） | `pls_gof` | **A** / verified |
| [pls-bootstrap.md](pls-bootstrap.md) | Bootstrap 推論（percentile CI、SE、t、p、符號校正） | **無專屬基準組** | B / verified |
| [pls-bca.md](pls-bca.md) | BCa 信賴區間 | `pls_bca_reference` | B / ★ **pending** |
| [pls-q2.md](pls-q2.md) | Blindfolding Q²（**legacy**，官方已移除） | `pls_q2` | B / verified |
| [pls-pairwise-wpls.md](pls-pairwise-wpls.md) | pairwise deletion 與加權 PLS（WPLS） | `pls_pairwise_wpls` | B / verified |

### A1 的紅隊結果摘要

10 份文件跑完八條紅隊檢查表，開出 12 項，其中一項是**真 bug**。
2026-07-26 當日 Kevin 裁決後**全部處置完畢**（9 項當場修、3 項再裁決後修），
只剩一項卡本機資源：

| 編號 | 級別 | 內容 | 狀態 |
|---|---|---|---|
| R6 | **L4** | PLSc 與 pairwise／WPLS 併用時，一致化走錯相關矩陣 → rho_A 低估 0.09–0.15（跨過 .70 判準）、路徑高估約 18% | ✅ 已修＋新增基準組 `pls_plsc_pw`＋結構性 assert |
| R3 | L3 | 區塊內平均相關同為負時，HTMT 輸出「通過」的數值 | ✅ 已修（回傳 `null`＋警告） |
| R2 | L1＋L3 | rho_A 引用出處誤植為《Psychometrika》80(2)（5 處） | ✅ 已修為 MISQ 39(2), 297–316 |
| R4 | L2 | 區塊內負荷量正負混雜無任何警告（反向題未反向計分） | ✅ 已修 |
| R5 | L2 | APA 敘述句未載明「標準化 α」 | ✅ 已修 |
| R8 | L1 | SRMR 分母與 NFI 虛無模型兩項慣例從未書面化 | ✅ 已補入 `pls-fit.md` §3.4 |
| R9 | L1 | GoF 的 communality 平均方式未被基準覆蓋 | ✅ 已記錄 |
| R11 | L1 | `pw_minPairs`／`pw_minEig` 兩欄實際未被比對覆蓋 | ✅ 已記錄 |
| R7 | L2 | Mode B 區塊奇異時錯誤訊息未指名構念 | ✅ 已修（前置檢查＋專屬錯誤碼 `formative-block-singular`） |
| R10 | L2 | bootstrap 剔除比例偏高時沒有警示（★ 原判讀「數量未揭露」有誤，實查後數量早已顯示兩處） | ✅ 已修（>5% 時警告，含 df 說明） |
| R12 | L2 | APA 敘述句未揭露缺失值處理與抽樣權重 | ✅ 已修（四種情境中英各一，含 WPLS 的推論限制） |
| — | — | bootstrap 的 p 值口徑未對 seminr 核對（需本機 R） | ⬜ 卡本機資源 |

★ R6 與 R9 是同一類成因——**不是公式讀錯，而是組合／情境未被基準覆蓋**。
這是階段 A 之前的溯源制度看不到的死角，也是這批文件最主要的貢獻。

★ 另一條教訓：**R7 與 R10 的第一次判讀都是讀程式碼推論出來的，實測後都證明過度指控**
（R7 的錯誤訊息其實歸因正確、R10 的數量其實早已顯示）。兩份文件都完整保留了兩次判讀，
並把「涉及使用者看得到什麼的檢查一律實跑」寫進 `roadmap-v2.md §6.8`。

## A2 — PLS 調節／高階／中介

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [pls-mediation.md](pls-mediation.md) | 中介效果分解（直接／特定間接／總效果／VAF） | `pls_mediation` | **A** / verified |
| [pls-moderation-twostage.md](pls-moderation-twostage.md) | 調節：two-stage 法（**預設**；二次與三向共用同一路徑） | `pls_mod_twostage` | B / verified |
| [pls-moderation-product-indicator.md](pls-moderation-product-indicator.md) | 調節：product indicator 法 | `pls_mod_pi` | B / verified |
| [pls-moderation-orthogonal.md](pls-moderation-orthogonal.md) | 調節：orthogonalizing 法（正交化） | `pls_mod_ortho` | B / verified |
| [pls-quadratic.md](pls-quadratic.md) | 二次效果（self-moderation） | `pls_quadratic` | B / verified |
| [pls-moderation-threeway.md](pls-moderation-threeway.md) | 三向交互（階層完整規格） | `pls_mod_threeway` | B / verified |
| [pls-hoc-repeated.md](pls-hoc-repeated.md) | 高階構念：repeated indicators | `pls_hoc_repeated` | **A** / verified |
| [pls-hoc-disjoint.md](pls-hoc-disjoint.md) | 高階構念：disjoint two-stage（**官方首選**） | `pls_hoc_disjoint` | B / verified |
| [pls-hoc-embedded.md](pls-hoc-embedded.md) | 高階構念：embedded two-stage | `pls_hoc_embedded` | B / verified |
| [pls-moderated-mediation.md](pls-moderated-mediation.md) | 調節式中介（條件間接效果） | `pls_modmed` | B / verified |

### A2 的紅隊結果摘要

10 份文件跑完八條紅隊檢查表，開出 11 項，**當日全部處置完畢**。
★ **本批的實質發現全部來自「實跑」，不是讀碼**：

| 編號 | 級別 | 內容 | 狀態 |
|---|---|---|---|
| R13 | L2 | ★ **A1 自己引入的假陽性**：交互構念的乘積指標 loading 正負混雜是正常性質，A1 的 R4 警告卻誤報「反向題未反向計分」 | ✅ 已修（排除交互構念）＋3 條測試（含「一般構念仍須被抓到」） |
| R14 | L2 | 交互構念在信效度表亮紅燈（實測 AVE = 0.286、rho_A = 0.419），但乘積指標的門檻本來就不適用 | ✅ 已修（單列、不判紅綠、標註「（交互構念）」） |
| R15 | L3 | repeated HOC 下 model fit 因矩陣奇異不計算，**但 GoF 照算**且 communality 重複計入（實測 0.472 vs 非 HOC 的 0.258） | ✅ 已修（跟進 fit 的守衛）＋2 條測試 |
| R16 | L2 | 中介 VAF 會跑出 [0,1]（實測 **−222%**）；無 direct path 時恆為 100%（套套邏輯） | ✅ 已修（逐列標記不適用＋滑鼠提示） |
| R17 | L1 | 三種調節法的交互係數**連正負號都可能不同**（+0.147／−0.195／+0.335） | ✅ 已記錄 |
| R18 | L1 | 二次項的正負 ≠ 曲線走向（實測 $b_q>0$ 但三個水準斜率全負） | ✅ 已記錄 |
| R20 | L1 | HOC→HOC 的笛卡兒積展開分支未被基準覆蓋 | ✅ 已記錄 |
| R23 | L1 | 同一個交互項會產生兩筆條件間接效果（數值正確、對稱性使然） | ✅ 已記錄 |
| R19 | L2 | 三向交互的**階層完整性不檢核**——只宣告三向項而不宣告兩向項時照跑，但係數無法解釋 | ✅ 已修（檢查全部二元子集、指名缺項、不擋）＋3 條測試 |
| R21 | L2 | embedded 法在模型語法中叫 `'two-stage'`，寫 `'embedded'` 會撞牆且訊息不說明 | ✅ 已修（接受 `'embedded'` 別名並正規化）＋2 條測試 |
| R22 | L2 | 調節式中介不符範圍限制時**靜默無輸出**，使用者以為功能不支援 | ✅ 已修（依情形分兩種訊息、指名估計法）＋2 條測試 |

★ R13 是本批最值得記的一項：**A1 的修正在 A2 被驗出有假陽性**。
這說明「加警告」本身也需要跨情境驗證，不能只在原始情境測過就算數。

## A3 — PLS 進階分析（W5／W6）【進行中 3 / 10】

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [pls-mga.md](pls-mga.md) | 多群組分析（pooled t／Welch／Henseler／permutation 四法並列） | `pls_mga_formulas`、`pls_mga_perm`、`pls_mga_perm_inputs` | B / verified（輸入組 I / exempt） |
| [pls-micom.md](pls-micom.md) | 測量恆等性 MICOM（三步驟） | `pls_micom` | B / verified |
| [pls-itcriteria.md](pls-itcriteria.md) | 模型選擇準則（AIC／AICc／BIC／HQ） | `pls_itcriteria` | B / verified |

**未完成（7 份）**：`pls-predict`（含多次重複）、`pls-ipma`、`pls-cipma`、`pls-cta`、
`pls-copula`、`pls-fimix`（維持 **pending**，卡文獻）、`pls-pos`。

### A3a 的紅隊結果摘要

三份文件跑完八條紅隊檢查表，開出 6 項，**當日全部處置完畢**。
★ **本批的發現集中在同一個樣式：引擎算了、回傳了、測試也鎖了，但使用者看不到。**

| 編號 | 級別 | 內容 | 狀態 |
|---|---|---|---|
| **R24** | L2 | ★ **IT 準則（AIC/AICc/BIC/HQ）完全沒有 UI**，而說明區已對使用者描述它——工具在說明一張不存在的報表 | ✅ 已修（另立「模型選擇準則」表＋三條不可比較的警語） |
| R25 | L2 | 雙尾 Henseler p（`henselerP2`）算了、測試鎖了，報表只顯示單尾 | ✅ 已修（MGA 表新增一欄） |
| R26 | L2 | MICOM 的 compositional invariance permutation p（`cP`）算了但不顯示 | ✅ 已修（MICOM 表新增一欄） |
| R27 | L2 | MICOM 表沒有 meta 行，看不到各組 $n$ 與有效 permutation 次數（MGA 有） | ✅ 已修 |
| R28 | L1 | `mgaNote` 寫「兩組人數相等時與 pooled t 恆等」——**t 確實逐位元相同，但 df 與 p 不同**（58 vs 52.23、.0194 vs .0198） | ✅ 已修（措辭精確化＋附實測數字） |
| R29 | L2 | MICOM **完全不進 APA 敘述句**，而 MGA 敘述句叫讀者「先檢視 MICOM」——句子指向自己不報的東西 | ✅ 已修（新增 MICOM 段落，排在 MGA 之前）＋6 條測試 |

★ **這一批沒有 L3／L4**：三個方法的公式層與引擎層全部對得起獨立重寫
（`pls_mga_formulas` 7 欄差 **0.0**、`pls_mga_perm` 42 欄差 3.886e−16、
`pls_micom` 18 欄差 2.220e−16、`pls_itcriteria` 12 欄差 8.882e−15）。
**問題全部在呈現層。**

★ 一則值得記住的觀察：`provenance.test.js` 的棘輪管「方法有沒有登記」、
`compare.test.js` 管「數字對不對」，**沒有任何一道防線管「這個數字使用者看得到嗎」**。
R24–R27 四項都是從這個縫隙掉出去的。A1 的 R6（組合未被基準覆蓋）是同一類死角的另一面。

## 側欄模組 → 方法對照

【待階段 A 收尾補齊】28 個側欄模組對應到約 60 個可報告方法，對照表在文件齊備後一次產出——
提前寫會與實際完成的文件清單脫節。

