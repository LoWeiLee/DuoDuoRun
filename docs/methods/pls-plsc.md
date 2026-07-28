# 一致化 PLS（Consistent PLS, PLSc）

> 方法代號 `pls_plsc`、`pls_plsc_pw`｜基準組 `reference.json → pls_plsc`（22 欄）、`pls_plsc_pw`（22 欄）｜溯源 tier **B** / verified
> 最後更新：2026-07-26（階段 A；本組查出並修正一個 L4）

---

## 1. 這個方法在回答什麼問題

一般 PLS-SEM 用指標的加權和當構念分數。加權和裡含有測量誤差，所以兩個構念分數之間的相關
會**系統性小於**兩個「真值」之間的相關——這叫**衰減（attenuation）**。後果是路徑係數低估。

PLSc 回答的是：**如果把測量誤差造成的衰減除掉，路徑係數會是多少**。做法是用構念的信度
（$\rho_A$）把構念相關反除回去，再用校正後的相關矩陣重解結構模型。

結果是：PLSc 的路徑係數會趨近 CB-SEM（共同因素模型）的一致估計，同時保留 PLS 的計算特性
（不需要多變量常態、能處理複雜模型、小樣本可跑）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 研究定位是**理論驗證**：你要談的是「構念之間的真實關係有多強」，而不是「用這些題目預測得多好」
- 反映型（共同因素）測量模型，且信度不是特別高（信度越低、衰減越嚴重、校正的意義越大）
- 想把 PLS 的結果與 CB-SEM 文獻對接

**不該用**

- 研究定位是**預測**：預測要用實際會算出來的分數，把它「校正」成看不到的真值反而失焦
- 構念本來就是**組合（composite）**、不是共同因素：形成型構念沒有「衰減」可言（本工具不校正它）
- 小樣本又低信度：$\rho_A$ 本身是估計值，會不穩；分母不穩會把路徑推到 $|r|>1$（見 §3.4）

**常見誤用（三條）**

1. **兩套結果挑好看的報。** 開 PLSc 路徑通常變大，這不是「模型變好」，是換了估計目標。
   選擇必須在**看結果之前**由研究定位決定，並在方法章寫明。
2. **看到一致 loading > 1 就當成 bug。** 小樣本或低信度時這是預期會發生的事（見 §3.4）；
   本工具依 cSEM 慣例**警告但不截斷**——截斷會讓數字看起來乾淨卻掩蓋掉模型有問題的訊號。
3. **與調節／高階構念併用。** 本工具直接擋（`plsc-w4-not-supported`）：two-stage 的第二階段
   以第一階段分數為單指標構念，$\rho_A$ 在該層無定義。

## 3. 公式與定義

### 3.1 一致化係數 $c^2$ 與一致 loadings

對每個**反映型多指標**構念 $j$（$\hat{\mathbf{w}}$ 已滿足 $\hat{\mathbf{w}}'\mathbf{S}\hat{\mathbf{w}}=1$）：

$$c^2=\frac{\hat{\mathbf{w}}'\big(\mathbf{S}-\operatorname{diag}\mathbf{S}\big)\hat{\mathbf{w}}}{\hat{\mathbf{w}}'\big(\hat{\mathbf{w}}\hat{\mathbf{w}}'-\operatorname{diag}(\hat{\mathbf{w}}\hat{\mathbf{w}}')\big)\hat{\mathbf{w}}},\qquad \hat{\boldsymbol{\lambda}}=c\cdot\hat{\mathbf{w}}$$

→ `src/lib/stats/pls.js:1002–1018`（$c^2$ 於 `1012`，一致 loadings 於 `1014`）

直覺：分子是區塊內**非對角**的加權共變異（＝共同因素該解釋的部分），分母是同一組權重下的
「若全由單一因素驅動」應有的量。兩者的比值就是衰減倍率的平方。

### 3.2 $\rho_A$ 與反衰減

$$\rho_{A,j}=(\hat{\mathbf{w}}'\hat{\mathbf{w}})^2\cdot c^2,\qquad q_j=\sqrt{\rho_{A,j}}$$

$$r^{c}_{ab}=\frac{r_{ab}}{q_a\,q_b}\quad(a\neq b),\qquad r^{c}_{aa}=1$$

→ `pls.js:1019`（$\rho_A$）、`1022`（反衰減後的構念相關矩陣）

★ 這與 `pls-reliability-validity.md` §3.2 的 $\rho_A$ **是同一個量**——那裡由 `blockReliability`
直接算，這裡由 $c^2$ 導出。兩條路徑代數等價（$\rho_A=(\hat{\mathbf{w}}'\hat{\mathbf{w}})^2\cdot c^2$ 展開即得），
這也是 `pls.js:1834–1840` 之所以能「$\alpha$ 與 $\rho_A$ 本身不因 PLSc 而變」的原因。

### 3.3 ★ 區塊相關矩陣的來源（本組的關鍵口徑）

$\mathbf{S}$ **一律取自迭代所用的相關矩陣** `spec.corrMatrix`（存在時），只有完整資料
（`spec.corrMatrix` 為 `undefined`）才回到欄位相關。

→ `pls.js:989`（取得）、`995–997`（使用）

為什麼要特別寫一節：pairwise deletion 下欄位是補值過的（NaN→0，＝原尺度均值補值）、
WPLS 下欄位是未加權標準化的，兩者的欄位相關**都不等於**該模式真正的相關矩陣。
這裡取錯矩陣的後果是 $\rho_A$、$c^2$、一致 loadings 與所有 PLSc 路徑全錯——
**2026-07-26 之前的版本正是取錯的**，詳見第 8 節 R6。

### 3.4 不截斷的兩個警告

| 情況 | 判斷式 | 行為 |
|---|---|---|
| $c^2\le 0$ 或分母退化 | `den > 1e-12 && num/den > 0` 不成立 | 該構念**改用未校正估計**＋警告 |
| 任一一致 loading 的 $|\hat\lambda|>1$ | 逐項檢查 | **警告不截斷** |
| 任一 $|r^{c}_{ab}|>1$ | 逐對檢查 | **警告不截斷**，並提示校正後矩陣可能非正定 |

→ `pls.js:1012–1014`（$c^2$ 退化）、`1017–1019`（loading > 1）、`1023–1031`（相關 > 1）

★ 「不截斷」是刻意的：$|\hat\lambda|>1$ 或 $|r^c|>1$ 是「資料不支持這個共同因素模型」的訊號，
截斷成 1 會讓報表看起來正常。對齊 cSEM 的慣例。

### 3.5 PLSc 下改變與不改變的量

| 量 | 是否改用校正值 | 位置 |
|---|---|---|
| 外部 loadings | ✅ 一致 loadings | `pls.js:1018` |
| 外部 weights | ❌ 不變 | — |
| 構念相關 / Fornell-Larcker 非對角 | ✅ 反衰減後 | `pls.js:1026` |
| 路徑係數 / $R^2$ / $f^2$ / 內部 VIF | ✅（全部改用校正後相關矩陣重解） | `pls.js:1230–1235` |
| CR (rho_c) / AVE | ✅ 改用一致 loadings | `pls.js:1834–1840` |
| Cronbach's α / $\rho_A$ | ❌ 本身不變 | `pls.js:1834` |
| HTMT | ❌ 走原始指標相關 | `pls.js:1852–1853` |
| Model fit | ✅ 用一致 loadings 與校正後構念相關 | `pls.js:1910–1900` |
| bootstrap | ✅ 每次重抽都含校正（consistent bootstrapping） | `pls.js:2473–2754` |

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 反映型（共同因素）測量 | 只校正 `mode='reflective'` 且 $k\ge2$ 的區塊 | 形成型與單指標的衰減係數視為 1（不校正） | `pls.js:997` |
| 不與調節／高階構念併用 | 建模階段檢查 | **硬擋** `plsc-w4-not-supported` | `pls.js:1354–1359` |
| $c^2>0$ | 逐構念檢查 | 該構念退回未校正＋警告 | `pls.js:1012–1014` |
| 校正後矩陣正定 | Model fit 階段檢查 | $d_G$／NFI 回 `null`＋警告 | `pls.js:1910–1897` |
| 信度足夠使 $\rho_A$ 穩定 | **不檢核** | 無警告（見第 6 節） | — |
| 其餘 | 同 `pls-basic.md` §4 | | |

★ blindfolding Q² 一律以 composite 估計計算（`consistent: false` 強制覆寫，`pls.js:2333`）——
Q² 是預測導向指標，用校正後的「真值」算預測誤差沒有意義。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Dijkstra, T. K., & Henseler, J. (2015). Consistent partial least squares path modeling. *MIS Quarterly*, 39(2), 297–316. | 3.1–3.2 全部 | 【原文未取得】；卷期頁碼已於 2026-07-26 核實（見 `pls-basic.md` §8 R2） |
| Dijkstra, T. K., & Henseler, J. (2015). Consistent and asymptotically normal PLS estimators for linear structural equations. *Computational Statistics & Data Analysis*, 81, 10–23. | 3.1–3.2 的統計性質（一致性與漸近常態） | 【原文未取得】 |
| Dijkstra, T. K., & Schermelleh-Engel, K. (2014). Consistent partial least squares for nonlinear structural equation models. *Psychometrika*, 79(4), 585–604. | 非線性延伸（本工具**未**實作） | 【原文未取得】。★ 列出它的理由：本專案原先把 $\rho_A$ 誤記為「Psychometrika 80(2)」，推測即與本篇混淆 |

**程序指引**

| 文獻 | 用途 |
|---|---|
| cSEM（R 套件，Henseler 團隊） | 「不截斷」慣例的對照來源；本工具 `pls_plsc` 的基準即對 cSEM 0.6.1 逐值 |

★ 方法出處**全部未取得原文**；第 3 節公式**不宣稱任何方程式編號**。
$\rho_A$ 的式號在文獻與第三方文件中說法不一（seminr 說明文件指向 equation 3），待原文核定。

## 6. 對照與驗證狀態

**基準組**：`pls_plsc`（完整資料、M4 四構念模型，22 欄）、`pls_plsc_pw`（pairwise 與 WPLS 各 11 欄，2026-07-26 新增）

**tier / status**：兩組皆 tier **B** / **verified**

**對照過的第三方**

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| **cSEM 0.6.1**（R，本機，Henseler 團隊） | `pls_plsc`：$\rho_A$、一致 loadings（含 $i_2=1.152>1$）、校正後路徑、$R^2$ | 2026-07-13 逐值一致；「$\rho_A>1$ 不截斷」的行為亦同步 |
| 本文件的獨立重寫（2026-07-26） | `pls_plsc` 22 欄 | 最大絕對差 **1.6e−15** |
| pandas／statsmodels／numpy | `pls_plsc_pw` 的**底層相關矩陣**（pairwise-complete 與加權相關） | <1e−12，重生時 assert（見 `pls-pairwise-wpls.md`） |
| cSEM 對 `pls_plsc_pw` | — | **不可能對照**：cSEM 的 PLSc 不支援 pairwise deletion 與抽樣權重 |
| SmartPLS 4 | — | **沒有對照過**（授權過期；SmartPLS 4 亦不提供 PLSc） |

**已知的慣例差異**

1. **不截斷**：一致 loading 或校正後相關超過 1 時警告不截斷（對齊 cSEM）。部分實作會截斷。
2. **$\rho_A$ 的兩條計算路徑**：本工具在信效度表由 `blockReliability` 算、在 PLSc 由 $c^2$ 導出，
   代數等價（§3.2）。這也是 PLSc 開啟時 $\rho_A$ 報表值不變的原因。
3. **Q² 不套用 PLSc**：強制 composite（§4）。

### ★ 尚未驗證的部分

1. **原文未取得，方程式編號未核對。** 本組的 verified 建立在「對 cSEM 逐值一致」，
   而 cSEM 是 Henseler 本人團隊的實作——這是能取得的最強對照，但仍不是原文逐式核對。
2. **`pls_plsc_pw` 沒有任何第三方數值對照**（cSEM 不支援該組合）。它的防線是
   **結構性 assert**（「PLSc 的 $\mathbf{S}$ 必等於迭代所用的 $\mathbf{R}$」，重生時檢查，容差 1e−12）
   ＋ JS↔numpy 逐值。這鎖得住「實作退回錯的矩陣」，鎖不住「這個組合在統計上該不該這樣做」。
3. **PLSc 在 pairwise-complete 相關矩陣上的統計性質無文獻依據。** 該矩陣的各格來自不同子樣本，
   可能非正定（本資料集實測最小特徵值為正，見 `pls_pairwise_wpls.pw_minEig`）。
   $\rho_A$ 反衰減在這種矩陣上是否仍有一致性，**查不到文獻，本工具不宣稱**。
4. **$\rho_A$ 反衰減在加權樣本（WPLS）下的推論性質同樣無文獻依據。** 另注意 WPLS 的 bootstrap
   仍以未加權方式重抽（見 `pls-pairwise-wpls.md` §6）。
5. **小樣本下 $\rho_A$ 的不穩定程度未量化**：已知會導致 $|r^c|>1$，但沒有模擬給出「n 多少以下要小心」。
6. **MGA × PLSc 的組合**已有行為測試鎖住（點估計、bootstrap SE、permutation 分布皆走校正後矩陣），
   但**沒有數值基準組**（見 `provenance.json → pls_plsc` 的 2026-07-25 補記）。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 外部負荷量（PLSc 開啟時） | 3.1 $\hat\lambda=c\hat w$ | `pls.js:1018` |
| rho_A（PLSc 區塊） | 3.2 | `pls.js:1019` |
| 構念相關矩陣 | 3.2 $r^c$ | `pls.js:1026` |
| Fornell-Larcker 非對角 | 3.2 | `pls.js:1845–1850` |
| Fornell-Larcker 對角（$\sqrt{\text{AVE}}$） | 3.5（改用一致 loadings） | `pls.js:1834–1840` |
| CR / AVE | 3.5 | `pls.js:1834–1840` |
| 路徑係數 / $R^2$ / $f^2$ / 內部 VIF | 3.5（校正後矩陣重解） | `pls.js:1230–1235` |
| 設定行的「PLSc 已啟用」標記 | — | `zh-TW.js` 的 `pls.result.plscTag` |
| 三種警告 | 3.4 | `pls.js:1012–1014`、`1017–1019`、`1023–1031` |

**孤兒欄位檢查**：`report.plsc.rhoA` 是 PLSc 專屬的唯一額外欄位，對應 §3.2。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（含獨立重寫 1.6e−15） |
| 2 | authority 是否支持該公式 | **發現 1 項**（卷期誤植，已於 `pls-basic.md` R2 一併修） |
| 3 | 文獻真實性 | 同上；全部未取得原文，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**（W4 併用有硬擋；信度穩定性未檢核，已列入第 6 節） |
| 6 | 慣例分歧 | **通過**（第 6 節列 3 項） |
| 7 | 邊界條件 | **★ 發現 L4，見 R6** |
| 8 | APA 敘述句 | **通過**（PLSc 開啟時句子明確加註「consistent PLS（PLSc）校正」） |

### ★ R6（L4，已修）PLSc 與 pairwise／WPLS 併用時，一致化走錯相關矩陣

**位置**：`pls.js:999`（`plscAdjust`），修正前為

```js
const S = b.map((a) => b.map((c) => (a === c ? 1 : corrOf(cols[a], cols[c]))))
```

它從**欄位**重算區塊相關矩陣。但 pairwise 模式下欄位是補值的（NaN→0），WPLS 模式下是未加權的，
真正的相關矩陣在 `spec.corrMatrix`。引擎其他每一處都走 `spec.corrMatrix`
（`pls.js:814`、`1197`、`1737–1740`），**只有 `plscAdjust` 漏了**。

**數值後果**（既有 `pw` 遮罩資料，缺失率約 11.4%）：

| | rho_A F1 | rho_A F2 | path F1→F2 | $R^2$ |
|---|---|---|---|---|
| 設計應為（走 pairwise R） | 0.7945 | 0.7979 | 0.4252 | 0.1808 |
| **修正前的引擎回報** | **0.7025** | **0.6460** | **0.5026** | **0.2526** |

$\rho_A$ 低估 0.09–0.15——**跨過 .70 判準門檻**（0.646 判紅、正確值 0.798 判綠）。
PLSc 把構念相關除以 $q_aq_b$ 反衰減，分母被低估 → 路徑高估約 18%。WPLS 模式同樣，低估約 0.10。

**可達性**：兩者都是 UI 選項，修正前沒有互斥守衛也沒有任何警告。

**為什麼能活到現在**：**沒有任何基準組涵蓋「PLSc × pairwise／WPLS」這個組合**。
這正是 §0 溯源規範的反面教材——不是公式讀錯，而是**組合未被基準覆蓋**。

**處置（Kevin 2026-07-26 核定，已執行）**

1. `plscAdjust` 改走 `spec.corrMatrix`（`pls.js:989`、`995–997`）。完整資料時 `spec.corrMatrix`
   為 `undefined`，回到欄位相關 → **`pls_plsc` 基準組與既有測試逐位元不變**。
2. 新增基準組 **`pls_plsc_pw`**（22 欄），並在 `generate_reference.py` 下**結構性 assert**：
   由迭代所用 $\mathbf{R}$ 的區塊子矩陣重算 $\rho_A$ 必須逐位元（1e−12）等於本組值——
   後人若把 `plscAdjust` 改回由欄位重算就會紅燈。
3. 新增 6 條行為測試（`tests/pls.test.js` 末節），含一條「$\rho_{A,F2}>0.75$」
   直接鎖住「不會再退回未達 .70 判準的那一側」。

### R2（併入 `pls-basic.md`）rho_A 引用出處誤植

`pls.js` 檔頭與 `generate_reference.py` 原將 $\rho_A$ 記為「Dijkstra & Henseler 2015, *Psychometrika* 80(2) 式 12」；
該卷期不存在。已改為 MISQ 39(2), 297–316 並刪除未能核實的式號。完整查核見 `pls-basic.md` §8 R2。

### 待辦編號

本組開出 **R6（L4，已修）**。同批另見 `pls-formative.md` 的 **R7（L2／L3，待裁決）**。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
