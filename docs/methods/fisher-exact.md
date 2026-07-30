# Fisher 精確檢定（Fisher's Exact Test, 2×2）

> 方法代號 `fisher-exact`｜基準組 `reference.json → fisher_exact`（2）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A5b）｜前置閱讀：`chi-square.md`

---

## 1. 這個方法在回答什麼問題

卡方檢定靠的是「$\chi^2$ 大約服從卡方分布」這個**近似**，而近似在格子裡人很少的時候會失準。
Fisher 精確檢定回答同一個問題——**這兩個類別變項有關係嗎**——但不靠近似：

**在「四個邊際總和固定不變」的前提下，把所有可能排出來的表全部列出來，
算出「跟觀察到的這張表一樣極端或更極端」的機率總和。**

因為機率是直接數出來的、不是查分布表，所以叫「精確」。代價是只適用小表（本工具限 $2\times2$）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- $2\times2$ 表且任一格期望次數 < 5（卡方檢定會在報表主動建議切過來）
- 總樣本很小（$N$ 幾十）
- 有格子是 0

**不該用**

- ★ **$2\times2$ 以外的表**：本工具只做 $2\times2$。三類別以上的精確檢定（Fisher-Freeman-Halton）**未實作**
- **配對資料**：要用精確 McNemar（未實作）
- ★ **邊際總和不該視為固定的設計**：Fisher 的機率模型建立在「行列邊際都固定」的條件分布上。多數觀察研究其實只有 $N$ 固定，此時 Fisher 偏保守（$p$ 偏大）——這是文獻上長期的爭議，不是實作瑕疵

**常見誤用**

1. ★ **把勝算比（OR）當成風險比（RR）。** 事件不罕見時 OR 會明顯放大效果
2. ★ **有 0 格時直接讀 OR。** 本工具此時套 Haldane +0.5 修正（§3.3），這個 OR 是**修正後**的值，不是原始 $ad/bc$
3. **表超過兩類別時，沒注意工具只取了前兩個出現的類別。** 本工具會亮警告（`tooManyRowLevels` / `tooManyColLevels`），但仍會給出一個數字
4. **$N$ 大時仍堅持用 Fisher。** 不算錯，但沒必要，且列舉成本上升

## 3. 公式與定義

### 3.1 符號與 2×2 的擺法

$$\begin{array}{c|cc}
 & \text{欄=成功} & \text{欄=失敗} \\ \hline
\text{列=成功} & a & b \\
\text{列=失敗} & c & d
\end{array}
\qquad R_1=a+b,\;\; R_2=c+d,\;\; K=a+c,\;\; N=a+b+c+d$$

★ 使用者在設定面板指定「哪一列、哪一欄算成功」，$a$ 格由此決定（`fisherExact.js:100–117`）。
失敗類別取「第一個非成功的類別」（`fisherExact.js:90–94`），超過兩類別時多的直接**排除**在 $2\times2$ 之外並亮警告。

### 3.2 雙尾精確 $p$

固定邊際下，$a$ 服從超幾何分布：

$$P(a)=\frac{\dbinom{R_1}{a}\dbinom{R_2}{K-a}}{\dbinom{N}{K}},\qquad
a\in\bigl[\max(0,\,K-R_2),\;\min(R_1,\,K)\bigr]$$

雙尾 $p$ **採「機率不大於觀察表機率者全部加總」的定義**（`fisherExact.js:131–135`）：

$$p=\sum_{a'\,:\,P(a')\le P(a_{\text{obs}})}P(a')$$

★ 實作在**對數空間**進行以避免階乘溢位（`fisherExact.js:38–50`）：

$$\ln P(a)=\ln\!\binom{R_1}{a}+\ln\!\binom{R_2}{K-a}-\ln\!\binom{N}{K},\qquad
\ln\!\binom{n}{k}=\ln\Gamma(n{+}1)-\ln\Gamma(k{+}1)-\ln\Gamma(n{-}k{+}1)$$

| 決策點 | 本工具 | 說明 |
|---|---|---|
| 雙尾的定義 | ★ **機率加總法**（$P\le P_{\text{obs}}$） | 與 scipy `fisher_exact` 同口徑。另一種常見定義是「兩個單尾取小者乘 2」，兩者在非對稱表上**會給出不同的數字** |
| 並列的判定容差 | $\ln P_{a'}\le\ln P_{\text{obs}}+10^{-9}$（`fisherExact.js:130`） | 對稱表會出現「機率理論上完全相同」的表；浮點誤差可能讓它們差一點點，容差防止漏收。scipy 用的是相對 $1+10^{-7}$，**本工具較嚴** |
| 單尾 | ★ **不提供** | 只報雙尾 |

### 3.3 勝算比與 Woolf 信賴區間（`fisherExact.js:141–152`）

$$\widehat{\mathrm{OR}}=\frac{a\,d}{b\,c},\qquad
\mathrm{SE}(\ln\mathrm{OR})=\sqrt{\tfrac1a+\tfrac1b+\tfrac1c+\tfrac1d},\qquad
\mathrm{CI}_{95\%}=\exp\!\bigl(\ln\mathrm{OR}\pm1.96\cdot\mathrm{SE}\bigr)$$

★ **任一格為 0 時，四格全部 +0.5（Haldane-Anscombe 修正）後才計算 OR 與 SE**
（`fisherExact.js:142–146`），並回傳 `haldaneApplied` 讓報表明示。

★ **這個 OR 是「無條件（樣本）勝算比」，不是 Fisher 檢定所對應的條件最大概似 OR。**
兩者不同，且本工具的 $p$ 與 OR 因此來自**兩個不同的模型**——見 §6 的慣例差異表。

## 4. 假設前提與本工具的檢核方式

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 恰好 $2\times2$ | `tooManyRowLevels` / `tooManyColLevels`（`fisherExact.js:164–165`） | 明文警告 ＋ 列出被排除的類別，**不擋** |
| 至少兩個列類別、兩個欄類別 | `needTwoRowLevels` / `needTwoColLevels`（`fisherExact.js:77–78`） | 錯誤碼，擋住 |
| 指定的「成功」類別存在於資料中 | `fisherExact.js:84–85` | 錯誤碼，擋住 |
| 有效樣本 > 0 | `fisherExact.js:119` | 錯誤碼 `noData`，擋住 |
| 觀察彼此獨立 | ★ **完全不檢核** | 無提示 |
| ★ 邊際固定的條件模型是否適用該研究設計 | ★ **完全不檢核，也不提示** | 見 §2 的第三點與 §8 的 E45 |
| ★ 一般前提檢核區（`assumptionChecker`） | ★ **零涵蓋**：`runAssumptionChecks` 對本方法回 `null` | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Fisher, R. A. (1922). On the interpretation of $\chi^2$ from contingency tables, and the calculation of P. *Journal of the Royal Statistical Society*, 85(1), 87–94. | §3.2 精確檢定的構想 | ★ **【原文未取得】** |
| Fisher, R. A. (1935). The logic of inductive inference. *Journal of the Royal Statistical Society*, 98(1), 39–82. | §3.2 邊際固定的條件論證 | ★ **【原文未取得】** |
| Woolf, B. (1955). On estimating the relation between blood group and disease. *Annals of Human Genetics*, 19(4), 251–253. | §3.3 $\ln\mathrm{OR}$ 的 SE 與 CI | ★ **【原文未取得】** |
| Haldane, J. B. S. (1956). The estimation and significance of the logarithm of a ratio of frequencies. *Annals of Human Genetics*, 20(4), 309–311. | §3.3 +0.5 修正 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **scipy** `stats.fisher_exact` | ★ `fisher_exact` 基準的產生方（$p$ 與 `oddsRatio` 兩欄） |
| **mpmath** 的精確 `binomial` | ★ 本文件獨立重寫所用（有理數精確列舉，不經 lgamma） |

## 6. 對照與驗證狀態

**基準組**

| 組 | 欄位 | 內容 |
|---|---|---|
| `fisher_exact` | 2 | `datasets.json:main` 的 `catR × catC`（成功格＝`Yes` × `High`）：`p`、`oddsRatio` |

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **scipy `fisher_exact` 逐值**：2 欄，`p` 相對差 **7.9e−12**、`oddsRatio` **逐位元相同** |
| 2 | ★ **本文件的獨立重寫（2026-07-30）**：以 **mpmath 的精確 `binomial`（有理數運算）**重算超幾何機率並自行列舉，完全不呼叫 `scipy.fisher_exact`。掃描 **1,621 張表**（$N\le3000$），**最大相對差 1.4e−10、零個 .05 判定翻面** |
| 3 | ★ **參數空間掃描：$N$ 這個方向（A5a 習慣 7）** —— 本組唯一的基準是一張 $N=60$ 的表，而 §3.2 的容差 $\ln$-空間 $10^{-9}$ 有一個**理論上的失效機制**：`lgamma` 的絕對誤差隨 $\ln\Gamma$ 的量級成長，$N$ 足夠大時可能超過容差、把理論上並列的表**漏收**，使 $p$ 直接少掉一半。已針對此點掃描 $N$ 從 20 到 **800,000**（含大量對稱表 $a=b=c=d$ 與差一的準對稱表，這些是並列最容易出現的位置）：**最大相對差 2.1e−09，零個格點超過 1e−6，零次漏收**。⇒ 這個失效機制在可觸及範圍內**沒有發生** |
| 4 | ★ **成本檢查**：$N=800{,}000$ 的表在沙盒 node 上 18 例合計 1.2 秒，列舉成本不是實務瓶頸 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ 報的是哪個 OR | **無條件（樣本）OR** $ad/bc$ | R `fisher.test` 報**條件最大概似 OR**；scipy `fisher_exact` 報無條件 OR | ★ **與 R 的 OR 數字對不上**，尤其小樣本時差異明顯。$p$ 值兩邊一致，OR 不一致 |
| OR 的 CI | **Woolf（log-scale 常態近似）** | R `fisher.test` 報**條件精確 CI** | ★ 小樣本時本工具的 CI 較窄，與 R 不可直接比較 |
| 0 格的處置 | Haldane +0.5，明示 `haldaneApplied` | R 的條件 MLE 會給出 0 或 $\infty$ | 本工具給有限值，方向較實用但非 R 的口徑 |
| 雙尾定義 | 機率加總法 | scipy 同；SPSS 亦為機率加總法 | 與「兩單尾取小乘 2」的工具會不同 |
| 並列容差 | $\ln$ 空間 $10^{-9}$ | scipy 相對 $1+10^{-7}$ | 本工具較嚴；已掃描確認不造成漏收（見上表第 3 道） |
| $r\times c$ 精確檢定 | **未實作** | SPSS 有 Fisher-Freeman-Halton | 三類別以上無精確路徑 |
| 單尾 | **不提供** | R／scipy／SPSS 都能給 | — |

### ★ 尚未驗證的部分

1. ★ **四篇方法原文全部未取得**（Fisher 1922／1935、Woolf 1955、Haldane 1956）⇒ §3.3 的 SE 與 +0.5 修正只對到「教科書通行寫法」，不是對到原文
2. ✅ **已於 2026-07-30 在 Kevin 本機與 R `fisher.test` 對照**（R 4.6.0，
   `scripts/validation/05_a5b_r_audit.R` §6.5）。「$p$ 對得上、OR 對不上」**已證實並量化**：

   | 量 | 本工具 | R `fisher.test` | 差距 |
   |---|---|---|---|
   | 雙尾 $p$ | 6.318e−05 | **6.318e−05** | ✅ 相符 |
   | 勝算比 | 11.666667（無條件 $ad/bc$） | **11.089410**（條件 MLE） | **+5.21%** |
   | 95% CI | [3.384, 40.220]（Woolf） | **[2.966, 49.924]**（條件精確） | ★ 本工具**窄 22%**（寬度 36.8 vs 47.0） |

   ⇒ 使用者若把本工具的 OR 與 CI 貼進論文，審稿人用 R 複算會得到不同的點估計與更寬的區間。
   §6 慣例差異表的兩列從「依文件推論」升級為「實跑核實」
3. ★ **`seLnOr` 是孤兒欄位**：引擎算了 $\ln\mathrm{OR}$ 的標準誤，`src/` 內零讀取者。CI 有顯示、SE 沒有
4. ★ **條件 MLE 勝算比與條件精確 CI 未實作** ⇒ 與 R 對照時必然有落差，且本工具的 $p$（條件模型）與 OR（無條件模型）**理論上不同源**
5. **單尾 $p$、Fisher-Freeman-Halton、精確 McNemar、Barnard 精確檢定**皆未實作 ⇒ 無基準
6. **邊際固定假設的適用性**在 UI 上完全沒有提示（E45）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $2\times2$ 表的四格 $a,b,c,d$ ＋總和 | §3.1 | `fisherExact.js:101–118`、`fisherExact/Result.jsx` |
| 精確雙尾 $p$ ＋顯著標記 | §3.2 | `fisherExact.js:131–139` |
| 勝算比 OR | §3.3 | `fisherExact.js:147` |
| $\ln\mathrm{OR}$ | §3.3 | `fisherExact.js:148` |
| OR 的 95% CI | §3.3 | `fisherExact.js:151–152`、`Result.jsx:105` |
| 「已套用 Haldane +0.5」提示 | §3.3 | `fisherExact.js:163`、`Result.jsx:87`、`105` |
| 「類別多於兩個，已排除其餘」警告 | §4 | `fisherExact.js:164–165`、`Result.jsx:87`、`89`、`97`、`99` |
| 實際分析的兩列／兩欄類別名 | §3.1 | `fisherExact.js:159–160` |
| APA 句 | §3.2、§3.3 | `fisherExact/Narrative.jsx` |

**孤兒欄位檢查**（2026-07-30 實跑）：`fisherExact` 回傳的 20 欄中 **`seLnOr` 為孤兒**，其餘 19 欄有讀取者。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫（mpmath 精確有理數）1,621 張表最大相對差 1.4e−10。**無公式錯誤** |
| 2 | authority | ★ **不足**：四篇原文皆未取得；provenance 只寫 `scipy`，未記錄「OR 的口徑與 R 不同」這件事 |
| 3 | 文獻真實性 | Fisher (1922) *JRSS* 85(1)、Woolf (1955) *Ann Hum Genet* 19(4)、Haldane (1956) 同刊 20(4) 卷期頁碼可查；原文皆未取得並據實標註 |
| 4 | 報表可追溯 | 20 欄中 1 個孤兒（`seLnOr`） |
| 5 | 假設前提 | 結構性前提（$2\times2$、類別存在、有資料）都有守衛；★ 統計性前提（獨立、邊際固定）零檢核零提示 |
| 6 | 慣例分歧 | 七項書面化；★ 最重要的一項是 **OR 的口徑與 R 不同**（無條件 vs 條件 MLE） |
| 7 | 邊界條件 | ★ 本組的重點檢查。含 0 格、$N$ 20 → 800,000、對稱表與準對稱表（並列最密集處）全數掃描，**容差漏收的理論失效機制沒有發生** |
| 8 | APA 敘述句 | 有標明是精確檢定；★ **未標明 OR 是無條件 OR、也未在套 Haldane 時把這件事寫進句子**（見 E46） |

### 本批本組的處置

| # | 級 | 內容 | 處置 |
|---|---|---|---|
| — | — | 本組**無 L1／L2／L3／L4** | 公式、實作、邊界條件全數通過；發現集中在「尚未驗證」與下表的書面記錄 |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E45 | ★ **邊際固定假設完全沒有提示**：Fisher 的條件模型在多數觀察研究中偏保守（$p$ 偏大），這是文獻上的長期爭議。使用者從報表上看不出自己正在用一個保守的檢定 |
| E46 | ★ **APA 句未揭露 OR 的口徑**：句中的 OR 是無條件 $ad/bc$，與 R `fisher.test` 的條件 MLE OR 不同；套了 Haldane +0.5 時句子也沒說 ⇒ 使用者貼進論文的 OR 可能與審稿人用 R 複算的不一致 |
| E47 | **`seLnOr` 孤兒**：CI 有報、SE 沒報。APA 7 對 OR 通常報 CI 即可，故影響低，但欄位存在而無人讀 |
| E48 | **無條件 OR 與條件 $p$ 不同源**：$p$ 來自邊際固定的條件分布、OR 來自無條件估計。兩個數字在同一張報表上並列而未說明各自的模型 |
