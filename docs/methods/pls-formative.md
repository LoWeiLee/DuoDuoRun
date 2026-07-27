# 形成型測量模型（Formative measurement / Mode B）

> 方法代號 `pls_formative`｜基準組 `reference.json → pls_formative`｜溯源 tier **B** / verified
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

反映型測量問的是「這個構念**表現**在哪些題目上」，形成型測量問的是「這個構念**由**哪些成分組成」。

舉例：「社會經濟地位」不會「造成」你的收入、教育與職業聲望——是這三者**共同構成**它。
少掉任何一項，構念的意義就改變了。這種情形下，指標之間**不必**高相關（高收入不必然高教育），
因此 α、CR、AVE、HTMT 這些以「同構念指標應高相關」為前提的指標**全部失去意義**。

Mode B 回答的是：在指定的路徑模型下，**每個成分對構念的貢獻權重多大**（迴歸權重），
以及這些成分之間有沒有嚴重的共線性（外部 VIF）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 指標是構念的**成因或組成**，不是構念的展現（刪一題會改變構念的意義）
- 指標之間沒有理由高相關（例如「數位治理能力」＝法制、預算、人力、資料基礎建設）
- 研究定位是「組合（composite）」而非「共同因素（common factor）」

**不該用**

- 只因為「α 太低所以改成形成型」——這是把測量理論當成救火工具，審稿人會直接抓
- 指標數很少又高度共線：Mode B 是對內部代理的多元迴歸，共線會讓權重不穩、正負跳動
- 想談構念的信度：形成型構念**沒有**信度定義，別去湊

**常見誤用（三條）**

1. **拿權重不顯著就刪指標。** 形成型指標刪掉就改變構念定義。Hair 等人的程序是：權重不顯著但
   **負荷量（loading）≥ .50** 時，可以基於理論保留（本工具的形成型表同時列出兩者）。
2. **報告 α／AVE。** 本工具對形成型構念一律回傳 `null`、UI 顯示「—」；如果你在別的軟體看到數字，
   那是軟體沒有分辨測量模式，不是你該報的東西。
3. **沒查共線性。** 形成型的第一個檢核就是外部 VIF；門檻見第 3 節。

## 3. 公式與定義

### 3.1 Mode B 外部權重（regression weights）

設區塊 $B_j$ 的指標相關子矩陣為 $\mathbf{S}_j$、內部代理為 $Z_j$（定義見 `pls-basic.md` §3.3），則

$$\mathbf{w}_j \ \propto\ \mathbf{S}_j^{-1}\,\operatorname{cov}(\mathbf{z}_{B_j},\,Z_j)$$

再依 `pls-basic.md` §3.3 (4) 縮放使 $\operatorname{Var}(y_j)=1$。

→ `src/lib/stats/pls.js:753–777`（Mode B 分支在 `763–772`）；$\mathbf{S}_j^{-1}$ 在迭代迴圈**外**預先計算（`pls.js:661–672`），因為 $\mathbf{S}_j$ 在迭代間不變

這就是「把內部代理 $Z_j$ 對區塊指標做多元迴歸」——所以叫 regression weights。
對照 Mode A 是 $\mathbf{w}_j \propto \operatorname{cov}(\mathbf{z}_{B_j}, Z_j)$（correlation weights），
差別只在有沒有乘上 $\mathbf{S}_j^{-1}$（＝有沒有把指標間的相關「除掉」）。

★ **$k=1$ 時 Mode A ≡ Mode B**：單指標區塊的 $\mathbf{S}_j=[1]$，反矩陣為 1。程式碼的條件是
`modes[j] === 'B' && b.length >= 2`（`pls.js:765`），單指標形成型走 Mode A 分支——數學上等價，不是特例處理。

### 3.2 外部負荷量（形成型也會報）

$$\lambda_{jh}=\operatorname{corr}(z_h,y_j)=\textstyle\sum_{g\in B_j}w_{jg}R_{hg}$$

→ `pls.js:1191–1234`（`coreEstimates`）。形成型構念的 loading 不用來判斷收斂效度，
而是作為「權重不顯著時的備援判準」（Hair et al. 的形成型評估程序）。

### 3.3 外部 VIF（形成型指標共線性）

$$\operatorname{VIF}_h=\left[\mathbf{S}_j^{-1}\right]_{hh}$$

→ `pls.js:1758–1764`。只對**形成型多指標**區塊計算（其餘回傳 `null`）。

★ **慣例分歧（門檻）**：本工具的燈號用 **< 3.3 綠／< 5 黃／≥ 5 紅**（`Result.jsx:110–115`）。
Hair 等人在 PLS-SEM 脈絡建議 3.3，一般迴歸文獻常見 5 或 10。三個門檻都在文獻裡有人用，
本工具採最嚴的一組並以三級燈號呈現，不是唯一正確答案。

### 3.4 形成型構念不定義的量

| 量 | 形成型構念的回傳值 | 理由 |
|---|---|---|
| Cronbach's α | `null` | 前提是指標同質，形成型不成立 |
| rho_A | `null` | 同上 |
| CR (rho_c) | `null` | 同上 |
| AVE | `null` | 「萃取變異」的概念要求共同因素 |
| Fornell-Larcker 對角線 | `null` | $\sqrt{\text{AVE}}$ 不存在 |
| HTMT 涉及該構念的配對 | `null` | 分母的單質相關無意義 |

→ `pls.js:1797–1813`（信效度）、`1796–1801`（Fornell-Larcker）、`942–968`（HTMT 的 `eligible` 過濾）

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 指標不完全共線（$\mathbf{S}_j$ 可逆） | **前置檢查**：進迭代前逐區塊驗反矩陣 | **硬擋** `formative-block-singular`，**指名構念與全部指標** | `pls.js:1451–1467` |
| 指標不高度共線 | 外部 VIF | 燈號（不擋） | `pls.js:1758–1764` |
| 權重的統計顯著性 | bootstrap（見 `pls-bootstrap.md`） | 報表列 SE／t／p／CI | `pls.js:2412–2693` |
| 測量模式指定正確 | 不自動檢核 | 另由 CTA-PLS 以資料檢驗 | 見 `pls-cta.md` |
| 其餘（遞迴、樣本量、零變異） | 同 `pls-basic.md` §4 | | |

★ **完全共線時的行為（2026-07-26 起）**：前置檢查會先攔下並**指名構念與指標**
（`formative-block-singular`）。若走到迭代內部才失敗（例如 LV 分數零變異、前置構念相關矩陣奇異），
仍回傳較籠統的 `estimation-failed`（`pls.js:1469–1472`）。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Lohmöller, J.-B. (1989). *Latent Variable Path Modeling with Partial Least Squares*. Physica-Verlag. | 3.1 Mode B 的定義 | 【原文未取得】 |
| Diamantopoulos, A., & Winklhofer, H. M. (2001). Index construction with formative indicators. *Journal of Marketing Research*, 38(2), 269–277. | 2 形成型的理論主張與指標選取 | 【原文未取得】 |
| Jarvis, C. B., MacKenzie, S. B., & Podsakoff, P. M. (2003). A critical review of construct indicators and measurement model misspecification. *Journal of Consumer Research*, 30(2), 199–218. | 2 誤設定的後果 | 【原文未取得】 |

**程序指引**

| 文獻 | 用途 |
|---|---|
| Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2017/2022). *A Primer on PLS-SEM*. Sage. | 形成型評估四步（權重顯著性 → 外部 VIF → 負荷量備援 → 理論保留）、VIF 3.3 門檻 |
| Hair, J. F., Howard, M. C., & Nitzl, C. (2020). Assessing measurement model quality in PLS-SEM using confirmatory composite analysis. *Journal of Business Research*, 109, 101–110. | CCA 工作流程（本工具報表即涵蓋，見 `pls-basic.md` UI 說明） |

★ 本節文獻**全部未取得原文**；卷期頁碼為書目層級資訊，第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_formative`（11 個欄位：3 權重、3 負荷量、path、$R^2$、3 個外部 VIF）

**tier / status**：tier **B** / **verified**

**對照過的第三方**

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| **plspm 0.5.7**（Python，沙盒） | weights、loadings、path、$R^2$ | fixture 的產生來源 |
| **seminr 2.5.0**（R，本機，Hair 團隊） | 同上 ＋ 外部 VIF | 2026-07-13 逐值一致（顯示位數內全同）。Mode B 慣例（$\mathbf{w}'\mathbf{S}\mathbf{w}=1$ 正規化、迴歸權重）**跨三個實作一致** |
| 本文件的獨立重寫（2026-07-26） | 11 欄全部 | 最大絕對差 **2.2e−16** |
| SmartPLS 4 | — | **沒有對照過**（授權過期） |

**已知的慣例差異**

1. **外部 VIF 的門檻**：3.3（本工具）／5／10 三種都在文獻中存在，見 §3.3。
2. **權重正規化**：$\mathbf{w}'\mathbf{S}\mathbf{w}=1$；plspm 原生為母體單位變異，基準比對前已正規化。
3. **形成型構念的信度**：本工具回傳 `null`；部分軟體照算並輸出數字。這是**本工具刻意的取捨**，不是缺漏。

### ★ 尚未驗證的部分

1. **原始文獻的方程式編號未核對**，三篇方法出處皆未取得原文。本組標 verified 的依據是
   「plspm 與 seminr 兩個獨立第三方數值全中」。
2. **Mode B 在指標高度共線時的行為未系統性測試**：目前只知道「完全共線 → 估計中止」與
   「VIF 亮紅燈」，但**權重的正負翻轉、跨樣本不穩定的程度沒有量化**，也沒有測試覆蓋。
3. **形成型構念的 bootstrap 權重檢定沒有第三方對照**（有行為測試鎖住 SE／t／p／CI 存在與可重現，
   數值未對 SmartPLS／seminr 抽驗）。
4. ~~錯誤歸因缺陷（R7）尚未修~~ **已於 2026-07-26 修正**（前置檢查＋指名構念），見第 8 節。
5. **單指標形成型構念**：數學上等價於 Mode A（§3.1），但 UI 不提示使用者「你宣告的形成型在此無效」。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 外部權重 Weight | 3.1 | `pls.js:1783–1796` 附近的 `outerWeights` 組裝 |
| 外部 VIF | 3.3 | `pls.js:1758–1764` |
| 外部負荷量（備援欄） | 3.2 | `pls.js:1191–1234` |
| 權重的 SE／t／p／CI | 見 `pls-bootstrap.md` | `pls.js:2412–2693` |
| α／rho_A／CR／AVE | 3.4（一律 `null`，UI 顯示「—」） | `pls.js:1797–1813` |

**孤兒欄位檢查**：形成型權重表的每一欄都有對應公式，未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（含獨立重寫，見下） |
| 2 | authority 是否支持該公式 | **通過**（`pls_formative` 的 authority 正確列出 plspm 為 fixture 來源、seminr 為第二證人——這是全專案登記最完整的一組，`pls_basic` 的登記缺漏即以本組為對照範例修正） |
| 3 | 文獻真實性 | **通過但全部未取得原文**，已於第 5 節標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**（R7 的可改善項已修） |
| 6 | 慣例分歧 | **通過**（第 6 節列 3 項） |
| 7 | 邊界條件 | **發現 1 項並已修**（R7）；另列 2 項未測（第 6 節第 2、5 點） |
| 8 | APA 敘述句 | **通過**（形成型句子明確寫出「以外部權重之 bootstrap 檢定與指標共線性評估」，未宣稱信度） |

### R1（通過）獨立重寫

依第 3 節的文字規格用 numpy 重寫 Mode B 迭代（含 $\mathbf{S}_j^{-1}$ 預算、單位變異正規化、
符號定向），對 11 個欄位比對，**最大絕對差 2.2e−16**。

★ 方法論說明：本項驗的是「第 3 節的文字是否構成充分且正確的規格」。
執行者先前已讀過 `pls.js`，因此**這不是盲重寫**——它抓得到文件與實作之間的漂移，
抓不到「作者對原始文獻的理解本身有誤」。後者需要原文，而本組三篇方法出處皆未取得。

### R7（L2，已修）Mode B 區塊奇異時的錯誤訊息未指名構念

★ **這一條同時是本批的一則方法論教訓，故完整保留兩次判讀。**

**紅隊第一次判讀（讀碼推得，錯誤）**：`estimateCoreFromCorr` 在 Mode B 區塊的 $\mathbf{S}_j$
不可逆時回傳 `null`（`pls.js:670`），推斷呼叫端會翻譯成 `not-converged`，屬歸因錯誤。

**實測結果（正確）**：建構 $x_3 = 2x_1 + 3x_2$ 的完全共線資料實跑，得到的是

```
error   = estimation-failed
message = PLS 迭代過程出現數值退化（零變異 LV 分數或奇異矩陣），請檢查指標間是否極度共線
```

路徑是 `estimateCore → coreEstimates` 回傳 `null` → `estimateStage` 的 `estimation-failed`
（`pls.js:1469–1472`），**不是** `not-converged`（後者只在 `ce.notConverged` 時觸發）。
歸因方向正確、訊息也點到共線，我第一次的判讀是錯的。

**真正剩下的缺口（弱化後）**：訊息**沒有指出是哪個構念、哪幾個指標**共線。
使用者在多構念模型裡拿到這句話，仍要自己一個個試。

**處置（Kevin 2026-07-26 核定：在 `estimateStage` 做前置檢查，已執行）**

在進迭代前，對每個形成型多指標區塊先驗一次區塊相關子矩陣的可逆性，失敗即回傳專屬錯誤碼：

```
error   = formative-block-singular
message = 形成型構念「數位治理能力」的指標相關矩陣不可逆——指標（x1、x2、x3）之間完全共線或
          線性相依，Mode B 的迴歸權重無法計算。請刪除重複／可由其他指標線性組成的指標，
          或把該構念改為反映型
```

→ `pls.js:1451–1467`。**不動 `estimateCoreFromCorr` 的回傳契約**（仍為 `object | null`），
所以風險低；代價是多一次區塊反矩陣計算（區塊尺寸小，可忽略）。
新增 2 條行為測試：完全共線資料觸發專屬錯誤碼並含構念名與指標名；正常形成型模型不受影響。

### 待辦編號

本組開出 **R7（L2，已修）**。跨組發現另見 `pls-plsc.md` 的 **R6（L4，已修）**。

★ **本批的方法論教訓**：R7 的第一次判讀是**讀程式碼推論**得出的，實測後證明錯誤。
凡涉及「使用者實際會看到什麼」的檢查項（錯誤訊息、警告、燈號），一律**必須實跑**，
不接受讀碼推論——這一條已寫入 `roadmap-v2.md §6.8` 給後續批次。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
