# 模型適配指標（SRMR / d_ULS / d_G / NFI）

> 方法代號 `pls_fit`｜基準組 `reference.json → pls_fit`（8 欄）｜溯源 tier **B** / verified
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

PLS-SEM 的估計目標是最大化內生構念的被解釋變異，**不是**讓模型隱含的共變異結構貼近樣本共變異。
所以它原本沒有「整體適配檢定」這回事。

這四個指標回答的是一個較弱、但仍有意義的問題：**如果把這個模型當成一個共變異結構模型來看，
它隱含的指標相關矩陣與實際觀察到的差多少？**

- **SRMR**：殘差矩陣的標準化均方根——「平均差多少」，最直觀
- **d_ULS**、**d_G**：兩種矩陣距離——「差多遠」，主要供**模型之間比較**
- **NFI**：相對於「所有指標互不相關」這個虛無模型改善了多少

每個指標都報**兩欄**：

| 欄 | 構念相關矩陣怎麼來 | 在評什麼 |
|---|---|---|
| **飽和模型（saturated）** | 樣本估出的構念相關（自由） | 只評**測量模型** |
| **估計模型（estimated）** | 由結構路徑遞迴推導（path tracing） | 測量模型 ＋ **結構模型的限制** |

兩者的差距 = 你設的結構模型（例如刻意不畫某條路徑）付出的代價。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 作為**近似性檢核**：SRMR 明顯偏高（≥ .10）是「模型或測量有問題」的訊號，值得回頭檢查
- 比較**同一份資料上的競爭模型**（d_ULS／d_G 的主要用途）
- 期刊或審稿人要求時（PLS-SEM 論文近年常被要求報 SRMR）

**不該用**

- **當成 CB-SEM 的整體適配檢定**。這裡沒有 $\chi^2$、沒有 CFI／TLI、沒有 p 值。
  「SRMR < .08 所以模型適配良好」這句話在 PLS 脈絡是過度宣稱。
- **跨資料集比較 d_ULS／d_G**。它們不是標準化量。
- **拿 d_G 的絕對值與 cSEM 的報表對照**——底數慣例不同，差 5.3 倍（見 §3.4）。

**常見誤用**：把 SRMR 當成「可以取代信效度檢核」的單一指標。它對測量模型的問題不敏感，
一個 AVE 只有 .35 的模型照樣可能有漂亮的 SRMR。

## 3. 公式與定義

### 3.1 模型隱含的指標相關矩陣 $\hat{\boldsymbol{\Sigma}}$

設指標 $i$ 屬構念 $o(i)$、負荷量 $\lambda_i$，構念相關矩陣為 $\mathbf{R}^{lv}$，則

$$\hat\Sigma_{ik}=\begin{cases}1 & i=k\\ \lambda_i\lambda_k & o(i)=o(k)\ (i\neq k)\\ \lambda_i\,R^{lv}_{o(i)o(k)}\,\lambda_k & o(i)\neq o(k)\end{cases}$$

→ `src/lib/stats/pls.js:1076–1084`

★ 對角線**固定為 1**（不是 $\lambda_i^2$）。這是 composite 模型的慣例：
指標的變異被完全解釋（誤差併入權重），所以殘差矩陣的對角線恆為 0。

### 3.2 飽和 vs 估計：$\mathbf{R}^{lv}$ 的兩種來源

- **飽和**：$\mathbf{R}^{lv}=$ 樣本構念相關（`pls-basic.md` §3.4）
- **估計**：由結構模型遞迴推導（path tracing）。依拓撲順序，對每個構念 $j$：

$$R^{lv}_{jk}=\begin{cases}r_{jk}\ (\text{樣本值}) & j\ \text{為外生構念}\\[2pt] \sum_{q}\beta_{jq}\,R^{lv}_{P_q k} & j\ \text{為內生構念}\end{cases}$$

→ `pls.js:1038–1064`（`impliedLvCorr`）。拓撲順序由 `buildSpec` 的 Kahn 排序提供，
FIFO 保證外生構念全部排在內生之前（`pls.js:1049–1051` 的註解）。

### 3.3 四個指標

令 $\mathbf{D}=\mathbf{S}-\hat{\boldsymbol{\Sigma}}$（$\mathbf{S}$ 為樣本指標相關矩陣，$p$ 為指標數）：

$$\text{SRMR}=\sqrt{\frac{\sum_{i\le k}D_{ik}^2}{p(p+1)/2}},\qquad d_{ULS}=\tfrac12\lVert\mathbf{D}\rVert_F^2=\tfrac12\sum_{i}\sum_{k}D_{ik}^2$$

→ `pls.js:1094`（SRMR）、`1095`（d_ULS）

令 $\nu_1,\dots,\nu_p$ 為 $\mathbf{S}^{-1}\hat{\boldsymbol{\Sigma}}$ 的特徵值（實作上取
$\mathbf{M}=\mathbf{S}^{-1/2}\hat{\boldsymbol{\Sigma}}\mathbf{S}^{-1/2}$ 的特徵值，兩者相同但 $\mathbf{M}$ 對稱、數值穩定）：

$$d_G=\tfrac12\sum_i(\ln\nu_i)^2$$

$$F_{ML}=\ln|\hat{\boldsymbol{\Sigma}}|-\ln|\mathbf{S}|+\operatorname{tr}(\mathbf{S}\hat{\boldsymbol{\Sigma}}^{-1})-p=\sum_i\left(\ln\nu_i+\frac{1}{\nu_i}-1\right)$$

$$F_{\text{null}}=-\ln|\mathbf{S}|,\qquad \text{NFI}=1-\frac{F_{ML}}{F_{\text{null}}}$$

→ `pls.js:1098–1123`（$\mathbf{S}^{-1/2}$ 於 `1101–1109`、$\mathbf{M}$ 於 `1110`、
$d_G$ 於 `1120`、$F_{\text{null}}$ 於 `1121–1122`、NFI 於 `1123`）

★ $F_{\text{null}}$ 的推導：虛無模型 $\boldsymbol{\Sigma}=\mathbf{I}$ 代入 $F_{ML}$ 得
$0-\ln|\mathbf{S}|+\operatorname{tr}(\mathbf{S})-p$；$\mathbf{S}$ 是相關矩陣故 $\operatorname{tr}(\mathbf{S})=p$，
兩項相消。這是本文件實際驗算過的一步（見第 8 節）。

### 3.4 ★ 三個慣例分歧（必讀）

| # | 分歧點 | 本工具 | 其他 | 影響 |
|---|---|---|---|---|
| 1 | **d_G 的對數底數** | 自然對數 $\ln$（測地距離在正定矩陣流形上的定義） | **cSEM 0.6.1 用 $\log_{10}$**，其原始碼自承不確定該用哪個底 | 數字差 $(\ln 10)^2=5.3019$ **倍**。判準是 bootstrap 分位數（相對比較），**統計結論不受影響** |
| 2 | **SRMR 的分母** | $p(p+1)/2$（含對角線的上三角格數） | 另有慣例用 $p(p-1)/2$（只算非對角） | 本工具的對角線殘差恆為 0（§3.1），分子不含它但分母含它 → 數值**偏小**。cSEM 逐值一致 ⇒ cSEM 同用 $p(p+1)/2$ |
| 3 | **NFI 的虛無模型** | $\boldsymbol{\Sigma}=\mathbf{I}$（指標互不相關） | Bentler & Bonett (1980) 原文是以 $\chi^2$ 定義的，這裡改用 $F_{ML}$ 比值 | 這是 PLS 脈絡的**類比推廣**，不是原文定義。已在此標註 |

→ 慣例 1 已寫入 UI 註記（`zh-TW.js` 的 `pls.result.fitNote`），慣例 2、3 於本次階段 A 首次書面化。

### 3.5 判讀門檻

| 指標 | 門檻 | 程式碼 |
|---|---|---|
| SRMR | < .08 佳（綠）／.08–.10 邊緣（黃）／≥ .10 不佳（紅） | `Result.jsx:117` 起的 `srmrStatus` |
| NFI | ≥ .90 佳／≥ .80 邊緣／< .80 不佳 | `Result.jsx:542` |
| d_ULS、d_G | **無絕對門檻**，僅供模型間比較（越小越好） | — |

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| $\mathbf{S}$ 正定（$d_G$／NFI 需要 $\mathbf{S}^{-1/2}$） | 特徵值全 > 1e−10 | 四指標全部**不計算**＋警告（明指 repeated-indicators 模型屬預期情況） | `pls.js:1856–1865` |
| $\hat{\boldsymbol{\Sigma}}$ 正定 | $\mathbf{M}$ 的特徵值全 > 1e−12 | $d_G$／NFI 回 `null`＋警告（PLSc 一致 loadings > 1 時可能發生） | `pls.js:1112`、`1814–1816` |
| 遞迴結構模型（path tracing 需要拓撲順序） | 建模階段的 Kahn 排序 | **硬擋**（見 `pls-basic.md` §4） | `pls.js:422–451` |
| 多階段模型（調節／高階）不報 fit | `ctx.skipFit` | 最終階段不計算，改由 `stage1` 子報表提供 | `pls.js:1877`；`runPLS` 的 `skipFit: exec.stage1 !== null` |
| $\hat{\boldsymbol{\Sigma}}$ 的分布假設 | **不適用** | 這四個指標沒有抽樣分布檢定；SmartPLS 的做法是 bootstrap 分位數（本工具**未實作**） | 見第 6 節 |

★ **為什麼多階段模型不報 fit**：two-stage 的最終模型以第一階段的構念分數為單指標，
殘差矩陣是「分數層」的，不具標準詮釋。這是刻意的取捨，`stage1` 子報表提供原始指標層的 fit。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Henseler, J., Dijkstra, T. K., Sarstedt, M., Ringle, C. M., Diamantopoulos, A., Straub, D. W., Ketchen, D. J., Hair, J. F., Hult, G. T. M., & Calantone, R. J. (2014). Common beliefs and reality about PLS. *Organizational Research Methods*, 17(2), 182–209. | 3.3 SRMR 在 PLS 的引入 | 【原文未取得】 |
| Dijkstra, T. K., & Henseler, J. (2015). Consistent partial least squares path modeling. *MIS Quarterly*, 39(2), 297–316. | 3.3 $d_{ULS}$、$d_G$ | 【原文未取得】 |
| Bentler, P. M., & Bonett, D. G. (1980). Significance tests and goodness of fit in the analysis of covariance structures. *Psychological Bulletin*, 88(3), 588–606. | 3.3 NFI（本工具為 $F_{ML}$ 比值的類比推廣，見 §3.4 慣例 3） | 【原文未取得】 |
| Hu, L., & Bentler, P. M. (1998). Fit indices in covariance structure modeling: Sensitivity to underparameterized model misspecification. *Psychological Methods*, 3(4), 424–453. | 3.5 SRMR 的 .08 門檻來源 | 【原文未取得】 |

**程序指引**

| 文獻／實作 | 用途 |
|---|---|
| cSEM 0.6.1（R，Henseler 團隊） | 本組基準的第三方對照；同時是 §3.4 慣例 1、2 的比對對象 |
| SmartPLS 4 官方文件 | 飽和／估計模型兩欄的呈現慣例 |

★ 全部未取得原文；第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_fit`（8 欄：SRMR／d_ULS／d_G／NFI × 飽和／估計）

**tier / status**：tier **B** / **verified**

**對照過的第三方**

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| **cSEM 0.6.1**（R，本機） | SRMR（飽和 0.0975623／估計 0.1043736）、d_ULS（0.5235117／0.5991614）、NFI（0.6684221） | 2026-07-13 **逐值一致** |
| **cSEM 0.6.1**：d_G | — | **已知底數差異**（§3.4 慣例 1），差 $(\ln10)^2$ 倍。已於 UI 雙處標註 |
| 本文件的獨立重寫（2026-07-26） | 8 欄全部 | 最大絕對差 **2.2e−15** |
| SmartPLS 4 | — | **沒有對照過**（授權過期）。SmartPLS 未完整公開其 fit 實作細節 |

**已知的慣例差異**：見 §3.4 的三項（d_G 底數、SRMR 分母、NFI 的虛無模型）。

### ★ 尚未驗證的部分

1. **四篇方法出處原文全部未取得**，方程式編號未核對。本組的 verified 來自 cSEM 三項逐值一致。
2. **d_G 的底數究竟哪一個正確，仍未定案。** cSEM 原始碼自承不確定。本工具選 $\ln$（測地距離的
   數學定義），但**沒有文獻依據能證明 Dijkstra & Henseler 原文用的是哪一個**（原文未取得）。
   影響：報表數字與 cSEM 差 5.3 倍；因判準是 bootstrap 分位數，統計結論不受影響。
3. **SRMR 分母的慣例（$p(p+1)/2$ vs $p(p-1)/2$）沒有回到原文核對。** 目前的依據是
   「與 cSEM 逐值一致 ⇒ cSEM 同用 $p(p+1)/2$」——這是**反推**，不是原文核定。
4. **NFI 是 $F_{ML}$ 比值的類比推廣，不是 Bentler & Bonett 的原始定義。** 本工具沒有找到
   「PLS 脈絡下 NFI 應如何定義」的權威來源；cSEM 數值一致說明兩邊做了同一件事，
   但不保證這件事在文獻上站得住。
5. **沒有 bootstrap 分位數判準。** SmartPLS 的建議做法是把 SRMR／d_ULS／d_G 與飽和模型的
   bootstrap 分布比較（HI95／HI99）。本工具**只給點估計**，這是功能缺口。
6. **邊界條件未系統性測試**：$\mathbf{S}$ 接近奇異（非 repeated-indicators 的其他成因）、
   $p$ 很大時 $\mathbf{S}^{-1/2}$ 的數值誤差累積——皆無測試覆蓋。
7. **`jacobiEigen` 的 80 次 sweep 上限**（`pls.js:154`）在極端矩陣上是否足夠收斂，未驗證。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| SRMR（飽和／估計） | 3.3 | `pls.js:1094` |
| d_ULS（飽和／估計） | 3.3 | `pls.js:1095` |
| d_G（飽和／估計） | 3.3 | `pls.js:1120` |
| NFI（飽和／估計） | 3.3 | `pls.js:1123` |
| GoF 列 | 見 `pls-gof.md` | `pls.js:1870–1881` |
| 兩條不可計算警告 | 3.4 / §4 | `pls.js:1856–1865` |
| 表下註記（含 d_G 底數說明） | 3.4 慣例 1 | `zh-TW.js` 的 `pls.result.fitNote` |

**孤兒欄位檢查**：適配表的四列 × 兩欄全部對應 §3.3；GoF 列屬另一份文件。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（含 $F_{\text{null}}$ 的推導驗算與獨立重寫） |
| 2 | authority 是否支持該公式 | **通過**（`pls_fit` 的 authority 正確列出 cSEM ＋ 兩篇文獻，且 d_G 的差異已寫入 `verification`） |
| 3 | 文獻真實性 | 全部未取得原文，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**（兩條正定性檢查都有，且警告文字明指 repeated-indicators 屬預期情況） |
| 6 | 慣例分歧 | **發現 2 項新的**（SRMR 分母、NFI 虛無模型；d_G 底數原已記錄）→ 已寫入 §3.4 |
| 7 | 邊界條件 | **通過**（兩條守衛都有）；3 項未測已列入第 6 節 |
| 8 | APA 敘述句 | **通過**（只報估計模型的 SRMR 並附門檻，未宣稱「整體適配良好」） |

### R1（通過）逐式核對、推導驗算與獨立重寫

- **$F_{ML}$ 的特徵值形式**：驗證 $\ln|\hat\Sigma|-\ln|\mathbf{S}|=\sum\ln\nu_i$ 且
  $\operatorname{tr}(\mathbf{S}\hat\Sigma^{-1})=\operatorname{tr}(\mathbf{M}^{-1})=\sum 1/\nu_i$，
  故 `pls.js:1118` 的 `fMl += lg + 1/v - 1` 與 §3.3 的閉合式一致。
- **$F_{\text{null}}=-\ln|\mathbf{S}|$ 的推導**：見 §3.3 末，程式碼 `pls.js:1121–1122` 相符。
- **獨立重寫**：依第 3 節文字規格以 numpy 重算 $\hat{\boldsymbol{\Sigma}}$、path tracing、
  四個指標（飽和與估計各一組），對 8 欄比對，**最大絕對差 2.2e−15**。

★ 本項驗的是「第 3 節構成充分且正確的規格」；執行者先前讀過 `pls.js`，**非盲重寫**。
由於本組的 fixture 值本身是 numpy 手算，我的重寫屬**同一族公式的第二次編碼**——
它抓轉寫錯誤，抓不到「四篇原文的公式讀錯」。真正的第三方防線是 cSEM 的三項逐值一致。

### R8（文件層，已於本次補上）兩個慣例分歧從未書面化

d_G 的底數差異早已寫進 UI 註記與 provenance，但 **SRMR 的分母慣例**與 **NFI 的虛無模型定義**
在本次階段 A 之前**沒有任何地方記載**。兩者都是「換一個慣例數字就會變」的選擇：

- SRMR 若改用 $p(p-1)/2$ 作分母（$p=10$，乘 $\sqrt{(p+1)/(p-1)}=1.1055$），本資料的飽和值會由 **0.097562 → 0.107859**、估計值由 **0.104374 → 0.115389**——飽和值**跨過 .10 的紅燈門檻**（實算，非估計）。
- NFI 的虛無模型若改採其他定義，數值與判讀都會變。

**處置**：兩者已寫入本文件 §3.4 與第 6 節第 3、4 點（含「反推而非原文核定」的誠實標註）。
屬**文件層 L1**，依 §6.4 當場補，不需裁決。

### 待辦編號

本組開出 **R8（L1，已補）**。第 6 節另列 3 項功能缺口與 3 項未測邊界，建議列入階段 B 候選。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
