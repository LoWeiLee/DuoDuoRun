# 單因子變異數分析（One-way ANOVA）

> 方法代號 `anova-oneway`｜基準組 `reference.json → anova_oneway`（9 個統計量）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A5a）｜事後比較見 `tukey-hsd.md`

---

## 1. 這個方法在回答什麼問題

三組以上要比平均數時，不能兩兩跑 t 檢定——跑三次 $\alpha=.05$ 的檢定，
至少一次誤判的機率約 14%，六組（15 次比較）會爬到 54%。

單因子 ANOVA 用**一次**檢定回答：**這幾組的平均數，全部相同嗎？**
作法是把總變異拆成兩塊——**組間**（各組平均彼此差多遠）與**組內**（同一組裡的人彼此差多遠）——
再問「組間相對於組內，大到不像隨機分派造成的嗎」。

★ **ANOVA 顯著只說「至少有兩組不同」，不說是哪兩組。** 要知道是哪兩組，
才需要事後比較（`tukey-hsd.md`）——而事後比較本身又要處理多重比較的問題。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 依變項連續、自變項是三個以上水準的類別
- 各組獨立（不同的人），且組數固定、由設計決定

**不該用**

- **只有兩組**：等價於獨立樣本 t 檢定（$F=t^2$），直接用 t 檢定較好報告
- ★ **重複量數**：同一群人測三次不是三組獨立樣本，用 `anova-repeated.md`
- **變異數嚴重不同質且組人數不等**：$F$ 檢定會失真。本工具**警告但不擋**，也**不提供 Welch's ANOVA**
- **依變項是次序或嚴重偏態**：用 Kruskal-Wallis

**常見誤用**

1. ★ **ANOVA 不顯著就不做事後比較——這是對的；但反過來「ANOVA 顯著所以每一對都不同」是錯的。** 本工具無條件顯示 Tukey 表（見 `tukey-hsd.md` §2）
2. ★ **報 $\eta^2$ 卻說成「解釋變異的比例」而不提它是有偏的。** $\eta^2$ 系統性高估母體效果量，本工具同時報 $\omega^2$（§3.3）
3. **忽略各組人數。** 人數懸殊時 $F$ 對變異數不同質特別敏感
4. **把因子當連續變項的替代品**：把年齡切三組跑 ANOVA 會丟掉資訊

## 3. 公式與定義

### 3.1 變異數拆解

令 $k$ 組、第 $i$ 組 $n_i$ 人、組平均 $M_i$、總平均 $\bar M$、總人數 $N$：

$$\mathrm{SS}_{\text{between}}=\sum_{i=1}^{k}n_i\bigl(M_i-\bar M\bigr)^2,\qquad
\mathrm{SS}_{\text{within}}=\sum_{i=1}^{k}\sum_{j}\bigl(X_{ij}-M_i\bigr)^2$$

$$\mathrm{SS}_{\text{total}}=\mathrm{SS}_{\text{between}}+\mathrm{SS}_{\text{within}}$$

（`anova.js:56–70`）。自由度 $\mathrm{df}_b=k-1$、$\mathrm{df}_w=N-k$（`anova.js:71–73`）。

★ **總平均是加權的**（$\bar M=\sum n_iM_i/N$，不是各組平均的算術平均）。
組人數不等時兩者不同，而拆解式只有在加權版本下才嚴格成立。

### 3.2 $F$ 檢定

$$\mathrm{MS}_b=\frac{\mathrm{SS}_b}{\mathrm{df}_b},\quad \mathrm{MS}_w=\frac{\mathrm{SS}_w}{\mathrm{df}_w},\quad F=\frac{\mathrm{MS}_b}{\mathrm{MS}_w}$$

$p$ 取 $F$ 分布右尾（`anova.js:75–79`）。

★ **邊界慣例**：$\mathrm{MS}_w=0$（所有組內完全無變異）時 `anova.js:78` 取 $F=\infty$。
此時 $p=0$，報表會印「< .001」——與 t 檢定的零變異情形同型，
但 **ANOVA 側沒有對應的警告**（見第 6 節）。

### 3.3 兩個效果量

$$\eta^2=\frac{\mathrm{SS}_b}{\mathrm{SS}_{\text{total}}},\qquad
\omega^2=\frac{\mathrm{SS}_b-\mathrm{df}_b\cdot\mathrm{MS}_w}{\mathrm{SS}_{\text{total}}+\mathrm{MS}_w}$$

（`anova.js:81–86`）。

★ **為什麼兩個都報**：$\eta^2$ 是**樣本**的解釋比例，對母體而言**系統性高估**；
$\omega^2$ 扣掉了誤差的期望貢獻，是較無偏的估計。小樣本時兩者差距可觀，
且 $\omega^2$ **可以是負的**（當 $F<1$）——那代表「組間變異比誤差還小」，
實務上讀作 0。本工具照實印出負值，**未加說明**（見第 6 節）。

## 4. 假設前提與本工具的檢核方式

★ 單因子 ANOVA 是 `assumptionChecker.js:284` 明文支援的兩支之一。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| 常態 | ✅ **Shapiro-Wilk**，逐組（`oneWayAnova/compute.js:47`） | 紅燈＋警告框，不擋 |
| 變異數同質 | ✅ **Levene**（`oneWayAnova/compute.js:48`） | 紅燈；★ **不改變估計法**，也不提供 Welch's ANOVA |
| 各組至少 1 人、$N>k$ | ✅ `anova.js:41–46` | 回 `group-empty`／`need-N>k` |
| 獨立性 | ★ **不檢核** | — |

**沒有檢核、但方法確實要求的**：獨立性、無離群值、
以及 ★ **組內零變異**（$\mathrm{MS}_w=0$ ⇒ $F=\infty$）——t 檢定側有警告，ANOVA 側沒有。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Fisher, R. A. (1925). *Statistical Methods for Research Workers*. Oliver & Boyd. | §3.1–3.2 變異數拆解與 $F$ 檢定 | ★ **【原文未取得】** |
| Hays, W. L. (1963). *Statistics for Psychologists*. Holt, Rinehart & Winston. | §3.3 $\omega^2$ 的定義 | ★ **【原文未取得】** |

**程序指引**：**scipy** 的 `f_oneway` — ★ 基準的產生方（$F$ 與 $p$）；
SS 與兩個效果量由 `generate_reference.py` 以 numpy 手算（見第 6 節）。

## 6. 對照與驗證狀態

**基準組**：`reference.json → anova_oneway`（9 欄：`F`／`p`／`dfBetween`／`dfWithin`／
`ssBetween`／`ssWithin`／`ssTotal`／`eta2`／`omega2`）。資料集 `datasets.json:main` 的 `y ~ group3`。

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **scipy `f_oneway` 逐值**：`F` 與 `p` 兩欄（容差 1e−6） |
| 2 | ★ **其餘 7 欄的基準是 numpy 手算**，不是第三方輸出——`scipy.f_oneway` 不回傳 SS 與效果量。⇒ 這 7 欄實質上是 **tier B 的性質**（與 JS 出自同一個作者對公式的理解），只是掛在 tier A 的組底下。這是 §0 品質規範點名的結構缺陷 |
| 3 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1–3.3 的文字規格以 numpy 重算全部 9 欄（**不呼叫 `f_oneway`**），最大絕對差 **9.095e−13**（`F` 3.553e−15、`eta2` 5.551e−17）。⇒ 補上了第 2 道缺的那一層：拆解式、加權總平均與兩個效果量的分母都寫對了 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 不同質時的替代 | **無** | SPSS 提供 Welch 與 Brown-Forsythe | 變異數不同質且 $n$ 不等時，本工具只有警告 |
| $\omega^2$ | 有報 | SPSS 預設不報（只有 $\eta^2$、partial $\eta^2$） | 本工具較誠實，但使用者可能對不到 SPSS 的欄 |
| $\eta^2$ vs partial $\eta^2$ | 單因子下兩者相同 | — | 無 |

### ★ 尚未驗證的部分

1. ★ ★ **兩篇原文未取得**；$\omega^2$ 的定義只對到 `generate_reference.py` 的手算
2. ✅ **7 欄手算值已於 2026-07-30 在 Kevin 本機以 R `aov()` 補齊**（R 4.6.0，
   `scripts/validation/05_a5b_r_audit.R` §3）。base R 的 `aov()` 是完全獨立的第三方實作，逐項相符：

   | 欄位 | 本工具（fixture） | R `aov()` |
   |---|---|---|
   | ssBetween | 503.238107 | **503.2381071** |
   | ssWithin | 2787.137300 | **2787.1373** |
   | ssTotal | 3290.375407 | **3290.375407** |
   | $\eta^2$ | 0.152942 | **0.1529424594** |
   | $\omega^2$ | 0.121417 | **0.1214168084** |
   | F／p | 5.145884／0.008821 | **5.146／0.00882** |

   ⇒ 「9 欄裡有 7 欄是本專案手算」這個 §0 型的結構弱點**已結案**；$\omega^2$ 的分母慣例
   （$\mathrm{SS}_t+\mathrm{MS}_w$）亦經第三方確認
3. ★ **組內零變異（$F=\infty$）無警告、無基準**：t 檢定側已於 R51 補上警告，ANOVA 側**未同步**（記為 A5a 的書面項）
4. **$\omega^2<0$ 的情形無說明**：報表照印負值
5. **組人數極不等、組數很多（$k>10$）** 的情形無基準覆蓋
6. **Welch's ANOVA 與 Brown-Forsythe 未實作** ⇒ 無基準

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 統計卡 $F$＋df | §3.2 | `anova.js:78`、`Result.jsx:403` |
| 統計卡 $p$＋紅綠燈 | §3.2 | `anova.js:79`、`Result.jsx:403` |
| 統計卡 $\eta^2$＋分級 | §3.3 | `anova.js:81` |
| ANOVA 摘要表（SS／df／MS／F／p） | §3.1、§3.2 | `anova.js:56–86` |
| $\omega^2$ | §3.3 | `anova.js:82–86` |
| 前提檢核區（Levene／Shapiro-Wilk） | §4 | `oneWayAnova/compute.js:47–48`、`Result.jsx:47–100` |
| 各組描述統計 | §3.1 | `anova.js:54` |
| Tukey HSD 表 | 見 `tukey-hsd.md` | `oneWayAnova/compute.js:51`、`Result.jsx:413` |
| APA 敘述句 | §3.2、§3.3 | `Narrative.jsx:26–64` |

**孤兒欄位檢查**（2026-07-29 實跑）：`oneWayANOVA` 回傳的 **20 個欄位零孤兒**。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A5a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫 9 欄最大差 9.1e−13） |
| 2 | authority | ★ **不足**：原文未取得，且 **9 欄裡 7 欄的基準是本專案手算**（§6 第 2 道） |
| 3 | 文獻真實性 | Fisher (1925)、Hays (1963) 為真實存在的標準著作；★ 皆標【原文未取得】 |
| 4 | 報表可追溯 | **通過**（20 欄零孤兒） |
| 5 | 假設前提 | ✅ Levene ＋ Shapiro 齊備；★ 獨立性與離群值零檢核 |
| 6 | 慣例分歧 | 三項書面化；★ **不提供 Welch's ANOVA** 是最實質的一項 |
| 7 | 邊界條件 | ★ **組內零變異無警告**（t 檢定側已修、ANOVA 側未同步）、$\omega^2<0$ 無說明 |
| 8 | APA 敘述句 | 有報 $F$／$p$／$\eta^2$ 與分級，未過度宣稱——**通過** |

### A5a 記錄但不修的項目（屬功能擴充，不擋階段 A 結案）

| # | 內容 |
|---|---|
| E22 | ★ **組內零變異在 ANOVA 側無警告**：t 檢定已於 R51 補上，ANOVA 的 $F=\infty$ 路徑未同步。正確的作法是把「發散時不下判定」抽成跨模組的共用規則，而不是逐支補——記為功能擴充 |
| E23 | **不提供 Welch's ANOVA／Brown-Forsythe**：Levene 亮紅燈時使用者沒有替代路徑 |
| E24 | **$\omega^2$ 可為負但無說明**：報表照印負值，未提示應讀作 0 |

### 本批本組未開出 L3／L4
