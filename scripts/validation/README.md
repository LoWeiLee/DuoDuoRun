# 抽驗工具包（Session A 前置）

多多快跑的 PLS-SEM / NCA 基準值目前由 Python（plspm ＋ 獨立 numpy 手算引擎）產生。
下列項目 **plspm 不支援、或 SmartPLS 未完整公開實作細節**，需要在 Kevin 本機以
R（seminr / cSEM / NCA）與 SmartPLS 4 抽驗，確認「慣例對齊」而非只有「公式正確」。

清單來源：`docs/validation-report-v1.md` 各波「待抽驗清單」＋`docs/handoff-roadmap-v1.md` §4。

---

## 0. 你要做的事（最短路徑）

1. **R 的部分**：雙擊 `跑抽驗腳本.bat`
   （沒裝 R 的話它會告訴你去哪下載；裝完再雙擊一次）
   跑完會自動開啟 `out\` 資料夾，把裡面三個 `.txt` 交給 AI。
2. **SmartPLS 4 的部分**：照下面 §2、§3 手動操作，把畫面數字填進
   `抽驗對照表.md` 的「SmartPLS 4」欄。
3. 兩邊都回報後，AI 進 Session A 逐項對表、判定「實作錯誤（修）」或「慣例差異（雙處標註）」。

R 與 SmartPLS 可分批回報，不必等齊。

---

## 1. 資料檔

- `data/main.csv`（n=60）：與 `tests/fixtures/datasets.json:main` 同一批固定種子資料。
  PLS 相關指標欄位：`i1–i6`（兩個反映型構念）、`cond1–cond3`、`y`（單指標）、
  `x1–x3`（形成型用）、`group2`（M/F 各 30，多群組用）。
- `data/nca.csv`（n=48）：與 `datasets.json:nca` 同一批 x/y。

**匯入 SmartPLS 4 時**：所有指標請設為 metric（連續），不要設 ordinal；
SmartPLS 預設會逐指標標準化，與多多快跑一致。

---

## 2. SmartPLS 4 抽驗步驟（PLS 部分）

### 2.1 建 M4 基準模型（後面幾項共用）

匯入 `data/main.csv`，建立：

| 構念 | 指標 | 測量模式 |
|---|---|---|
| F1 | i1, i2, i3 | Reflective (Mode A) |
| F2 | i4, i5, i6 | Reflective (Mode A) |
| C  | cond1, cond2, cond3 | Reflective (Mode A) |
| Y  | y | 單指標 |

路徑：`F1 → F2`、`F1 → C`、`F2 → C`、`F2 → Y`

演算法設定：**Path weighting scheme**、Max iterations 3000、Stop criterion 1e-7、
**+1 initial weights**、標準化資料（預設）。

跑 **PLS-SEM Algorithm**，抄下：loadings、path coefficients、R²。
（這一步是 sanity check：若這裡就對不上，後面所有項目都不用比。）

### 2.2 ★ 高優先：two-stage 調節的交互項係數

新建模型（或複製 M4 改）：

- F1（i1–i3）、C（cond1–cond3）、Y（單指標 y）
- 路徑：`F1 → Y`、`C → Y`
- 對 `F1 → Y` 這條路徑加 **Moderating effect**，Moderator = C，
  method = **Two-Stage**

跑 PLS-SEM Algorithm。要抄的數字：

- `F1 → Y` 係數
- `C → Y` 係數
- `F1 × C → Y` 係數 ← **這一項是重點**
- Y 的 R²
- 交互項的 f²（在 f-square 報表）

**為什麼是重點**：多多快跑依 SmartPLS 4 官方 Moderation 文件，把交互項係數以
**未標準化乘積量尺**回報（＝標準化係數 ÷ sd(第一階段分數乘積)）。若 SmartPLS 4
實際輸出的是標準化值，我們的預設回報口徑就要改。對照表裡我把兩個版本都列了
（`path_int_Y` = 未標準化、`path_int_Y_std` = 標準化），看你的畫面對上哪一個。

另外請確認：SmartPLS **是否自動補上 C → Y 的主效果路徑**（我們的引擎會自動補並記錄）。

### 2.3 ★ 高優先：HOC 兩階段

- 一階：F1（i1–i3）、F2（i4–i6）
- 二階：G（反映型，dimensions = F1, F2）
- 路徑：`G → C`、`C → Y`
- 用 SmartPLS 的 **Higher-Order Constructs → Two-stage approach**

抄下：G 對 F1/F2 的 loadings、`G → C`、`C → Y`、R²(C)、R²(Y)。

（多多快跑有 disjoint 與 embedded 兩種兩階段實作，數字略有差異——
請註明 SmartPLS 用的是哪一種選項。）

### 2.4 模型適配 SRMR / d_ULS / d_G / NFI

在 M4 上跑 **PLS-SEM Algorithm → Quality Criteria → Model Fit**。
抄下 **Saturated Model** 與 **Estimated Model** 兩欄的 SRMR、d_ULS、d_G、NFI。

### 2.5 Blindfolding Q²

M4 上跑 **Blindfolding**，**Omission distance D = 7**，
Cross-validated redundancy。抄下 F2、C、Y 的 Q²。

### 2.6 IPMA

M4 上跑 **IPMA**，目標構念 = **C**。
抄下 F1、F2 的 Importance（總效果，未標準化）與 Performance（0–100）。

**注意口徑差**：SmartPLS 用**量表理論界線**做 0–100 重標定，多多快跑用**觀察 min/max**。
本資料的指標若沒觸及量表極端值，Performance 會系統性不同——這屬已知差異，
抄數字時請一併記下 SmartPLS 用的量表界線設定。

### 2.7 ★★ CTA-PLS（W6.3，2026-07-13 新增）

R 側**沒有**主流 CTA-PLS 套件（cSEM 與 seminr 都不提供）→ 這項只能靠 SmartPLS 4。

匯入 `data/cta.csv`（n=60，九欄），建立兩個構念（**都設反映型**）：

| 構念 | 指標 | 預期判讀 |
|---|---|---|
| R | cr1, cr2, cr3, cr4, cr5 | 反映型（tetrads 應消失） |
| M | cm1, cm2, cm3, cm4 | **形成型**（tetrads 不應消失） |

路徑：`R → M`。跑 **Confirmatory Tetrad Analysis (CTA)**。要抄的是：

1. **各構念回報幾個 tetrad**（多多快跑：R 有 5 個、M 有 2 個 = k(k−3)/2）
   —— 數量若不同，代表非冗餘 tetrad 的選取邏輯不同，這是最重要的一項。
2. **每個 tetrad 的指標組合**（多多快跑：R 的第一個是 cr1,cr2,cr3,cr4）
3. 每個 tetrad 的 **value / SD / adjusted CI 上下界**
4. 兩個構念的**最終判讀**（M 應被判為形成型）
5. SmartPLS 的 **Bonferroni 是按單一構念的 tetrad 數調整，還是按全模型 tetrad 總數**？
   （多多快跑用區塊內：R 的 α_adj = .05/5、M 的 α_adj = .05/2）

多多快跑的對照數字見 `抽驗對照表.md` §N。

---

## 3. SmartPLS 4 抽驗步驟（NCA / cIPMA）

### 3.1 cIPMA

在 §2.1 的 M4 上跑 **IPMA**，並勾選 **NCA**（cIPMA；SmartPLS 4 內建）。
目標構念 = C。抄下 F1、F2 的：

- effect size d（CE-FDH 與 CR-FDH）
- permutation p
- bottleneck @ 80%（所需 X 值）

（permutation 是近似檢定，p 相近但不會逐位相同，這是預期的。）

### 3.2 純 NCA

R 的 `03_nca.R` 已覆蓋。若 SmartPLS 4 有獨立 NCA 模組，用 `data/nca.csv`
再跑一次交叉比對更好，但非必要。

---

## 4. 回報方式

- R：`out\*.txt` 三個檔直接給 AI。
- SmartPLS：填 `抽驗對照表.md` 的空欄，或直接把畫面數字念給 AI 也可以。
- **有跑到一半卡住的項目，直接說「這項跳過」**——抽驗是分批銷帳，不必一次做完。
