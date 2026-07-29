# 線性判別分析（Linear Discriminant Analysis, LDA）

> 方法代號 `lda`｜基準組 `reference.json → lda_group3`（13 個統計量；資料集 `datasets.json:main`，$N=60$、3 組各 20 人、3 個預測變項）｜溯源 tier **B** / verified
> 最後更新：2026-07-29（階段 A / A4）

---

## 1. 這個方法在回答什麼問題

手上有幾個連續的測量值，和一個把樣本分成幾群的類別變數。
LDA 問兩件事：**這幾個測量值合起來，能不能把這幾群分開？** 以及 **要怎麼合，才分得最開？**

它的作法是找一組加權，把多個變項壓成一個分數（判別函數），
使得**組間變異相對於組內變異**最大化。分得開的方向會被排在前面，
$k$ 組最多能找出 $\min(k-1,p)$ 個這樣的方向。

LDA 有兩種讀法，兩種都正當但目的不同：

- **描述**：哪些變項在區分這幾組？（看標準化係數與結構矩陣）
- **分類**：拿一筆新資料，該歸到哪一組？（看分類表）

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 依變項是類別、自變項是連續，而且想知道「是哪些變項在區分」
- 需要一條可解釋的線性規則，而不是黑箱分類器
- 想把多維資料降到 1–2 個判別軸上畫圖

**不該用**

- ★ **各組共變數矩陣明顯不同質時**。LDA 的核心假設是各組共用同一個 $\Sigma$；違反時應改用二次判別分析（QDA）。本工具**跑 Box's M 檢定並警告，但不擋、也不提供 QDA**
- **預測變項高度共線**。$S_p$ 接近奇異時係數不穩，本工具在完全奇異時擋（`singularPooled`，`lda.js:371`）但**接近奇異時無警告**
- **樣本遠小於變項數**。守衛只有 $N>k+p$（`lda.js:304`），這是識別下限，不是穩定下限
- **只想要分類效能**。★ 本工具的準確率是 **resubstitution**（用全部資料分類自己），一定高估

**常見誤用**

1. ★ **拿未標準化係數比較變項重要性。** 未標準化係數帶原始單位，「以公分計的身高」與「以公尺計的身高」係數差 100 倍。要比重要性用**標準化係數**或**結構矩陣**
2. ★ **看重判別函數的正負號。** 判別函數是特徵向量，**符號在數學上完全任意**。整個函數（係數、結構係數、組重心）同時反號不改變任何結論。本工具固定「絕對值最大的未標準化係數為正」，SPSS／R MASS 可能相反——2026-07-29 起這句話已寫進報表（R38-b）
3. **把 resubstitution 準確率當作模型效能報告。** 註記已明寫要另做交叉驗證，但工具不提供
4. ★ **與 SPSS 對照時忽略事前機率設定。** 本工具用比例事前 $\pi_g=n_g/N$（＝R `MASS::lda` 預設），SPSS 預設等機率——組別人數不均時分類表與準確率會不同（R38-c）
5. **把序列 Wilks Λ 的第 $j$ 列讀成「第 $j$ 個函數的檢定」。** 它是「第 $j$ 個**及其之後**所有函數合起來」的檢定

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $N,\ p,\ k$ | 有效樣本數、預測變項數、組數 |
| $n_g,\ \bar{\mathbf x}_g$ | 第 $g$ 組的人數與組平均 |
| $\bar{\mathbf x}$ | 全平均（**加權**：$\sum_g n_g\bar{\mathbf x}_g/N$） |
| $\mathbf B,\ \mathbf W$ | 組間、組內 SSCP 矩陣 |
| $\mathbf S_p$ | 組內合併共變數矩陣 $\mathbf W/(N-k)$ |
| $\lambda_i,\ \mathbf w_i$ | 第 $i$ 個判別函數的特徵值與係數向量 |

### 3.2 組間與組內離散

$$\mathbf B=\sum_{g=1}^{k}n_g\bigl(\bar{\mathbf x}_g-\bar{\mathbf x}\bigr)\bigl(\bar{\mathbf x}_g-\bar{\mathbf x}\bigr)^{\!\top},\qquad
\mathbf W=\sum_{g=1}^{k}\sum_{i\in g}\bigl(\mathbf x_i-\bar{\mathbf x}_g\bigr)\bigl(\mathbf x_i-\bar{\mathbf x}_g\bigr)^{\!\top}$$

（`lda.js:323–360`），$\mathbf S_p=\mathbf W/(N-k)$（`lda.js:361–368`）。

### 3.3 廣義特徵問題與判別函數

$$\mathbf B\mathbf w=\lambda\,\mathbf W\mathbf w \quad\Longleftrightarrow\quad \mathbf W^{-1}\mathbf B\,\mathbf w=\lambda\mathbf w$$

取前 $\min(k-1,p)$ 個最大特徵值。實作以 Jacobi 對稱特徵分解處理
$\mathbf W^{-1}\mathbf B$ 的對稱化形式（`lda.js:98–204`）。

★ **縮放慣例**：特徵向量的長度任意，本工具縮放使

$$\mathbf w^{\!\top}\mathbf S_p\mathbf w=1$$

（`lda.js:422–433`）——這就是 SPSS 的「未標準化典型判別函數係數」，也是 R `MASS::lda` 的 `scaling`。

★ **符號慣例**：使每個函數中**絕對值最大的未標準化係數為正**（`adapters.mjs:345–351` 的正規化；
UI 側由引擎輸出直接呈現）。這是本工具口徑，任何第三方都可能給出整體反號的解。

### 3.4 三種係數，三種用途

| 量 | 定義 | 用途 |
|---|---|---|
| 未標準化 $\mathbf w$ | $\mathbf w^{\!\top}\mathbf S_p\mathbf w=1$ | ★ **算判別分數**：$s=\sum_j w_j(x_j-\bar x_j)$（中心化於全平均，`lda.js:440–451`） |
| 標準化 $w_j\cdot\mathrm{SD}_{p,j}$ | 未標準化 × 該變項的組內合併 SD（`lda.js:434–439`） | **跨變項比較相對重要性**（單位已消去） |
| 結構係數 | 預測變項與判別分數的**組內合併相關**（`lda.js:243–267`、`457–466`） | **命名判別軸**；較不受共線性干擾，慣例 $|r|\ge0.30$ 視為有意義 |

★ 引擎另回傳 `structureCoefficientsTotal`（**全樣本**相關，非組內合併）。
SPSS 與 R `MASS` 報的都是組內合併版；全樣本版**不進報表**，見第 7 節與 R45。

### 3.5 序列 Wilks Λ 與 χ²

$$\Lambda_j=\prod_{i\ge j}\frac{1}{1+\lambda_i},\qquad
\chi^2_j=-\Bigl(N-1-\tfrac{p+k}{2}\Bigr)\ln\Lambda_j,\qquad
\mathrm{df}_j=(p-j+1)(k-j)$$

（`lda.js:467–474`，程式碼以 0-based $i$ 表示）。
$\chi^2$ 用的是 **Bartlett 近似**；典型相關 $r_c=\sqrt{\lambda/(1+\lambda)}$（`lda.js:452–456`）。

### 3.6 分類規則與事前機率

$$\delta_g(\mathbf x)=\mathbf x^{\!\top}\mathbf S_p^{-1}\boldsymbol\mu_g-\tfrac12\boldsymbol\mu_g^{\!\top}\mathbf S_p^{-1}\boldsymbol\mu_g+\ln\pi_g$$

指派到 $\delta_g$ 最大的組（`lda.js:508–518`）。

★ **慣例分歧：事前機率**。本工具用**比例事前** $\pi_g=n_g/N$，
與 R `MASS::lda` 及 `sklearn` 的預設相同；**SPSS 預設等機率** $1/k$。
組別人數不均時，兩者會給出不同的分類表與準確率。2026-07-29 起這一項已寫進報表註記（R38-c）。

★ **準確率為 resubstitution**：用全部資料訓練、再拿同一批資料分類，必然樂觀。註記已明寫。

### 3.7 Box's M

$$M=(N-k)\ln|\mathbf S_p|-\sum_g (n_g-1)\ln|\mathbf S_g|,\qquad \chi^2=(1-c_1)M$$

$$c_1=\frac{2p^2+3p-1}{6(p+1)(k-1)}\left(\sum_g\frac{1}{n_g-1}-\frac{1}{N-k}\right),\qquad \mathrm{df}=\frac{(k-1)p(p+1)}{2}$$

（`lda.js:545–576`）。

★ **判準門檻 $p\le.001$ 是本工具口徑**：Box's M 對非常態與大樣本極度敏感，
沿用 $.05$ 會幾乎永遠顯著，故文獻慣例改用 $.001$。UI 三處（`Result.jsx:382`、`Result.jsx:445`、
`Narrative.jsx:33`）各實作一次這個門檻，見 R48。

## 4. 假設前提與本工具的檢核方式

★ **LDA 不在 `assumptionChecker` 的涵蓋範圍內**（`assumptionChecker.js:283–289`）。
前置檢核全在引擎內：

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 共變數矩陣同質 | ✅ **Box's M**（`lda.js:545–576`） | $p\le.001$ 時警告框＋黃燈＋建議 QDA，**不擋** |
| $\mathbf S_p$ 非奇異 | ✅ `lda.js:371` | 回 `singularPooled`；★ **接近奇異時無警告** |
| 至少 2 組、$N>k+p$ | ✅ `lda.js:300`、`304` | 回 `groupBadGroups`／`tooFewN` |
| 各組 $n_g\ge2$（Box's M 需要） | ✅ `lda.js:547` | Box's M 標為不適用並說明 |
| 無缺失值 | ✅ listwise（`lda.js:277`） | 剔除筆數自 2026-07-29 起顯示（R38-e） |

**沒有檢核、但方法確實要求的**：

1. ★ **多變量常態**。分類規則的最適性建立在常態上，工具**完全不檢核**，也不提供替代
2. **無離群值**。$\mathbf S_p$ 與組平均都對離群值敏感
3. **預測變項間無高度共線**。只擋完全奇異
4. **各組樣本足夠**。$n_g=3$ 也照跑

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Fisher, R. A. (1936). The use of multiple measurements in taxonomic problems. *Annals of Eugenics*, 7(2), 179–188. | §3.2–3.3 判別軸的最大化準則 | ★ **【原文未取得】** |
| Box, G. E. P. (1949). A general distribution theory for a class of likelihood criteria. *Biometrika*, 36(3/4), 317–346. | §3.7 Box's M 與其 $\chi^2$ 近似 | ★ **【原文未取得】** |
| Bartlett, M. S. (1938). Further aspects of the theory of multiple regression. *Mathematical Proceedings of the Cambridge Philosophical Society*, 34(1), 33–40. | §3.5 Wilks Λ 的 $\chi^2$ 近似 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| R `MASS` 7.3-65 的 `lda()`（Venables & Ripley） | ★ **實際權威**：縮放慣例、事前機率預設、2026-07-14 逐值抽驗的對照方 |
| base R 的 `manova()` | Wilks Λ 的對照 |
| `sklearn.discriminant_analysis.LinearDiscriminantAnalysis` | ★ 2026-07-29 獨立重寫的第三方對照方 |

★ **三篇方法原文都未取得。** §3 的公式是對照 R `MASS` 與 `sklearn` 的**輸出**反推的，
**未逐式核對原文方程式編號**。這是本組列為 tier B 的核心理由。

## 6. 對照與驗證狀態

**基準組**：`reference.json → lda_group3`（13 個統計量：`eigenvalues`／`canonicalCorrelations`／
`proportionOfVariance`／`wilksLambda`／`chi2`／`df`／`unstandardizedCoefficients`／
`standardizedCoefficients`／`structureCoefficients`／`structureCoefficientsTotal`／
`groupCentroids`／`groupSizes`／`overallAccuracy`）。

**tier / status**：tier **B** / **verified**

| 道 | 內容 |
|---|---|
| 1 | ★ **R `MASS::lda` 逐值抽驗**（2026-07-14，Session Q1，`04_q1_audit.R` v4/v5）：未標準化係數、標準化係數、pooled SD、特徵值換算、組重心、structure matrix、再代入分類表（對角 8/10/7、accuracy 0.416667）**全部一致**；base R 的 MANOVA 函式給出的 Wilks Λ = 0.94302 亦同（★ 此處刻意不寫成小寫的函式名，見 §8 的 R49） |
| 2 | **JS↔numpy 逐值**：`compare.test.js` 13 欄（容差 1e−6） |
| 3 | ★ **本文件的獨立重寫（2026-07-29）**：改以 **sklearn `LinearDiscriminantAnalysis`（solver='eigen'）** 取判別方向，再依 §3.3–3.6 的文字慣例換算；特徵值另以「判別分數的組間／組內平方和比」獨立求得（完全不碰特徵分解）。**11 組陣列最大絕對差 1.288e−14**；★ **sklearn 自己的 `predict` 給出的再代入準確率與 fixture 逐位元相同（0.416666667）** |
| 4 | ★ **工具鏈陷阱（2026-07-14 記錄）**：`library(cSEM)` 會遮蔽 `stats::predict`，對 `lda` 物件會進到 cSEM 的內部碼。R 抽驗腳本一律顯式寫 `stats::predict` |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 事前機率 | 比例 $n_g/N$ | R `MASS`／sklearn 同；**SPSS 預設等機率** | 組別人數不均時分類表與準確率不同 |
| 判別函數符號 | 絕對值最大的未標準化係數為正 | 任意 | 整體反號，結論不變 |
| structure matrix | 組內合併相關 | SPSS／R `MASS` 同 | 無 |
| Box's M 門檻 | $p\le.001$ | SPSS 報 $p$ 但不下判定 | 本工具的判定較寬鬆 |
| 準確率 | resubstitution | SPSS 另可報 leave-one-out | 本工具**只有**樂觀的那一個 |

### ★ 尚未驗證的部分

1. ★ ★ **三篇方法原文都未取得**。公式只對到第三方實作的輸出，未對到原文方程式編號
2. ★ ★ **事前機率的慣例分歧沒有任何基準鎖得住**。本基準三組**各 20 人**，
   ⇒ 比例事前恰等於等機率事前，兩種口徑在這份資料上**完全同值**。
   R38-c 的說明正確，但「本工具與 SPSS 會不同」這件事**未被任何基準驗證過**
   （與 A1 的 R9、R20 同型：不是公式錯，是情境未覆蓋）
3. ★ **Box's M 未被基準涵蓋**：`lda_group3` 的 13 欄裡**沒有 Box's M 的任何一欄**，
   `compare.test.js` 不比對它。§3.7 的 $c_1$ 修正項與 df 只有程式碼，沒有第三方對照
4. **`perClassAccuracy` 與 `confusionMatrix` 未進基準**：只有 `overallAccuracy` 被鎖
5. **交叉驗證未實作**：註記叫使用者去做，工具不提供
6. **多變量常態未檢核**，亦無基準情境
7. **`numFunctions = 0` 的退化路徑**（Jacobi 不收斂或 $\mathbf W$ 奇異，`lda.js:385`）零測試覆蓋

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 摘要行 $N$／$k$／$p$／函數數 | §3.1 | `lda.js:579–592`、`Result.jsx:68–83` |
| ★ 剔除筆數 | §4 | `compute.js:21–24`、`Result.jsx:73–79`、i18n `droppedNote`（R38-e） |
| 判別函數表：特徵值、典型相關、變異比例 | §3.3、§3.5 | `lda.js:591`、`452–456`、`Result.jsx:85–136` |
| 判別函數表：Wilks Λ、χ²、df | §3.5 | `lda.js:467–474`、`Result.jsx:85–136` |
| ★ 未標準化典型係數表 | §3.3、§3.4 | `lda.js:432–433`、`Result.jsx:181–215`、i18n `unstdCoefTitle`／`unstdCoefHint`（R38-a） |
| ★ 符號任意性說明 | §3.3 | `Result.jsx:211`、i18n `signNote`（R38-b） |
| 標準化典型係數表 | §3.4 | `lda.js:434–439`、`Result.jsx:138–179` |
| 結構矩陣 | §3.4 | `lda.js:457–466`、`Result.jsx:217–254` |
| 組重心表 | §3.3 | `lda.js:593`、`Result.jsx:256–294` |
| 分類表＋準確率 | §3.6 | `lda.js:594–599`、`Result.jsx:296–366` |
| ★ 事前機率慣例註記 | §3.6 | `Result.jsx:362`、i18n `priorNote`（R38-c） |
| Box's M 列＋警告框 | §3.7 | `lda.js:545–576`、`Result.jsx:369–410` |
| APA 敘述句 | §3.5、§3.6、§3.7 | `Narrative.jsx:11–71`、i18n `apa.*`（含 R39 之外的 `droppedClause`） |

**孤兒欄位檢查**（`grep -rn "<欄位名>" src/ | grep -v src/lib/stats/` 實跑，2026-07-29）

| 欄位 | 狀態 |
|---|---|
| `functions[].unstandardizedCoefficients` | ★ **已修（2026-07-29）**——原為孤兒（有 fixture、有逐值比對、零 UI），現有專屬表（R38-a） |
| `nDropped`／`nTotal` | ★ **已修（2026-07-29）**（R38-e） |
| `structureCoefficientsTotal` | ★ **孤兒**：在基準、`compare.test.js` 逐值比對，零 UI。**書面記錄**（Kevin 2026-07-29 裁決），見 R45 |
| `groupMeans`／`Sp`／`W`／`B`／`grandMean` | **孤兒，屬中介量**：報表不需要，供未來診斷用。書面記錄 |
| `classification.perClassAccuracy` | 有對應呈現（分類表逐列） |
| `boxM.m`／`.chi2`／`.df`／`.p`／`.applicable` | 全部有對應呈現 |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A4

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫走 sklearn 路線，11 組陣列最大差 1.288e−14） |
| 2 | authority | ★ **不足**：三篇原文未取得，公式只對到第三方輸出。已於 §5／§6 標註 |
| 3 | 文獻真實性 | Fisher (1936)、Box (1949)、Bartlett (1938) 卷期頁碼可查、真實存在；★ 皆標【原文未取得】 |
| 4 | 報表可追溯／孤兒欄位 | ★ **R38-a 已修**；★ **開出 R45**（`structureCoefficientsTotal`） |
| 5 | 假設前提 | ★ Box's M 有做；**多變量常態零檢核**，已於 §4 誠實列出 |
| 6 | 慣例分歧 | ★ **R38-c 已修**（事前機率）；★ 但 §6 第 2 項指出**該分歧無基準涵蓋** |
| 7 | 邊界條件 | ★ Box's M 無基準、`numFunctions = 0` 分支零覆蓋、近奇異無警告 |
| 8 | APA 敘述句 | ★ **R38-e 已修**（缺失值揭露）；準確率的 resubstitution 性質**只在報表註記，未進敘述句**——記入 §6 |

### R38-a（L2，前批次交付）未標準化典型係數是孤兒欄位

**發現**　`lda_group3.unstandardizedCoefficients` 有基準、有逐值比對，**零 UI 消費者**。
而標準化係數的說明文字正是**拿它來下定義的**（「＝未標準化係數 × 組內合併 SD」），
使用者看得到定義卻看不到被定義的東西。它也是唯一能讓使用者自行計算判別分數的係數（比照 A3b 的 R30）。

**處置**　✅ 已修：新增「未標準化典型係數」表（`Result.jsx:181–215`），
註記寫明縮放慣例、判別分數公式，以及「**不可**跨變項比較重要性」的界線。

### R38-b（L2，前批次交付）判別函數的符號任意性 UI 隻字未提

**處置**　✅ 已修：`signNote` 中英各一（`Result.jsx:211`），寫明整體反號不改變結論、
本工具的符號規則、與 SPSS／R `MASS` 可能相反。

### R38-c（L2，前批次交付）事前機率的慣例分歧未揭露

**處置**　✅ 已修：`priorNote` 中英各一（`Result.jsx:362`），點名 SPSS。
★ 但見 §6 第 2 項——**本基準的三組各 20 人，這個分歧沒有任何基準鎖得住**。

### R38-e（L2，前批次交付）listwise 剔除筆數不揭露

**處置**　✅ 已修：`compute.js:21–24` 回傳 `nDropped`／`nTotal`；摘要行與 APA 句各揭露一次（比照 A1 的 R12）。

### R45（L1）`structureCoefficientsTotal` 是孤兒欄位

**發現**　全樣本結構係數有 fixture、有逐值比對，零 UI 消費者。

**處置（Kevin 2026-07-29 裁決）**　**書面記錄，不改 UI**。
理由：SPSS 與 R `MASS` 報的都是**組內合併**版；把全樣本版並列反而容易讓使用者拿錯。
基準保留它是為了鎖住「兩種相關確實算得不一樣」，屬回歸防線而非報表內容。

### R48（L1）Box's M 的 $p\le.001$ 門檻在三處各實作一次

**發現**　`Result.jsx:382`（燈號與警告框）、`Result.jsx:445`（教學模式解讀）、
`Narrative.jsx:33`（APA 敘述句）各寫了一次 `p <= 0.001`。三份目前同值，
但這是 A3c 習慣 3 點名的形狀——同一個二值判定有多套實作。
與 R42 不同的是，這裡的門檻**已經寫在使用者看得到的文字裡**（`boxMOk` 印「通過（p > .001）」），
所以不構成「口徑不透明」的問題。

**處置（Kevin 2026-07-29 裁決）**　**書面記錄**。抽成單一函式屬重構，
留待 Box's M 有進一步變更時一併處理；本批不動。

### R49（L1）文件涵蓋率測試的寬鬆比對會誤判

**發現**　`tests/docs.coverage.test.js` 的 `mentions()` 只要求基準鍵**當作獨立字詞**出現在
第 6 節的任何地方。本文件第 6 節原本寫「`manova` 的 Wilks Λ = 0.94302 亦同」
（指 base R 的對照函式），結果讓 `manova` **這一組尚未寫文件的 A6 基準被判為已涵蓋**——
未涵蓋數少算 1，棘輪因此會被設得比實際寬鬆。這是 A3c 那道防線本身的縫。

**處置**　✅ 已修：本文件該處改寫為大寫 MANOVA；`docs.coverage.test.js` 的棘輪註解補上這條警告，
`MAX_UNDOCUMENTED` 設為修正後的**真實值 36**（而非誤判下的 35）。
收緊比對規則需回頭改 30 份 A1–A3 文件，留階段 A 收尾或 A5／A6 一併處理。

### 本批本組未開出 L3／L4
