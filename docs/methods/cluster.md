# 集群分析（Cluster Analysis：k-means & Ward 階層法）

> 方法代號 `cluster`｜基準組 `reference.json → cluster_kmeans_k3`（7）＋`cluster_ward_k3`（8）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6b）｜相關文件：`descriptive.md`（標準化）、`visualization.md`

---

## 1. 這個方法在回答什麼問題

**「這批觀察值能不能分成幾群，讓同一群裡的人彼此相似、不同群的人彼此不同？」**

★ 與其他方法的根本差別：**集群分析沒有依變項，也沒有虛無假設**——
它不檢定任何東西，只是**把資料切開**。你永遠切得出 $k$ 群，
**問題永遠是「這 $k$ 群有沒有意義」，而那不是統計能回答的。**

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 探索性地找出受訪者的類型（如公務人員的數位態度分群）
- 建立後續分析用的分組變項

**不該用**

- ★ **當作「發現了 $k$ 個真實存在的類型」的證據。** 集群一定會給你 $k$ 群
- ★ **變項尺度差很多而不標準化。** 本工具**預設標準化**（見 §3.1）
- **類別變項**：歐氏距離對類別沒有意義

**常見誤用**

1. ★★ **用 elbow 或 silhouette「決定」$k$。** 這兩者是**參考**，不是判準；
   最終要看群的**可解釋性**
2. ★ **對 k-means 的結果宣稱穩定性而不換起點重跑。** 本工具用固定種子的 k-means++
   （見 §3.2），**同樣的資料每次結果相同，但那不代表解是全域最佳**
3. **忘了報標準化與否、距離定義、連結法。** 這三個都會改變結果

## 3. 公式與定義

### 3.1 前處理（`cluster.js:91–120`）

預設對每個變項做 **z 標準化（$n-1$ 分母）**：$z=(x-\bar x)/s$。
★ 這與 R 的 `scale()` 預設一致（也是 $n-1$）；`standardize: false` 可關閉。

### 3.2 k-means（`cluster.js:150–252`、`477`）

- **初始化**：k-means++（`cluster.js:150`），亂數來源為**固定種子的 mulberry32**（`cluster.js:56`）
  ⇒ **同一批資料每次結果相同**
- **迭代**：Lloyd 演算法，上限 100 次（`cluster.js:202`）
- **目標**：最小化 $WSS=\sum_i\lVert x_i-c_{a(i)}\rVert^2$

### 3.3 ★ Ward 階層法（`cluster.js:522`）

Lance-Williams 遞推，合併使 $WSS$ 增量最小的兩群：

$$d(ab,c)=\frac{(n_a+n_c)d(a,c)+(n_b+n_c)d(b,c)-n_c\,d(a,b)}{n_a+n_b+n_c}$$

★★ **距離用的是平方歐氏距離**——這對應 **R 的 `hclust(method = "ward.D2")`，不是 `ward.D`**。
兩者是**不同的演算法**，R 的 `ward.D` 對已開平方的距離套同一條遞推式，結果不同。

**2026-07-30 實測確認**（Kevin 本機 R 4.6.0）：

| 方法 | 各群大小 | WSS |
|---|---|---|
| ★ **`ward.D2`** | **17, 18, 25** | **94.76284469** |
| `ward.D` | 12, 23, 25 | 93.42952662 |
| **本工具** | **17, 18, 25** | **94.76284469** |

⇒ **本工具 ＝ `ward.D2` ＝ sklearn 的 `linkage='ward'`**，而且 **60 筆分群標籤逐一相同**。
★ 這個問題本專案此前從未回答過。

### 3.4 品質指標（`cluster.js`）

| 指標 | 公式 |
|---|---|
| $WSS$ | $\sum_i\lVert x_i-c_{a(i)}\rVert^2$ |
| $BSS$ | $TSS-WSS$ |
| Silhouette | $s(i)=\dfrac{b(i)-a(i)}{\max(a(i),b(i))}$，報平均 |
| Elbow | $k=2..10$ 的 $WSS$ 曲線 |

### 3.5 ★ 退化情形（2026-07-30 新增，見 §8 的 R72）

| 情形 | 舊版 | 現在 |
|---|---|---|
| 所有觀察值相同、$k=3$ | ★ Ward 切成 8/8/14，三個中心點一模一樣 | 標記 `degenerate` 並警告 |
| 相異點數 < $k$ | ★ k-means 產生**空集群**且 silhouette = 1.0000 | 同上，並取消輪廓係數的判讀 |

判準：**相異觀察值數 < $k$ 或有空集群**（一條涵蓋兩種病徵）。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 變項為連續、歐氏距離有意義 | Config 限 `continuous`／`ordinal` |
| 尺度可比（標準化） | ✅ 預設標準化，可關閉 |
| $k$ 合理 | 硬擋 $2\le k\le10$；提供 elbow 與 silhouette **作為參考** |
| $N>k$ | 硬擋 `tooFewN` |
| ★ 資料有足夠差異 | ★ **2026-07-30 起標記並警告**（R72） |
| 遺漏值 | 逐列 listwise |
| ★ 離群值 | ★ **不檢核**——而 k-means 對離群值極敏感（E144） |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. *Proc. 5th Berkeley Symposium*, 1, 281-297. | k-means | 【原文未取得】 |
| Ward, J. H. (1963). Hierarchical grouping to optimize an objective function. *JASA*, 58(301), 236-244. | Ward 法 | 【原文未取得】 |
| Arthur, D., & Vassilvitskii, S. (2007). k-means++: The advantages of careful seeding. *Proc. SODA*, 1027-1035. | §3.2 的初始化 | 【原文未取得】 |
| Rousseeuw, P. J. (1987). Silhouettes: A graphical aid to the interpretation and validation of cluster analysis. *J. Comput. Appl. Math.*, 20, 53-65. | Silhouette | 【原文未取得】 |
| Murtagh, F., & Legendre, P. (2014). Ward's hierarchical agglomerative clustering method: Which algorithms implement Ward's criterion? *Journal of Classification*, 31(3), 274-295. | ★ **`ward.D` 與 `ward.D2` 的差別** | 【原文未取得】 |

## 6. 對照與驗證狀態

**基準組**：`cluster_kmeans_k3`（7 欄，含 `labelsCanonical`）、`cluster_ward_k3`（8 欄，含 `elbowWss`）

**tier / status**：兩組皆 tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **sklearn `KMeans`／`AgglomerativeClustering` 逐值**：含 `labelsCanonical`（以「首次出現順序」正規化後逐值比對，分割相同即 ARI = 1） |
| 2 | ★★ **R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）——本組完全結案**：`hclust(ward.D2)` 給 WSS **94.76284469**、各群大小 17/18/25 ⇒ 與本工具**逐值相同**，且 **60 筆分群標籤正規化後逐一相同**；`kmeans(nstart = 50)` 給 14/21/25、WSS **85.72984895** ⇒ 亦逐值相同；`TSS = 177` 相符 |
| 3 | ★★ **這一道回答了一個此前沒人問過的問題**：sklearn 的 `linkage='ward'` 對應 R 的哪一個？答案是 **`ward.D2`**（`ward.D` 給 12/23/25、WSS 93.4295，明顯不同）。⇒ 本工具的 Ward 慣例現在有名字了 |
| 4 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.3 的 Lance-Williams 遞推自寫 Ward，**不呼叫 sklearn 也不呼叫 scipy**。WSS **逐位元相同（0.00e+00）**、各群大小相符、**標籤正規化後完全相同**、$TSS=177$ 相符 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ Ward 的版本 | **`ward.D2`**（平方歐氏 ＋ LW） | R 有 `ward.D` 與 `ward.D2` 兩種；SPSS 的 Ward 對應 `ward.D2` | ★ 2026-07-30 確認；此前無記載 |
| 標準化 | 預設開，$n-1$ 分母 | R `scale()` 同；SPSS 需手動 | 一致 |
| k-means 初始化 | k-means++，**固定種子** | R `kmeans` 預設隨機、需 `nstart` | ★ 本工具**可重現**，R 不指定種子則不可重現 |
| 距離 | 僅歐氏 | SPSS／R 提供多種 | 缺（E145） |
| 連結法 | 僅 Ward | R 提供 7 種 | 缺（E146） |
| 集群數建議 | elbow ＋ silhouette | 同 | 一致 |

### ★ 尚未驗證的部分

1. **五篇原文皆未取得**。★ 但 §3.3 的 Lance-Williams 遞推**已由獨立重寫逐位元反證**
2. ★ **k-means 的解只驗證了「與 sklearn 同一個解」**，不是「全域最佳」。
   本工具固定種子 ⇒ 可重現但**不保證最佳**；R 的 `nstart = 50` 找到同一個解可作為旁證，
   但**沒有窮盡驗證**（E147）
3. ★ **silhouette 的逐點值零基準**：`reference.json` 只有平均值（E148）
4. ★ **`elbowWss` 只有 Ward 那一組有**（$k=2..10$），**k-means 的 elbow 曲線零基準**（E149）
5. **離群值不檢核**（E144）；**其他距離與連結法未實作**（E145、E146）
6. **從未與 SPSS 對照過**
7. ★ **參數空間未掃描**：只有 $k=3$、$p=3$、$n=60$ 一個點

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 各群大小與成員 | §3.2／§3.3 | `cluster.js` 的 `clusterSizes`／`assignments` |
| 中心點（原始尺度） | §3.1 | `centroids`；`Result.jsx` 的 `varMeansByCluster` |
| 中心點 z 分數側寫 | §3.1 | `varZScoresByCluster` |
| $WSS$／$BSS$／$TSS$／$BSS/TSS$ | §3.4 | `wss`／`bss`／`tss` |
| Silhouette ＋ 判讀 | §3.4 | `silhouette`；`Result.jsx` 的 `silhouetteInterpKey` |
| Elbow 曲線 | §3.4 | `elbow` |
| 迭代次數／收斂 | §3.2 | `iterations`／`converged` |
| ★ 退化情形警告框 | §3.5 | `cluster.js` 的 `degenerate`／`distinctRows`／`emptyClusters`／`constantVars`；i18n `cluster.degenerate*` |

**孤兒欄位檢查**（2026-07-30 實跑）：`_Xstd`／`_Xraw`／`_stats`／`centroidsStd`
**在 `clusterAnalysis` 的出口被明確剔除**（`cluster.js` 的 `INTERNAL` 集合）——
★ 這是本專案少見的「主動清理內部欄位」的做法，值得其他模組參照。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫的 Ward **WSS 逐位元相同、標籤逐一相同** |
| 2 | authority | provenance 為 sklearn，與產生方一致。★ 而 **Ward 的「版本」這個更深的問題由 R 結案** |
| 3 | 文獻真實性 | 五篇卷期頁碼可查、皆標【原文未取得】 |
| 4 | 報表可追溯 | ★ **內部欄位主動剔除**，零孤兒 |
| 5 | 假設前提 | ★ **開出 R72（L2）**：退化情形產出「看起來成立的分群」；離群值不檢核（E144） |
| 6 | 慣例分歧 | 六項書面化。★ **核心是 `ward.D` vs `ward.D2`**，這是本批最實質的一項慣例確認 |
| 7 | 邊界條件 | 實跑三種：全常數 + Ward（開出 R72）、全常數 + k-means（空集群）、只有 2 個相異點（空集群 + silhouette 1.000） |
| 8 | APA 敘述句 | 報方法、$k$、各群大小、silhouette；★ **應載明 Ward 的版本與標準化與否** |
| 9 | 數學小工具的第二套實作 | ★ `euclid`／`euclid2`／`colStats` 皆本檔就地實作。`colStats` 與 `descriptive.js` 的 `mean`／`sd` 功能重疊，但本檔要的是逐欄向量版 ⇒ 屬合理的特化，不是複製 |
| 10 | 效果量的名稱與值域 | Silhouette $\in[-1,1]$；$BSS/TSS\in[0,1]$。★ **退化時 silhouette 可以是 1.0000（完美）而分群毫無意義**——這是 R72 要擋的核心 |
| 11 | 掃描結論的前提 | 只有 $k=3$、$p=3$、$n=60$ 一個點 |

### R72（L2）退化情形產出「看起來成立的分群」

**發現**（實跑）：

| 情形 | 舊版報表 |
|---|---|
| ★ 30 個**完全相同**的觀察值 + Ward + $k=3$ | 切成 **8/8/14 三群**，三個中心點一模一樣，報表照常顯示三個集群與各自大小 |
| 全常數 + k-means + $k=3$ | 各群大小 **[30, 0, 0]** ——兩個**空集群** |
| 只有 2 個相異點 + $k=3$ | **[15, 15, 0]**，一個空群，而 **silhouette = 1.0000（完美）** |

★★ **最誤導的是最後一個**：空集群配完美輪廓係數。
使用者看到 silhouette = 1.000 會認為分群品質極佳，而真相是資料裡只有兩種值。

★ 與前四次同型（A4 R40-i／A5a R51／A6a R61／R66），但這一支的症狀最「無中生有」——
**前四次是把無定義的結果印成有意義的判定，這一次是憑空造出三個集群。**

**處置（L2，當場修）**

1. ✅ 引擎新增四個旗標：`distinctRows`／`emptyClusters`／`degenerate`／`constantVars`。
   ★ 判準取「相異觀察值數 < $k$ 或有空集群」——**一條涵蓋兩種病徵**
2. ✅ 警告框會指出具體成因（幾個相異點對幾群／幾個空集群／哪些變項是常數）
3. ✅ ★ **在三處取消輪廓係數的判讀**：`QualitySection` 的卡片、解讀段、主元件各有一份 `sKey`
4. ✅ 4 條行為測試，含「正常資料不得被標記」的回歸鎖

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E144 | ★ **離群值不檢核**：k-means 對離群值極敏感，一個極端點就能拉走一整群 |
| E145 | **只有歐氏距離**（SPSS／R 提供 Manhattan、Mahalanobis 等） |
| E146 | **只有 Ward 連結法**（R 提供 7 種） |
| E147 | ★ **k-means 的解未經全域驗證**：固定種子 ⇒ 可重現但不保證最佳；R 的 `nstart = 50` 找到同一解可作旁證，但沒有窮盡 |
| E148 | **silhouette 的逐點值零基準**（只有平均） |
| E149 | **k-means 的 elbow 曲線零基準**（只有 Ward 那一組有 `elbowWss`） |
