# 卡方檢定（Chi-square Test：Independence & Goodness-of-Fit）

> 方法代號 `chi-square`｜基準組 `reference.json → chisquare_2x2`（6）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A5b）｜相關文件：`fisher-exact.md`（2×2 小樣本的替代）

---

## 1. 這個方法在回答什麼問題

手上有兩個類別變項——例如「服務單位（中央／地方）」與「是否採用 AI 輔助審查（是／否）」——
把它們交叉成一張表之後，問題是：

**「這兩個變項有關係嗎？還是這張表看起來的差異只是抽樣的隨機起伏？」**

卡方檢定的作法是先算出「如果兩個變項完全無關，每一格**應該**有幾個人」（期望次數），
再把「實際有幾個人」跟它比。差得越多、$\chi^2$ 越大，越難用巧合解釋。

本工具提供兩種：

- **獨立性檢定**（兩個類別變項的交叉表）
- **適合度檢定**（一個類別變項，對照理論比例；未指定時預設均勻分布）

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 兩個名義／順序變項的關聯性初探
- 樣本量夠、每格期望次數不會太小
- 只想知道「有沒有關係」，關係的方向與強度看標準化殘差與 Cramér's V

**不該用**

- ★ **每格期望次數太小**：$2\times2$ 表任一格期望次數 < 5 時改用 Fisher 精確檢定（本工具會在報表主動建議，`chiSquare.js:143`）
- **配對／重複測量資料**：同一批人前後兩次測量要用 McNemar（本工具**未實作**）
- **細格是「同一個人被算兩次」**：卡方要求每個觀察彼此獨立
- **想談因果**：卡方只講關聯

**常見誤用**

1. ★ **把 $\chi^2$ 的大小當成關聯強度。** $\chi^2$ 隨 $N$ 線性膨脹——同一個關聯強度，樣本翻倍 $\chi^2$ 就翻倍。要談強度看 **Cramér's V**
2. **$N$ 很大時把顯著當重要。** $N = 3000$ 時 $V = .05$ 也會顯著，但那是「幾乎無關」
3. **報了整體顯著就結束。** 整體顯著只說「表裡有結構」，是哪幾格造成的要看標準化殘差
4. ★ **在 $2\times2$ 表上混用校正與未校正的 $\chi^2$ 卻不說明用了哪個**（見 §3.2）

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $O_{ij}$ | 第 $i$ 列第 $j$ 欄的觀察次數 |
| $E_{ij}$ | 同一格的期望次數 |
| $R$、$C$ | 列數、欄數 |
| $N$ | 有效樣本數（列變項與欄變項**都不缺失**者） |

### 3.2 統計量

期望次數與 $\chi^2$（`chiSquare.js:88`、`122`）：

$$E_{ij}=\frac{R_i \cdot C_j}{N},\qquad
\chi^2=\sum_{i=1}^{R}\sum_{j=1}^{C}\frac{(O_{ij}-E_{ij})^2}{E_{ij}},\qquad
\mathrm{df}=(R-1)(C-1)$$

★ **Yates 連續性校正**（`chiSquare.js:123–127`）——**本工具的慣例：只在 $2\times2$ 施加，且兩個值都報**：

$$\chi^2_{\text{Yates}}=\sum\frac{\bigl(\max(0,\;|O_{ij}-E_{ij}|-0.5)\bigr)^2}{E_{ij}}$$

| 決策點 | 本工具 | 理由 |
|---|---|---|
| 是否施加 Yates | **只有 $R=C=2$**（`isTwoByTwo`，`chiSquare.js:115`） | Yates 的推導建立在 $\mathrm{df}=1$ 的離散分布上；$2\times2$ 以外沒有對應的理論基礎 |
| 施加後是否取代原值 | **不取代，兩個都報** | Yates 是否該用在文獻上仍有爭議（保守到偏誤的程度受質疑）；報兩個並揭露，比替使用者選一個誠實 |
| 用 $\max(0,\cdot)$ 而非直接減 | 是 | $\lvert O-E\rvert < 0.5$ 時直接減會讓該格的貢獻**變成正的**（負數平方），方向反了 |

★ 這個 $\max(0,\cdot)$ 寫法與 scipy 的做法等價：scipy 是把 $O$ 往 $E$ 的方向移動 $\min(0.5,|O-E|)$，
代數上與本式相同（沙盒 1,200 組 $2\times2$ 表實測逐值相符，見 §6）。

### 3.3 效果量 Cramér's V（`chiSquare.js:140–141`）

$$V=\sqrt{\frac{\chi^2}{N\cdot\min(R-1,\;C-1)}}$$

★ 用**未校正**的 $\chi^2$（與 SPSS 一致）。分級採 Cohen 四級：$<.10$ 微弱 / $<.30$ 小 / $<.50$ 中 / $\ge.50$ 大
（`src/lib/format.js` 的 `effectBandV`）。

### 3.4 標準化殘差（`chiSquare.js:129`）

$$z_{ij}=\frac{O_{ij}-E_{ij}}{\sqrt{E_{ij}}}$$

$|z|\ge 1.96$ 的格子在報表中變色。★ 這是 **Pearson 殘差**，不是 SPSS 的
「調整後標準化殘差」（後者的分母另含 $\sqrt{(1-R_i/N)(1-C_j/N)}$）——見 §6 的慣例差異表。

### 3.5 適合度檢定（`chiSquare.js:172–235`）

$$E_i=N\cdot p_i,\qquad \chi^2=\sum_i\frac{(O_i-E_i)^2}{E_i},\qquad \mathrm{df}=k-1$$

未指定 $p_i$ 時取均勻 $1/k$。★ 給定的 $p_i$ 總和偏離 1 超過 $10^{-6}$ 時**自動正規化**
（`chiSquare.js:199–204`），不報錯——這件事報表上沒有提示（見 §8 的 E41）。

## 4. 假設前提與本工具的檢核方式

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ★ **期望次數 ≥ 5 佔 ≥ 80% 的格子**（Cochran 規則） | ★ **有檢核，但實作在呈現層**：`chiSquare/Result.jsx:57–59` 用引擎回傳的 `lowExpectedCells` / `totalCells` 算通過比例 | 紅燈 ＋ 明文提示，**不擋** |
| 最小期望次數 | 引擎回傳 `minExpected`（`chiSquare.js:131`），報表以 mono 字體顯示 | 併入上一列的燈號 |
| $2\times2$ 且任一格期望 < 5 | `suggestFisher`（`chiSquare.js:143`） | 琥珀色提示改用 Fisher |
| 觀察彼此獨立 | ★ **完全不檢核**（資料結構上無從判斷） | 無提示 |
| 每格至少要有觀察值才成為一個 level | 自然成立：level 由實際出現值產生，故 $R_i\ge1$、$C_j\ge1$、$E_{ij}>0$ | — |
| ★ 一般前提檢核區（`assumptionChecker`） | ★ **零涵蓋**：`runAssumptionChecks` 對 `chi-square` 回 `null`（`assumptionChecker.js:289` 的 `default`） | 卡方的前提檢核只存在於 Result.jsx，不進統一的前提檢核區 |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. *Philosophical Magazine*, 50(302), 157–175. | §3.2 $\chi^2$ 統計量 | ★ **【原文未取得】** |
| Yates, F. (1934). Contingency tables involving small numbers and the $\chi^2$ test. *Journal of the Royal Statistical Society*, 1(2), 217–235. | §3.2 連續性校正 | ★ **【原文未取得】** |
| Cramér, H. (1946). *Mathematical Methods of Statistics*. Princeton University Press. | §3.3 Cramér's V | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **scipy** `stats.chi2_contingency`（`correction=False/True`） | ★ `chisquare_2x2` 的 $\chi^2$／$p$／Yates 基準產生方 |
| **scipy** `stats.contingency.association(method='cramer')` | ★ `cramerV` 的基準產生方（2026-07-30 / R56 改用，此前為本專案手算） |
| Cochran, W. G. (1954). Some methods for strengthening the common $\chi^2$ tests. *Biometrics*, 10(4), 417–451. | §4 期望次數 ≥ 5 的 80% 規則 | 
| SPSS Statistics 的 Crosstabs 程序 | §6 慣例差異的對照對象——★ **未實際對照過**（見 §6） |

## 6. 對照與驗證狀態

**基準組**

| 組 | 欄位 | 內容 |
|---|---|---|
| `chisquare_2x2` | 6 | `datasets.json:main` 的 `catR × catC`（$2\times2$）：`chi2`、`p`、`df`、`chi2Yates`、`pYates`、`cramerV` |

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **scipy `chi2_contingency` 逐值**：6 欄，最大相對差 **4.9e−13**（`p`／`pYates` 的尾機率；$\chi^2$ 與 $V$ 為 3.6e−16 級） |
| 2 | ★ **`cramerV` 的來源升級（R56）**：原為 `generate_reference.py` 手算 $\sqrt{\chi^2/(N\cdot\mathrm{df}_{\min})}$，與 JS 實作出自同一次理解（正是 §0 品質規範要防的那一類）。改由 scipy `contingency.association` 產生；沙盒對 300 組隨機 $r\times c$ 表比對兩者最大相對差 **1.9e−16**，重生後 `reference.json` 數值**零變動** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3 的公式文字自行以 numpy 重算，尾機率改走 **mpmath 的高精度正規化不完全 gamma**（完全不碰 scipy 的任何卡方入口）。掃描 **1,350 張表**——$2\times2$ 隨機取樣 1,200 張（每格 0–8，含 0 格、含期望次數 < 1）＋ $2\times3$／$3\times3$／$2\times4$／$3\times4$／$4\times5$ 共 150 張——**最大相對差 4.9e−13、零個 .05 判定翻面** |
| 4 | ★ **參數空間的方向性檢查**（A5a 習慣 7）：本組唯一的基準是一張 $N=60$、最小期望次數充足的 $2\times2$ 表。已對「期望次數大小」與「表的維度」兩個方向掃描：1,146 張低期望次數 $2\times2$ 表**全部**正確觸發 `suggestFisher`；139 張低期望次數 $r\times c$ 表**全部**正確回報 `lowExpectedCells > 0`；Yates 在非 $2\times2$ 表上**零次誤施加** |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| Yates 施加範圍 | 只 $2\times2$，**兩個值都報** | SPSS 在 $2\times2$ 另列一行 Continuity Correction；R `chisq.test` **預設 `correct=TRUE`**（$2\times2$ 直接取代主值） | ★ 與 R 直接比對數字時，要確認對方用的是校正前或校正後 |
| 標準化殘差 | **Pearson 殘差** $(O-E)/\sqrt E$ | SPSS 另提供 **Adjusted Standardized Residual**（分母多乘 $\sqrt{(1-R_i/N)(1-C_j/N)}$） | ★ 本工具的 $|z|\ge1.96$ 判定會比 SPSS 的調整後殘差**保守**（絕對值較小） |
| Cramér's V | 用未校正 $\chi^2$ | SPSS 同 | 無 |
| 偏誤校正的 V | **不報** | 部分文獻建議 bias-corrected V（Bergsma 2013） | 小樣本時本工具的 V 略微高估 |
| 適合度的比例正規化 | 總和偏離 1 時**靜默正規化** | R `chisq.test` 直接報錯 | ★ 使用者打錯比例時不會被擋（E41） |
| McNemar（配對表） | **未實作** | SPSS／R 都有 | 配對設計只能改用別的工具 |

### ★ 尚未驗證的部分

1. ★ **三篇方法原文全部未取得**（Pearson 1900、Yates 1934、Cramér 1946）⇒ §3 的公式只對到 scipy 的行為，不是對到原文的式號
2. ★ **從未與 SPSS 或 R 實際對照過**。§6 慣例差異表中關於 SPSS 調整後殘差與 R `correct=TRUE` 預設的敘述，來源是**套件文件與二手說明，非本專案實跑**⇒ 標為待核。成本極低（Kevin 本機一行 R），建議補
3. ★ **適合度檢定（`chiSquareGoodnessOfFit`）零基準**。引擎有實作、UI 有入口，但 `reference.json` 沒有任何一組對應，`compare.test.js` 一欄都沒對。scipy `chisquare` 可直接產生 ⇒ 建議在 A6 補（已記為 E42）
4. ★ **`probs` 是孤兒欄位**：適合度檢定回傳使用者給定（或正規化後）的理論比例，`src/` 內零讀取者 ⇒ 使用者看不到自己的比例被正規化成什麼
5. **調整後標準化殘差、bias-corrected V、McNemar、線性趨勢檢定**皆未實作 ⇒ 無基準
6. **$r\times c$ 表的 Yates 以外的小樣本替代**（Fisher-Freeman-Halton 精確檢定）未實作；$r\times c$ 低期望次數時只有紅燈，沒有可改用的方法

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 觀察次數表 | — | `chiSquare.js:71–81`、`chiSquare/Result.jsx:101`（`MatrixTable`） |
| 期望次數表 | §3.2 $E_{ij}$ | `chiSquare.js:84–91`、`Result.jsx:101` |
| $\chi^2$、df | §3.2 | `chiSquare.js:122`、`109`；`Result.jsx:127` |
| $p$ ＋顯著標記 | §3.2 | `chiSquare.js:137`、`Result.jsx:127` |
| $\chi^2_{\text{Yates}}$、$p_{\text{Yates}}$ | §3.2 | `chiSquare.js:126`、`138`；`Result.jsx:184`（`yatesApplied` 控制是否顯示） |
| Cramér's V ＋分級 | §3.3 | `chiSquare.js:141`、`Result.jsx:41`（`effectBandV`） |
| 標準化殘差表（含變色） | §3.4 | `chiSquare.js:129`、`Result.jsx:164`、`Result.jsx:49`（`residColor`） |
| 前提檢核燈號「期望次數 ≥ 5 的格數」 | §4 Cochran 規則 | ★ `Result.jsx:57–59`（**判定邏輯在此，不在引擎**） |
| 最小期望次數 | §4 | `chiSquare.js:131`、`Result.jsx:81` |
| 「建議改用 Fisher」提示 | §4 | `chiSquare.js:143`、`Result.jsx:89` |
| APA 句 | §3.2、§3.3 | `chiSquare/Narrative.jsx`（`yatesApplied` 決定是否附加 Yates 那一句，`Narrative.jsx:17–23`；Cramér's V 的分級在 `Narrative.jsx:30`） |

**孤兒欄位檢查**（2026-07-30 實跑，對 `src/` 排除 `src/lib/stats/` 做單字邊界比對）：
`chiSquareIndependence` 回傳的 16 欄**零孤兒**；`chiSquareGoodnessOfFit` 的 **`probs` 為孤兒**（見 §6 第 4 點）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 1,350 張表最大相對差 4.9e−13。**無公式錯誤** |
| 2 | authority | ★ **不足**：三篇原文皆未取得，§3 只對到 scipy 的行為 |
| 3 | 文獻真實性 | Yates (1934) *JRSS* 1(2) 與 Cochran (1954) *Biometrics* 10(4) 卷期頁碼可查；Pearson (1900)／Cramér (1946) 據實標【原文未取得】 |
| 4 | 報表可追溯 | 獨立性檢定 16 欄零孤兒；★ 適合度的 `probs` 為孤兒 |
| 5 | 假設前提 | Cochran 80% 規則有檢核但**實作在呈現層**（`Result.jsx:57–59`）而非引擎；`assumptionChecker` 對本方法**零涵蓋** |
| 6 | 慣例分歧 | 六項書面化（Yates 範圍、殘差型別、V 的校正、比例正規化、McNemar 缺、$r\times c$ 精確法缺） |
| 7 | 邊界條件 | ★ 掃描過「期望次數大小 × 表維度」兩個參數方向：含 0 格、期望次數 < 1、$4\times5$ 表皆正確；Yates 零次誤施加 |
| 8 | APA 敘述句 | `yatesApplied` 為真時引校正值、否則引未校正值，邏輯正確且句中標明用了哪一個 |

### 本批本組的處置

| # | 級 | 內容 | 處置 |
|---|---|---|---|
| R56（本組部分） | L3 | `cramerV` 的基準是本專案手算，與 JS 同源 | ✅ Kevin 2026-07-30 核定：改由 `scipy.stats.contingency.association` 產生。重生後數值零變動，provenance 的 `authority` 同步更新 |
| R54b | L2 | `cramerInterpretKey`（Cramér's V 的四級分帶）在 `Result.jsx` 與 `Narrative.jsx` **各實作一次** | ✅ 當場修：收斂為 `src/lib/format.js` 的 `effectBandV`，兩處改為 import |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E41 | ★ **適合度檢定的理論比例會被靜默正規化**（`chiSquare.js:199–204`）：總和偏離 1 超過 1e−6 時自動除以總和，報表無提示，且 `probs` 是孤兒欄位 ⇒ 使用者打錯比例不會被擋，也看不到工具改成了什麼 |
| E42 | ★ **適合度檢定零基準**：引擎與 UI 都在線，`reference.json` 無對應組。scipy `chisquare` 可直接產生，建議 A6 補 |
| E43 | ★★ **升級（2026-07-30 R 抽驗實測）：兩種殘差在內建示範資料上就已給出不同的判定。** 本工具用 Pearson 殘差 $(O-E)/\sqrt E$，R 的 `chisq.test$stdres` 是調整後標準化殘差（＝SPSS 的 Adjusted Standardized Residual）。同一張 `catR × catC` 表：<br>　• Pearson：$+2.2188 / -2.2188 / -1.9403 / +1.9403$<br>　• 調整後：$+4.1684 / -4.1684 / -4.1684 / +4.1684$<br>★ **「No × High」那一格：Pearson 的 $\|z\|=1.940 < 1.96$ 不標色，調整後的 $4.168 > 1.96$ 要標色** ⇒ 這不再是「理論上不同」，而是**工具附的示範資料就已經不同**。報表仍未說明用的是哪一種殘差 |
| E44 | **$r\times c$ 表期望次數不足時只有紅燈、無替代方法**（Fisher-Freeman-Halton 未實作），使用者被告知有問題但無路可走 |
