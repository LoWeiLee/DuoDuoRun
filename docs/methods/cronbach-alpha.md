# Cronbach's α（內部一致性信度）

> 方法代號 `cronbach-alpha`｜基準組 `reference.json → cronbach_alpha_6items`（1）＋`cronbach_alpha_f1`（1）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6b）｜相關文件：`pls-reliability-validity.md`（★ PLS 側用的是**標準化** α）

---

## 1. 這個方法在回答什麼問題

**「這幾道題目是不是在量同一件事？」**

$$\alpha=\frac{k}{k-1}\left(1-\frac{\sum_i s_i^2}{s_T^2}\right)$$

概念上：**題目之間愈相關、$\alpha$ 愈高**。$\alpha$ 是信度的**下界**估計。

★ 它衡量的是**內部一致性**，不是「單一維度」——$\alpha$ 高不代表只有一個因素。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 量表題目的內部一致性
- 論文的測量工具描述（APA 要求報 $\alpha$）

**不該用**

- ★ **當作單維度的證據。** 要驗單維度請用 EFA／CFA
- ★ **題數很多時當作品質保證。** $\alpha$ 隨題數上升，20 題的 $\alpha=.9$ 不代表題目好
- **形成型指標**：$\alpha$ 對形成型構念沒有意義

**常見誤用**

1. ★ **反向題沒有先反向計分。** $\alpha$ 會被壓低甚至變成負數
   ——★ **本工具不檢核也不警告**（E121）
2. ★ **沒說是標準化還是未標準化的 $\alpha$。** 本工具算的是**未標準化**（見 §3.2），
   而**同一個專案的 PLS 側算的是標準化**（`pls-reliability-validity.md`）——兩處不同慣例
3. **只報 $\alpha$ 不報題數與 $n$。**

## 3. 公式與定義

### 3.1 符號

| 符號 | 意思 |
|---|---|
| $k$ | 題數 |
| $s_i^2$ | 第 $i$ 題的變異數（$n-1$ 分母） |
| $s_T^2$ | 總分的變異數 |

### 3.2 ★ 未標準化 α（`alpha.js:31–39`）

$$\alpha=\frac{k}{k-1}\left(1-\frac{\sum_{i=1}^{k}s_i^2}{s_T^2}\right)$$

★ **這是「未標準化」（raw）α**——用**原始分數的變異數／共變數**。
另一種常見的做法是對**相關矩陣**算（標準化 α）：

$$\alpha_{\text{std}}=\frac{k\bar r}{1+(k-1)\bar r}$$

**兩者在題目變異數不等時會不同。** 本資料集實測：
i1–i6 未標準化 **0.73364165**、標準化 0.73519797；i1–i3 未標準化 **0.76349046**、標準化 0.76360125。

⇒ **本工具報的是未標準化的那一個**，與 SPSS 的預設（Cronbach's Alpha 欄）相同。

### 3.3 其他報表量（`alpha.js:41–128`）

| 量 | 意思 |
|---|---|
| `meanInterItemCorr` | 平均題間相關 |
| `itemStats[].alphaIfDeleted` | 刪掉該題後的 $\alpha$（找出拖累的題目） |
| `itemStats[].itemTotalCorr` | 修正後的題目-總分相關（corrected item-total） |
| `sumItemVariance`／`totalVariance` | §3.2 的兩個分子分母 |

### 3.4 退化情形

總分變異為 0 ⇒ 回 `zero-total-variance`（★ 2026-07-30 實跑確認：**硬擋，不誤導**）。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 題目同向（反向題已反向計分） | ★ **不檢核、不警告**（E121） |
| 至少順序尺度 | Config 限 `continuous`／`ordinal` |
| 題數 $\ge2$ | 硬擋 |
| tau 等價（$\alpha$ 的理論前提） | ★ **不檢核**——這是 $\alpha$ 作為「下界」而非「點估計」的原因 |
| 遺漏值 | 逐列 listwise（`droppedRows` 有回報） |
| 零變異 | 硬擋 `zero-total-variance` |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. *Psychometrika*, 16(3), 297-334. | $\alpha$ | 【原文未取得】 |
| McDonald, R. P. (1999). *Test Theory: A Unified Treatment*. Lawrence Erlbaum. | $\omega$（★ 本工具**未實作**，見 §6） | 【原文未取得】 |

## 6. 對照與驗證狀態

**基準組**：`cronbach_alpha_6items`（i1–i6）、`cronbach_alpha_f1`（i1–i3），各 1 欄

**tier / status**：兩組皆 tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **pingouin `cronbach_alpha` 逐值**：兩組皆在 `DEFAULT_TOL`（1e-6）內 |
| 2 | ★ **R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）**：`psych::alpha` 的 **`raw_alpha`** 給 0.73364165 / 0.76349046 ⇒ **與本工具逐值相符**；`std.alpha` 為 0.73519797 / 0.76360125 ⇒ **確認本工具算的是未標準化 α** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.2 的公式以 numpy 自行重算，**不呼叫 `pingouin.cronbach_alpha`**。兩組相對差 **1.5e−16 / 2.9e−16** |
| 4 | ★ **這一道結掉的是一個慣例問題**：「本工具的 α 是哪一種」此前沒有寫在任何地方，而它決定了使用者拿 SPSS 或 R 報表對照時對不對得上 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| ★ 標準化與否 | **未標準化（raw）** | SPSS 預設同；R `psych::alpha` **兩個都給**；★ **本專案的 PLS 側用標準化** | 拿 PLS 報表對照會對不上（差異已在 `pls-reliability-validity.md` 標註） |
| $\alpha$ 的 CI | ★ **不報** | psych 給（`ase` 與 boot CI） | APA 建議報（E122） |
| McDonald's $\omega$ | ★ **未實作** | psych 給 | 現代文獻多建議改報 $\omega$（E123） |
| 反向題偵測 | ★ **無** | psych 有 `check.keys` 並會警告 | ★ 使用者容易踩（E121） |
| 刪題後 $\alpha$ | ✅ 有 | 同 | 一致 |

### ★ 尚未驗證的部分

1. **兩本原文皆未取得**
2. ★ **`meanInterItemCorr`、`alphaIfDeleted`、`itemTotalCorr` 三組欄位零基準**：
   `reference.json` **只有 `alpha` 一欄**，而刪題後 $\alpha$ 是使用者實際會據以刪題的數字（E124）
3. **$\alpha$ 的 CI 與 $\omega$ 未實作**（E122、E123）
4. **從未與 SPSS 對照過**
5. ★ **參數空間未掃描**：只有 $k=6$ 與 $k=3$ 兩個點，且都是正向題。
   ★ **含反向題的情形零基準**，而那正是最容易出事的地方（E121）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| $\alpha$ | §3.2 | `alpha.js:31–39` |
| 題數 $k$／$n$／剔除筆數 | §4 | `alpha.js:41+` |
| 平均題間相關 | §3.3 | `alpha.js` 的 `meanInterItemCorr` |
| 逐題：$M$／$SD$／item-total $r$／刪題後 $\alpha$ | §3.3 | `alpha.js` 的 `itemStats` |
| $\sum s_i^2$／$s_T^2$ | §3.2 | `sumItemVariance`／`totalVariance` |
| 判讀（優／良／可／差） | — | `alpha.js:130`（`alphaInterpretationKey`） |

**孤兒欄位檢查**（2026-07-30 實跑）：全部有 UI 消費者。
★ 判讀門檻**無出處**（E125，同 `descriptive.md` E84、`correlation.md` E89 之型）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 1.5e−16 |
| 2 | authority | provenance 為 pingouin，與產生方一致 |
| 3 | 文獻真實性 | 兩本可查、標【原文未取得】 |
| 4 | 報表可追溯 | 零孤兒；★ 判讀門檻無出處（E125） |
| 5 | 假設前提 | ★ **反向題完全不檢核**（E121）；零變異硬擋、不誤導 |
| 6 | 慣例分歧 | 五項書面化。★ **核心是「未標準化」這個此前沒寫下來的選擇**，且**同專案的 PLS 側用另一種** |
| 7 | 邊界條件 | 實跑兩種：全部題目為常數（`zero-total-variance` 硬擋）、一題常數其餘正常（照算，$\alpha=0.514$，合理） |
| 8 | APA 敘述句 | 報 $\alpha$ 與題數 |
| 9 | 數學小工具的第二套實作 | ★ `alpha.js` 用 `descriptive.js` 的 `variance`，未就地重寫 |
| 10 | 效果量的名稱與值域 | $\alpha$ 理論上 $\le1$，可為負（題目負相關時）。★ **本工具不 floor 也不警告**——負的 $\alpha$ 幾乎一定是反向題沒處理，是很強的診斷訊號卻沒被利用（E121） |
| 11 | 掃描結論的前提 | 只有兩個點、皆為正向題；含反向題的區域零基準 |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E121 | ★★ **反向題完全不檢核**：$\alpha$ 為負或極低幾乎一定是反向題沒反向計分，而這是**最強的診斷訊號**——工具既不偵測（psych 的 `check.keys` 一行就有）也不警告。★ 順帶一提：A1 的 R4 已為 PLS 側的負向 loading 加了警告，**這一支還沒有** |
| E122 | **$\alpha$ 的 CI 未實作**（psych 的 `ase` 可對照） |
| E123 | **McDonald's $\omega$ 未實作**：現代測量文獻多建議改報 $\omega$（$\alpha$ 的 tau 等價前提常不成立） |
| E124 | ★ **刪題後 $\alpha$ 與 item-total 相關零基準**：`reference.json` 只有 `alpha` 一欄，而**使用者真正據以刪題的是那兩欄** |
| E125 | **判讀門檻無出處**（同 E84／E89 之型） |
