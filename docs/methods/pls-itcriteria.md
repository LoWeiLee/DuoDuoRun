# 模型選擇準則 IT criteria（AIC／AICc／BIC／HQ）

> 方法代號 `pls_itcriteria`｜基準組 `reference.json → pls_itcriteria`（12 欄＝3 個內生構念 × 4 個準則）｜溯源 tier **B** / verified
> 最後更新：2026-07-29（階段 A / A3a）

---

## 1. 這個方法在回答什麼問題

$R^2$ 只會隨著前置變數增加而上升，所以「哪個模型解釋力比較好」不能只看 $R^2$——
多塞幾個構念進去一定變好看。

資訊準則（information-theoretic criteria）回答的是：
**在解釋力與簡約之間取捨後，哪一個前置組合比較好？**

四個準則都是同一個形狀：

$$\text{準則}=\underbrace{n\ln\frac{\text{SSE}}{n}}_{\text{配適不佳的代價}}+\underbrace{\text{懲罰}\times(k+1)}_{\text{參數多的代價}}$$

差別只在懲罰項的重量。**數值越小越好。**

★ **它只回答「兩個競爭模型哪個好」，不回答「這個模型好不好」。**
單一模型的 AIC 是 −4.98 還是 +1.44，本身沒有任何意義。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 手上有**兩個以上的競爭模型**，被解釋的構念是**同一個**，前置組合不同
- 想在「理論上都說得通的替代解釋」之間做取捨——這正是 Sharma et al. (2019) 提出把
  IT 準則引入 PLS 的動機（標題就叫 *The Role of Alternative Explanations*）

**不該用**

- **跨構念比較**：表中每一列的依變數不同，AIC 的絕對值沒有共同尺度
- **跨資料集比較**：$n$ 與變數尺度都不同
- **當成配適度指標**：它不是 SRMR，沒有「小於某個值算好」的門檻
- **只看一個模型時**：見第 1 節末

**常見誤用**

1. **拿表上最小的那一列說「這個構念最好」**——這是跨構念比較，無效。
   本工具在報表註記中明寫這一條（2026-07-29 起）
2. **AIC 與 BIC 打架時挑順眼的**。兩者的懲罰不同：BIC 對參數多的模型懲罰更重（$\ln n$ vs 2），
   $n>7.4$ 時 BIC 一定比 AIC 更偏好簡約模型。**打架本身就是資訊**——說明資料無法在兩個模型間明確裁決
3. **用它決定要不要加一條路徑，然後回頭宣稱該路徑有理論基礎**。
   模型選擇是探索性程序，選出來的模型需要獨立樣本或理論支持

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $n$ | 有效樣本數 |
| $j$ | 內生構念（有前置構念者） |
| $k$ | 構念 $j$ 的**前置構念數** |
| $R^2_j$ | 構念 $j$ 的決定係數 |
| $\text{SSE}_j$ | 殘差平方和 |

### 3.2 SSE 的定義

構念分數為**單位變異**（`pls-basic.md` §3.3 步驟 4），故總平方和為 $n-1$：

$$\text{SSE}_j=(n-1)(1-R^2_j)$$

→ `src/lib/stats/pls.js:882`

★ 這一步是本方法最需要講清楚的地方。**分母用 $n-1$ 而不是 $n$**，
因為 PLS 的構念分數以樣本標準差（ddof = 1）標準化，$\sum y^2=n-1$。
用 $n$ 會讓四個準則整體平移 $n\ln\frac{n-1}{n}$——不影響同一構念內的模型排序，
但會讓數值對不上 seminr。

### 3.3 四個準則

$$\text{base}=n\ln\frac{\text{SSE}_j}{n}$$

$$\text{AIC}=\text{base}+2(k+1)$$

$$\text{AICc}=\text{AIC}+\frac{2(k+1)(k+2)}{n-k-2}$$

$$\text{BIC}=\text{base}+(k+1)\ln n$$

$$\text{HQ}=\text{base}+2(k+1)\ln\ln n$$

→ `pls.js:885–891`（base `885`、AIC `887`、AICc `888`、BIC `889`、HQ `890`）

★ **參數計數是 $k+1$，不是 $k$**——多的那個是誤差變異。
這一點與 seminr 的 `compute_metrics.R`（`pk+1`）同式，是 2026-07-13 逐式核對的重點之一。

★ **AICc 的分母是 $n-k-2$**：$n$ 接近 $k$ 時懲罰急遽放大，這正是小樣本校正的用意。
$n-k-2\le 0$ 時本工具不計算（回 `null`），見 §3.4。

### 3.4 不計算的兩種情形

$$\text{itCriteria}=\text{null}\quad\text{if}\quad \text{SSE}\le10^{-12}\ \ \text{或}\ \ n-k-2\le 0$$

→ `pls.js:884`

★ 第一個條件（$R^2\approx1$）**實測可達**：構造完全共線的資料時 $R^2=1$、$\ln 0=-\infty$，
守衛擋下後回 `null`（`tests/pls.test.js` 已補測試）。
第二個條件在實務上**不可達**——`runPLS` 更早就以 `too-few-cases` 擋掉 $n<5$（`pls.js:2231`），
而 $k\le 2$ 時 $n-k-2>0$ 恆成立。它是防禦性守衛，見第 6 節。

### 3.5 判讀

| 情形 | 怎麼讀 |
|---|---|
| 同一構念、兩個前置組合 | 四個準則數值較小者較佳 |
| AIC 與 BIC 指向不同模型 | 資料無法明確裁決；BIC 偏好簡約、AIC 偏好配適 |
| 小樣本（$n/k$ 小） | 以 **AICc** 為主 |

**沒有絕對門檻。** 本工具不提供任何「AIC < 某值算好」的判讀，因為不存在這種門檻。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 構念為內生（有前置） | 迴圈只走 $\lvert P\rvert>0$ 的構念 | 外生構念不進本表 | `pls.js:866` |
| $\text{SSE}>0$ | 門檻 $10^{-12}$ | 回 `null`，該列不顯示 | `pls.js:884` |
| $n-k-2>0$ | 直接檢查 | 回 `null`（實務不可達，見 §3.4） | `pls.js:884` |
| 構念分數為單位變異 | 由核心迭代的正規化保證 | — | `pls.js:704–711` |
| **比較對象是同一構念** | ✗ **不檢核**（工具無法知道使用者要比什麼） | 報表註記文字提醒 | i18n `itcNote` |

★ **最後一列是本方法的主要誤用入口**，也是為什麼註記文字要把「不可跨構念比較」寫在最前面
（2026-07-29 紅隊 R24 的處置之一）。

★ **本表與 `assumptionChecker` 無對應項**：IT 準則沒有分布假設（它只是 $R^2$ 的單調變換加常數），
所以第 4 節在此意義上「不適用」——真正的前提是**使用方式**，不是資料性質。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Akaike, H. (1973). Information theory and an extension of the maximum likelihood principle. In B. N. Petrov & F. Csáki (Eds.), *2nd International Symposium on Information Theory* (pp. 267–281). | §3.3 AIC | 【原文未取得】 |
| Schwarz, G. (1978). Estimating the dimension of a model. *The Annals of Statistics*, 6(2), 461–464. | §3.3 BIC | 【原文未取得】 |
| Hurvich, C. M., & Tsai, C.-L. (1989). Regression and time series model selection in small samples. *Biometrika*, 76(2), 297–307. | §3.3 AICc | 【原文未取得】 |
| Hannan, E. J., & Quinn, B. G. (1979). The determination of the order of an autoregression. *Journal of the Royal Statistical Society: Series B*, 41(2), 190–195. | §3.3 HQ | 【原文未取得】 |

**程序指引（把 IT 準則帶進 PLS 的兩篇）**

| 文獻 | 用途 | 取得狀態 |
|---|---|---|
| Sharma, P. N., Sarstedt, M., Shmueli, G., Kim, K. H., & Thiele, K. O. (2019). PLS-based model selection: The role of alternative explanations in information systems research. *Journal of the Association for Information Systems*, 20(4), 346–397. | §1 的動機、§3.2 的 SSE 定義 | 【原文未取得】（卷期頁碼 2026-07-29 已查證） |
| Sharma, P. N., Shmueli, G., Sarstedt, M., Danks, N., & Ray, S. (2021). Prediction-oriented model selection in partial least squares path modeling. *Decision Sciences*, 52(3), 567–607. | §3.5 判讀 | 【原文未取得】 |
| seminr `compute_metrics.R` | §3.2／§3.3 的逐式對照（AIC／BIC 同式、$p_k+1$ 計數） | 原始碼已取得 |

★ **一處引用錯置已於 2026-07-13 修正並記錄於 `provenance.json`**：
原 source 字串誤標「Sharma, Shmueli, Sarstedt, Danks & Ray 2019」——
該作者組合是 2021 的 *Decision Sciences*，2019 的 JAIS 是 Sharma, Sarstedt, Shmueli, Kim & Thiele。

★ 六筆方法／程序出處**全部未取得原文**，第 3 節**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_itcriteria`（12 欄：M4 的三個內生構念 F2、C、Y × 四個準則）

**tier / status**：tier **B** / **verified**

### 溯源的實際強度

| 道 | 內容 |
|---|---|
| 1 | **seminr `compute_metrics.R` 原始碼逐式核對**（2026-07-13 Session Q1）：`AIC_func = 2(p_k+1)+N·log(SSE_k/N)`、`BIC_func = N·log(SSE_k/N)+(p_k+1)·log(N)`、`SSE_k=(1−R²)·var·(N−1)`、`p_k` = 前置構念數——與本工具**完全同式** |
| 2 | 沙盒以 **plspm 獨立分數 ＋ statsmodels OLS** 重現全部 12 值（差 ≤ 5.4e−7，plspm 迭代容差） |
| 3 | **statsmodels 恆等式**：`llf` 式的 AIC／BIC 與 SSE 式恰差高斯常數 $n(\ln 2\pi+1)$（差 ≤ 2e−14）。這一道**鎖住了 SSE 的定義與 $(k+1)$ 的計數**，並已升為 `generate_reference.py` 的重生時 assert |
| 4 | **本文件的獨立重寫（2026-07-29）**：依第 3 節文字規格以 numpy 重寫（含完整重寫 PLS 核心取 $R^2$），對 12 欄比對，**最大絕對差 8.882e−15**（浮點對數運算的順序差） |

★ 第 3 道值得特別說明：它不是「再抄一次公式」，而是用**另一條完全不同的路徑**
（高斯對數概似）算同一個量，兩者的差恰為一個已知常數。
這種恆等式檢查能抓到 SSE 定義（$n$ vs $n-1$）與參數計數（$k$ vs $k+1$）的錯誤——
兩者都是本方法最容易寫錯的地方。

**已對照過的第三方**：seminr（R，原始碼層）、plspm（沙盒）、statsmodels（沙盒，恆等式）、numpy（沙盒）。
**沒有對照過**：SmartPLS 4（授權過期）、cSEM（未實作結構層 IT 準則）。

**已知的慣例差異**

| 項目 | 本工具 | 備註 |
|---|---|---|
| SSE 的分母 | $(n-1)(1-R^2)$ | 用 $n(1-R^2)$ 會整體平移，排序不變但數值對不上 seminr |
| 參數計數 | $k+1$ | 與 seminr 同 |
| $\ln$ 的底 | 自然對數 | 未見任何實作用其他底 |

### ★ 尚未驗證的部分

1. **AICc 與 HQ 沒有任何第三方數值對照。** seminr 只實作 AIC 與 BIC；
   這兩個是**同族標準延伸**（同 SSE、同 $k+1$ 計數，只換懲罰項），
   但「PLS 情境下該不該這樣延伸」**沒有來源背書**。四篇原始出處也未取得。
2. **六篇文獻全部未取得原文。** §3.2 的 SSE 定義來自 seminr 原始碼而非 Sharma et al. (2019) 原文；
   若原文另有規定（例如是否該用 adjusted $R^2$），本工具無從得知。
3. **$n-k-2\le 0$ 這條守衛實務不可達**（§3.4），因此**永遠不會被測試走到**。
   它是防禦性程式碼，不是已驗證的行為。
4. **報表沒有「模型比較」的工作流程。** 本表只顯示**當前這一個模型**的四個準則值，
   而 IT 準則的用途是比較**兩個模型**。使用者必須自己跑兩次、自己抄下數字、自己比較。
   工具沒有記錄或並列兩次執行結果的機制——這是**功能缺口**，不是溯源缺口。
5. **AICc 的 $n$ 與 $k$ 取自哪一層未經第三方確認**：本工具用構念層的 $n$（樣本數）與
   前置構念數 $k$。若原文的 PLS 版本改以指標數計數，數值會不同——**未查核**。
6. **邊界條件**：$\text{SSE}\le10^{-12}$ 的路徑已於 2026-07-29 補測試；
   `null` 時 UI 整列不顯示（`Result.jsx:511`）的行為**只有沙盒層的元件邏輯，無 jsdom 測試覆蓋**。

## 7. 報表欄位對照

★ **本節在 2026-07-29 之前是空的**——四個準則算出來、掛在 `structural[]` 上、
`compare.test.js` 逐值比對，但**沒有任何元件讀它**。詳見第 8 節 R24。

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 表標題「結構模型 — 模型選擇準則（IT criteria）」 | — | `Result.jsx:514`、i18n `itcTitle` |
| 構念 | §4 第一列（只有內生構念） | `pls.js:904`、`Result.jsx:528` |
| AIC | §3.3 | `pls.js:887`、`Result.jsx:529` |
| AICc | §3.3 | `pls.js:888`、`Result.jsx:530` |
| BIC | §3.3 | `pls.js:889`、`Result.jsx:531` |
| HQ | §3.3 | `pls.js:890`、`Result.jsx:532` |
| 註記（含三條不可比較的界線與公式說明） | §2、§3.2、§3.3 | `Result.jsx:537`、i18n `itcNote` |
| 說明區的 IT 準則段 | §1、§2 | i18n `pls.notes.w5`（`zh-TW.js:3229`／`en.js:3171`） |

**孤兒欄位檢查**：修正 R24 後 `itCriteria` 的四個欄位全部有對應呈現，無孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A3a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 12 欄，最大差 8.882e−15） |
| 2 | authority 是否支持該公式 | **通過**。`provenance.json` 明列 seminr 的兩條函式原始碼、statsmodels 恆等式，並誠實標註「AICc/HQ 無主流第三方實作，為同族標準延伸」 |
| 3 | 文獻真實性 | **通過**。六筆全部標【原文未取得】；Sharma et al. (2019) 的 JAIS 20(4), 346–397 本次已查證屬實；2026-07-13 修過的作者組合錯置已記錄於 `provenance.json` 的 `note` |
| 4 | 報表可追溯 | ★ **開出 R24（本批最重要的一項）** |
| 5 | 假設前提 | **通過**（本方法無分布假設；真正的前提是使用方式，已寫入註記） |
| 6 | 慣例分歧 | **通過**，三項已書面化 |
| 7 | 邊界條件 | ★ **兩處**：$\text{SSE}\approx0$ 先前無測試（**本批已補**）；$n-k-2\le0$ 實務不可達（記錄） |
| 8 | APA 敘述句 | **通過**——IT 準則**不進**敘述句，這是正確的：單一模型的準則值沒有可報告的意義 |

### R24（L2，已修）算了、測了、說明區也講了，就是報表上沒有

**發現**：`structural[].itCriteria` 在 `pls.js:881–892` 逐內生構念算出、
`compare.test.js` 逐值比對 12 欄、`pls.test.js:1016–1023` 有代數斷言——
但 `grep -rn "itCriteria" src/` 在 `pls.js` 以外**零命中**。
`Result.jsx` 的 R² 表只有 R² 與 adjR² 兩欄，PDF 匯出與剪貼簿也沒有。

同時，說明區（`Notes.jsx:31` 渲染的 `pls.notes.w5`）對使用者寫著：

> 「IT 準則（AIC/AICc/BIC/HQ）：比較『同一內生構念的不同前置組合』哪個更簡約有效，越小越好；跨資料集不可比」

⇒ **工具在說明一張不存在的報表。**

這是「孤兒欄位」的反面：不是報表有數字沒人說得清，是說明講了數字但報表上找不到。
`provenance.test.js` 的棘輪管不到這一類——它只管「方法有沒有登記」。

**級別判定**：按 §6.4 屬 L2（呈現層），但修法是**新增報表**而非改文字，功能幅度大於一般 L2，
故依 §6.4 末段停下來請 Kevin 裁決。

**處置（Kevin 2026-07-29 核定：另立一張表＋警語）**

- `Result.jsx:509–540` 新增 `ItCriteriaTable`，掛在 R² 表之後（`Result.jsx:1993`）
- `itCriteria` 為 `null` 的構念整列不顯示；全部為 `null` 時整張表不渲染（`Result.jsx:511`）
- i18n 中英各新增 `itcTitle`／`itcNote` 兩鍵。**註記的第一句就是三條界線**
  （不可跨構念、不可跨資料集、只比同一構念的不同前置組合），
  因為逐列一個構念的表最容易誘發跨列比較這個誤讀
- 引擎、`reference.json`、`provenance.json` **零改動**

**為什麼不併入 R² 表**：AIC 跨構念不可比，而 R² 跨構念是可以並列看的。
放同一張表會讓兩種可比性不同的量並排，強化誤讀。分表可以掛自己的警語。

★ 補了一條 UI 測試（`tests/ui.smoke.test.jsx`），除了驗表格 render，
還斷言「不可跨構念比較」這句話必須出現在使用者看得到的地方——
**這一條不是形式**：表格加上去容易，警語掉了才是真正的風險。

### 本批未開出 L3／L4

四個準則的公式層對得起獨立重寫與 statsmodels 恆等式，無數值問題。
第 6 節六項「尚未驗證」中，**第 3、4、5、6 點先前未記錄於任何地方**——
其中**第 4 點最值得後續處理**：工具現在會顯示四個準則值，但沒有任何機制支援
「跑兩個模型再比較」這個唯一正當的用法。加了表之後這個缺口反而更明顯了。
屬功能擴充，記入 `roadmap-v2.md §6.6` 待辦。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
