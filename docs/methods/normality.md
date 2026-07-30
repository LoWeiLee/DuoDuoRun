# 常態性檢定（Normality Tests：Shapiro-Wilk & Kolmogorov-Smirnov with Lilliefors Correction）

> 方法代號 `normality`｜基準組 `reference.json → shapiro_wilk`（2）＋`ks_lilliefors`（2）＋ ★ `ks_lilliefors_grid`（84，2026-07-30 新增）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6a）｜相關文件：`descriptive.md`（偏度與峰度）、`levene.md`（另一個前提檢核）

---

## 1. 這個方法在回答什麼問題

常態性檢定問的是一個**否證式**的問題：

**「如果這批資料真的來自常態母體，我看到的這種偏離形狀，出現的機率有多低？」**

它**不能**證明資料是常態的。$p \ge .05$ 只代表「沒有足夠證據說它不常態」，
而在小樣本裡幾乎什麼都拒絕不了——這是本頁最重要的一句話。

本工具同時跑兩支檢定，因為它們敏感的方向不同：

| 檢定 | 用什麼衡量偏離 | 對什麼敏感 |
|---|---|---|
| **Shapiro-Wilk**（$W$） | 排序後的資料與常態分位數的**迴歸配適度** | 偏態、厚尾、離群值 |
| **Kolmogorov-Smirnov + Lilliefors**（$D$） | 經驗 CDF 與常態 CDF 的**最大垂直距離** | 分布中央的偏離（如雙峰） |

## 2. 什麼時候該用、什麼時候不該用

**該用**

- t 檢定／ANOVA／迴歸之前，檢核「資料或殘差近似常態」的前提
- 決定要走母數還是無母數路線時，作為**參考之一**（不是唯一依據）

**不該用**

- ★ **大樣本（$n>300$）時把它當作唯一判準。** 檢定力隨 $n$ 上升，實務上無關緊要的偏離也會顯著。
  本工具的教學筆記已寫這一點（i18n `norm.notes.compare` 末段），此時應以 Q-Q 圖與偏度／峰度為主
- ★ **極小樣本（$n<20$）時把不顯著讀成「常態」。** 這時檢定力低到幾乎拒絕不了任何東西
- **對「組別」而非「殘差」做檢定**：迴歸與 ANOVA 的前提是**殘差**常態，不是原始變項常態。
  本工具在迴歸模組是對殘差跑 SW（`simpleRegression/compute.js:37`、`multipleRegression/compute.js:45`），
  但在**常態性模組**是對使用者勾選的變項本身跑——兩者用途不同，不要混用

**常見誤用**

1. ★ **Likert 量表資料拿去做常態性檢定，然後宣稱「不常態所以要用無母數」。** 沙盒實測：
   240 組模擬 5 點量表資料（$n=50\sim1000$、四種分布形狀）**240 組全部顯著**。
   離散變項幾乎必然拒絕常態，這個檢定在這裡不提供資訊量
2. **兩支檢定結論不一致時只挑對自己有利的那一支報。** 本工具會明白標示「結果不一致」
3. ★ **把 $p=1.000$ 讀成「完美常態」。** 見 §6 的 R60 與 R61——這個數字在 2026-07-30 之前**有兩種來源都是錯的**
4. **報了檢定卻沒報樣本數。** 沒有 $n$ 的常態性 $p$ 值無法解讀

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $x_{(1)}\le\cdots\le x_{(n)}$ | 排序後的樣本 |
| $\bar x$、$s$ | 樣本平均、樣本標準差（$n-1$ 分母） |
| $\Phi$、$\Phi^{-1}$ | 標準常態的 CDF 與其反函數 |
| $m_i$ | Blom plotting position，$\Phi^{-1}\!\left(\dfrac{i-3/8}{n+1/4}\right)$ |
| $a_i$ | Royston 修正後的權重 |
| $F_{\text{emp}}$ | 經驗累積分布函數 |

### 3.2 Shapiro-Wilk $W$（`normality.js:26–137`）

$$W=\frac{\left(\sum_{i=1}^{n}a_i x_{(i)}\right)^{2}}{\sum_{i=1}^{n}(x_i-\bar x)^2}$$

權重 $a_i$ 由 Blom plotting positions 出發，對 $a_n$（與 $n\ge6$ 時的 $a_{n-1}$）
套用 Royston (1992) 的五次多項式修正（`normality.js:42–61`），其餘 $a_i$ 由
$m_i/\sqrt{\varepsilon}$ 給出（`normality.js:63–88`）。$n=3$ 走 Royston 的固定值特例。

**$p$ 值**（`normality.js:106–136`）走 Royston 對 $\ln(1-W)$ 的常態化轉換，**分兩段**：

| 範圍 | 轉換 |
|---|---|
| $3\le n\le 11$ | $\gamma=-2.273+0.459n$；$w^{*}=-\ln(\gamma-\ln(1-W))$；$\mu,\sigma$ 為 $n$ 的三次多項式 |
| $n\ge 12$ | $w^{*}=\ln(1-W)$；$\mu,\sigma$ 為 $\ln n$ 的多項式 |

$$p=P(Z>z),\qquad z=\frac{w^{*}-\mu}{\sigma}$$

★ **右尾用 `normalSf` 而非 `1 - normalCdf`**（`normality.js:136`）：這是 A5b 的 R55，
否則 $|z|\gtrsim8.3$ 時 $p$ 會塌成恰好 0。

★ **有效範圍**：$3\le n\le 5000$，超出回 `sample-size-out-of-range`（`normality.js:30–32`）。

### 3.3 Kolmogorov-Smirnov 統計量 $D$（`normality.js:158–179`）

$$D=\max_{i}\left\{\left|\frac{i}{n}-\Phi(z_{(i)})\right|,\ \left|\Phi(z_{(i)})-\frac{i-1}{n}\right|\right\},\qquad z_{(i)}=\frac{x_{(i)}-\bar x}{s}$$

★ **兩側都取**（`normality.js:169–175`）：只取上側會系統性低估 $D$。
★ **平均與標準差由樣本估計**，所以標準 KS 分布不適用（會過度保守），必須做 **Lilliefors 修正**。

### 3.4 ★ Lilliefors $p$ 值：兩段式 dispatch（`normality.js:184–332`）

**這一節是本批 L4（R60）的所在，請完整讀。**

Dallal-Wilkinson (1986) 的解析近似為

$$\ln p = -7.01256\,D_*^2\,(n_*+2.78019)+2.99587\,D_*\sqrt{n_*+2.78019}-0.122119+\frac{0.974598}{\sqrt{n_*}}+\frac{1.67997}{n_*}$$

它有**兩個定義域限制**，兩者都必須遵守：

1. ★ **$n>100$ 時要先重標定**（`normality.js:315–318`）：
   $$D_*=D\cdot\left(\frac{n}{100}\right)^{0.49},\qquad n_*=100$$
   否則等於把近似式外推到它沒有被配適過的區域。
2. ★ **只在 $p<0.1$ 有效**（statsmodels 的 docstring 明文）。$p>0.1$ 時改走
   **臨界值表的線性內插**（`normality.js:292–309`）：對給定 $n$ 取出 14 個 $\alpha$
   對應的臨界 $D$，再對 $D$ 內插出 $p$。

臨界值表（`normality.js:213–262`）為 26 個 $n$ 網格 × 14 個 $\alpha$；
$n>1600$ 改走漸近式 $\mathrm{cv}_\alpha=\exp(b_\alpha+c_0\ln n+c_1\ln^2 n)$。
★ **表格法的 $p$ 天然被夾在 $[0.001,\,0.99]$**（表格兩端的 $\alpha$）——這是 statsmodels 的行為，
不是本工具的截斷，寫報告時 $p=0.99$ 應理解為「$\ge.99$」。

★ **本工具採用的是 statsmodels 的 `pvalmethod='approx'` 路徑**（先近似、超出範圍才查表），
不是 `'table'` 路徑（一律查表）。這是一個**慣例選擇**，見 §6。

### 3.5 判讀合成（`Result.jsx:18–26`）

| SW $p$ | KS $p$ | 判讀 |
|---|---|---|
| $\ge.05$ | $\ge.05$ | 近似常態 |
| $<.05$ | $<.05$ | 違反常態 |
| 不一致 | | 結果不一致 |
| 任一變項零變異 | | ★ **無法檢定（零變異）** — R61 新增 |

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 觀察值獨立 | **不檢核**（無從檢核）；教學筆記文字提醒 |
| 至少順序尺度 | Config 只列出 `continuous` 與 `ordinal` 變項（`Config.jsx:15–17`） |
| $n$ 足夠 | SW：$3\le n\le5000$ 硬擋；KS：$n\ge4$ 硬擋（`normality.js:158`） |
| ★ 非零變異 | ★ **2026-07-30 起回傳 `zeroVariance` 旗標**（`normality.js:105`、`165`），UI 顯示警告框並把判讀改為「無法檢定」。修復前是靜默給退化值，見 §8 的 R61 |
| 遺漏值 | 逐變項 listwise 剔除（`compute.js:17–21`），**剔除筆數不回報** |

★ **本模組同時是別人的前提檢核工具**：`assumptionChecker.js:104`、`136`、`154` 與
t 檢定、單因子 ANOVA、雙因子 ANOVA、簡單／多元迴歸都呼叫 `shapiroWilk`。
**但沒有任何一支呼叫 `kolmogorovSmirnov`**（2026-07-30 `grep` 實跑確認）——
Lilliefors 只出現在常態性模組本身。這降低了 R60 的血徑，但也意味著它在別處零覆蓋。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality (complete samples). *Biometrika*, 52(3-4), 591-611. | $W$ 統計量 | 【原文未取得】 |
| Royston, P. (1992). Approximating the Shapiro-Wilk W-test for non-normality. *Statistics and Computing*, 2(3), 117-119. | AS R94 演算法、$a_i$ 的多項式修正、$p$ 的兩段轉換 | 【原文未取得】★ 本工具 §3.2 的全部係數出自此文，**係數本身未經原文核對**，僅由「與 scipy 的數值一致」反證 |
| Lilliefors, H. W. (1967). On the Kolmogorov-Smirnov test for normality with mean and variance unknown. *JASA*, 62(318), 399-402. | 參數由樣本估計時的修正 | 【原文未取得】 |
| Dallal, G. E., & Wilkinson, L. (1986). An analytic approximation to the distribution of Lilliefors's test statistic for normality. *The American Statistician*, 40(4), 294-296. | §3.4 的近似式**與其兩個定義域限制** | 【原文未取得】★ 定義域限制由 statsmodels 原始碼（`_lilliefors.py`）與其 docstring 核實 |

**程序指引**

- statsmodels `statsmodels/stats/_lilliefors.py`（`pval_lf`、`kstest_fit`）與
  `statsmodels/stats/tabledist.py`（`TableDist.prob`）——★ **本工具 §3.4 的權威實作**，逐行對照過
- 臨界值表本身由 statsmodels 以 $10^7$ 次模擬產生，形式為 $\log \mathrm{cv}_\alpha=b_\alpha+c_0\log n+c_1\log^2 n$

## 6. 對照與驗證狀態

**基準組**：`shapiro_wilk`（`W`、`p`）、`ks_lilliefors`（`D`、`p`）、★ `ks_lilliefors_grid`（84 欄）

**tier / status**：三組皆 tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **scipy `shapiro` 逐值**：`W` 相對差 5.5e−10、`p` 5.8e−8，容差為 `DEFAULT_TOL`（1e-6）。★ **`p` 欄原本被放寬到 1e-5，2026-07-30 查證為遺留的假放寬，已收回** |
| 2 | **statsmodels `lilliefors(approx)` 逐值**：`D` **逐位元相同（相對差 0.0）**、`p` 相對差 1.8e−13。★ **`D` 的 1e-4 放寬與 `p` 的整條 SKIP 都在 2026-07-30 刪除**（見 §8 R60） |
| 3 | ★ **`ks_lilliefors_grid`（R60 新建）**：12 個 $n$（4…3000）× 7 個 $D$（0.02…0.55）＝ 84 欄，直接對 $p$ 函式建格點，不經過任何資料集。刻意涵蓋兩個舊 clamp 區與 $n=100$／$n=1600$ 兩個換式邊界 |
| 4 | ★ **1,680 例實際樣本的獨立掃描（2026-07-30）**：$n=4\sim2000$ 六種連續分布 1,440 例 ＋ 5 點量表大量並列 240 例。**$D$ 最大絕對差 1.8e−14、$p$ 最大相對差 1.2e−11、.05 判定零翻面** |
| 5 | ★ **參數空間掃描抓到 R60**：修正前同一批掃描中，480 例大樣本有 **50 例（10.4%）** 本工具印 $p=1.000$ 而權威 $p<.05$（$n=1000\sim2000$ 為 25%），960 例小樣本有 **34 例偽顯著**。詳見 §8 |
| 7 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2／§3.3 的文字規格以 mpmath（dps = 40）重建 $W$、$p$ 與 $D$，**不呼叫 `scipy.shapiro`，也不呼叫 `statsmodels.lilliefors`**（常態 CDF 與分位數走 mpmath 的 `erf`／`erfinv`）。基準點：$W$ 5.418e−10、$p$ 5.707e−08、$D$ **3.185e−15**；1,360 例掃描對 JS 引擎 $W$ 1.020e−09、$p$ 2.667e−08、$D$ 7.626e−13 |
| 8 | ★ **$W$ 的 1e−9 級差異不是浮點誤差**：重寫在 40 位精度下仍與 scipy 差 5.4e−10（double 的 eps 為 2.2e−16）⇒ Royston AS R94 的多項式路線與 scipy 的 FORTRAN `swilk` 之間有**演算法差異**。`DEFAULT_TOL` 涵蓋得住、判讀無影響，但它說明 `shapiro_wilk` 的 verified 鎖住的是「兩套實作結果相近」，不是「係數抄對了」（見下方尚未驗證第 1 項） |
| 9 | ★ **Lilliefors $p$ 無法獨立重寫**：臨界值表本身就是權威（$10^7$ 次模擬），任何重寫都只能重新內插同一張表。本支改採三道替代（逐行對照原始碼 dispatch、84 欄格點、1,680 例端到端掃描），**三道都鎖不住「表本身是否正確」** ⇒ 需要 R 的 `nortest` 作為第三套 dispatch 的證人，見尚未驗證第 2 項 |
| 6 | ★ **行為鎖**：`tests/a6a.behavior.test.js`（28 條）鎖兩個方向的單調性、兩個換式邊界的連續性、表格上下界、兩個舊 clamp 區的判定方向，以及 8 個對 statsmodels 的定點回歸 |

**已知與 SPSS／JASP／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ Lilliefors $p$ 的路線 | statsmodels 的 **approx**（近似優先、$p>0.1$ 查表） | statsmodels 另有 **table**（一律查表）；R `nortest::lillie.test` 用 **DW ＋ Stephens** 的第三套 dispatch | 三者在 $p$ 大的區域會差；**決策區（$p\in[.01,.10]$）才是重點**，尚待 R 端量化（見下） |
| $p$ 的上下界 | 表格路徑夾在 $[0.001,\,0.99]$ | 同 statsmodels；R 的 nortest 上界不同 | $p=0.99$ 要讀成「$\ge.99$」 |
| SW 的 $n$ 上限 | 5000（Royston 1992 的範圍） | R `shapiro.test` 同為 5000；SPSS 無明示上限 | 大於 5000 本工具硬擋、SPSS 照算 |
| KS 的預設 | **一律做 Lilliefors 修正** | SPSS 的「Kolmogorov-Smirnov (Lilliefors)」同；JASP 同 | 一致 |
| 報表內容 | 只有 $W$／$D$ 與 $p$ | SPSS 另報 df；JASP 另報 Q-Q 圖 | 本工具**沒有 Q-Q 圖**（視覺化模組未涵蓋常態檢核） |
| 零變異 | ★ 顯性標示「無法檢定」 | SPSS 報「常數」並跳過 | 2026-07-30 起一致；此前本工具給綠燈 |

### ★ 尚未驗證的部分

1. ★ **四篇方法原文全部未取得。** 其中 Royston (1992) 的影響最實質——§3.2 的**十個多項式係數**
   完全來自本工具的實作，只由「與 scipy 數值一致」反證，**沒有回到原文核對過**。
   scipy 也實作 AS R94，所以這是「同一族演算法的另一次編碼」，正是 §0 品質規範點名的形狀
2. ★ **R 端尚未對照**（本文件定稿時）。`scripts/validation/07_a6_r_audit.R` §2a／§2b 已寫好：
   `shapiro.test` ＋ `nortest::lillie.test`，含 12 組探針（刻意涵蓋兩個舊 clamp 區）。
   ★ **這是 R60 修正後唯一的獨立證人**——statsmodels 是本工具的移植來源，不算第二意見
3. ★ **決策區（$p\in[.01,.10]$）的三方差異未量化。** 修正前的掃描顯示 statsmodels 的
   approx 與 table 兩條路線在 $D\ge0.05$ 時彼此最大差 0.028；本工具跟隨 approx，
   但「跟隨哪一條比較對」沒有第三方裁決，要等 07 號腳本的 nortest 結果
4. ★ **離散資料（Likert）的區域只驗到「與 statsmodels 一致」，沒有驗到「這個檢定在此有意義」。**
   240 組模擬全部顯著（見 §2 誤用 1）。這是方法本身的性質，不是實作問題，但報表**沒有任何提示**（E75）
5. ★ **KS 的 $n>5000$ 路徑無守衛也無基準。** SW 硬擋在 5000，KS 只擋 $n<4$；
   $n=10^5$ 時 `lillieforsPValue` 會走漸近式，而漸近式的外推距離（表格上限 1600）沒有第三方核實
6. **Q-Q 圖與偏度／峰度的整合判讀未實作**：教學筆記寫「搭配 Q-Q 圖（待視覺化模組上線）」，
   而視覺化模組已上線但**不含 Q-Q 圖**（見 `visualization.md`）⇒ 文字承諾與實作不符（E76）
7. **遺漏值剔除筆數不回報**（同型：`kruskal-wallis.md` E65）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 變數 | — | `Result.jsx:76` |
| $n$ | §4（listwise 後） | `compute.js:23`、`Result.jsx:77` |
| SW $W$ | §3.2 | `normality.js:108`、`Result.jsx:78` |
| SW $p$ | §3.2 | `normality.js:136`、`Result.jsx:79` |
| KS $D$ | §3.3 | `normality.js:165–176`、`Result.jsx:80` |
| KS $p$ | §3.4 | `normality.js:311–331`、`Result.jsx:81` |
| 判讀（四值） | §3.5 | `Result.jsx:18–26`、`73`、`99`；i18n `norm.verdict.*` |
| ★ 零變異警告框 | §4 | `Result.jsx:52–56`；i18n `norm.zeroVarianceWarn` |
| 教學模式的解讀句 | §3.5 | `Result.jsx:99–107`；i18n `norm.interp.line` |
| APA 敘述句 | §3.2、§3.3 | `Narrative.jsx:13–24`；i18n `norm.apa.sentence` |
| ★ APA 句的零變異警語 | §4 | `Narrative.jsx:13–15`；i18n `norm.apa.zeroVarianceCaveat` |
| （不呈現）`sample-size-out-of-range` | §3.2 | ★ `normality.js:31` — 引擎回錯誤碼，**Result 表格不顯示**，見 E77 |

**孤兒欄位檢查**（2026-07-30 實跑 `grep -rn "<欄位名>" src/ | grep -v src/lib/stats/`）：
`shapiroWilk` 回傳 4 欄、`kolmogorovSmirnov` 回傳 4 欄。
★ **一個孤兒**：`shapiroWilk` 的 `error: 'sample-size-out-of-range'`（$n>5000$）
在常態性模組**沒有任何消費者**——`Result.jsx` 直接 `fmtNum(NaN)` 印「—」，
使用者看到空白但不知道為什麼（E77）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | SW 五個步驟逐條對得起來。★ **KS 的 $p$ 開出 R60（L4）**：文件（本節修訂前的舊版）寫「Dallal-Wilkinson 近似」，而實作漏了該近似的兩個定義域限制 |
| 2 | authority | ★ **provenance 的 `verification` 欄不實**：`ks_lilliefors` 寫「JS 與其逐值比對」，但 `p` 欄掛著 SKIP 從未比對過。已更正（R60 處置 5） |
| 3 | 文獻真實性 | 四篇卷期頁碼可查、全部標註【原文未取得】。★ Royston 的十個係數未經原文核對，已列入 §6 尚未驗證第 1 項 |
| 4 | 報表可追溯 | 8 欄中 **1 個孤兒**（`sample-size-out-of-range`，E77） |
| 5 | 假設前提 | ★ **開出 R61（L2）**：零變異欄靜默給退化值並被判成「近似常態」綠燈 |
| 6 | 慣例分歧 | 六項書面化。核心是 Lilliefors $p$ 有**三套 dispatch**（statsmodels approx／statsmodels table／R nortest），本工具跟隨第一套 |
| 7 | 邊界條件 | ★ 掃描 1,680 例（$n$、分布形狀、並列強度三個方向）抓到 R60 的兩個失效區；另發現 KS 無 $n$ 上限守衛（§6 第 5 項） |
| 8 | APA 敘述句 | 只報數字、不下判定，無過度宣稱。★ 但零變異時會把 $p=1.000$ 原封不動印進論文（R61 已補警語） |
| 9（A5b 新增） | 數學小工具的第二套實作 | ★ 新增的臨界值表與內插邏輯**是本檔獨有**，`grep` 確認專案內無第二份；`normalCdf`／`normalSf`／`qnorm` 全部沿用 `pvalue.js`，未就地重寫 |
| 10（A5b 新增） | 效果量的名稱與值域 | 本方法無效果量。★ 但 $p$ 的**值域**同樣被檢查：修正前 $p$ 可以是恰好 1（表格法上界應為 0.99），這正是 R60 的症狀之一 |
| 11（R58 新增） | 掃描結論的前提 | ★ 見本節末「掃描的前提與前提外的區域」 |

### R60（L4）Lilliefors $p$ 值的兩個定義域錯誤

**發現**　`lilliforsPValue`（舊名，拼字亦誤）由「Dallal-Wilkinson 公式 ＋ 兩個自製 clamp」構成，
兩件事都錯，而且錯在**相反的方向**：

1. **漏了 $n>100$ 的重標定**。statsmodels 的 `pval_lf` 明寫 `if n > 100: d_max *= (n/100)**0.49; n = 100`，
   舊版直接把原始 $n$ 代入。
2. **漏了 $p>0.1$ 的 dispatch**。DW 近似只在 $p<0.1$ 有效（statsmodels docstring 明文），
   舊版改用 `D < 0.05 → p = 1` 與 `D > 0.30 → p ≤ 0.05\,e^{-5(D-0.30)}` 兩個自製 clamp。

★ **為什麼三道防線全沒抓到**：唯一的基準點 $n=60$、$D\approx0.078$ 落在
「$D>0.05$ 所以不觸發下界 clamp、$D<0.30$ 所以不觸發上界 clamp」的中間帶；
而 $p$ 欄本身掛著 SKIP，理由寫「近似法不同」——**一句把定義域錯誤描述成慣例差異的註解**。
這與 A5a 的 R50 是同一型：*唯一的基準恰好是最安全的那一點，而它的容差早已被放寬*。

**量化（1,440 例連續分布掃描，修正前）**

| 方向 | 觸發條件 | 實測 |
|---|---|---|
| **漏抓** | $n\gtrsim325$（此時 .05 臨界 $D$ 跌破 0.05） | 480 例中 **50 例（10.4%）** 印 $p=1.000$ 而權威 $p<.05$；$n=1000\sim2000$ 為 **25%**。三色燈 47 例 mixed→nonNormal、**3 例本工具給「近似常態」綠燈** |
| **偽顯著** | $n=4\sim7$ 且 $D>0.30$ | 960 例中 **34 例**（$n=4$ 佔 17、$n=5$ 佔 13、$n=6$ 佔 3、$n=7$ 佔 1） |
| 基準點本身 | $n=60$、$p\approx0.44$（近似無效區） | 舊版 **0.4425** vs 權威 **0.5161** |

★ **可達性**：公共行政的問卷研究 $N=400\sim1000$ 是常態，正好落在漏抓區的核心。

**處置（Kevin 2026-07-30 核定：完整移植，含臨界值表）**

1. ✅ **忠實移植 statsmodels 的 approx 路徑**：`pval_lf`（含重標定）＋ `TableDist.prob`（$p>0.1$）。
   新增 26×14 臨界值表與 14×3 漸近式係數（`normality.js:213–262`），
   內插邏輯 `lillieforsCritvals`／`lillieforsTableProb`（`normality.js:267–309`）
2. ✅ **函式更名並匯出**：`lilliforsPValue` → `lillieforsPValue`（原拼字錯誤），
   匯出以供格點基準的 adapter 直接呼叫
3. ✅ **新增基準組 `ks_lilliefors_grid`**（84 欄）。基準組 **85 → 86**
4. ✅ **收回容差**：`ks_lilliefors.D` 的 1e-4 與 `shapiro_wilk.p` 的 1e-5 全部刪除；
   `ks_lilliefors.p` 的 SKIP 整條刪除，改為 `DEFAULT_TOL` 正常比對
5. ✅ **更正 provenance**：`ks_lilliefors` 的 `verification` 原稱「逐值比對」，與 SKIP 的存在矛盾
6. ✅ **28 條行為鎖**（`tests/a6a.behavior.test.js`）
7. ✅ **`reference.json` 完整重生**：既有 **85 組數值與 source 字串逐位元不變**，`datasets.json` 逐位元不變

**修正後**：1,440 例連續分布掃描 max 相對差 **1.2e−11**、.05 判定**零翻面**；
基準點 $p$ 由 0.4425 → **0.516054469789958**（權威 0.5160544697900533，相對差 1.8e−13）。

### R61（L2）零變異欄被判成「近似常態」綠燈

**發現**（2026-07-30 實跑，不是讀碼推論）：對一個常數欄跑常態性檢定，
引擎回 `W = 1、p = 1、D = 0、p = 1`，`verdictKey` 判定為 `normal`，UI 印**綠色的「近似常態」**——
在報表上它看起來是**全套最常態的變項**。APA 句照樣輸出 `W = 1.000, p = 1.000`。

★ 與 A4 的 R40-h（零變異死題目拿到 loading 1.000）、A5a 的 R51（零變異 t 檢定印「$p<.001$ 綠燈」）
是同一型：**該擋沒擋，而失敗偽裝成成功**。

**處置（L2，當場修）**

1. ✅ 引擎回傳 `zeroVariance: true`（`normality.js:105`、`165`），**退化值本身不變**（不影響任何既有 fixture）
2. ✅ `verdictKey` 增加第四種判讀 `undefinedTest`（「無法檢定（零變異）」），燈號取消
3. ✅ 表格上方警告框（`Result.jsx:52–56`）＋ APA 句句首警語（`Narrative.jsx:13–15`）
4. ✅ i18n 中英各 3 鍵（`norm.verdict.undefinedTest`、`norm.zeroVarianceWarn`、`norm.apa.zeroVarianceCaveat`）
5. ✅ 行為測試含**回歸鎖**：有變異的資料，旗標必須為假

### R63（L1）兩處過期／不實的區塊註解

★ **這是 A3c R34-a 的同型，而且是被驗收 subagent 抓到的、我自己漏掉的一項。**

1. `kolmogorovSmirnov` 的 JSDoc（`normality.js:143–156`）仍寫「$D<0.05$ 時樣本接近完美常態，
   $p$ 約 1，給粗略保守值」——**那正是 R60 移除的那個 clamp**。改實作而漏改註解，
   下一個維護者第一眼讀到的就是錯的行為描述。
2. 同一段宣稱「與 `R::nortest::lillie.test()`、SPSS Lilliefors-corrected KS 一致到小數第 3 位」，
   而**專案內沒有任何證據支持這句話**——R 從未跑過、SPSS 從未對照過。
   ⇒ 這是紅隊第 2 條（authority 是否真的支持）在**註解層**的版本：
   **檔頭註解也會「以記憶充當引用」。**

處置：兩處都已更正，第二項改標為待驗證並指向 `07_a6_r_audit.R` 第 [2b] 段與本文件 §6。

### ★ 掃描的前提與前提外的區域（R58 那條）

本節所有「零翻面」「max 相對差 1.2e−11」的結論，前提是：

- **連續分布**：常態、對數常態、$t(12)$、雙峰混合、gamma、均勻，$n\in[4,2000]$
- **離散並列**：5 點量表四種分布形狀，$n\in[50,1000]$
- **權威為 statsmodels 的 approx 路徑**

**前提外、尚未量化的區域**：
1. $n>2000$（實際樣本掃描的上限；格點基準有 $n=3000$，但那是對 $p$ 函式而非對樣本）
2. $n>5000$（SW 硬擋、KS 不擋，見 §6 第 5 項）
3. **與 R `nortest` 的差異**——07 號抽驗腳本已備妥，尚未執行
4. 極端離群值主導的樣本（掃描含 gamma 與對數常態，但未刻意注入單點離群值）

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E75 | ★ **離散資料沒有任何提示**：Likert 資料幾乎必然拒絕常態（240/240 實測），報表卻照樣輸出「違反常態」，使用者容易據此改走無母數而不知道這個檢定在此不提供資訊量。建議偵測「相異值 ≤ 10 且皆為整數」時加註記 |
| E76 | ★ **教學筆記承諾的 Q-Q 圖不存在**：i18n `norm.notes.reading` 寫「搭配 Q-Q 圖（待視覺化模組上線）」，而視覺化模組**已上線且不含 Q-Q 圖** ⇒ 文字承諾與實作不符（同型：A3b 的 R32） |
| E77 | **`sample-size-out-of-range` 是孤兒**：$n>5000$ 時引擎回錯誤碼，UI 只印「—」，不說明原因 |
| E78 | **遺漏值剔除筆數不回報**（同型：`kruskal-wallis.md` E65） |
| E79 | **KS 無 $n$ 上限守衛**：SW 擋在 5000，KS 不擋；漸近式在 $n\gg1600$ 的外推距離無第三方核實 |
