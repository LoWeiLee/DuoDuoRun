# 資料視覺化（Data Visualization：散布圖／直方圖／盒鬚圖／熱圖）

> 方法代號 `visualization`｜基準組 **★ 無**（`reference.json` 沒有任何一組對應本模組）｜溯源 **未登記**
> 最後更新：2026-07-30（階段 A / A6a）｜相關文件：`descriptive.md`（四分位數）、`correlation.md`（熱圖用的相關矩陣）

---

## ★ 這一份文件與其他 50 份不同：它描述的是一個零基準模組

本模組**沒有任何 `reference.json` 基準組、沒有 adapter、沒有逐值比對**。
它之所以要有一份文件，是因為 §6.7 判準 2 要求 28 個側欄模組都能對應到方法——
而它畫出來的數字（四分位數、鬚位、離群值、分箱寬度）**會被使用者讀進論文**。

★ **本文件的第 6 節不是「驗證狀態」而是「缺什麼」的清單。**

---

## 1. 這個方法在回答什麼問題

視覺化不做推論，它回答：**「這批資料長什麼樣子，是統計量摘要不出來的？」**

| 圖 | 回答的問題 |
|---|---|
| **散布圖** | 兩個變項的關係是直線嗎？有離群值嗎？ |
| **直方圖** | 單一變項的分布形狀是什麼？單峰還雙峰？ |
| **盒鬚圖** | 中位數與四分位距在哪？離群值有幾個？分組後差多少？ |
| **熱圖** | 一整組變項的相關結構長什麼樣？ |

★ **散布圖是 Pearson 相關與迴歸最重要的前提檢查工具**——線性假設無法用數字檢核，只能看。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 跑 Pearson 或迴歸**之前**（看線性、看離群值）
- 常態性檢定之外的形狀判讀（見 `normality.md` §2：$n>300$ 時檢定過於敏感，應以圖為主）
- 論文的資料描述

**不該用**

- ★ **拿圖代替統計檢定下結論。** 圖給的是形狀，不是 $p$ 值
- ★ **拿本工具的箱型圖離群值定義去「刪離群值」。** 1.5 × IQR 是**繪圖慣例**，不是離群值的統計定義

**常見誤用**

1. ★ **直方圖換一次分箱就換一個故事。** 本工具用 Freedman-Diaconis 自動決定分箱，
   ★ **但這個選擇沒有在 UI 上告訴使用者**（E93）
2. **熱圖只看顏色不看 $p$ 與 $n$。** 熱圖用的是相關矩陣，慣例與限制全部沿用 `correlation.md`
3. **箱型圖的鬚位當成最大最小值。** 鬚位是「1.5 × IQR 之內的最極端觀察值」，不是全距

## 3. 公式與定義

### 3.1 散布圖（`visualization/compute.js:34–48`）

無統計量，只做 pairwise 剔除：兩欄都有值且都是有限數才畫。
★ **不畫迴歸線、不畫信賴帶、不報 $r$**——純散點。

### 3.2 直方圖與分箱（`viz/binning.js:24–65`）

$$\text{binWidth}=2\cdot IQR\cdot n^{-1/3}\quad\text{(Freedman-Diaconis)}$$

$IQR=0$ 時（離散少值資料）**fallback 到 Sturges**：$k=\lceil\log_2 n+1\rceil$。
邊界以 `niceDomain` 擴展到整齊數值（`viz/scale.js`）。
$n<5$ 時回 `need-n>=5`（`compute.js:53`）。

### 3.3 ★ 盒鬚圖與四分位數（`viz/boxStats.js:12–60`）

$$Q_p:\quad h=(n-1)p,\qquad Q_p=x_{(\lfloor h\rfloor)}+(h-\lfloor h\rfloor)\bigl(x_{(\lceil h\rceil)}-x_{(\lfloor h\rfloor)}\bigr)$$

★ **這是 R 的 `quantile(type = 7)`**（亦為 numpy 的預設）。R 的九種 type 是教科書級的慣例分歧點，
本工具選的是最常見的一種——**但這件事此前沒有寫在任何地方**。

$$IQR=Q_3-Q_1,\qquad
\text{下鬚}=\min\{x_i: x_i\ge Q_1-1.5\,IQR\},\qquad
\text{上鬚}=\max\{x_i: x_i\le Q_3+1.5\,IQR\}$$

離群值 ＝ 落在 $[Q_1-1.5IQR,\;Q_3+1.5IQR]$ 之外者。$n<4$ 時全部回 `NaN`（`boxStats.js:28–33`）。

### 3.4 熱圖（`visualization/compute.js:91–95`）

直接呼叫 `correlationMatrix`（Pearson，pairwise）。
★ **公式、慣例、限制與尚未驗證的部分全部沿用 `correlation.md`**——包括「沒有 CI」「不做多重比較校正」。

## 4. 假設前提與本工具的檢核方式

視覺化沒有統計假設。資料前提：

| 前提 | 本工具怎麼處理 |
|---|---|
| 數值可解析 | `pickNumeric`（`compute.js:23–32`）剔除遺漏與非有限值 |
| 散布圖：兩欄都有值 | pairwise（`compute.js:38–46`） |
| 直方圖 $n\ge5$ | 硬擋 `need-n>=5` |
| 盒鬚圖 $n\ge4$ | 硬擋 `need-n>=4`；分組時**逐組**套用（`boxStats.js:28`） |
| 熱圖至少 2 欄 | 硬擋 `needAtLeastTwo` |
| ★ 剔除筆數 | **不回報**（E94，與 `descriptive`／`normality` 同型） |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Freedman, D., & Diaconis, P. (1981). On the histogram as a density estimator: $L_2$ theory. *Zeitschrift für Wahrscheinlichkeitstheorie und verwandte Gebiete*, 57(4), 453-476. | §3.2 的分箱寬度 | 【原文未取得】 |
| Tukey, J. W. (1977). *Exploratory Data Analysis*. Addison-Wesley. | §3.3 的盒鬚圖與 1.5 × IQR 慣例 | 【原文未取得】 |
| Hyndman, R. J., & Fan, Y. (1996). Sample quantiles in statistical packages. *The American Statistician*, 50(4), 361-365. | ★ 九種分位數定義的分類（type 7 的命名出自此文，並為 R 所採用） | 【原文未取得】 |

**程序指引**

- R `quantile(type = )` 官方文件——★ **本工具的 type 7 已於 2026-07-30 對照確認**（見 §6）

## 6. 對照與驗證狀態

**基準組**：★ **無。** `reference.json` 沒有任何一組對應本模組，`provenance.json` 亦未登記。

**tier / status**：★ **未登記**（不是 tier A、B 或 I——它根本不在登記表裡）

| 道 | 內容 |
|---|---|
| 1 | ★ **唯一的一道**：2026-07-30 把 `boxStats` 的四分位數與 07 號抽驗的 R 值對照——本工具 $Q_1=35.799825000000006$、$Q_3=44.65025$ vs R `quantile(type=7)` 的 $35.799825$／$44.65025$，**$Q_1$ 絕對差 7.1e−15、$Q_3$ 逐位元相同** ⇒ **慣例確認為 type 7** |
| 2 | ❌ **分箱（Freedman-Diaconis）零對照**：`computeBins` 的 bin 寬與 fallback 條件從未與任何第三方比對 |
| 3 | ❌ **鬚位與離群值判定零對照**：1.5 × IQR 的實作細節（本工具取「1.5 IQR 之內的最極端觀察值」而非直接用邊界值）未與 R `boxplot.stats` 對照 |
| 4 | ❌ **熱圖沿用 `correlationMatrix`**，該函式本身有基準（見 `correlation.md`），但**熱圖這條路徑沒有獨立測試** |
| 5 | ❌ **完全沒有回歸測試**：`tests/` 底下沒有任何一支測 `viz/` 或 `visualization/` |

**已知與 R／SPSS 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ 四分位數 | **type 7**（線性內插） | R 預設同為 type 7；**SPSS 用另一套**（近似 type 6） | 小樣本時 Q1／Q3 會與 SPSS 對不上 |
| 鬚位定義 | 1.5 × IQR 內的最極端**觀察值** | R `boxplot.stats` 同 | 一致 |
| 分箱 | Freedman-Diaconis，$IQR=0$ 時 fallback Sturges | R `hist` 預設 **Sturges**；`nclass.FD` 才是 FD | ★ **預設不同 ⇒ 同一批資料在 R 與本工具會畫出不同的直方圖** |
| 散布圖 | 純散點 | R／SPSS 常附迴歸線 | 本工具**不畫趨勢線** |
| 熱圖 | Pearson、pairwise | — | 沿用 `correlation.md` 的全部限制 |

### ★ 尚未驗證的部分

★ **這一節在本文件特別長，因為本模組的驗證覆蓋率接近零。**

1. ★★ **整個模組沒有任何 `reference.json` 基準、沒有 adapter、沒有測試。**
   `provenance.test.js` 的棘輪管不到它（它只掃 `reference.json` 的鍵），
   `docs.coverage.test.js` 也管不到（它只檢查基準組有沒有被文件提到）
   ⇒ **兩道棘輪都對「一個完全沒有基準的模組」無效**（E95）
2. ★ **分箱寬度零對照**：Freedman-Diaconis 的實作、`niceDomain` 的邊界擴展、
   fallback 到 Sturges 的觸發條件，三者都沒有第三方核實
3. ★ **鬚位與離群值零對照**：`boxplot.stats` 是現成的證人，尚未跑
4. **三篇原文皆未取得**；type 7 的歸屬來自 R 文件與實跑比對，非 Hyndman & Fan 原文
5. **從未與 SPSS 對照**——「SPSS 用另一套四分位數」這句話來自二手說法
6. ★ **$n$ 小時的行為未掃描**：$n=4$（盒鬚圖的下限）與 $n=5$（直方圖的下限）附近沒有測試

## 7. 報表欄位對照

| UI 呈現 | 對應公式 | 程式碼 |
|---|---|---|
| 散點座標 | §3.1 | `visualization/compute.js:34–48` |
| 直方圖的 bin 邊界與計數 | §3.2 | `viz/binning.js:24–65`、`compute.js:50–56` |
| 盒身（Q1／中位數／Q3） | §3.3 | `viz/boxStats.js:33–36` |
| 鬚位 | §3.3 | `viz/boxStats.js:39–48` |
| 離群點 | §3.3 | `viz/boxStats.js:49–53` |
| 分組盒鬚圖 | §3.3 | `compute.js:58–87` |
| 熱圖格值 | §3.4 | `compute.js:91–95` → `correlation.js:125–153` |

**孤兒欄位檢查**（2026-07-30 實跑）：`boxStats` 回傳 9 欄。
★ **`min` 與 `max` 兩欄在盒鬚圖上不呈現**（圖只畫鬚位與離群點）——
它們不是孤兒（有回傳給呼叫端）但目前無視覺對應，屬刻意保留。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 三個公式逐條對得起來；四分位數確認為 type 7 並對 R 驗到 7.1e−15 |
| 2 | authority | ★ **本模組未登記於 `provenance.json`** ⇒ 沒有 authority 可查（E95） |
| 3 | 文獻真實性 | 三篇卷期頁碼可查、皆標【原文未取得】 |
| 4 | 報表可追溯 | 9 欄可追溯；`min`／`max` 不呈現（刻意） |
| 5 | 假設前提 | 四個硬擋都正確；★ 剔除筆數不回報（E94） |
| 6 | 慣例分歧 | 五項書面化。★ **最重要的一項是分箱預設與 R 不同**（FD vs Sturges）⇒ 同一批資料兩邊畫出來不一樣 |
| 7 | 邊界條件 | 實跑：$n=3$ 的盒鬚圖（全回 NaN，正確）、全常數欄（$Q_1=Q_3=$ 中位數 $=7$、零離群值，正確且不誤導） |
| 8 | APA 敘述句 | 本模組無 APA 句 |
| 9 | 數學小工具的第二套實作 | ★★ **開出 R71**：`quantile` 在專案內有**三份**，其中兩份逐字元相同 |
| 10 | 效果量的名稱與值域 | 本模組無效果量 |
| 11 | 掃描結論的前提 | ★ 本模組**沒有任何掃描可言**——連一個基準點都沒有 |

### R71（L1）`quantile` 在專案內有三份實作

**發現**（2026-07-30 `grep`）：

| 位置 | 內容 |
|---|---|
| `viz/boxStats.js:12–22` | 9 行 |
| `viz/binning.js:13–22` | ★ **與上者逐字元完全相同** |
| `stats/pls.js:140–148` | 寫法不同（含 `clamp`），但公式相同（註解明寫「R type 7」） |

★ **三份都是 type 7，所以目前沒有行為分歧**——但這正是 A5b 習慣 9 警告的形狀：
`cfa.js` 當時也「只是」多養了一套常態 CDF，而那一套在 R55 被發現會讓尾機率塌成 0。
**兩份逐字元相同的複製，遲早會有一份被改到**。

★ **更值得注意的是它們同在 `src/lib/viz/` 底下**——不是跨層複製，是**同一個目錄裡的兩個檔案各寫一次**。

**處置（L1，書面記錄）**：本批**不重構**（動 `pls.js` 需要重跑整個 PLS 回歸套件，
成本與收益不成比例，且三份行為一致無立即風險）。
建議階段 B 併入一次性的 `src/lib/stats/quantile.js` 抽取（E96）。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E93 | ★ **分箱方法不告訴使用者**：直方圖用 Freedman-Diaconis 而 R `hist` 預設 Sturges，同一批資料兩邊長得不一樣，而 UI 上沒有任何說明 |
| E94 | **剔除筆數不回報**（同型：`descriptive.md` E82、`normality.md` E78） |
| E95 | ★★ **整個模組不在任何一道棘輪的守備範圍內**：`provenance.test.js` 掃 `reference.json` 的鍵、`docs.coverage.test.js` 檢查基準組有沒有被文件提到——**兩者對「一個完全沒有基準的模組」都無效**。⇒ 這是 A4 的 R41（防線的漏收）在**模組層**的版本：不是防線寫錯，是**防線掃描的母體不含它** |
| E96 | **`quantile` 三份實作應抽取為共用模組**（見 R71） |
| E97 | **散布圖不畫趨勢線、無 $r$ 標註**：相關與迴歸的教學價值因此打折（與 `correlation.md` E90 是同一件事的兩面） |
