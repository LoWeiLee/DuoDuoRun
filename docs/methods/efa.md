# 探索性因素分析（Exploratory Factor Analysis, EFA）

> 方法代號 `efa`｜基準組 `reference.json → efa_pca_varimax`（8）＋`efa_pca_none`（3）＋`efa_pca_varimax_k3`（2）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A4）

---

## 1. 這個方法在回答什麼問題

手上有一批題目，彼此有相關。EFA 問：**這些相關能不能用少數幾個看不見的維度解釋？如果可以，是幾個、哪幾題屬於哪一個？**

它與 CFA 的差別在方向：CFA 是你先講結構、資料回答對不對；EFA 是**讓資料自己講**。
量表開發的早期、或借用量表到新的文化脈絡時，通常先做 EFA 再做 CFA（且應該用**不同批**樣本）。

★ **本工具的萃取法只有主成分（principal component）**，不是共同因素模型（principal axis／ML）。
兩者在文獻上是有爭議的分歧：主成分把**全部**變異都拿去解釋（共同性起始值為 1），
共同因素模型只解釋**共同**變異。⇒ 本工具的「因子」嚴格說是**主成分**，
負荷量通常略高於共同因素模型的解。這一點在報表上**沒有說明**（見第 6 節）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 量表開發初期，想看題目怎麼聚成群
- 借用量表到新脈絡，先確認結構是否仍成立
- 題目太多想降維，且可接受主成分的解釋方式

**不該用**

- ★ **要驗證既有結構時**——那該做 CFA（`cfa.md`）
- ★ **需要斜交轉軸（promax／oblimin）時**：本工具**只有 varimax 與不轉軸**。心理與社會科學的構念多半相關，強迫正交會扭曲結構
- ★ **需要共同因素模型（principal axis／ML 萃取）時**：本工具**沒有**
- **樣本很小**。守衛只有 $n\ge p+5$（`efa.js:238`），遠低於實務建議（常見門檻為 $n\ge200$ 或每題 10 人）
- **題目為二分或極端偏態**：Pearson 相關會低估關聯，應改用多分相關矩陣——本工具**不支援**

**常見誤用**

1. ★ **完全依賴 Kaiser（特徵值 > 1）決定因子數。** Kaiser 規則已知會**高估**因子數。本工具預設用它，且**不提供**平行分析（parallel analysis）；碎石圖有畫，但沒有其他輔助判準
2. ★ **把主成分的結果稱為「因素分析」而不加說明。** 見 §1
3. **KMO 通過就以為資料適合。** KMO 與 Bartlett 是**必要不充分**條件
4. **在同一批樣本上先 EFA 再 CFA。** 這是把同一份資料用兩次，適配必然樂觀
5. **忽略共同性偏低的題目。** $h^2<.30$ 的題目其實沒被任何因子解釋到

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $n,\ p,\ k$ | 有效樣本數、變項數、採用的因子數 |
| $\mathbf R$ | Pearson 相關矩陣（listwise） |
| $\lambda_1\ge\dots\ge\lambda_p$ | $\mathbf R$ 的特徵值（遞減） |
| $\mathbf A$ | $p\times k$ 未轉軸負荷矩陣 |
| $h^2_i$ | 第 $i$ 題的共同性 |

### 3.2 相關矩陣與 listwise

$\mathbf R$ 由 Pearson 相關算得，**listwise 刪除**：任一變項缺值即剔除整列（`efa.js:230–236`）。

★ **R40-e 修正（2026-07-29）**：程式碼頂端的區塊註解原寫「pair-wise listwise」——
兩個互斥的詞湊在一起，而實作從來就是純 listwise。已更正（`efa.js:12–13`）。

★ **R40-h 修正（2026-07-29，L3，Kevin 核定）**：零變異欄現在**硬擋**。
修復前不擋也不警告：`pearsonCorr` 對常數欄回 NaN，下游把 NaN 換成 0，
於是該欄在 $\mathbf R$ 裡成為與所有變項零相關的**孤島**，後果有三：

- Bartlett 的 df 仍照全部 $p$ 計 ⇒ df 虛胖（7 題實測 21，實際應為 15）、$p$ 系統性偏小
- KMO 的 `perVar` 出現 `null`，`overall` 仍照算
- 該欄的 $h^2$ 通常為 0（死列），但當 $k$ 涵蓋到它自己的 $\lambda=1$ 特徵向量時，
  它會拿到 **loading 1.000 / $h^2$ 1.000**——看起來是全套最好的題目（3 欄 $k=2$ 實測）

四支多變量方法裡 LDA（`singularPooled`）、CFA（`sample-cov-not-pd`）、NCA（`no-variation`）都硬擋，
修復前只有 EFA 放行。現改回 `zero-variance-vars` 並**指名是哪幾個變項**（`efa.js:240–254`，比照 A1 的 R7）。

### 3.3 適合度：Bartlett 球形檢定與 KMO

$$\chi^2=-\Bigl[(n-1)-\frac{2p+5}{6}\Bigr]\ln|\mathbf R|,\qquad \mathrm{df}=\frac{p(p-1)}{2}$$

（`efa.js:159–180`）。$|\mathbf R|$ 由特徵值連乘得到（`efa.js:155–157`）。

★ **R40-i 修正（2026-07-29，L3，Kevin 核定）**：$|\mathbf R|=0$（完全共線）時 $\chi^2$ 發散。
修復前回 `{ chi2: Infinity, p: 0 }`，而 UI 的 `fmtNum(Infinity)` 印「—」、`fmtP(0)` 印「< .001」
⇒ **完全共線的資料會亮綠燈「球形檢定顯著，適合做因素分析」**。
現改回 `{ chi2: NaN, p: NaN, singular: true }`，由 UI 顯性說明（`efa.js:159–169`）。

**KMO**（$p\ge3$ 才有定義，`efa.js:182–213`）：以反映像（anti-image）相關

$$a_{ij}=\frac{-\;(\mathbf R^{-1})_{ij}}{\sqrt{(\mathbf R^{-1})_{ii}(\mathbf R^{-1})_{jj}}},\qquad
\mathrm{KMO}=\frac{\sum_{i\ne j}r_{ij}^2}{\sum_{i\ne j}r_{ij}^2+\sum_{i\ne j}a_{ij}^2}$$

逐變項版（MSA）把加總限制在該變項所在的列。與 SPSS 的 anti-image correlation matrix 對角線同定義。

★ **R40-i 的第二半**：KMO 不可得時原本回 `null`，而 UI 兩處都寫 `result.kmo && (...)`
⇒ **整張卡片與統計量卡直接消失、沒有任何說明**。現改回
`{ unavailable: 'too-few-vars' | 'singular' }`，UI 顯示「—」並印出原因。

判讀（Kaiser 的六級，`efa.js:173–181` 的註解與 i18n `kmoInterp`）：
$\ge.90$ 極佳、$\ge.80$ 優良、$\ge.70$ 中等、$\ge.60$ 尚可、$\ge.50$ 極差、$<.50$ 不可接受。

### 3.4 萃取、因子數與轉軸

**萃取（主成分）**：對 $\mathbf R$ 做 Jacobi 對稱特徵分解（`efa.js:48–102`），

$$\mathbf A=\mathbf V\operatorname{diag}\bigl(\sqrt{\max(\lambda_j,0)}\bigr)$$

（`efa.js:296–305`；負特徵值 clamp 到 0）。

**因子數**：使用者指定優先；否則 **Kaiser 規則** $\lambda_j>1$，並保證至少 1 個、至多 $p$ 個
（`efa.js:286–294`）。

**Varimax 轉軸**（`efa.js:106–152`）：最大化各因子負荷平方的變異，
★ **含 Kaiser normalization**——轉軸前把每列除以 $\sqrt{h^2_i}$、轉軸後乘回。
⇒ 這是與 `factor_analyzer` 一致的預設，也是 SPSS 的預設。
本文件的獨立重寫**第一次漏了這一步就差 3.1e−2**，補上後降到 5e−9（見第 6 節第 4 道）——
可見這一步不是細節。

★ **R40-d 修正（2026-07-29）**：$k<2$ 時不轉軸（單一因子沒有可轉軸的平面，`efa.js:309`）。
修復前**完全靜默**——標題的「（Varimax 轉軸後）」跟著消失，使用者不會知道是自己的設定造成的。
現由 `compute.js` 回傳 `rotationSkipped` 並在表上說明。

**共同性**：$h^2_i=\sum_{j=1}^{k}a_{ij}^2$，基於**採用的 $k$ 個因子、轉軸後**的負荷（`efa.js:313–317`）。
正交轉軸不改變 $h^2$，故轉軸前後同值。

## 4. 假設前提與本工具的檢核方式

★ **EFA 不在 `assumptionChecker` 的涵蓋範圍內**（`assumptionChecker.js:283–289`）。
本方法的適合度檢核是方法**內建**的（KMO 與 Bartlett），這與其他三支不同：

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 變項間有足夠相關 | ✅ **Bartlett 球形檢定**（`efa.js:159–180`） | 不顯著時統計卡印紅字；**不擋** |
| 取樣適切 | ✅ **KMO ＋ 逐變項 MSA**（`efa.js:182–213`） | KMO 卡片顯示分級；★ MSA 表自 2026-07-29 起才有（R40-b） |
| ★ 不完全共線 | ✅ **`singular` 旗標＋警告框**（R40-i） | 顯性警告，說明 $\chi^2$ 發散、KMO 不可得、因子解不唯一 |
| ★ 無零變異欄 | ✅ **硬擋**（R40-h） | 回 `zero-variance-vars` 並指名變項 |
| $p\ge2$、$n\ge p+5$ | ✅ `efa.js:220`、`238` | 回 `need->=2-vars`／`need-more-data` |

**沒有檢核、但方法確實要求的**：

1. ★ **樣本量足夠**。$n\ge p+5$ 就放行；6 題時 $n=11$ 即可跑
2. ★ **變項為連續或至少序位、關係為線性**。二分題與極端偏態會讓 Pearson 相關低估，無警告
3. **無離群值**
4. ★ **因子數的判準只有 Kaiser**：沒有平行分析、沒有 MAP、沒有可解釋性提示

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. *Psychometrika*, 23(3), 187–200. | §3.4 varimax 準則與 Kaiser normalization | ★ **【原文未取得】** |
| Kaiser, H. F. (1960). The application of electronic computers to factor analysis. *Educational and Psychological Measurement*, 20(1), 141–151. | §3.4 特徵值 > 1 規則 | ★ **【原文未取得】** |
| Bartlett, M. S. (1951). The effect of standardization on a chi-square approximation in factor analysis. *Biometrika*, 38(3/4), 337–344. | §3.3 球形檢定的 $\chi^2$ 近似與 $-[(n-1)-(2p+5)/6]$ 修正項 | ★ **【原文未取得】** |
| Kaiser, H. F. (1974). An index of factorial simplicity. *Psychometrika*, 39(1), 31–36. | §3.3 KMO 與 MSA、六級判讀 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **factor_analyzer**（`FactorAnalyzer(method='principal')`） | ★ 三組基準的產生方；varimax 的 Kaiser normalization 慣例即以它為準（`rotation_kwargs={'tol': 1e-12}`） |
| R `psych` 的 `fa()`／`KMO()` | ★ **未使用**：從未對照過（見第 6 節） |

## 6. 對照與驗證狀態

**基準組（三組）**

| 組 | 欄位 | 設定 |
|---|---|---|
| `efa_pca_varimax` | 8（`bartlettChi2`／`bartlettP`／`kmo`／`eig1`–`eig3`／`absLoadingsSorted`／`communalities`） | $k=2$、varimax |
| `efa_pca_none` | 3（`loadings`／`communalities`／`eigAll`） | $k=2$、不轉軸 |
| `efa_pca_varimax_k3` | 2（`loadings`／`communalities`） | $k=3$、varimax |

全部以 `datasets.json:main` 的 6 個題目（i1–i6，$N=60$）產生。

**tier / status**：tier **A** / **verified**（三組皆是）

| 道 | 內容 |
|---|---|
| 1 | **factor_analyzer 逐值**：`compare.test.js` 對三組共 13 個量比對（容差 1e−6） |
| 2 | ★ **負荷矩陣的正規化**：`_canon_cols`（`generate_reference.py:2535`）以「每欄絕對值最大元素為正、欄序依平方和遞減」正規化後才比對——因為特徵向量的符號與欄序都是任意的 |
| 3 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.3–3.4 的文字規格以 numpy 重寫（`numpy.linalg.eigh` ＋自寫 varimax），13 個量最大絕對差 **4.998e−9**（殘差來自 fixture 的 communalities 存為 8 位小數）。★ **同時再跑一次 factor_analyzer** 確認 fixture 可重現（差 5.0e−9） |
| 4 | ★ **重寫過程本身的發現**：第一次重寫**漏掉 Kaiser normalization**，`efa_pca_varimax_k3` 的負荷立刻差 **3.136e−2**、`absLoadingsSorted` 差 4.7e−3。補上後降到 5e−9。⇒ §3.4 的規格文字**確實寫了**這一步（`efa.js:8–21` 的區塊註解亦有），是重寫者漏讀——**這是規格充分性的正面證據**，同時也說明這一步的量級不容忽略 |

**已知與 SPSS／R `psych` 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 萃取法 | **只有主成分** | SPSS 預設亦為主成分；R `psych::fa` 預設 minres | 主成分的負荷通常略高；★ **報表未說明本工具用的是主成分** |
| 轉軸 | **只有 varimax／不轉軸** | SPSS 另有 promax、oblimin 等 | 構念相關時正交轉軸會扭曲結構 |
| Kaiser normalization | **有** | SPSS 預設有；`factor_analyzer` 預設有 | 一致 |
| varimax 收斂 | `maxIter = 100`、`tol = 1e-7`（`efa.js:106`） | 基準以 `tol = 1e-12` 產生 | 差異在 1e−6 容差內，逐值比對通過 |
| 因子數 | **只有 Kaiser 或使用者指定** | SPSS 另有「特徵值 > 指定值」「固定數」；R `psych` 有平行分析 | 已知 Kaiser 會高估 |
| $|\mathbf R|=0$ | ★ 標記 `singular`、$\chi^2$／$p$ 為 NaN | SPSS 報錯或給極端值 | 修復前本工具會**亮綠燈**（R40-i） |

### ★ 尚未驗證的部分

1. ★ ★ **四篇方法原文全部未取得**。Bartlett 的 $-[(n-1)-(2p+5)/6]$ 修正項、KMO 的定義、
   varimax 準則都只對到 `factor_analyzer` 的**輸出**，沒有對到原文方程式編號
2. ✅ **已於 2026-07-30 在 Kevin 本機與 R `psych` 對照**（R 4.6.0，`scripts/validation/05_a5b_r_audit.R` §2）。
   ★ **仍未與 SPSS 對照過**——SPSS 是使用者最可能拿來比的報表，這一項留著
3. ✅ **逐變項 MSA 已補上第三方對照，且逐位元相同**：`psych::KMO()$MSAi` 給
   0.699319／0.748324／0.757158／0.792030／0.749689／0.639829，**與本工具六位小數全對**；
   總體 MSA 0.73006 亦相符 ⇒ 從「零基準」結案
4. ✅ **$|\mathbf R|$ 已補上第三方對照**：R `det(cor(items))` = **0.2160639142**，
   與本工具的 0.21606391423793433 相符 ⇒ 從「零基準」結案。
   Bartlett（$\chi^2=86.0575$、df 15、$p=5.3615\times10^{-12}$）與六個特徵值亦逐位相符
5. ★ **`psych::principal` 的 varimax 負荷有 $10^{-3}$ 量級差異**（例：i6 第一欄
   本工具 $-0.002473$ vs psych $-0.000720$），**共同性則六位小數全對**。
   ⇒ 差異來自轉軸收斂容差，非公式；但這一項**未入庫為基準**，`compare.test.js` 仍不鎖轉軸負荷的逐值
5. ★ **`singular` 與 `zero-variance-vars` 兩條新路徑沒有 fixture**：只有 `a4.behavior.test.js` 的行為鎖，
   沒有第三方對照（本質上也無從對照——第三方在這些情形多半直接報錯）
6. **`rotationSkipped` 無第三方對照**（`factor_analyzer` 在 $k=1$ 時的行為未查）
7. **碎石圖（`ScreePlot.jsx`）無任何測試或基準**
8. **`eigAll` 只在 `efa_pca_none` 被鎖前 6 個**；$p>6$ 的情形未覆蓋

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 統計卡「KMO」 | §3.3 | `efa.js:212`、`Result.jsx:261–267` |
| 統計卡「Bartlett p」 | §3.3 | `efa.js:177`、`Result.jsx:268–272` |
| 適合度區「KMO」卡＋分級 | §3.3 | `efa.js:212`、`Result.jsx:57–70`、i18n `kmoInterp` |
| ★ KMO 不可得時的原因 | §3.3 | `efa.js:186`＋`189`、`Result.jsx:66–68`、i18n `kmoUnavailable`（R40-i） |
| 適合度區「Bartlett」卡（χ²／df／p／判定） | §3.3 | `efa.js:170–179`、`Result.jsx:71–90` |
| ★ 完全共線警告框 | §3.3 | `efa.js:162`、`Result.jsx:58–62`、i18n `singularWarn`（R40-i） |
| ★ $\|\mathbf R\|$ 顯示 | §3.3 | `efa.js:322`、`Result.jsx:86–89`、i18n `detR`（R40-c） |
| ★ 逐變項 MSA 表 | §3.3 | `efa.js:208–210`、`Result.jsx:95–132`、i18n `msaTitle`／`msaHint`（R40-b） |
| 特徵值／解釋變異／累積 表 | §3.4 | `efa.js:325–326`、`Result.jsx:134–170` |
| ★ 採用因子數說明（i18n 化） | §3.4 | `Result.jsx:165–167`、i18n `keptHint`（R40-a） |
| 負荷量表＋色階 | §3.4 | `efa.js:328–330`、`Result.jsx:172–216` |
| ★「（Varimax 轉軸後）」標記（i18n 化） | §3.4 | `Result.jsx:181–184`、i18n `rotatedTag`（R40-a） |
| ★ 轉軸被略過的說明 | §3.4 | `compute.js:22`、`Result.jsx:186–189`、i18n `rotationSkipped`（R40-d） |
| ★ 負荷量色階說明（i18n 化） | §3.4 | `Result.jsx:214`、i18n `loadingColorHint`（R40-a） |
| 共同性 $h^2$ | §3.4 | `efa.js:313–317` |
| 碎石圖 | §3.4 | `ScreePlot.jsx` |
| ★ 零變異的錯誤訊息（指名變項） | §3.2 | `efa.js:240–254`、`compute.js:16–17`、`Result.jsx:249–252`、`Narrative.jsx:54–57`（R40-h） |
| APA 敘述句 | §3.3、§3.4 | `Narrative.jsx:19–46` |

**孤兒欄位檢查**（2026-07-29 實跑）：EFA 引擎回傳的 **21 個欄位零孤兒**。
修復前有兩項，均於本批補上：`kmo.perVar`（R40-b）與 `determinant`（R40-c）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A4

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫最大差 5.0e−9）；★ 過程中反證了 §3.4 規格的充分性（見 §6 第 4 道） |
| 2 | authority | ★ **不足**：四篇原文未取得，公式只對到 `factor_analyzer` 的輸出 |
| 3 | 文獻真實性 | Kaiser (1958, 1960, 1974)、Bartlett (1951) 卷期頁碼可查、真實存在；★ 皆標【原文未取得】 |
| 4 | 報表可追溯／孤兒欄位 | ★ **R40-b／R40-c 已修**，現 21 欄零孤兒 |
| 5 | 假設前提 | ★ **R40-h／R40-i 已修**（零變異、完全共線）；樣本量下限過寬、線性不檢核仍列於 §4 |
| 6 | 慣例分歧 | ★ **六項全部書面化**；其中「本工具用的是主成分而非共同因素模型」**報表仍未說明**，記入 §6 |
| 7 | 邊界條件 | ★ **R40-d 已修**（$k<2$ 不轉軸）；MSA、$\|\mathbf R\|$、新路徑仍無第三方基準，記入 §6 第 3–6 項 |
| 8 | APA 敘述句 | ★ **R40-a 已修**（`suitWordPoor` 原為硬編中文，英文敘述句會混入中文） |

### R40-a（L2，前批次交付）四處硬編中文，完全不經 i18n

**發現**　`Result.jsx` 三處（採用因子數說明、「（Varimax 轉軸後）」標記、負荷量色階說明）
與 `Narrative.jsx` 一處（`suitWord` 的 `'不佳'`）**直接把中文字串寫在 JSX 裡**。
⇒ 切到英文介面時，這四處仍顯示中文；其中 `suitWord` 那一處會讓**英文 APA 敘述句裡混入中文**。

**處置**　✅ 已修：四處全部改走 i18n（`keptHint`／`rotatedTag`／`loadingColorHint`／`suitWordPoor`），中英各一。

### R40-b（L2，前批次交付）逐變項 MSA 是孤兒欄位

**發現**　`kmo.perVar` 算了、回傳了，零 UI 消費者。而 MSA 正是 SPSS 用來決定「**該刪哪一題**」的
標準診斷欄——使用者看得到整體 KMO 不佳，卻沒有任何線索知道問題出在哪一題。

**處置**　✅ 已修：新增 MSA 表（`Result.jsx:95–132`），$<0.5$ 標紅並附「優先考慮移除」的說明。
★ 但見 §6 第 3 項——**這張表的逐格數字沒有任何第三方對照**。

### R40-c（L2，前批次交付）$|\mathbf R|$ 是孤兒欄位

**處置**　✅ 已修：Bartlett 卡片下方顯示 $|\mathbf R|$（`Result.jsx:86–89`），
附「趨近 0 代表近乎完全共線」的說明。$|\mathbf R|\to0$ 是多元共線的標準警訊。

### R40-d（L2，前批次交付）選了 varimax 但 $k<2$ 時完全靜默

**處置**　✅ 已修：`compute.js:22` 回傳 `rotationSkipped`，負荷量表上方說明「單一因子沒有可轉軸的平面」。
★ 行為測試另鎖「使用者本來就選不轉軸時 `rotationSkipped` 必須為 `false`」——防止修過頭。

### R40-e（L1，前批次交付）區塊註解誤寫「pair-wise listwise」

**處置**　✅ 已修（`efa.js:12–13`）。純註解、零行為變動。同 A3c 的 R34-a 類型。

### R40-h（L3，Kevin 核定）零變異欄靜默放行

**發現與實測**　見 §3.2。三個後果都經沙盒實跑確認，其中「零變異欄拿到 loading 1.000 / $h^2$ 1.000」
最危險——它在報表上**看起來是全套最好的題目**。

**處置（Kevin 2026-07-29 核定）**　硬擋，回 `zero-variance-vars` 並**指名變項**（比照 A1 的 R7）。
`efa.js:240–254`、`compute.js:16–17`、UI 兩處＋i18n 中英各一；＋4 條行為測試（含「正常資料不得被誤擋」的回歸鎖）。

### R40-i（L3，Kevin 核定）完全共線時亮綠燈、KMO 卡片靜默消失

**發現與實測**　見 §3.3。修復前完全共線的資料（實測：複製一欄）會得到
「Bartlett $p<.001$、球形檢定顯著、適合做因素分析」的綠燈，而 KMO 卡片**整張消失**、沒有任何說明。

**處置（Kevin 2026-07-29 核定）**　
`bartlettSphericity` 回 `{ chi2: NaN, p: NaN, singular: true }`；
`kmo` 回 `{ unavailable: 'too-few-vars' | 'singular' }` 而非 `null`；
UI 三處據此顯示警告框、KMO 卡片的「—」與原因、Bartlett 的「無法判定」。
＋3 條行為測試（含「正常資料的 `unavailable` 必須為 `null`」的回歸鎖）。
★ **既有 fixture 的數值零變動**（`compare.test.js` 全綠）。

### 本批本組未開出 L4
