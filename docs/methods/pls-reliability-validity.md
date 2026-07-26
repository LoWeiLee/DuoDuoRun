# 信度與效度（Reliability and validity in PLS-SEM）

> 方法代號 `pls-reliability-validity`｜基準組：`reference.json → pls_basic` 的 12 個信效度欄位、`pls_pairwise_wpls` 的 8 個（`pw_`／`w_` 的 ave 與 rhoC）｜溯源 tier **B** / verified
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

在解讀「構念之間的關係」之前，得先回答一個更基本的問題：**這些題目真的在量同一件事嗎？**

這一節的指標分成三類，回答三個不同的問題：

| 類別 | 問題 | 指標 |
|---|---|---|
| **信度** | 同一構念的題目彼此一致嗎？ | Cronbach's α、$\rho_A$、CR（$\rho_c$） |
| **收斂效度** | 構念解釋得掉它自己題目的多少變異？ | AVE |
| **區辨效度** | 兩個構念真的是兩件事，不是同一件事？ | Fornell-Larcker、HTMT |

★ 三者**只對反映型多指標構念**有意義。形成型構念一律回傳 `null`（理由見 `pls-formative.md` §1）。

## 2. 什麼時候該用、什麼時候不該用

**該用**：任何含反映型構念的 PLS-SEM，都必須在解讀結構模型**之前**先過這一關。
這是 Hair 等人評估程序的第一步，也是審稿人第一個看的地方。

**不該用／不適用**

- 形成型構念（改看權重顯著性與外部 VIF）
- 單指標構念（定義上信度為 1，本工具 UI 顯示「—」而非 1.000）
- 區塊內平均相關不為正時（例如反向題未反向計分）——此時所有指標**不可詮釋**，見 §3.6

**常見誤用（四條）**

1. **只報 α。** α 假設所有題目的真分數負荷相等（tau-equivalence），在 PLS 幾乎不成立，
   所以它是**下界**（低估信度）。CR 是**上界**（高估）。$\rho_A$ 介於兩者之間，是折衷。
   現行慣例是三個都報。
2. **α 太低就刪題刪到 .70。** 刪題會改變構念的內容效度。刪之前要問：這題在理論上該在這裡嗎？
3. **只看 Fornell-Larcker 就宣稱區辨效度成立。** Henseler 等人（2015）以模擬顯示
   Fornell-Larcker 在常見情境下**幾乎抓不到**區辨效度不足；HTMT 才是現行主判準。
4. **AVE < .50 就直接刪指標。** 先看是不是單一低負荷指標拉低的；且 AVE 低但 CR 高時，
   Fornell & Larcker 原文允許在有理論支持下保留（本工具不自動判斷，由研究者決定）。

## 3. 公式與定義

符號：區塊 $B_j$ 有 $k$ 個指標，$\mathbf{S}$ 為區塊指標相關子矩陣，
$\mathbf{w}$ 為外部權重，$\boldsymbol{\lambda}$ 為外部負荷量，$\bar r$ 為區塊內平均指標相關。

### 3.1 Cronbach's α（標準化）

$$\alpha=\frac{k}{k-1}\left(1-\frac{k}{\sum_a\sum_b S_{ab}}\right)\ \equiv\ \frac{k\bar r}{1+(k-1)\bar r}$$

→ `src/lib/stats/pls.js:911–914`（實作為左式）。兩式代數等價（代入 $\sum\sum S=k+k(k-1)\bar r$ 即得），
已於階段 A 符號與數值雙重驗證（見第 8 節 R1）。

★ **慣例分歧（最容易對不上的一項）**：本工具報的是**標準化 α**（以相關矩陣計算），
因為 PLS 全程對標準化資料運算。**SPSS 的 `Reliability` 預設輸出原始分數 α**（以共變異數矩陣計算）。
題目變異數不等時**兩者數值不同**，這是預期差異，不是錯誤。
（本工具的量表模組另有原始分數版的 Cronbach's α，見 `cronbach-alpha.md`。）

### 3.2 $\rho_A$（Dijkstra–Henseler's rho）

$\hat{\mathbf{w}}$ 先正規化使 $\hat{\mathbf{w}}'\mathbf{S}\hat{\mathbf{w}}=1$，則

$$\rho_A=(\hat{\mathbf{w}}'\hat{\mathbf{w}})^2\cdot\frac{\hat{\mathbf{w}}'\big(\mathbf{S}-\operatorname{diag}\mathbf{S}\big)\hat{\mathbf{w}}}{\hat{\mathbf{w}}'\big(\hat{\mathbf{w}}\hat{\mathbf{w}}'-\operatorname{diag}(\hat{\mathbf{w}}\hat{\mathbf{w}}')\big)\hat{\mathbf{w}}}$$

→ `pls.js:915–929`（正規化 `916`、分子分母 `919–926`、組裝 `929`）

$\rho_A$ 是唯一同時用到**權重**與**相關矩陣**的信度指標——這是它「介於 α 與 CR 之間」的來源。
它也是 PLSc 反衰減的分母（見 `pls-plsc.md` §3.2；兩處代數等價）。

### 3.3 組合信度 CR（$\rho_c$）

$$\rho_c=\frac{\left(\sum_h\lambda_h\right)^2}{\left(\sum_h\lambda_h\right)^2+\sum_h(1-\lambda_h^2)}$$

→ `pls.js:934`。分母第二項 $\sum(1-\lambda^2)$ 是誤差變異之和（在標準化尺度下）。

### 3.4 AVE 與 Fornell-Larcker

$$\text{AVE}_j=\frac{1}{k}\sum_h\lambda_h^2$$

→ `pls.js:935`

Fornell-Larcker 判準：矩陣**對角線放 $\sqrt{\text{AVE}_j}$、非對角線放構念相關**，
要求每個構念的 $\sqrt{\text{AVE}}$ 大於它與任何其他構念的相關。

→ `pls.js:1798–1803`（形成型構念的對角線為 `null`）

### 3.5 HTMT（異質-單質比）

$$\text{HTMT}_{ab}=\frac{\bar r^{\text{hetero}}_{ab}}{\sqrt{\bar r^{\text{mono}}_{a}\cdot\bar r^{\text{mono}}_{b}}}$$

- 分子 $\bar r^{\text{hetero}}_{ab}$：兩區塊**之間**全部 $k_a\times k_b$ 個指標配對的平均相關
- 分母：兩區塊各自**內部** $\binom{k}{2}$ 個配對平均相關的**幾何平均**

→ `pls.js:942–968`（單質平均 `943–950`、異質平均 `959–962`、比值 `963–964`）

判準：< .85（保守）或 < .90（寬鬆）。本工具 UI 用 .85（`Result.jsx:396`）。

### 3.6 ★ 不可詮釋的邊界（2026-07-26 新增守衛）

當**兩個**區塊的 $\bar r^{\text{mono}}$ 都是負的時，分母的乘積為正、開根號有實數解，
HTMT 會算出一個看似正常（甚至「通過」）的數值。這在數學上成立、在統計上無意義。

現行行為：$\bar r^{\text{mono}}\le 0$ 時 **HTMT 回傳 `null`**（`pls.js:956–958`），
並在引擎層發出兩條警告（`pls.js:1808–1824`）：

1. 區塊內負荷量正負混雜 →「常見原因為反向題未事先反向計分」
2. 區塊內平均指標相關不為正 →「信度與 HTMT 在此不可詮釋」

完整的發現過程與修正前的實測數字見 `pls-basic.md` §8 R3／R4。

### 3.7 判讀門檻一覽（本工具 UI 的燈號）

| 指標 | 通過門檻 | 程式碼 |
|---|---|---|
| α | ≥ .70 | `Result.jsx:294` |
| $\rho_A$ | ≥ .70 | `Result.jsx:295` |
| CR | ≥ .70 | `Result.jsx:296` |
| AVE | ≥ .50 | `Result.jsx:297` |
| 外部負荷量 | ≥ .708（$\lambda^2\ge.50$） | `Result.jsx:105` |
| HTMT | < .85 | `Result.jsx:396` |

★ 負荷量燈號取**絕對值**（`Result.jsx:104`）。這對「整個構念一起翻轉」是正確的
（PLS 的符號不確定性是區塊層級），對「區塊內正負混雜」則靠 §3.6 的警告揭露。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 反映型測量 | 依 `mode` 分流 | 形成型全部回 `null`，UI 顯示「—」 | `pls.js:1780–1796` |
| $k\ge2$ | 單指標區塊直接回 1 | UI 顯示「—」（不顯示 1.000） | `pls.js:908`；`Result.jsx:1818` |
| 區塊內平均相關為正 | 逐區塊檢查（2026-07-26 新增） | HTMT 回 `null` ＋ 兩條警告 | `pls.js:956–958`、`1792–1808` |
| α 的 tau-equivalence | **不檢核** | 無警告——這是 α 作為下界的已知限制，以三指標並列處理 | — |
| $\rho_A$ 的估計穩定性 | **不檢核** | 無警告（小樣本時 $\rho_A$ 可 > 1，PLSc 側會警告） | — |
| HTMT 的推論（bootstrap CI 上界 < 1） | **未實作** | 只給點估計與門檻燈號 | 見第 6 節 |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. *Psychometrika*, 16(3), 297–334. | 3.1 | 【原文未取得】 |
| Dijkstra, T. K., & Henseler, J. (2015). Consistent partial least squares path modeling. *MIS Quarterly*, 39(2), 297–316. | 3.2 | 【原文未取得】；卷期已核實 |
| Jöreskog, K. G. (1971). Statistical analysis of sets of congeneric tests. *Psychometrika*, 36(2), 109–133. | 3.3 | 【原文未取得】 |
| Fornell, C., & Larcker, D. F. (1981). Evaluating structural equation models with unobservable variables and measurement error. *Journal of Marketing Research*, 18(1), 39–50. | 3.4 | 【原文未取得】 |
| Henseler, J., Ringle, C. M., & Sarstedt, M. (2015). A new criterion for assessing discriminant validity in variance-based structural equation modeling. *Journal of the Academy of Marketing Science*, 43(1), 115–135. | 3.5、2 的誤用第 3 條 | 【原文未取得】 |

**程序指引**

| 文獻 | 用途 |
|---|---|
| Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2017/2022). *A Primer on PLS-SEM*. Sage. | §3.7 的全部門檻、評估程序的先後順序 |

★ 全部未取得原文；第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：`pls_basic` 的 `alphaStd_F1/F2`、`rhoA_F1/F2`、`rhoC_F1/F2`、`ave_F1/F2`、
`sqrtAve_F1/F2`、`htmt_F1F2`（共 11 欄）；`pls_pairwise_wpls` 的 `pw_ave_*`／`pw_rhoC_*`／
`w_ave_*`／`w_rhoC_*`（共 8 欄，驗證信效度在 pairwise／加權相關矩陣上同樣由 $\mathbf{R}$ 導出）

**tier / status**：tier **B** / **verified**（依附 `pls_basic` 與 `pls_pairwise_wpls` 的登記）

**對照過的第三方**

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| **seminr 2.5.0**（R，本機，Hair 團隊） | α、$\rho_A$、CR、AVE、HTMT | 2026-07-13 逐值一致（小數 6 位）。**這是本節唯一的真第三方對照** |
| plspm 0.5.7 | — | **不提供**這些量（fixture 的信效度欄位是 numpy 依公式手算） |
| 本文件的獨立重寫（2026-07-26） | 11 ＋ 8 欄 | α 差 **0.0 / 1.1e−16**、HTMT 差 **0.0**、其餘 ≤ **3.3e−16** |
| SPSS | — | **沒有對照過**；已知 α 慣例不同（§3.1） |

**已知的慣例差異**

1. **標準化 α vs 原始分數 α**（§3.1）——與 SPSS 對不上是預期的。已於 APA 敘述句標註「標準化 α」。
2. **單指標構念**：本工具 UI 顯示「—」，SmartPLS 顯示 1.000。呈現差異，非數值差異。
3. **HTMT 判準**：本工具 .85；文獻另有 .90（寬鬆）。
4. **HTMT 的不合格配對**：單指標、形成型、repeated-indicators 的 HOC×LOC 配對、
   以及 $\bar r^{\text{mono}}\le0$（2026-07-26 新增）一律回 `null`。

### ★ 尚未驗證的部分

1. **五篇方法出處原文全部未取得。** 本節能標 verified，靠的是 seminr（Hair 團隊實作）逐值一致；
   但 seminr 與本工具**可能共享同一個對文獻的理解**——這正是 §0 規範點名的結構性風險。
   五個量之中沒有一個對過**第二個**獨立第三方。
2. **HTMT 的 bootstrap 信賴區間未實作。** Henseler 等人（2015）建議的完整程序是
   「HTMT 的 CI 上界是否低於 1」（HTMT$_{\text{inference}}$），本工具只給點估計與 .85 門檻。
   這是**功能缺口**，不是實作錯誤，已在此誠實標註。
3. **α 的 tau-equivalence 與 $\rho_A$ 的穩定性都不檢核**（§4），使用者不會收到任何提示。
4. **$\bar r^{\text{mono}}\le0$ 以外的病態情形未系統性測試**：例如區塊內有一對指標相關為 1
   （重複題）時，$\mathbf{S}$ 奇異但 $\bar r$ 為正，α 與 CR 仍會算出數字。無測試覆蓋。
5. **pairwise deletion 下的信效度沒有統計理論支持**：$\mathbf{R}$ 的各格來自不同子樣本，
   α／$\rho_A$／CR 的抽樣性質未知。工具會警告矩陣非半正定（`pls.js:1437–1439`），
   但**不會**警告「信度指標在此的解讀有限」。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| Cronbach's α | 3.1 | `pls.js:914` |
| rho_A | 3.2 | `pls.js:929` |
| CR | 3.3 | `pls.js:934`（PLSc 時 `1787`） |
| AVE | 3.4 | `pls.js:935`（PLSc 時 `1788`） |
| Fornell-Larcker 對角線 | 3.4 $\sqrt{\text{AVE}}$ | `pls.js:1798–1803` |
| Fornell-Larcker 非對角線 | 構念相關（見 `pls-basic.md` §3.4） | 同上 |
| HTMT | 3.5 | `pls.js:963–964` |
| 列首燈號（四項全過） | 3.7 | `Result.jsx:294–297` |
| 兩條資料品質警告 | 3.6 | `pls.js:1808–1824` |

**孤兒欄位檢查**：信效度表與 HTMT 表的每一欄都有對應公式。`reliability[].mode` 是分流標記，
非統計量。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（含 α 的代數等價驗證） |
| 2 | authority 是否支持該公式 | **發現 1 項**（$\rho_A$ 卷期誤植，已於 `pls-basic.md` R2 修） |
| 3 | 文獻真實性 | 全部未取得原文，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過但有三處不檢核**（第 6 節第 3 點） |
| 6 | 慣例分歧 | **通過**（第 6 節列 4 項；標準化 α 一項已補進 APA 敘述句） |
| 7 | 邊界條件 | **發現 2 項**（`pls-basic.md` R3／R4，已修）；另 1 項未測（第 6 節第 4 點） |
| 8 | APA 敘述句 | **發現 1 項**（未載明標準化 α，已修；見 `pls-basic.md` R5） |

### R1（通過）逐式核對、代數等價與獨立重寫

- **代數等價**：`pls.js:914` 的 $\frac{k}{k-1}(1-\frac{k}{\sum S})$ 與教科書式 $\frac{k\bar r}{1+(k-1)\bar r}$
  符號展開等價，數值差 0.0 / 1.11e−16。
- **獨立重寫**：依第 3 節文字規格以 numpy 重算五個量，對 `pls_basic` 與 `pls_pairwise_wpls`
  共 19 個信效度欄位比對，**最大絕對差 3.3e−16**。

★ 這一項驗的是「第 3 節的文字構成充分且正確的規格」。執行者先前已讀過 `pls.js`，
**不是盲重寫**；它抓文件↔實作的漂移，抓不到「對原文的理解本身有誤」。後者需要原文，本節五篇皆未取得。

### 本組沒有新開待辦

本組的四項發現（R2／R3／R4／R5）都在 `pls_basic` 的紅隊中一併處置完畢，見 `pls-basic.md` §8。
本組新增的是**第 6 節第 2 點**：HTMT 的 bootstrap CI 未實作——這是功能缺口，
建議列入階段 B 的候選（不屬階段 A 的修正範圍）。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
