# pairwise deletion 與加權 PLS（WPLS）

> 方法代號 `pls_pairwise_wpls`｜基準組 `reference.json → pls_pairwise_wpls`（59 欄）｜溯源 tier **B** / verified
> 相關：`pls_plsc_pw`（PLSc × 本節兩模式，見 `pls-plsc.md`）
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

這一份文件涵蓋兩個看起來無關、實際上共用同一條程式路徑的功能：

| 功能 | 要解決的問題 |
|---|---|
| **pairwise deletion** | 問卷有零星缺失時，`casewise`（整列剔除）會損失太多樣本。有沒有辦法只在「真的缺」的地方讓步？ |
| **WPLS（加權 PLS）** | 樣本的組成與母體不符（事後分層、不等機率抽樣）時，能不能用抽樣權重把母體結構還原回來？ |

**它們為什麼是同一份文件**：本引擎的 Lohmöller 迭代**完全由指標相關矩陣 $\mathbf{R}$ 驅動**
（見 `pls-basic.md` §3.3）。所以這兩個功能的實作差別**只在「$\mathbf{R}$ 怎麼算」**——
迭代、loadings、構念相關、信效度、HTMT、model fit 之後走的是同一條路。

這個設計是本工具的一個關鍵決定，也是本文件第 3 節的主軸。

## 2. 什麼時候該用、什麼時候不該用

### pairwise deletion

**該用**：缺失比例低（個位數到十幾個百分點）、缺失機制接近 MCAR、樣本量吃緊。

**不該用**

- 缺失比例高：各格來自不同子樣本，相關矩陣可能**非正定**（工具會警告）
- 缺失非隨機（MNAR）：pairwise 不會修正偏誤，只會讓偏誤藏得更深
- 要跑 blindfolding Q²：本工具**直接擋**（無法區分「被挖掉的格子」與「原本就缺的格子」）
- **有更好的選擇時**：多重插補（multiple imputation）在統計上優於 pairwise。
  本工具**不提供** MI——這是功能缺口，缺失比例高時應在其他軟體先做 MI

### WPLS

**該用**：有正式抽樣設計的調查資料，且權重來自抽樣設計或事後分層。

**不該用**

- 拿權重來「修正」樣本偏誤但說不出權重的來源
- 需要加權推論：本工具的 **bootstrap 仍以未加權方式重抽**（見 §3.5）

**常見誤用（三條）**

1. **以為 pairwise「保留了更多樣本」所以更好。** 它保留的是**配對**，不是列；
   代價是相關矩陣的各格建立在不同子樣本上，彼此可能不相容。
2. **在 pairwise 下解讀構念分數。** 分數是用**均值補值**後的標準化值加權算的（§3.4），
   只供 IPMA／預測／分段等下游使用，**不是**統計量的來源。
3. **以為 WPLS 的權重會影響推論。** 不會——只影響相關矩陣（§3.5）。

## 3. 公式與定義

### 3.1 pairwise-complete 相關矩陣

$$R_{ab}=\frac{\sum_{i\in O_{ab}}(x_{ia}-\bar x_a^{(ab)})(x_{ib}-\bar x_b^{(ab)})}{\sqrt{\sum_{i\in O_{ab}}(x_{ia}-\bar x_a^{(ab)})^2\cdot\sum_{i\in O_{ab}}(x_{ib}-\bar x_b^{(ab)})^2}}$$

其中 $O_{ab}=\{i: x_{ia}\text{ 與 }x_{ib}\text{ 皆可觀察}\}$，$\bar x_a^{(ab)}$ 為**只用 $O_{ab}$ 算的**平均。
對角線為 1。

→ `src/lib/stats/pls.js:539–570`（配對計數 `547–553`、配對內平均 `555`、相關 `556–566`）

★ 兩個要點：

1. **平均是配對特有的**（不是各欄的整體平均）。這是 pairwise-complete 的定義，
   也是它與「先各欄均值補值再算相關」的關鍵差別。
2. $|O_{ab}|<3$ 或該配對上任一欄零變異 → 該格為 `NaN`（`pls.js:554`），呼叫端據以報錯。

### 3.2 加權相關矩陣（WPLS）

$$\mu_j=\frac{\sum_i w_i x_{ij}}{\sum_i w_i},\qquad \operatorname{cov}_{ab}=\frac{\sum_i w_i(x_{ia}-\mu_a)(x_{ib}-\mu_b)}{\sum_i w_i}$$

$$R_{ab}=\frac{\operatorname{cov}_{ab}}{\sqrt{\operatorname{cov}_{aa}\cdot\operatorname{cov}_{bb}}}$$

→ `pls.js:578–608`（$\sum w$ `581–582`、$\mu$ `583–588`、共變異 `589–598`、相關 `600–606`）

★ **分母是 $\sum w_i$（不是 $\sum w_i-1$）**——這是「可靠度權重」慣例。
因為相關是尺度不變量，**ddof 取 0 或 1 得到同一個相關矩陣**（實測差 < 1e−15），
所以這裡不存在 ddof 慣例分歧的風險。**權重同乘一個常數不改變結果**（有行為測試鎖住）。

零變異欄（$\operatorname{cov}_{jj}\le0$）→ 回傳 `zeroVarIndex`（`pls.js:599`）。

### 3.3 為什麼只換 $\mathbf{R}$ 就夠

`pls-basic.md` §3.3 的三條恆等式只用到 $\mathbf{R}$：

$$\operatorname{Var}(y_j)=\mathbf{w}_j'\mathbf{R}_{jj}\mathbf{w}_j,\quad \operatorname{corr}(y_j,y_k)=\mathbf{w}_j'\mathbf{R}_{jk}\mathbf{w}_k,\quad \operatorname{corr}(z_h,y_k)=\textstyle\sum_{g}w_{kg}R_{hg}$$

所以整條迭代（Mode A／B、三種 scheme）、loadings、構念相關、信效度、HTMT、
外部 VIF、model fit **全部只需要換掉 $\mathbf{R}$**。

→ `pls.js:1436–1442`（pairwise 掛入）、`1450–1456`（WPLS 掛入）、`810`（迭代取用）、
`1197`（loadings／構念相關取用）、`1737–1740`（信效度／HTMT／外部 VIF／fit 取用）、
`985`（★ PLSc 取用——2026-07-26 修正，見 `pls-plsc.md` §8 R6）

### 3.4 構念分數的處理（刻意的例外）

分數必須逐列算出來，不能只由 $\mathbf{R}$ 導出。兩種模式的做法：

| 模式 | 標準化怎麼做 | 位置 |
|---|---|---|
| pairwise | 平均／標準差**只用該欄的可觀察值**；`NaN` 標準化後填 **0**（＝原尺度的均值補值） | `pls.js:1259–1301` 的 `pairwise` 分支 |
| WPLS | 加權平均／加權標準差 | 同上的 `rowWeights` 分支 |

★ **後果**：$\mathbf{R}$ 與樣本共變異不一致，所以**分數的 sd 未必恰為 1**。
這是刻意的——分數只供 IPMA／預測／分段等下游使用，統計量一律走 $\mathbf{R}$。
UI 警告已明寫此事（`pls.js:1442`）。

### 3.5 WPLS 的推論限制

抽樣權重**只影響 $\mathbf{R}$**。bootstrap 仍以**未加權**方式放回抽樣。
UI 警告明寫：「加權重抽的設計未在 SmartPLS 文件化，本工具不擅自實作」。

→ `pls.js:2210`

### 3.6 pairwise 的非正定警告

pairwise 相關矩陣的各格來自不同子樣本，**可能非半正定**。
工具對 $\mathbf{R}$ 做 Jacobi 特徵分解，最小特徵值 $<-10^{-8}$ 時警告：

> pairwise 相關矩陣非半正定（最小特徵值 …）——不同的相關係數來自不同的子樣本，彼此可能不相容。
> 信效度與 model fit 指標在此情形下可能落在合理範圍外，請謹慎解讀；缺失比例高時建議改用 casewise 或先做多重插補

→ `pls.js:1439–1441`

本資料集（MCAR 遮罩約 11.4%）實測最小特徵值為**正**（`pls_pairwise_wpls.pw_minEig`），
所以**這條警告路徑在基準組上沒有被觸發**。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 每個配對至少 3 筆共同可觀察 | `pairwiseCorrMatrix` 回 `NaN` | **硬擋** `pairwise-too-sparse`，**指名兩個指標** | `pls.js:554`、`1434–1442` |
| pairwise $\mathbf{R}$ 半正定 | 最小特徵值檢查 | 警告（不擋） | `pls.js:1439–1441` |
| 不與 blindfolding 併用 | `blindfoldPLS` 入口檢查 | **硬擋** `blindfold-pairwise-conflict` | `pls.js:2255–2260` |
| 權重為有效非負數 | 逐列檢查 | **硬擋** `wpls-bad-weights`，**指名列號** | `pls.js:2165–2178` |
| 權重總和 > 0 | 檢查 | **硬擋** | `pls.js:2182` |
| 加權後無零變異欄 | `weightedCorrMatrix` 回 `zeroVarIndex` | **硬擋** `zero-variance`，指名指標 | `pls.js:599`、`1452–1454` |
| 缺失機制為 MCAR | **不檢核** | 無警告（見第 6 節） | — |
| 權重的來源合理 | **不檢核** | 無警告 | — |

★ 權重為 0 的列會被計數並在警告中告知「$k$ 筆權重為 0 的資料列實質不參與估計」（`pls.js:2210`）。

## 5. 參考文獻

**方法出處**

| 文獻／來源 | 對應段落 | 取得狀態 |
|---|---|---|
| `docs/handoff-roadmap-v1.md` §6.6（WPLS）與 §6.7（pairwise） | 3.3 相關矩陣驅動設計的推導與不變量 | 本專案內部設計文件，**可查** |
| SmartPLS 4 官方文件（Weighted PLS） | 3.2 加權相關的慣例對齊 | 【未取得完整技術細節】——SmartPLS 未文件化加權 bootstrap，故 §3.5 的限制 |
| Little, R. J. A., & Rubin, D. B. (2019). *Statistical Analysis with Missing Data* (3rd ed.). Wiley. | §2 pairwise 的統計性質與 MI 的優越性 | 【原文未取得】 |

★ **本組的特殊之處**：pairwise-complete 相關與加權相關都是**封閉式**、沒有慣例爭議的量，
所以溯源不必回到 PLS 文獻，而是直接對通用統計套件（見第 6 節）。
相關矩陣驅動的 Lohmöller 迭代則由本專案的設計文件定義，並錨定到 `pls_basic`。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_pairwise_wpls`（59 欄）

| 前綴 | 內容 |
|---|---|
| `pw_` | pairwise：loadings、weights、path、構念相關、$R^2$、AVE、rho_c（20 欄）＋ `pw_minPairs`、`pw_minEig` |
| `w_` | WPLS：同上（20 欄） |
| `full_` | **自我一致性**：完整資料 ＋ 全 1 權重走同一條相關矩陣路徑（19 欄） |

**tier / status**：tier **B** / **verified**

### ★ 本組是 A1 批次中溯源最強的一組（tier B 裡的最好情況）

| 道 | 內容 | 差異 |
|---|---|---|
| 1 | pairwise-complete 相關 vs **`pandas.DataFrame.corr()`**（預設即 pairwise-complete） | **3.886e−16** |
| 2 | 加權相關 vs **`statsmodels DescrStatsW(ddof=0).corrcoef`** | **4.441e−16** |
| 3 | 加權相關 vs **`numpy.cov(aweights, ddof=0)`** | **2.220e−16** |
| 4 | **`full_*` 自我一致性**：完整資料＋全 1 權重必須重現 `pls_basic` 的 `path_F1_F2 = 0.3603108815`（容差 1e−6，實測差約 1.3e−8） | 把整條相關矩陣驅動的迭代**錨定到已對 seminr 的基準上** |
| 5 | 行為測試：權重同乘常數不改變結果、權重 0 的列實質不參與、pairwise 與 blindfolding 互斥報錯、配對 < 3 筆報錯 | — |
| 6 | JS↔numpy 59 欄逐值（`compare.test.js`） | — |
| 7 | 本文件的獨立重寫（2026-07-26）：重寫 pairwise 與加權相關矩陣＋整條迭代＋信效度，對 40 欄比對 | **3.331e−16** |

★ **第 1–3 道已於 Session Q3 升為重生時 assert（容差 1e−12）**——不再是一次性抽驗。
任何人改動這段手算碼，重生基準就會紅燈。

★ **第 4 道是本組最有價值的設計**：它讓「相關矩陣驅動」這條新路徑不必自己證明正確性，
而是**必須重現舊路徑（已對 seminr）的結果**。這種「新舊路徑自我一致性」的錨定手法
值得在後續批次複用。

**已知的慣例差異**

1. **加權共變異的 ddof**：本工具用 $\sum w$（ddof=0）。因相關為尺度不變量，
   **ddof 取 0 或 1 得同一相關矩陣**（實測差 < 1e−15）⇒ **此處不存在慣例分歧風險**。
2. **pairwise 的平均**：配對特有（§3.1）。若改用各欄整體平均，結果不同——那已不是 pairwise-complete。
3. **構念分數的尺度**：pairwise／WPLS 下 sd 未必為 1（§3.4）。

### ★ 尚未驗證的部分

1. **缺失機制不檢核。** MCAR 是 pairwise 有效性的前提，工具**不做任何檢定**（例如 Little's MCAR test），
   也不警告。使用者可能在 MNAR 資料上使用 pairwise 而不自知。**這是最實質的缺口。**
2. **不提供多重插補（MI）。** §2 已說明 MI 在統計上優於 pairwise，但工具沒有，
   只能建議使用者在其他軟體先做。**功能缺口**。
3. **非正定警告路徑未被基準覆蓋**（§3.6）：本資料集的最小特徵值為正，
   所以那條警告**從未在基準或測試中被觸發**。缺失比例更高時的行為未驗證。
4. **pairwise 下信效度與 model fit 的統計性質未知**（見 `pls-reliability-validity.md` §6 第 5 點）。
   工具會警告矩陣非半正定，但**不會**警告「信度指標在此的解讀有限」。
5. **WPLS 的加權推論未實作**（§3.5）。這不只是「未文件化所以不做」——
   意思是**加權估計搭配未加權推論，兩者的統計相容性沒有依據**。已在 UI 警告，但無文獻支持任一做法。
6. **`pw_minPairs` 與 `pw_minEig` 兩欄是「輸入回填」**：adapters 直接從 fixture 讀回，
   **不是由 JS 引擎算出來再比對**（`adapters.mjs` 的 `pls_pairwise_wpls`）。
   ⇒ 這兩欄**實質上沒有被 JS↔numpy 比對覆蓋**。這是本次紅隊新發現的登記落差，見 R11。
7. **權重為極端值（例如一筆權重佔 90%）的行為未測**。

## 7. 報表欄位對照

| UI 欄位／行為 | 對應公式 | 程式碼 |
|---|---|---|
| 所有測量與結構統計量（在兩種模式下） | 3.3（換 $\mathbf{R}$，其餘不變） | 見 `pls-basic.md` §7 |
| 構念分數 | 3.4 | `pls.js:1259–1301` |
| pairwise 說明警告（含最少配對數） | 3.1 / 3.4 | `pls.js:1442` |
| pairwise 非正定警告（含最小特徵值） | 3.6 | `pls.js:1439–1441` |
| WPLS 警告（含權重 0 的列數與推論限制） | 3.5 | `pls.js:2210` |
| 缺失值處理選項（casewise／pairwise／mean） | §4 | `pls.js:508–530` |
| 抽樣權重欄位選擇 | 3.2 | `pls.js:2155–2184`（`resolveRowWeights`） |
| 設定說明文字 | §2、§3.5 | `zh-TW.js` 的 `pls.config.wplsHint` |

**孤兒欄位檢查**：兩種模式不新增報表欄位（只改變既有欄位的計算基礎），故無孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 40 欄，3.3e−16） |
| 2 | authority 是否支持該公式 | **通過**——authority 正確列出三個第三方實作並註明「相關為尺度不變量，無 ddof 慣例風險」 |
| 3 | 文獻真實性 | **通過**（本組主要依據是可執行的第三方與本專案設計文件，不依賴未取得的原文） |
| 4 | 報表可追溯 | **發現 1 項**（R11：兩欄未被比對覆蓋） |
| 5 | 假設前提 | **發現 1 項實質缺口**（MCAR 不檢核，第 6 節第 1 點） |
| 6 | 慣例分歧 | **通過**（三項全部書面化，其中 ddof 一項已論證無風險） |
| 7 | 邊界條件 | **發現 2 項未測**（非正定路徑、極端權重） |
| 8 | APA 敘述句 | ★ **發現 1 項並已修**（見 R12） |

### R1（通過）獨立重寫

依第 3 節文字規格以 numpy 重寫 pairwise-complete 相關、加權相關、整條相關矩陣驅動的迭代、
以及信效度（AVE／rho_c），對 40 個 `pw_`／`w_` 欄位比對，**最大絕對差 3.331e−16**。

### R11（L1，已記錄）`pw_minPairs` 與 `pw_minEig` 未被比對覆蓋

`adapters.mjs` 的 `pls_pairwise_wpls` 對這兩欄的處理是**直接從 fixture 讀回**
（`out.pw_minPairs = REF.pls_pairwise_wpls.values.pw_minPairs`），
所以 `compare.test.js` 比的是「fixture 值 vs fixture 值」，**恆等成立**。

這不是錯誤（JS 引擎並未把這兩個診斷量放進回傳物件，無從比對），但**基準組的欄位數會給人
「59 欄都被比對過」的錯覺**——實際上是 57 欄。

**處置**：本次僅書面記錄（第 6 節第 6 點）。若要真正覆蓋，需讓引擎回傳 `minPairs`／`minEig`
作為診斷欄位——那是功能變更，不屬階段 A 範圍。分級 **L1（文件層）**。

### R12（L2，已修）APA 敘述句未揭露缺失值處理與加權

APA 敘述句（`zh-TW.js` 的 `pls.apa.intro`）寫出 weighting scheme、$N$、PLSc、bootstrap 次數與 CI 類型，
但**沒有寫缺失值處理方式**，也**沒有寫是否使用抽樣權重**。

這在方法論揭露上是實質缺漏：

- $N$ 在 pairwise 下是「未剔除任何列」的列數，讀者會以為沒有缺失值
- casewise 剔除了多少列**不在句子裡**（引擎有 `nDropped`，警告區有，但敘述句沒有）
- WPLS 的加權估計會改變所有係數，卻不在方法陳述中出現

**處置（Kevin 2026-07-26 核定：缺失處理與抽樣權重都補，已執行）**

`intro` 與 `introNoBoot` 各加兩個插槽 `{data}`／`{weighted}`，由 `apaNarrative.js` 依
`meta.missing`、`meta.nDropped`、`meta.weighted` 組出條件片語。四種情境的實跑結果：

| 情境 | 中文句子（首句節錄） |
|---|---|
| 完整資料 | …檢驗研究模型（N = 60），並以 bootstrap 重抽 200 次… |
| casewise 有剔除 | …（N = 29；listwise deletion 剔除 31 筆含缺失值之樣本，原始樣本 60 筆）… |
| pairwise | …（N = 60；缺失值採 pairwise deletion，相關矩陣的每一格僅使用該配對同時可觀察之樣本）… |
| WPLS | …（N = 60），且以抽樣權重加權估計（統計推論仍以未加權重抽建立），並以 bootstrap… |

★ WPLS 的片語**刻意把「推論仍以未加權重抽建立」寫進句子**——這是 §3.5 的實質限制，
使用者複製敘述句投稿時必須一併揭露。

**引擎配合的一處改動**：`meta` 新增 `weighted` 布林欄位（`pls.js:1888`），
由 `runPLS` 依 `plan.rowWeights` 帶入。原本 `meta` 沒有任何欄位能判斷是否加權。
另補 6 條敘述句行為測試（`tests/pls.narrative.test.js`），含「同時有剔除與加權時不留未填模板」。

★ **未採用的一項**：原建議 pairwise 時寫出「最少配對數 $m$」。實作時發現 `minPairs` 只存在於
警告字串裡、不在 `meta`，要放進句子得先讓引擎回傳該診斷量（功能變更）。
本次改為描述 pairwise 的**做法**而不給數字；最少配對數仍在警告區可見。

### 待辦編號

本組開出 **R11（L1，已記錄）** 與 **R12（L2，已修）**。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
