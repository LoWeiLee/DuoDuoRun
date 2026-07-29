# Tukey HSD 事後比較與學生化全距分布

> 方法代號 `tukey-hsd`｜基準組 `reference.json → tukey_hsd`（3）＋ ★ `tukey_ptukey_grid`（120，2026-07-29 新增）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）｜前置閱讀：`anova-oneway.md`

---

## 1. 這個方法在回答什麼問題

單因子 ANOVA 顯著只說「至少有兩組不同」，不說是哪兩組。
但如果就這樣兩兩跑 t 檢定，多重比較會把整體誤判率推高（三組 15%、六組 54%）。

Tukey HSD（Honestly Significant Difference）回答的是：
**在控制住「整組比較的族系錯誤率」的前提下，哪幾對真的不同？**

作法是換一個分布。兩兩比較的統計量不再對照 $t$ 分布，而是對照
**學生化全距分布**（studentized range）——它問的是「$k$ 個常態樣本平均數中，
最大與最小相差多少個標準誤」。用最極端那一對的分布去判定每一對，
族系錯誤率就自然被壓在 $\alpha$ 以下。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 單因子 ANOVA 顯著後，要找出是哪幾對不同
- 各組人數相近、變異數大致同質

**不該用**

- ★ **ANOVA 不顯著時**。Tukey 是 ANOVA 的後續，不是替代品。
  ★ **但本工具無條件顯示 Tukey 表**——`oneWayAnova/compute.js:51` 不看 ANOVA 的 $p$，
  `Result.jsx:413` 也不看。使用者可能在 $F$ 不顯著時仍看到某一對「顯著」（見第 6 節）
- **只想比對照組 vs 各處理組**：Dunnett 較有效率（本工具未實作）
- **變異數嚴重不同質**：改用 Games-Howell（未實作）

**常見誤用**

1. ★ **把 Tukey 的 $p$ 當成兩兩 t 檢定的 $p$。** 兩者分布不同，Tukey 的 $p$ **一定**比未校正的大
2. **只看顯著的那幾對，不看平均差的方向與大小**
3. **組人數懸殊時仍照用**：本工具用 Tukey-Kramer 修正處理不等 $n$（§3.1），但變異數不同質時仍不穩

## 3. 公式與定義

### 3.1 統計量（Tukey-Kramer，容許不等 $n$）

$$q_{ij}=\frac{\bigl|M_i-M_j\bigr|}{\sqrt{\dfrac{\mathrm{MS}_w}{2}\left(\dfrac{1}{n_i}+\dfrac{1}{n_j}\right)}},\qquad
p_{ij}=P\bigl(Q_{k,\;\mathrm{df}_w}>q_{ij}\bigr)$$

（`anova.js:109–130`）。$\mathrm{MS}_w$ 與 $\mathrm{df}_w$ 直接沿用 ANOVA 的誤差項——
**這是 Tukey 相對於兩兩 t 檢定的關鍵優勢**：誤差估計用的是全部 $N$ 筆資料，不是那兩組。

★ 分母裡的 $\tfrac12$ 是 Tukey-Kramer 慣例（等 $n$ 時退化為 $\sqrt{\mathrm{MS}_w/n}$）。

### 3.2 學生化全距分布

$$P(Q\le q\mid k,\nu)=\int_0^{\infty} f_\nu(s)\;\underbrace{k\int_{-\infty}^{\infty}\varphi(z)\bigl[\Phi(z+qs)-\Phi(z)\bigr]^{k-1}\mathrm{d}z}_{F_{R_\infty}(qs;\,k)}\;\mathrm{d}s$$

其中 $s=\chi_\nu/\sqrt\nu$，$f_\nu$ 為其密度。實作為**雙層 Simpson 數值積分**（`ptukey.js:78–98`）：
內層 $z\in[-8,8]$、200 節點；外層見 §3.3。

### 3.3 ★ 外層積分區間：R50 修正的核心

$s=\chi_\nu/\sqrt\nu$ 的密度**隨 $\nu$ 變窄**，標準差約 $1/\sqrt{2\nu}$。
修正後的積分區間**跟著峰寬走**（`ptukey.js:100–105`）：

$$s\in\Bigl[\max\bigl(0,\;1-12\sigma\bigr),\;1+12\sigma\Bigr],\qquad \sigma=\frac{1}{\sqrt{2\nu}}$$

節點 400。

★ **修復前是 $s\in[0.001,\ \max(5,\sqrt{\mathrm{df}}\cdot1.5)]$、節點固定 200**——
上限隨 $\sqrt{\mathrm{df}}$ **外擴**而峰**內縮**，Simpson 步長與峰寬的比值在 **$\mathrm{df}\approx100$ 越過 1**，
之後積分完全抓不到密度的峰。詳見第 8 節的 R50。

## 4. 假設前提與本工具的檢核方式

Tukey 繼承 ANOVA 的全部前提（見 `anova-oneway.md` §4），另加一項本方法特有的：

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 常態、變異數同質、獨立 | 沿用 ANOVA 的前提檢核區（Levene ＋ Shapiro-Wilk） | 紅燈，不擋 |
| ★ **ANOVA 已達顯著** | ★ **完全不檢核**——Tukey 表無條件顯示 | 無提示（見 §6） |
| 各組 $n\ge1$、$\mathrm{MS}_w>0$ | 沿用 ANOVA 的守衛 | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Tukey, J. W. (1953). *The Problem of Multiple Comparisons*. 未出版手稿，Princeton University. | §3.1 HSD 的原始構想 | ★ **【原文未取得】**（該手稿長期未正式出版，後收於 Tukey 文集） |
| Kramer, C. Y. (1956). Extension of multiple range tests to group means with unequal numbers of replications. *Biometrics*, 12(3), 307–310. | §3.1 不等 $n$ 的 Tukey-Kramer 修正 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **scipy** 的 `tukey_hsd` | ★ `tukey_hsd` 基準的產生方 |
| **scipy** 的 `stats.studentized_range.sf` | ★ `tukey_ptukey_grid` 基準的產生方（2026-07-29 新增） |
| R `ptukey()` | 程式碼註解宣稱對標的對象——★ **實際上從未對照過 R**（見第 6 節） |

## 6. 對照與驗證狀態

**基準組（兩組）**

| 組 | 欄位 | 內容 |
|---|---|---|
| `tukey_hsd` | 3 | `datasets.json:main` 的 `y ~ group3` 三對比較的 $p$（$N=60$、$k=3$ ⇒ **$\mathrm{df}=57$**） |
| ★ `tukey_ptukey_grid` | 120 | **分布本身**的格點：$k\in\{2,3,4,6,10\}\times \mathrm{df}\in\{5,20,57,100,120,200,500,999\}\times q\in\{1.7,3.5,4.5\}$ |

**tier / status**：tier **A** / **verified**（兩組皆是）

| 道 | 內容 |
|---|---|
| 1 | **scipy `tukey_hsd` 逐值**：3 欄。★ 修正後的相對差 **2.8e−11 / 3.6e−9 / 1.6e−10**（修正前為 1.3e−6 / 1.3e−4 / 8.2e−6） |
| 2 | ★ **scipy `studentized_range.sf` 逐值**：新增的 120 欄，最大絕對差 **1.68e−10** |
| 3 | ★ **本文件的獨立重寫（2026-07-29）**：對學生化全距分布**直接做雙層 Gauss-Legendre 數值積分**（完全不碰 scipy 的任何 Tukey 入口），在 **896 個格點**（$k$ 7 值 × $\mathrm{df}$ 1–2000 共 16 值 × $q$ 8 值）比對修正後的 `ptukeyUpper`：**最大絕對差 5.561e−7、零個格點超過 1e−6、零個 .05 判定翻面** |
| 4 | ★ **第三方之間也有分歧**：`statsmodels.libqsturng.psturng`（查表插值）與 scipy 在 $p\approx.46$ 差 **1.9e−3**。⇒ 「第三方實作 ≠ 可照抄的數字」——本組的權威只能是 scipy 與直接積分，不是 `psturng` |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 不等 $n$ | Tukey-Kramer | SPSS／R 同 | 無 |
| 信賴區間 | ★ **不報**（`anova.js:31` 註解說「UI 端要時可從 q_critical 反推」，但 `q_critical` 也沒實作） | SPSS／R 都報 | APA 7 建議報 CI，本工具給不出 |
| 顯示條件 | ★ **無條件顯示** | SPSS 亦無條件；R 需手動呼叫 | 見 §2 |
| 不同質時的替代 | **無** | SPSS 有 Games-Howell | — |

### ★ 尚未驗證的部分

1. ★ ★ **兩篇方法原文未取得**。Tukey (1953) 是未正式出版的手稿，Kramer (1956) 未取得 ⇒ §3.1 的分母慣例只對到 scipy 的行為
2. ★ **從未與 R `ptukey()` 對照過**，儘管 `ptukey.js:18` 的註解寫「對標 R::ptukey()」。
   ⇒ 這句話目前**沒有證據支持**；成本極低（Kevin 本機一行 R），建議補
3. ★ **信賴區間與 $q_{\text{critical}}$ 未實作**：`anova.js:31` 的註解承諾「可從 q_critical 反推」，但該值不存在——**註解描述了一個不存在的能力**
4. ★ **Tukey 表無條件顯示**：$F$ 不顯著時仍列出，且不提示「事後比較應在整體檢定顯著後才解讀」
5. **Games-Howell、Dunnett、Scheffé 未實作** ⇒ 無基準
6. **$k>10$ 與 $\mathrm{df}<5$ 的極端情形**：`tukey_ptukey_grid` 未涵蓋（獨立重寫的 896 格點有涵蓋 $\mathrm{df}=1,2,3$，但那不是入庫的基準）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| Tukey 表：兩組名稱 | — | `anova.js:111–130`、`oneWayAnova/Result.jsx:242` |
| Tukey 表：平均差 | §3.1 | `anova.js:113–118` |
| Tukey 表：$q$ | §3.1 | `anova.js:117` |
| Tukey 表：$p$＋顯著標記 | §3.1、§3.2 | `anova.js:119`、`Result.jsx:347` |
| 教學模式的逐對解讀 | §3.1 | `Result.jsx:344–350` |
| APA 句中「哪幾對達顯著」 | §3.1 | `oneWayAnova/Narrative.jsx:33`（`tukey.filter(p => p.p < 0.05)`） |

**孤兒欄位檢查**（2026-07-29 實跑）：`tukeyHSD` 回傳的 7 個欄位**零孤兒**。
★ 但 `bonferroni`（`anova.js:152–177`）整支函式在 `src/` 內**零呼叫者**——
它算了兩兩比較的 Bonferroni 校正 $p$，沒有任何 UI 讀它，也沒有基準。書面記錄。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | ★ **開出 R50（L4 真 bug）**，已修；修後 896 格點最大差 5.6e−7 |
| 2 | authority | ★ **不足**：原文未取得；且註解宣稱「對標 R::ptukey()」而**從未對照過 R** |
| 3 | 文獻真實性 | Kramer (1956) *Biometrics* 12(3) 卷期頁碼可查；Tukey (1953) 為未出版手稿，已據實標註 |
| 4 | 報表可追溯 | 7 欄零孤兒；★ `bonferroni` 整支零呼叫者，書面記錄 |
| 5 | 假設前提 | ★ **不檢核 ANOVA 是否顯著**，Tukey 表無條件顯示 |
| 6 | 慣例分歧 | 四項書面化；★ **不報 CI** 且註解承諾了不存在的 `q_critical` |
| 7 | 邊界條件 | ★ **這裡就是 R50 的所在**：高 df 完全未被覆蓋，而唯一的基準恰在安全區邊緣 |
| 8 | APA 敘述句 | 用 $p<.05$ 篩選要點名哪幾對——★ **R50 修復前這個篩選會選錯**（見下） |

### R50（**L4 真 bug**）Tukey HSD 的 $p$ 值在 df ≥ 100 系統性錯誤

**發現**　`ptukey.js` 舊版外層積分：上限 `max(5, √df · 1.5)`（隨 df 外擴）、節點**固定 200**，
而被積函數的峰寬約 $1/\sqrt{2\nu}$（隨 df 內縮）。步長與峰寬的比值：

| df | 步長/峰寬 | 誤差 |
|---|---|---|
| 57 | 0.60 | 1.0e−6 |
| **100** | **1.06** | 6.6e−3 |
| 120 | 1.27 | 3.0e−2 |
| 999 | 10.6 | **7.6e−1** |

★ **後果是判讀翻面**：$k=3,q=3.5,\mathrm{df}=120$ 工具印 $p=.0686$（不顯著），正確 $p=.0388$（**顯著**）；
$\mathrm{df}=999,q=4.5$ 工具印 $p=.786$，正確 $.0043$。$\mathrm{df}=150$–$500$ 的大 $q$ 直接回 **0**，報表印 `p = .000`。

★ **可達性極高**：`oneWayAnova/compute.js:51` 每次單因子 ANOVA 無條件跑 Tukey；
$\mathrm{df}=N-k$，三組時 **$N\ge103$ 即進入失準區**。而 `Narrative.jsx:33` 用 $p<.05$ 決定
**APA 句要點名哪幾對** ⇒ 錯的 $p$ 直接改變使用者貼進論文的結論。

★ **為什麼三道防線都沒抓到**：唯一的基準 `tukey_hsd` 是 $\mathrm{df}=57$——**失準區前的最後一個安全點**；
而 `compare.test.js` 早已把這三欄放寬到 **5e-4**，註解寫「絕對差 <1e-6」（那句話只在 $\mathrm{df}=57$ 成立）。
**防線正好蓋在唯一安全的那一點上。**

**處置（Kevin 2026-07-29 核定，三件）**

1. ✅ **修積分**：區間改為跟隨密度峰寬（§3.3）、節點 200 → 400，並移除 `df ≥ 1000 走漸近形式`的捷徑
   （修後不需要，且它本身在 df=999/1000 造成跳斷）
2. ✅ **新增基準組 `tukey_ptukey_grid`**（120 欄，含 df = 100/120/200/500/999 的失準區），
   直接打 `ptukeyUpper`、不經過任何資料集。基準組 **83 → 84**，`MAX_PENDING` 不變
3. ✅ **收緊容差**：`compare.test.js` 的 tukey 三行放寬（5e-4）刪除，改回 `DEFAULT_TOL`（1e-6）

＋7 條行為測試，含**單調性**（$p$ 隨 $q$ 遞減）與 **df 方向的連續性**（df 95→1005 不得跳斷）——
這兩條鎖的是「積分有沒有崩掉」的結構性質，比逐點比對更難繞過。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E25 | ★ **Tukey 表無條件顯示**：$F$ 不顯著時仍列出且無提示。硬擋不恰當（有文獻主張可直接做事後比較），但應加註記 |
| E26 | ★ **不報信賴區間，且 `anova.js:31` 的註解承諾了不存在的 `q_critical`**。APA 7 建議報 CI |
| E27 | `bonferroni()` 整支零呼叫者、零基準——是死碼或未接上的功能，需裁決去留 |
