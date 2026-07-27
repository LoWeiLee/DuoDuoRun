# BCa 信賴區間（Bias-corrected and accelerated bootstrap CI）

> 方法代號 `pls_bca_reference`｜基準組 `reference.json → pls_bca_reference`（9 欄，含 999 筆 draws 與 60 筆 jackknife）｜溯源 tier **B** / ★ **pending**
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

percentile CI（見 `pls-bootstrap.md` §3.4）直接取 bootstrap 分布的 2.5% 與 97.5% 分位數。
它有兩個已知弱點：

1. **偏誤**：bootstrap 分布的中心可能不在原始估計值上
2. **偏態**：分布不對稱時，兩端該切的位置不一樣

BCa 回答的是：**把這兩件事校正後，區間端點該落在哪個分位數上**。
做法是不去取 $\alpha/2$ 與 $1-\alpha/2$，而是取兩個**調整後**的分位數 $\alpha_1$、$\alpha_2$，
調整幅度由「偏誤校正常數 $z_0$」與「加速常數 $a$」決定。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- bootstrap 分布明顯偏態（中介效果的路徑乘積幾乎總是偏態，這是 BCa 最常見的用例）
- bootstrap 平均與原始估計差距明顯（有偏誤）
- 期刊或審稿人指定 BCa

**不該用／要小心**

- **樣本很小**：$a$ 由 $n$ 次 jackknife 的三階動差估計，$n$ 小時極不穩定
- **計算成本敏感時**：BCa 需要**額外 $n$ 次全模型重估**（leave-one-out）。
  $n=500$ 的模型等於多跑 500 次完整 PLS 估計
- **只是想要一個「看起來更顯著」的區間**：BCa 有時比 percentile 窄、有時更寬，不是萬靈丹

**常見誤用**：以為 BCa 一定比 percentile 好。當 $z_0=0$ 且 $a=0$ 時 BCa **退化為 percentile**
（本工具有測試鎖住這個恆等式）；當 $a$ 估得不穩時，BCa 反而可能比 percentile 差。

## 3. 公式與定義

設 $\hat\theta$ 為原始（全樣本）估計、$\hat\theta^*_1,\dots,\hat\theta^*_B$ 為 bootstrap 估計、
$\hat\theta_{(i)}$ 為留一（leave-one-out）估計、$\Phi$ 為標準常態 CDF。

### 3.1 偏誤校正常數 $z_0$

$$\hat z_0=\Phi^{-1}\!\left(\ \text{clamp}\!\left[\frac{\#\{\hat\theta^*_b<\hat\theta\}}{B},\ \frac{1}{B+1},\ \frac{B}{B+1}\right]\right)$$

→ `src/lib/stats/pls.js:2391–2376`（計數 `2353–2354`、夾擠 `2356`、$\Phi^{-1}$ `2357`）

★ **兩個慣例選擇（都待原文核定）**：

- **並列（ties）怎麼算**：本工具用**嚴格小於** $\#\{\hat\theta^*<\hat\theta\}$。
  `scipy.stats._resampling._bca_interval` 用 $\left(\#\{<\}+\#\{\le\}\right)/(2B)$（中點修正）。
- **端點夾擠**：本工具把比例夾在 $[1/(B+1),\,B/(B+1)]$ 以避免 $\Phi^{-1}(0)=-\infty$；scipy 不夾。

本組資料的統計量是連續型平均、**實測無並列**，兩者恰好同值——所以這條差異**沒有被基準覆蓋**。

### 3.2 加速常數 $a$

$$\hat a=\frac{\sum_{i=1}^{n}\left(\bar\theta_{(\cdot)}-\hat\theta_{(i)}\right)^3}{6\left[\sum_{i=1}^{n}\left(\bar\theta_{(\cdot)}-\hat\theta_{(i)}\right)^2\right]^{3/2}}$$

其中 $\bar\theta_{(\cdot)}$ 為 jackknife 估計的平均。

→ `pls.js:2396–2386`（平均 `2359`、二階與三階和 `2360–2366`、組裝 `2367`）

退化保護：分母的二階和 $\le 10^{-24}$ 時 $a=0$（`pls.js:2386`）；
jackknife 少於 3 筆時 $a=0$（`pls.js:2396`）。

★ **待原文核定的兩點**：分母的 $3/2$ 次方，以及 jackknife 偏差項的**符號方向**
（$\bar\theta_{(\cdot)}-\hat\theta_{(i)}$ 或 $\hat\theta_{(i)}-\bar\theta_{(\cdot)}$——
三次方會變號，$a$ 的正負決定區間往哪一邊偏）。

### 3.3 調整後的分位數

$$\alpha_{\text{adj}}(z)=\Phi\!\left(\hat z_0+\frac{\hat z_0+z}{1-\hat a\left(\hat z_0+z\right)}\right)$$

$$\alpha_1=\alpha_{\text{adj}}\!\left(\Phi^{-1}(\tfrac{\alpha}{2})\right),\qquad \alpha_2=\alpha_{\text{adj}}\!\left(\Phi^{-1}(1-\tfrac{\alpha}{2})\right)$$

$$\text{CI}_{\text{BCa}}=\left[\ Q(\alpha_1),\ Q(\alpha_2)\ \right]$$

$Q(\cdot)$ 為 R type 7 線性內插分位數（同 `pls-bootstrap.md` §3.4）。

→ `pls.js:2388–2393`（$\alpha_{\text{adj}}$）、`2375–2376`（兩個端點）、`2377`（取分位數）

退化保護：$|1-\hat a(\hat z_0+z)|\le10^{-12}$ 時直接回 1 或 0（依 $\hat z_0+z$ 的正負），
即區間端點取到分布的極值（`pls.js:2391`）。

### 3.4 在引擎裡的成本

BCa 開啟時，除了 $B$ 次重抽，還要跑 **$n$ 次 leave-one-out 全管線重估**
（含多階段的 HOC／調節、PLSc 校正）。

→ `pls.js:2523–2545`（jackknife 迴圈）

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 有效 jackknife ≥ 3 | 計數 | `bca-failed`，訊息建議改用 percentile | `pls.js:2541–2543` |
| $a$ 的分母非退化 | 二階和 > 1e−24 | $a=0$（退化為 BC，只做偏誤校正） | `pls.js:2386` |
| $\alpha_{\text{adj}}$ 的分母非退化 | $\lvert\text{denom}\rvert>10^{-12}$ | 端點取分布極值 | `pls.js:2390–2392` |
| $z_0$ 的 $\Phi^{-1}$ 有限 | 比例夾擠 | 恆有限 | `pls.js:2375` |
| 樣本量足以讓 $a$ 穩定 | **不檢核** | 無警告（見第 6 節） | — |
| 統計量無並列 | **不檢核** | 無警告；並列慣例本身待原文核定 | — |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Efron, B. (1987). Better bootstrap confidence intervals. *Journal of the American Statistical Association*, 82(397), 171–185. | 3.1–3.3 全部 | ★ **【原文未取得】** |
| Efron, B., & Tibshirani, R. J. (1993). *An Introduction to the Bootstrap*, §14.3. Chapman & Hall. | 3.1–3.3 全部（$z_0$ 與 $a$ 的估計式） | ★ **【原文未取得】** |

★ **取得管道已窮盡（2026-07-25 確認）**：Efron 個人頁（efron.ckirby.su.domains）與 JASA 皆取不到 1987 原文；
該書第 14 章無合法開放全文；Kevin 的機構訂閱亦未涵蓋。
解除封鎖路徑見 `roadmap-v2.md` §1 Session Q2 節（館際互借／文獻傳遞為首選；該書為統計系標準教科書，
實體館藏取得第 14 章即可）。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_bca_reference`。統計量為 `main.y` 的平均，
$B=999$ 固定 draws（rng seed 20260704）＋ 60 筆完整 jackknife **一併寫入 fixture**，
讓 JS 對同一批輸入逐值比對六個輸出（$z_0$、$a$、$\alpha_1$、$\alpha_2$、CI 兩端）。

**tier / status**：tier **B** / ★ **pending**——這是全專案僅存兩組 pending 之一。

### 為什麼是 pending（這一節是本文件的重點）

目前有**兩道**交叉驗證，**兩道都不足以結案**：

| 道 | 內容 | 為什麼不足 |
|---|---|---|
| 1 | 固定 draws／jackknife 注入，JS 的 `bcaInterval()` 對本檔 numpy 基準逐值比對六欄 | 只鎖住「**JS 與本檔 numpy 一致**」。兩邊是同一個作者對同一份文獻的同一次理解 |
| 2 | 餵同一批 draws 給 **`scipy.stats._resampling._bca_interval`**，逐值 assert $z_0$／$a$／$\alpha_1$／$\alpha_2$，容差 1e−12；實測差異 $z_0$ 0.0、$a$ **1.7e−18**、$\alpha_1$ 0.0、$\alpha_2$ 1.1e−16（機器精度內全中）。**已升為重生時 assert** | scipy 的實作同樣是「某人讀 Efron & Tibshirani §14.3 後的再實作」，**未逐式文件化**，屬同一族公式的另一次編碼，不是 §0 意義下的權威來源 |

★ **兩道都抓不到「$z_0$ 或 $a$ 的估計式本身讀錯」**——而 §0 規範存在的理由，
就是 2026-07-13 與 Session Q2 各抓到一批 bug，**全部落在沒有權威對照的那一側**
（例如 `pls_cta` 誤用 Student $t$ 而非常態 $z$、`pls_pos` 誤用 $\Sigma$SSE 而非 $\Sigma R^2$）。
因此**不接受以替代驗證充當結案**，維持 pending 直到取得原文。

**本文件的第三道（2026-07-26 新增）**：依第 3 節文字規格以 numpy 重寫 $z_0$／$a$／$\alpha_{\text{adj}}$／
R type 7 分位數，對六欄比對，**最大絕對差 0.0（逐位元相同）**。
性質同第 1 道——驗的是文件↔實作無漂移，不改變 pending 狀態。

**已知的慣例差異**

1. **並列（ties）**：本工具 $\#\{<\}/B$；scipy 用 $(\#\{<\}+\#\{\le\})/(2B)$。
   **本批資料無並列，兩者同值 ⇒ 此路徑未被基準覆蓋。**
2. **端點夾擠**：本工具夾在 $[1/(B+1),B/(B+1)]$；scipy 不夾。
3. **分位數內插**：R type 7。

### ★ 尚未驗證的部分

1. **$z_0$ 的並列與端點夾擠慣例**（上述第 1、2 項）——待原文。
2. **$a$ 的 jackknife 估計式與分母指數**（$3/2$ 次方）、**偏差項的符號方向**——待原文。
   符號方向錯了會讓區間往**反方向**偏，且 scipy 對照抓不到（若 scipy 同向）。
3. **並列情形完全未測**：沒有 fixture、沒有行為測試。離散型統計量（例如中位數、比例）
   會頻繁出現並列，屆時兩種慣例的差異是實質的。
4. **$a$ 在小樣本下的穩定性未量化**，工具不警告。
5. **BCa 在 PLS 路徑係數（而非簡單平均）上的表現未驗證**：基準組的統計量是 `main.y` 的平均，
   **不是 PLS 參數**。引擎內 BCa 的行為只有一條測試鎖住（「同種子與 percentile 共用點估計／SE，
   僅 CI 端點不同」，`pls.test.js`），**沒有數值基準**。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 95% CI 下界（ciType = bca） | 3.3 $Q(\alpha_1)$ | `pls.js:2396` |
| 95% CI 上界（ciType = bca） | 3.3 $Q(\alpha_2)$ | `pls.js:2396` |
| 有效 jackknife 次數 `nJackknife` | 3.4 | `pls.js:2527`、`2538` |
| `bca-failed` 錯誤 | §4 | `pls.js:2541–2543` |

★ **$z_0$ 與 $a$ 本身不在報表上**。它們是中間量，只在基準組與 `bcaInterval()` 的回傳值裡。
這是刻意的（一般使用者不需要看），但也意味著**使用者無法從 UI 判斷校正幅度有多大**。
考慮在未來把 $z_0$、$a$ 以「診斷資訊」形式選配顯示——列為第 6 節之外的改善建議，不開待辦。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫逐位元相同） |
| 2 | authority 是否支持該公式 | ★ **authority 誠實標為「待審計【卡文獻取得】」**——這是全專案 authority 欄位寫得最完整的一組，把待核的兩個風險點逐項列出。檢核**通過** |
| 3 | 文獻真實性 | 兩篇皆**未取得原文**，取得管道已窮盡並記錄；**沒有以記憶充當 authority** |
| 4 | 報表可追溯 | **通過**（並記錄 $z_0$／$a$ 不上報表的設計，見第 7 節） |
| 5 | 假設前提 | **通過**（四道退化保護齊全）；2 處不檢核已列入第 6 節 |
| 6 | 慣例分歧 | **通過**（三項全部書面化，其中並列慣例明確標註「未被基準覆蓋」） |
| 7 | 邊界條件 | **發現 1 項未測**（並列，第 6 節第 3 點） |
| 8 | APA 敘述句 | **通過**（CI 類型寫入句子：「BCa 95% 信賴區間」） |

### R1（通過）獨立重寫

依第 3 節文字規格，用 numpy ＋ `scipy.stats.norm` 重寫 $z_0$、$a$、$\alpha_{\text{adj}}$ 與
R type 7 分位數，對 fixture 內的 999 筆 draws 與 60 筆 jackknife 計算六欄，
與基準值**逐位元相同（最大差 0.0）**。

★ 說明：這一項的價值在確認「第 3 節寫的公式就是產生基準值的公式」。
它**不改變 pending 狀態**——pending 的原因是缺**權威原文**，不是缺一致性檢查。

### 本組沒有新開待辦

本組的 pending 狀態與待核風險點**早已完整記錄在 `provenance.json`**，
階段 A 的紅隊確認該登記準確、無誇大、無以記憶充當引用。
新增的是把「並列慣例未被基準覆蓋」與「BCa 在 PLS 參數上無數值基準」兩點寫進第 6 節——
前者原本只在 provenance 的 `verification` 末段一句話，後者**先前未記錄於任何地方**。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
