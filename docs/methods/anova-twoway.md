# 雙因子變異數分析（Two-way ANOVA，Type III SS）

> 方法代號 `anova-twoway`｜基準組 `reference.json → twoway_anova_type3`（10 個統計量）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）

---

## 1. 這個方法在回答什麼問題

單因子 ANOVA 一次只看一個分組變數。雙因子同時看兩個，並且——這才是重點——
**問第三個問題：這兩個因子會不會互相影響？**

| 效果 | 問的是 |
|---|---|
| 主效果 A | 平均而言，A 的各水準之間有差異嗎？ |
| 主效果 B | 平均而言，B 的各水準之間有差異嗎？ |
| **交互作用 A×B** | **A 的效果，會隨 B 的水準而改變嗎？** |

★ **交互作用顯著時，主效果通常不該單獨解讀。** 「訓練有效」這句話在
「對新手有效、對老手無效」的情況下是誤導的——正確的說法是「訓練的效果取決於年資」。
本工具在交互作用顯著時會在教學模式提示這件事（`Result.jsx:226`）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 兩個類別自變項、一個連續依變項
- 理論上預期兩者有交互作用（這才是雙因子的價值所在）

**不該用**

- ★ **細格人數嚴重不等或有空細格**：Type III SS 在空細格下不可估。本工具會回 `singular-reduced-model`，但**不解釋原因**
- **其中一個因子其實是連續變項**：切組會丟資訊，用迴歸
- **同一群人重複測量**：用 `anova-mixed.md`

**常見誤用**

1. ★ **交互作用顯著卻照常解讀主效果。** 這是雙因子最常見的誤用
2. ★ **交互作用不顯著就宣稱「兩因子獨立」。** 不拒絕不等於成立，且交互作用的檢定力通常低於主效果
3. **不看細格人數。** 人數不等時 Type I／II／III 的 SS 會不同（§3.2），而多數人不知道自己在用哪一種
4. **只看 $F$ 不看交互作用圖**：圖上兩條線是否平行，比 $p$ 值直觀

## 3. 公式與定義

### 3.1 設計矩陣（效果編碼）

對 $k$ 個水準，第 $i$ 個水準編成 $k-1$ 維向量：第 $i$ 維為 1，其餘 0；**最後一個水準全部為 $-1$**
（`twoWayAnova.js:35–44`）。完整設計矩陣：

$$X=\bigl[\;\mathbf 1\;\big|\;A_{(n_A-1)}\;\big|\;B_{(n_B-1)}\;\big|\;(A\otimes B)_{(n_A-1)(n_B-1)}\;\bigr]$$

★ **效果編碼（$-1/0/1$）而不是 dummy 編碼（$0/1$）**，是 Type III SS 成立的前提：
效果編碼讓各效果的欄空間彼此正交於截距，主效果才有「邊際平均」的解釋。

### 3.2 ★ Type III SS：慣例分歧的核心

對每個效果 $E$，用**模型比較**求其 SS（`twoWayAnova.js:52–66`、`161–178`）：

$$\mathrm{SS}_E=\mathrm{ESS}(\text{完整模型去掉 }E)-\mathrm{ESS}(\text{完整模型})$$

也就是「把 $E$ 拿掉後，殘差平方和多出來多少」。

★ **三種 SS 慣例，在細格人數不等時會給出不同答案**：

| 型 | 意義 | 誰用 |
|---|---|---|
| Type I | 依序加入（結果**取決於因子順序**） | R 的 `anova()` 預設 |
| Type II | 各主效果調整彼此、但不調整交互作用 | R `car::Anova(type=2)` |
| **Type III** | **每個效果都調整其他所有效果**（含交互作用） | ★ **本工具**、SPSS 預設、`car::Anova(type=3)` |

⇒ **細格人數相等時三者相同；不等時不同。** 本工具**只實作 Type III**，
與 SPSS 一致，但**與 R 的 `anova(aov(...))` 預設（Type I）不同**——
這是使用者拿本工具對照 R 時最容易產生「數字不一樣」誤會的一項。

★ 自由度：$\mathrm{df}_{\text{error}}=N-n_An_B$（`twoWayAnova.js:173`）——即完整模型的參數數，
這蘊含**每個細格都有觀測值**。空細格時模型奇異，回 `singular-matrix`／`singular-reduced-model`。

### 3.3 效果量

各效果報 **partial $\eta^2$**：

$$\eta^2_{p}=\frac{\mathrm{SS}_E}{\mathrm{SS}_E+\mathrm{SS}_{\text{error}}}$$

★ **注意分母是 $\mathrm{SS}_E+\mathrm{SS}_{\text{error}}$ 而不是 $\mathrm{SS}_{\text{total}}$**——
這是 partial 的定義，也代表**各效果的 partial $\eta^2$ 加起來可以超過 1**，
不能讀成「解釋變異的比例」。本工具**未在報表說明這件事**（見第 6 節）。

## 4. 假設前提與本工具的檢核方式

★ 雙因子 ANOVA **不在 `assumptionChecker.js` 的 case 清單內**（`283–289` 只有六支）。
2026-07-29 之前**完全沒有任何前提檢核**——七支 A5a 方法裡唯一的空白（R52）。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ★ 變異數同質 | ✅ **Levene，跑在 A×B 交叉後的各細格**（`compute.js:34–46`） | 紅燈＋警告框，不擋 |
| ★ 殘差常態 | ✅ **Shapiro-Wilk，跑在全模型殘差**（`compute.js:46`） | 紅燈＋警告框，不擋 |
| 每個細格都有資料 | ✅ 矩陣奇異時回錯誤碼（`twoWayAnova.js:161`／`166`） | ★ 錯誤訊息**不指名**是哪個細格空的 |
| $N\ge n_An_B+2$ | ✅ `twoWayAnova.js:93` | 回 `need-more-data` |

★ **為什麼 Levene 跑細格而不是逐因子**：雙因子的誤差項是**細格內**變異，
所以同質性要在細格層檢核。逐因子跑 Levene 會漏掉「A 的某個水準下 B 的變異特別大」這種情形。

★ **為什麼 Shapiro 跑殘差而不是逐組**：雙因子的常態假設是**殘差常態**，
逐組跑會在細格小時完全沒有檢定力。

**沒有檢核的**：獨立性、離群值、細格人數是否平衡（不等時 Type III 的解讀較複雜，工具不提醒）。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Fisher, R. A. (1925). *Statistical Methods for Research Workers*. | §3.1 變異數拆解 | ★ **【原文未取得】** |
| Yates, F. (1934). The analysis of multiple classifications with unequal numbers in the different classes. *Journal of the American Statistical Association*, 29(185), 51–66. | §3.2 不等細格的調整平方和 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **statsmodels** 的 `anova_lm(typ=3)`＋Sum coding | ★ 基準的產生方 |
| SPSS GLM Univariate | Type III 為其預設；本工具的對標對象 |

## 6. 對照與驗證狀態

**基準組**：`reference.json → twoway_anova_type3`（10 欄：`ssA`／`fA`／`pA`／`ssB`／`fB`／`pB`／
`ssAB`／`fAB`／`pAB`／`ssError`）。資料集 `datasets.json:main` 的 `y ~ group2 * group3`（2 × 3，$N=60$）。

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels `anova_lm(typ=3)` 逐值**：10 欄（容差 1e−6） |
| 2 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1–3.2 的文字規格自建效果編碼設計矩陣，以 `numpy.linalg.lstsq` 做模型比較求 Type III SS（**不呼叫 `anova_lm`**），10 欄最大絕對差 **2.615e−12**。⇒ 效果編碼的 $-1$ 慣例、模型比較的減法方向、交互作用欄的 Kronecker 展開都寫對了 |
| 3 | ★ **R52 的回歸鎖**：新增前提檢核後，四個 SS 逐值不變（`a5a.behavior.test.js`） |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| SS 型別 | **只有 Type III** | SPSS 預設 Type III；**R `anova()` 預設 Type I** | ★ 細格不等時與 R 對不上，且工具**不說明自己用的是哪一型** |
| 編碼 | 效果編碼（$-1/0/1$） | SPSS 同（Sum coding） | 無 |
| 效果量 | partial $\eta^2$ | SPSS 同 | ★ 但未說明「加起來可超過 1」 |
| 空細格 | 回錯誤碼 | SPSS 亦不可估 | ★ 訊息不指名哪個細格 |

### ★ 尚未驗證的部分

1. ★ ★ **兩篇原文未取得**；Type III 的定義只對到 statsmodels 的行為
2. ★ ★ **只有平衡設計被基準覆蓋**。`datasets.json:main` 的 2×3 六個細格各 10 人 ⇒ **完全平衡**，
   而 Type I／II／III **在平衡設計下完全相同**。⇒ 「本工具用的是 Type III」這件事
   **沒有任何基準鎖得住**——與 A4 的 LDA 事前機率（三組各 20 人）同型
3. ★ **報表不標示 SS 型別**：使用者拿去對 R 的預設輸出會對不上，而畫面上沒有任何線索
4. ★ **partial $\eta^2$ 的分母未說明**：可加總超過 1，報表未提示
5. **空細格與極端不平衡的錯誤路徑無測試覆蓋**
6. **三因子以上、隨機效果、巢狀設計均未實作**

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 統計卡（三個效果的 $F$／$p$） | §3.2 | `twoWayAnova.js:170–190`、`Result.jsx:257` |
| 細格平均表（含 $n$、SD） | §3.1 | `twoWayAnova.js` 的 `cellMeans`、`Result.jsx:46–63` |
| ★ 前提檢核區（細格 Levene ＋ 殘差 Shapiro-Wilk） | §4 | `compute.js:23–52`、`Result.jsx:233–291`、i18n `assumpTitle` 等（R52） |
| ANOVA 摘要表（SS／df／MS／F／p／partial $\eta^2$） | §3.2、§3.3 | `twoWayAnova.js:170–190` |
| 交互作用圖 | §3.2 | `Result.jsx:165–186`、`InteractionPlot.jsx` |
| 教學模式的交互作用提示 | §1 | `Result.jsx:226` |
| APA 敘述句 | §3.2、§3.3 | `Narrative.jsx:11–60` |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `nA`／`nB`（水準數） | **孤兒，屬中介量**（水準名稱由 `levelsA`／`levelsB` 呈現）。書面記錄 |
| 其餘（`cellMeans`／`marginalA`／`marginalB`／`grandMean`／`effectA`／`effectB`／`effectAB`／`errorTerm`／`total`／`n`／`levelsA`／`levelsB`／`assumptions`） | 全部有對應呈現 |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫 10 欄最大差 2.6e−12） |
| 2 | authority | ★ **不足**：原文未取得，Type III 只對到 statsmodels 輸出 |
| 3 | 文獻真實性 | Yates (1934) JASA 29(185) 卷期頁碼可查；★ 標【原文未取得】 |
| 4 | 報表可追溯 | 26 欄，僅 `nA`／`nB` 兩個中介量孤兒。書面記錄 |
| 5 | 假設前提 | ★ **開出並已修 R52**（修復前七支裡唯一完全沒有前提檢核的） |
| 6 | 慣例分歧 | ★ **Type III 未在報表標示**（§6 第 3 項）、partial $\eta^2$ 分母未說明 |
| 7 | 邊界條件 | ★ **平衡設計讓 Type I/II/III 同值 ⇒ 慣例本身無基準覆蓋**（§6 第 2 項）；空細格路徑零測試 |
| 8 | APA 敘述句 | 三個效果各報 $F$／$p$／partial $\eta^2$，交互作用顯著時教學模式有提示——**通過** |

### R52（L2）雙因子 ANOVA 完全沒有前提檢核

**發現**　實查 `assumptionChecker.js:283–289` 與各 `Result.jsx`：
t 檢定與單因子 ANOVA 有 Levene ＋ Shapiro-Wilk、ANCOVA 有斜率同質性、
重複量數與混合設計有 Mauchly——**七支裡只有雙因子是完全空的**，
而 `levene.js` 與 `normality.js` 兩支現成函式早就在專案裡被另兩支使用。

**處置（Kevin 2026-07-29 核定）**　比照 `oneWayAnova/compute.js:47–48` 的做法補上：
細格層 Levene（因為雙因子的誤差項是細格內變異）＋ 全模型殘差的 Shapiro-Wilk
（因為雙因子的常態假設是殘差常態）。`compute.js:23–52`、`Result.jsx:233–291`、i18n 中英各 7 鍵。
兩者只警告不擋。＋4 條行為測試，含 **「Levene 的 df1 必須是細格數 − 1」**（鎖住跑的是細格而非因子水準）
與**四個 SS 逐值不變**的回歸鎖。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E28 | ★ **報表不標示 SS 型別**：使用者對 R 的預設（Type I）會對不上，畫面上零線索 |
| E29 | **partial $\eta^2$ 的分母未說明**：可加總超過 1，不能讀成解釋變異比例 |
| E30 | **空細格的錯誤訊息不指名是哪個細格**（比照 A1 的 R7「指名構念」） |

### 本批本組未開出 L3／L4
