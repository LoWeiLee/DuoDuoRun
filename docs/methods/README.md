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
| A2 | PLS 調節／高階／中介 | 未開始 |
| A3 | PLS 進階分析（W5／W6） | 未開始 |
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

10 份文件跑完八條紅隊檢查表，開出 12 項，其中一項是**真 bug**：

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
| R7 | L2／L3 | Mode B 區塊奇異時錯誤訊息未指名構念 | ⬜ 待裁決 |
| R10 | L2 | `nSkipped`（被剔除的重抽次數）未在報表揭露 | ⬜ 待裁決 |
| R12 | L2 | APA 敘述句未揭露缺失值處理與抽樣權重 | ⬜ 待裁決 |
| — | — | bootstrap 的 p 值口徑未對 seminr 核對（需本機 R） | ⬜ 卡本機資源 |

★ R6 與 R9 是同一類成因——**不是公式讀錯，而是組合／情境未被基準覆蓋**。
這是階段 A 之前的溯源制度看不到的死角，也是這批文件最主要的貢獻。

## 側欄模組 → 方法對照

【待階段 A 收尾補齊】28 個側欄模組對應到約 60 個可報告方法，對照表在文件齊備後一次產出——
提前寫會與實際完成的文件清單脫節。

