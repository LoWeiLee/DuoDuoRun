# 階層迴歸（Hierarchical Regression）

> 方法代號 `regression-hierarchical`｜基準組 `reference.json → regression_hierarchical`（5）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6a）｜前置閱讀：`regression-multiple.md`（每一步就是一次多元迴歸）

---

## 1. 這個方法在回答什麼問題

**「在已經有的預測變項之上，再加這一批新的變項，還能多解釋多少？多解釋的那一點是巧合嗎？」**

做法是**分區塊依序放進去**，每放一批就看 $R^2$ 增加多少：

$$\Delta R^2_k=R^2_k-R^2_{k-1}$$

★ **這是研究者主導的順序**，不是資料決定的（那是 stepwise，本工具刻意不提供）。
順序通常來自理論：先放控制變項，再放理論關心的變項。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 想證明「加入 $X$ 之後，在控制 $Z$ 的情況下仍有額外解釋力」
- 調節效果的傳統做法（第一步主效果、第二步交互項）

**不該用**

- ★ **當作變項選擇工具。** 區塊順序要有理論依據，否則就是換個名字的 stepwise
- **區塊之間高度相關時**：$\Delta R^2$ 會很小，但那不代表變項不重要

**常見誤用**

1. ★ **只報 $\Delta R^2$ 不報它的 $F$ 檢定。** $\Delta R^2=0.01$ 可能顯著也可能不顯著，取決於 $n$ 與 $k$
2. **把最後一步的 $R^2$ 當成「模型的解釋力」而不提前面的區塊。**
3. ★ **同一個變項放進兩個區塊。** 本工具硬擋 `dupPredictor`（`hierarchicalRegression.js:58`）

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $K$ | 區塊數 |
| $\mathcal P_k$ | 前 $k$ 個區塊的**累積**預測變項集合 |
| $R^2_k$ | 用 $\mathcal P_k$ 跑多元迴歸的判定係數 |

### 3.2 每一步（`hierarchicalRegression.js:96–120`）

第 $k$ 步就是**對 $\mathcal P_k$ 呼叫一次 `multipleRegression`**，
所以 $R^2_k$、$R^2_{\text{adj},k}$、$F_k$、$p_k$ 的公式與慣例**完全沿用 `regression-multiple.md` §3.2**。

★ **共用樣本**：先對「$y$ ＋ 所有區塊的所有預測變項」做一次 listwise（`hierarchicalRegression.js:65–83`），
**讓每一步用同一個 $N$**——否則各步的 $R^2$ 不可比。

### 3.3 ★ $\Delta R^2$ 的 partial $F$ 檢定（`hierarchicalRegression.js:20–23`、`102–112`）

$$\Delta F=\frac{\Delta R^2/\mathrm{df}_{\text{num}}}{(1-R^2_k)/\mathrm{df}_{\text{den}}},\qquad
\mathrm{df}_{\text{num}}=|\mathcal P_k|-|\mathcal P_{k-1}|,\qquad
\mathrm{df}_{\text{den}}=N-|\mathcal P_k|-1$$

$\Delta p$ 為右尾 $F$。★ **分母用的是第 $k$ 步（較大模型）的 $1-R^2_k$**，這是標準做法。

★★ **這一組在 `generate_reference.py` 裡是「手算」的**（source 欄寫 `statsmodels.OLS (manual ΔF)`）
——正是 §0 品質規範點名的高風險類別（基準與 JS 出自同一次理解）。
**2026-07-30 已由 R 的 `anova(m1, m2)` 結案**，見 §6。

### 3.4 硬擋清單（`hierarchicalRegression.js:41–86`）

| 錯誤碼 | 條件 |
|---|---|
| `pickY` | 未選依變項 |
| `needBlock` | 沒有任何區塊 |
| `emptyBlock` | 有空區塊 |
| ★ `dupPredictor` | 同一變項出現在兩個區塊 |
| `yInX` | 依變項也被放進預測變項 |
| `tooFewN` | $N<$ 總預測變項數 $+2$ |
| `singular-matrix` | 任一步的設計矩陣不可逆（由 `multipleRegression` 傳回） |

## 4. 假設前提與本工具的檢核方式

前提與多元迴歸相同（見 `regression-multiple.md` §4）。本支特有的：

| 前提 | 本工具怎麼處理 |
|---|---|
| ★ 各步共用同一個 $N$ | ✅ 事前 listwise（`hierarchicalRegression.js:65–83`） |
| 區塊順序有理論依據 | ★ **無從檢核**，也不提醒（E106） |
| ★ 非退化 | ★ **2026-07-30 起讀 `finalReg` 的旗標並警告**（R69） |

★ **本支不自行做前提檢核**：殘差常態、VIF 等都在最後一步的 `finalReg` 裡，
由 UI 的係數表呈現。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Cohen, J., Cohen, P., West, S. G., & Aiken, L. S. (2003). *Applied Multiple Regression/Correlation Analysis for the Behavioral Sciences* (3rd ed.). Lawrence Erlbaum. | §3.3 的 partial $F$ | 【原文未取得】 |
| Aiken, L. S., & West, S. G. (1991). *Multiple Regression: Testing and Interpreting Interactions*. Sage. | 階層進入法的程序、調節效果的兩步驟做法 | 【原文未取得】 |

**程序指引**

- R `anova(m1, m2)` ——★ **2026-07-30 已實跑對照，本支最重要的一道**
- APA 7 §7.21：階層迴歸應逐步報 $R^2$、$\Delta R^2$、$\Delta F$、$\Delta p$

## 6. 對照與驗證狀態

**基準組**：`regression_hierarchical`（`r2_step1`／`r2_step2`／`deltaR2`／`deltaF`／`deltaP`）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels OLS 逐值**：5 欄全部在 `DEFAULT_TOL`（1e-6）內。★ **但 $\Delta F$ 與 $\Delta p$ 是手算的**（見 §3.3） |
| 2 | ★★ ✅ **R 側交叉驗證讓手算基準結案（2026-07-30，`07` §5）**：`anova(m1, m2)` 給 **$F=0.7321$、$\mathrm{Pr}(>F)=0.4855$**，與 fixture 的 **0.73208250 / 0.48545161** 相符 ⇒ **§0 點名的「手算基準與 JS 出自同一次理解」結構性弱點，在本組結案** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.3 的文字規格以 mpmath（dps = 40）重算兩步的 $R^2$ 與 partial $F$，**自寫 Gauss-Jordan 求逆、不呼叫 `statsmodels.OLS`**。5 欄相對差 **2.2e−16 ~ 2.8e−14** |
| 4 | ★ **`finalReg` 的係數表沿用 `regression_multiple` 的基準**——本組沒有獨立的係數欄基準 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| $\Delta F$ 的分母 | $1-R^2_k$（較大模型） | 同 SPSS／R | 一致 |
| listwise 時機 | ★ **事前一次**（所有區塊的變項一起） | SPSS 同；R 的 `anova` 需自行確保 | 一致，且本工具是硬性的 |
| stepwise | ★ **未提供** | SPSS／R 有 | 刻意不做 |
| $\Delta R^2$ 的 CI | ★ **不報** | 少見但存在 | 缺 |
| 區塊內的變項順序 | 不影響結果 | 同 | — |

### ★ 尚未驗證的部分

1. **兩本書皆未取得**
2. ★ **只有兩個區塊的情形被驗證過**。$K\ge3$ 時的**逐步 $\Delta$ 串接**（第三步對第二步）沒有任何基準（E107）
3. ★ **`finalReg` 之外的中間步驟係數無基準**：報表只呈現最後一步的係數表，中間步驟的 $b$／$SE$ 不顯示也不驗證
4. **$\Delta R^2$ 的信賴區間未實作**
5. **從未與 SPSS 對照過**
6. ★ **參數空間未掃描**：只有 $N=60$、$K=2$、$\mathrm{df}_{\text{num}}=2$ 一個點

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 步驟表：$R^2$／$R^2_{\text{adj}}$ | §3.2 | `hierarchicalRegression.js:108–109`；`Result.jsx:76–77` |
| 步驟表：$F$／$df$／$p$ | §3.2 | `hierarchicalRegression.js:102–107`；`Result.jsx:78–80` |
| ★ 步驟表：$\Delta R^2$／$\Delta F$／$\Delta df$／$\Delta p$ | §3.3 | `hierarchicalRegression.js:108–112`；`Result.jsx:81–88` |
| 最終步的統計量卡片 | §3.2、§3.3 | `Result.jsx:251–262` |
| 最終步的係數表 | `regression-multiple.md` §3.2 | `hierarchicalRegression.js` 的 `finalReg`；`Result.jsx:104+` |
| ★ 退化情形警告框 | §3.4 | `Result.jsx:236–246`；i18n `hierReg.degenerate*` |
| 顯著改善的步驟以綠色標示 | §3.3 | `Result.jsx:69`、`81–88`（$\Delta p<.05$） |

**孤兒欄位檢查**（2026-07-30 實跑）：`steps` 的 11 欄全部有 UI 消費者；
`blocks` 與 `yVar` 為回傳的設定回音，UI 另有來源，屬冗餘但無害。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 5 欄 2.2e−16 ~ 2.8e−14 |
| 2 | authority | ★ provenance 的 source 明寫 `statsmodels.OLS (manual ΔF)` ——**誠實標示了手算**，而這一次 R 把它結案了 |
| 3 | 文獻真實性 | 兩本書可查、標【原文未取得】 |
| 4 | 報表可追溯 | 11 欄零孤兒 |
| 5 | 假設前提 | ★ 共用 $N$ 的處理正確；★ **開出 R69**（退化情形，三支共用處置） |
| 6 | 慣例分歧 | 五項書面化；$\Delta F$ 的分母慣例與 SPSS／R 一致 |
| 7 | 邊界條件 | 實跑四種：正常兩區塊、第二區塊與第一區塊完全共線（✅ `singular-matrix`）、$y$ 常數（全印「—」，已由 R69 補警告）、完美配適（$R^2=1$、$\Delta R^2=0$、$\Delta p=1.000$，**不誤導**） |
| 8 | APA 敘述句 | 逐步敘述，以 $\Delta p<.05$ 判斷是否「顯著改善」 |
| 9 | 數學小工具的第二套實作 | ★ 本支**完全重用 `multipleRegression`**，沒有自己再寫一套 OLS ⇒ 正確的做法 |
| 10 | 效果量的名稱與值域 | $\Delta R^2\ge0$ 必然成立（巢狀模型）；本工具未特別 floor，但代數上不會為負 |
| 11 | 掃描結論的前提 | ★ 只有 $K=2$ 一個點；$K\ge3$ 的串接零基準（E107） |

### R69（L2）退化情形 —— 三支共用的處置

完整記錄見 `regression-multiple.md` §8。
**階層迴歸這一側的做法**：旗標來自 `finalReg`（最後一步的 `multipleRegression`），
警告框顯示在步驟表之前，並取消 $\Delta p$ 的顯著性燈號。

★ **本支的退化行為比另外兩支溫和**：$y$ 常數時所有欄位都印「—」（不會出現綠燈），
完美配適時 $\Delta R^2=0$、$\Delta p=1.000$（也不誤導）。
加警告仍有價值——**因為 $R^2=1.0000$ 這個數字本身就會被讀成「模型完美」**。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E106 | **區塊順序的理論依據無從檢核也不提醒**：階層迴歸與 stepwise 的差別全在「順序有沒有理論」，而工具對此完全沉默。建議教學模式加一句提醒 |
| E107 | ★ **$K\ge3$ 的逐步 $\Delta$ 串接零基準**：唯一的基準是 $K=2$。第三步對第二步的 $\Delta R^2$／$\Delta F$ 從未被驗證過，而 `hierarchicalRegression.js:96–120` 的迴圈對 $K$ 沒有上限 |
| E108 | **中間步驟的係數不顯示也不驗證**：報表只有最後一步的係數表 |
