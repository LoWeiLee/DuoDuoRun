# Bootstrap 推論（percentile CI、SE、t、p）

> 方法代號 `pls-bootstrap`｜**沒有專屬基準組**（見第 6 節）｜溯源 tier **B** / verified（依附行為測試與第三方分布函數）
> 最後更新：2026-07-26（階段 A）

---

## 1. 這個方法在回答什麼問題

PLS-SEM 的估計是一連串迭代與迴歸，路徑係數沒有封閉形式的抽樣分布。
所以「這條路徑顯著嗎」不能靠公式推導，只能用**重抽樣**逼近：

把手上的 $n$ 筆資料當成母體，**放回抽樣**再抽 $n$ 筆，重跑整個模型；重複幾千次，
得到每個參數的**經驗分布**。這個分布的標準差就是標準誤，分位數就是信賴區間。

## 2. 什麼時候該用、什麼時候不該用

**該用**：任何要談顯著性的 PLS-SEM 結果。路徑係數、形成型指標的外部權重、
中介效果、simple slopes、條件間接效果——全部靠它。

**不該用／要小心**

- **樣本本身有偏**：bootstrap 只能反映「這個樣本的變異」，不能修正抽樣偏誤。垃圾進、垃圾出。
- **極小樣本**：$n$ 太小時經驗分布粗糙，CI 會不穩。本工具在 $n<30$ 給警告、$n<5$ 直接擋。
- **WPLS（抽樣權重）**：本工具的 bootstrap **仍以未加權方式重抽**（見 §3.6），
  加權重抽的設計 SmartPLS 未文件化，本工具不擅自實作。

**常見誤用（三條）**

1. **重抽次數設太少。** 預設 5,000 次。次數不足時 CI 端點會隨種子跳動。
2. **拿 bootstrap 平均當點估計報告。** 應報**原始樣本**的估計值；bootstrap 平均只用來看偏誤。
   本工具兩者都給（`original` 與 `mean`），報表以 `original` 為主。
3. **忽略被剔除的重抽樣本。** 不收斂或退化的重抽會被剔除並計數（`nSkipped`），見 §3.5 與第 6 節。

## 3. 公式與定義

### 3.1 重抽

對 $b=1,\dots,B$（預設 $B=5000$）：從 $n$ 筆資料**放回抽樣** $n$ 筆，重跑整條估計管線
（含重新標準化、多階段的 HOC／調節、PLSc 開啟時的一致化校正），得到參數估計 $\hat\theta^*_b$。

→ `src/lib/stats/pls.js:2561–2573`（重抽迴圈）、`2445–2470`（單次估計的攤平）

PRNG 為 **Mulberry32**（確定性），種子預設 42 → **同種子逐位元可重現**。

### 3.2 符號校正（construct-level sign correction）

PLS 的每個構念可以整體翻轉而不改變適配（見 `pls-basic.md` §3.3 步驟 6）。
重抽樣本可能翻到另一邊，若不校正，路徑係數的經驗分布會出現**虛假的雙峰**、SE 被嚴重高估。

本工具的做法：以**原始估計的 loadings** 為錨（anchor），若重抽的某構念 loadings 與錨的內積為負，
就翻轉該構念的 loadings、weights 與所有觸及它的路徑。

→ `pls.js:2495–2497`（建立錨）、`2445–2470`（逐階段套用 `flip`）

`options.signCorrection`：`'construct'`（預設）／`'none'`。

### 3.3 摘要統計量

$$\text{SE}=\operatorname{sd}\left(\hat\theta^*_1,\dots,\hat\theta^*_{B'}\right)\ (\text{ddof}=1),\qquad t=\frac{\hat\theta_{\text{original}}}{\text{SE}}$$

$$p=2\cdot\Pr\left(T_{df}>|t|\right),\qquad df=B'-1$$

其中 $B'$ 為**有效**重抽數（`nValid`）。

→ `pls.js:2609`（SE）、`2530`（t）、`2531`（p）

### 3.4 percentile 信賴區間

$$\text{CI}=\left[\ Q\!\left(\tfrac{\alpha}{2}\right),\ Q\!\left(1-\tfrac{\alpha}{2}\right)\ \right]$$

$Q(\cdot)$ 為經驗分位數，採**線性內插（R type 7）**：$h=(B'-1)p$，
$Q=x_{\lfloor h\rfloor}+(h-\lfloor h\rfloor)\left(x_{\lceil h\rceil}-x_{\lfloor h\rfloor}\right)$。

→ `pls.js:2620–2621`；分位數函式在 `pls.js:145–155`

BCa 為另一種 CI，見 `pls-bca.md`。`options.ciType`：`'percentile'`（預設）／`'bca'`。

### 3.5 剔除與失敗

| 情形 | 行為 | 位置 |
|---|---|---|
| 某次重抽不收斂或退化（零變異欄、奇異矩陣） | **剔除該次**並計入 `nSkipped` | `pls.js:2564` |
| 有效重抽 < 10 | 回傳 `bootstrap-failed` | `pls.js:2576–2578` |
| BCa 的有效 jackknife < 3 | 回傳 `bca-failed`，建議改用 percentile | `pls.js:2611–2604` |

★ 實測：本工具的 M1 模型跑 $B=800$、種子 7 時 `nSkipped = 1`（0.125%）。
這代表 $df$ 是 798 而非 799——影響極小，但**使用者需要知道有樣本被剔除**（見第 6 節）。

### 3.6 由 pathDraws 派生的複合量

以下量**不另外重抽**，而是用同一批路徑係數的 draws 逐次計算後再摘要，
確保各量之間的相依關係被保留：

| 量 | 逐次的計算式 | 位置 |
|---|---|---|
| specific indirect | 鏈上路徑係數的乘積 | `pls.js:2644–2652` |
| total indirect | 各鏈乘積之和 | `pls.js:2656–2662` |
| total effect | direct ＋ 各鏈乘積之和 | `pls.js:2663–2672` |
| simple slope | $\beta_{iv}+m\cdot\beta_{int}$（二次效果為 $\beta_{iv}+2x\beta_{q}$） | `pls.js:2686–2695` |
| 條件間接效果 | $\left(a_1+a_3w\right)\left(b_1+b_3w\right)$ | `pls.js:2708–2731` |

★ 這是刻意的設計：若各量獨立重抽，中介效果的 CI 與其組成路徑的 CI 會不相容。

### 3.7 WPLS 下的限制

抽樣權重（WPLS）**只影響相關矩陣的計算**，bootstrap 仍以**未加權**方式放回抽樣。
UI 警告已明寫此事（`pls.js:2270`）。理由：加權重抽的設計 SmartPLS 未文件化。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 樣本為 i.i.d.（放回抽樣的基礎） | **不檢核** | 無警告——巢狀／時間序列資料的 bootstrap 需要不同設計，本工具不支援 | — |
| 原始估計可收斂 | 先跑一次 `runPLS` | 直接回傳該錯誤，不進重抽 | `pls.js:2484–2465` |
| 有效重抽足夠 | `nValid >= 10` | `bootstrap-failed` | `pls.js:2576–2578` |
| 樣本量 | $n<30$ 警告、$n<5$ 擋 | 見 `pls-basic.md` §4 | `pls.js:2245`、`2159` |
| $\text{SE}>0$ | 檢查後才算 $t$ | $t$ 與 $p$ 回 `null` | `pls.js:2610` |
| `ciType` 合法 | 白名單 | `ci-type-not-supported` | `pls.js:2479–2481` |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Efron, B. (1979). Bootstrap methods: Another look at the jackknife. *The Annals of Statistics*, 7(1), 1–26. | 3.1 bootstrap 的原始構想 | 【原文未取得】 |
| Efron, B., & Tibshirani, R. J. (1993). *An Introduction to the Bootstrap*. Chapman & Hall. | 3.4 percentile CI；BCa 見 `pls-bca.md` | 【原文未取得，取得管道已窮盡——見 `roadmap-v2.md` §2.3】 |

**程序指引**

| 文獻 | 用途 |
|---|---|
| Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2017/2022). *A Primer on PLS-SEM*. Sage. | $B=5000$ 的建議、報告 `original` 而非 bootstrap 平均 |
| SmartPLS 4 官方文件 | construct-level sign correction 的預設慣例、5,000 次預設 |

★ 全部未取得原文；第 3 節公式**不宣稱任何方程式編號**。

## 6. 對照與驗證狀態

**基準組**：★ **本方法沒有專屬的 `reference.json` 基準組。**

理由與代價都要講清楚：bootstrap 的輸出依賴 PRNG，跨語言的 PRNG 不可能逐值對齊，
所以無法用「對第三方逐值」的方式建立基準。本方法的防線因此是**三層行為保證**，
而不是數值基準——這一點在溯源分類上是**弱項**，據實記錄於此。

**tier / status**：tier **B** / **verified**（依附下列三層）

| 層 | 內容 | 位置 |
|---|---|---|
| 1. **摘要公式對第三方** | 以 `_keepDraws` 取出實際 draws，用 numpy／scipy 獨立重算 SE、$t$、$p$、percentile CI 四項，**最大絕對差 1.3e−15**（$p$ 值走 `scipy.stats.t.sf`，是真第三方分布函數） | 2026-07-26 階段 A，見第 8 節 R1 |
| 2. **確定性** | 同種子逐位元可重現、不同種子不同；PLSc 版同樣可重現 | `pls.test.js`「bootstrapPLS（確定性與統計性質）」4 條 |
| 3. **統計性質與代數一致性** | SE／CI／$t$／$p$ 的合理性；中介分解的代數恆等式（indirect = 路徑乘積、total = direct + totalIndirect）；simple slopes 代數一致 | `pls.test.js` W4 相關多條 |

**已知的慣例差異**

1. **$p$ 值的分布與自由度**：本工具用 $t$ 分布、$df=B'-1$。$B=5000$ 時與常態幾乎相同。
   **SmartPLS／seminr 用哪一個分布與自由度，未查核**（見下方「尚未驗證」第 2 點）。
2. **percentile 分位數的內插慣例**：R type 7（線性內插）。其他實作可能用最近秩或不內插。
3. **符號校正的錨**：本工具以原始估計的 loadings 為錨。另有實作以「重抽樣本自身的主成分方向」為準。

### ★ 尚未驗證的部分

1. **沒有數值基準組**（上述）。這是 A1 批次中溯源最薄的一項。
2. **$p$ 值口徑未對第三方核對。** $t$ 分布 vs 常態、$df=B'-1$ vs $df=n-1$ 都是可辯論的選擇，
   **本工具沒有查過 SmartPLS 或 seminr 的實際做法**。$B$ 大時差異可忽略，但 $B$ 小時會有影響。
   這需要本機 R（seminr）抽驗，屬 §8.2 的「只能在 Kevin 本機跑」類。
3. ~~`nSkipped` 未在 UI 揭露~~ **原判讀有誤**：數量本來就顯示在路徑表上方與統計卡。
   2026-07-26 補上的是**剔除比例 > 5% 時的警示**（含 $df$ 說明），見 R10。
   **仍未驗證**：5% 這個門檻是實作判斷，**無文獻依據**。
4. **符號校正的效果未量化。** 有 `'none'` 選項，但**沒有測試比較兩者**，也沒有文件說明
   「不校正時 SE 會被高估多少」。
5. **i.i.d. 假設不檢核**（§4 第一列）。巢狀資料（學生在班級內）用一般 bootstrap 會低估 SE，
   工具不會提醒。
6. **`nValid < 10` 的門檻**（`pls.js:2576`）沒有文獻依據，是實作上的下限保護。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 設定行「bootstrap N / M 次有效重抽」 | 3.5 | `zh-TW.js` 的 `pls.result.bootstrapMeta` |
| 剔除比例 > 5% 的警示 | 3.5 | `Result.jsx` 的 `bootstrapHighSkip` |
| 原始估計 original | 全樣本估計（非 bootstrap 量） | `pls.js:2484` |
| bootstrap 平均 mean | draws 的算術平均 | `pls.js:2608` |
| SE | 3.3 | `pls.js:2609` |
| t 值 | 3.3 | `pls.js:2610` |
| p 值 | 3.3 | `pls.js:2611` |
| 95% CI 下界／上界（percentile） | 3.4 | `pls.js:2620–2621` |
| 95% CI（BCa） | 見 `pls-bca.md` | `pls.js:2615–2617` |
| 中介效果表（specific／total indirect／total） | 3.6 | `pls.js:2644–2672` |
| simple slopes 表 | 3.6 | `pls.js:2686–2695` |
| 條件間接效果表 | 3.6 | `pls.js:2708–2731` |
| 形成型權重的檢定欄 | 3.3／3.4（套用於 `weights`） | `pls.js:2746–2749` |

**孤兒欄位檢查**：回傳物件的 `nRequested`／`nValid`／`nSkipped`／`seed`／`signCorrection`／`ciType`
是**設定與診斷欄位**（非統計量）。`nValid` / `nRequested` 顯示於路徑表上方的設定行與頂部統計卡；
`nSkipped` 於比例 > 5% 時觸發警示（R10）。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（摘要四項對 numpy／scipy，1.3e−15） |
| 2 | authority 是否支持該公式 | **通過但薄**——無專屬基準組，authority 實質依附 `pls_bca_reference` 與行為測試 |
| 3 | 文獻真實性 | 全部未取得原文；Efron & Tibshirani 1993 的取得管道已窮盡 |
| 4 | 報表可追溯 | **發現 1 項並已修**（R10：比例偏高無警示） |
| 5 | 假設前提 | **通過但有 2 處不檢核**（i.i.d.、符號校正效果） |
| 6 | 慣例分歧 | **發現 1 項未查核**（$p$ 值口徑，第 6 節第 2 點） |
| 7 | 邊界條件 | **通過**（三道守衛齊全：`nValid<10`、`nJackknife<3`、`SE=0`） |
| 8 | APA 敘述句 | **通過**（明寫「bootstrap 重抽 N 次（percentile／BCa 95% 信賴區間）」，未宣稱常態近似） |

### R1（通過）摘要公式對第三方獨立重算

用 `options._keepDraws` 取出 $B=800$、種子 7 的實際 path draws（有效 799 次），
以 numpy 與 `scipy.stats.t.sf` 獨立重算：

```
mean     mine=0.402017351823  js=0.402017351823  diff=3.9e-16
se       mine=0.117652600507  js=0.117652600507  diff=5.6e-17
t        mine=3.062498103634  js=3.062498103634  diff=1.3e-15
p        mine=0.002268673643  js=0.002268673643  diff=1.6e-16
ciLower  mine=0.217533949380  js=0.217533949380  diff=0.0
ciUpper  mine=0.569873543454  js=0.569873543454  diff=0.0
```

★ 這一項的性質與其他組不同：$p$ 值走 **scipy 的 $t$ 分布尾機率**，是**真第三方**；
SE 與分位數是我依 §3.3／§3.4 的文字規格重寫。因此本項同時驗了「分布函數正確」與「文件規格充分」。

### R10（L2，已修）剔除比例偏高時沒有警示

★ **本項的第一次判讀有誤，兩次判讀完整保留。**

**第一次判讀（讀碼推得，錯誤）**：「`nSkipped` 引擎有算但 UI 完全不顯示」。

**實查 UI 後的正確情況**：數量其實**已經揭露在兩個地方**——

- 路徑表上方的設定行：「bootstrap {nValid} / {nRequested} 次有效重抽（seed = …、percentile 95% CI、
  construct-level 符號校正）」（`zh-TW.js` 的 `pls.result.bootstrapMeta`）
- 頂部統計卡：值為 `nValid`、副標為 `/ nRequested`

所以使用者看得到「799 / 800」。**真正缺的是**：比例偏高時沒有任何**警示**，
而且沒有說明 $df=B'-1$ 會跟著變小。看到「745 / 800」的使用者不會意識到那是模型有問題的訊號。

**處置（Kevin 2026-07-26 核定，已執行）**：剔除比例 **> 5%** 時在結果頂部顯示警告，
內容含剔除數／總數／百分比／實際有效重抽數／對應的 $df$，並點名可能成因
（接近共線、樣本量不足、測量模型有問題）。→ `Result.jsx` 的 `bootstrapHighSkip` 區塊；
i18n 中英各一組。數量的常態顯示維持原樣（已足夠），不重複加註記。

### 待辦編號

本組開出 **R10（L2，已修）**。第 6 節另列「$p$ 值口徑未對 seminr 核對」一項，需本機 R，
已併入「卡外部資源」清單。

★ **方法論教訓（與 `pls-formative.md` 的 R7 同一條）**：R10 的第一次判讀又是讀碼推論——
看到引擎回傳 `nSkipped` 就斷定 UI 沒用它。實查 `Result.jsx` 與 i18n 後發現數量早已揭露兩處，
真正的缺口比原判讀小得多。**凡涉及「使用者看得到什麼」的檢查，一律要打開 UI 程式碼或實跑。**

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
