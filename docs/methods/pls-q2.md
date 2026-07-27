# Blindfolding Q²（構念層 cross-validated redundancy）

> 方法代號 `pls_q2`｜基準組 `reference.json → pls_q2`（3 欄）｜溯源 tier **B** / verified
> ★ **legacy 指標**：SmartPLS 4 已移除此演算法，現行建議改用 PLSpredict／CVPAT
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

$R^2$ 告訴你「模型在**這批資料上**解釋了多少變異」。但它是在同一批資料上又估計又評分，
所以必然樂觀。Q² 想回答的是：**模型有沒有真的預測能力**。

做法叫 blindfolding：**刻意把資料挖掉一部分，用剩下的資料重估模型，再回頭預測被挖掉的值**。
如果預測得比「直接猜平均值」還好，Q² > 0，表示模型有預測相關性。

「cross-validated **redundancy**」的意思是：預測路徑走「前置構念分數 → 路徑係數 → 內生構念分數
→ 外部負荷量 → 指標值」，也就是**經由結構模型**去預測。
（另一種 cross-validated **communality** 只用同構念的其他指標，不經結構模型——本工具不實作。）

## 2. 什麼時候該用、什麼時候不該用

★ **先講立場**：這是 **legacy 指標**。

- SmartPLS 4 官方文件明載已**移除** blindfolding
- seminr 明確**拒絕實作**（GitHub issue #156，引 Shmueli et al. 2016 Appendix C 的方法論批評）
- matrixpls／semPLS 已自 CRAN 下架（2022 歸檔）

⇒ **在世的第三方實作已經不存在。**

**還是該用的情形**

- 與既有文獻對照（2010–2020 年間的 PLS 論文幾乎都報 Q²）
- 審稿人或口試委員按舊慣例要求

**不該用**

- 作為預測能力的**主要**證據：改用 PLSpredict（樣本外 k-fold）與 CVPAT，兩者本工具皆已內建
- 與 pairwise deletion 併用：本工具**直接擋**（理由見 §4）
- 含調節／高階構念的模型：本工具**直接擋**（W4 範圍限制）

**常見誤用**：把 Q² 當成「樣本外預測」。它不是——blindfolding 挖的洞在**同一份樣本內**，
而且每一輪都用全部資料（含未挖掉的部分）重估模型。它是**內部交叉驗證**，不是樣本外預測。
這正是 Shmueli 等人批評的核心，也是 PLSpredict 被提出來取代它的原因。

## 3. 公式與定義

### 3.1 挖洞的規則

設 omission distance 為 $D$（預設 7），構念 $j$ 的區塊有 $k$ 個指標。
對第 $d$ 輪（$d=0,\dots,D-1$），略去的資料點集合為

$$\Omega_d=\left\{(i,h)\ :\ (i\cdot k+h)\bmod D=d\right\}$$

其中 $i$ 為列索引（0 起）、$h$ 為區塊內欄索引（0 起）。

→ `src/lib/stats/pls.js:2305–2310`

★ 這是把「列 × 區塊內欄」攤平成一條序列後每隔 $D$ 個挖一個，所以每個資料點恰好被挖**一次**，
$D$ 輪合起來覆蓋整個區塊。**挖洞的樣式依區塊寬度 $k$ 而變**——這也意味著
每個內生構念都要跑自己的 $D$ 輪重估。

### 3.2 補值與重估

被挖掉的點以該指標**其餘資料的平均**取代（在**原始量尺**上）：

$$\tilde x_{ih}=\operatorname{mean}\left\{x_{i'h}\ :\ (i',h)\notin\Omega_d\right\}$$

→ `pls.js:2312–2324`（逐欄算平均 `2295–2303`、寫入 `2304–2305`）

然後**整個模型重新估計**，包含**重新標準化**（`pls.js:2344`）。
注意重新標準化用的是**補值後**的資料，所以每一輪的 $\mu_h$、$\sigma_h$ 都不同。

### 3.3 預測與 SSE／SSO

對每個被挖掉的點 $(i,h)$：

$$\hat y_{ij}=\sum_{q}\beta_{jq}\,y_{i,P_q}\quad(\text{結構預測}),\qquad \hat z_{ih}=\lambda_{jh}\cdot\hat y_{ij}$$

$$z^{\text{true}}_{ih}=\frac{x_{ih}-\mu_h}{\sigma_h},\qquad z^{\text{trivial}}_{ih}=\frac{\tilde x_{ih}-\mu_h}{\sigma_h}$$

$$\text{SSE}_j=\sum_{d}\sum_{(i,h)\in\Omega_d}\left(z^{\text{true}}-\hat z\right)^2,\qquad \text{SSO}_j=\sum_{d}\sum_{(i,h)\in\Omega_d}\left(z^{\text{true}}-z^{\text{trivial}}\right)^2$$

$$Q^2_j=1-\frac{\text{SSE}_j}{\text{SSO}_j}$$

→ `pls.js:2337–2349`（$\hat y$ `2321–2322`、$z^{\text{true}}$ `2324`、$\hat z$ `2325`、
$z^{\text{trivial}}$ `2326`、累加 `2327–2328`）、`2331–2337`（$Q^2$ 於 `2335`）

★ 三個要點：

1. **$\mu_h$、$\sigma_h$ 來自該輪補值後的資料**，$x_{ih}$ 則是**原始真值**——這是刻意的：
   評分要用真值，但尺度必須與模型估計時一致。
2. **trivial 預測是「該指標其餘資料的平均」**（即補進去的那個值），不是全樣本平均。
3. **只有內生構念有 Q²**（外生構念沒有結構預測可用）→ `pls.js:2296`。

### 3.4 判讀

| $Q^2$ | 判讀 |
|---|---|
| > 0 | 具預測相關性（底線要求） |
| ≤ 0 | 模型的預測不如直接猜平均值 |

本工具**不提供** Q² 的效果量分級（部分文獻用 .02/.15/.35），因為該分級的來源與適用性
在 blindfolding 被棄用後未再被檢驗。

$\text{SSO}\le10^{-12}$ 時 $Q^2$ 回 `null`（`pls.js:2354`）。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| **不與 pairwise deletion 併用** | 檢查 `options.missing` | **硬擋** `blindfold-pairwise-conflict`，訊息說明「無法區分被挖掉的格子與原本就缺的格子」 | `pls.js:2255–2260` |
| 不含調節／高階構念 | 檢查 model | **硬擋** `q2-not-supported` | `pls.js:2261–2267` |
| $D\ge2$ 且為整數 | 型別檢查 | **硬擋** `bad-omission-distance` | `pls.js:2269–2271` |
| **$n$ 不是 $D$ 的整數倍** | $n\bmod D=0$ 時警告 | 警告（不擋），引 SmartPLS 慣例建議改用其他 $D$ | `pls.js:2281–2283` |
| 完整資料可收斂 | 先跑基準估計 | `blindfold-failed`，訊息說明「完整資料的 PLS 估計即未收斂」 | `pls.js:2290–2293` |
| 每一輪補值後仍可估計 | 逐輪檢查零變異與收斂 | `blindfold-failed`，**指名構念與輪次** | `pls.js:2345–2332` |
| PLSc 不適用 | 強制 `consistent: false` | 一律以 composite 估計計算 | `pls.js:2272` |

★ 第四列是 Hair 等人明確的程序要求（$n/D$ 不得為整數），本工具的示範資料 $n=60$、$D=7$ ✓。

★ 最後一列的理由：Q² 是預測導向指標，用 PLSc 校正後的「真值」去算預測誤差沒有意義。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Stone, M. (1974). Cross-validatory choice and assessment of statistical predictions. *Journal of the Royal Statistical Society: Series B*, 36(2), 111–147. | 交叉驗證的原始構想 | 【原文未取得】 |
| Geisser, S. (1974). A predictive approach to the random effect model. *Biometrika*, 61(1), 101–107. | 同上 | 【原文未取得】 |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2017). *A Primer on PLS-SEM* 第 6 章 | §3 的 cross-validated redundancy 定義、$n/D$ 不得為整數 |
| SmartPLS Blindfolding 官方文件 | §3.1 挖洞規則、§3.2 補值與重估的四要點；同時是「已移除」立場的來源 |
| Shmueli, G., Ray, S., Velasquez Estrada, J. M., & Chatterjee, S. B. (2016). The elephant in the room: Predictive performance of PLS models. *Journal of Business Research*, 69(10), 4552–4564（Appendix C） | §2 的方法論批評；seminr 拒做的依據 | 

★ 全部未取得原文；第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_q2`（3 欄：M4 的三個內生構念 F2、C、Y）

**tier / status**：tier **B** / **verified**

### ★ 本組的溯源是「程序文獻路線」，這一點必須講清楚

**在世的第三方實作不存在**（§2）。所以本組**不可能**有 tier A 的數值對照。
它的 verified 建立在：

| 道 | 內容 |
|---|---|
| 1 | **對照 SmartPLS Blindfolding 官方文件的程序四要點逐項一致**：(a) 輪數 = $D$；(b) 第 $d$ 輪自第 $d$ 個資料點起每隔 $D$ 挖一個（逐 LV 指標矩陣序列計數）；(c) 略去點按缺失值處理、以欄平均補值後全模型重估；(d) $n/D$ 不得為整數的合規約束（$n=60$、$D=7$ ✓） |
| 2 | cross-validated redundancy 的定義符合 Hair et al. (2017) 第 6 章 |
| 3 | JS 與獨立 numpy 引擎逐值互驗（`compare.test.js`） |
| 4 | 本文件的獨立重寫（2026-07-26）：依第 3 節文字規格重寫整條 blindfolding（含逐輪補值、重新標準化、全模型重估、SSE／SSO 累加），對 3 欄比對，**最大絕對差 1.1e−16** |

★ 第 1 道是「程序文獻」能達到的最強驗證；第 3、4 道都只鎖住實作間一致。
**沒有任何一道能抓到「對 Hair 第 6 章的定義理解有誤」**——這需要原文，而原文未取得。

**原工單的一處誤判已修正**：早期工單把本組列在「有第三方可對」的批次，
依據是 seminr 有 `blindfold()`。實查**該函式不存在**，seminr 明確拒做。已改走程序文獻路線結案。

**已知的慣例差異**

1. **cross-validated redundancy vs communality**：本工具只做 redundancy（經結構模型）。
   SmartPLS 舊版同時提供兩者。
2. **補值用「其餘資料的平均」**：符合官方文件。另有實作用全樣本平均（含被挖掉的點）——
   後者會讓 trivial 預測「偷看」到答案。
3. **重新標準化**：本工具每輪以補值後資料重新標準化。未查其他實作是否沿用原始尺度。

### ★ 尚未驗證的部分

1. **兩篇方法出處與 Hair 第 6 章原文皆未取得。** 本組的 verified 完全建立在**官方程序文件**，
   這是 §0 規範下「找不到第三方 → 回到文獻」路線的產物，**強度低於 tier A**。
2. **§6「慣例差異」第 3 項（重新標準化）未查核**：沒有任何來源說明該用補值後或原始尺度。
   兩者在缺失比例低時差異極小，但**沒有量化**。
3. **Q² 的效果量分級（.02/.15/.35）刻意不提供**，但也**沒有查證該分級的原始出處**。
4. **$D$ 的選擇沒有敏感度分析**：預設 7 是慣例，改成 5 或 10 對 Q² 的影響未量化，無測試。
5. **邊界條件部分未測**：`SSO ≤ 1e-12`（$Q^2$ 回 `null`）這條路徑**無測試覆蓋**；
   逐輪補值後出現零變異指標的錯誤路徑也**無測試**。
6. **計算成本未文件化**：Q² 需要「內生構念數 × $D$」次全模型重估（M4 為 3×7 = 21 次），
   大模型上可能明顯延遲，UI 無進度提示。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 構念的 Q² | 3.3 | `pls.js:2354` |
| SSE | 3.3 | `pls.js:2346` |
| SSO | 3.3 | `pls.js:2347` |
| omission distance | 3.1 | `pls.js:2357`（回傳）、`2250` |
| $n\bmod D=0$ 警告 | §4 第四列 | `pls.js:2281–2283` |
| legacy 註記 | §2 | `zh-TW.js` 的 `pls.result.q2LegacyNote` |

**孤兒欄位檢查**：Q² 表的三欄（構念、Q²、SSE／SSO）全部對應 §3.3。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 1.1e−16） |
| 2 | authority 是否支持該公式 | **通過**——`provenance.json` 的 authority 誠實寫明「無在世第三方實作」並逐一列出三個已失效的候選（SmartPLS 已移除、seminr 拒做、matrixpls／semPLS 已下架），是全專案 authority 寫得最坦白的一組 |
| 3 | 文獻真實性 | 全部未取得原文，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**——七道守衛齊全，其中兩道（pairwise 互斥、W4 互斥）是硬擋且訊息說明了**為什麼** |
| 6 | 慣例分歧 | **發現 1 項未查核**（重新標準化的尺度，第 6 節第 2 點） |
| 7 | 邊界條件 | **發現 2 條路徑無測試**（第 6 節第 5 點） |
| 8 | APA 敘述句 | **通過**——Q² **不進** APA 敘述句（本工具的 APA 句子只涵蓋 PLSpredict／CVPAT；legacy 指標刻意不入句） |

### R1（通過）獨立重寫

依第 3 節文字規格以 numpy 重寫整條 blindfolding：三個內生構念各跑 7 輪，
每輪按 $(i\cdot k+h)\bmod D$ 挖洞、以其餘資料欄平均補值、重新標準化、全模型重估、
以結構預測 × loading 還原略去點，累加 SSE／SSO。對 3 欄比對，**最大絕對差 1.1e−16**。

★ 這是 A1 批次中**重寫成本最高**的一項（要重現整條迴圈與每輪的尺度），
也因此最能證明第 3 節的文字構成了充分的規格——尤其 §3.3 那三個要點
（$\mu_h$ 來自補值後資料、$x_{ih}$ 用真值、trivial 預測是補進去的那個值），
任何一個寫錯都不可能對到 1e−16。

### 本組沒有新開待辦

本組的 legacy 定位與「無第三方」的溯源限制早已完整記錄在 `provenance.json` 與 UI 註記，
階段 A 確認該登記準確。新增的是第 6 節的六項「尚未驗證」，其中第 2、5、6 點
（重新標準化慣例、兩條未測路徑、計算成本）**先前未記錄於任何地方**。

由於本指標已 legacy、且官方與社群皆改推 PLSpredict，**不建議**為這些項目投入補測成本；
據實記錄即為適當處置。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
