# 混合設計變異數分析（Mixed ANOVA：一個受試者間因子 × 一個受試者內因子）

> 方法代號 `anova-mixed`｜基準組 `reference.json → mixed_anova`（6 個統計量）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）｜前置閱讀：`anova-repeated.md`（球形性的定義都在那裡）

---

## 1. 這個方法在回答什麼問題

實驗組與對照組，各測三次。要問三件事：

| 效果 | 問的是 | 誤差項 |
|---|---|---|
| 受試者間（A） | 兩組整體平均有沒有差異？ | $\mathrm{MS}_{\text{subjects(A)}}$ |
| 受試者內（B） | 三次測量之間有沒有差異？ | $\mathrm{MS}_{\text{error(within)}}$ |
| ★ **交互作用 A×B** | ★ **兩組的變化趨勢一樣嗎？** | $\mathrm{MS}_{\text{error(within)}}$ |

★ **交互作用才是介入研究真正要的那一個。** 「實驗組進步比對照組多」正是 A×B 顯著，
而不是 A 顯著（那只說整體高低不同）也不是 B 顯著（那說兩組都在變）。

★ **三個效果用兩個不同的誤差項** ——這是混合設計最容易寫錯的地方，
受試者間效果的誤差是「組內受試者的差異」，受試者內效果的誤差是「殘餘的受試者 × 條件變異」。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 前後測 × 實驗／對照的介入研究（最典型）
- 兩群人各在多個情境下受測

**不該用**

- ★ **有缺失值的縱貫資料**：本工具走 listwise，任一次缺值整個人被剔除。
  ★ 實務上這常常剔掉 20–40% 的樣本，而**混合模型（linear mixed model）不需要 listwise ——本工具未實作**
- **兩個以上的受試者間因子或受試者內因子**：本工具只支援 1 × 1
- **各組人數極不等**：$\mathrm{MS}_{\text{subjects(A)}}$ 的估計不穩

**常見誤用**

1. ★ **只報 A 與 B 顯著，不報交互作用**——介入研究的結論幾乎都在 A×B
2. ★ **交互作用顯著卻用主效果下結論**（同 `anova-twoway.md` §1）
3. **忽略球形性對 B 與 A×B 的影響**（A 的檢定不受球形性影響，B 與 A×B 受）
4. **把 listwise 之後的 $n$ 當原始樣本數**

## 3. 公式與定義

### 3.1 SS 拆解（split-plot）

$a$ 組、每組 $n_g$ 人、$b$ 個條件（`mixedAnova.js:114` 起）：

**受試者間**：$\mathrm{SS}_{\text{BS}}=b\sum_i(\bar Y_{i\cdot}-\bar Y)^2$，再拆為

$$\mathrm{SS}_A=b\sum_{g}n_g\bigl(\bar Y_{g\cdot\cdot}-\bar Y\bigr)^2,\qquad
\mathrm{SS}_{\text{subjects}(A)}=\mathrm{SS}_{\text{BS}}-\mathrm{SS}_A$$

**受試者內**：

$$\mathrm{SS}_B=N\sum_j\bigl(\bar Y_{\cdot\cdot j}-\bar Y\bigr)^2,\qquad
\mathrm{SS}_{AB}=\mathrm{SS}_{\text{cells}}-\mathrm{SS}_A-\mathrm{SS}_B$$

$$\mathrm{SS}_{\text{error(within)}}=\mathrm{SS}_{\text{total}}-\mathrm{SS}_{\text{BS}}-\mathrm{SS}_B-\mathrm{SS}_{AB}$$

### 3.2 ★ 三個 $F$ 用兩個誤差項

$$F_A=\frac{\mathrm{MS}_A}{\mathrm{MS}_{\text{subjects}(A)}},\qquad
F_B=\frac{\mathrm{MS}_B}{\mathrm{MS}_{\text{error(within)}}},\qquad
F_{AB}=\frac{\mathrm{MS}_{AB}}{\mathrm{MS}_{\text{error(within)}}}$$

自由度：$\mathrm{df}_A=a-1$、$\mathrm{df}_{\text{subjects}(A)}=N-a$、
$\mathrm{df}_B=b-1$、$\mathrm{df}_{AB}=(a-1)(b-1)$、$\mathrm{df}_{\text{error(within)}}=(N-a)(b-1)$。

### 3.3 球形性（僅影響 B 與 A×B）

用受試者內正交對比的**組內彙集（pooled within-group）共變異矩陣** $S$——
即先從每位受試者的對比向量中扣掉**所屬組**的均值，再求共變異（`mixedAnova.js:96–112`）。

$$W=\frac{\det S}{\bigl(\operatorname{tr}S/(b-1)\bigr)^{b-1}},\qquad
\chi^2=-\Bigl[\nu-\frac{2(b-1)^2+(b-1)+2}{6(b-1)}\Bigr]\ln W,\quad \nu=N-a$$

$$\varepsilon_{HF}=\min\left\{1,\ \frac{(N-a)(b-1)\varepsilon_{GG}-2}{(b-1)\bigl[(N-a-1)-(b-1)\varepsilon_{GG}\bigr]}\right\}$$

★ **與單純重複量數的差別在 $\nu=N-a$ 而不是 $n-1$**，以及 $S$ 用**組內彙集**而非全樣本——
兩者都是混合設計特有的，寫錯會讓 Mauchly 的 $p$ 系統性偏移。$\varepsilon$ 只套用到
$(\mathrm{df}_B,\mathrm{df}_{\text{error(within)}})$ 與 $(\mathrm{df}_{AB},\mathrm{df}_{\text{error(within)}})$，
**不動 $F_A$**。

## 4. 假設前提與本工具的檢核方式

★ 混合設計 **不在 `assumptionChecker.js` 的 case 清單內**。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ★ 球形性（受試者內） | ✅ **Mauchly ＋ 三種 $\varepsilon$**（§3.3） | 報表列出校正後的 $p$；不擋 |
| 各組 $n_g\ge2$ | ✅ `mixedAnova.js:157` | 回 `tooFewPerGroup`，並在 `meta` 帶回各組人數 |
| 無缺失值 | ✅ listwise | 見 §2 的警告 |
| ★ **受試者間的共變異同質**（Box's M） | ★ **完全不檢核** | 無提示（見下） |

★ **R53：混合設計缺被試間的共變異同質檢核。** 混合設計的正確前提不是單變量的
變異數同質（Levene），而是**各組的受試者內共變異矩陣相等**——也就是 Box's M。
`lda.js:545–576` 已有 Box's M 的完整實作可複用，但**在混合設計側沒有接上**。
Kevin 2026-07-29 裁決：**書面記錄，不在文件批次裡順手加功能。**

**其餘沒有檢核的**：常態性、離群值、受試者的獨立性。

## 5. 參考文獻

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Mauchly, J. W. (1940). *Annals of Mathematical Statistics*, 11(2), 204–209. | §3.3 | ★ **【原文未取得】** |
| Greenhouse, S. W., & Geisser, S. (1959). *Psychometrika*, 24(2), 95–112. | §3.3 $\varepsilon_{GG}$ | ★ **【原文未取得】** |
| Huynh, H., & Feldt, L. S. (1976). *Journal of Educational Statistics*, 1(1), 69–82. | §3.3 $\varepsilon_{HF}$ 的**混合設計版本** | ★ **【原文未取得】** |
| Box, G. E. P. (1949). *Biometrika*, 36(3/4), 317–346. | §4 的 Box's M（**本工具在此未實作**） | ★ **【原文未取得】** |

**程序指引**：**pingouin** 的 `mixed_anova` — ★ 基準的產生方。

## 6. 對照與驗證狀態

**基準組**：`reference.json → mixed_anova`（6 欄：`fBetween`／`pBetween`／`fWithin`／`pWithin`／
`fInter`／`pInter`）。資料集 `datasets.json:main` 的 `group2` × (`cond1`,`cond2`,`cond3`)，$N=60$、$a=2$、$b=3$。

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **pingouin `mixed_anova` 逐值**：6 欄（容差 1e−6） |
| 2 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1–3.2 的文字規格以 numpy 手算 split-plot 的五段 SS 拆解與**兩個不同的誤差項**（**不呼叫 pingouin**），6 欄最大絕對差 **1.137e−13**。⇒ $F_A$ 用 $\mathrm{MS}_{\text{subjects}(A)}$、$F_B$ 與 $F_{AB}$ 用 $\mathrm{MS}_{\text{error(within)}}$ 這件事寫對了——**這正是混合設計最容易寫錯的地方** |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| $\varepsilon_{HF}$ 的分母 | 混合設計版（$\nu=N-a$） | SPSS 同 | 與單純重複量數版不同，易混淆 |
| $S$ 的估計 | 組內彙集 | SPSS 同 | 用全樣本會偏 |
| 缺失值 | listwise | 混合模型不需要 | 縱貫資料損失大 |
| 受試者間同質性 | ★ **不檢核** | SPSS 提供 Box's M 與 Levene | 前提違反時無提示 |

### ★ 尚未驗證的部分

1. ★ ★ **四篇原文未取得**
2. ★ ★ **6 欄只鎖了三個 $F$ 與三個 $p$**。SS 拆解的五個分量、兩個誤差項的 MS、
   Mauchly（$W$／$\chi^2$／$p$）、三種 $\varepsilon$、partial $\eta^2$ ——**全部沒有基準**。
   ⇒ §3.3 那一整段（混合設計特有的 $\nu=N-a$ 與組內彙集 $S$）**零第三方對照**，
   而它正是本方法最容易寫錯的部分。★ 這是 A5a 七組裡**基準覆蓋率最低**的一組
3. ★ **Box's M 未實作**（R53）
4. **常態性、離群值、獨立性零檢核**
5. **$b=2$ 的路徑（不報 Mauchly）無基準**
6. **各組人數不等、$a>2$、$b>3$ 的情形無基準覆蓋**

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 摘要行（$N$／$a$／$b$／各組人數） | §3.1 | `mixedAnova.js:156`、`Result.jsx:54` |
| 描述統計表（細格平均／SD／$n$） | §3.1 | `mixedAnova.js:162–178` 的 `cellMean`／`cellSD` → `descriptives`、`Result.jsx:77–113` |
| Mauchly 表 | §3.3 | `mixedAnova.js:96–112`、`Result.jsx:115–151` |
| ANOVA 表（三個效果 × SS／df／MS／F／p／partial $\eta^2$，含 $\varepsilon$ 校正列） | §3.1–3.3 | `Result.jsx:153–186` |
| 教學模式解讀 | §1 | `Result.jsx:363` |
| APA 敘述句 | §3.2 | `Narrative.jsx` |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `cellMean`／`cellSD`／`groupMean`／`condMean`／`nPerGroup` | **非真孤兒**：同一組數字已由 `descriptives` 承載並渲染（實測 `descriptives[0..2].mean` 與 `cellMean[0]` 逐值相同）。屬中介量，書面記錄 |
| `ssWS`／`msB`／`msAB` | **孤兒，屬中介量**。書面記錄 |
| 其餘（三個效果的 SS／df／MS／F／p／partial $\eta^2$、Mauchly、三種 $\varepsilon$、`descriptives`） | 全部有對應呈現 |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫 6 欄最大差 1.1e−13；★ 兩個誤差項的配對正確） |
| 2 | authority | ★ **不足**：四篇原文未取得 |
| 3 | 文獻真實性 | 四篇卷期頁碼皆可查、真實存在；★ 皆標【原文未取得】 |
| 4 | 報表可追溯 | 56 欄，孤兒皆為中介量或已由 `descriptives` 承載 |
| 5 | 假設前提 | ✅ Mauchly 有做；★ **開出 R53**（缺 Box's M） |
| 6 | 慣例分歧 | 四項書面化；$\varepsilon_{HF}$ 的混合設計版分母是重點 |
| 7 | 邊界條件 | ★ **基準覆蓋率最低的一組**（§6 第 2 項）：Mauchly 與 $\varepsilon$ 全部無基準 |
| 8 | APA 敘述句 | 三個效果都有報——**通過** |

### R53（L1）混合設計缺被試間因子的共變異同質檢核

**發現**　混合設計的正確前提是**各組的受試者內共變異矩陣相等**（Box's M），
而非單變量的 Levene。本工具有 Mauchly（管球形性）但完全沒有 Box's M，
⇒ 受試者間因子的 $F_A$ 前提違反時毫無提示。
`lda.js:545–576` 已有可複用的 Box's M 實作。

**處置（Kevin 2026-07-29 裁決）**　**書面記錄**。
理由：接上 Box's M 屬功能擴充，跨出了「文件批次不做功能擴充」的界線；
本節與 §4、§6 已把缺口、正確的檢核是什麼、以及現成可複用的實作位置寫清楚，
階段 B 要做時有完整的入口。記為 **E37**。

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E37 | ★ **缺 Box's M**（見上，R53 的處置） |
| E38 | ★ **Mauchly 與三種 $\varepsilon$ 零基準**：6 欄只鎖三個 $F$／$p$，而 §3.3 是本方法最容易寫錯的部分 |
| E39 | **不提供混合模型（LMM）**：縱貫資料的 listwise 損失無替代路徑 |

### 本批本組未開出 L3／L4
