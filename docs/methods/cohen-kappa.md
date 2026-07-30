# Cohen's Kappa（含加權 Kappa）

> 方法代號 `cohen-kappa`｜基準組 `reference.json → cohen_kappa`（12，★ 2026-07-30 由 3 欄擴充）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6b）｜相關文件：`icc.md`（連續評分的信度）、`chi-square.md`（同樣是交叉表）

---

## 1. 這個方法在回答什麼問題

**「兩位評分者把同一批對象分到同一類的程度，扣掉『純靠運氣也會一致』的部分之後，還剩多少？」**

$$\kappa=\frac{p_o-p_e}{1-p_e}$$

$p_o$ 是實際一致的比例，$p_e$ 是**在兩人各自的邊際分布下、隨機猜也會一致**的比例。
$\kappa=1$ 完全一致、$\kappa=0$ 等於瞎猜、負值代表比瞎猜還糟。

★ **加權 kappa** 用於**順序**類別：把「差一級」與「差三級」算成不同程度的不一致。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 兩位評分者、類別或順序尺度
- 內容分析的編碼者信度

**不該用**

- ★ **連續評分**：改用 ICC
- **三位以上評分者**：需要 Fleiss' $\kappa$（★ **本工具未實作**，E115）
- ★ **邊際極度不平衡時單看 $\kappa$**：這是有名的 kappa paradox——$p_o$ 很高但 $\kappa$ 很低

**常見誤用**

1. ★ **順序類別卻用未加權 $\kappa$。** 本資料集：未加權 0.479、linear 0.656、quadratic 0.802
   ——★ **同一批資料，三個數字差很多**，選哪一個必須說清楚
2. **報了 $\kappa$ 不報 CI。** APA 要求效果量附 CI（★ 而本工具的加權 CI 到 2026-07-30 才算對，見 §8）
3. **拿 Landis & Koch 的門檻當定論**：那組門檻本身是任意的

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $k$ | 類別數 |
| $p_{ij}$ | 交叉表格子比例 |
| $p_{i\cdot}$、$p_{\cdot j}$ | 列／行邊際比例 |
| $w_{ij}$ | 權重（一致程度，$w_{ii}=1$） |

### 3.2 三種權重（`kappa.js:53–75`）

| 權重 | $w_{ij}$ | 用途 |
|---|---|---|
| `none` | $1$ if $i=j$ else $0$ | 名目類別 |
| `linear` | $1-\dfrac{\lvert i-j\rvert}{k-1}$ | 順序類別，不一致的代價線性遞增 |
| `quadratic` | $1-\left(\dfrac{i-j}{k-1}\right)^2$ | 順序類別，重罰大幅不一致 |

$$p_o=\sum_i\sum_j w_{ij}p_{ij},\qquad
p_e=\sum_i\sum_j w_{ij}\,p_{i\cdot}p_{\cdot j},\qquad
\kappa=\frac{p_o-p_e}{1-p_e}$$

★ 未加權是加權的特例（$w=$ 單位矩陣），本工具用同一段程式碼處理三種。

### 3.3 ★ 標準誤與信賴區間（`kappa.js`，2026-07-30 改）

$$\hat\sigma^2=\frac{1}{n(1-p_e)^2}\left\{\sum_i\sum_j p_{ij}\Bigl[w_{ij}-(\bar w_{i\cdot}+\bar w_{\cdot j})(1-\kappa)\Bigr]^2-\bigl[\kappa-p_e(1-\kappa)\bigr]^2\right\}$$

其中 $\bar w_{i\cdot}=\sum_j p_{\cdot j}w_{ij}$、$\bar w_{\cdot j}=\sum_i p_{i\cdot}w_{ij}$
（Fleiss, Cohen & Everitt 1969）。95% CI $=\kappa\pm1.96\hat\sigma$，**並夾在 $[-1,1]$**。

★★ **這一段在 2026-07-30 之前是錯的**：原本用 $p_o(1-p_o)/[n(1-p_e)^2]$，
那是**未加權** kappa 的變異數，被原封不動套到加權情形 ⇒ quadratic 的 CI 上界算出 **1.0248**。見 §8 的 R74。

### 3.4 顯著性檢定

$H_0:\kappa=0$ 用另一個變異數 $\sigma_0^2=p_e/[n(1-p_e)]$（`kappa.js:166`），$z=\kappa/\sigma_0$。
★ **檢定與 CI 用的是兩個不同的變異數**——這是標準做法（$H_0$ 下與一般情形的漸近變異數不同），
但**報表沒有說明**，容易讓人以為 CI 與 $p$ 不一致（E116）。

### 3.5 退化情形

$p_e\to1$（邊際完全集中在同一類）⇒ 回 `undefinedKappa`（`kappa.js:152–160`）。
★ 2026-07-30 實跑：兩位評分者全評同一類 ⇒ 回 `needTwoLevels`，**硬擋，不誤導**。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 兩位評分者 | 介面限兩欄 |
| 同一組類別 | 取兩欄的聯集為類別集 |
| 類別數 $\ge2$ | 硬擋 `needTwoLevels` |
| ★ 順序性（加權才有意義） | ★ **不檢核**——對名目類別用 linear 權重不會被擋（E117） |
| $p_e\ne1$ | 硬擋 `undefinedKappa` |
| 遺漏值 | 逐列剔除 |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 20(1), 37-46. | 未加權 $\kappa$ | 【原文未取得】 |
| Cohen, J. (1968). Weighted kappa. *Psychological Bulletin*, 70(4), 213-220. | 加權 $\kappa$ | 【原文未取得】 |
| Fleiss, J. L., Cohen, J., & Everitt, B. S. (1969). Large sample standard errors of kappa and weighted kappa. *Psychological Bulletin*, 72(5), 323-327. | ★ **§3.3 的變異數**（2026-07-30 起採用） | 【原文未取得】 |
| Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics*, 33(1), 159-174. | 判讀門檻 | 【原文未取得】 |

## 6. 對照與驗證狀態

**基準組**：`cohen_kappa`（★ **12 欄**：三個點估計 ＋ 三組 SE ＋ 三組 CI 上下界）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **sklearn `cohen_kappa_score` 逐值**（三個點估計）＋ ★ **statsmodels `inter_rater.cohens_kappa` 逐值**（SE 與 CI，2026-07-30 新增 9 欄） |
| 2 | ★★ **R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）**：`psych::cohen.kappa` 的 CI 與本工具修正後的值**相對差 1e−9**（未加權與 quadratic 皆然）。三個點估計亦相符 |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2／§3.3 的公式以 numpy 自行重算三種權重的 $\kappa$、SE 與 CI，**不呼叫 `sklearn.cohen_kappa_score` 也不呼叫 statsmodels**。12 欄相對差 **0.00e+00 ~ 3.5e−15** |
| 4 | ★ **三方一致**：本工具 ＝ statsmodels ＝ psych ＝ FCE 原式手算。這是本批唯一四方都對上的量 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 加權定義 | linear／quadratic 如 §3.2 | 同 sklearn、psych（psych 預設 quadratic） | 一致 |
| ★ CI 的變異數 | **FCE (1969)** | 同 statsmodels、psych | ★ 2026-07-30 起一致；此前是錯的 |
| $H_0$ 檢定的變異數 | $p_e/[n(1-p_e)]$ | SPSS 用同族公式 | 一致，但與 CI 用不同式子（E116） |
| Fleiss' $\kappa$（3+ 評分者） | ★ **未實作** | R `irr`、SPSS 有 | 缺（E115） |
| 判讀門檻 | Landis & Koch | 同 | 一致 |

### ★ 尚未驗證的部分

1. **四篇原文皆未取得**。★ 但 §3.3 的變異數**已由獨立重寫 ＋ statsmodels ＋ psych 三方交叉核實**
2. ★ **$H_0$ 檢定的 $z$ 與 $p$ 零基準**：`reference.json` 沒有這兩欄（E118）
3. **Fleiss' $\kappa$ 未實作**（E115）；**順序性不檢核**（E117）
4. **從未與 SPSS 對照過**
5. ★ **參數空間未掃描**：只有 $k=4$、$n=60$、邊際大致平衡一個點。
   ★ **kappa paradox 的區域（邊際極度不平衡）零基準**，而那正是 $\kappa$ 最容易被誤讀的地方（E119）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 交叉表與邊際 | §3.1 | `kappa.js:120–138` |
| $p_o$／$p_e$ | §3.2 | `kappa.js:140–150` |
| $\kappa$ | §3.2 | `kappa.js:163` |
| ★ SE 與 95% CI | §3.3 | `kappa.js:184–205`（FCE 段，2026-07-30 改） |
| $z$ 與 $p$ | §3.4 | `kappa.js:166–169` |
| 加權選項 | §3.2 | `kappa.js:53–75`、Config |

**孤兒欄位檢查**（2026-07-30 實跑）：`varH0` 有 UI 消費者（$z$／$p$ 的中間值，不呈現）；
其餘 12 欄皆可追溯。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | ★ **開出 R74（L3）**：加權 CI 用了未加權的變異數 |
| 2 | authority | ★ provenance 原本只寫 sklearn，而 SE／CI **不是** sklearn 產生的（根本沒有基準）。已更新為「sklearn（點估計）＋ statsmodels（SE 與 CI）＋ FCE 1969（公式出處）」 |
| 3 | 文獻真實性 | 四篇卷期頁碼可查、皆標【原文未取得】 |
| 4 | 報表可追溯 | 12 欄零孤兒 |
| 5 | 假設前提 | 硬擋正確；★ 順序性不檢核（E117） |
| 6 | 慣例分歧 | 五項書面化 |
| 7 | 邊界條件 | 實跑兩種：兩人完全一致（$\kappa=1$、CI $[1,1]$，正確）、兩人皆評同一類（`needTwoLevels` 硬擋） |
| 8 | APA 敘述句 | 報 $\kappa$ 與 CI；★ **修復前那個 CI 的上界會是 1.025** |
| 9 | 數學小工具的第二套實作 | `twoSidedZP`（`kappa.js:43`）是本檔就地實作的常態雙尾——★ `grep` 確認 `pvalue.js` 有 `normalSf`，**這是一份可以合併的重複**（E120，同 R71 之型） |
| 10 | ★ 效果量的名稱與值域 | ★★ **這一條抓到了 R74**：$\kappa\in[-1,1]$，而修復前 quadratic 的 CI 上界是 **1.0248** |
| 11 | 掃描結論的前提 | ★ 只有一個交叉表；kappa paradox 區零基準（E119） |

### R74（L3）加權 kappa 的信賴區間用錯變異數公式

**發現**　修復前的 `kappa.js:172`：`varCI = po(1−po) / (n(1−pe)²)`（該行現為 R74 的註記區塊，新公式在 `kappa.js:184–205`）
——這是**未加權** kappa 的漸近變異數，卻被原封不動套用到加權的情形。

| 加權 | 舊 SE | 正確 SE | 舊 CI 上界 |
|---|---|---|---|
| none | 0.08524 | 0.08567 | 0.6465（小差） |
| quadratic | **0.11372** | **0.04715** | ★ **1.0248** |

★★ **兩層問題**：
1. **值域錯**：$\kappa$ 依定義 $\le1$，而報表會印出 1.025（同 A5b 的 R54，$\varepsilon^2$ 印出負數）
2. ★ **方向也錯**：加權放寬了「一致」的定義 ⇒ $\kappa$ 較高、抽樣變異**較小**。
   舊公式讓 quadratic 給出**最大**的 SE——**連方向都反了**

★ **為什麼三道防線沒抓到**：`reference.json` 的 `cohen_kappa` **只有三個點估計，沒有 SE 也沒有 CI**
——**逐值比對比不到不存在的欄位**。這與 R56（Dunn 事後比較零基準）是同一型。

**處置（Kevin 2026-07-30 核定：改用正確公式 ＋ 夾值域 ＋ 補基準）**

1. ✅ 改用 Fleiss, Cohen & Everitt (1969) 的加權變異數（§3.3）
2. ✅ CI 夾在 $[-1,1]$（修正後在本資料集已不會越界，這是防線不是遮蓋）
3. ✅ **基準組 3 欄 → 12 欄**：新增三組 SE 與 CI，權威為 `statsmodels.stats.inter_rater.cohens_kappa`
4. ✅ `reference.json` 完整重生，**其餘 85 組逐位元不變**
5. ✅ 6 條行為測試，含 ★ **「加權時的 SE 必須小於未加權」的方向性鎖**（比逐點比對更難繞過）
   與「三個點估計不得被本次修正改動」的回歸鎖

**修正後**：三種加權的 SE 與 statsmodels 逐值相符（相對差 ≤ 3.2e−10）、
CI 與 psych 相對差 1e−9、與 FCE 原式獨立手算相符。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E115 | **Fleiss' $\kappa$（3 位以上評分者）未實作** |
| E116 | **CI 與 $p$ 用兩個不同的變異數**（標準做法，但報表沒說明） |
| E117 | ★ **順序性不檢核**：對名目類別用 linear／quadratic 權重不會被擋，而那是沒有意義的 |
| E118 | **$z$ 與 $p$ 零基準** |
| E119 | ★★ **kappa paradox 的區域零基準**：邊際極度不平衡時 $p_o$ 高而 $\kappa$ 低，那是 $\kappa$ 最容易被誤讀的地方，而唯一的基準是一個邊際大致平衡的表 |
| E120 | **`twoSidedZP` 與 `pvalue.js` 的 `normalSf` 重複**（同 R71 之型，可合併） |
