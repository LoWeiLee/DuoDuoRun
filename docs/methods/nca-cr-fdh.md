# 必要條件分析：CR-FDH 天花板線（Ceiling Regression – Free Disposal Hull）

> 方法代號 `nca-cr-fdh`｜基準組 `reference.json → nca_cr_fdh`（4 個統計量）｜溯源 tier **B** / verified
> 最後更新：2026-07-29（階段 A / A4）｜前置閱讀：`nca-ce-fdh.md`（scope、peers、效果量的定義都在那裡）

---

## 1. 這個方法在回答什麼問題

CE-FDH 走的是階梯（見 `nca-ce-fdh.md` §3.3）。階梯的好處是完全貼合資料，
壞處是**每一階都由單一個案決定**——資料裡的一點噪音就會讓階梯多一個轉角。

CR-FDH 回答的是同一個問題，但換一個假設：**如果 ceiling 本來就是一條直線呢？**
它對 CE-FDH 找到的那些轉角點（peers）做一條普通最小平方迴歸，
用那條直線當 ceiling。直線把個別轉角的噪音平滑掉，代價是**允許有點落在線上方**。

同一份資料通常會得到兩個不同的 $d$。本工具**兩個都報**，讓使用者自己看差多少——
差很多就代表 ceiling 的形狀假設很要緊，結論不穩健。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 理論上認為門檻隨 Y 線性上升（多要一分 Y 就多要固定量的 X）
- CE-FDH 的階梯轉角很多而且看起來像噪音
- 需要一個可以外推、可以寫成方程式的 ceiling（$y = a + bx$）

**不該用**

- ★ **ceiling 明顯非線性時**。直線會系統性地低估或高估，$d$ 隨之偏誤。本工具**不檢核線性**
- **peers 很少時**。OLS 靠 peers 撐，本基準只有 8 個 peer；$J=2$ 時直線完全由兩點決定而工具照跑
- 需要「這個 Y 水準到底要多少 X」的精確讀值時——★ 見第 6 節，本工具的 bottleneck 表**不是**用 CR 線讀的

**常見誤用**

1. ★ **拿 CR-FDH 的 $d$ 與 CE-FDH 的 $d$ 比大小當作證據。** 兩者用同一個分母（scope）但分子不同，
   差異反映的是**形狀假設**，不是「哪個比較對」
2. **忽略準確度欄。** CR-FDH 的準確度 < 100% 是**正常**的（見 §3.4），但低到某個程度就代表直線不合身
3. **把 $a+bx$ 外推到 scope 之外。** 面積計算已在 $[y_{\min},y_{\max}]$ 夾擠，外推無意義

## 3. 公式與定義

### 3.1 OLS on peers

以 CE-FDH 的 $J$ 個 peer $(\tilde x_j,\tilde y_j)$ 為樣本（**不是**全部 $n$ 個觀察值）做簡單迴歸
（`nca.js:129–140`）：

$$b=\frac{\sum_j(\tilde x_j-\bar{\tilde x})(\tilde y_j-\bar{\tilde y})}{\sum_j(\tilde x_j-\bar{\tilde x})^2},\qquad a=\bar{\tilde y}-b\,\bar{\tilde x}$$

$$\text{ceiling}_{CR}(x)=a+bx$$

★ **$\sum(\tilde x_j-\bar{\tilde x})^2=0$ 時 slope 取 0**（`nca.js:136`）——即所有 peer 的 $x$ 相同。
這是無聲的退化路徑：ceiling 變成水平線 $y=\bar{\tilde y}$，**無警告、無測試**（見第 6 節）。

### 3.2 夾擠與空白區

直線可能穿出 scope 矩形，故在 $[y_{\min},y_{\max}]$ 內夾擠後再算上方空白（`nca.js:107–126`）：

$$C_{CR}=\int_{x_{\min}}^{x_{\max}}\Bigl(y_{\max}-\min\bigl\{\max\{a+bx,\;y_{\min}\},\;y_{\max}\bigr\}\Bigr)\,\mathrm{d}x$$

實作**不是**數值積分：夾擠後的被積函數是分段線性的，斷點只可能出現在
$x_{\min}$、$x_{\max}$ 以及直線與 $y_{\min}$／$y_{\max}$ 的兩個交點
$x=(y_{\min}-a)/b$、$(y_{\max}-a)/b$。取這些斷點後逐段用梯形公式即為**精確值**（`nca.js:115–124`）。

$$d_{CR}=C_{CR}/S$$

### 3.3 效果量分級

與 CE-FDH 共用同一組基準（`nca.js:27–33`，見 `nca-ce-fdh.md` §3.5）。

### 3.4 準確度

$$\text{accuracy}=\frac{\#\{\,i:\;y_i\le a+bx_i+\varepsilon\,\}}{n},\qquad \varepsilon=10^{-9}$$

（`nca.js:143–148`）。CE-FDH 依定義恆為 1；CR-FDH **一定 $\le1$**，
落在線上方的點就是直線假設付出的代價。
★ $\varepsilon=10^{-9}$ 是為了讓恰好落在線上的點算「在線上」，屬本工具口徑，原文未定義。

### 3.5 ★ CR-FDH 的 bottleneck 不是用 CR 線讀的

引擎回傳的 `ceilings.cr_fdh.bottleneck` 是 **CE-FDH 的 bottleneck 表的複本**
（`nca.js:249`，實測兩者逐字元相同）。詳見第 6 節與 `nca-bottleneck.md` §3.4。

## 4. 假設前提與本工具的檢核方式

同 `nca-ce-fdh.md` §4（NCA 完全不進 `assumptionChecker`），另加一項本方法特有的：

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| ceiling 為線性 | ★ **完全不檢核** | 無警告。準確度欄是唯一的間接線索，但沒有門檻提示 |
| peers 的 $x$ 有變異 | 只在程式碼裡以 `sxx === 0` 退化為水平線 | ★ **無警告、無錯誤碼** |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Dul, J. (2016). Necessary Condition Analysis (NCA). *Organizational Research Methods*, 19(1), 10–52. | §3.1 CR-FDH 定義、§3.3 效果量基準 | ★ **【原文未取得】** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| R `NCA` 套件 5.0.2 | ★ 實際權威；2026-07-13 對 `intercept`／`slope` 逐值抽驗的對照方 |

## 6. 對照與驗證狀態

**基準組**：`reference.json → nca_cr_fdh`（4 個統計量：`intercept`／`slope`／`ceiling_zone`／`d`）。

**tier / status**：tier **B** / **verified**

| 道 | 內容 |
|---|---|
| 1 | ★ **R `NCA` 5.0.2 逐值抽驗**（2026-07-13）：截距與斜率一致，零差異 |
| 2 | **JS↔numpy 逐值**：`compare.test.js` 4 欄（容差 1e−6） |
| 3 | ★ **本文件的獨立重寫（2026-07-29）**：改以 `numpy.polyfit` 取代手寫正規方程、
以 400 萬點網格數值積分取代分段梯形，四個量的最大絕對差 **1.137e−13**（`d` 差 2.776e−17）。
⇒ §3.1 與 §3.2 的文字規格足以重建，且分段梯形確實是精確解而非近似 |
| 4 | ★ **R44 修正（2026-07-29）**：`source` 字串原寫「待抽驗」，已更正並完整重生（見 `nca-ce-fdh.md` §8 的 R44） |

**已知與第三方的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| bottleneck 的 ceiling | ★ **一律用 CE-FDH 的階梯** | R `NCA` 的 `bottleneck()` 逐 ceiling 技術各報一張 | ★ **實測差最大 11.61**（$x$ 全距 73.4，約 16%），見下 |
| 準確度的 $\varepsilon$ | $10^{-9}$ | 未核定 | 極小，僅影響恰在線上的點 |

### ★ 尚未驗證的部分

1. ★ ★ **Dul (2016) 原文未取得**（同 `nca-ce-fdh.md`）。`ceiling_zone` 與 `d` 兩欄**沒有被 R 抽驗涵蓋**——
   2026-07-13 只逐值核對了 `intercept` 與 `slope`。⇒ 夾擠慣例（§3.2）目前**沒有任何第三方對照**
2. ★ **`cr_fdh.bottleneck` 是 CE 表的複本**（R47，見 §8）。實測逐字元相同；改用 CR 線反查會差到 11.61
3. **`sxx = 0` 的退化分支無測試**：peers 的 $x$ 全同時 slope 取 0，路徑存在但零覆蓋
4. **線性適配度不評估**：不報 peers 的 $R^2$、不報殘差，使用者無從判斷直線合不合身
5. **peers 數量偏少時無警告**：$J=2$ 時直線由兩點完全決定，工具照跑
6. **CE 與 CR 的 $d$ 差異不提示**：兩個數字並列，但「差多少算不穩健」沒有任何指引

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 統計卡「d (CR-FDH)」＋分級 | §3.2、§3.3 | `nca.js:246–247`、`Result.jsx:196–197` |
| ★ Ceiling 表「Ceiling 方程式」欄 | §3.1 | `nca.js:243–244`、`Result.jsx:79–86`、i18n `cols.equation`／`ceilingStep`（R47） |
| Ceiling 表 CR-FDH 列「ceiling zone」 | §3.2 | `nca.js:245`、`Result.jsx:76`＋`98` |
| Ceiling 表 CR-FDH 列「d」 | §3.2 | `nca.js:246`、`Result.jsx:77`＋`98` |
| Ceiling 表 CR-FDH 列「準確度」 | §3.4 | `nca.js:248`、`Result.jsx:79`＋`98` |
| APA 敘述句的 `dCr` | §3.2 | `Narrative.jsx:30` |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `cr_fdh.intercept`／`cr_fdh.slope` | ★ **已修（2026-07-29）**——原為孤兒（有基準、有逐值比對、零 UI），現印於 ceiling 表的「Ceiling 方程式」欄（R47） |
| `cr_fdh.bottleneck` | ★ **孤兒且為 CE 表的複本**（Kevin 2026-07-29 裁決：回傳契約變更留階段 B，本批加現況鎖），見 §8 的 R47 |
| `cr_fdh.method`／`effectLabel` | 有對應呈現（列名與效果量文字） |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A4

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫最大差 1.137e−13） |
| 2 | authority | ★ R44（三組共通，見 `nca-ce-fdh.md` §8） |
| 3 | 文獻真實性 | ★ **原文未取得**，已標註 |
| 4 | 報表可追溯／孤兒欄位 | ★ **開出 R47**：`intercept`／`slope`／`bottleneck` 三個孤兒 |
| 5 | 假設前提 | ★ **不足**：線性完全不檢核 |
| 6 | 慣例分歧 | bottleneck 的 ceiling 選擇——已量化，見 §6 |
| 7 | 邊界條件 | `sxx = 0` 分支零覆蓋、peers 過少無警告 |
| 8 | APA 敘述句 | 只報 `dCr` 數值，不做宣稱——**通過** |

### R47（L2）CR-FDH 的線方程式看不到，且它的 bottleneck 是 CE 表的複本

**發現（三項，同一成因）**

1. `intercept` 與 `slope` 有基準、有逐值比對，**零 UI 消費者**。CR-FDH 的賣點正是
   「ceiling 可以寫成一條方程式」，而使用者拿不到那條方程式（比照 A3b 的 R30、A4 的 R38-a）
2. `ceilings.cr_fdh.bottleneck` **實測與 `ce_fdh.bottleneck` 逐字元相同**。
   欄位名掛在 `cr_fdh` 底下，API 消費者會以為那是 CR 線的讀值
3. bottleneck 表（`Result.jsx:107–142`）只讀 `ce_fdh.bottleneck`，**標題與註記都沒有說明是哪一條 ceiling**。
   上方的 ceiling 表才剛把 CE 與 CR 並列，讀者沒有理由知道下面那張表只跟 CE 有關

★ **實測影響**：改用 CR 線反查，逐水準所需 X 的差最大 **11.61**（$x$ 全距 73.4，約 16%）；
30% 與 40% 兩個水準的方向甚至相反（CE 讀 20.33、CR 讀 12.95 與 13.45）。**這不是捨入等級的差異。**

**處置（Kevin 2026-07-29 裁決：修呈現層，回傳契約留階段 B）**

- ✅ **(1) 已修**：ceiling 表新增「Ceiling 方程式」欄，CR-FDH 印 $y=a+bx$（CE-FDH 印「階梯函數（無線性式）」）。
  `Result.jsx:73–90`、i18n `cols.equation`／`ceilingStep` 中英各一
- ✅ **(3) 已修**：瓶頸表標題下方新增來源說明，寫明讀值一律錨定 CE-FDH 階梯，
  並**量化**改用 CR 線的差異（最大 11.61、30%／40% 方向相反）。i18n `bottleneckSource` 中英各一
- ⬜ **(2) 留階段 B**：移除或改名 `ceilings.cr_fdh.bottleneck` 屬**回傳契約變更**，
  比照 A3c 的 R35-b 處理。★ 已加一條**現況鎖**（`a4.behavior.test.js`）：
  斷言 `cr_fdh.bottleneck` 與 `ce_fdh.bottleneck` 序列化後相同——
  日後若有人改動回傳結構，測試會紅燈提醒同步改文件
