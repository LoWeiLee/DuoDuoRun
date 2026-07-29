# 重複量數變異數分析（Repeated-measures ANOVA，單一受試者內因子）

> 方法代號 `anova-repeated`｜基準組 `reference.json → repeated_anova`（10 個統計量）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）

---

## 1. 這個方法在回答什麼問題

同一群人被測量三次以上（前測／後測／追蹤，或三種情境），要問：**這幾次測量的平均有沒有差異？**

不能當成三組獨立樣本跑單因子 ANOVA——那會把「人與人之間本來就有的差異」算進誤差。
重複量數的作法是先把**受試者間的差異**整塊拿掉，剩下的才當誤差：

$$\mathrm{SS}_{\text{total}}=\underbrace{\mathrm{SS}_{\text{between-subjects}}}_{\text{每個人的整體高低}}+\underbrace{\mathrm{SS}_{\text{treatment}}+\mathrm{SS}_{\text{error}}}_{\text{受試者內}}$$

誤差變小 ⇒ 檢定力大幅提高。這是重複量數設計的核心價值。

★ 代價是多一個假設：**球形性**（sphericity）。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 同一群人在三個以上時間點／情境下的測量
- 配對設計（每組配對三人以上）

**不該用**

- **只有兩次測量**：等價於成對 t 檢定，直接用 t 檢定較好報告（$F=t^2$）
- ★ **有受試者間因子**：用 `anova-mixed.md`
- ★ **資料有缺失**：本工具走 **listwise** —— 任一次測量缺值就整個人被剔除。
  縱貫研究的流失率高時會損失大量樣本，而**混合模型（不需 listwise）本工具未實作**

**常見誤用**

1. ★ **忽略球形性檢定，直接讀未校正的 $p$。** Mauchly 顯著時未校正的 $p$ **偏小**（偏向宣稱顯著）
2. ★ **Mauchly 不顯著就宣稱「球形性成立」。** 該檢定在小樣本時檢定力極低
3. **報了 GG 校正卻沒說** ：APA 要求載明用了哪一種 $\varepsilon$
4. **把 listwise 剔除後的 $n$ 當成原始樣本數**

## 3. 公式與定義

### 3.1 變異數拆解

$n$ 位受試者 × $k$ 個條件（`repeatedAnova.js:150–195`）：

$$\mathrm{SS}_{\text{treat}}=n\sum_{j=1}^{k}\bigl(\bar Y_{\cdot j}-\bar Y\bigr)^2,\qquad
\mathrm{SS}_{\text{BS}}=k\sum_{i=1}^{n}\bigl(\bar Y_{i\cdot}-\bar Y\bigr)^2$$

$$\mathrm{SS}_{\text{error}}=\mathrm{SS}_{\text{total}}-\mathrm{SS}_{\text{treat}}-\mathrm{SS}_{\text{BS}}$$

$\mathrm{df}_{\text{treat}}=k-1$、$\mathrm{df}_{\text{error}}=(n-1)(k-1)$、
$F=\mathrm{MS}_{\text{treat}}/\mathrm{MS}_{\text{error}}$（`repeatedAnova.js:187–196`）。

### 3.2 Mauchly 球形檢定

以 **Helmert 正交對比**把 $n\times k$ 資料降為 $n\times(k-1)$ 的對比矩陣 $Z$，
取其樣本共變異矩陣 $S$（`repeatedAnova.js:92–110`）：

$$W=\frac{\det(S)}{\bigl(\operatorname{tr}(S)/(k-1)\bigr)^{k-1}},\qquad
\chi^2=-\Bigl[(n-1)-\frac{2(k-1)^2+(k-1)+2}{6(k-1)}\Bigr]\ln W$$

$\mathrm{df}=\frac{(k-1)k}{2}-1$。

★ **$k=2$ 時球形性自動成立**（只有一個對比），工具不報 Mauchly、$\varepsilon\equiv1$。

### 3.3 三種 $\varepsilon$ 校正

$$\varepsilon_{GG}=\frac{\bigl(\operatorname{tr}S\bigr)^2}{(k-1)\operatorname{tr}(S^2)},\qquad
\varepsilon_{HF}=\min\left\{1,\ \frac{n(k-1)\varepsilon_{GG}-2}{(k-1)\bigl[(n-1)-(k-1)\varepsilon_{GG}\bigr]}\right\},\qquad
\varepsilon_{LB}=\frac{1}{k-1}$$

★ **$F$ 不變，只有自由度乘以 $\varepsilon$ 後重算 $p$**（`repeatedAnova.js:293`）。
這一點常被誤解為「校正後 $F$ 會變」。

★ **慣例：本工具三種都報，但不自動選。** SPSS 亦全部列出；
常見的實務建議是 $\varepsilon_{GG}<0.75$ 用 GG、否則用 HF，**本工具不給這個建議**（見第 6 節）。

## 4. 假設前提與本工具的檢核方式

★ 重複量數 **不在 `assumptionChecker.js` 的 case 清單內**。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ★ 球形性 | ✅ **Mauchly** ＋ 三種 $\varepsilon$ 校正（§3.2、§3.3） | 報表同時列出未校正與校正後的 $p$；不擋 |
| $\ge2$ 個條件、$n\ge2$ | ✅ `repeatedAnova.js:113`／`132` | 回 `needAtLeast2`／`tooFewN` |
| 無缺失值 | ✅ listwise | ★ 剔除筆數**是否揭露**見第 6 節 |

**沒有檢核的**：常態性（受試者內差值的常態）、離群值、
★ **受試者是否真的獨立**（同一個班級的學生仍非獨立）。

## 5. 參考文獻

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Mauchly, J. W. (1940). Significance test for sphericity of a normal $n$-variate distribution. *Annals of Mathematical Statistics*, 11(2), 204–209. | §3.2 | ★ **【原文未取得】** |
| Greenhouse, S. W., & Geisser, S. (1959). On methods in the analysis of profile data. *Psychometrika*, 24(2), 95–112. | §3.3 $\varepsilon_{GG}$ | ★ **【原文未取得】** |
| Huynh, H., & Feldt, L. S. (1976). Estimation of the box correction for degrees of freedom from sample data in randomized block and split-plot designs. *Journal of Educational Statistics*, 1(1), 69–82. | §3.3 $\varepsilon_{HF}$ | ★ **【原文未取得】** |

**程序指引**：**pingouin** 的 `rm_anova` ＋ `sphericity` — ★ 基準的產生方。

## 6. 對照與驗證狀態

**基準組**：`reference.json → repeated_anova`（10 欄：`F`／`p`／`dfNum`／`dfDen`／`ssTreat`／
`ssError`／`ggEps`／`pGG`／`mauchlyW`／`mauchlyP`）。
資料集 `datasets.json:main` 的 `cond1`／`cond2`／`cond3`（$n=60$、$k=3$）。

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **pingouin `rm_anova` ＋ `sphericity` 逐值**：10 欄（容差 1e−6） |
| 2 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1–3.3 的文字規格以 numpy 手算 SS 拆解、自建 Helmert 正交對比矩陣、由 $S$ 求 $W$ 與 $\varepsilon_{GG}$（**不呼叫 pingouin**），10 欄最大絕對差 **2.387e−12**（`mauchlyW` 與 `mauchlyP` **逐位元相同**）。⇒ Helmert 對比的正規化、$\chi^2$ 的 Box 修正項、$\varepsilon_{GG}$ 的 $\operatorname{tr}(S^2)$ 分母都寫對了 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| $\varepsilon$ 的選用 | **三種都報、不自動選** | SPSS 亦全部列出 | ★ 但**不給選用建議**，使用者可能挑對自己有利的那一個 |
| 缺失值 | listwise | SPSS 同；混合模型不需要 | 縱貫資料損失大 |
| 效果量 | partial $\eta^2$ ＋ $\eta^2_G$ | SPSS 只有 partial $\eta^2$ | $\eta^2_G$（generalized）較適合跨設計比較 |

### ★ 尚未驗證的部分

1. ★ ★ **三篇原文未取得**；Box 修正項與 $\varepsilon_{HF}$ 的分子分母只對到 pingouin 的行為
2. ★ **$\varepsilon_{HF}$ 與 $\varepsilon_{LB}$ 沒有基準**：10 欄只鎖了 `ggEps` 與 `pGG`。
   $\varepsilon_{HF}$ 的公式在文獻上**有兩種寫法**（分母是否用 $n-1$），本工具採哪一種**沒有第三方對照**
3. ★ **listwise 剔除筆數是否揭露未查證**：A4 的 R37-b／R38-e 在 NCA 與 LDA 補過同樣的事，
   重複量數側**本批未檢查**，記為 A5b 的待辦
4. **常態性零檢核**
5. **$k=2$ 的路徑（不報 Mauchly）無基準**
6. **多個受試者內因子、受試者內 × 受試者間的高階設計未實作**

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 描述統計表（各條件平均／SD／$n$） | §3.1 | `repeatedAnova.js` 的 `descriptives`、`Result.jsx:77` |
| Mauchly 表（$W$／$\chi^2$／df／$p$） | §3.2 | `repeatedAnova.js:92–110`、`Result.jsx:115–151` |
| ANOVA 表（SS／df／MS／F／p，含三種 $\varepsilon$ 校正列） | §3.1、§3.3 | `repeatedAnova.js:177–196`＋`293`、`Result.jsx:153` |
| partial $\eta^2$／$\eta^2_G$ | §3.1 | `repeatedAnova.js:296` 起 |
| APA 敘述句 | §3.1–3.3 | `Narrative.jsx` |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `ssWS`／`dfWS`／`msTreat` | **孤兒，屬中介量**（受試者內總量與處理均方，報表由 SS／df 逐列呈現）。書面記錄 |
| 其餘 28 欄 | 全部有對應呈現 |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫 10 欄最大差 2.4e−12，Mauchly 兩欄逐位元相同） |
| 2 | authority | ★ **不足**：三篇原文未取得 |
| 3 | 文獻真實性 | Mauchly (1940)、Greenhouse & Geisser (1959)、Huynh & Feldt (1976) 卷期頁碼皆可查、真實存在；★ 皆標【原文未取得】 |
| 4 | 報表可追溯 | 31 欄，僅三個中介量孤兒 |
| 5 | 假設前提 | ✅ 球形性完整（Mauchly ＋ 三種 $\varepsilon$）；★ 常態零檢核 |
| 6 | 慣例分歧 | ★ **$\varepsilon$ 不給選用建議**；$\varepsilon_{HF}$ 的兩種寫法無對照 |
| 7 | 邊界條件 | ★ $\varepsilon_{HF}$／$\varepsilon_{LB}$、$k=2$ 路徑皆無基準 |
| 8 | APA 敘述句 | 有報 Mauchly 與校正後 $p$——**通過** |

### 本批本組記錄但不修

| # | 內容 |
|---|---|
| E34 | ★ **$\varepsilon_{HF}$ 與 $\varepsilon_{LB}$ 無基準**，且 $\varepsilon_{HF}$ 在文獻上有兩種分母寫法 |
| E35 | **不給 $\varepsilon$ 的選用建議**：三種並列時使用者可能挑對自己有利的 |
| E36 | **listwise 剔除筆數是否揭露未查證**（A4 已在 NCA／LDA 補過同型），列入 A5b 待辦 |

### 本批本組未開出 L3／L4
