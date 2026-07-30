# 比例 z 檢定（One- and Two-Proportion z-Test）

> 方法代號 `z-prop`｜基準組 `reference.json → zprop_one`（5）＋ `zprop_two`（4）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A5b）｜相關文件：`chi-square.md`（雙樣本比例的等價檢定）

---

## 1. 這個方法在回答什麼問題

兩種情境：

**單樣本**——「我調查了 60 位公務員，36 位（60%）表示願意採用 AI 輔助審查。
這個 60% 有沒有顯著高於一半？」

**雙樣本**——「中央機關的採用意願 66.7%、地方機關 53.3%。這 13 個百分點的差距是真的嗎？」

兩者都是把「比例的差距」除以「純屬巧合時該有的起伏大小」，得到一個 $z$，再查常態分布。

★ **雙樣本比例 z 檢定與 $2\times2$ 卡方檢定在數學上等價**（$z^2=\chi^2$，未校正版）。
本工具兩支都提供，數字必然一致；差別只在報表的呈現方式與附帶的效果量。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 二分類結果（是／否、通過／未通過）的比例檢定
- 每組樣本量夠（見下）
- 想要的是「比例差 ＋ 差的信賴區間」這種呈現

**不該用**

- ★ **樣本太小**：常態近似在 $n\hat p$ 或 $n(1-\hat p)$ 小於約 5 時失準。本工具**只擋 $n<5$**（`zProp.js:42`、`zProp.js:86`），不看 $n\hat p$ ⇒ $n=20$ 但只有 1 個成功時仍會給出數字
- **超過兩組**：改用卡方（本工具在偵測到 > 2 組時報錯 `tooManyGroups`）
- **配對資料**：前後測的比例變化要用 McNemar（未實作）
- **想比的是「風險比」或「勝算比」**：本工具報比例差與 Cohen's $h$，OR 請看 `fisher-exact.md`

**常見誤用**

1. ★ **把單樣本的檢定分母與信賴區間的分母搞混。** 本工具刻意用兩套（見 §3.2），這是正確做法但容易讓人以為算錯了
2. **雙樣本時把兩組各自的 CI 是否重疊當成顯著性判準。** 要看的是「差」的 CI 是否跨 0
3. ★ **兩組都是 0% 或都是 100% 時讀不出數字就以為壞了。** 此時 pooled SE = 0、$z$ 無定義，報表顯示「—」（見 §4）
4. **$N$ 很大時把 1 個百分點的顯著差異當成有實務意義。** 看 Cohen's $h$

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $n$、$x$ | 有效樣本數、成功次數 |
| $\hat p=x/n$ | 樣本比例 |
| $p_0$ | 單樣本的虛無比例（使用者指定，須 $0<p_0<1$） |
| $\bar p$ | 雙樣本的合併比例 |

### 3.2 單樣本（`zProp.js:25–59`）

★ **檢定統計量的分母用 $p_0$，不是 $\hat p$**（`zProp.js:44–45`）：

$$z=\frac{\hat p-p_0}{\sqrt{\dfrac{p_0(1-p_0)}{n}}},\qquad p=2\cdot P(Z>|z|)$$

★ **信賴區間用 Wilson 區間，分母用 $\hat p$**（`zProp.js:47–51`），$z_c=1.959963984540054$：

$$\text{center}=\frac{\hat p+\dfrac{z_c^2}{2n}}{1+\dfrac{z_c^2}{n}},\qquad
\text{half}=\frac{z_c\sqrt{\dfrac{\hat p(1-\hat p)}{n}+\dfrac{z_c^2}{4n^2}}}{1+\dfrac{z_c^2}{n}}$$

| 決策點 | 本工具 | 為什麼 |
|---|---|---|
| ★ **檢定的分母慣例** | **$p_0$**（`prop_var=p0`） | $H_0$ 為真時變異數就是 $p_0(1-p_0)/n$；用它才是在虛無假設下的抽樣分布。statsmodels 的 `prop_var` 參數對應此選擇 |
| ★ **CI 的分母慣例** | **$\hat p$**（Wilson） | CI 不是在 $H_0$ 下建構的，必須用資料本身的估計。**檢定與 CI 用不同分母是正確的**，不是不一致 |
| CI 的型別 | **Wilson score 區間** | 比 Wald（$\hat p\pm z_c\sqrt{\hat p(1-\hat p)/n}$）在小樣本與極端比例下表現好得多；$\hat p=0$ 或 1 時 Wald 會給出寬度 0 的荒謬區間，Wilson 不會 |
| 連續性校正 | ★ **不套用** | 與 statsmodels 預設一致 |

### 3.3 雙樣本（`zProp.js:61–112`）

★ **檢定用 pooled（合併）標準誤**（`zProp.js:90–92`）：

$$\bar p=\frac{x_1+x_2}{n_1+n_2},\qquad
z=\frac{\hat p_1-\hat p_2}{\sqrt{\bar p(1-\bar p)\left(\dfrac1{n_1}+\dfrac1{n_2}\right)}}$$

★ **差的信賴區間用 unpooled 標準誤**（`zProp.js:97–99`）：

$$\mathrm{CI}_{95\%}(\hat p_1-\hat p_2)=(\hat p_1-\hat p_2)\pm z_c\sqrt{\frac{\hat p_1(1-\hat p_1)}{n_1}+\frac{\hat p_2(1-\hat p_2)}{n_2}}$$

效果量 Cohen's $h$（`zProp.js:95`），即 arcsine 變換後的差：

$$h=2\bigl(\arcsin\sqrt{\hat p_1}-\arcsin\sqrt{\hat p_2}\bigr)$$

| 決策點 | 本工具 | 為什麼 |
|---|---|---|
| ★ **檢定的分母慣例** | **pooled** | $H_0:p_1=p_2$ 為真時兩組共用一個比例，最佳估計就是 $\bar p$ |
| ★ **CI 的分母慣例** | **unpooled** | 建構區間時不假設兩組相同 |
| 連續性校正 | **不套用** | 與 statsmodels `proportions_ztest` 預設一致 |
| 分組取法 | 取資料中**前兩個出現**的 level | 超過兩組直接報錯（`tooManyGroups`），不靜默取前兩個 |

★ 這兩支的「分母慣例」是本批六支裡最容易被誤判成 bug 的地方：**同一份報表上，檢定的 SE 與 CI 的 SE 刻意不同**。

### 3.4 尾機率的算法（★ R55 修正）

$$p=2\cdot P(Z>|z|)$$

以 `normalSf`（`pvalue.js:165`）直接計算上尾機率。★ **不可寫成 $2(1-\Phi(|z|))$**：
`normalCdf` 內部已用正規化上不完全 gamma 算出上尾（相對精度 $10^{-13}$ 級），再做 $1-(1-\text{tail})$
會把精度整個抵消掉——實測 $|z|\ge8.3$ 時回傳**恰好 0**。詳見 §8 的 R55。

## 4. 假設前提與本工具的檢核方式

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| $n\ge5$（單樣本） | `zProp.js:42` | 錯誤碼 `tooFewN`，擋住 |
| 兩組各 $n\ge5$（雙樣本） | `zProp.js:86` | 錯誤碼 `tooFewN`，擋住 |
| ★ **$n\hat p\ge5$ 且 $n(1-\hat p)\ge5$**（常態近似真正的條件） | ★ **完全不檢核** | 無提示 ⇒ $n=20$、$x=1$ 仍會給數字（見 E49） |
| $0<p_0<1$ | `zProp.js:30–33` | 錯誤碼 `badP0`，擋住 |
| 恰好兩組（雙樣本） | `zProp.js:83–84` | `needTwoGroups` / `tooManyGroups`，擋住並列出組名 |
| 分組變項與結果變項不同 | `zProp.js:64` | 錯誤碼 `sameVar`，擋住 |
| ★ pooled SE > 0 | ★ **無明文守衛**：兩組同為 0% 或同為 100% 時 $z=0/0=\mathrm{NaN}$，`twoSidedZP` 回 NaN | 報表以 `fmtNum`／`fmtP` 顯示「**—**」，**無說明文字**（見 E50） |
| 觀察彼此獨立 | ★ **完全不檢核** | 無提示 |
| ★ 一般前提檢核區（`assumptionChecker`） | ★ **零涵蓋**：對本方法回 `null` | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference. *Journal of the American Statistical Association*, 22(158), 209–212. | §3.2 Wilson score 區間 | ★ **【原文未取得】** |
| Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Lawrence Erlbaum. | §3.3 Cohen's $h$（arcsine 變換） | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **statsmodels** `stats.proportion.proportions_ztest`（`prop_var=p0` / pooled） | ★ `zprop_one`／`zprop_two` 的 $z$、$p$ 基準產生方 |
| **statsmodels** `stats.proportion.proportion_confint(method='wilson')` | ★ `wilsonLow`／`wilsonHigh` 的基準產生方 |
| Agresti, A., & Coull, B. A. (1998). Approximate is better than "exact" for interval estimation of binomial proportions. *The American Statistician*, 52(2), 119–126. | §3.2 選 Wilson 而非 Wald 的依據 | ★ **【原文未取得】** |

## 6. 對照與驗證狀態

**基準組**

| 組 | 欄位 | 內容 |
|---|---|---|
| `zprop_one` | 5 | `main.ybin` 對 $p_0=0.5$（$n=60$、$x=36$）：`z`、`p`、`phat`、`wilsonLow`、`wilsonHigh` |
| `zprop_two` | 4 | `main` 的 `group2`（M/F，各 $n=30$）× `ybin`：`z`、`p`、`p1`、`p2` |

**tier / status**：tier **A** / **verified**（兩組皆是）

| 道 | 內容 |
|---|---|
| 1 | **statsmodels 逐值**：9 欄。`z`／`phat`／`p1`／`p2`／Wilson 上界**逐位元相同**，兩個 `p` 為 **3.1e−13 / 1.1e−13** |
| 2 | ★ **容差收緊（A5a 習慣 8）**：`compare.test.js` 原將 `zprop_one.p` 與 `zprop_two.p` 放寬到 **1e-4，且連註解都沒有**。逐一重驗確認這是 2026-07-02 修 `erf` 之前的遺留，實測差 1e−13 級 ⇒ **兩條放寬全部刪除，改回 `DEFAULT_TOL`（1e-6）** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3 的公式文字自行以 numpy 重算，尾機率改走 **mpmath 的高精度 `erfc`**（完全不碰 statsmodels）。掃描 **5,290 個格點**——單樣本 $n\in\{5,6,8,10,15,20,30,50,100,300,1000\}\times x$ **全枚舉** $\times\,p_0\in\{.1,.5,.9\}$（4,665 格）＋ 雙樣本 $n_1,n_2\in\{5,10,20,50,200\}\times$ 成功率 $\{0,.25,.5,.75,1\}^2$（625 格）。**$z$ 最大相對差 3.6e−16** |
| 4 | ★ **參數空間掃描抓到 R55（跨模組缺陷）**：$p$ 的相對差在 $|z|>6.5$ 起超過 1e−6、$|z|\ge8.3$ 起引擎回傳**恰好 0**。$n=8$、$x=0$、$p_0=0.9$（$|z|=8.49$）即可觸發 ⇒ 這是本批唯一動到數值本體的發現，詳見 §8 |
| 5 | ★ **邊界條件實測**：$\hat p=0$ 或 $1$ 的 66 個單樣本格點全部給出有限的 $z$／$p$／Wilson CI；50 個「兩組同為 0% 或同為 100%」的雙樣本格點全部回 NaN，與 statsmodels 行為一致（statsmodels 亦發出 RuntimeWarning） |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 單樣本檢定的分母 | **$p_0$** | R `prop.test` 亦用 $p_0$，但**預設加連續性校正** | ★ 與 R 預設對不上；R 需 `correct=FALSE` 才一致 |
| 雙樣本檢定的分母 | **pooled** | R `prop.test` 同（亦預設加校正） | 同上 |
| 連續性校正 | **不套用** | R `prop.test` 預設 `correct=TRUE`；SPSS 的比例檢定選項不一 | ★ 本工具的 $p$ 會比 R 預設**小** |
| 單樣本 CI | **Wilson** | R `prop.test` 亦為 Wilson（含校正版）；SPSS 慣用 Wald 或 Clopper-Pearson | 與 R 的無校正 Wilson 一致 |
| 差的 CI | **unpooled Wald** | R `prop.test` 亦 unpooled（含校正） | 校正差異 |
| 效果量 | **Cohen's $h$** | R `prop.test` 不報效果量；SPSS 亦不報 | 無對照對象 |
| 精確二項檢定 | **未實作** | R `binom.test`；SPSS Exact 選項 | 小樣本無精確路徑 |
| 配對比例（McNemar） | **未實作** | R／SPSS 都有 | — |

### ★ 尚未驗證的部分

1. ★ **三篇方法原文全部未取得**（Wilson 1927、Cohen 1988、Agresti & Coull 1998）
2. ★ **從未與 R `prop.test` 或 SPSS 對照過**。§6 慣例差異表中關於「R 預設加連續性校正」的敘述來自**套件文件的二手理解，非本專案實跑** ⇒ 標為待核；成本極低，建議補
3. ★ **Cohen's $h$ 零基準**：`h` 欄位有算、有顯示，但 `reference.json` 沒有對應欄，`compare.test.js` 一欄都沒對。statsmodels 的 `proportion_effectsize` 可直接產生 ⇒ 建議 A6 補（已記為 E51）
4. ★ **`pPool` 與 `sePool` 是孤兒欄位**：雙樣本的合併比例與合併標準誤都有算，`src/` 內零讀取者 ⇒ 使用者看不到檢定用的 SE 是哪一個，恰恰是 §3.3 最需要揭露的資訊
5. ★ **$n\hat p\ge5$ 的條件未檢核** ⇒ 極端比例＋中等 $n$ 時工具仍給出常態近似的數字而無警告（E49）
6. **精確二項檢定、McNemar、多組比例的整體檢定**皆未實作 ⇒ 無基準

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 單樣本：$n$、$x$、$\hat p$、$p_0$ | §3.1 | `zProp.js:34`、`39–40`、`43`、`zProp/Result.jsx:92–93` |
| 單樣本：$z$ | §3.2 | `zProp.js:45`、`Result.jsx:59`、`111` |
| 單樣本：$p$ ＋顯著標記 | §3.2、§3.4 | `zProp.js:46`、`Result.jsx:62`、`112` |
| 單樣本：Wilson 95% CI | §3.2 | `zProp.js:50–51`、`55–56`、`Result.jsx:94` |
| 雙樣本：兩組 $n$、$x$、$\hat p$ | §3.1 | `zProp.js:88–89`、`103–104` |
| 雙樣本：$z$、$p$ | §3.3、§3.4 | `zProp.js:92–93`、`Result.jsx:153`、`156` |
| 雙樣本：比例差 ＋ 95% CI | §3.3 | `zProp.js:99`、`97–98`、`Result.jsx:162–163` |
| 雙樣本：Cohen's $h$ | §3.3 | `zProp.js:95` |
| APA 句 | §3.2、§3.3 | `zProp/Narrative.jsx:45` |
| （不呈現）$\bar p$、pooled SE | §3.3 | ★ `zProp.js:90–91` — **孤兒** |

**孤兒欄位檢查**（2026-07-30 實跑）：`oneProp` 的 6 欄零孤兒；`twoProp` 的 12 欄中
**`pPool`、`sePool` 為孤兒**。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來（含兩套分母慣例）；★ 但 §3.4 的尾機率算法**開出 R55**，已修 |
| 2 | authority | provenance 只寫 `statsmodels`，未記錄「本工具不套連續性校正、R 預設套」這件慣例差異 |
| 3 | 文獻真實性 | Wilson (1927) *JASA* 22(158)、Agresti & Coull (1998) *Am Stat* 52(2) 卷期頁碼可查；原文皆未取得並據實標註 |
| 4 | 報表可追溯 | 18 欄中 2 個孤兒（`pPool`、`sePool`），而它們正是 §3.3 最該揭露的兩個值 |
| 5 | 假設前提 | 結構性前提守衛完整；★ **常態近似真正的條件（$n\hat p\ge5$）零檢核**；pooled SE = 0 時只顯示「—」而無說明 |
| 6 | 慣例分歧 | 八項書面化；★ 最重要的是**連續性校正的有無**（與 R 預設不同） |
| 7 | 邊界條件 | ★ $x=0$／$x=n$ 全枚舉、兩組同 0%／同 100% 全數掃描；**R55 就是在這裡被逼出來的** |
| 8 | APA 敘述句 | 有報 $z$、$p$、比例差與 CI；未標明未套連續性校正 |

### R55（L3，本批唯一動到數值本體的發現）雙尾 $p$ 在 $|z|$ 大時塌成 0

**發現**　全專案 8 處把雙尾 $p$ 寫成 `2 * (1 - normalCdf(Math.abs(z)))`。
而 `normalCdf` 的註解明寫「尾端以 gammq 計算，保持相對精度」——問題是這份精度在呼叫端
被 $1-(1-\text{tail})$ 這個減法**整個抵消掉**：

| $\|z\|$ | 正確 $p$（雙尾） | 引擎回傳 | 相對誤差 |
|---|---|---|---|
| 4.0 | 6.334e−05 | 6.334e−05 | 3.6e−15 |
| 6.0 | 1.973e−09 | 1.973e−09 | 5.6e−08 |
| 7.0 | 2.560e−12 | 2.560e−12 | 4.1e−05 |
| 7.5 | 6.382e−14 | 6.373e−14 | 1.4e−03 |
| **8.5** | **1.896e−17** | **0（恰好）** | **1.0** |
| 12.0 | 3.553e−33 | 0（恰好） | 1.0 |

★ **可達性**：單樣本比例 $n=8$、$x=0$、$p_0=0.9$ 就給 $|z|=8.49$；
邏輯迴歸與 Cohen's kappa 在效果強時也輕易越過。報表會印 `p = .000`。

★ **為什麼判 L3 而非 L4**：對 5,240 個 z 比例格點與 1,728 個 Mann-Whitney 格點掃描，
**零個 .05 判定翻面**；受影響區間全落在 $p<10^{-10}$，而 APA 一律呈現為 $p<.001$。
與 R50（Tukey）不同——R50 在可達的 $\mathrm{df}$ 上直接把 $p$ 翻到 .05 的另一側。

**處置（Kevin 2026-07-30 核定：8 處一次改乾淨）**

1. ✅ `pvalue.js` 新增 **`normalSf(z)`**（直接回上尾 $P(Z>z)$，`pvalue.js:165`）
2. ✅ A5b 範圍內 4 處改走它：Mann-Whitney（`nonparametric.js:78`）、Wilcoxon（`:173`）、
   Dunn（`:302`）、比例 z（`zProp.js:22`）
3. ✅ 範圍外 4 處一併改：`kappa.js:45`、`logisticRegression.js:162`、
   `normality.js:134`（Shapiro-Wilk 單尾），以及 **`cfa.js` 自帶的 `normalCdfApprox` 整支移除**
   ——它是 A&S 7.1.26（絕對誤差 1.5e−7），與 `pvalue.js` 的常態 CDF 屬同一件事的第二套實作，
   且其註解寫「避免相依 pvalue 的可選 import」，而該檔第 37 行本來就已 import `pChiSq`（紅隊習慣 4）
4. ✅ 重生 `reference.json` 後**其餘 84 組數值逐位元不變**（既有 fixture 的 $|z|$ 都在安全區）

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E49 | ★ **只擋 $n<5$，不看 $n\hat p$**：常態近似真正的條件是 $n\hat p\ge5$ 且 $n(1-\hat p)\ge5$。$n=20$、$x=1$ 時工具照給數字且無警告 |
| E50 | ★ **兩組同為 0% 或同為 100% 時 $z$／$p$ 顯示「—」而無說明**，APA 句仍會寫出「未達顯著差異」。此時 pooled SE = 0、檢定無定義，但報表看不出原因 |
| E51 | **Cohen's $h$ 零基準**：有算、有顯示、無對照。statsmodels `proportion_effectsize` 可直接產生 |
| E52 | ★ **`pPool`／`sePool` 孤兒**：§3.3 的核心慣例（檢定用 pooled、CI 用 unpooled）是本方法最該講清楚的一件事，而兩個 pooled 值都沒呈現 |
| E53 | **未提供連續性校正選項**，也未在報表說明「本工具不套用」⇒ 與 R `prop.test` 預設對照時數字會不同 |
