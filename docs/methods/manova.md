# 多變量變異數分析（MANOVA）

> 方法代號 `manova`｜基準組 `reference.json → manova`（8）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6b）｜相關文件：`anova-oneway.md`（單變量版）、`lda.md`（同一套 $\mathbf H$／$\mathbf E$）

---

## 1. 這個方法在回答什麼問題

**「幾組人在『一整組依變項』上，整體看起來有沒有差？」**

它是單因子 ANOVA 的多變量推廣：不是對每個依變項各跑一次 ANOVA，
而是**同時考慮所有依變項與它們之間的相關**。

★ **為什麼不逐一跑 ANOVA**：(a) 多重比較會膨脹型一錯誤；
(b) 逐一跑會漏掉「單看每一個都不顯著、合起來卻有差」的情形。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 一個類別自變項、多個**相關的**連續依變項
- 依變項在理論上屬於同一個構念群

**不該用**

- ★ **依變項彼此無關時**：分開跑 ANOVA 加 Bonferroni 更有力
- ★ **依變項完全共線時**：$\mathbf E$ 奇異，整個分析無定義（★ 2026-07-30 起會警告，見 §8）
- **樣本數小於依變項數**：無法估計

**常見誤用**

1. ★ **MANOVA 顯著就逐一報 ANOVA 而不校正。** 這是常見但有爭議的做法
2. ★ **四個統計量挑最顯著的報。** 見 §3.3——它們在同一批資料上可以給出不同的 $p$
3. **忽略 Box's M**：變異數-共變數矩陣同質性是 MANOVA 的前提

## 3. 公式與定義

### 3.1 符號與 SSCP 矩陣（`manova.js:195+`）

| 符號 | 意思 |
|---|---|
| $p$ | 依變項數 |
| $k$ | 組數 |
| $\mathbf H$ | 組間 SSCP（hypothesis） |
| $\mathbf E$ | 組內 SSCP（error） |
| $\lambda_i$ | $\mathbf E^{-1}\mathbf H$ 的特徵值 |

$$\mathbf H=\sum_g n_g(\bar{\mathbf y}_g-\bar{\mathbf y})(\bar{\mathbf y}_g-\bar{\mathbf y})',\qquad
\mathbf E=\sum_g\sum_i(\mathbf y_{gi}-\bar{\mathbf y}_g)(\mathbf y_{gi}-\bar{\mathbf y}_g)'$$

### 3.2 四種多變量統計量（`manova.js:288–320`）

$$\Lambda_{\text{Wilks}}=\frac{|\mathbf E|}{|\mathbf E+\mathbf H|},\qquad
V_{\text{Pillai}}=\sum_i\frac{\lambda_i}{1+\lambda_i},\qquad
T_{\text{H-L}}=\sum_i\lambda_i,\qquad
\theta_{\text{Roy}}=\max_i\lambda_i$$

★ **Wilks 走行列式、其餘三個走特徵值**——這個實作差異是 §8 的 R73 的成因。

### 3.3 ★ 四個統計量怎麼選

| 統計量 | 性質 | 什麼時候用 |
|---|---|---|
| **Wilks' $\Lambda$** | 最常見，概似比 | 預設報這個 |
| **Pillai's trace** | ★ **對前提違反最穩健** | Box's M 顯著時建議改報 |
| **Hotelling-Lawley** | 與 Pillai 類似 | — |
| **Roy's largest root** | 只看最大的特徵值 | ★ **檢定力最高但最不穩健**；其 $F$ 是**上界**，$p$ 偏小 |

★ 本資料集實測：Wilks $p=.0136$、Pillai $p=.0165$、H-L $p=.0114$、**Roy $p=.0021$**
——★ **Roy 明顯偏小，這正是它的上界性質**。

### 3.4 Box's M（`manova.js` 的 `boxM`）

檢定各組的變異數-共變數矩陣是否相同。★ 本工具用 $p\le.001$ 為門檻
（A4 的 R48 已記錄：此門檻在三處各實作一次）。

### 3.5 ★ 退化情形（2026-07-30 新增，見 §8 的 R73）

$\mathbf E$ 奇異時 $\mathbf E^{-1}\mathbf H$ 無定義。**Wilks 會誠實回 `NaN`，其餘三個照樣給數字**
——因為它們走的是數值特徵值路徑。2026-07-30 起以 `singularError` 標記並警告。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 多變量常態 | ★ **不檢核**（E137） |
| 變異數-共變數同質 | ✅ Box's M（§3.4） |
| 觀察值獨立 | 不檢核 |
| $k\ge2$ | 硬擋 `factorBadGroups` |
| $N>k+p$ | 硬擋 `tooFewN` |
| ★ 依變項非完全共線 | ★ **2026-07-30 起標記並警告**（R73） |
| 遺漏值 | 逐列 listwise |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Wilks, S. S. (1932). Certain generalizations in the analysis of variance. *Biometrika*, 24(3-4), 471-494. | $\Lambda$ | 【原文未取得】 |
| Pillai, K. C. S. (1955). Some new test criteria in multivariate analysis. *The Annals of Mathematical Statistics*, 26(1), 117-121. | Pillai's trace | 【原文未取得】 |
| Olson, C. L. (1976). On choosing a test statistic in multivariate analysis of variance. *Psychological Bulletin*, 83(4), 579-586. | ★ §3.3 的四者取捨（Pillai 最穩健的依據） | 【原文未取得】 |
| Rao, C. R. (1951). An asymptotic expansion of the distribution of Wilks' criterion. *Bulletin of the International Statistical Institute*, 33(2), 177-180. | Wilks 的 $F$ 近似 | 【原文未取得】 |

## 6. 對照與驗證狀態

**基準組**：`manova`（`wilks`／`wilksF`／`wilksP`／`pillai`／`pillaiF`／`pillaiP`／`hotelling`／`roy`）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels `MANOVA` 逐值**：8 欄全部在 `DEFAULT_TOL`（1e-6）內 |
| 2 | ★★ **R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）——本組完全結案**：base R 的 `manova` + `summary(test=)` 四種統計量，與本工具的比對如下表。★ **連 Hotelling 與 Roy 的 $F$ 與 $p$ 都對上了，而那兩格在 `reference.json` 裡是零基準** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.1／§3.2 的定義以 numpy 自建 $\mathbf H$／$\mathbf E$、自解特徵值、Wilks 的 Rao $F$ 近似自行推導，**不呼叫 `statsmodels.MANOVA`**。8 欄相對差 **1.5e−16 ~ 1.9e−14** |

**R 側逐項對照（2026-07-30）**

| 量 | 本工具 | R | 相對差 |
|---|---|---|---|
| Wilks $\Lambda$／$F$／$p$ | 0.75114549 / 2.82002875 / 0.01364906 | 同 | 2.5e−9 / 2.5e−10 / 8.2e−9 |
| Pillai $V$／$F$／$p$ | 0.25476069 / 2.72486003 / 0.01652176 | 同 | 8.3e−9 / 7.8e−10 / 1.4e−8 |
| ★ Hotelling-Lawley $T$／$F$／$p$ | 0.32343712 / **2.91093411** / **0.01138124** | 同 | 1.1e−8 / 2.1e−10 / 4.1e−8 |
| ★ Roy $\theta$／$F$／$p$ | 0.29695909 / **5.54323638** / **0.00210415** | 同 | 6.5e−9 / 5.2e−10 / 1.5e−8 |

（差異量級即 R 印出的有效位數 ⇒ 實質逐值相符。粗體為此前無基準的四個量。）

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 四種統計量 | 全部報 | SPSS 全部報；R 一次一種 | 一致 |
| Roy 的 $F$ | 上界近似 | ★ **與 R 逐值相符** | 2026-07-30 確認 |
| Box's M 門檻 | $p\le.001$ | 同 SPSS 慣例 | 一致（門檻三處各實作一次，A4 R48） |
| 事後檢定 | ★ **未實作**（無 discriminant 分析、無逐一 ANOVA） | SPSS 有 | 缺（E138） |
| 效果量 | Wilks 的偏 $\eta^2$ | SPSS 同 | 一致 |

### ★ 尚未驗證的部分

1. **四篇原文皆未取得**
2. ★ **Hotelling 與 Roy 的 $F$／$p$ 仍未進 `reference.json`**：R 已驗過，但**基準組還是 8 欄**
   ⇒ 下次重生時應補 4 欄（E139）
3. ★ **Box's M 的 $\chi^2$ 與 $p$ 零基準**（E140）
4. **多變量常態不檢核**（E137）；**事後檢定未實作**（E138）
5. **從未與 SPSS 對照過**
6. ★ **參數空間未掃描**：只有 $k=3$、$p=3$、平衡設計一個點。
   **不平衡設計與 $p>k$ 的情形零基準**（E141）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 四個統計量的值／$F$／df／$p$／$\eta^2$ | §3.2 | `manova.js:288–320` 與其後的 $F$ 近似段；`manova/Result.jsx:190–200` |
| $\mathbf H$／$\mathbf E$ 矩陣 | §3.1 | `manova.js` 回傳的 `H`／`E` |
| 特徵值 | §3.2 | `manova.js` 的 `eigenvalues` |
| 各組平均與總平均 | §3.1 | `groupMeans`／`grandMean` |
| Box's M | §3.4 | `manova.js` 的 `boxM` |
| ★ 退化情形警告框 | §3.5 | `manova.js` 的 `singularError`／`zeroVarianceDVs`；`manova/Result.jsx`；i18n `manova.degenerate*` |

**孤兒欄位檢查**（2026-07-30 實跑）：`H`／`E`／`eigenvalues` 三者**在 UI 上不呈現**
——屬中間量，刻意保留（E142）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 8 欄最大 1.9e−14 |
| 2 | authority | provenance 為 statsmodels，與產生方一致 |
| 3 | 文獻真實性 | 四篇卷期頁碼可查、皆標【原文未取得】 |
| 4 | 報表可追溯 | `H`／`E`／`eigenvalues` 不呈現（刻意，E142） |
| 5 | 假設前提 | ★ **開出 R73（L2）**：$\mathbf E$ 奇異時只有 Wilks 誠實回 NaN |
| 6 | 慣例分歧 | 五項書面化；★ Roy 的上界性質已由 R 確認 |
| 7 | 邊界條件 | 實跑三種：只有一組（硬擋 `factorBadGroups`）、依變項全常數（開出 R73）、依變項完全共線（開出 R73） |
| 8 | APA 敘述句 | 以 Wilks 為主 ＋ 附其他三個 |
| 9 | 數學小工具的第二套實作 | ★ `manova.js:49` 的 `determinant`（LU）與 `manova.js:99` 的 `jacobiSymEigen` 是本檔就地實作。`grep` 確認 `matrix.js` 有另一份行列式、`efa.js`／`pls.js` 各有特徵分解 ⇒ **專案內至少四份特徵分解**（E143，同 R71 之型但規模更大） |
| 10 | 效果量的名稱與值域 | Wilks 的偏 $\eta^2=1-\Lambda^{1/s}$，值域 $[0,1]$；★ Roy 的 $\theta=\lambda/(1+\lambda)$ 與 $\lambda$ 兩個量都回傳，**名稱容易混淆**（`roy.theta` vs `roy.lambda`），文件已標明基準對的是 `lambda` |
| 11 | 掃描結論的前提 | ★ 只有 $k=3$、$p=3$、平衡設計一個點（E141） |

### R73（L2）$\mathbf E$ 奇異時，只有 Wilks 誠實回 NaN

**發現**（實跑）：

| 情形 | 舊版報表 |
|---|---|
| 依變項全為常數 | Wilks 印「—」，而 **Pillai 印 $V=0.000$、$F=0.000$、$p=1.000$、$\eta^2=0.000$** ——一個看起來完全正常的「不顯著」結論 |
| 兩個依變項完全共線 | Wilks 印「—」，Pillai／H-L／Roy 照樣給出數值 |

★ **成因是實作路徑不同**：Wilks 走 $|\mathbf E|/|\mathbf E+\mathbf H|$（行列式為 0 時誠實地回 NaN），
其餘三個走 `eigenvaluesEinvH` 的數值路徑，在 $\mathbf E$ 奇異時仍算得出東西。

★ **使用者的自然反應**：看到「Wilks: —」以為只是某個統計量算不出來，**然後去讀旁邊的 Pillai**。
同 A3c 的 R33-b（同一件事兩套判準給出不同結論）之型。

**處置（L2，當場修）**

1. ✅ 引擎新增 `singularError`（判準 $|\mathbf E|/|\mathbf E+\mathbf H|<10^{-12}$）與 `zeroVarianceDVs`
2. ✅ 警告框**直接點破那個陷阱**：「Wilks Λ 會誠實地顯示為『—』，但 Pillai、Hotelling-Lawley
   與 Roy 仍會印出數字——那些數字同樣無意義」
3. ✅ 退化時取消 $p$ 的顯著性燈號；i18n 中英各 3 鍵
4. ✅ 4 條行為測試，含「基準資料集不得被標記」與 Wilks／Pillai 值不變的回歸鎖

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E137 | **多變量常態不檢核**（Mardia 檢定未實作） |
| E138 | **事後檢定未實作**：MANOVA 顯著後沒有 discriminant 分析也沒有逐一 ANOVA 的引導 |
| E139 | ★ **Hotelling 與 Roy 的 $F$／$p$ 已由 R 驗過但仍未進基準**：下次重生時補 4 欄，成本極低 |
| E140 | **Box's M 的 $\chi^2$／$p$ 零基準** |
| E141 | **參數空間只有一個平衡設計的點** |
| E142 | `H`／`E`／`eigenvalues` 不呈現（刻意保留的中間量） |
| E143 | ★ **專案內至少四份特徵分解實作**（`manova.js`、`efa.js`、`pls.js`、`matrix.js` 的行列式）⇒ 同 R71 之型但規模更大，建議階段 B 一併處理 |
