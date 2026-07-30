# 變異數同質性檢定（Levene's Test / Brown-Forsythe）

> 方法代號 `levene`｜基準組 `reference.json → levene_median`（4）＋`levene_mean_spss_default`（2，★ 僅供人工對照）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6a）｜相關文件：`anova-oneway.md`、`t-test.md`、`anova-twoway.md`（三者都呼叫本檢定）

---

## 1. 這個方法在回答什麼問題

**「這幾組資料的『散開程度』，差得比巧合該有的程度更多嗎？」**

t 檢定與 ANOVA 的傳統版本假設各組變異數相等（homogeneity of variance）。
Levene 的做法很直觀：**把每個值換成「它離自己組中心有多遠」，再對這些距離跑一次單因子 ANOVA**。
如果各組的「平均距離」差很多，就代表散開程度不同。

★ **它是前提檢核工具，不是主分析**——本工具沒有獨立的側欄模組，它出現在
t 檢定、單因子 ANOVA、雙因子 ANOVA 的前提檢核區。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 跑 ANOVA 前，判斷要不要改用 Welch 校正
- 報告變異數同質性假設的檢核結果（APA 的常見要求）

**不該用**

- ★ **拿它當「該不該用母數方法」的唯一依據。** 違反同質性的標準做法是改用 Welch，不是改用無母數
- **大樣本時把顯著當嚴重。** 與常態性檢定同理，$n$ 大時微小差異也會顯著

**常見誤用**

1. ★ **拿本工具的結果去對 SPSS 的報表，發現對不上就以為有錯。**
   本工具用 **median 版（Brown-Forsythe）**，SPSS 預設是 **mean 版**——這是慣例差異，兩邊都對（見 §3.3）
2. ★ **獨立樣本 t 檢定看到 Levene 顯著就改跑「不等變異數」那一列。**
   本工具的獨立樣本 t **預設就是 Welch**，不需要依 Levene 切換（見 `t-test.md`）
3. **把不顯著讀成「變異數相等」。**

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $k$ | 組數（$\ge2$） |
| $n_i$、$N=\sum n_i$ | 第 $i$ 組樣本數、總樣本數 |
| $c_i$ | 第 $i$ 組的中心（本工具＝中位數） |
| $Z_{ij}=\lvert X_{ij}-c_i\rvert$ | 離中心的絕對距離 |

### 3.2 統計量（`levene.js:28–78`）

$$Z_{ij}=\lvert X_{ij}-c_i\rvert,\qquad
W=\frac{(N-k)\sum_i n_i(\bar Z_i-\bar Z)^2}{(k-1)\sum_i\sum_j(Z_{ij}-\bar Z_i)^2}$$

即「對 $Z$ 跑單因子 ANOVA 的 $F$」，$\mathrm{df}_1=k-1$、$\mathrm{df}_2=N-k$，右尾 $F$ 分布。
實作對應：$Z$ 於 `levene.js:39–42`、$SS_{\text{between}}$ 於 `49–52`、
$SS_{\text{within}}$ 於 `54–59`、$F$ 與 $p$ 於 `76–77`。

### 3.3 ★ center 的慣例分歧：本工具採 median

| center | 名稱 | 誰用 | 本資料集實測 |
|---|---|---|---|
| ★ **中位數** | **Brown-Forsythe (1974)** | **本工具**、R `car::leveneTest` 預設、JASP 預設 | $F=0.38762994$、$p=0.68043872$ |
| 平均 | 原始 Levene (1960) | **SPSS 預設**、部分教科書 | $F=0.39725811$、$p=0.67400692$ |

★ **本工具只實作 median 版**（`levene.js` 檔頭已明說）。
`reference.json` 保留 `levene_mean_spss_default` 一組，**但它沒有 adapter**——
從未被 `compare.test.js` 比對過，純粹是 SPSS 慣例的人工對照值（見 §6 的 R62）。

**為什麼 median 版是預設**：偏態分布下 mean 版的第一型錯誤率會膨脹，
median 版對非常態更穩健（Brown & Forsythe 1974 的主要結論）。

### 3.4 ★ 退化情形：各組皆為常數

$SS_{\text{within}}=0 \iff$ 每一組的 $Z$ 全為 0 $\iff$ **每一組都零變異**
$\implies \bar Z_i$ 亦全為 0 $\implies SS_{\text{between}}$ 必然同時為 0
$\implies F$ 是 $0/0$，**不是 $\infty$**。

★ 舊版在此回 `{ F: Infinity, p: 0 }`，會讓前提檢核面板印**紅燈「違反變異數同質」**——
而真相是各組變異數**完全相等**。2026-07-30 起改回錯誤碼 `levene-all-constant`（`levene.js:72–74`），
UI 顯示「無法檢定」的中性狀態。見 §8 的 R66。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| $k\ge2$ | 硬擋，回 `need->=2-groups`（`levene.js:31`） |
| $N>k$（要有誤差自由度） | 硬擋，回 `need-N>k`（`levene.js:35`） |
| ★ 各組非全為常數 | ★ **2026-07-30 起回 `levene-all-constant`**（`levene.js:72–74`），前提面板顯示「無法檢定」而非紅燈 |
| 觀察值獨立 | 不檢核 |
| 遺漏值 | 由呼叫端處理（`assumptionChecker.js` 的 `extractGrouped` 已剔除非數值與遺漏） |

★ **本檢定本身就是別人的前提檢核**：`assumptionChecker.js:113`、`196`、
`ttest/compute.js:63`、`oneWayAnova/compute.js:48`、`twoWayAnova/compute.js:41` 五處呼叫。
⇒ **它的退化行為會擴散到三個主要模組的前提面板**，這是 R66 的血徑。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Levene, H. (1960). Robust tests for equality of variances. In *Contributions to Probability and Statistics* (pp. 278-292). Stanford University Press. | 原始 mean 版 | 【原文未取得】 |
| Brown, M. B., & Forsythe, A. B. (1974). Robust tests for the equality of variances. *JASA*, 69(346), 364-367. | ★ **本工具採用的 median 版** | 【原文未取得】 |

**程序指引**

- R `car::leveneTest(center = )` 官方文件——★ **兩個 center 慣例已於 2026-07-30 實跑對照**（見 §6）

## 6. 對照與驗證狀態

**基準組**：`levene_median`（`F`／`p`／`df1`／`df2`）、★ `levene_mean_spss_default`（`F`／`p`，**無 adapter**）

**tier / status**：兩組皆 tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **scipy `levene(center='median')` 逐值**：4 欄全部在 `DEFAULT_TOL`（1e-6）內 |
| 2 | ★ **`levene_mean_spss_default` 從未被比對過**：`tests/adapters.mjs` 沒有它的 adapter，`compare.test.js` 自然跳過。它是**參考值而非回歸防線**——2026-07-30 已更正 `provenance.json` 中「JS 與其逐值比對」的不實敘述（R62） |
| 3 | ✅ **R 側交叉驗證（2026-07-30，R 4.6.0，`07_a6_r_audit.R` §3）**：`car::leveneTest(center = median)` 給 $F=0.3876$、$p=0.6804$；`center = mean` 給 $F=0.3973$、$p=0.674$ ⇒ **兩個慣例都對上**，確認本工具選的是 Brown-Forsythe |
| 4 | ★ **但這一道的驗證強度有限**：`leveneTest` 的 print 方法只印到 **4 位小數**，足以確認「是哪一個慣例」，**不足以逐值驗證**（同型：A5b 的 E67，`effectsize` 只印 2 位小數）⇒ 若要把 mean 版升為逐值 verified，需請 R 端印完整位數 |
| 5 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2 的文字規格以 mpmath（dps = 40）重算，**`scipy.levene` 一次都沒呼叫**；右尾 $F$ 改走正規化不完全 beta。實測 `F` 相對差 **1.257e−15**、`p` **3.263e−16**、`df1`／`df2` 相符 |

**已知與 SPSS／JASP／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ center | **median（Brown-Forsythe）** | SPSS 預設 **mean**；R `car` 與 JASP 預設 median | ★ 拿 SPSS 報表對照會對不上（本資料集 $F$ 差 0.0096、$p$ 差 0.0064，判讀不變，但數字不同） |
| center 可選 | **不可選** | SPSS 與 R 都可切換 | 使用者無法產生 SPSS 相容的輸出 |
| 修剪平均（10% trimmed） | **未實作** | R `car` 提供 | 第三種慣例缺席 |
| 退化情形 | ★ 回 `levene-all-constant`、UI 中性 | SPSS 略過該檢定 | 2026-07-30 起方向一致 |
| 獨立樣本 t 的用途 | 本工具 t 預設 Welch，**不依 Levene 切換** | SPSS 報兩列讓使用者選 | 本工具較不易誤用 |

### ★ 尚未驗證的部分

1. ★ **兩篇原文皆未取得。** 特別是 Brown & Forsythe (1974)——「median 版對偏態更穩健」這個
   **採用理由**本身沒有回到原文核對過，是從二手說法轉述的
2. ★ **`levene_mean_spss_default` 不是回歸防線**，只是人工對照值；且 R 端只印 4 位小數 ⇒
   **它的正確性只驗到小數第 4 位**
3. **從未與 SPSS 實跑對照**——「SPSS 預設是 mean 版」這句話來自文件與 R 的說法，非 SPSS 實跑
4. ★ **參數空間未掃描**：本組只有 $k=3$、$n_i=20$ 平衡設計一個點。
   **不平衡設計、$k$ 大、組內樣本極小**這三個方向都沒有基準（E85）
5. **修剪平均版未實作**，第三種慣例無對照

## 7. 報表欄位對照

本方法無獨立側欄模組，輸出出現在三個主分析的前提檢核區：

| UI 位置 | 對應公式 | 程式碼 |
|---|---|---|
| t 檢定的前提檢核列 | §3.2 | `ttest/compute.js:63`、`assumptionChecker.js:113–121` |
| 單因子 ANOVA 的「Levene's」列 | §3.2 | `oneWayAnova/compute.js:48`、`oneWayAnova/Result.jsx:51–66` |
| 雙因子 ANOVA 的「細格層 Levene」列 | §3.2 | `twoWayAnova/compute.js:41`、`twoWayAnova/Result.jsx:240–255` |
| $F(\mathrm{df}_1,\mathrm{df}_2)$ 與 $p$ | §3.2 | `levene.js:76–77` |
| ★ 「無法檢定」中性狀態 | §3.4 | `levene.js:72–74`、`oneWayAnova/Result.jsx:57`、`twoWayAnova/Result.jsx:246`；i18n `errors.stats['levene-all-constant']` |

**孤兒欄位檢查**（2026-07-30 實跑）：`levene()` 回傳 5 欄（`F`／`df1`／`df2`／`p`／`error`），
**全部有消費者，零孤兒**。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫的 $F$ 相對差 1.1e−16 |
| 2 | authority | ★ `provenance.json` 的 `levene_mean_spss_default` 原寫「JS 與其逐值比對」而它**沒有 adapter** ⇒ 已更正（R62） |
| 3 | 文獻真實性 | 兩篇卷期頁碼可查、皆標【原文未取得】。★ 採用 median 版的**理由**未經原文核對 |
| 4 | 報表可追溯 | 5 欄零孤兒 |
| 5 | 假設前提 | ★ **開出 R66（L2）**：各組皆為常數時報「違反同質」，方向相反 |
| 6 | 慣例分歧 | 五項書面化；核心是 center 的 median vs mean（**本專案兩組基準都有，正好是教材**） |
| 7 | 邊界條件 | 實跑四種：全零變異（開出 R66）、單組零變異（正常，$F=6.0$）、$k=1$、各組 $n=1$（皆正確硬擋） |
| 8 | APA 敘述句 | 本方法無獨立 APA 句，數值嵌在三個主分析的前提區 ⇒ 無過度宣稱 |
| 9 | 數學小工具的第二套實作 | ★ `levene.js` 用 `descriptive.js` 的 `median`／`mean` 與 `pvalue.js` 的 `pF`，**未就地重寫任何工具** |
| 10 | 效果量的名稱與值域 | 本方法無效果量 |
| 11 | 掃描結論的前提 | ★ 本組**只有一個平衡設計的點**（$k=3$、$n_i=20$）。不平衡、$k$ 大、組內極小樣本三個方向未掃（E85） |

### R66（L2）各組皆為常數時，Levene 報「違反同質」——方向相反

**發現**（實跑 `levene([[1,1,1],[2,2,2],[3,3,3]])`）：舊版回 `{ F: Infinity, p: 0 }`。
後果一路傳到 UI：
- `assumptionChecker` 的 `leveneStatus` 讀到 $p=0$ 判 `'fail'`
- 前提面板印 **紅燈「變異數同質性：不通過」＋ $F=$ —（`fmtNum(Infinity)`）＋ $p<.001$**

而**真相是三組變異數完全相同（都是 0）**——工具給出的是相反的結論。

★ **而且這個分支永遠是錯的**：$SS_{\text{within}}=0$ 蘊含 $SS_{\text{between}}=0$（見 §3.4 的推導），
所以 $F$ 必然是 $0/0$，`Infinity` 這個回傳值**沒有任何情形會是對的**。

★ **同型第四次**：A4 的 R40-i（完全共線印「適合做因素分析」綠燈）、
A5a 的 R51（零變異 t 檢定印「$p<.001$」綠燈）、A6a 的 R61（零變異欄判「近似常態」綠燈）。
⇒ **這不是個案，是格式化函式對退化值的處理在專案內的系統性盲點。**

**處置（L2，當場修）**

1. ✅ 引擎回 `{ F: NaN, df1, df2, p: NaN, error: 'levene-all-constant' }`（`levene.js:72–74`）
2. ✅ i18n 中英各一鍵，明說「各組變異數其實完全相等，不應解讀為違反同質性」
3. ✅ `assumptionChecker.js` 兩處的 `detail` 改讀錯誤碼字串（原本任何 error 都印「組數或樣本不足」）
4. ✅ `oneWayAnova/Result.jsx` 與 `twoWayAnova/Result.jsx` 加**第三種狀態**：
   `undefinedTest` ⇒ 灰燈 ＋ 不下判定 ＋ 不計入「有前提被違反」的警告
   （★ 只改回 NaN 而不特判的話，`!(lv.p < 0.05)` 會變成綠燈「通過」——**同樣是錯的**）
5. ✅ 4 條行為測試，含「只有一組零變異時仍是正常檢定」與「一般資料的 $F$／$p$ 不變」兩條回歸鎖

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E85 | ★ **參數空間只有一個點**：$k=3$、$n_i=20$ 平衡設計。**不平衡設計**（Levene 對不平衡較敏感）、$k$ 大、組內樣本極小三個方向皆無基準 ⇒ 比照 R50／R60 的教訓，這是下一個該補格點基準的地方 |
| E86 | **center 不可選**：SPSS 使用者無法產生相容輸出。`reference.json` 已有 mean 版基準，補一個選項的成本很低 |
| E87 | **10% 修剪平均版未實作**（R `car` 的第三個選項） |
