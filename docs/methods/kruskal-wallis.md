# Kruskal-Wallis H 檢定與 Dunn 事後比較（Kruskal-Wallis H Test & Dunn's Post-Hoc）

> 方法代號 `kruskal-wallis`｜基準組 `reference.json → kruskal_wallis`（4）＋ ★ `kruskal_dunn`（6，2026-07-30 新增）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A5b）｜前置閱讀：`mann-whitney.md`（兩組版）、`anova-oneway.md`（母數對應版）

---

## 1. 這個方法在回答什麼問題

單因子 ANOVA 問「三組以上的平均數有沒有差」，前提是各組大致常態、變異數同質。
Kruskal-Wallis 是它的名次版：

**「把所有組的資料混在一起排名次，各組的平均名次是不是差得比巧合該有的程度更多？」**

顯著之後只知道「至少有兩組不同」，不知道是哪幾組——這就需要**Dunn 事後比較**：
對每一對組別，用**全體資料的名次**算出平均名次差的 $z$，再對多重比較做校正。

★ Dunn 與「對每兩組各跑一次 Mann-Whitney」不同：Dunn 的標準誤來自**全部 $N$ 筆**的名次變異，
不是那兩組的；這與 Tukey 相對於兩兩 $t$ 檢定的優勢是同一個道理。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 三組以上獨立樣本，依變項至少順序尺度
- 各組不常態、變異數明顯不等，或樣本小
- Likert 量表的多組比較

**不該用**

- ★ **想宣稱「中位數不同」，但各組分布形狀差很多**（與 Mann-Whitney 同一個限制）
- **重複測量／配對設計**：要用 Friedman（**未實作**）
- **只有兩組**：用 Mann-Whitney（本工具在 < 3 組時報錯）
- **各組常態且變異數同質**：單因子 ANOVA 檢定力更高

**常見誤用**

1. ★ **H 不顯著卻去讀 Dunn 的結果。** 本工具的 Dunn 是**選項勾選才跑**，不看 H 的 $p$——比 Tukey 那支（無條件顯示）好一些，但仍不擋
2. ★ **把效果量的名稱寫錯。** 本工具報的是 $\eta^2_H$，不是 $\varepsilon^2$（見 §3.4，這是本批的 R54）
3. **只看 Dunn 的未校正 $p$。** 判讀應以 Bonferroni 校正後的 $p$ 為主
4. **把「不顯著」講成「各組相同」。**

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $k$ | 組數（本工具要求 $\ge3$） |
| $n_g$、$R_g$、$\bar R_g$ | 第 $g$ 組的樣本數、名次和、平均名次 |
| $N=\sum_g n_g$ | 總樣本數（要求 $N>k$） |
| $t_j$ | 第 $j$ 個並列組大小 |

### 3.2 H 統計量與並列校正

（`nonparametric.js:221–231`）

$$H=\frac{12}{N(N+1)}\sum_{g=1}^{k}\frac{R_g^2}{n_g}-3(N+1),\qquad
H'=\frac{H}{1-\dfrac{\sum_j(t_j^3-t_j)}{N^3-N}},\qquad
\mathrm{df}=k-1$$

$p$ 由卡方右尾取得（`nonparametric.js:234`，`pChiSq`＝正規化上不完全 gamma）。

★ 並列校正只在校正因子 > 0 時施加（`nonparametric.js:231`）。因子為 0 意味**全部資料完全並列**，
此時各組平均名次相同、$H$ 本來就是 0、$p=1$，不施加校正不影響結果。

### 3.3 Dunn 事後比較

（`nonparametric.js:289–305`）

$$\mathrm{SE}_{ij}=\sqrt{\left[\frac{N(N+1)-\dfrac{\sum_j(t_j^3-t_j)}{N-1}}{12}\right]\left(\frac1{n_i}+\frac1{n_j}\right)},\qquad
z_{ij}=\frac{\bar R_i-\bar R_j}{\mathrm{SE}_{ij}}$$

$$p_{ij}^{\text{raw}}=2\cdot P(Z>|z_{ij}|),\qquad
p_{ij}^{\text{adj}}=\min\bigl(1,\;p_{ij}^{\text{raw}}\cdot m\bigr),\quad m=\frac{k(k-1)}{2}$$

| 決策點 | 本工具 | 說明 |
|---|---|---|
| ★ **多重比較校正** | **Bonferroni** | 最保守、family-wise error 控制最嚴。scikit-posthocs 與 R 的 `dunnTest` 另提供 Holm、Šidák、BH（FDR）等——**本工具只有 Bonferroni**，不可選 |
| 參考分布 | **常態**（非 $t$） | Dunn 的推導建立在名次的常態近似上 |
| 並列校正 | 套用（分子扣 $\sum(t^3-t)/(N-1)$） | 與 scikit-posthocs 一致 |
| 觸發條件 | ★ **使用者勾選才跑**，不看 H 的 $p$ | 見 §2 第 1 點 |
| $p$ 的算法 | `2 * normalSf(|z|)`（`:302`）★ R55 修正後 | 見 `z-prop.md` §8 |

### 3.4 ★ 效果量：R54 的核心

（`nonparametric.js:236–237`）

$$\eta^2_H=\max\!\left(0,\;\frac{H-k+1}{N-k}\right)$$

★ **這個量叫 $\eta^2_H$（基於 H 的偏誤校正 eta squared），不叫 $\varepsilon^2$。**

| 量 | 公式 | 出處 | 是否偏誤校正 |
|---|---|---|---|
| ★ **$\eta^2_H$（本工具）** | $(H-k+1)/(N-k)$ | rstatix `kruskal_effsize(method="eta2")` 文件所稱的 `eta2[H]` | **是** |
| rank $\varepsilon^2$ | $H/(N-1)$ | effectsize `rank_epsilon_squared()`；rstatix 的 `method="epsilon2"` | 否（故略大於 $\eta^2_H$） |

兩者都引 Tomczak & Tomczak (2014)，而該文本身就有把兩個名稱互相誤植的問題——這是誤標的常見來源。

★ **偏誤校正的代價是原式在 $H$ 很小時會落到負值。** 沙盒實測 225 個情境中 **111 個（49%）為負，最小 $-0.375$**。
rstatix 的文件明文說明「the raw formula can return a small negative value for a near-null effect …
In that case the estimate is floored to 0」——本工具 2026-07-30 起跟進 floor（引擎另保留未 floor 的
`eta2HRaw` 供除錯，UI 不呈現）。

分級沿用常見門檻：$.01\le\eta^2<.06$ 小 / $.06\le\eta^2<.14$ 中 / $\ge.14$ 大。

## 4. 假設前提與本工具的檢核方式

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| $k\ge3$ | `compute.js:79`（引擎本身容許 $k\ge2$，`nonparametric.js:211`） | 錯誤碼 `factorBadGroups` ＋ 實際組數，擋住 |
| $N>k$ | `nonparametric.js:219` | 錯誤碼，擋住 |
| 各組至少 1 筆 | `nonparametric.js:213` | 錯誤碼 `group-empty`，擋住 |
| Dunn 需 $k\ge3$ | `nonparametric.js:274` | 錯誤碼；`compute.js:86` 靜默不掛上 `dunn` 欄 |
| 依變項可轉為有限數值 | `compute.js:72–73`（非數值列略過） | ★ 靜默略過，不回報筆數（E65） |
| 有並列 | `tieCorrection`（`:241`、`:315`） | 報表顯示「結果含並列校正」 |
| ★ **各組分布形狀類似** | ★ **完全不檢核** | 只在 Notes 的「前提假設」文字中說明，報表無燈號 |
| ★ **H 顯著才該讀 Dunn** | ★ **不檢核**，但 Dunn 需使用者主動勾選；未勾選時報表顯示「建議勾選以啟用」的提示 | 無硬擋 |
| 各組獨立 | ★ **完全不檢核** | 同上 |
| ★ 一般前提檢核區（`assumptionChecker`） | ★ **零涵蓋** | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. *Journal of the American Statistical Association*, 47(260), 583–621. | §3.2 H 統計量 | ★ **【原文未取得】** |
| Dunn, O. J. (1964). Multiple comparisons using rank sums. *Technometrics*, 6(3), 241–252. | §3.3 事後比較 | ★ **【原文未取得】** |
| Tomczak, M., & Tomczak, E. (2014). The need to report effect size estimates revisited: An overview of some recommended measures of effect size. *Trends in Sport Sciences*, 1(21), 19–25. | §3.4 $\eta^2_H$ 與 $\varepsilon^2$ | ★ **【原文未取得】**——★ 但 §3.4 的公式歸屬**不是**依本文推斷，而是依 rstatix 與 effectsize 兩套 R 套件的官方文件（已實際查閱） |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **scipy** `stats.kruskal` | ★ `kruskal_wallis` 的 `H`、`p` 基準產生方 |
| ★ **scikit-posthocs** `posthoc_dunn`（`p_adjust=None` 與 `'bonferroni'`） | ★ `kruskal_dunn` 基準的產生方（2026-07-30 / R56 新增） |
| ★ **rstatix** `kruskal_effsize` 官方文件 | ★ §3.4 的 `eta2[H]` 公式歸屬與「floor 到 0」的依據。已實際查閱線上文件 |
| ★ **effectsize** `rank_epsilon_squared` 官方文件 | ★ §3.4 的 rank $\varepsilon^2 = H/(N-1)$ 定義與「值域 0 到 1」的依據。已實際查閱線上文件 |

## 6. 對照與驗證狀態

**基準組（兩組）**

| 組 | 欄位 | 內容 |
|---|---|---|
| `kruskal_wallis` | 4 | `main` 的 `y ~ group3`（$k=3$、各 $n=20$、$N=60$）：`H`、`p`、`df`、★ `eta2H`（2026-07-30 由 `epsilon2` 改名） |
| ★ `kruskal_dunn` | 6 | 同一組資料的三對比較：`p_AB`／`p_AC`／`p_BC`（未校正）＋ `pAdj_AB`／`pAdj_AC`／`pAdj_BC`（Bonferroni） |

**tier / status**：tier **A** / **verified**（兩組皆是）

| 道 | 內容 |
|---|---|
| 1 | **scipy `kruskal` 逐值**：`H`／`df` **逐位元相同**，`p` 逐位元相同（相對差 0.0） |
| 2 | ★ **Dunn 的第一組基準（R56，2026-07-30）** —— 此前 Dunn 是**零基準**：引擎有實作、UI 有呈現、APA 句會點名哪幾對顯著，而 `compare.test.js` **一欄都沒對**。新增 `kruskal_dunn` 後 6 欄全部進回歸防線。基準組 **84 → 85** |
| 3 | ★ **Dunn 對 scikit-posthocs 的獨立掃描（2026-07-30）**：$k\in\{3,4,5\}$ × 每組 $n\in\{5,10,20\}$ × 三種並列強度 × 3 重複 ＝ **81 個情境 × 每情境 3–10 對**，比對未校正 $p$ 與 Bonferroni $p$：**最大相對差 2.7e−10** |
| 4 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2／§3.4 的公式文字自行以 numpy 重算 $H$、並列校正與 $\eta^2_H$，卡方右尾改走 **mpmath 的高精度正規化不完全 gamma**（完全不呼叫 `scipy.kruskal`）。掃描 **225 個情境**（$k\in2..6$ × 每組 $n\in\{3,5,8,15,30\}$ × 三種並列強度 × 3 重複）：**`H` 最大相對差 0.0（逐位元相同）、`p` 最大相對差 3.7e−13、`eta2H` 逐位元相同、零個 .05 判定翻面** |
| 5 | ★ **參數空間掃描抓到 R54**：對「$H$ 的大小」這個方向掃描時，發現 $\eta^2_H$ 在 225 個情境中 **111 個為負**（49%）、最小 $-0.375$；而該欄在 UI 三處都標成 $\varepsilon^2$——一個依定義非負的量卻印出負數。詳見 §8 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ 效果量的名稱與公式 | **$\eta^2_H=(H-k+1)/(N-k)$，floor 0** | rstatix 預設同；effectsize 的 `rank_epsilon_squared` 為 $H/(N-1)$（略大）；SPSS **不報效果量** | ★ 引用時必須說明是哪一個；兩者最大差在沙盒實測達 0.376 |
| 事後比較的方法 | **Dunn** | SPSS 的 Kruskal-Wallis 事後用 Dunn（含 Bonferroni）；R 需外掛套件 | 方法一致 |
| ★ 多重比較校正 | **只有 Bonferroni** | scikit-posthocs／R `dunnTest` 提供 Holm／Šidák／BH 等 | 本工具最保守，且**不可選** |
| Dunn 的觸發 | 使用者勾選 | SPSS 自動在顯著後提供 | 本工具較不容易誤讀，但也可能被忽略 |
| 精確法 | **無** | R `coin` 套件可做條件精確推論 | 小樣本時本工具只有卡方近似 |
| Friedman（重複測量） | **未實作** | R／SPSS 都有 | — |
| 各組中位數與其 CI | **未實作**（只報平均名次） | SPSS 報各組中位數 | 報表沒有原始尺度的位置摘要 |

### ★ 尚未驗證的部分

1. ★ **三篇方法原文全部未取得**（Kruskal & Wallis 1952、Dunn 1964、Tomczak & Tomczak 2014）。★ 但 §3.4 的公式歸屬**已由 rstatix 與 effectsize 兩套套件的官方文件交叉核實**，不是憑記憶
2. ★ **$\eta^2_H$ 零第三方數值對照**：公式歸屬已核實，但 `reference.json` 的 `eta2H` 仍是由 `generate_reference.py` 依 rstatix 的公式定義計算，**不是由 rstatix 實跑產生** ⇒ 這一欄仍屬「同一個作者同一次理解」的形狀。R `rstatix::kruskal_effsize` 一行即可對照，成本極低，建議 Kevin 本機補（E67）
3. ★ **從未與 SPSS 對照過**（H、Dunn、Bonferroni 皆未對照）
4. ★ **$k=2$ 的路徑無基準**：引擎容許 $k\ge2$（`nonparametric.js:211`），UI 擋在 $k\ge3$（`compute.js:79`）。$k=2$ 時 $H$ 與 Mann-Whitney 應有已知關係，但兩者都無對照 ⇒ 引擎的能力比 UI 寬，而寬出來的那部分零驗證
5. ★ **各組中位數、原始尺度的位置摘要、Friedman、Holm／BH 校正、精確法**皆未實作 ⇒ 無基準
6. **依變項的非數值列被靜默略過**，筆數不回報（E65）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $H$ | §3.2 | `nonparametric.js:225`、`231`；`Result.jsx:174`（表）、`381`（卡片） |
| df | §3.2 | `nonparametric.js:233`、`Result.jsx:175` |
| $p$ ＋顯著標記 | §3.2 | `nonparametric.js:234`、`Result.jsx:176` |
| $N$ | §3.1 | `nonparametric.js:218`、`Result.jsx:177` |
| ★ $\eta^2_H$ | §3.4 | `nonparametric.js:236–237`；`Result.jsx:169`（表頭）、`178`（表格）、`327`（教學模式）、`383`（卡片）；i18n `np.result.cols.eta2H` |
| 各組 $n$、平均名次、名次和 | §3.1 | `nonparametric.js:243–247` |
| 「結果含並列校正」 | §3.2 | `nonparametric.js:249`、`Result.jsx:184–186` |
| Dunn 表：配對、兩組平均名次、$|\Delta\bar R|$ | §3.3 | `nonparametric.js:306–317`、`Result.jsx:196`（`DunnTable`） |
| Dunn 表：$z$ | §3.3 | `nonparametric.js:303` |
| Dunn 表：原始 $p$ | §3.3 | `nonparametric.js:304`、`315` |
| Dunn 表：校正 $p$（Bonferroni） | §3.3 | `nonparametric.js:305`、`316` |
| 比較數 $m$ | §3.3 | `nonparametric.js:293`、`324` |
| 「H 顯著時建議跑 Dunn」提示 | §4 | `Result.jsx:187–189`、i18n `np.result.kwSigPosthoc` |
| APA 句（含 Dunn 點名哪幾對） | §3.2、§3.3、§3.4 | `Narrative.jsx:53–76`（`pAdj < 0.05` 篩選要點名的配對） |
| （不呈現）`eta2HRaw` | §3.4 | ★ `nonparametric.js:237` — 刻意不呈現，除錯與文件用 |

**孤兒欄位檢查**（2026-07-30 實跑）：`kruskalWallis` 的 10 欄與 `dunnPostHoc` 的 13 欄**零孤兒**
（新增的 `eta2HRaw` 為刻意保留的除錯欄，已在上表註明）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | $H$、並列校正、Dunn 的 SE 逐條對得起來；獨立重寫 225 情境 $H$ **逐位元相同**。★ **效果量開出 R54**（名稱錯 ＋ 未 floor），已修 |
| 2 | authority | ★ provenance 原只寫 `scipy`，而效果量欄**不是** scipy 產生的——已更新為「scipy（H、p）＋ rstatix eta2[H] 定義（效果量）」並記入 note |
| 3 | 文獻真實性 | Kruskal & Wallis (1952) *JASA* 47(260)、Dunn (1964) *Technometrics* 6(3) 卷期頁碼可查；原文皆未取得並據實標註。★ §3.4 的歸屬改以 rstatix／effectsize 官方文件為依據，不以記憶充當引用 |
| 4 | 報表可追溯 | 23 欄零孤兒（本批唯一零孤兒的一支） |
| 5 | 假設前提 | 結構性守衛完整；★ 「各組分布形狀類似」只在 Notes 文字裡；Dunn 需勾選而不看 H 的 $p$ |
| 6 | 慣例分歧 | 七項書面化。★ 核心是效果量的兩種定義（差距可達 0.376）與「只有 Bonferroni 可選」 |
| 7 | 邊界條件 | ★ 對「$H$ 的大小」方向掃描時抓到 R54 的負值問題；$k$、每組 $n$、並列強度三個方向共 225 情境。★ 另發現**引擎容許 $k=2$ 而 UI 擋在 $k\ge3$**，寬出來的路徑零驗證 |
| 8 | APA 敘述句 | 報 $H$、df、$N$、$p$、效果量，並以 `pAdj < 0.05` 點名 Dunn 的顯著配對（用校正後 $p$，正確）；★ 但 **R54 修復前，句中的「$\varepsilon^2$」是一個錯的名稱，且可能是負數** |

### R54（L3）Kruskal-Wallis 的效果量名稱錯誤且未 floor

**發現**　本工具在**三處**把效果量標成 $\varepsilon^2$：UI 欄位（i18n `np.result.cols.eps2`）、
公式說明（`formulaEffKW`）、APA 句（`np.apa.kw` 與 `np.interp.kw`）。而其公式 $(H-k+1)/(N-k)$
經 rstatix 官方文件核實是 `eta2[H]`（$\eta^2_H$，偏誤校正）；真正的 rank $\varepsilon^2$ 是 $H/(N-1)$
（effectsize 官方文件），兩者最大差在沙盒實測達 **0.376**（$k=6$、$N=18$：$-0.278$ vs $0.098$）。

★ **後果有兩層**：
1. **名稱錯**：使用者把 $\eta^2_H$ 的值當 $\varepsilon^2$ 貼進論文，審稿人用 effectsize 複算會對不上
2. ★ **值域錯**：$\varepsilon^2$ 依定義非負，而本工具會印出負數——**225 個沙盒情境中 111 個（49%）為負，最小 $-0.375$**。
   rstatix 明文 floor 到 0，本工具沒有 ⇒ 報表與 APA 句會出現「$\varepsilon^2=-0.278$」這種不可能的值

**處置（Kevin 2026-07-30 核定：改標籤 ＋ floor 0）**

1. ✅ **引擎**：`epsilon2` → `eta2H`，並 `Math.max(0, ·)`（`nonparametric.js:236–237`）；
   另保留未 floor 的 `eta2HRaw` 供除錯，UI 不呈現
2. ✅ **UI 與 i18n 三處全改**（zh-TW 與 en 同步）：欄位標籤 → `η²_H`；
   `formulaEffKW` 補上完整說明（含「這不是 rank ε²，後者為 H/(N−1)」與 floor 的理由）；
   APA 句 → `η²_H = {eta2H}`
3. ✅ **基準與溯源**：`generate_reference.py` 的欄名改為 `eta2H` 並 floor；
   `reference.json` 全量重生後**其餘 84 組數值逐位元不變**；
   provenance 的 `authority` 由 `scipy` 改為「scipy（H、p）＋ rstatix eta2[H] 定義（效果量）」並記入 note
4. ✅ `tests/adapters.mjs` 的 `kruskal_wallis` adapter 同步改欄名

### R56（L3）Dunn 事後比較補上第一組基準

**發現**　Dunn 有引擎實作（`nonparametric.js:272–327`）、有 UI 表格、APA 句還會**點名哪幾對顯著**，
而 `reference.json` 沒有任何一欄對應 ⇒ 一個會直接進論文結論的數字，零回歸防線。

**處置（Kevin 2026-07-30 核定）**

1. ✅ 新增基準組 **`kruskal_dunn`**（6 欄：三對的未校正 $p$ ＋ Bonferroni $p$），
   權威為 **scikit-posthocs `posthoc_dunn`**。基準組 **84 → 85**
2. ✅ `generate_reference.py` 與 `tests/adapters.mjs` 同步；`compare.test.js` 自動納入 6 欄
3. ✅ provenance 登記 tier **A** / verified，`verification` 欄記入 81 個沙盒情境的掃描結果
4. ✅ `generate_reference.py` 檔頭與 `handoff-roadmap-v1.md §3` 的沙盒套件清單補上 `scikit-posthocs`

### 本批本組的處置（承上）

| # | 級 | 內容 | 處置 |
|---|---|---|---|
| R55 | L3 | Dunn 的 $p$ 尾端抵消 | ✅ `nonparametric.js:302` 改走 `normalSf`。見 `z-prop.md` §8 |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E65 | **依變項的非數值列被靜默略過**（`compute.js:72–73`），略過筆數不回報（同型：`mann-whitney.md` E54） |
| E66 | ★ **引擎容許 $k=2$ 而 UI 擋在 $k\ge3$**（`nonparametric.js:211` vs `compute.js:79`）：引擎的能力比 UI 寬，寬出來的路徑零基準零測試。要嘛擋齊、要嘛補驗 |
| E67 | ★ **$\eta^2_H$ 仍是本專案依定義自算，非 rstatix 實跑**：公式歸屬已由官方文件核實，但數值本身沒有第三方產生方 ⇒ 仍是 §0 所指的形狀。`rstatix::kruskal_effsize` 一行可對照，建議 Kevin 本機補 |
| E68 | **多重比較校正只有 Bonferroni 且不可選**：Bonferroni 在 $k$ 大時過度保守（$k=5$ 時 $m=10$），scikit-posthocs 的 Holm／BH 只是換一個字串參數 |
| E69 | **各組中位數與原始尺度的位置摘要未實作**：報表只有平均名次，使用者要在論文裡描述「哪一組比較高」時沒有原始尺度的數字可用 |
| E70 | **Friedman（重複測量的無母數 ANOVA）未實作** ⇒ 配對三次以上的設計無路徑（同 `wilcoxon-signed-rank.md` 的缺口） |
