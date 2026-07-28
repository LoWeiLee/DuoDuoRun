# 調節效果：two-stage 法（Two-stage approach）

> 方法代號 `pls_mod_twostage`｜基準組 `reference.json → pls_mod_twostage`（10 欄）｜溯源 tier **B** / verified
> ★ 本工具的**預設**調節法，也是 `pls_quadratic` 與 `pls_mod_threeway` 共用的同一條程式路徑
> 最後更新：2026-07-26（階段 A / A2）

---

## 1. 這個方法在回答什麼問題

調節問的是：**X 對 Y 的影響，會不會因為 W 的高低而不同？**

在迴歸裡這靠一個乘積項 $X\cdot W$ 處理。在 PLS-SEM 裡困難的是——X 和 W 都是**潛在**構念，
沒有直接可乘的值。two-stage 法的解法很直接：

1. **第一階段**：先跑一次**只含主效果**的模型，取出構念分數
2. **第二階段**：把分數當成單指標構念，乘積作為交互構念的唯一指標，再跑一次

## 2. 什麼時候該用、什麼時候不該用

**該用**（這是現行主流建議）

- 一般的兩因子調節
- 因子含**形成型**構念（product indicator 法要求反映型，本工具會擋）
- 指標數多（product indicator 會產生 $k_a\times k_b$ 個乘積指標，指標一多就爆炸）
- 二次效果與三向以上交互（見 `pls-quadratic.md`、`pls-moderation-threeway.md`）

**不該用／要小心**

- **與 PLSc 併用**：本工具**硬擋**（`plsc-w4-not-supported`）。第二階段是單指標構念，
  $\rho_A$ 在該層無定義。
- **想拿第二階段的 model fit**：多階段模型**不報 fit**（殘差矩陣在分數層不具標準詮釋），
  第一階段的量測則由 `stage1` 子報表提供。

**常見誤用（三條）**

1. **忘記主效果路徑。** 交互項要能解釋，兩個因子的主效果**必須**同時在模型裡。
   本工具會**自動補**（§3.1），並記在 `meta.autoAddedPaths`——但研究者仍應知道自己的模型被改過。
2. **拿標準化係數解讀交互項。** 本工具依 SmartPLS 慣例回報**未標準化**係數（§3.3），
   因為乘積項的標準化係數不具「每增加 1 個 SD」的直覺意義。
3. **只看交互項顯著就宣稱調節成立，不畫簡單斜率。** 交互係數的符號只說明方向變化的方向，
   實際的斜率要看 §3.4。

## 3. 公式與定義

### 3.1 自動補主效果路徑

若使用者宣告了交互項 $I\to Y$，但沒有畫 $X\to Y$ 或 $W\to Y$，引擎**自動補上**：

$$\text{對每個 } I\to Y,\ \text{每個因子 } f\in\text{factors}(I):\quad \text{若 } f\to Y \notin \text{paths},\ \text{加入之}$$

→ `src/lib/stats/pls.js:1360–1374`；補上的路徑記於 `meta.autoAddedPaths`（`pls.js:1375`）

★ 實測：宣告 `F1×C → Y` 而未畫主效果時，`autoAddedPaths` 回傳 `[{F1→Y}, {C→Y}]`。
對齊 SmartPLS 4 的 Moderation 行為。

### 3.2 兩個階段

**第一階段**：以 `curPaths`（**僅主效果**，交互路徑尚未併入）估計，取各構念分數 $y_j$。

→ `pls.js:1639–1642`；★ 交互路徑 `intPaths` 在第一階段**之後**才併入（`pls.js:1665`），
這保證了第一階段的乾淨（此為 `pls-quadratic.md` 對 SmartPLS 文件的口徑核對重點）。

**第二階段**：每個原構念變成「以自己第一階段分數為唯一指標」的單指標構念；
交互構念的唯一指標為因子分數的**連乘**：

$$z_I=\prod_{f\in\text{factors}(I)}y_f$$

→ `pls.js:1643–1666`（分數欄 `1615–1618`、連乘 `1620–1624`、掛成構念 `1629–1631`）

★ **乘積不標準化**（SmartPLS 4 慣例）。第二階段全為單指標構念 ⇒ 結構模型退化為**分數層 OLS**。

### 3.3 係數的量尺（本節最容易搞混）

第二階段的引擎回傳的是**標準化**係數（因為引擎內部把每個單指標構念都標準化了）。
回報前再除以乘積的樣本標準差，還原為**未標準化乘積量尺**：

$$\beta^{\text{報告}}_{I\to Y}=\frac{\beta^{\text{std}}_{I\to Y}}{\operatorname{sd}(z_I)}$$

→ `pls.js:1951–1972`（`applyInteractionRescale`）；標準化值保留在 `coefStd`（`pls.js:1951`）

★ 實測（M4 資料）：`coefStd = 0.15431`、`sd(z_I) = 1.04775` → 回報 `coef = 0.14728`。

### 3.4 簡單斜率（simple slopes）

$$\text{slope}(w)=\beta_{X\to Y}+\beta_{I\to Y}\cdot w,\qquad w\in\{-1,0,+1\}$$

構念分數已標準化，故 $w=\pm1$ 即 $\mp1$ 個標準差（Aiken & West 1991 的慣例）。
另回報各水準的截距位移 $\beta_{W\to Y}\cdot w$，供繪圖用。

→ `pls.js:1975–2011–1990`（二因子分支 `1962–1969`、斜率 `1968`）

### 3.5 效果量 $f^2$

$$f^2_{\text{int}}=\frac{R^2_{\text{含交互項}}-R^2_{\text{不含交互項}}}{1-R^2_{\text{含交互項}}}$$

與一般 $f^2$ 同式（見 `pls-basic.md` §3.5），由結構模型的 predictor 迴圈算出。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 不與 PLSc 併用 | 建模階段檢查 | **硬擋** `plsc-w4-not-supported`（實測確認） | `pls.js:1354–1359` |
| 多個交互項的 method 一致 | 驗證器 | **硬擋**「多個交互項的 method 必須一致」（實測確認） | `pls.js:383` |
| 交互項不作為路徑終點 | 驗證器 | **硬擋** | 見 `validatePLSModel` |
| 調節變數與交互項的依變數不形成循環 | Kahn 拓撲排序 | **硬擋** | `pls.js:426–455` |
| 乘積有變異 | $\operatorname{sd}(z_I)>0$ | **硬擋** `interaction-degenerate`，指名交互項 | `pls.js:1656–1658` |
| 主效果路徑存在 | 不存在就**自動補** | 記入 `meta.autoAddedPaths` | `pls.js:1360–1374` |
| 第二階段不報 model fit | `skipFit` | fit 與 GoF 皆為 `null`，`stage1` 提供第一階段量測 | `pls.js:1909` |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Chin, W. W., Marcolin, B. L., & Newsted, P. R. (2003). A partial least squares latent variable modeling approach for measuring interaction effects. *Information Systems Research*, 14(2), 189–217. | 3.2 兩階段法 | 【原文未取得】 |
| Aiken, L. S., & West, S. G. (1991). *Multiple Regression: Testing and Interpreting Interactions*. Sage. | 3.4 ±1 SD 的簡單斜率慣例 | 【原文未取得】 |

**程序指引**

| 來源 | 用途 |
|---|---|
| SmartPLS 4 官方 Moderation 文件 | 自動補主效果、乘積不標準化、回報未標準化係數三項慣例 |
| seminr 2.5.0 | 2026-07-13 本機 R 抽驗的對照實作 |

★ 全部未取得原文；第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_mod_twostage`（10 欄）

**tier / status**：tier **B** / **verified**

**對照過的第三方**

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| **seminr 2.5.0**（R，本機） | F1／C／交互項係數與 $R^2$ | 2026-07-13 逐值一致；**交互項對到未標準化的 `path_int_Y = 0.14728`** |
| **plspm 0.5.7** | **第一階段**的 loadings | 重生時 assert **<1e−6** |
| 本文件的獨立重寫（2026-07-26） | 10 欄全部 | 最大絕對差 **2.2e−16** |
| SmartPLS 4 | — | **沒有對照過**（授權過期） |

★ 本組是 A2 批次中**唯一有第三方逐值對照交互項係數**的一組（seminr）。
`pls_quadratic` 與 `pls_mod_threeway` 走同一條程式路徑，其機制證據即來自本組。

**已知的慣例差異**

1. **交互項係數的量尺**：本工具＋SmartPLS 報**未標準化**；product-indicator／orthogonal
   兩法在本工具報**標準化**（見各自文件）。同一份資料換方法時數字不可直接比較。
2. **自動補主效果**：對齊 SmartPLS。部分實作要求使用者自己畫。
3. **簡單斜率的取值**：$\pm1$ SD。另有實作用 $\pm1.5$ SD 或百分位。

### ★ 尚未驗證的部分

1. **兩篇方法出處原文未取得**，方程式編號未核對。
2. **SmartPLS 4 未對照過**——本工具的三項慣例都是照其**線上文件的文字**實作的，
   沒有對過它的**數字**。
3. **簡單斜率的截距位移（`intercept` 欄）沒有第三方對照**，也沒有基準組欄位；
   只有代數一致性測試。
4. **$f^2_{\text{int}}$ 的第三方對照**：seminr 抽驗涵蓋係數與 $R^2$，**未涵蓋 $f^2$**。
5. **第二階段不報 fit 是刻意取捨**，但這代表**調節模型完全沒有適配資訊**——
   `stage1` 只有主效果模型的 fit。這一點在 UI 沒有明說。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 交互項路徑係數（未標準化） | 3.3 | `pls.js:1951–1972` |
| `coefStd`（標準化，供對照） | 3.3 | `pls.js:1951` |
| `sdProduct` | 3.2 | `pls.js:1655`、`1631` |
| 簡單斜率表（3 個水準） | 3.4 | `pls.js:1998` |
| 各水準截距位移 | 3.4 | `pls.js:1998` |
| $f^2$ 欄 | 3.5 | `pls.js:894–901` |
| 自動補的路徑清單 | 3.1 | `pls.js:1375`；`meta.autoAddedPaths` |
| 階段說明文字 | 3.2 | `pls.js:1667` |
| 第一階段量測子報表 | 3.2 | `report.stage1` |

**孤兒欄位檢查**：`interactions[].targets[].iv`／`moderator` 為標籤欄位。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A2

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 2.2e−16） |
| 2 | authority 是否支持該公式 | **通過**（authority 列 seminr ＋ Chin et al. ＋ SmartPLS 文件，且 verification 記下交互項對到的具體數值） |
| 3 | 文獻真實性 | 兩篇皆未取得原文，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**——七道守衛齊全，其中三道（PLSc 併用、method 混用、乘積退化）**已實跑確認** |
| 6 | 慣例分歧 | **通過**（第 6 節列 3 項，其中量尺一項跨三份文件一致標註） |
| 7 | 邊界條件 | **通過**（`interaction-degenerate` 有守衛且指名） |
| 8 | APA 敘述句 | **通過**（句子含交互項係數與簡單斜率，並標明未標準化量尺） |

### R1（通過）獨立重寫

依第 3 節文字規格以 numpy 重寫兩階段（第一階段 Lohmöller、第二階段分數層 OLS、
乘積量尺還原、$f^2$、三個簡單斜率），10 欄比對**最大絕對差 2.2e−16**。

### 實跑確認的守衛（不是讀碼推論）

```
PLSc × 調節      → plsc-w4-not-supported | PLSc（consistent PLS）目前不支援與調節／高階構念併用…
混用 method      → invalid-model | 多個交互項的 method 必須一致（two-stage / product-indicator / orthogonal 擇一）
未畫主效果       → autoAddedPaths = [{F1→Y}, {C→Y}]，並在 meta.stages 說明兩階段流程
```

### 本組沒有新開待辦

A2 批次的三項紅隊發現（R14 交互構念信效度、R15 HOC 的 GoF、R16 中介 VAF）
分別記於 `pls-moderation-product-indicator.md`、`pls-hoc-repeated.md`、`pls-mediation.md`。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
