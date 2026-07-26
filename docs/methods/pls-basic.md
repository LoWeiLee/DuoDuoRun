# PLS-SEM 基本估計（Partial Least Squares Structural Equation Modeling — basic estimation）

> 方法代號 `pls_basic`｜基準組 `reference.json → pls_basic`｜溯源 `provenance.json → pls_basic`（tier B / verified）
> 最後更新：2026-07-26（階段 A 試點）

---

## 1. 這個方法在回答什麼問題

問卷研究常有一個困難：想測的東西（滿意度、信任、使用意圖）沒辦法直接量，只能用好幾道題目間接逼近。這些「測不到但想談」的東西叫**潛在構念**（latent construct），題目叫**指標**（indicator）。

PLS-SEM 同時處理兩件事：

1. **測量模型**——每個構念要怎麼從它的題目算出一個分數；
2. **結構模型**——這些構念分數之間的因果路徑有多強。

它的做法是：替每個構念找一組題目的加權平均，讓「彼此有理論關係的構念，其分數之間的關聯盡可能大」，然後對這些分數跑迴歸。所以 PLS-SEM 回答的是「**在我指定的這張路徑圖之下，各構念之間的關係有多強、內生構念的變異被解釋了多少**」。

它不回答「我這張路徑圖對不對」。那是 CB-SEM（共變異數結構取向）的問題，PLS-SEM 的適配指標（SRMR、d_ULS、d_G、NFI）只是近似性檢核，不是 χ² 類的整體適配檢定。

---

## 2. 什麼時候該用、什麼時候不該用

**適合**

- 研究目的偏預測與解釋（要最大化內生構念的被解釋變異），而非驗證某個測量理論
- 模型較複雜（構念多、路徑多），樣本量相對於參數數目不寬裕
- 資料明顯非常態（Likert 題常見），或有形成型構念
- 理論仍在發展階段，測量工具尚未穩定

**不適合／要三思**

- 研究目的是「檢驗這個因素結構成不成立」——該用 CFA／CB-SEM
- 需要整體適配的統計檢定（χ²、CFI／TLI 的傳統判準）
- 結構模型含**循環**（互為因果）——PLS-SEM 要求遞迴模型，本工具會直接擋下
- 樣本極小又想談穩定的推論：bootstrap 不會無中生有

**常見誤用（給學生的四條）**

1. **把反映型／形成型當成風格選擇。** 這是理論主張：反映型主張構念造成指標（指標可互換、應高相關），形成型主張指標構成構念（刪一題就改變構念意義）。設錯了，α／rho_A／CR／AVE／HTMT 全部失去意義。（工具另提供 CTA-PLS 以資料檢驗此設定，見 `pls-cta.md`。）
2. **拿 PLS-SEM 的路徑係數當「真實的構念間關係」。** 一般 PLS 的構念分數含測量誤差，路徑係數系統性低估。若研究定位是理論驗證，應開啟 PLSc（見 `pls-plsc.md`）。
3. **用「PLS 樣本小也能跑」當作小樣本的正當理由。** 能跑不等於推論穩定；本工具在 n < 30 時會警告。
4. **未反向計分就直接跑。** 反向題沒有事先反轉，會使區塊內平均相關為負，此時信度與區辨效度指標的數值不可詮釋——見第 6 節「尚未驗證／已知風險」第 3 點。

---

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $n$ | 有效樣本數（缺失值處理後） |
| $p$ | 指標總數；$L$ 為構念數 |
| $z_h$ | 第 $h$ 個指標的標準化值 |
| $\mathbf{R}$ | 指標相關矩陣（$p \times p$） |
| $B_j$ | 構念 $j$ 的指標集合（區塊），$k_j = \lvert B_j \rvert$ |
| $\mathbf{w}_j$ | 構念 $j$ 的外部權重向量 |
| $y_j$ | 構念 $j$ 的分數（composite） |
| $e_{jk}$ | 構念 $j$ 對相鄰構念 $k$ 的內部權重 |
| $Z_j$ | 構念 $j$ 的內部代理 |
| $\lambda_{jh}$ | 指標 $h$ 在構念 $j$ 的外部負荷量 |
| $\mathbf{S}_j$ | 區塊 $j$ 的指標相關子矩陣 |

### 3.2 資料前處理

指標逐欄 z-score，樣本標準差（ddof = 1）：

$$z_{ih} = \frac{x_{ih}-\bar{x}_h}{s_h},\qquad s_h=\sqrt{\tfrac{1}{n-1}\textstyle\sum_i (x_{ih}-\bar{x}_h)^2}$$

→ `src/lib/stats/pls.js:1250–1292`（`standardizeColArrays`）

★ **慣例說明**：ddof 取 1 或 0 **不影響任何回報的統計量**。本引擎所有統計量都由相關矩陣 $\mathbf{R}$ 推導（見 3.3），而相關係數是尺度不變量。ddof 只影響構念分數的絕對尺度（供 IPMA／預測等下游使用）。

### 3.3 核心迭代（Lohmöller 1989）

★ **本引擎的設計特點**：整個迭代**只吃指標相關矩陣 $\mathbf{R}$**，不需要原始欄位。依據是三條恆等式：

$$\operatorname{Var}(y_j)=\mathbf{w}_j'\mathbf{R}_{jj}\mathbf{w}_j,\qquad
\operatorname{corr}(y_j,y_k)=\mathbf{w}_j'\mathbf{R}_{jk}\mathbf{w}_k,\qquad
\operatorname{corr}(z_h,y_k)=\textstyle\sum_{g\in B_k} w_{kg}R_{hg}$$

→ `src/lib/stats/pls.js:657–799`（`estimateCoreFromCorr`），設計說明見 `handoff-roadmap-v1.md §6.7`

**步驟**

**(0) 初始化**：$\mathbf{w}_j \leftarrow \mathbf{1}$，再依 (4) 縮放。→ `pls.js:709–711`

**(1) 內部權重** $e_{jk}$，依 weighting scheme：

| scheme | 對前置構念 $k \to j$ | 對後繼構念 $j \to k$ |
|---|---|---|
| `path`（預設） | $y_j$ 對其**全部**前置構念的 OLS 標準化迴歸係數：$\mathbf{b}=\mathbf{R}_{PP}^{-1}\mathbf{r}_{Py}$ | $\operatorname{corr}(y_j,y_k)$ |
| `factorial` | $\operatorname{corr}(y_j,y_k)$ | $\operatorname{corr}(y_j,y_k)$ |
| `centroid` | $\operatorname{sign}\operatorname{corr}(y_j,y_k)$ | $\operatorname{sign}\operatorname{corr}(y_j,y_k)$ |

→ `pls.js:719–751`。`centroid` 的符號函數在相關恰為 0 時取 $+1$（`e >= 0 ? 1 : -1`，`pls.js:747`）。

**(2) 內部代理**：$Z_j=\sum_k e_{jk}y_k$

**(3) 外部權重**

- Mode A（反映型，correlation weights）：$w_{jh}\ \propto\ \operatorname{cov}(z_h,Z_j)$
- Mode B（形成型，regression weights）：$\mathbf{w}_j\ \propto\ \mathbf{S}_j^{-1}\,\operatorname{cov}(\mathbf{z}_{B_j},Z_j)$

→ `pls.js:753–777`（Mode B 的 $\mathbf{S}_j^{-1}$ 在迴圈外預算，`pls.js:661–672`）

★ **一處刻意的簡化**：原始演算法 Mode A 用 $\operatorname{corr}(z_h,Z_j)$，本實作用 $\operatorname{cov}(z_h,Z_j)$。因為 $\operatorname{sd}(Z_j)$ 對整個區塊是同一個純量，而權重隨後被 (4) 縮放成單位變異，該因子完全相消，兩者結果逐位相同。少一次開根號。

**(4) 正規化**：$\mathbf{w}_j \leftarrow \mathbf{w}_j/\sqrt{\mathbf{w}_j'\mathbf{R}_{jj}\mathbf{w}_j}$，使 $\operatorname{Var}(y_j)=1$。→ `pls.js:700–707`

**(5) 收斂**：$\max_{j,h}|w_{jh}^{(t)}-w_{jh}^{(t-1)}|<\text{tol}$，預設 tol $=10^{-7}$、上限 300 次。→ `pls.js:779–789`；預設值 `pls.js:1171–1172`、`1383–1384`

★ **慣例分歧**：收斂準則的**定義形式**（絕對最大變化／平方和／相對變化）各實作不同。本工具採「外部權重的最大絕對變化」，數值與上限對齊 SmartPLS 4 的預設（stop criterion $10^{-7}$／300 次）。與 cSEM、seminr 的準則定義是否逐項相同——**未查核**，見第 6 節。

**(6) 符號定向**：若 $\sum_{h\in B_j}\operatorname{corr}(z_h,y_j)<0$ 則整個區塊的權重變號（dominant orientation）。→ `pls.js:791–796`

★ 這是**區塊層級**的翻轉。PLS 的符號不確定性是「整個構念可以同時翻轉」，**不是**「個別指標的正負無所謂」——區塊內出現正負混雜的負荷量是資料問題，不是符號不確定性。

**(7) 構念分數**：$y_{ij}=\sum_{h\in B_j}w_{jh}z_{ih}$。→ `pls.js:824–838`

### 3.4 測量模型量

$$\lambda_{jh}=\operatorname{corr}(z_h,y_j)=\textstyle\sum_{g\in B_j}w_{jg}R_{hg} \qquad \text{→ } \texttt{pls.js:1189–1195}$$

$$r(y_a,y_b)=\mathbf{w}_a'\mathbf{R}_{ab}\mathbf{w}_b \qquad \text{→ } \texttt{pls.js:1196–1213}$$

**cross-loadings**：每個指標對**所有**構念分數的相關（此處走分數而非 $\mathbf{R}$）。→ `pls.js:1757–1762`

**外部 VIF**（形成型多指標區塊）：$\operatorname{VIF}_h=[\mathbf{S}_j^{-1}]_{hh}$。→ `pls.js:1732–1738`

### 3.5 結構模型

對每個內生構念 $j$（前置集合 $P$，$k=|P|$）：

$$\boldsymbol{\beta}=\mathbf{R}_{PP}^{-1}\mathbf{r}_{Pj},\qquad
R^2_j=\boldsymbol{\beta}'\mathbf{r}_{Pj},\qquad
R^2_{\text{adj}}=1-\frac{(1-R^2_j)(n-1)}{n-k-1}$$

$$f^2_{(m)}=\frac{R^2_{\text{full}}-R^2_{\text{-}m}}{1-R^2_{\text{full}}}\ \text{(Cohen 1988)},\qquad
\operatorname{VIF}^{\text{inner}}_m=[\mathbf{R}_{PP}^{-1}]_{mm}$$

→ `pls.js:843–903`（迴歸 846–856；adj$R^2$ 866；內部 VIF 867–876；$f^2$ 890–897）

★ $R^2=\boldsymbol{\beta}'\mathbf{r}$ 只在**標準化**變數下成立；本引擎的構念分數為單位變異，成立。
★ $f^2$ 的分母當 $1-R^2_{\text{full}}\le 10^{-12}$ 時回傳 `null`（不輸出無意義的巨大值）。`pls.js:894–895`

### 3.6 信度與效度（僅反映型多指標構念）

**標準化 Cronbach's α**（相關矩陣版）：

$$\alpha=\frac{k}{k-1}\left(1-\frac{k}{\sum_{a}\sum_{b}S_{ab}}\right)\ \equiv\ \frac{k\bar{r}}{1+(k-1)\bar{r}}$$

→ `pls.js:911–914`。兩式代數等價（本次已符號驗證，見第 8 節）。

★ **慣例分歧（重要）**：本工具報的是**標準化 α**（以相關矩陣計算），因為 PLS 對標準化資料運算。SPSS 的 `Reliability` 預設輸出的是**原始分數 α**（以共變異數矩陣計算），題目變異數不等時**兩者數值不同**。這是預期差異，不是錯誤。

**rho_A**（Dijkstra & Henseler 2015）：$\hat{\mathbf{w}}$ 先正規化使 $\hat{\mathbf{w}}'\mathbf{S}\hat{\mathbf{w}}=1$，則

$$\rho_A=(\hat{\mathbf{w}}'\hat{\mathbf{w}})^2\cdot\frac{\hat{\mathbf{w}}'\big(\mathbf{S}-\operatorname{diag}\mathbf{S}\big)\hat{\mathbf{w}}}{\hat{\mathbf{w}}'\big(\hat{\mathbf{w}}\hat{\mathbf{w}}'-\operatorname{diag}(\hat{\mathbf{w}}\hat{\mathbf{w}}')\big)\hat{\mathbf{w}}}$$

→ `pls.js:915–929`

**組合信度 rho_c**（Jöreskog 1971）與 **AVE**（Fornell & Larcker 1981）：

$$\rho_c=\frac{(\sum\lambda)^2}{(\sum\lambda)^2+\sum(1-\lambda^2)},\qquad \text{AVE}=\frac{1}{k}\sum\lambda^2$$

→ `pls.js:930–936`

**Fornell-Larcker**：對角線 $\sqrt{\text{AVE}}$、非對角線構念相關。→ `pls.js:1782–1787`

**HTMT**（Henseler, Ringle & Sarstedt 2015）：

$$\text{HTMT}_{ab}=\frac{\bar{r}_{\text{hetero}}}{\sqrt{\bar{r}^{\text{mono}}_{a}\cdot\bar{r}^{\text{mono}}_{b}}}$$

分子為兩區塊間全部指標配對的平均相關，分母為兩區塊各自區塊內平均相關的幾何平均。→ `pls.js:942–968`

★ **單指標構念的慣例**：$k=1$ 時 $\alpha=\rho_A=\rho_c=\text{AVE}=1$（`pls.js:908`），與 SmartPLS 一致；但 UI 顯示為「—」而非 1.000，避免讀者誤以為單題構念信度完美。HTMT 的單指標配對回傳 `null`。

---

## 4. 假設前提與本工具的檢核方式

★ **先講清楚**：PLS-SEM **不在**教學模式的「假設檢核」面板中（`runAssumptionChecks` 對 `pls` 回傳 `null`，`src/lib/assumptionChecker.js:279–291`）。前提檢核散在模型驗證器、引擎與報表三處。下表是實際的對應。

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 結構模型為遞迴（無環） | Kahn 拓撲排序 | **硬擋**，回傳 `invalid-model`，訊息點名循環路徑 | `pls.js:422–451` |
| 無自環 | 逐路徑檢查 | **硬擋** | `pls.js:409` |
| 樣本量下限 | $n<5$ | **硬擋**，`too-few-cases` | `pls.js:2159` |
| 樣本量充足性 | $n<30$ | 警告文字（不擋） | `pls.js:2173` |
| 指標非零變異 | 標準化時檢查 $s_h>0$ | **硬擋**，指名零變異欄位 | `pls.js:1286`、`1274` |
| 形成型指標不高度共線 | 外部 VIF | 報表燈號：< 3.3 綠、< 5 黃、≥ 5 紅（不擋） | `pls.js:1732–1738`；`Result.jsx:110–115` |
| 前置構念不高度共線 | 內部 VIF | 同上 | `pls.js:867–876` |
| 迭代收斂 | 300 次內未達 tol | **硬擋**，`not-converged`，明示「不回傳半成品」 | `pls.js:1447` |
| 測量模式指定正確（反映／形成） | 不自動檢核 | 另由 CTA-PLS 模組以資料檢驗（`pls-cta.md`） | — |
| 指標為連續或近似連續 | **不檢核** | 無警告 | — |
| 推論不需常態假設 | 以 bootstrap 取代 | 不適用 | `pls.js:2377–` |

★ **缺失值**：預設 casewise deletion（整列剔除並回報剔除筆數，`pls.js:2174`）；另支援 pairwise 與均值補值。pairwise 的溯源另見 `pls-pairwise-wpls.md`。

---

## 5. 參考文獻

**方法出處（誰提出的）**

| 文獻 | 對應本文件的哪一段 | 取得狀態 |
|---|---|---|
| Lohmöller, J.-B. (1989). *Latent Variable Path Modeling with Partial Least Squares*. Physica-Verlag. | 3.3 核心迭代、三種 weighting scheme | 【原文未取得】 |
| Wold, H. (1982). Soft modelling: The basic design and some extensions. In K. G. Jöreskog & H. Wold (Eds.), *Systems under Indirect Observation*, Part II. North-Holland. | PLS 路徑模型的原始構想 | 【原文未取得】 |
| Jöreskog, K. G. (1971). Statistical analysis of sets of congeneric tests. *Psychometrika*, 36(2), 109–133. | 3.6 rho_c | 【原文未取得】 |
| Fornell, C., & Larcker, D. F. (1981). Evaluating structural equation models with unobservable variables and measurement error. *Journal of Marketing Research*, 18(1), 39–50. | 3.6 AVE、Fornell-Larcker 判準 | 【原文未取得】 |
| Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Erlbaum. | 3.5 $f^2$ | 【原文未取得】 |
| Dijkstra, T. K., & Henseler, J. (2015). Consistent partial least squares path modeling. *MIS Quarterly*, 39(2), 297–316. | 3.6 rho_A | 【原文未取得】；**卷期頁碼已於 2026-07-26 核實並回寫溯源**，見第 8 節 R2 |
| Henseler, J., Ringle, C. M., & Sarstedt, M. (2015). A new criterion for assessing discriminant validity in variance-based structural equation modeling. *Journal of the Academy of Marketing Science*, 43(1), 115–135. | 3.6 HTMT | 【原文未取得】 |

**程序指引（怎麼做、怎麼判讀）**

| 文獻 | 用途 |
|---|---|
| Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2017/2022). *A Primer on Partial Least Squares Structural Equation Modeling (PLS-SEM)*. Sage. | 判讀門檻（$\lambda\ge.708$、信度 $\ge.70$、AVE $\ge.50$、HTMT $<.85$、$R^2$ 的 .25/.50/.75 參考） |
| SmartPLS 4 官方文件 | 預設值對標（stop criterion $10^{-7}$／300 次、path scheme 預設、單指標構念慣例） |

★ 本節所有文獻**皆未取得原文全文**。列出的卷期頁碼為書目層級資訊；**方程式編號一律未於本文件中宣稱**——第 3 節的公式是對照第三方實作與程式碼寫成的，不是抄自原文的式號。這是 §0 規範下的誠實標註，不是缺漏。

---

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_basic`（29 個欄位）

**tier / status**：tier **B** / **verified**（`provenance.json`）

★ `provenance.json` 的本組三個欄位已於 2026-07-26 精確化（Kevin 核定）：原 `note` 稱「fixture 值為 numpy 手算」不精確、原 `authority` 漏列實際產生 fixture 的 plspm 0.5.7。現行欄位已區分「plspm 產生」與「numpy 手算」兩類量，並收錄本次紅隊的三道驗證。

**對照過的第三方**

| 第三方 | 涵蓋範圍 | 結果 |
|---|---|---|
| **plspm 0.5.7**（Python，沙盒可執行） | loadings、weights、path、$R^2$、LV 相關、cross-loadings | fixture 的**產生來源**；`generate_reference.py:491–581` |
| **seminr 2.5.0**（R，Kevin 本機，Hair 團隊） | loadings／weights／path／$R^2$／adj$R^2$／α／rho_A／rho_c／AVE／HTMT／LV 相關 | 2026-07-13 逐值一致（小數 6 位）。**第二證人** |
| 本文件的第四次獨立編碼（2026-07-26） | 上列全部 29 欄中的 28 欄 | 最大絕對差 **7.2e−8**，見第 8 節 R1 |
| SmartPLS 4 | — | **沒有對照過**（授權過期） |
| cSEM | — | 本組**沒有對照過**（PLSc 組 `pls_plsc` 有） |

**已知的慣例差異及其影響**

1. **權重縮放**：本工具與 fixture 均正規化為 $\hat{\mathbf{w}}'\mathbf{S}\hat{\mathbf{w}}=1$（樣本單位變異）；plspm 原生輸出為母體單位變異。**已在基準產生時正規化後才比對**，不影響任何回報值（相關與負荷量皆為尺度不變量）。
2. **Cronbach's α**：本工具＝標準化 α（相關矩陣版）；SPSS 預設＝原始分數 α。**題目變異數不等時數值不同**，屬預期差異。
3. **ddof**：本工具 z-score 用 ddof=1。因統計量全走相關矩陣，**對回報值零影響**。
4. **單指標構念**：定義上信度為 1；本工具 UI 顯示「—」，SmartPLS 顯示 1.000。呈現差異，非數值差異。

### ★ 尚未驗證的部分（這一節不留白）

1. **原始文獻的方程式編號全部未核對。** 第 5 節七篇方法出處**一篇都沒有取得原文**。本組之所以能標 verified，靠的是「兩個獨立第三方實作（plspm、seminr）數值全中」，**不是**「公式對過原文」。這是 tier B 的本質：抓得到「兩邊抄不一致」，抓不到「兩邊都照同一個誤解實作」。（實務上此風險對本組較低——plspm 與 seminr 由不同團隊、不同語言、不同年代實作。）
2. **收斂準則的跨實作比較未查核。** 本工具用「外部權重最大絕對變化 $<10^{-7}$」。cSEM／seminr 的準則定義形式是否相同、預設值是否相同——**未查**。影響：極端情況下迭代停止點不同，可能造成小數 6 位以後的差異；對已比對過的兩組數值未觀察到影響。
3. ~~區塊內平均相關為負時，HTMT 仍會輸出「通過」的數值。~~ **已於 2026-07-26 修正**（Kevin 裁決：回傳 `null` ＋ 警告），見第 8 節 R3。
4. ~~未反向計分的偵測完全缺席。~~ **已於 2026-07-26 補上引擎層警告**，見第 8 節 R4。燈號本身仍取絕對值（`loadingStatus`，`Result.jsx:102–108`）——這對「整個構念翻轉」是正確的，混雜情形改由警告揭露。
5. **極端邊界未系統性測試**：完全共線的指標（$\mathbf{S}_j$ 奇異）在 Mode B 會回傳 `null` → `not-converged`／估計失敗，但錯誤訊息不會指出「是哪個區塊共線」；此路徑無測試覆蓋。
6. **$n$ 與構念數的比例、10 倍法則**：僅在教學文字中提及，**引擎不檢核**。

---

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 外部負荷量 Loading | 3.4 $\lambda_{jh}$ | `pls.js:1748` |
| 外部權重 Weight | 3.3 (4) 正規化後的 $w_{jh}$ | `pls.js:1752` |
| 外部 VIF | 3.4 $[\mathbf{S}_j^{-1}]_{hh}$ | `pls.js:1732–1738` |
| Cross-loadings | 3.4（走分數） | `pls.js:1757–1762` |
| Cronbach's α | 3.6 標準化 α | `pls.js:911–914` |
| rho_A | 3.6 | `pls.js:915–929` |
| CR (rho_c) | 3.6 | `pls.js:934` |
| AVE | 3.6 | `pls.js:935` |
| Fornell-Larcker 對角線 | $\sqrt{\text{AVE}}$ | `pls.js:1782–1787` |
| Fornell-Larcker 非對角線 | 3.4 $r(y_a,y_b)$ | 同上 |
| HTMT | 3.6 | `pls.js:942–968` |
| 路徑係數 | 3.5 $\boldsymbol{\beta}$ | `pls.js:853` |
| $R^2$ | 3.5 | `pls.js:854` |
| 調整後 $R^2$ | 3.5 | `pls.js:866` |
| $f^2$ | 3.5 | `pls.js:890–897` |
| 內部 VIF | 3.5 | `pls.js:867–876` |
| 構念分數 | 3.3 (7) | `pls.js:824–838` |
| 迭代次數／收斂狀態 | 3.3 (5) | `pls.js:1857` |
| weighting scheme／tolerance／maxIterations | 3.3 | `pls.js:1855–1856` |

**孤兒欄位檢查**：本次逐欄比對 `reportFromStage` 的回傳物件（`pls.js:1851–1875`），未發現無公式對應的欄位。`itCriteria`（AIC／AICc／BIC／HQ）雖在同一函式內計算（`pls.js:878–889`），但屬 `pls_itcriteria` 的職責，於該文件說明。

---

## 8. 紅隊檢核紀錄

**日期**：2026-07-26　**執行者**：Claude（Cowork）＋ Kevin　**批次**：階段 A 試點（A1 先行）

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | 見 R1；**通過**（含一處代數等價性驗證） |
| 2 | authority 是否真的支持該公式 | 見 R2；**發現 2 項** |
| 3 | 文獻真實性 | 見 R2；**發現 1 項** |
| 4 | 報表可追溯 | **通過**（第 7 節，無孤兒欄位） |
| 5 | 假設前提 | **通過但有缺口**（第 4 節；PLS 不在假設檢核面板，已明記） |
| 6 | 慣例分歧 | **通過**（第 6 節列 4 項；跨實作收斂準則未查，已標註） |
| 7 | 邊界條件 | 見 R3、R4；**發現 2 項** |
| 8 | APA 敘述句 | 見 R5；**發現 1 項** |

### R1（通過）逐式核對與第四次獨立編碼

第 3 節每一條公式都已回到程式碼定位（行號見各式後方），符號與運算順序逐項相符。另外做了兩件超出「對照」的事：

- **代數等價驗證**：`pls.js:914` 的 $\frac{k}{k-1}(1-\frac{k}{\sum S})$ 與教科書式 $\frac{k\bar r}{1+(k-1)\bar r}$ 代數等價（$\sum S = k+k(k-1)\bar r$ 代入即得）；數值上差 0.00e+00 / 1.11e−16。
- **獨立重寫**：依第 3 節的**文字描述**（不看 `pls.js`）以 numpy 重寫整條 Lohmöller 迭代，對 `pls_basic` 的 28 個純量欄位比對，**最大絕對差 7.15e−8**（迭代 17 次收斂；殘差量級與 plspm 的迭代容差相符）。
  ⇒ 意義：這證明**第 3 節寫的公式，確實就是產生基準值的那組公式**——文件與實作之間沒有漂移。

### R2（L1＋L3｜已核定並修正）rho_A 的引用出處誤植

`pls.js` 檔頭、`generate_reference.py` 與 `reference.json` 均將 rho_A 記為
**「Dijkstra & Henseler 2015, *Psychometrika* 80(2) 式 12」**。經 2026-07-26 查核：

- Dijkstra & Henseler (2015) 有兩篇：*Computational Statistics & Data Analysis*, 81, 10–23；以及 *MIS Quarterly*, 39(2), 297–316。**沒有 Psychometrika 80(2) 這一篇。**
- Hair 團隊自家的 seminr 套件在 `rho_A` 的說明文件中，引的是 **MIS Quarterly, 39(2)**。
- 推測誤植來源：Dijkstra & Schermelleh-Engel (2014), *Psychometrika*, 79(4)（不同共同作者、不同年份）。
- **「式 12」的編號無法核實**（MISQ 原文未取得）；seminr 文件另有指向「equation 3」的說法。

出現位置共 5 處：`pls.js:41`、`pls.js:45`、`generate_reference.py:484`、`:589`、`:783`，以及 `reference.json:490`（`pls_plsc` 的 `source` 字串）。

**處置（Kevin 2026-07-26 核定，已執行）**：卷期改為 *MIS Quarterly*, 39(2), 297–316，式號刪除並改標「方程式編號待原文核定」。
`pls.js:41`／`:45`、`generate_reference.py:484`／`:589`／`:783` 已改（L1）；`reference.json` 的 `pls_plsc` source 字串經**完整重生** fixture 更新（L3 核定）——重生後 diff 只有該一行，82 組數值與 `datasets.json` 逐位元相同。

### R3（L3｜已核定並修正）區塊內平均相關為負時，HTMT 輸出可通過的數值

`pls.js:963–964` 的分母為 $\sqrt{\bar r^{\text{mono}}_a\cdot\bar r^{\text{mono}}_b}$。當**兩個**區塊的區塊內平均相關**都是負的**時，乘積為正、開根號有實數解，函式回傳一個有限數值；`Number.isFinite(denom) && denom > 0` 的守衛擋不住這條路徑。（只有**一個**區塊為負時，開根號得 NaN，守衛正確回傳 `null`。）

**實測**（沙盒，n=80 合成資料，每個構念含一題未反向計分）：

```
HTMT(F1,F2) = 0.083     ← UI 顯示綠燈「區辨效度通過」
α(F1) = −1.81（紅） rho_A = 0.926（綠） CR = 0.690（紅） AVE = 0.871（綠）
loadings = +0.923, −0.937, +0.940（三個全綠，因燈號取絕對值）
warnings = []           ← 完全沒有警告
```

使用者看到的是「兩紅四綠、零警告」，而真正的診斷（有題目沒反向計分）沒有任何地方講出來。

**處置（Kevin 2026-07-26 核定，已執行）**：$\bar r^{\text{mono}}\le 0$ 時 HTMT 回傳 `null`（與其他不合格配對一致），並在引擎層加一條警告說明原因。
→ `pls.js:956–958`（守衛）、`pls.js:1792–1808`（警告）。既有 fixture 無此情境，重生後數值零變動；新增 4 條行為測試（`tests/pls.test.js` 末節），其中一條鎖住 `pls_basic` 的 HTMT 不受守衛影響。

### R4（L2｜已核定並修正）未反向計分無任何偵測

`loadingStatus`（`Result.jsx:102–108`）以 `Math.abs(l)` 判燈號。這對「整個構念翻轉」是正確的（符號不確定性確實是區塊層級），但對「**區塊內正負混雜**」就過寬——後者不是符號不確定性，是資料錯誤。

**處置（Kevin 2026-07-26 核定，已執行）**：任一反映型區塊內同時存在正負負荷量時，發出警告指名構念與「反向題未事先反向計分」這個最常見原因。不動任何數值。
→ `pls.js:1792–1799`。與 R3 在同一個迴圈內實作（同一病灶的兩面）。

### R5（L2｜已核定並修正）APA 敘述句的宣稱範圍

`apaNarrative.js` 產生的句子（`zh-TW.js` 的 `pls.apa`，第 3291 行起）敘述 scheme、$N$、PLSc 與測量模型摘要。本次未發現過度宣稱。

**一個可議之處**：句子未載明「Cronbach's α 為標準化 α」。讀者若拿此句與 SPSS 報表對照會對不上（見第 6 節慣例差異 2）。
**處置（Kevin 2026-07-26 核定，已執行）**：中文敘述句補「（標準化 α）」（`zh-TW.js:3301`），英文改為 `standardized Cronbach's α`（`en.js:3243`）。
★ **本項動到 `src/i18n/**` → 依 §8.2 必須在 Kevin 本機補跑 jsdom 測試**（沙盒跑不動）。

### 待辦編號

本次開出 **R2（L1＋L3）／R3（L3）／R4（L2）／R5（L2）** 四項，Kevin 於 2026-07-26 全數核定，**當日全部執行完畢**；紀錄同步登入 `roadmap-v2.md §6.6`。

**驗收**：`tests/pls.test.js` 174 過（170 → 174）；`generate_reference.py` 完整重生後 `reference.json` 僅一行注釋字串變動、`datasets.json` 逐位元相同。
**待 Kevin 本機補驗**：5 個 `ui.*.test.jsx`（本次動到 `src/i18n/**`）。

---

*本文件為階段 A 產出。方法索引見 `docs/methods/README.md`。*
