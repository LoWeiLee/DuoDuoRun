# 多元線性迴歸（Multiple Linear Regression）

> 方法代號 `regression-multiple`｜基準組 `reference.json → regression_multiple`（14）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6a）｜相關文件：`regression-simple.md`、`regression-hierarchical.md`

---

## 1. 這個方法在回答什麼問題

**「同時放進幾個預測變項之後，每一個各自還能解釋多少？」**

$$\hat y=b_0+b_1x_1+\cdots+b_kx_k$$

★ 關鍵字是**「各自」**：$b_j$ 是「**控制其他預測變項之後**，$x_j$ 每增加一單位對 $\hat y$ 的貢獻」。
這與簡單迴歸的 $b_1$ 是不同的量——同一個 $x_1$ 在兩個模型裡可以有完全不同的係數，
甚至**反號**（抑制效果）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 多個預測變項，想知道各自的獨立貢獻
- 需要控制干擾變項

**不該用**

- ★ **預測變項之間高度相關時**（共線性讓 $b$ 不穩、$SE$ 膨脹）——本工具報 VIF 就是為了這件事
- **$n$ 太小**：常見經驗法則是每個預測變項至少 10–20 筆
- **依變項為二元**：改用邏輯迴歸

**常見誤用**

1. ★ **用 $b$ 的大小比較重要性。** $b$ 有單位，不同變項不可比；要比要看 $\beta$
2. ★ **把總分與它的分量表一起放進模型。** 會導致完全共線 ⇒ ★ **本工具硬擋 `singular-matrix`**
3. **逐步迴歸（stepwise）的結果當作理論。** 本工具**未提供 stepwise**，這是刻意的
4. **VIF < 10 就宣告沒有共線問題。** 門檻本身有爭議（見 §3.4）

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $\mathbf X$ | $n\times k$ 預測變項矩陣；$\mathbf X_a$ 為左側補一欄 1 的擴增矩陣 |
| $k$ | 預測變項數 |
| $\boldsymbol\beta$ | $(k+1)$ 維係數向量（含截距） |

### 3.2 OLS 估計（`multipleRegression.js:85–133`）

$$\boldsymbol\beta=(\mathbf X_a'\mathbf X_a)^{-1}\mathbf X_a'\mathbf y,\qquad
\mathrm{Cov}(\boldsymbol\beta)=MS_{\text{res}}\,(\mathbf X_a'\mathbf X_a)^{-1}$$

$SE(b_j)=\sqrt{MS_{\text{res}}\cdot[(\mathbf X_a'\mathbf X_a)^{-1}]_{jj}}$（`multipleRegression.js:130–133`），
$t=b_j/SE(b_j)$、$\mathrm{df}=n-k-1$、雙尾。
★ **反矩陣求不出來時回 `singular-matrix`**（`multipleRegression.js:97`）——
完全共線與常數欄都會走到這裡。

$$R^2=\frac{SS_{\text{reg}}}{SS_{\text{total}}},\qquad
R^2_{\text{adj}}=1-(1-R^2)\frac{n-1}{n-k-1},\qquad
F=\frac{R^2/k}{(1-R^2)/(n-k-1)}$$

### 3.3 標準化係數（`multipleRegression.js:147`）

$$\beta_j=b_j\cdot\frac{SD_{x_j}}{SD_y}$$

★ **此欄在 UI 上有、在 `reference.json` 裡沒有**——見 §6 的 E80。

### 3.4 VIF（`multipleRegression.js:54–83`、`150–151`）

$$\mathrm{VIF}_j=\frac{1}{1-R_j^2}$$

其中 $R_j^2$ 是「把 $x_j$ 當依變項、回歸到其餘 $k-1$ 個預測變項」的判定係數
（`rSquaredOfPredictor`，`multipleRegression.js:54–83`）。
$R_j^2\ge1$ 或無法計算時回 $\infty$。

★ **門檻慣例**：本工具的 UI 以 **VIF > 5 警告、> 10 紅燈**（`Result.jsx:326`），
引擎另以 **VIF > 100** 標記 `severeMulticollinearity`（`multipleRegression.js:176`）。
**三個門檻，三個出處都沒有寫在程式碼或文件裡**（E103）。

### 3.5 ★ 退化情形（`multipleRegression.js:168–176`）

| 情形 | 判準 | 處理 |
|---|---|---|
| 完全共線／常數欄 | $(\mathbf X_a'\mathbf X_a)$ 不可逆 | ✅ 硬擋 `singular-matrix` |
| ★ 依變項零變異 | $SD_y=0$ | 旗標 `zeroVarianceY`（★ **2026-07-30 前是孤兒欄位**） |
| ★ 完美配適 | $SS_{\text{res}}/SS_{\text{total}}<10^{-20}$ | ★ **2026-07-30 新增** `perfectFit` |

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 線性 | ★ 不檢核（散布圖在視覺化模組） |
| 殘差常態 | `compute.js:45` 對殘差跑 Shapiro-Wilk |
| 變異數齊一 | ★ **完全不檢核**（E98，同簡單迴歸） |
| ★ 低共線性 | ✅ **報每個預測變項的 VIF**，並以顏色標示 |
| 觀察值獨立 | 不檢核 |
| 非完全共線 | ✅ 硬擋 `singular-matrix` |
| ★ 非退化 | ★ 2026-07-30 起標記並警告（R69） |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Cohen, J., Cohen, P., West, S. G., & Aiken, L. S. (2003). *Applied Multiple Regression/Correlation Analysis for the Behavioral Sciences* (3rd ed.). Lawrence Erlbaum. | OLS、標準化係數、階層迴歸的 $\Delta R^2$ 檢定 | 【原文未取得】 |
| Aiken, L. S., & West, S. G. (1991). *Multiple Regression: Testing and Interpreting Interactions*. Sage. | 階層進入法的程序 | 【原文未取得】 |

**程序指引**

- R `lm`／`anova(m1, m2)`／`car::vif` 官方文件——★ **三者都已於 2026-07-30 實跑對照**（見 §6）
- APA 7 §7.21：迴歸表應報 $b$、$SE$、$\beta$、$t$、$p$、$R^2$、$\Delta R^2$

## 6. 對照與驗證狀態

**基準組**：`regression_multiple`（14 欄：`intercept`／`b_x1`~`b_x3`／`se_x1`／`t_x1`／`p_x1`／`r2`／`adjR2`／`F`／`pF`／`vif_x1`~`vif_x3`）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels OLS ＋ `variance_inflation_factor` 逐值**：14 欄全部在 `DEFAULT_TOL`（1e-6）內 |
| 2 | ✅ **R 側交叉驗證（2026-07-30，`07` §5）**：`lm(y ~ x1 + x2 + x3)` 的四個係數、$R^2=0.4907$、$R^2_{\text{adj}}=0.4634$、$F=17.98$、$p=2.696\times10^{-8}$ **全部對上**；`car::vif` 給 **1.482454 / 1.486275 / 1.003334** ⇒ 與本工具逐值相符 |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2／§3.4 的文字規格以 mpmath（dps = 40）重建，**自寫 Gauss-Jordan 求逆、不呼叫 `statsmodels.OLS` 也不呼叫 `variance_inflation_factor`**。14 欄 **max 相對差 1.350e−14**（VIF 三欄 4.5e−16 ~ 2.5e−17） |
| 4 | ★ **標準化係數 $\beta$ 此前零基準**：`reference.json` 沒有這三欄。2026-07-30 用 R 對標準化資料重跑 `lm` 得 **0.6448894 / 0.07950963 / 0.09147123**，本工具 **0.6448894225727726 / 0.07950963160352827 / 0.09147122623298892** ⇒ **相符到 R 印出的全部位數**。**但仍未進基準**（E80） |
| 5 | ★ **$k=1$ 時與 `simpleLinearRegression` 的交叉鎖**（本批新增）：200 組確定性資料 max 相對差 **5.2e−15** |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| VIF 門檻 | ★ UI 5／10、引擎 100 | SPSS 常用 10；文獻有 4／5／10 各種說法 | ★ **三個門檻皆無出處**（E103） |
| $\beta$ | $b_j SD_{x_j}/SD_y$ | 同 | 一致，但**無基準** |
| stepwise | ★ **未提供** | SPSS／R 都有 | 刻意不做（方法學上有爭議） |
| 殘差診斷 | 只有 Shapiro-Wilk | SPSS／R 有殘差圖、Cook's D、DW | ★ 變異數齊一與影響點無著落 |
| $b$ 的 CI | ★ **不報** | R `confint` | APA 7 建議報 |
| 容忍度（Tolerance） | 不報（只報 VIF） | SPSS 兩者都報 | $1/\mathrm{VIF}$ 可自行換算 |

### ★ 尚未驗證的部分

1. **兩本書皆未取得**
2. ★ **標準化係數 $\beta$ 三欄無基準**（E80，已對 R 驗過但未進 `reference.json`）
3. ★ **`severeMulticollinearity`（VIF > 100）此前是孤兒欄位**——引擎算了、零 UI 消費者；本批只把 `maxVif` 接回引擎，**這一欄仍無消費者**（E104）
4. ★ **變異數齊一、影響點、自相關三個前提完全未檢核**（E98）
5. **從未與 SPSS 對照過**；VIF 門檻無出處（E103）
6. ★ **參數空間未掃描**：只有 $n=60$、$k=3$、低共線（VIF < 1.5）一個點。
   **高共線區（VIF 5–100）沒有任何基準**——而那正是 VIF 這個欄位存在的理由（E105）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $R^2$／$R^2_{\text{adj}}$ 卡片 | §3.2 | `multipleRegression.js:121–123`；`Result.jsx:314–315` |
| 整體 $p$ 卡片 | §3.2 | `multipleRegression.js:126–127`；`Result.jsx:316–322` |
| max VIF 卡片 | §3.4 | ★ `multipleRegression.js:175`；`Result.jsx:292`、`311–313` |
| 係數表 $b$／$SE$／$\beta$／$t$／$p$ | §3.2、§3.3 | `multipleRegression.js:144–156`；`Result.jsx:201–205` |
| 係數表 VIF（含顏色） | §3.4 | `multipleRegression.js:150–151`；`Result.jsx:206` |
| ★ 退化情形警告框 | §3.5 | `multipleRegression.js:168–176`；`Result.jsx:305–311`；i18n `multReg.degenerate*` |
| 前提列（殘差 Shapiro-Wilk） | §4 | `compute.js:45` |

**孤兒欄位檢查**（2026-07-30 實跑）：
★ **修復前 `maxVif` 有 UI 消費者但 UI 是自己重算的**（`Result.jsx:292` 原為 `Math.max(...)`）——
**同一個判斷兩套實作**，已改為讀引擎的值。
★ **`severeMulticollinearity` 仍是孤兒**（E104）；`fitted` 陣列無 UI 消費者（除錯用）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 14 欄 max 1.35e−14 |
| 2 | authority | provenance 為 statsmodels，與產生方一致 |
| 3 | 文獻真實性 | 兩本書可查、標【原文未取得】 |
| 4 | 報表可追溯 | ★ **`maxVif` 被 UI 重算一次**（已改為讀引擎）；`severeMulticollinearity` 仍是孤兒（E104） |
| 5 | 假設前提 | ★ **開出 R69（L2）**；變異數齊一不檢核（E98） |
| 6 | 慣例分歧 | 六項書面化；★ **VIF 的三個門檻皆無出處**（E103） |
| 7 | 邊界條件 | 實跑四種：完全共線（✅ 硬擋）、常數欄（✅ 硬擋）、完美配適（開出 R69）、$y$ 常數（開出 R69） |
| 8 | APA 敘述句 | 以 $p<.05$ 篩選顯著係數；★ 退化時由 R69 的警告框攔在前面 |
| 9 | 數學小工具的第二套實作 | ★ 兩處：(a) `maxVif` 引擎與 UI 各算一次（**已修**）；(b) `simpleLinearRegression` 與本函式是兩套 OLS（**已補交叉鎖**，見 `regression-simple.md` E102） |
| 10 | 效果量的名稱與值域 | $R^2\in[0,1]$；★ $R^2_{\text{adj}}$ **可以是負的**（模型比截距還差），UI 不特別說明，屬正常行為 |
| 11 | 掃描結論的前提 | ★ **只有低共線的一個點**（VIF < 1.5）。VIF 這個欄位存在的理由是高共線，而高共線區零基準（E105） |

### R69（L2）兩個退化情形不擋也不警告 —— 同型第五次

**發現**（實跑）：

| 情形 | 舊版報表 |
|---|---|
| ★ **完美配適**（$y$ 完全由預測變項決定） | $R^2=1.0000$、$R^2_{\text{adj}}=1.0000$、$p<.001$，而 **$x_1$ 的 $t$ 印成 `2312738254615615.50`**——一個 2.3 千兆的 $t$ 值被原樣格式化到小數點後兩位 |
| ★ **依變項零變異** | $R^2$／$F$ 印「—」，但 **$x_1$ 的 $p=.001$ 顯著**——係數完全是浮點雜訊（$SS_{\text{res}}=1.3\times10^{-28}$、$SS_{\text{total}}=0$） |

★ **可達性在問卷研究裡很高**：把總分對它自己的分量表迴歸就會得到接近完美的配適。
★ **同型第五次**（A4 R40-i／A5a R51／A6a R61／A6a R66），而這一次的症狀最刺眼——
**不是印「—」，是印出一個 2.3e15 的數字**。

**處置（L2，當場修，簡單／多元／階層三支一起）**

1. ✅ 引擎新增 `perfectFit`（判準用相對值 $SS_{\text{res}}/SS_{\text{total}}<10^{-20}$，
   因為浮點下的完美配適 $SS_{\text{res}}$ 是 $10^{-27}$ 級而非恰好 0）；
   簡單迴歸另補 `zeroVarianceY`（多元本來就有，但是孤兒）
2. ✅ 三支的 Result 各加警告框，句子依情形帶入不同的 `{reason}`
3. ✅ 退化時**取消 $p$ 的顯著性燈號**（否則 $p=0$ 會被讀成「高度顯著」）
4. ✅ i18n 中英 × 三個命名空間 × 三鍵 ＝ **18 個字串**
5. ✅ 7 條行為測試，含「一般資料兩個旗標都必須為假」的回歸鎖

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E80 | ★ **標準化係數 $\beta$ 三欄無基準**（UI 有、fixture 沒有）。已對 R 驗到全部印出位數，建議補進 `regression_multiple` |
| E103 | ★ **VIF 的三個門檻皆無出處**：UI 的 5／10（`Result.jsx:326`）與引擎的 100（`multipleRegression.js:176`），程式碼與文件都沒寫依據。文獻上 4／5／10 都有人用 ⇒ 應標為本工具的選擇 |
| E104 | **`severeMulticollinearity` 是孤兒欄位**：引擎算了、零 UI 消費者（本批只修了 `maxVif`） |
| E105 | ★★ **高共線區零基準**：唯一的資料點 VIF < 1.5，而 VIF 這個欄位存在的理由正是高共線。⇒ 比照 R50／R60 的教訓，**這是下一個該補格點基準的地方**（VIF 5／10／50／100 各一組） |
