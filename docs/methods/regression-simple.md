# 簡單線性迴歸（Simple Linear Regression）

> 方法代號 `regression-simple`｜基準組 `reference.json → regression_simple`（9）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6a）｜相關文件：`regression-multiple.md`、`correlation.md`（$r^2=R^2$）

---

## 1. 這個方法在回答什麼問題

**「用一個變項去預測另一個變項，能預測到什麼程度？每增加一單位，預測值變多少？」**

$$\hat y = b_0 + b_1 x$$

$b_1$ 是斜率（$x$ 每增加 1，$\hat y$ 平均變動多少），$R^2$ 是「$y$ 的變異被解釋掉的比例」。

★ **簡單迴歸的 $R^2$ 就是 Pearson $r$ 的平方**——兩者是同一件事的兩種說法。
差別在迴歸給的是**有方向、有單位的預測式**，相關給的是**無方向、無單位的關聯強度**。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 一個預測變項、一個連續依變項，且關係大致是直線
- 需要**預測式**（不只是關聯強度）

**不該用**

- ★ **當作因果證據。** 迴歸的方向是研究者指定的，不是資料告訴你的
- **關係明顯非線性時**（先看散布圖，見 `visualization.md`）
- **有第二個重要的預測變項時**——遺漏變項會讓 $b_1$ 有偏

**常見誤用**

1. ★ **把總分對它自己的分量表迴歸。** 會得到接近完美的配適，報表印 $R^2=1.000$、$p<.001$
   ——★ **2026-07-30 起工具會警告**（見 §8 的 R69）
2. **外推到資料範圍之外。**
3. **只報 $R^2$ 不報 $b$ 與 $SE$。** APA 7 要求兩者都報

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $n$ | listwise 後的有效樣本數 |
| $S_{xx}$、$S_{xy}$、$S_{yy}$ | 離均差平方和與交乘積和 |
| $e_i=y_i-\hat y_i$ | 殘差 |

### 3.2 係數與配適（`regression.js:37–121`）

$$b_1=\frac{S_{xy}}{S_{xx}},\qquad b_0=\bar y-b_1\bar x,\qquad
R^2=\frac{SS_{\text{reg}}}{SS_{\text{total}}},\qquad
R^2_{\text{adj}}=1-(1-R^2)\frac{n-1}{n-2}$$

$$SE_{\text{est}}=\sqrt{MS_{\text{res}}},\qquad
SE(b_1)=\frac{SE_{\text{est}}}{\sqrt{S_{xx}}},\qquad
SE(b_0)=SE_{\text{est}}\sqrt{\frac1n+\frac{\bar x^2}{S_{xx}}}$$

檢定：$t=b/SE(b)$、$\mathrm{df}=n-2$、雙尾（`regression.js:96–99`）；
整體 $F=MS_{\text{reg}}/MS_{\text{res}}$、$\mathrm{df}=(1,\,n-2)$（`regression.js:82–83`）。
★ 簡單迴歸下 $F=t_{b_1}^2$，兩個 $p$ 必然相同。

### 3.3 標準化係數（`regression.js:104`）

$$\beta=b_1\cdot\frac{SD_x}{SD_y}$$

★ **簡單迴歸下 $\beta=r$**。$SD_y=0$ 時回 `NaN`。

### 3.4 ★ 兩個退化情形（`regression.js:106–113`）

| 情形 | 判準 | 舊版報表 |
|---|---|---|
| $x$ 為常數 | $S_{xx}=0$ | ✅ 硬擋，回 `x-is-constant`（`regression.js:56`） |
| ★ $y$ 為常數 | $SS_{\text{total}}=0$ | ❌ **不擋**：$R^2$ 印「—」，但**截距 $p=0$ 印「< .001」綠燈** |
| ★ 完美配適 | $SS_{\text{res}}/SS_{\text{total}}<10^{-20}$ | ❌ **不擋**：印 $R^2=1.000$、斜率 $p<.001$，而 $t=\infty$ 印「—」 |

★ **簡單迴歸沒有矩陣可解，所以不會像多元迴歸那樣被 `singular-matrix` 擋下來**——
這兩個旗標是 2026-07-30 補的，見 §8 的 R69。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 線性 | ★ **不檢核**（散布圖在視覺化模組，本頁不引導） |
| 殘差常態 | `simpleRegression/compute.js:37` 對**殘差**跑 Shapiro-Wilk，顯示在前提列 |
| 變異數齊一（homoscedasticity） | ★ **完全不檢核**（無殘差圖、無 Breusch-Pagan，E98） |
| 觀察值獨立 | 不檢核 |
| $n\ge3$ | 硬擋（`regression.js:40`） |
| $x$ 非常數 | 硬擋（`regression.js:56`） |
| ★ $y$ 非常數／非完美配適 | ★ **2026-07-30 起標記並警告**（R69） |
| 遺漏值 | listwise（`compute.js`） |

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

**基準組**：`regression_simple`（`intercept`／`slope`／`seSlope`／`tSlope`／`pSlope`／`r2`／`adjR2`／`F`／`pF`）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels OLS 逐值**：9 欄全部在 `DEFAULT_TOL`（1e-6）內 |
| 2 | ✅ **R 側交叉驗證（2026-07-30，R 4.6.0，`07_a6_r_audit.R` §5）**：`lm(y ~ x1)` 給 $b_0=7.07798$、$b_1=0.65673$、$SE=0.09023$、$t=7.278$、$p=9.99\times10^{-10}$、$R^2=0.4774$、$R^2_{\text{adj}}=0.4683$、$F=52.97$ ⇒ **全部對上** |
| 3 | ★ **殘差標準誤（`seEstimate`）此前零基準**：`reference.json` 沒有這一欄，而 R 給 **5.445**（`Residual standard error: 5.445 on 58 degrees of freedom`）⇒ 本工具實測 $\sqrt{MS_{\text{res}}}$ 相符。**但仍未進基準**（E99） |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| $\beta$（標準化係數） | $b_1 SD_x/SD_y$ | 同 SPSS／R | 一致 |
| $R^2_{\text{adj}}$ | $1-(1-R^2)\frac{n-1}{n-2}$ | 同 | 一致 |
| 殘差診斷 | ★ **只有 Shapiro-Wilk** | SPSS／R 提供殘差圖、Durbin-Watson、Cook's D | ★ 變異數齊一與影響點**完全沒有檢核** |
| 信賴區間 | ★ **不報 $b$ 的 95% CI** | R `confint`、SPSS 可選 | APA 7 建議報 CI |
| 退化情形 | ★ 2026-07-30 起警告 | SPSS 對完美配適會警告 | 修復後方向一致 |

### ★ 尚未驗證的部分

1. **兩本書皆未取得**（Cohen et al. 2003、Aiken & West 1991）
2. ★ **`seEstimate` 未進基準**（E99）；**殘差與 fitted 兩個陣列亦無基準**
3. ★ **變異數齊一、影響點、自相關三個前提完全未檢核**（E98）
4. **$b$ 的信賴區間未實作**（E100）
5. **從未與 SPSS 對照過**
6. ★ **參數空間未掃描**：只有 $n=60$ 一個點；小 $n$（$n=3$ 的下限附近）無測試

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $r$／$R^2$／$R^2_{\text{adj}}$／$SE_{\text{est}}$／$n$ | §3.2 | `regression.js:86–89`；`Result.jsx:88–92` |
| ANOVA 表（$SS$／$df$／$MS$／$F$／$p$） | §3.2 | `regression.js:69–83`；`Result.jsx:122–142` |
| 係數表：截距 $b$／$SE$／$t$／$p$ | §3.2 | `regression.js:96–99`；`Result.jsx:173–177` |
| 係數表：斜率 $b$／$SE$／$\beta$／$t$／$p$ | §3.2、§3.3 | `regression.js:92–104`；`Result.jsx:181–185` |
| ★ 退化情形警告框 | §3.4 | `regression.js:106–113`；`Result.jsx:259–263`；i18n `simpleReg.degenerate*` |
| 前提列（殘差 Shapiro-Wilk） | §4 | `compute.js:37`；`Result.jsx:39–67` |

**孤兒欄位檢查**（2026-07-30 實跑）：★ `residuals` 陣列**有消費者**（前提檢核用）；
`means` 與 `sds` 兩欄**沒有任何 UI 讀取**——它們是 `beta` 的中間值，屬刻意保留的除錯欄（E101）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；R 的 `lm` 全部對上 |
| 2 | authority | provenance 為 statsmodels，與產生方一致 |
| 3 | 文獻真實性 | 兩本書可查、標【原文未取得】 |
| 4 | 報表可追溯 | ★ `means`／`sds` 無 UI 消費者（刻意保留，E101） |
| 5 | 假設前提 | ★ **開出 R69（L2）**：$y$ 常數與完美配適不擋也不警告。★ **變異數齊一完全不檢核**（E98） |
| 6 | 慣例分歧 | 五項書面化；核心是**殘差診斷只有常態一項** |
| 7 | 邊界條件 | 實跑三種：$x$ 常數（正確硬擋）、$y$ 常數（開出 R69）、完美配適（開出 R69） |
| 8 | APA 敘述句 | 教學模式的解讀句以 $\beta$ 判強弱；★ 退化時已由 R69 的警告框攔在前面 |
| 9 | 數學小工具的第二套實作 | ★ `simpleLinearRegression` 與 `multipleRegression` 是**兩套獨立的 OLS 實作**（前者用閉式解、後者解矩陣）。$k=1$ 時兩者應同值——★ **本批實測 5.2e−15 並補上交叉鎖**（E102） |
| 10 | 效果量的名稱與值域 | $R^2\in[0,1]$、$\beta$ 在簡單迴歸下 $=r\in[-1,1]$；完美配適時 $R^2=1$ 為真值而非溢出 |
| 11 | 掃描結論的前提 | 只有 $n=60$ 一個資料點，未掃參數空間 |

### R69（L2）兩個退化情形不擋也不警告 —— 同型第五次

見 `regression-multiple.md` §8 的完整記錄（兩支共用同一個處置）。
**簡單迴歸這一側的特殊性**：它沒有矩陣可解，所以 `singular-matrix` 那道防線**對它無效**——
多元迴歸遇到常數欄或完全共線會被擋下，簡單迴歸遇到 $y$ 常數卻一路算到底。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E98 | ★ **變異數齊一（homoscedasticity）完全不檢核**：無殘差對預測值圖、無 Breusch-Pagan／White 檢定。這是 OLS 四大前提裡唯一完全沒有著落的一項 |
| E99 | **`seEstimate` 未進基準**：R 給 5.445，本工具相符，但 `reference.json` 沒有這一欄 |
| E100 | **$b$ 的 95% CI 未實作**（APA 7 建議） |
| E101 | **`means`／`sds` 無 UI 消費者**（刻意保留的除錯欄，已在 §7 註明） |
| E102 | ★ **兩套 OLS 實作此前沒有交叉鎖**：`simpleLinearRegression`（閉式解）與 `multipleRegression`（矩陣解）在 $k=1$ 時應同值，而**沒有任何測試檢查這件事**——「同一個判斷兩套實作」在**演算法層**的版本。★ **2026-07-30 已實測並補上交叉鎖**：本資料集 max 相對差 **2.9e−13**、200 組確定性資料 **5.2e−15**（`a6.behavior.test.js` 已鎖），**無偏離** |
