# 驗證性四分差分析 CTA-PLS（Confirmatory tetrad analysis）

> 方法代號 `pls_cta`｜基準組 `reference.json → pls_cta`（50 個統計量；固定重抽索引存於 `datasets.json:cta.boot`）｜溯源 tier **B** / verified（帶明文保留）
> 最後更新：2026-07-29（階段 A / A3c）

---

## 1. 這個方法在回答什麼問題

「這個構念的指標是**反映型**還是**形成型**？」——這個問題通常靠理論回答，
而 CTA-PLS 提供了**資料端的證據**。

反映型（共同因子）模型說的是：構念是因、指標是果，指標之間的相關**全部來自那個共同因子**。
這件事會在相關矩陣上留下可檢驗的痕跡：**tetrad 消失**。

對四個指標 $g,h,i,j$，tetrad 定義為兩組共變異數乘積的差：

$$\tau_{ghij}=\sigma_{gh}\sigma_{ij}-\sigma_{gi}\sigma_{hj}$$

若四個指標都由同一個因子產生（$\sigma_{ab}=\lambda_a\lambda_b$），代入即得

$$\tau_{ghij}=\lambda_g\lambda_h\lambda_i\lambda_j-\lambda_g\lambda_i\lambda_h\lambda_j=0$$

⇒ **反映型模型隱含所有 model-implied tetrad 為 0。**
反過來，某個 tetrad 顯著不為 0，就構成「這批指標不是由單一共同因子產生」的證據——
反映型設定被**否證**，該構念應考慮改採形成型。

★ **這是否證，不是證成。** CTA 拒絕反映型，**不等於**支持你手上那組形成型指標。
形成型的內容效度仍然要靠理論與專家判斷（工具的 APA 敘述句有把這句話寫進去）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 測量模式的宣告有爭議（審稿人問「你憑什麼說這是反映型」）
- 借用他人量表但改寫過題目，不確定原本的反映型結構是否還成立
- 構念在概念上像「綜合指數」（滿意度、社會經濟地位、企業績效），但沿用了反映型的處理

**不該用**

- ★ **指標少於 4 個**：數學上不存在 tetrad。本工具**明確列入 `skipped` 並說明原因**，不靜默略過
- **樣本很小**：bootstrap 的 bias 與 SE 都不穩。$n<30$ 時工具會產生警告
  （★ **但目前看不到，見第 8 節 R35-a**）
- 含調節項或高階構念的模型：**直接擋**（`rejectW4`，`pls.js:3767–3768`）
- **拿它當唯一依據改設定**：測量模式是理論決策，CTA 是證據之一

**常見誤用**

1. ★ **把「tetrad 不消失」讀成「指標很爛」。** 它說的是**不是單一共同因子**——
   可能是多維度、可能有方法效應、也可能真的是形成型。CTA 分不出這三者
2. **反過來把「全部消失」讀成「測量沒問題」。** 不拒絕只代表沒有反證；
   低樣本、低檢定力下 tetrad 幾乎不可能顯著
3. ★ **拿不同指標順序跑出來的 tetrad 表互相比較。** 本工具的非冗餘選取集**取決於指標宣告順序**
   （實測見 §3.2）。整體判讀等價，但**表上的那幾個 tetrad 不是同一組**
4. **忽略 Bonferroni 的層級。** 校正是在**單一構念內**做的，不跨構念。
   同時檢定多個構念時，構念層的族系錯誤率**未被控制**
5. **把 CTA 的結論套到整個量表。** 判讀是逐構念的

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $k$ | 該構念的指標數（$\ge4$ 才可檢定） |
| $T$ | 該構念的非冗餘 tetrad 數，$T=k(k-3)/2$ |
| $\sigma_{ab}$ | 兩指標的相關（本工具在**相關矩陣**上算，見下） |
| $\hat\tau_q$ | 第 $q$ 個 tetrad 的觀察值 |
| $B$ | bootstrap 次數（預設 5000；基準與測試注入 300） |
| $\alpha$ | 族系錯誤率（預設 .05）；$\alpha'=\alpha/T$ 為 Bonferroni 後的個別水準 |

★ **本工具用相關矩陣而非共變異數矩陣。** tetrad 的消失性質對**尺度變換不變**
（每個指標乘上常數，兩項乘積同時縮放），所以兩者的**判讀等價**；但**數值不同**，
拿本工具的 $\hat\tau$ 去對共變異數版的實作會對不上。→ `pls.js:3721–3735`（`corrMatrixOf`）

### 3.2 非冗餘 tetrad 的選取

$k$ 個指標共有 $\binom{k}{4}\times3$ 個 tetrad，但它們**高度冗餘**——
彼此可由代數替換互推。真正獨立的約束數為

$$\underbrace{\frac{k(k-1)}{2}}_{\text{共變異數個數}}-\underbrace{k}_{\text{loading 個數}}=\frac{k(k-3)}{2}=T$$

**本工具的構造（「逐一加入指標」，確定性）**：加入第 $m$ 個指標時新增 $(m-1)$ 個共變異數
與 1 個 loading ⇒ 新增 $(m-2)$ 個約束。取法為 $\{0,1,2,m\}$ 上 2 個獨立 tetrad
＋ 對 $c=3\ldots m-1$ 各取 $\{0,1,c,m\}$ 一個。→ `pls.js:3703–3712`

實測數量（$k=4\ldots8$）：**2 / 5 / 9 / 14 / 20**，與 $k(k-3)/2$ 逐一相符。

★ ★ **選取集取決於指標的宣告順序。** 構造固定以「第 0、第 1 個指標」為軸，
所以**每一個 tetrad 都含前兩個指標**。實測同一構念三種宣告順序：

| 宣告順序 | 表上的 5 個 tetrad | 判讀 |
|---|---|---|
| cr1,cr2,cr3,cr4,cr5 | −0.0359 / 0.0734 / −0.0793 / −0.0978 / 0.0385 | reflective |
| cr5,cr4,cr3,cr2,cr1 | 0.0577 / 0.0015 / 0.0931 / −0.0150 / 0.0385 | reflective |
| cr3,cr5,cr1,cr4,cr2 | −0.0931 / −0.1081 / −0.0793 / −0.0978 / −0.0562 | reflective |

⇒ **整體判讀三次一致**（理論上任一極大獨立子集張成相同的約束空間），
但**表上列出的是不同的 tetrad**。這是 UI 上使用者可觸及的行為（指標順序由使用者宣告），
目前 UI **未說明**這件事。

★ **極大獨立性的驗證**：基準生成端（`generate_reference.py:1787–1803`）對選取集的
Jacobian 取秩，assert 秩等於 $T$。這是「數量對 ≠ 真的獨立」的把關。

### 3.3 bootstrap 與偏誤校正信賴區間

每次重抽**個案**（不是重抽 tetrad），重算相關矩陣、重算全部 tetrad。→ `pls.js:3849–3858`

$$\hat b_q=\overline{\hat\tau^{*}_q}-\hat\tau_q\ (\text{偏誤}),\qquad
\hat v_q^{1/2}=\text{sd}(\hat\tau^{*}_q)\ (\text{ddof}=1)$$

$$\boxed{\ \text{CI}_q=(\hat\tau_q-\hat b_q)\ \pm\ z_{1-\alpha/(2T)}\cdot \hat v_q^{1/2}\ }$$

→ `pls.js:3860`（$z$）、`3865`（bias）、`3866`（SE）、`3867–3869`（CI）

★ ★ **分位數用常態 $z$，不是 Student $t$。** Gudergan et al. (2008) Eq. (2) 明確寫 $z_{1-\alpha/2}$。
**Session Q2 的審計就是抓到這一點**——原實作用 $t(\mathrm{df}=B-1)$，改為 $z$ 後 CI 縮 0.64%，
判讀結論不變，欄位 `tCrit` 更名為 `zCrit`（見第 6 節）。
$\mathrm{df}=B-1$ 在理論上站不住腳：$B$ 是重抽次數，不是樣本數。

★ **Bonferroni 施加在「單一測量模型內」**（Gudergan Step 5，引 Bollen 1990, p. 88）：
$T$ 是**該構念**的 tetrad 數，不是全模型的。實測 $\alpha=.05$：
CR（$T=5$）$\alpha'=.01$、$z=2.5758$；CM（$T=2$）$\alpha'=.025$、$z=2.2414$——**兩個區塊的臨界值不同**。

### 3.4 判讀

$$\text{該 tetrad 不消失}\iff 0\notin\text{CI}_q,\qquad
\text{verdict}=\begin{cases}\text{formative} & \#\{\text{不消失}\}>0\\ \text{reflective} & \text{否則}\end{cases}$$

→ `pls.js:3870`（逐 tetrad）、`3894`（構念層）

**宣告與判讀不一致**時另立 `conflict` 旗標，報表以警示框提示（`pls.js:3896`）。

★ **這是 omnibus 判讀**：只要有一個 tetrad 不消失就否證。所以 $T$ 越大、Bonferroni 越嚴，
**大構念（$k$ 大）反而更難被否證**——這是多重比較校正的代價，工具未就此提醒。

### 3.5 引擎另有回傳但不使用的 $t$ 與 $p$

`pls.js:3878–3879` 另算了 $t=\hat\tau_q/\hat v_q^{1/2}$ 與 $p=2(1-F_{t,B-1}(|t|))$。
**這兩欄不進基準、不進報表、不進敘述句**，且 $p$ **未做 Bonferroni 校正**、
沿用已被 §3.3 判定為無依據的 $\mathrm{df}=B-1$。見第 8 節 R35-b。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 不含調節／高階構念 | `rejectW4` | **硬擋** | `pls.js:3767–3768` |
| $0<\alpha<1$ | 範圍檢查 | **硬擋** `cta-bad-alpha`，訊息含收到的值 | `pls.js:3776–3779` |
| ★ 構念指標 $\ge4$ | 逐構念計數 | **不擋**：列入 `skipped` 並**逐構念給中文理由**；報表另立說明框 | `pls.js:3782–3788` |
| 至少一個合格構念 | 計數 | **硬擋** `cta-no-eligible-construct`，訊息**列出每個構念的指標數** | `pls.js:3790–3795` |
| $n\ge10$ | 剔除後計數 | **硬擋** `too-few-cases` | `pls.js:3801–3803` |
| 注入重抽索引合法 | 二維、非空、每組長度 $=n$ | **硬擋** `cta-bad-bootstrap-indices` | `pls.js:3807–3814` |
| $B\ge100$ 且為整數 | 型別與範圍 | **硬擋** `cta-too-few-bootstrap` | `pls.js:3817–3819` |
| $n\ge30$（推論穩定性） | 計數 | **警告**——★ 2026-07-29 起**確實顯示於報表**（R35-a） | `pls.js:3901`、`Result.jsx:1849–1853` |
| **缺失值** | 一律 casewise | **警告**——★ 2026-07-29 起**確實顯示於報表**（R35-a） | `pls.js:3902`、`Result.jsx:1849–1853` |

★ **本方法沒有分布假設**：Gudergan et al. 明確選擇 **bootstrap on raw data 而非常態近似**
（引 Davison & Hinkley 1997）。唯一的分布性成分是 CI 用了常態分位數 $z$，
那是對 **bootstrap 抽樣分布**的常態近似，不是對資料的假設。

★ **指標之間的線性相關是隱含前提**：tetrad 建立在共變異數結構上，
對非線性關係、離群值敏感。工具**不檢核**這兩項。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Gudergan, S. P., Ringle, C. M., Wende, S., & Will, A. (2008). Confirmatory tetrad analysis in PLS path modeling. *Journal of Business Research*, 61(12), 1238–1249. | §3.1 tetrad 定義（Eq. 1）、§3.3 偏誤校正 CI（**Eq. 2**）、§3.2 與 §3.4 的五步程序（p. 1241）、Bonferroni 的施加層級（Step 5） | **已取得**（PDF 逐式核對） |
| Bollen, K. A., & Ting, K.-F. (1993). Confirmatory tetrad analysis. *Sociological Methodology*, 23, 147–175. | §3.2 非冗餘選取的完整代數（Gudergan 全文把 Step 1–3 的細節指向本文） | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| Bollen, K. A. (1990). Outlier screening and a distribution-free test for vanishing tetrads. *Sociological Methods & Research*, 19(1), 80–92. | Bonferroni 的層級（Gudergan p. 1241 引其 p. 88）——**經 Gudergan 轉引，原文未取得** |
| Davison, A. C., & Hinkley, D. V. (1997). *Bootstrap Methods and Their Application*. | bootstrap on raw data 而非常態近似的依據——**經 Gudergan 轉引，原文未取得** |

★ ★ **本組最重要的溯源缺口：Bollen & Ting (1993) 未取得。**
非冗餘 tetrad 的**選取集**只有該文有完整代數。本工具用「逐一加入指標」的確定性構造
得到正確的**數量**，並以 Jacobian 秩 assert 驗證**極大獨立**——
但**這是不是 Bollen & Ting 的那一組，無從確認**（見第 6 節）。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_cta`（50 個統計量：CR 區塊 $k=5$ 的 5 個 tetrad × 5 欄
＋區塊層 4 欄；CM 區塊 $k=4$ 的 2 個 tetrad × 5 欄＋區塊層 4 欄）。
固定重抽索引（300 組）存於 `datasets.json:cta.boot`，**不另立 `_inputs` 鍵**（與 copula／POS／FIMIX 的慣例不同）。

**tier / status**：tier **B** / **verified（帶明文保留）**

| 道 | 內容 |
|---|---|
| 1 | **Gudergan et al. (2008) 原文 PDF 逐式核對**（Session Q2，2026-07-25）：Eq. 1、Eq. 2、Step 1–5、Bonferroni 層級——四項一致 |
| 2 | ★ **審計發現並修正一處偏離**：原實作 CI 半寬用 Student $t$（$\mathrm{df}=B-1$），原文 Eq. 2 明確為常態 $z_{1-\alpha/2}$。已改為 $z_{1-\alpha/(2T)}$ 並重生基準（$B=300$、$T=5$ 時 CI 縮 **0.64%**；R 塊仍 reflective、M 塊仍 formative，**判讀結論不變**）。欄位 `tCrit` → `zCrit` |
| 3 | **非冗餘選取集的獨立性**：生成端以 **Jacobian 秩 assert** 驗證極大獨立（`generate_reference.py:1787–1803`） |
| 4 | **資料集設計 assert**：`datasets.json:cta` 專為本方法造——cr1–cr5 為單因子反映型、cm1–cm4 為非單因子，生成端 assert 鎖定「R 塊判 reflective、M 塊判 formative」 |
| 5 | **JS↔numpy 逐值**：300 組固定重抽索引注入，`compare.test.js` 50 欄逐值對齊 |
| 6 | **本文件的獨立重寫（2026-07-29）**：依第 3 節文字規格以 numpy 重寫非冗餘選取、tetrad、bootstrap、bias-corrected + Bonferroni CI，對 50 欄（含 7 個字串欄）比對，**字串全數相符、最大絕對差 6.661e−16** |

★ 第 6 道能對到 1e−16，表示三個容易寫錯的地方都寫對了：
**bias 的方向**（$\bar\tau^*-\hat\tau$，中心是 $\hat\tau-\hat b$ 而不是 $\hat\tau+\hat b$）、
**Bonferroni 進的是分位數而不是 SE**、**$T$ 取的是該區塊而不是全模型**。

### ★ 尚未驗證的部分

1. ★ ★ **非冗餘選取集無法核定**。Bollen & Ting (1993) 未取得；SmartPLS 4 的選取集未文件化
   且**授權已過期**。⇒ 數量與自由度一致、omnibus 判讀等價，但**個別 tetrad 的 CI 會隨選取集而異**，
   本工具表上那幾個數字**沒有第三方可以對照**。這是本組 `verified` 帶保留的原因。
2. ★ **選取集取決於指標宣告順序**（§3.2 實測）。三種順序判讀一致，
   但**這不是保證**——Bonferroni 與 bootstrap CI 都是有限樣本程序，
   理論上的 omnibus 等價不蘊含「每次判讀都相同」。**未做系統性掃描**。
3. **完全沒有第三方數值對照**：R 側**沒有 CTA-PLS 套件**（seminr、cSEM 皆無），
   Python 亦無。唯一可能的證人是 SmartPLS 4（授權過期）。
   ⇒ 與 POS／FIMIX 同屬「結構上達不到 tier A」的一類。
4. **Bonferroni 只在構念內**：同時檢定 $L$ 個構念時，構念層的族系錯誤率未控制
   （$L$ 個構念各自 5% ⇒ 至少一個誤判的機率約 $1-0.95^L$）。原文未處理，工具未提醒。
5. **$T$ 越大越難否證**（§3.4）：$k=8$ 時 $\alpha'=.0025$、$z=3.02$。
   這代表**大構念的檢定力較低**，工具不報檢定力也不提醒。
6. ~~`warnings` 完全不進 UI~~ → ★ **2026-07-29 已修**（R35-a）：補上 WarnBox 區塊
   （`Result.jsx:1849–1853`），`ctaNote` 亦補印 $n$（中英各一）。
7. ★ **`t`／`p` 兩欄是死碼**（R35-b）：算了、沒進基準、沒進 UI、沒有測試，且口徑已被 §3.3 否定。
8. **離群值與非線性未檢核**：tetrad 建立在相關矩陣上，單一離群點可大幅改變 $\hat\tau$。
   Bollen (1990) 的標題正是「Outlier screening and a distribution-free test for vanishing tetrads」——
   **本工具只實作了後半**。
9. **邊界條件未測**：`cta-bad-bootstrap-indices`、`cta-too-few-bootstrap`、`too-few-cases`
   三條路徑無測試覆蓋（`cta-no-eligible-construct` 與 `skipped` 本次已實跑驗證）。
10. **常數指標／完全共線**：`corrMatrixOf` 在指標零變異時會產生 NaN 相關，
    tetrad 隨之為 NaN，**無守衛、無警告、無測試**。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 標題 | — | `Result.jsx:1782`、i18n `ctaTitle` |
| 構念名 | — | `pls.js:3886`、`Result.jsx:1786` |
| 判讀燈號＋文字 | §3.4 | `pls.js:3894`、`Result.jsx:1788–1794`、i18n `ctaVerdictFormative`／`ctaVerdictReflective` |
| meta（$k$、$T$、Bonferroni $\alpha'$） | §3.1、§3.3 | `pls.js:3888–3891`、`Result.jsx:1796–1800`、i18n `ctaMeta` |
| 宣告／判讀衝突警示框 | §3.4 | `pls.js:3896`、`Result.jsx:1802–1810`、i18n `ctaConflict` |
| tetrad 標籤（四個指標名） | §3.2 | `pls.js:3873–3874`、`Result.jsx:1814`＋`1826` |
| tetrad 值 $\hat\tau$ | §3.1 | `pls.js:3844`、`Result.jsx:1815`＋`1827` |
| bias | §3.3 | `pls.js:3865`、`Result.jsx:1816`＋`1828` |
| SE | §3.3 | `pls.js:3866`、`Result.jsx:1817`＋`1829` |
| CI 下界／上界 | §3.3 | `pls.js:3868–3869`、`Result.jsx:1818–1819`＋`1830–1831` |
| 是否消失（燈號） | §3.4 | `pls.js:3870`、`Result.jsx:1820`＋`1832–1842` |
| 指標不足的構念說明框 | §4 | `pls.js:3782–3788`、`Result.jsx:1859–1858`、i18n `ctaSkipped` |
| 註記（$B$、族系 $\alpha$） | §3.1、§3.3 | `pls.js:3907`、`Result.jsx:1859`、i18n `ctaNote` |
| APA 敘述句 | §3.4 | `apaNarrative.js:404–411` |

**孤兒欄位檢查**（`grep -rn "<欄位名>" src/ | grep -v src/lib/stats/` 實跑）：

| 欄位 | 狀態 |
|---|---|
| `warnings` | ★ **已修（2026-07-29）**——原本是 W5／W6 **唯一**沒有渲染 `warnings` 的區塊，現已補上（`Result.jsx:1849–1853`）。見 R35-a |
| `n`／`nDropped` | ★ **已修（2026-07-29）**——`ctaNote` 補印 $n$；`nDropped` 透過 casewise 警告揭露 |
| `tetrads[].t`／`tetrads[].p` | ★ **孤兒且為死碼**，見 R35-b |
| `blocks[].nNonVanishing` | 不直接顯示（由逐列燈號可數出），書面記錄 |
| `blocks[].declaredMode` | 只在 `conflict` 為真時顯示 |
| 其餘（`label`／`value`／`bias`／`se`／`ciLower`／`ciUpper`／`nonVanishing`／`verdict`／`nTetrads`／`alphaAdjusted`／`skipped`／`nBootstrap`／`ciAlpha`） | 全部有對應呈現 |

★ `zCrit` 進了基準（`R_zCrit`／`M_zCrit`）但**不在報表上**；報表顯示的是等價的 $\alpha'$。書面記錄。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A3c

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 50 欄，字串全符、最大差 6.661e−16） |
| 2 | authority 是否支持該公式 | **通過**（Eq. 1／Eq. 2／Step 1–5 已於 Session Q2 逐式核對）。★ **但 §3.2 的選取集 authority 指向未取得的 Bollen & Ting (1993)** |
| 3 | 文獻真實性 | **通過**。Bollen & Ting 標【原文未取得】；Bollen (1990) 與 Davison & Hinkley 標明為**經 Gudergan 轉引** |
| 4 | 報表可追溯 | ★ ★ **開出 R35-a**（`warnings`／`n`／`nDropped` 全孤兒）**——當日已修**；與 **R35-b**（`t`／`p` 死碼，裁決保留） |
| 5 | 假設前提 | 守衛齊全且訊息具體（`cta-no-eligible-construct` 會列出每個構念的指標數，是全專案訊息品質最好的一條）。★ 但兩條警告產生了卻看不到 → 併入 R35-a |
| 6 | 慣例分歧 | **通過**。相關矩陣 vs 共變異數矩陣、$z$ vs $t$ 兩項已寫入 §3.1、§3.3 |
| 7 | 邊界條件 | ★ **開出 R35-c**（選取集依賴指標順序，實測三種順序）＋三條錯誤路徑與零變異指標無測試（第 6 節第 9、10 點） |
| 8 | APA 敘述句 | **通過**。`ctaTail` 明確寫「CTA 否證反映型不等於證成形成型」，是全專案最克制的一句 |

### R35-a（L2）CTA 的 `warnings` 完全不進 UI，報表上也沒有樣本數

**發現**：`grep -rn "cta.warnings" src/` **零命中**。引擎產生的兩條警告使用者永遠看不到：

| 情境（實測） | 引擎產生的警告 | UI |
|---|---|---|
| $n=25$ | 「樣本數偏低（n = 25），tetrad 的 bootstrap 推論穩定性有限」 | **不顯示** |
| 缺失值（`nDropped = 7`） | 「casewise deletion 剔除 7 筆含缺失值的資料列」 | **不顯示** |

同時 `cta.n` 與 `cta.nDropped` 也零命中——**CTA 區塊上完全沒有樣本數**，
`ctaNote` 只印 bootstrap 次數與族系 $\alpha$。

⇒ 這是 A3a 那一類的「引擎算了、UI 沒讀」，但更嚴重：**CTA 是唯一漏掉的區塊**，
其他六個 W5／W6 區塊都有 `warnings.map(...WarnBox)`。

**處置（Kevin 2026-07-29 核定並已執行）**：比照其他區塊補 `{cta.warnings && ...}` 的 WarnBox 區塊
（`Result.jsx:1849–1853`），並在 `ctaNote` 補印 $n$（中英各一）。純呈現層，引擎與 fixture 零改動。

### R35-b（L1／L2）`tetrads[].t` 與 `.p` 是死碼，且口徑已被否定

`pls.js:3878–3879` 算了 $t=\hat\tau/\text{SE}$ 與 $p=2(1-F_{t,B-1}(|t|))$。實測值存在
（例如 `cm1,cm2,cm3,cm4`：$t=7.665$、$p=2.5\times10^{-13}$），但：

- **不在 `reference.json`**（50 欄沒有它們）
- **不在 UI**（`Result.jsx` 的 CTA 表七欄無 $p$）
- **不在測試**
- $p$ **未做 Bonferroni**，且用 $\mathrm{df}=B-1$——**正是 Session Q2 判定「無理論依據」而從 CI 移除的那個口徑**

⇒ 留著它們的風險是：日後有人把 $p$ 拉進報表，就會出現「CI 用 Bonferroni 校正的 $z$、
$p$ 用未校正的 $t(B-1)$」這種兩套判準並存的情形（copula 的 R33-b 就是這樣發生的）。

**處置（Kevin 2026-07-29 裁決：採 (b)，本批不刪）**：保留欄位，並在本文件 §3.5 明文標註**不得引用**。
刪除屬引擎回傳契約的變更，留給階段 B 與 E14（permutation $p$ 的 ±1 慣例）一併處理。
★ 風險已書面化：日後若有人把 $p$ 拉進報表，就會重演 copula 的 R33-b。

### R35-c（L1）非冗餘選取集依賴指標宣告順序，UI 未說明

實測（§3.2 表）：同一構念、同一批資料、同一組重抽索引，三種指標宣告順序給出**三組不同的 tetrad**
（值分別為 −0.0359… / 0.0577… / −0.0931…），整體判讀三次都是 reflective。

這是構造的必然結果（每個 tetrad 都固定含前兩個指標），也已在程式碼註解與 `provenance.json`
的 `note` 中記錄，但**使用者端完全看不到**——報表的 tetrad 表看起來像「就是這五個」。

**處置（已執行）**：`ctaNote` 補一句「非冗餘 tetrad 的選取集取決於指標的宣告順序；
整體判讀不受影響，但表上列出的 tetrad 會隨順序改變」，中英各一。

### 本批本組未開出 L3／L4

數值本體對得起獨立重寫。三項發現分別落在**呈現層**（R35-a、R35-c，**當日修畢**）
與**死碼**（R35-b，Kevin 裁決保留＋書面標註）。
★ 本組的**真正風險不在實作，在文獻**：Bollen & Ting (1993) 取不到 ⇒ 選取集無從核定
（第 6 節第 1 點）。這一項與 `pls_fimix` 的 pending 同性質，差別只在 CTA 還有 Gudergan 原文可錨。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
