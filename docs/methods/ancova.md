# 共變數分析（ANCOVA）

> 方法代號 `ancova`｜基準組 `reference.json → ancova`（5 個統計量）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）

---

## 1. 這個方法在回答什麼問題

ANCOVA 問的是：**把某個已知會影響依變項的連續變項先扣掉之後，各組之間還有差異嗎？**

最典型的用法是準實驗設計：實驗組與對照組的**前測**分數本來就不一樣，
直接比後測會分不清「進步」與「起點不同」。把前測當共變項納入，
比的就是「在前測相同的假設下，各組的後測差多少」——也就是**調整後平均**。

第二種用法是提高檢定力：即使各組在共變項上沒有系統差異，
把共變項解釋掉的變異從誤差裡拿走，誤差變小、$F$ 變大。

★ **ANCOVA 不能把非隨機分派變成隨機分派。** 「控制了前測」不等於「兩組其他方面都一樣」。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 隨機實驗中，用前測或基線變項提高檢定力
- 共變項與依變項相關、且**與分組無關**（或分組是隨機的）

**不該用**

- ★ **共變項本身受處理影響時**。把「中介變項」當共變項扣掉，會把真正的效果一起扣掉
- ★ **斜率不同質時**（共變項的效果隨組別而異）。此時「調整後平均」沒有唯一定義。本工具**跑斜率同質性檢定並顯示，但不擋**
- **非隨機分派又想宣稱因果**：見 §1 的警告

**常見誤用**

1. ★ **在觀察研究中用 ANCOVA「控制」混淆變項，然後下因果結論**——這是社會科學最常見的過度宣稱
2. **調整後平均與原始平均差很多卻不解釋為什麼**
3. **忽略斜率同質性檢定的結果**
4. **共變項測量誤差大**：測不準的共變項扣不乾淨，殘餘混淆仍在（工具完全不提醒）

## 3. 公式與定義

### 3.1 模型與 Type III 調整 SS

以 $0/1$ dummy（**參照組 = 第一個層級**）建設計矩陣（`ancova.js:130–146`）：

$$Y=\beta_0+\sum_{j=2}^{k}\beta_j D_j+\sum_{m=1}^{p}\gamma_m C_m+\varepsilon$$

各效果的 SS 以**模型比較**求得（`ancova.js:147–160`）：

$$\mathrm{SS}_{\text{factor}}=\mathrm{SS}_{\text{res}}(Y\sim C)-\mathrm{SS}_{\text{res}}(Y\sim D+C)$$
$$\mathrm{SS}_{C_m}=\mathrm{SS}_{\text{res}}\bigl(Y\sim D+C_{-m}\bigr)-\mathrm{SS}_{\text{res}}(Y\sim D+C)$$

$\mathrm{df}_{\text{error}}=N-k-p$（`ancova.js:154`）。

★ **與 `anova-twoway.md` §3.2 的差別**：那裡用效果編碼（$-1/0/1$），這裡用 dummy（$0/1$）。
兩者在**這個模型沒有交互作用項**的前提下給出相同的調整 SS；
但若日後加入因子 × 共變項的交互作用，編碼方式就會影響 Type III 的結果。**目前無交互項，故等價**。

### 3.2 調整後平均（least-squares means）

把所有共變項代入其**總平均**，再逐層級用完整迴歸方程式預測（`ancova.js` 的 `adjustedMeans`）：

$$\hat\mu_j=\hat\beta_0+\hat\beta_j+\sum_m\hat\gamma_m\bar C_m$$

SE 由 $\sqrt{\mathbf c^\top(\mathbf X^\top\mathbf X)^{-1}\mathbf c\cdot \mathrm{MSE}}$ 得到。

★ **「代入總平均」是本工具的口徑**，也是 SPSS EMMEANS 的預設。
另一種作法是代入各組自己的共變項平均（那等於不調整）。

### 3.3 斜率同質性檢定

比較「含因子 × 共變項交互作用」與「不含」兩個模型：

$$F=\frac{\bigl(\mathrm{SS}_{\text{res}}^{\text{reduced}}-\mathrm{SS}_{\text{res}}^{\text{full}}\bigr)/\mathrm{df}_{\text{num}}}{\mathrm{MSE}^{\text{full}}}$$

回傳於 `homogeneityTest`。★ **顯著代表斜率不同質 ⇒ ANCOVA 的前提被違反**，
但工具**只顯示、不擋、也不提供替代方法**（如 Johnson-Neyman）。

## 4. 假設前提與本工具的檢核方式

★ ANCOVA **不在 `assumptionChecker.js` 的 case 清單內**。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ★ 斜率同質 | ✅ **`homogeneityTest`**（§3.3） | 顯示 $F$／$p$；★ 不擋、無替代方法 |
| 至少 2 組、$N\ge4$、$\mathrm{df}_{\text{error}}>0$ | ✅ `ancova.js:114`／`123`／`155` | 回錯誤碼 |
| 共變項不得等於依變項或因子 | ✅ `ancova.js:89–90` | 回 `covIsY`／`covIsFactor` |
| 無缺失值 | ✅ listwise（跨 DV／因子／全部共變項） | — |

**沒有檢核、但方法確實要求的**：

1. ★ **常態與變異數同質**：兩者都**完全不檢核**（單因子 ANOVA 有、雙因子 2026-07-29 已補、ANCOVA 仍空）
2. ★ **共變項不受處理影響**：這是 ANCOVA 最關鍵的設計前提，無法以資料檢核，**工具也不提醒**
3. **共變項與依變項為線性關係**：不檢核
4. **共變項測量無誤差**

## 5. 參考文獻

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Fisher, R. A. (1932). *Statistical Methods for Research Workers* (4th ed.). | §3.1 共變數分析的原始構想 | ★ **【原文未取得】** |
| Huitema, B. E. (2011). *The Analysis of Covariance and Alternatives* (2nd ed.). Wiley. | §3.2 調整後平均、§3.3 斜率同質性與其替代（Johnson-Neyman） | ★ **【原文未取得】** |

**程序指引**：**pingouin** 的 `ancova` — ★ 基準的產生方；SPSS GLM 的 EMMEANS 為調整後平均的對標對象。

## 6. 對照與驗證狀態

**基準組**：`reference.json → ancova`（5 欄：`fFactor`／`pFactor`／`ssFactor`／`fCov1`／`pCov1`）。
資料集 `datasets.json:main` 的 `y ~ group3 + x1 + x2`（$N=60$、$k=3$、$p=2$）。

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **pingouin `ancova` 逐值**：5 欄（容差 1e−6） |
| 2 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1 的文字規格自建 dummy 設計矩陣、以 `numpy.linalg.lstsq` 做模型比較（**不呼叫 pingouin**），5 欄最大絕對差 **4.547e−13**。⇒ 參照組的選擇、模型比較的減法方向、$\mathrm{df}_{\text{error}}=N-k-p$ 都寫對了 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| SS 型別 | Type III（模型比較） | SPSS 同 | 無（本模型無交互項） |
| 編碼 | dummy（參照＝第一層） | SPSS 用 Sum coding | ★ 無交互項時調整 SS 相同；**有交互項時會不同**（本工具目前無交互項） |
| 調整後平均 | 共變項代入總平均 | SPSS EMMEANS 同 | 無 |
| 斜率不同質時 | 只警告 | SPSS 亦不擋；Johnson-Neyman 需另跑 | 本工具無替代方法 |

### ★ 尚未驗證的部分

1. ★ ★ **兩篇原文未取得**
2. ★ ★ **5 欄只涵蓋因子與第一個共變項**。`adjustedMeans`、`rawMeans`、`homogeneityTest`、
   第二個共變項的 $F$／$p$ ——**全部沒有基準**。⇒ 調整後平均與斜率同質性檢定
   （本方法最有特色的兩個產出）**零第三方對照**
3. ★ **常態與變異數同質零檢核**（§4 第 1 項）
4. **多共變項的共線性不檢核**：共變項彼此高度相關時 $\mathrm{SS}_{C_m}$ 會很小而工具不提醒
5. **交互作用項未實作** ⇒ dummy vs 效果編碼的分歧無從觸發，亦無基準
6. **`mseFull`／`mseReduced` 為孤兒中介量**（見第 7 節）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| ANCOVA 摘要表（因子、各共變項、誤差項） | §3.1 | `ancova.js:147–170` |
| partial $\eta^2$ | 同 `anova-twoway.md` §3.3 | `ancova.js` 的 `partialEta2` |
| 調整後平均表（含 SE 與 95% CI） | §3.2 | `ancova.js` 的 `adjustedMeans` |
| 原始平均表 | — | `ancova.js` 的 `rawMeans` |
| 斜率同質性檢定 | §3.3 | `ancova.js` 的 `homogeneityTest`、`Narrative.jsx:45` |
| APA 敘述句 | §3.1–3.3 | `Narrative.jsx:25–60` |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `mseFull`／`mseReduced` | **孤兒，屬中介量**（模型比較的中間量）。書面記錄 |
| 其餘（`n`／`k`／`levels`／`factor`／`covariates`／`errorTerm`／`total`／`adjustedMeans`／`rawMeans`／`homogeneityTest`） | 全部有對應呈現 |

★ **歷史註記**：`errorTerm` 這個欄位原本叫 `error`，與全 app「`result.error` 代表計算失敗」的慣例撞名，
導致 ANCOVA **從來沒有在 UI 上正常運作過**（2026-07-13 紅隊 R5 修正，見 `ancova.js:26–31` 的註解）。
⇒ 這是「同一個名字兩種語意」的代價，值得列為 A5b／A6 的檢查參考。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫 5 欄最大差 4.5e−13） |
| 2 | authority | ★ **不足**：原文未取得 |
| 3 | 文獻真實性 | Huitema (2011) 為 ANCOVA 的標準專著，真實存在；★ 標【原文未取得】 |
| 4 | 報表可追溯 | 26 欄，僅兩個中介量孤兒 |
| 5 | 假設前提 | ✅ 斜率同質性有做；★ **常態與變異數同質完全不檢核**，且**共變項不受處理影響**這個關鍵設計前提零提醒 |
| 6 | 慣例分歧 | 四項書面化；dummy vs 效果編碼的分歧目前無從觸發 |
| 7 | 邊界條件 | ★ 共線性不檢核；多共變項與交互作用情境無基準 |
| 8 | APA 敘述句 | 有報斜率同質性檢定結果——**通過**；但**未帶「ANCOVA 不能把非隨機變成隨機」的限制** |

### 本批本組記錄但不修

| # | 內容 |
|---|---|
| E31 | ★ **調整後平均與斜率同質性檢定零基準**：本方法最有特色的兩個產出沒有任何第三方對照。pingouin 的 `ancova` 不回傳這兩者，需改以 R `emmeans`／SPSS EMMEANS 補（需本機） |
| E32 | ★ **常態與變異數同質零檢核**：單因子有、雙因子已於 R52 補上、ANCOVA 仍空 |
| E33 | **APA 句未帶因果限制**：ANCOVA 在觀察研究中的過度宣稱是社科最常見的誤用，敘述句可比照 A4 的 R43 補一個 caveat |

### 本批本組未開出 L3／L4
