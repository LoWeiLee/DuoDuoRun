# Mann-Whitney U 檢定（Mann-Whitney U / Wilcoxon Rank-Sum Test）

> 方法代號 `mann-whitney`｜基準組 `reference.json → mann_whitney`（2）＋`mann_whitney_small`（3）＋`mann_whitney_ties`（2）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A5b）｜相關文件：`wilcoxon-signed-rank.md`（配對版）、`kruskal-wallis.md`（三組以上）

---

## 1. 這個方法在回答什麼問題

$t$ 檢定問「兩組的平均數有沒有差」，前提是資料大致常態。
但如果資料是 Likert 量表、有極端值、或樣本小到看不出分布，平均數就不好用了。

Mann-Whitney U 把資料換成**名次**再比：

**「把兩組資料混在一起從小排到大，其中一組的名次是不是系統性地偏前面（或偏後面）？」**

如果兩組來自同一個分布，兩組的名次和應該差不多。差得越多，越難用巧合解釋。

★ 這個方法有一個等價的直觀說法：$U$ 就是「從第一組隨機抽一個、從第二組隨機抽一個，
第一個比第二個大的配對有幾組」。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 兩組獨立樣本，依變項至少是順序尺度
- 資料不常態、有極端值，或樣本小
- Likert 量表的兩組比較

**不該用**

- ★ **想宣稱「中位數不同」，但兩組分布形狀差很多**。$U$ 檢定的虛無假設嚴格說是「兩個分布相同」；
  要把顯著解讀成「中位數位置不同」，需要額外假設兩組**形狀類似**（本工具的前提說明有寫）。
  形狀差異（例如變異數差很大）也會讓 $U$ 顯著
- **配對／前後測**：用 Wilcoxon signed-rank
- **三組以上**：用 Kruskal-Wallis
- **樣本大又常態**：$t$ 檢定通常檢定力更高

**常見誤用**

1. ★ **把 $U$ 的數值直接寫進論文卻沒說是哪個慣例。** $U_1$、$U_2$、$\min(U_1,U_2)$ 三個都有人報（見 §3.2）
2. ★ **小樣本時把本工具的 $p$ 當成 SPSS 的 $p$。** SPSS 小樣本預設報**精確** $p$，本工具只有常態近似（見 §6）
3. **報了 $p$ 沒報效果量。** 本工具提供 $r=|z|/\sqrt N$
4. **把「不顯著」講成「兩組相同」。**

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $n_1$、$n_2$ | 兩組樣本數（本工具要求各 $\ge2$） |
| $N=n_1+n_2$ | 合併樣本數 |
| $R_1$ | 第一組在**合併排名**中的名次和（並列給平均秩） |
| $t_i$ | 第 $i$ 個並列組的大小（只計大小 > 1 者） |

### 3.2 統計量與 ★ $U$ 的慣例

（`nonparametric.js:47–49`）

$$U_1=R_1-\frac{n_1(n_1+1)}{2},\qquad U_2=n_1n_2-U_1,\qquad U=\min(U_1,U_2)$$

| 決策點 | 本工具 | 他方 |
|---|---|---|
| ★ **報哪個 $U$** | **$U=\min(U_1,U_2)$**（SPSS 慣例），同時保留 `U1`、`U2` 兩欄 | scipy `mannwhitneyu` 報**第一組的 $U_1$**；R `wilcox.test` 報的 `W` 即 $U_1$ |
| 換算 | $U_1+U_2=n_1n_2$，三者可互相換算 | ★ `tests/adapters.mjs:189` 就是把 JS 的 `R1` 換算成 scipy 的 $U_1$ 慣例後才比對 |

### 3.3 常態近似、並列校正與連續性校正

期望值與變異數（`nonparametric.js:51`、`57–64`）：

$$\mu=\frac{n_1n_2}{2},\qquad
\sigma^2=\begin{cases}
\dfrac{n_1n_2(N+1)}{12} & \text{無並列}\\[2ex]
\dfrac{n_1n_2}{N(N-1)}\cdot\dfrac{N^3-N-\sum_i(t_i^3-t_i)}{12} & \text{有並列}
\end{cases}$$

★ **連續性校正**（`nonparametric.js:69`、`76–78`）——**先取絕對值扣 0.5，再除 $\sigma$**：

$$|z_{\text{CC}}|=\frac{\max\bigl(0,\;|U_1-\mu|-0.5\bigr)}{\sigma},\qquad
z=\operatorname{sign}(U_1-\mu)\cdot|z_{\text{CC}}|,\qquad
p=2\cdot P(Z>|z_{\text{CC}}|)$$

效果量（`nonparametric.js:80`）：$r=|z_{\text{CC}}|/\sqrt N$，分級採 Cohen 四級
（`src/lib/format.js` 的 `effectBandR`：$<.10$ 微弱 / $<.30$ 小 / $<.50$ 中 / $\ge.50$ 大）。

| 決策點 | 本工具 | 說明 |
|---|---|---|
| ★ **精確 vs 常態近似** | ★ **只有常態近似**，無論樣本多小 | 缺口已量化，見 §6 第 4 道 |
| ★ **連續性校正** | **套用** | 與 R `wilcox.test(correct = TRUE)` 同口徑。★ **SPSS 的 Asymp. Sig. 不套用** ⇒ 本工具的 $p$ 略大於 SPSS 的漸近 $p$ |
| **並列校正** | **套用**（有並列時自動切換公式） | 與 scipy／R 一致 |
| 極端並列的防護 | $\sigma^2$ 取 $\max(0,\cdot)$（`:64`）；$\sigma=0$（全部並列）時回 $z=0,\;p=1$（`:71–74`） | 防 $\sqrt{\text{負數}}$ |
| $p$ 的算法 | `2 * normalSf(|z|)`（`:78`） | ★ 不可寫 $2(1-\Phi)$，見 `z-prop.md` §8 的 R55 |

### 3.4 尾機率（★ R55）

以 `normalSf`（`pvalue.js:165`）直接取上尾。2026-07-30 之前此處寫 `2 * (1 - normalCdf(zCC))`，
在 $|z|\ge8.3$ 會回傳恰好 0。詳見 `z-prop.md` §8。

## 4. 假設前提與本工具的檢核方式

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 兩組各 $n\ge2$ | `nonparametric.js:43` | 錯誤碼 `each-group-needs-n>=2`，擋住 |
| 恰好兩組 | `nonparametric/compute.js:36` | 錯誤碼 `groupVarBadGroups` ＋ 實際組數，擋住 |
| 依變項可轉為有限數值 | `compute.js:30–31`（非數值列直接略過） | ★ 靜默略過，**不回報略過幾筆**（見 E54） |
| ★ 樣本量足以用常態近似 | `smallSampleWarning`（$n_1<10$ 或 $n_2<10$，`nonparametric.js:81`） | 明文提示「常態近似的精度有限」，**不擋** |
| ★ **兩組分布形狀類似** | ★ **完全不檢核** | 只在 Notes 的「前提假設」文字中說明，報表無燈號 |
| 觀察彼此獨立 | ★ **完全不檢核** | 同上 |
| 有並列 | `tieCorrection`（`:89`） | 報表顯示「結果含並列校正」 |
| ★ 一般前提檢核區（`assumptionChecker`） | ★ **零涵蓋**：對 `nonparametric` 回 `null` | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Wilcoxon, F. (1945). Individual comparisons by ranking methods. *Biometrics Bulletin*, 1(6), 80–83. | §3.2 秩和檢定的原始構想 | ★ **【原文未取得】** |
| Mann, H. B., & Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other. *The Annals of Mathematical Statistics*, 18(1), 50–60. | §3.2 $U$ 統計量與其分布 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **scipy** `stats.mannwhitneyu(method='asymptotic', use_continuity=True)` | ★ 三組基準的 $U$、$p$ 產生方 |
| **scipy** `stats.mannwhitneyu(method='exact')` | ★ `mann_whitney_small.pExact` 的產生方（本工具無對應實作，見 §6） |
| R `stats::wilcox.test` 官方手冊（R 4.6.0） | §3.3 連續性校正與「$n<50$ 且無並列時預設走精確法」的依據。★ 已實際查閱線上手冊 |

## 6. 對照與驗證狀態

**基準組（三組）**

| 組 | 欄位 | 內容 |
|---|---|---|
| `mann_whitney` | 2 | `main` 的 `x1 ~ group2`（$n_1=n_2=30$、連續值、無並列）：`U`、`p` |
| `mann_whitney_small` | 3 | `datasets.json:small` 的 `v ~ g`（$n_1=4$、$n_2=5$）：`U`、`p`、★ `pExact` |
| `mann_whitney_ties` | 2 | `datasets.json:ties` 的 `v ~ g`（$n_1=12$、$n_2=13$、大量並列）：`U`、`p` |

**tier / status**：tier **A** / **verified**（三組皆是）

| 道 | 內容 |
|---|---|
| 1 | **scipy 逐值**：7 欄中 6 欄比對（`pExact` 為 SKIP）。$U$ 三組**逐位元相同**，三個 $p$ 為 **4.0e−14 / 6.9e−14 / 6.0e−14** |
| 2 | ★ **容差收緊（A5a 習慣 8）**：`compare.test.js` 原將 `mann_whitney_small.p` 放寬到 **1e-4**，註解寫「小樣本常態近似的邊界行為」；`mann_whitney_ties.p` 同樣放寬到 1e-4 且**無註解**。逐一重驗確認兩者都是 2026-07-02 修 `erf` 之前的遺留，實測差 6e−14 級 ⇒ **兩條放寬刪除，改回 `DEFAULT_TOL`** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3 的公式文字自行實作平均秩、並列校正與連續性校正，尾機率走 **mpmath 的高精度 `erfc`**（完全不呼叫 `scipy.mannwhitneyu`）。掃描 **1,728 個情境**（$n_1,n_2\in3..14$ × 三種並列強度〔連續值／中度並列／重度二值〕× 4 重複），比對 `U1`、`z`、`p` 三欄：**最大相對差 4.8e−13、$U$ 慣例零次不符、零個 .05 判定翻面** |
| 4 | ★ **精確法缺口的窮盡量化（A5a 習慣 7、8）** —— 無並列時精確 $p$ 只依賴 $(n_1,n_2,U)$，故可**對 $U$ 全枚舉**而非抽樣。以動態規劃建出 $U$ 的完整分布，掃描 $n_1\le n_2$、$3..25$ 的所有組合 × $U$ 全枚舉，共 **54,878 個格點**：<br>　• .05 判定翻面 **110 格（0.20%）**<br>　• ★ **全部 110 格都是「精確顯著、近似不顯著」的保守方向；「近似顯著、精確不顯著」＝ 0 格**<br>　• 精確與近似的最大絕對差 **0.0375**（$n_1=n_2=3$、$U=3$：0.700 vs 0.663）<br>⇒ 缺 exact 法會**少抓到極少數真效果，不會製造假效果**。這是與 R50 完全相反的結論：R50 的唯一基準恰在安全點上，而本組的三個基準所在的參數區域**沒有隱藏危險方向** |
| 5 | ★ **並列 × 小樣本的交叉方向**：1,728 個情境中重度並列（值域只有兩個值）佔三分之一，$\sigma^2$ 取 $\max(0,\cdot)$ 與 $\sigma=0$ 兩條防護路徑都被實際走到，未出現 NaN 或負變異 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ 報哪個 $U$ | $\min(U_1,U_2)$（另存 $U_1$、$U_2$） | scipy／R 報 $U_1$ | 數字不同但可換算；報告時要說明用哪個慣例 |
| ★ 連續性校正 | **套用** | R `wilcox.test` 預設套用（`correct = TRUE`）；★ **SPSS 的 Asymp. Sig. 不套用** | ★ 本工具的 $p$ **略大於** SPSS 的漸近 $p$ |
| ★ 精確 vs 近似 | **只有近似** | ★ R **預設在 $n<50$ 且無並列時走精確法**（R 官方手冊）；SPSS 小樣本預設 Exact Sig. | ★ 小樣本時三方都可能給出不同的 $p$；本工具最保守 |
| 並列校正 | 套用 | scipy／R 同 | 無 |
| 有並列時的精確法 | 無 | R 用 Streitberg–Röhmel 位移演算法做條件精確推論 | 並列 ＋ 小樣本時差距最大 |
| 效果量 | $r=|z|/\sqrt N$ | SPSS 不報；R 不報 | 無第三方對照（見下） |
| Hodges-Lehmann 位置差估計與其 CI | **未實作** | R `wilcox.test(conf.int=TRUE)` 有 | 無法報「中位數差多少」的點估計與 CI |

### ★ 尚未驗證的部分

1. ★ **兩篇方法原文未取得**（Wilcoxon 1945、Mann & Whitney 1947）⇒ §3.2／§3.3 的公式只對到 scipy 的行為
2. ★ **從未與 SPSS 對照過**。「SPSS 的 Asymp. Sig. 不套用連續性校正」這句話的來源是**第三方教學文件，IBM 官方文件未取得** ⇒ 標為待核。★ R 那一側已查閱官方手冊（R 4.6.0 `wilcox.test`），可信度較高
3. ★ **效果量 $r$ 零基準**：`r` 欄位有算、有顯示、進 APA 句，但 `reference.json` 沒有對應欄。可用 pingouin 的 `mwu`（回傳 RBC 與 CLES）作為第三方對照，但**那是不同的效果量定義**，不是 $|z|/\sqrt N$ ⇒ 目前無直接對照對象（E55）
4. ★ **`pExact` 是 SKIP 而非對照**：JS 無精確法，該欄永遠 `undefined`。缺口已量化為保守方向（見上表第 4 道），Kevin 2026-07-30 裁決維持 backlog P2
5. ★ **`continuityCorrection` 是孤兒欄位**：引擎回傳一個恆為 `true` 的旗標，`src/` 內零讀取者——報表上的連續性校正說明是靜態 i18n 字串，不讀這個欄位
6. **精確法（含並列的條件精確）、Hodges-Lehmann 估計與 CI、單尾檢定**皆未實作 ⇒ 無基準
7. **依變項的非數值列被靜默略過**，略過筆數不回報（E54）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $U$ | §3.2 | `nonparametric.js:49`、`nonparametric/Result.jsx` |
| $U_1$、$U_2$ | §3.2 | `nonparametric.js:47–48` |
| 兩組秩和 $R_1$、$R_2$ | §3.1 | `nonparametric.js:45–46`、`84` |
| $n_1$、$n_2$、$N$ | §3.1 | `nonparametric.js:41–42`、`52` |
| $z$ | §3.3 | `nonparametric.js:77`、`86` |
| $p$ ＋顯著標記 | §3.3、§3.4 | `nonparametric.js:78`、`87` |
| 效果量 $r$ ＋分級 | §3.3 | `nonparametric.js:80`、`Result.jsx:32`（`effectBandR`） |
| 「結果含並列校正」 | §3.3 | `nonparametric.js:89`、i18n `np.result.tieNote` |
| 「已套用 ±0.5 連續性校正」說明 | §3.3 | ★ 靜態 i18n `np.result.continuityNote`（**不讀 `continuityCorrection` 欄位**） |
| 「樣本量小（n < 10）」提示 | §4 | `nonparametric.js:81`、`Result.jsx:78`、`131` |
| APA 句 | §3.2、§3.3 | `nonparametric/Narrative.jsx:22–36` |

**孤兒欄位檢查**（2026-07-30 實跑）：`mannWhitneyU` 回傳的 14 欄中
**`continuityCorrection` 為孤兒**，其餘 13 欄有讀取者。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 1,728 情境最大相對差 4.8e−13。**無公式錯誤**。$p$ 的算法有 R55（見 `z-prop.md` §8），已修 |
| 2 | authority | provenance 只寫 `scipy`，未記錄「$U$ 的慣例與 scipy 不同、需換算後才可比對」——而 `adapters.mjs:187–190` 的註解有寫，兩處資訊不對稱 |
| 3 | 文獻真實性 | Mann & Whitney (1947) *Ann Math Stat* 18(1) 50–60、Wilcoxon (1945) *Biometrics Bull* 1(6) 80–83 卷期頁碼可查；原文未取得並據實標註。★ R 官方手冊已實際查閱 |
| 4 | 報表可追溯 | 14 欄中 1 個孤兒（`continuityCorrection`） |
| 5 | 假設前提 | $n$ 與組數守衛完整、小樣本有提示；★ **「兩組分布形狀類似」只在 Notes 文字裡，報表無燈號**——而這是把顯著解讀成「中位數不同」的必要條件 |
| 6 | 慣例分歧 | 八項書面化。★ 修正了一句錯誤的既有說明：i18n 原寫「與 SPSS / R wilcox.test 預設一致」，實際上 **SPSS 不套連續性校正**，且 **R 預設在 $n<50$ 無並列時走精確法而非近似法** |
| 7 | 邊界條件 | ★ 本組的重點。$U$ 全枚舉 54,878 格點的窮盡掃描，確認缺 exact 法**只往保守方向偏**；重度並列與 $\sigma=0$ 的防護路徑都被實走 |
| 8 | APA 敘述句 | 報 $U$、$z$、$p$、$r$ ＋分級，句子誠實；★ 未標明 $U$ 用的是 $\min$ 慣例、也未標明 $p$ 是常態近似值 |

### 本批本組的處置

| # | 級 | 內容 | 處置 |
|---|---|---|---|
| R57a | L2 | i18n `continuityNote` 宣稱「與 **SPSS** / R wilcox.test 預設一致」——SPSS 的 Asymp. Sig. **不套** CC；且 R 的「預設」在 $n<50$ 無並列時是**精確法**，並非套了 CC 的近似法 | ✅ 當場修（zh-TW 與 en 同步）：改為「與 R `correct = TRUE` 同口徑，但 R 在 $n<50$ 無並列時預設走精確法；SPSS 的 Asymp. Sig. 不套 CC，故本工具的 $p$ 會略大於 SPSS 的漸近 $p$」 |
| R57b | L1 | i18n `formulaMWZ` 顯示 `z = (U₁ − μ) / σ`，**沒寫出實作實際扣掉的 0.5**（紅隊習慣 4：改口徑時說明要跟著改） | ✅ 當場修：改為 `z = (|U₁ − μ| − 0.5) / σ，含連續性校正與並列校正；p = 2·P(Z > |z|)` |
| R54b | L2 | 效果量 $r$ 的分級函式 `effectKey` 在 `Result.jsx` 與 `Narrative.jsx` **各實作一次**（紅隊習慣 3），且**只有三級**，而同模組 Notes 文字宣告四級（含「微弱 < 0.1」）⇒ 使用者永遠看不到「微弱」 | ✅ 當場修：收斂為 `src/lib/format.js` 的 `effectBandR`（Cohen 四級），兩處改為 import；i18n 的 `np.result.effect` 補上 `trivial` 鍵（zh／en） |
| R55 | L3 | 雙尾 $p$ 的尾端抵消 | ✅ 見 `z-prop.md` §8。本支的 `nonparametric.js:78` 已改走 `normalSf` |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E54 | **依變項的非數值列被靜默略過**（`compute.js:30–31`），略過筆數不回報 ⇒ 使用者不知道分析的 $n$ 少了幾筆（同型問題見 `kruskal-wallis.md` E56） |
| E55 | **效果量 $r$ 零基準**：pingouin 的 `mwu` 報 RBC 與 CLES，皆非 $|z|/\sqrt N$ ⇒ 目前沒有可直接對照的第三方 |
| E56 | ★ **「兩組分布形狀類似」無燈號**：這是把顯著解讀為「中位數位置不同」的必要條件，只寫在 Notes 文字中 |
| E57 | ★ **APA 句未標明 $U$ 的慣例與「$p$ 為常態近似」**：審稿人用 R 或 SPSS 複算時，$U$ 與 $p$ 都可能對不上 |
| E58 | **`continuityCorrection` 孤兒**：恆為 `true` 的旗標無人讀，說明改走靜態字串 ⇒ 若未來加入「可關閉 CC」的選項，這個字串不會跟著變 |
| E59 | **Hodges-Lehmann 位置差估計與 CI 未實作** ⇒ APA 7 建議報效果量的點估計與區間，本工具只能給 $r$，給不出「中位數差多少」 |
