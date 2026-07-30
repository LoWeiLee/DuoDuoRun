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
| **A3** | PLS 進階分析（W5／W6） | ✅ **完成（10 / 10，2026-07-29）** |
| **A4** | **NCA／LDA／CFA／EFA** | ✅ **完成（7 / 7，2026-07-29）** |
| **A5a** | **t 檢定與 ANOVA 家族** | ✅ **完成（7 / 7，2026-07-29）** |
| **A5b** | **類別與無母數（卡方／Fisher／z 比例／Mann-Whitney／Wilcoxon／Kruskal-Wallis）** | ✅ **完成（6 / 6，2026-07-30）** |
| **A6a** | **敘述／視覺化／常態／變異數同質／相關／迴歸三支** | 🔄 **進行中（2026-07-30）**——`normality` 已交付，抓到階段 A 的第三個 L4 |
| A6b | 邏輯迴歸／量表信度／ICC／Kappa／MANOVA／集群 | 未開始 |

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

## A3 — PLS 進階分析（W5／W6）✅ 完成（10 / 10）

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [pls-mga.md](pls-mga.md) | 多群組分析（pooled t／Welch／Henseler／permutation 四法並列） | `pls_mga_formulas`、`pls_mga_perm`、`pls_mga_perm_inputs` | B / verified（輸入組 I / exempt） |
| [pls-micom.md](pls-micom.md) | 測量恆等性 MICOM（三步驟） | `pls_micom` | B / verified |
| [pls-itcriteria.md](pls-itcriteria.md) | 模型選擇準則（AIC／AICc／BIC／HQ） | `pls_itcriteria` | B / verified |
| [pls-predict.md](pls-predict.md) | 樣本外預測 PLSpredict ＋ CVPAT（含多次重複） | `pls_predict` | B / verified |
| [pls-ipma.md](pls-ipma.md) | 重要性－績效地圖分析 IPMA | `pls_ipma` | B / verified |
| [pls-cipma.md](pls-cipma.md) | 組合式 IPMA × NCA（cIPMA） | `pls_cipma` | B / verified |
| [pls-copula.md](pls-copula.md) | 內生性檢查 Gaussian copula（control function） | `pls_copula`、`pls_copula_inputs` | B / verified（輸入組 I / exempt） |
| [pls-pos.md](pls-pos.md) | 預測導向分段 PLS-POS（爬山法） | `pls_pos`、`pls_pos_inputs` | B / verified（輸入組 I / exempt） |
| [pls-cta.md](pls-cta.md) | 驗證性四分差分析 CTA-PLS（bootstrap tetrad） | `pls_cta` | B / verified（**帶明文保留**：選取集無第三方可核） |
| [pls-fimix.md](pls-fimix.md) | 潛在異質性分段 FIMIX-PLS（EM ＋ 八個段數準則） | `pls_fimix`、`pls_fimix_inputs` | B / ★ **pending**（三筆原文皆未取得） |

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

★ **本機補跑（2026-07-29）抓到一項**：R24 的表通過並正確渲染警語，
但 R25–R27 那條測試失敗——**不是 UI 壞了，是測試自己選錯資料**。
`employee` 的 `department` 分佈不均（casewise 後人事只剩 5 筆）且 q2 在人事組內零變異，
兩群估計直接失敗、表格根本沒 render。已改用沙盒逐對實測可收斂的 財務／研發，
並補一條「先斷言畫面上沒有『無法計算：』」的防假通過斷言。
⇒ **寫 jsdom 測試時凡選了特定資料子集，先在沙盒把該子集餵給引擎跑一次。**

★ 一則值得記住的觀察：`provenance.test.js` 的棘輪管「方法有沒有登記」、
`compare.test.js` 管「數字對不對」，**沒有任何一道防線管「這個數字使用者看得到嗎」**。
R24–R27 四項都是從這個縫隙掉出去的。A1 的 R6（組合未被基準覆蓋）是同一類死角的另一面。

### A3b 的紅隊結果摘要

三份文件（`pls-predict`／`pls-ipma`／`pls-cipma`）開出 3 項，**當日全部處置完畢，無 L3／L4**。
獨立重寫：`pls_predict` 48 欄 8.882e−15、`pls_ipma` 10 欄 1.421e−14、`pls_cipma` 10 欄 3.553e−15。

| 編號 | 級別 | 內容 | 狀態 |
|---|---|---|---|
| **R32** | L2 | ★ **說明文字寫四級判讀、實作只做三級**——不是有沒有，是**級數不符** | ✅ 已修（判準抽成純函式 `plspredictVerdict`，報表與敘述句共用）＋3 條測試 |
| R31 | L2 | LM 基準的 Q²predict 與 MAE 算了、比對了，報表只顯示 `lm.rmse` | ✅ 已修（補兩欄，原欄名加「(PLS)」維持對稱） |
| R30 | L2 | IPMA 的非標準化路徑係數有 fixture、有比對，零 UI 消費者 | ✅ 已修（新增專表＋「與標準化 β 不同尺度」註記） |

★ R32 留下一個必須誠實標註的口徑：「多數／少數」的門檻**原文未明定**，本工具取「超過半數」
（故恰好半數判為「低」），已於報表註記、APA 敘述句、方法文件三處標註為**本工具的選擇而非引用**。

## A3c 的紅隊結果摘要（2026-07-29，A3 收官）

四份文件（`pls-copula`／`pls-pos`／`pls-cta`／`pls-fimix`）開出 15 項，**無 L4**。
獨立重寫全數通過：`pls_copula` 30 欄 **3.775e−15**、`pls_pos` 39 欄 **2.132e−13**、
`pls_cta` 50 欄（含 7 個字串欄）**6.661e−16**、`pls_fimix` 71 欄 **4.547e−13**。

| 編號 | 方法 | 級別 | 內容 | 狀態 |
|---|---|---|---|---|
| **R33-b** | copula | L2 | ★ **報表用 percentile CI 判內生性、APA 敘述句用 `p < .05`**——掃描 60 個資料集，**兩個方向的不一致都出現過**（p 顯著但 CI 含 0，以及 CI 排除 0 但 p 不顯著） | ✅ 已修（敘述句改讀引擎的 `endogeneitySignal`，判準只留一份） |
| R33-a | copula | L1 | 說明區宣稱跑「全組合」，實測 $k=6$ 時只跑 7 個（宣稱 63） | ✅ 已修（中英各補條件） |
| R33-c | copula | L2 | `nDropped` 孤兒——缺失值剔除完全不揭露 | ✅ 已修（補 casewise 警告） |
| R33-d | copula | L2 | 有效重抽偏低無警告（比照 A1 的 R10） | ✅ 已修（>5% 時警告，含 df 說明） |
| R33-e | copula | L1 | KS $p$ 與 statsmodels 預設（table 法）差 .015；CTA 用 $z$ 而 copula 用 $t(B'-1)$ | ✅ 已書面化（§3.4／§3.5／第 6 節） |
| **R34-a** | POS | L1 | ★ **程式碼區塊註解仍是 Session Q2 之前的舊口徑**（寫「SSE 最小化、愈小愈好、必然下降」，實際是 ΣR² 最大化） | ✅ 已修（三處註解） |
| **R34-b** | POS | L2 | ★ 全域表的 $R^2$ 欄在多內生構念時**逐列重複整體 $R^2$**（實測 M4 三列都印 0.0952），而正下方段別表印的是逐方程值 | ✅ 已修（`global.equations[]` 補 `r2`，全域表改印逐方程值） |
| R34-c | POS | L2 | 微小段無警告（實測 57／3 分割，3 筆的段 $R^2$ = 0.97） | ✅ 已修（段內樣本過小時指名段別警告） |
| **R35-a** | CTA | L2 | ★ **CTA 是 W5／W6 唯一沒有渲染 `warnings` 的區塊**——低樣本與 casewise 剔除兩條警告使用者永遠看不到，且**報表上完全沒有樣本數** | ✅ 已修（補 WarnBox 區塊，註記補 $n$） |
| R35-b | CTA | L1 | `tetrads[].t`／`.p` 是死碼（不進基準、不進 UI、不進測試，且用已被否定的 $\mathrm{df}=B-1$） | ✅ 已書面化（§3.5 標「不得引用」；Kevin 裁決本批不刪） |
| R35-c | CTA | L1 | 非冗餘 tetrad 的選取集**取決於指標宣告順序**（實測三種順序給三組不同 tetrad，判讀一致） | ✅ 已修（`ctaNote` 中英各補一句） |
| **R36-a** | FIMIX | L2 | ★ $K=4$ 出現**退化解**：兩段的 $\beta$ 與 $\sigma^2$ 完全相同，其中一段 $\rho=0.147$ 但**硬指派 0 人** | ✅ 已修（重複段與空段各一條警告） |
| R36-b | FIMIX | L2 | `posteriors`／`assignment`／`expectedSize` 三個孤兒——軟指派看不到，段別無法刻畫 | ⬜ 記為功能擴充（見 roadmap §6.6） |
| R36-c | FIMIX | L1 | 段數選擇表在 $n<10K$ 時**靜默截斷**（實測 kMax=8、$n=60$ → 只到 $K=6$） | ✅ 已修（截斷時警告） |
| **R36-d** | FIMIX | L3 | ★ `reference.json` 的 source 字串有兩處事實錯誤：寫「β 遞減排序」實際是 **ρ 遞減**；寫模擬真值「+0.70/−0.30」實際是 **±0.80** | ✅ Kevin 核定並已執行：改 `generate_reference.py` 後**完整重生**，83 組數值**逐位元不變**、`datasets.json` 不變 |

★ **本批四組的共同結構**：**數值本體全部通過獨立重寫，15 項發現全部落在呈現層、註解層與文獻層。**
這與 A3a／A3b 的樣式一致——`provenance.test.js` 管登記、`compare.test.js` 管數值，
**沒有一道管可見性**，而 A3c 又多抓到一種：**同一件事有兩套判準**（R33-b）與**註解沒跟上改碼**（R34-a）。

★ **A3c 同時交付了補這道縫的測試**：`tests/docs.coverage.test.js`（roadmap §6.7 判準 5）。
它檢查 `reference.json` 的每一組基準是否被至少一份方法文件的第 6 節點名，
以 `MAX_UNDOCUMENTED` 棘輪硬擋（比照 `provenance.test.js` 的 `MAX_PENDING`）。
★ **它上線第一天就抓到一組**：`pls_scheme_centroid` 與 `pls_scheme_factorial` 有基準、有 adapter、
有逐值比對，但 A1 的 `pls-basic.md` 第 6 節只點名 `pls_basic`——34 個欄位沒有任何文件承認它們存在。已同日補上。

★ **本批仍未結案的一項**：`pls_fimix` 維持 **pending**。Hahn et al. (2002)、
Sarstedt et al. (2011)、Ramaswamy et al. (1993) 三筆原文皆未取得，
$N_k$ 與 EN 的定義**無法核定**。`pls-fimix.md` 第 6 節逐條寫明了現行三重替代驗證
**鎖得住什麼、鎖不住什麼**，並記下一條未執行的路徑：以 R `flexmix`
在「無截距＋本工具的 LV 分數」設定下對照 EM 本身。

## A4 — NCA／LDA／CFA／EFA ✅ 完成（7 / 7，2026-07-29）

★ **這是階段 A 第一批離開 PLS 的文件。** 與 A1–A3 最大的差別是**溯源結構相反**：
PLS 側 26 組是 tier B（沒有第三方數值來源），A4 的 11 組裡 **7 組是 tier A**
（`factor_analyzer`／`semopy`／`scipy` 直接產生基準）。
⇒ 紅隊的主戰場也跟著移動——本批 **13 項發現裡沒有一項是公式錯誤**，
全部落在**呈現層、可見性與慣例揭露**。

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [nca-ce-fdh.md](nca-ce-fdh.md) | NCA 的 CE-FDH 階梯天花板線（scope、peers、效果量 $d$） | `nca_ce_fdh` | B / verified |
| [nca-cr-fdh.md](nca-cr-fdh.md) | NCA 的 CR-FDH 線性天花板線（peers 上的 OLS、夾擠面積、準確度） | `nca_cr_fdh` | B / verified |
| [nca-bottleneck.md](nca-bottleneck.md) | NCA 瓶頸表（逐 Y 水準反查所需 X、NN 語意） | `nca_bottleneck` | B / verified |
| [nca-permutation.md](nca-permutation.md) | NCA 的 permutation 顯著性檢定與**整體判準** | `nca_bottleneck.p_ce` | B / verified |
| [lda.md](lda.md) | 線性判別分析（判別函數、三種係數、分類、Box's M） | `lda_group3` | B / verified |
| [cfa.md](cfa.md) | 驗證性因素分析（ML 估計、適配指標、RMSEA CI） | `cfa_2factor`、`cfa_2factor_loadings`、`cfa_noncentral_chi2`、`cfa_rmsea_ci` | **A** / verified |
| [efa.md](efa.md) | 探索性因素分析（主成分萃取、KMO／Bartlett、varimax） | `efa_pca_none`、`efa_pca_varimax`、`efa_pca_varimax_k3` | **A** / verified |

### A4 的獨立重寫結果

每一支都依文件第 3 節的**文字規格**重寫一次，且刻意換一條路線：

| 方法 | 重寫路線 | 最大絕對差 |
|---|---|---|
| NCA | ceiling zone 改**400 萬點網格數值積分**、bottleneck 改數值反查 | 3.695e−5（＝網格解析度；$d$ 差 1.055e−8，peers／bottleneck／$p$ **逐值零差異**） |
| LDA | 改用 **sklearn `LinearDiscriminantAnalysis`**（真第三方）取判別方向，再依 SPSS 慣例換算 | **1.288e−14**；★ sklearn 自己的 `predict` 準確率與 fixture 逐位元相同 |
| CFA | 改用 **scipy `L-BFGS-B`** 重求 $F_{ML}$ 極小（引擎用自寫 BFGS＋中央差分梯度） | 與引擎差 6.4e−8；與 semopy 的差恰為 $N$ vs $N-1$ 慣例（比值 60/59） |
| EFA | numpy 主成分＋自寫 varimax | **4.998e−9** |

★ **重寫本身也交出了一個發現**：EFA 第一次重寫**漏掉 Kaiser normalization**，
$k=3$ 的負荷立刻差 3.136e−2；補上後降到 5e−9。規格文字**確實寫了**這一步，
是重寫者漏讀——這是規格充分性的**正面**證據，也說明這一步的量級不容忽略。

### A4 的紅隊結果摘要

7 份文件跑完八條紅隊檢查表，開出 **13 項**（R37–R49），Kevin 裁決後**全部處置完畢**（10 修、3 書面記錄；R47 的回傳契約部分留階段 B 並加現況鎖）。

| 編號 | 方法 | 級別 | 內容 | 狀態 |
|---|---|---|---|---|
| **R40-i** | EFA | **L3** | ★ **完全共線時亮綠燈**：$\|\mathbf R\|=0$ 時回 `{chi2: Infinity, p: 0}`，UI 印「—」與「< .001」⇒ 報表說「球形檢定顯著，適合做因素分析」。且 KMO 回 `null` ⇒ **整張卡片靜默消失** | ✅ Kevin 核定並已執行（`singular` 旗標＋`unavailable` 原因＋警告框） |
| **R40-h** | EFA | **L3** | ★ **零變異欄靜默放行**：Bartlett 的 df 虛胖、KMO `perVar` 出現 null，且該欄可能拿到 **loading 1.000 / $h^2$ 1.000**——看起來是全套最好的題目 | ✅ Kevin 核定並已執行（硬擋＋指名變項，比照 A1 的 R7） |
| **R41** | 全工具 | **L2** | ★ `errorCodes.test.js` 的正規式只收 `[A-Za-z][\w-]*` 形狀的代碼 ⇒ **16 個含 `>`／`=` 的錯誤碼從防線底下溜過**，兩份 i18n 全缺字串，觸發時使用者看到裸代碼 | ✅ 正規式放寬＋16 條訊息中英補齊 |
| **R42** | NCA | **L2** | ★ 整體判準是 $p<.05$ **且** $d\ge.1$ 的**複合口徑**，UI 完全不說；且在三處各實作一次。實測 272 組配對中 **2 組真的踩到** | ✅ Kevin 核定並已執行（抽成 `ncaVerdict` 單一純函式＋四情境說明） |
| **R43** | NCA | **L2** | ★ APA 句直述「X 是 Y 的必要條件」，「必要非充分」只在 teaching mode 出現——而 APA 句才是被貼進論文的那一段 | ✅ Kevin 核定並已執行（句尾補限制子句，`sentenceNs` 不掛） |
| **R44** | NCA | **L3** | ★ `reference.json` 三組 source 與 `generate_reference.py` 註解停在「**待**本機 R 抽驗」，而該抽驗 2026-07-13 已完成且零差異 | ✅ Kevin 核定並已執行（比照 R36-d 完整重生；83 組 values **逐位元不變**） |
| **R39-a／b** | CFA | L2 | 未收斂與 SE 不可得時，Result 有徽章但 **APA 敘述句照常輸出一整段不可靠的數字** | ✅ 已修（句首插入警語，中英各二） |
| **R38-a** | LDA | L2 | 未標準化典型係數是孤兒——而標準化係數的說明**正是拿它下定義的** | ✅ 已修（新增專屬表） |
| **R38-b／c／e** | LDA | L2 | 符號任意性未說明；事前機率慣例（比例 vs SPSS 等機率）未揭露；listwise 剔除未揭露 | ✅ 已修（三條註記＋摘要行與 APA 句） |
| **R37-a／b／e** | NCA | L2 | `need-n>=5` 顯示裸代碼；listwise 剔除未揭露；permutation 次數／種子／分母慣例未揭露 | ✅ 已修 |
| **R40-a～e** | EFA | L1／L2 | 四處硬編中文（英文 APA 句會混入中文）；MSA 與 $\|\mathbf R\|$ 是孤兒；$k<2$ 時不轉軸完全靜默；區塊註解誤寫「pair-wise listwise」 | ✅ 已修 |
| R45／R46 | LDA／CFA | L1 | `structureCoefficientsTotal`、`chi2Null`／`dfNull`／`fitFunction` 是孤兒欄位 | ✅ Kevin 裁決：**書面記錄**（並列易誤用／屬中介量） |
| **R47** | NCA | **L2** | ★ CR-FDH 的 `intercept`／`slope` 零 UI；`cr_fdh.bottleneck` **實測與 CE 版逐字元相同**；瓶頸表未說明讀的是哪一條 ceiling（改用 CR 線差最大 **11.61**，30%／40% 方向相反） | ✅ Kevin 裁決「修呈現層、回傳契約留階段 B」並已執行：新增 Ceiling 方程式欄＋瓶頸表來源說明（含量化）；複本欄位留階段 B，本批加現況鎖 |
| R48／R49 | LDA／測試 | L1 | Box's M 的 $p\le.001$ 門檻三處各實作一次（同值，且已寫在使用者可見文字裡）；`docs.coverage.test.js` 的寬鬆比對把散文中的 `manova` 誤判為已涵蓋 | ✅ 書面記錄（R49 已同步修正棘輪為真實值 36） |

★ **本批的共同結構**：**沒有一項是公式錯誤。** 13 項裡，
6 項是「算了、比對了、但使用者看不到」（孤兒欄位），
4 項是「工具做了某個決定卻不說」（複合判準、事前機率、符號慣例、$\chi^2$ 慣例），
2 項是「該擋沒擋，而且擋不住的後果會偽裝成好結果」（R40-h／R40-i），
1 項是防線本身的縫（R41）。
⇒ 與 A3c 的結論一致：`provenance.test.js` 管登記、`compare.test.js` 管數值、
`docs.coverage.test.js` 管有沒有人說得清——**仍然沒有一道管「使用者看到的是不是同一件事」**。

★ **本批最值得帶進 A5／A6 的兩條**：

1. ★ **「該擋沒擋」比「擋錯」危險**：R40-h 與 R40-i 的共同點是，
   **失敗的情境會偽裝成成功的報表**——完全共線亮綠燈、死題目拿滿分負荷。
   ⇒ 每一支方法都要問一次：**這個方法失敗時，報表看起來會不會像成功？**
2. ★ **防線的漏收比防線不存在更難發現**：R41 的 16 個錯誤碼在 `errorCodes.test.js`
   上線後**一路全綠**，因為正規式根本沒收到它們。
   ⇒ 新增或依賴任何「掃描式」測試時，先確認它掃到的**母體**是對的。

## A5a — t 檢定與 ANOVA 家族 ✅ 完成（7 / 7，2026-07-29）

★ **本批抓到階段 A 的第二個 L4 真 bug**（前一個是 A1 的 R6）。
與 A4 的結論相反——A4 十三項發現無一是公式錯誤，A5a 卻在**數值本體**上抓到一個
會讓 $p$ 值在 .05 兩側翻面、且可達性極高的錯誤。

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [t-test.md](t-test.md) | t 檢定三種（單一樣本／獨立樣本 Welch／成對） | `ttest_one_sample`、`ttest_independent_welch`、`ttest_paired` | **A** / verified |
| [anova-oneway.md](anova-oneway.md) | 單因子 ANOVA（SS 拆解、$\eta^2$、$\omega^2$） | `anova_oneway` | **A** / verified |
| [tukey-hsd.md](tukey-hsd.md) | Tukey HSD 事後比較與**學生化全距分布** | `tukey_hsd`、★ `tukey_ptukey_grid`（本批新增 120 欄） | **A** / verified |
| [anova-twoway.md](anova-twoway.md) | 雙因子 ANOVA（Type III SS、交互作用） | `twoway_anova_type3` | **A** / verified |
| [ancova.md](ancova.md) | 共變數分析（調整後平均、斜率同質性） | `ancova` | **A** / verified |
| [anova-repeated.md](anova-repeated.md) | 重複量數 ANOVA（Mauchly、GG／HF／LB 校正） | `repeated_anova` | **A** / verified |
| [anova-mixed.md](anova-mixed.md) | 混合設計 ANOVA（split-plot、兩個誤差項） | `mixed_anova` | **A** / verified |

### A5a 的獨立重寫結果

七支全部依文件第 3 節的**文字規格**以 numpy 手算重建（**不呼叫產生基準的那個函式**，
只借 scipy 查分布尾機率）：

| 方法 | 重寫路線 | 最大絕對差 |
|---|---|---|
| t 檢定 ×3 | 手算 Welch–Satterthwaite 與三種 $d$ 的分母 | **0.000e+00（14 欄逐位元相同）** |
| 單因子 ANOVA | 手算 SS 拆解（不用 `f_oneway`） | 9.095e−13 |
| 雙因子 Type III | 自建效果編碼設計矩陣＋`lstsq` 模型比較 | 2.615e−12 |
| ANCOVA | 自建 dummy 設計矩陣＋模型比較 | 4.547e−13 |
| 重複量數 | 自建 Helmert 對比、由 $S$ 求 $W$ 與 $\varepsilon_{GG}$ | 2.387e−12（Mauchly 兩欄逐位元相同） |
| 混合設計 | 手算 split-plot 五段拆解與**兩個誤差項** | 1.137e−13 |
| **Tukey HSD** | ★ **直接對學生化全距分布做雙層 Gauss-Legendre 數值積分** | ★ **這一支抓到了 R50** |

### A5a 的紅隊結果摘要

開出 **4 項（R50–R53）**，其中一項是 **L4 真 bug**。Kevin 裁決後全部處置完畢。

| 編號 | 方法 | 級別 | 內容 | 狀態 |
|---|---|---|---|---|
| **R50** | Tukey HSD | ★ **L4** | ★ **`ptukey.js` 的 $p$ 值在 df ≥ 100 系統性錯誤**。外層積分上限隨 $\sqrt{df}$ 外擴、節點固定 200，而被積函數峰寬隨 $1/\sqrt{2\nu}$ 內縮 ⇒ 步長/峰寬在 **df ≈ 100 越過 1**。df=120 誤差 3.0e−2（$p$ .0686 vs 正確 .0388，**判定翻面**）、df=999 誤差 **7.6e−1**（$p$ .786 vs 正確 .0043）。★ 可達性：每次單因子 ANOVA 都無條件跑 Tukey，三組時 **$N\ge103$ 即進入失準區**，且 APA 句用 $p<.05$ 篩選要點名哪幾對。★ **三道防線全沒抓到**：唯一基準在 df=57（失準區前最後一個安全點），且 `compare.test.js` 早已把該三欄放寬到 5e-4 | ✅ Kevin 核定並已執行（三件：修積分＋新增 `tukey_ptukey_grid` 120 欄基準＋容差收緊回 1e-6）。修後 896 格點最大差 **5.6e−7**、零翻面 |
| **R51** | t 檢定 | **L2** | ★ **零變異時失敗偽裝成成功**：`zeroVarianceWarning` 是孤兒旗標，實測報表印 **`t = —`、`p < .001`（綠燈）、`d = —`**，APA 句照樣寫「達顯著差異」。與 A4 的 R40-i 同型，且共用同一成因（`fmtNum(±∞)` 回「—」、`fmtP(0)` 回「< .001」） | ✅ Kevin 核定並已執行（警告框＋抽掉燈號＋APA 句警語，引擎回傳值不變） |
| **R52** | 雙因子 ANOVA | **L2** | ★ **完全沒有前提檢核**——七支裡唯一的空白，而 `levene.js` 與 `normality.js` 早就被另兩支使用 | ✅ Kevin 核定並已執行（**細格層** Levene ＋ **全模型殘差**的 Shapiro-Wilk） |
| R53 | 混合設計 | L1 | 缺被試間因子的共變異同質檢核（Box's M）。正確的前提不是單變量 Levene，而 `lda.js:545–576` 已有可複用實作 | ✅ Kevin 裁決：**書面記錄**（記為 E37） |

★ **本批的共同結構與 A4 明顯不同**：A4 的十三項全落在呈現層，A5a 卻在**數值本體**抓到一個。
差別在於**檢查方式**——A4 的重寫是「換一條路線算同一個量」，
而 A5a 的 Tukey 重寫是**對分布本身做格點掃描**，才把「只有一個基準點、而它恰好安全」這件事逼出來。

★ **本批最值得帶進 A5b／A6 的兩條**：

1. ★ **只有一個基準點的方法，要對「參數空間」掃描，不能只驗那一點。**
   R50 的所有證據都不在 `datasets.json` 的那組資料裡——它在 df 這個**參數方向**上。
   ⇒ 凡是引擎帶有數值近似（積分、迭代、查表）的方法，都要問：
   **基準覆蓋的是參數空間裡的哪一點？那一點有沒有剛好是最好的一點？**
2. ★ **放寬過的容差是紅旗，不是結案。** `compare.test.js` 的 `TOL` 每一行都在說
   「這裡有一個我們知道但沒查清楚的差異」。R50 就藏在那句「絕對差 <1e-6」的註解後面。
   ⇒ A5b／A6 每遇到一個 `TOL` 條目，先問「這個放寬在參數空間的其他地方還成立嗎」。

## A5b — 類別與無母數 ✅ 完成（6 / 6，2026-07-30）

★ **本批沒有 L4。** 六支引擎的獨立重寫全數通過，最大相對差 4.8e−13 ~ 1.4e−10。
但本批是**參數空間掃描規模最大的一批**（累計逾 75,000 個格點），
而規模換到的不是 bug，是**三件被量化的事**：一個跨模組的數值缺陷（R55）、
一個會直接進論文的命名錯誤（R54）、以及一個此前零基準的方法（R56）。

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [chi-square.md](chi-square.md) | 卡方獨立性／適合度、Yates 校正、Cramér's V、標準化殘差 | `chisquare_2x2` | **A** / verified |
| [fisher-exact.md](fisher-exact.md) | Fisher 精確檢定（2×2）、勝算比與 Woolf CI | `fisher_exact` | **A** / verified |
| [z-prop.md](z-prop.md) | 單／雙樣本比例 z 檢定、Wilson CI、Cohen's $h$ | `zprop_one`、`zprop_two` | **A** / verified |
| [mann-whitney.md](mann-whitney.md) | Mann-Whitney U（含連續性校正與並列校正） | `mann_whitney`、`mann_whitney_small`、`mann_whitney_ties` | **A** / verified |
| [wilcoxon-signed-rank.md](wilcoxon-signed-rank.md) | Wilcoxon 符號等級檢定（零差值採 `wilcox` 慣例） | `wilcoxon_signed_rank` | **A** / verified |
| [kruskal-wallis.md](kruskal-wallis.md) | Kruskal-Wallis H ＋ **Dunn 事後比較** | `kruskal_wallis`、★ `kruskal_dunn`（本批新增 6 欄） | **A** / verified |

### A5b 的獨立重寫結果

六支全部依文件第 3 節的**文字規格**以 numpy 重建，**不呼叫產生基準的那些函式**
（`mannwhitneyu`／`wilcoxon`／`kruskal`／`chi2_contingency`／`fisher_exact`／`proportions_ztest` 一個都沒碰）。
★ 尾機率改走 **mpmath 的高精度 `erfc` 與正規化不完全 gamma**，Fisher 走 **mpmath 精確有理數 `binomial`**——
與引擎的 Numerical Recipes 路徑完全無關：

| 方法 | 掃描規模 | 重寫路線 | 最大相對差 |
|---|---|---|---|
| Mann-Whitney | 1,728 情境（$n_1,n_2$ 3–14 × 三種並列強度 × 4 重複） | 自行實作平均秩＋並列校正＋CC | **4.845e−13** |
| Wilcoxon | 1,197 情境（$n$ 4–30 × 零差值 0–5 × 三種並列強度） | 同上，另驗 `nDropped` 1,197 次全對 | **1.318e−12** |
| Kruskal-Wallis | 225 情境（$k$ 2–6 × 每組 $n$ 5 值 × 三種並列強度） | 手算 $H$、並列校正、$\eta^2_H$ | **3.708e−13**（$H$ 逐位元相同） |
| 卡方 | 1,350 張表（含 0 格、期望次數 < 1、最大 $4\times5$） | 手算 $E$、$\chi^2$、Yates、$V$ | **4.876e−13** |
| Fisher exact | 1,621 張表（$N\le3000$） | ★ mpmath 精確有理數列舉 | **1.413e−10** |
| z 比例 | 5,290 格點（單樣本 $x$ 全枚舉 ＋ 雙樣本 625 組） | 手算兩套分母慣例 | $z$ **3.6e−16**；★ $p$ 見 R55 |
| **Dunn** | 81 情境 × 3–10 對 | ★ 對 **scikit-posthocs** 逐值 | **2.665e−10** |

### ★ A5b 的窮盡掃描：兩支的精確法缺口被量化

無並列時，Mann-Whitney 的 $U$ 與 Wilcoxon 的 $W^+$ 的精確分布**只依賴樣本數**，
所以可以用動態規劃建出完整分布、**對統計量全枚舉**——不是抽樣，是窮盡：

| 方法 | 格點數 | .05 判定翻面 | 危險方向（近似顯著、精確不顯著） | 最大絕對差 |
|---|---|---|---|---|
| Mann-Whitney（$n_1\le n_2$，3–25，$U$ 全枚舉） | **54,878** | 110（0.20%） | **0** | 0.0375 |
| Wilcoxon（$n$ 4–40，$T$ 全枚舉） | **11,507** | 32（0.278%） | **0** | 0.0488 |

★★ **重要更正（2026-07-30 R 抽驗，見下方 R58）：上表只在「無並列」時成立。**
交付當下我把它寫成了通則，那是錯的——窮盡枚舉之所以可行，正是因為**無並列**時精確分布
只依賴 $(n_1,n_2,U)$。R 4.6 對**有並列**的情形用 Streitberg–Röhmel 位移演算法算條件精確分布，
而在那裡方向**相反**：本專案 `ties` 基準組的 R 精確 $p=0.022329$、本工具近似 $p=0.018117$
（偏寬鬆）；補掃 900 個有並列情境，**78.1% anti-conservative、10 例（1.1%）在 .05 上偽顯著**。

★ 但 Wilcoxon 有一個附帶發現：翻面在 **$n=40$ 仍持續出現**（不像 MW 集中在極小樣本），
⇒ Notes 裡「$n\ge10$ 常態近似已足夠」這個暗示對本方法要打折（記為 E63）。

### A5b 的紅隊結果摘要

開出 **4 項（R54–R57）**，**無 L4**。Kevin 2026-07-30 裁決後全部處置完畢。

| 編號 | 方法 | 級別 | 內容 | 狀態 |
|---|---|---|---|---|
| **R54** | Kruskal-Wallis | **L3** | ★ **效果量的名稱錯誤且未 floor**。UI 欄位／公式說明／APA 句**三處**都標成 $\varepsilon^2$，而公式 $(H-k+1)/(N-k)$ 經 rstatix 官方文件核實是 `eta2[H]`（$\eta^2_H$，偏誤校正）；真正的 rank $\varepsilon^2$ 是 $H/(N-1)$（effectsize 官方文件），兩者實測最大差 **0.376**。★ 更嚴重的是**值域**：偏誤校正使原式可為負，225 個情境中 **111 個（49%）為負、最小 $-0.375$** ⇒ 報表會印出「$\varepsilon^2=-0.278$」這種依定義不可能的值，而 rstatix 明文 floor 到 0 | ✅ Kevin 核定並已執行（改名 `eta2H` ＋ floor 0 ＋ i18n 三處同步 ＋ 基準欄名同步；重生後其餘 84 組**逐位元不變**） |
| **R55** | 跨模組（8 處） | **L3** | ★ **雙尾 $p$ 在 $\|z\|$ 大時塌成 0**。全專案 8 處寫 `2 * (1 - normalCdf(|z|))`，而 `normalCdf` 內部已用 `gammq` 算好上尾（相對精度 1e−13 級）——這份精度被 $1-(1-\text{tail})$ 的減法**整個抵消**。實測 $\|z\|>6.5$ 起相對誤差 >1e−6、$\|z\|>7.2$ 起 >1e−4、**$\|z\|\ge8.3$ 起回傳恰好 0**（單樣本比例 $n=8,x=0,p_0=0.9$ 即 $\|z\|=8.49$，報表印 `p = .000`）。★ **判 L3 而非 L4 的依據**：5,240 + 1,728 個掃描格點**零個 .05 翻面**，受影響區間全在 $p<10^{-10}$，APA 一律呈現 $p<.001$ | ✅ Kevin 核定並已執行（`pvalue.js` 新增 `normalSf`；8 處全改，含範圍外的 `kappa.js`／`logisticRegression.js`／`normality.js`，並**移除 `cfa.js` 自帶的第二套 `normalCdfApprox`**） |
| **R56** | 卡方 ＋ Dunn | **L3** | ★ **兩個可以立刻補上的第三方基準**。(a) **Dunn 零基準**：引擎有實作、UI 有表格、APA 句還會**點名哪幾對顯著**，而 `compare.test.js` 一欄都沒對；(b) **`cramerV` 是本專案手算**，與 JS 出自同一次理解——正是 §0 品質規範要防的那一類 | ✅ Kevin 核定並已執行（新增 `kruskal_dunn` 基準組 6 欄，權威 scikit-posthocs；`cramerV` 改由 `scipy.contingency.association` 產生，**數值零變動**）。基準組 **84 → 85** |
| R57 | MW／Wilcoxon | **L2**＋書面 | ★ 精確法缺口 ＋ 三個說明錯誤：i18n `continuityNote` 宣稱「與 **SPSS** / R wilcox.test 預設一致」，實際上 SPSS 的 Asymp. Sig. **不套** CC、且 R 預設在 $n<50$ 無並列時走**精確法**而非近似法（R 4.6.0 官方手冊）；`formulaMWZ` 顯示的公式**沒寫出實作實際扣掉的 0.5**；效果量 $r$ 的分級函式在兩個檔案**各實作一次**且只有三級，而同模組 Notes 宣告四級 ⇒ 使用者永遠看不到「微弱」 | ✅ L2 三項當場修（i18n 改寫、公式補 CC、分級收斂為 `format.js` 的 `effectBandR`／`effectBandV` 並補 `trivial` 鍵）；精確法缺口依裁決書面化 |

★ **本批與 A5a 的差別，在於「掃描規模換到了什麼」**：A5a 用 896 個格點抓到一個 L4；
A5b 用 75,000 個格點**沒有**抓到 L4——但同一套方法讓三件事從「知道但沒查清楚」變成「量化過的已知限制」。
★ **這正是掃描該有的兩種結果之一**：它不保證找到 bug，它保證你不再需要猜。

★ **A5b 累積出來的兩條檢查習慣（接在既有八條之後，A6 直接沿用）**：

9. ★ **「同一件事的第二套實作」不只出現在判定邏輯，也出現在數值工具。**
   R55 的 8 處是同一個錯誤寫法被複製 8 次；`cfa.js` 還自己養了一套常態 CDF，
   而它的註解寫「避免相依 pvalue 的可選 import」——該檔第 37 行本來就已 import `pChiSq`。
   ⇒ 看到一個數學小工具被就地實作，先 grep 專案裡是否已經有一份。
10. ★ **欄位的「名稱」也要紅隊，不只值。** R54 的值完全正確（與 rstatix 的公式逐位元相同），
    錯的是它叫什麼、以及值域該不該截斷。$\varepsilon^2$ 印出負數這件事**不會被任何數值比對抓到**，
    因為基準端與實作端犯的是同一個命名錯誤。
    ⇒ 寫第 3 節時，對每一個效果量問：**這個符號在文獻上是這個公式嗎？它的值域是什麼？工具守住了嗎？**

## ★ R 側交叉驗證（2026-07-30，Kevin 本機執行）

A5b 收尾後代產 `scripts/validation/05_a5b_r_audit.R`（雙擊 `跑R抽驗.bat`），
針對三類「Python 側撐不住」的項目取第二意見：**(A) 零基準、(B) 本專案手算、(C) 文件寫了但未實跑**。
六段全數執行成功。

### 乾淨銷帳（五項）

| 項目 | 類 | 結果 |
|---|---|---|
| **EFA 逐變項 MSA ＋ $\|\mathbf R\|$** | A | ★ `psych::KMO()$MSAi` 與 `det(cor())` **六位小數全對**，兩個零基準量結案 |
| **單因子 ANOVA 的 7 欄手算值** | B | ★ base R `aov()` 逐項相符（SS 三項、$\eta^2$、$\omega^2$）⇒ §0 型結構弱點結案 |
| **Tukey 對 R `ptukey()`** | C | ★ 5 個格點（含 R50 失準區 df=100/120/999）相對差 1.6e−10 ~ 3.9e−08 ⇒ **`ptukey.js:18` 的註解終於有證據**，R50 的修正經獨立 Fortran 實作確認 |
| **R54 的命名判斷** | B | ★ `effectsize` 的 Eta2(rank)=0.13 對上本工具 0.126471、Epsilon2(rank)=0.16 是另一個量 ⇒ **E67 結案**（但只印 2 位小數，尚不足逐值驗證） |
| **prop.test／chisq.test／fisher.test 的 $p$** | C | 全部對上；Wilson CI 對上「R 無校正」那一行；Cramér's V 對上 |

### 新開出（三項）

| 編號 | 內容 | 處置 |
|---|---|---|
| **R58** | ★★ **A5b 的「危險方向為 0」只在無並列時成立**（見上方更正）。這是我的敘述錯誤，不是實作退步——引擎的數字與 scipy 逐值相符至 6e−14，錯的是我把無並列的結論寫成通則 | ✅ Kevin 2026-07-30 重新裁決：文件全面更正 ＋ **UI 在「小樣本 ＋ 有並列」時加強警告**（i18n `smallSampleTiesNote`）；實作精確法維持 backlog P2 |
| **R59** | ★★ **CFA 的 loading 標準誤對不上 lavaan**：標準化負荷完全吻合、未標準化只差 $\sqrt{60/59}$ 的固定比例，**唯獨 se 差約 4%、$z$ 小約 3.5%**，不是尺度可解釋的 | ✅ **已結案：純慣例差異，不改實作**（`06_cfa_se_probe.R`，2026-07-30）。四種設定的比值把兩個軸乾淨分離——`normal+observed` 的比值**六指標幾乎常數 1.016945~1.016951（＝60/59）**⇒ 該軸純為 $N$ vs $N-1$；`wishart+expected` 的比值**隨指標變動 1.009~1.046** ⇒ 該軸為觀察 vs 期望訊息；★ **`wishart+observed` 的比值 0.999995~1.000002**（最大偏差 **4.5e−06**＝中央差分截斷誤差）⇒ 就是本工具的口徑。$z$ 逐一對上、$\chi^2$ 相對差 5.6e−10 |
| **E43 升級** | ★★ 卡方的 Pearson 殘差 vs 調整後標準化殘差，**在內建示範資料上就已給出不同的 1.96 判定**（No×High 格：1.940 不標色 vs 4.168 標色）⇒ 從「理論上不同」變成「示範資料已不同」 | 書面記錄，見 `chi-square.md` §8 |

### 順帶更正的一件事實

★ **`cfa.md` 原本寫「lavaan 與本工具的 $\chi^2$ 慣例相同」是錯的**：lavaan 預設
（`likelihood = "normal"`）給 7.224814，與 **semopy 相同**；本工具的 7.104400 比值恰為 $60/59$
⇒ **本工具是相對 semopy 與 lavaan 預設都不同的那一個**。已更正 `cfa.md` §3.3 的慣例表。

### R59 結案時順帶開出的兩項（書面記錄）

| # | 內容 |
|---|---|
| E71 | ★ **SRMR 相符到 4.8e−06，但非逐位元**：lavaan 四種設定都給 0.06085815（彼此一致 ⇒ SRMR 與上述兩軸無關），本工具 0.06085844336。量級遠小於任何判讀門檻（.08／.10），但**大於 $\chi^2$ 的 5.6e−10** ⇒ 不是最佳化收斂殘差，而是 SRMR 的分母慣例可能與 lavaan 略有出入 |
| E72 | ★ **因子相關的標準誤沒有出口**：lavaan（同口徑）給 $\phi_{12}$ 的 se = 0.161708、$z=2.794$；本工具只報點估計 0.451915。★ **Hessian 裡就有這一格**（$\Phi$ 走 atanh 重參數化），只是缺 delta method 還原與回傳 ⇒ 補上的成本很低 |

★ **這一輪最值得記住的**：R 抽驗銷掉了五個「我們自己說沒問題」的項目，
但它真正的價值在另外兩個——**一個推翻了我在 A5b 下的結論（R58）**，
一個打開了一個從來沒人看過的欄位（R59）。
⇒ **第二意見的用處不是確認你對，是找出你不知道自己錯在哪。**

## A6a — 敘述／常態／變異數同質／相關／迴歸（進行中，2026-07-30）

★ **本批一開工就抓到階段 A 的第三個 L4（R60），在最沒有人懷疑過的地方**：
常態性檢定的 Lilliefors $p$ 值。它不是公式抄錯，是**近似式被用在它的定義域之外**——
Dallal-Wilkinson 近似要求 $n>100$ 時先重標定、且只在 $p<0.1$ 有效，本工具兩件都沒做，
改用兩個自製 clamp 補洞。後果是 $n\gtrsim325$ 時顯著的樣本被印成 **$p=1.000$**。

⇒ **這一批最該帶走的一條**：`compare.test.js` 的 SKIP 註解如果寫「近似法不同」，
要問的不是「差多少」，而是**「我們走的那條近似，它自己的有效範圍是什麼？」**
A5a 的 R50 教我們去掃參數空間；R60 再加一層——**先確認你在不在該方法的定義域裡**。

| 文件 | 方法 | 基準組 | tier / status |
|---|---|---|---|
| [normality.md](normality.md) | Shapiro-Wilk ＋ Kolmogorov-Smirnov（Lilliefors 修正） | `shapiro_wilk`、`ks_lilliefors`、★ `ks_lilliefors_grid`（本批新增 84 欄） | **A** / verified |
| [descriptive.md](descriptive.md) | 敘述統計（含偏度／峰度的三種算法） | `descriptive_y` | **A** / verified |
| [levene.md](levene.md) | 變異數同質性（Brown-Forsythe，median 版） | `levene_median`、`levene_mean_spss_default`（★ 無 adapter，僅人工對照） | **A** / verified |
| [correlation.md](correlation.md) | Pearson $r$ ＋ Spearman $\rho$（矩陣、pairwise） | `pearson_x1_x2`、`spearman_x1_x2` | **A** / verified |
| [visualization.md](visualization.md) | 散布圖／直方圖／盒鬚圖／熱圖 | ★ **無基準組**（模組未登記於 provenance） | ★ **未登記** |
| [regression-simple.md](regression-simple.md) | 簡單線性迴歸 | `regression_simple` | **A** / verified |
| [regression-multiple.md](regression-multiple.md) | 多元線性迴歸（含 VIF） | `regression_multiple` | **A** / verified |
| [regression-hierarchical.md](regression-hierarchical.md) | 階層迴歸（$\Delta R^2$ 的 partial $F$） | `regression_hierarchical` | **A** / verified |

### A6a 的紅隊結果摘要（累積中）

| # | 方法 | 級 | 問題 | 處置 |
|---|---|---|---|---|
| **R60** | `ks_lilliefors` | **L4** | ★ **Lilliefors $p$ 的兩個定義域錯誤**：漏了 $n>100$ 的重標定、漏了 $p>0.1$ 的表格 dispatch，改用 `D<0.05 → p=1` 與 `D>0.30 → p≤.05` 兩個自製 clamp。實測 480 例大樣本中 50 例（10.4%）印 $p=1.000$ 而權威 $p<.05$（$n=1000$~$2000$ 為 25%），另 960 例小樣本中 34 例偽顯著 | ✅ Kevin 核定並已執行：忠實移植 statsmodels 的 approx 路徑（含 26×14 臨界值表）＋新增 `ks_lilliefors_grid`＋收回兩條假放寬與整條 SKIP＋28 條行為鎖。基準組 **85 → 86** |
| **R61** | `shapiro_wilk`／`ks_lilliefors` | **L2** | ★ **零變異欄被判成「近似常態」綠燈**（$W=1$／$D=0$／$p=1$ 的退化值），在報表上看起來是全套最常態的變項。同 A4 R40-h、A5a R51 之型 | ✅ 已修：引擎回 `zeroVariance` 旗標、判讀改為「無法檢定」、警告框＋APA 句警語、i18n 中英各 3 鍵 |
| **R62** | `ks_lilliefors`／`levene_mean_spss_default` | L1 | **provenance 的 `verification` 欄不實**：兩組都寫「JS 與其逐值比對」，但前者的 $p$ 掛著 SKIP、後者根本沒有 adapter | ✅ 已更正兩組的 `verification` 與 `note` |
| **R63** | `ks_lilliefors` | L1 | ★ **兩處過期／不實的區塊註解**（A3c R34-a 同型）：JSDoc 仍寫「$D<0.05$ 時樣本接近完美常態」——那正是 R60 移除的 clamp；同段宣稱「與 R `nortest` 一致到小數第 3 位」而專案內零證據 | ✅ 已修，第二項改標待驗證 |
| **R64** | `spearman_x1_x2` | L1 | ★ **Spearman 走 $t$ 近似、R 預設走精確法**。216 組確定性排列量化：本工具＝R 的 `exact=FALSE` 分支（3.8e−08）；比值 **0.288（$n$=6，$p$ 小 3.5 倍）~ 1.005**，偏寬鬆但隨 $n$ 收斂；★★ **.05 翻面 0 組**（R58 當時 1.1%） | ✅ Kevin 核定：**書面化即可**。並列區誠實標註未量化、列 backlog（R 在該格會退回近似，無現成權威） |
| **R65** | `descriptive_y` | **L2** | ★ **一個非數值字串讓整欄八個統計量全變 NaN**：`descriptive/compute.js` 缺 `.filter(Number.isFinite)` 而 `normality/compute.js` 有 ⇒ 報表印 n = 5 但其餘全「—」，不說明原因 | ✅ 已修（對齊 normality）＋2 條測試含回歸鎖。既有 fixture 零影響 |
| **R66** | `levene_median` | **L2** | ★★ **各組皆為常數時報「違反同質」——方向相反**。舊版回 `{F: Infinity, p: 0}` ⇒ 前提面板印紅燈，而真相是各組變異數完全相等。★ **這個分支永遠是錯的**（$SS_w=0$ 蘊含 $SS_b=0$，$F$ 必為 0/0）。**同型第四次**（R40-i／R51／R61） | ✅ 已修：引擎回 `levene-all-constant`、i18n 中英各一鍵、`assumptionChecker` 兩處改讀錯誤碼、單／雙因子 ANOVA 加**第三種中性狀態**（只改 NaN 不特判會變成綠燈「通過」，同樣是錯的）＋4 條測試 |
| **R67** | `pearson_x1_x2` | **L2** | ★ **`zeroVariance` 是孤兒欄位**：引擎回傳、零 UI 消費者 ⇒ 零變異欄在矩陣印「—」、在解讀區被靜默略過，使用者看不到原因。★ 修復時發現**舊旗標本身不夠用**——它對整組配對都成立，兩欄時分不出誰是常數欄 | ✅ 已修：引擎分開回報 `xConstant`／`yConstant`、矩陣下方說明框、i18n 中英各一鍵＋5 條測試含「不得誤標正常欄」的回歸鎖 |
| R68 | `descriptive_y` | L1 | **檔頭斷言只驗掉一半**：「與 `e1071::skewness(type=2)` / `DescTools::Skew(method=2)` 一致」——前者已實跑核實，**後者從未驗過** | ✅ 已在 `descriptive.md` §6 標為未驗證 |
| **R69** | `regression_simple`／`_multiple` | **L2** | ★★ **同型第五次**：完美配適與依變項零變異不擋也不警告。多元迴歸的完美配適把 **$t=$ `2312738254615615.50`** 原樣印在報表上、$R^2=1.0000$、$p<.001$；$y$ 為常數時係數是浮點雜訊卻印 $p=.001$。簡單迴歸另有一層——**它沒有矩陣可解，所以 `singular-matrix` 那道防線對它無效** | ✅ 已修（三支一起）：引擎新增 `perfectFit`（判準用相對值 $SS_{res}/SS_{tot}<10^{-20}$）＋簡單迴歸補 `zeroVarianceY`；三支各加警告框並取消 $p$ 的燈號；i18n **18 個字串**；7 條測試含回歸鎖。★ 順帶修掉 `maxVif` 被 UI 重算一次 |
| R70 | `descriptive`／`correlation` 兩份文件 | L1 | ★ **兩句「未實作」的宣稱是錯的**：四分位數與散布圖**都存在**，只是在 `visualization` 模組裡。我 grep 的範圍不含 `src/lib/viz/` 就下了結論 | ✅ 兩份文件已更正並保留更正痕跡；缺口重新定義為「敘述統計表不顯示 IQR」「相關頁面不引導去看散布圖」 |
| R71 | `visualization` | L1 | ★ **`quantile` 在專案內有三份**：`viz/boxStats.js` 與 `viz/binning.js` **逐字元完全相同**、`stats/pls.js:140` 寫法不同但公式相同。三份都是 type 7 ⇒ 目前無行為分歧，但這正是 A5b 習慣 9 警告的形狀（`cfa.js` 當年也「只是」多養一套常態 CDF） | ✅ 書面記錄，本批不重構（動 `pls.js` 要重跑整個 PLS 套件，成本與收益不成比例）。建議階段 B 抽取為共用模組（E96） |

★ **順帶收回的兩條假放寬**（A5b 習慣 8 的第二次應用）：`ks_lilliefors.D` 放寬 1e-4 而實測相對差 **0.0（逐位元相同）**；
`shapiro_wilk.p` 放寬 1e-5 而實測 5.8e−8、1,440 例掃描 max|Δp| = 7.5e−7、零翻面。
★ **A5b 的實績是 5 條裡 4 條是假放寬，A6a 是 3 條裡 2 條**——
但兩批的**真缺口都不在 TOL，在 SKIP**（A5b 是 `mann_whitney_small.pExact`，A6a 是 `ks_lilliefors.p`）。


★ **R63 是本批唯一由「驗收」而非「執行」抓到的一項**——執行者跑完自己的紅隊十條後仍漏了它。
⇒ **改實作時把「該檔案的區塊註解」列入必改清單**（A3c 就寫過這一條，這次還是漏了），
而且**註解裡的第三方一致性宣稱要當成引用來查**：「與 R 一致到小數第 3 位」這種句子，
如果沒有一份輸出檔可以指，它就是以記憶充當引用。


### A6a 的 R 側交叉驗證（2026-07-30，R 4.6.0）

| 段 | 對象 | 結果 |
|---|---|---|
| [1] | `descriptive` 的偏態峰度 | ✅ **本工具＝`e1071` type 2（SPSS/SAS 預設）逐位元相符**——一句從未核實的檔頭斷言結案。★ 三種算法的差距：偏態 0.399~0.420、**峰度 0.389~0.656（差 1.7 倍）** |
| [2a] | `normality` | $W$ 與 $D$ 印到 8 位逐位元相符；★ Lilliefors $p$ **0.5161 vs `nortest` 0.4755**（差 0.0406，屬 dispatch 慣例差異）。⚠️ 該點 $p\approx0.5$ 離 .05 很遠 ⇒ **R60 仍無決策區的證人** |
| [3] | `levene` | ✅ 兩個 center 慣例都對上（median 0.3876／mean 0.3973）。★ 但 `leveneTest` 只印 4 位小數，夠確認慣例、**不夠逐值驗證**（同 A5b 的 E67 之型） |
| [4] | `correlation` | Pearson 全對；★ **Spearman 慣例分歧**：無並列 ⇒ R 走精確法 1.705e−05 vs 本工具 $t$ 近似 1.252e−05（**小 1.36 倍、偏寬鬆**），A5b 的 R58 同型，待 08 號掃描 |
| [5] | 迴歸三支 | ✅ 全對，含 `car::vif`。★★ **手算的 $\Delta F$／$\Delta p$ 對上 R 的 `anova(m1, m2)` ⇒ §0 的手算基準弱點在本組結案**。★ 順手驗掉零基準的標準化係數 beta（E80） |
| [2b]→08[A] | R60 的 12 組探針 | ✅✅ **08 號補跑成功，R60 結案**：$D$ 在 11 組**逐位元相符**；$p$ 在**決策區（$p<0.1$，含五組 clampzone）max 絕對差 1.5e−8**，連 `likert_n1000` 的 $2.8953\times10^{-114}$ 都對上；$p>0.1$ 區 max 8.9e−3（兩套 dispatch 的慣例差異） |
| 08[B] | `correlation` 的 Spearman | ✅ **量化完成（R64）**：216 組確定性排列，本工具＝R 的 `exact=FALSE` 分支（3.8e−08）；近似/精確比值 **0.288（$n$=6）~ 1.005**，方向偏寬鬆但隨 $n$ 收斂；★★ **.05 翻面 0 組**（R58 當時是 1.1%）⇒ 建議書面化即可 |

★ **[2b] 當初陣亡的成因與當天剛開出的 R60 是同一型**：呼叫第三方時沒有問它的定義域。
只是這一次的對象不是本工具，是**驗證腳本自己**。
⇒ 後續抽驗腳本兩條：**先問第三方檢定的 $n$ 下限、逐項 `tryCatch` 不要整段包**。


★★ **R60 的結案方式值得記下來**：它的第三方不是「另一個算得出 $p$ 的套件」，
而是**另一套 dispatch 邏輯**。兩邊在 DW 分支上逐值相同、在各自的 fallback 分支上差到第二位小數
——**這正好證明了差異的來源是 dispatch 而不是公式**。
⇒ **找第三方時要問的不是「它會不會算」，是「它在哪些地方跟我們走同一條路、哪些地方不同」**；
一致與不一致的**分界線落在哪裡**，比一致的程度更能說明問題。

## 側欄模組 → 方法對照

【待階段 A 收尾補齊】28 個側欄模組對應到約 60 個可報告方法，對照表在文件齊備後一次產出——
提前寫會與實際完成的文件清單脫節。

