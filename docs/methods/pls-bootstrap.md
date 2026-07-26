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

→ `src/lib/stats/pls.js:2481–2493`（重抽迴圈）、`2445–2470`（單次估計的攤平）

PRNG 為 **Mulberry32**（確定性），種子預設 42 → **同種子逐位元可重現**。

### 3.2 符號校正（construct-level sign correction）

PLS 的每個構念可以整體翻轉而不改變適配（見 `pls-basic.md` §3.3 步驟 6）。
重抽樣本可能翻到另一邊，若不校正，路徑係數的經驗分布會出現**虛假的雙峰**、SE 被嚴重高估。

本工具的做法：以**原始估計的 loadings** 為錨（anchor），若重抽的某構念 loadings 與錨的內積為負，
就翻轉該構念的 loadings、weights 與所有觸及它的路徑。

→ `pls.js:2415–2417`（建立錨）、`2445–2470`（逐階段套用 `flip`）

`options.signCorrection`：`'construct'`（預設）／`'none'`。

### 3.3 摘要統計量

$$\text{SE}=\operatorname{sd}\left(\hat\theta^*_1,\dots,\hat\theta^*_{B'}\right)\ (\text{ddof}=1),\qquad t=\frac{\hat\theta_{\text{original}}}{\text{SE}}$$

$$p=2\cdot\Pr\left(T_{df}>|t|\right),\qquad df=B'-1$$

其中 $B'$ 為**有效**重抽數（`nValid`）。

→ `pls.js:2529`（SE）、`2530`（t）、`2531`（p）

### 3.4 percentile 信賴區間

$$\text{CI}=\left[\ Q\!\left(\tfrac{\alpha}{2}\right),\ Q\!\left(1-\tfrac{\alpha}{2}\right)\ \right]$$

$Q(\cdot)$ 為經驗分位數，採**線性內插（R type 7）**：$h=(B'-1)p$，
$Q=x_{\lfloor h\rfloor}+(h-\lfloor h\rfloor)\left(x_{\lceil h\rceil}-x_{\lfloor h\rfloor}\right)$。

→ `pls.js:2540–2541`；分位數函式在 `pls.js:141–151`

BCa 為另一種 CI，見 `pls-bca.md`。`options.ciType`：`'percentile'`（預設）／`'bca'`。

### 3.5 剔除與失敗

| 情形 | 行為 | 位置 |
|---|---|---|
| 某次重抽不收斂或退化（零變異欄、奇異矩陣） | **剔除該次**並計入 `nSkipped` | `pls.js:2484` |
| 有效重抽 < 10 | 回傳 `bootstrap-failed` | `pls.js:2496–2498` |
| BCa 的有效 jackknife < 3 | 回傳 `bca-failed`，建議改用 percentile | `pls.js:2522–2524` |

★ 實測：本工具的 M1 模型跑 $B=800$、種子 7 時 `nSkipped = 1`（0.125%）。
這代表 $df$ 是 798 而非 799——影響極小，但**使用者需要知道有樣本被剔除**（見第 6 節）。

### 3.6 由 pathDraws 派生的複合量

以下量**不另外重抽**，而是用同一批路徑係數的 draws 逐次計算後再摘要，
確保各量之間的相依關係被保留：

| 量 | 逐次的計算式 | 位置 |
|---|---|---|
| specific indirect | 鏈上路徑係數的乘積 | `pls.js:2565–2571` |
| total indirect | 各鏈乘積之和 | `pls.js:2576–2582` |
| total effect | direct ＋ 各鏈乘積之和 | `pls.js:2583–2592` |
| simple slope | $\beta_{iv}+m\cdot\beta_{int}$（二次效果為 $\beta_{iv}+2x\beta_{q}$） | `pls.js:2606–2615` |
| 條件間接效果 | $\left(a_1+a_3w\right)\left(b_1+b_3w\right)$ | `pls.js:2628–2651` |

★ 這是刻意的設計：若各量獨立重抽，中介效果的 CI 與其組成路徑的 CI 會不相容。

### 3.7 WPLS 下的限制

抽樣權重（WPLS）**只影響相關矩陣的計算**，bootstrap 仍以**未加權**方式放回抽樣。
UI 警告已明寫此事（`pls.js:2192`）。理由：加權重抽的設計 SmartPLS 未文件化。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 樣本為 i.i.d.（放回抽樣的基礎） | **不檢核** | 無警告——巢狀／時間序列資料的 bootstrap 需要不同設計，本工具不支援 | — |
| 原始估計可收斂 | 先跑一次 `runPLS` | 直接回傳該錯誤，不進重抽 | `pls.js:2404–2404` |
| 有效重抽足夠 | `nValid >= 10` | `bootstrap-failed` | `pls.js:2496–2498` |
| 樣本量 | $n<30$ 警告、$n<5$ 擋 | 見 `pls-basic.md` §4 | `pls.js:2189`、`2159` |
| $\text{SE}>0$ | 檢查後才算 $t$ | $t$ 與 $p$ 回 `null` | `pls.js:2530` |
| `ciType` 合法 | 白名單 | `ci-type-not-supported` | `pls.js:2399–2401` |

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
3. **`nSkipped` 未在 UI 揭露。** 引擎回傳 `nRequested`／`nValid`／`nSkipped` 三個數，
   但**報表沒有顯示**被剔除的次數。實測 $B=800$ 時有 1 次被剔除；若某個模型有大量剔除
   （例如接近共線），使用者會在不知情的情況下拿到基於少數重抽的 CI。**這是呈現層缺口**，見 R10。
4. **符號校正的效果未量化。** 有 `'none'` 選項，但**沒有測試比較兩者**，也沒有文件說明
   「不校正時 SE 會被高估多少」。
5. **i.i.d. 假設不檢核**（§4 第一列）。巢狀資料（學生在班級內）用一般 bootstrap 會低估 SE，
   工具不會提醒。
6. **`nValid < 10` 的門檻**（`pls.js:2496`）沒有文獻依據，是實作上的下限保護。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 原始估計 original | 全樣本估計（非 bootstrap 量） | `pls.js:2404` |
| bootstrap 平均 mean | draws 的算術平均 | `pls.js:2528` |
| SE | 3.3 | `pls.js:2529` |
| t 值 | 3.3 | `pls.js:2530` |
| p 值 | 3.3 | `pls.js:2531` |
| 95% CI 下界／上界（percentile） | 3.4 | `pls.js:2540–2541` |
| 95% CI（BCa） | 見 `pls-bca.md` | `pls.js:2535–2537` |
| 中介效果表（specific／total indirect／total） | 3.6 | `pls.js:2565–2592` |
| simple slopes 表 | 3.6 | `pls.js:2606–2615` |
| 條件間接效果表 | 3.6 | `pls.js:2628–2651` |
| 形成型權重的檢定欄 | 3.3／3.4（套用於 `weights`） | `pls.js:2666–2669` |

**孤兒欄位檢查**：回傳物件的 `nRequested`／`nValid`／`nSkipped`／`seed`／`signCorrection`／`ciType`
是**設定與診斷欄位**（非統計量）。其中 `nSkipped` **有值但 UI 不顯示**——這不是孤兒欄位
（不是「沒人說得清這欄是什麼」），而是反向的缺口：**該顯示卻沒顯示**，見 R10。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A1

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（摘要四項對 numpy／scipy，1.3e−15） |
| 2 | authority 是否支持該公式 | **通過但薄**——無專屬基準組，authority 實質依附 `pls_bca_reference` 與行為測試 |
| 3 | 文獻真實性 | 全部未取得原文；Efron & Tibshirani 1993 的取得管道已窮盡 |
| 4 | 報表可追溯 | **發現 1 項**（`nSkipped` 未揭露，R10） |
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

### R10（L2，待裁決）`nSkipped` 未在報表揭露

引擎會剔除不收斂或退化的重抽並計數，但 UI 不顯示。實測 $B=800$ 時 `nSkipped = 1`。

問題在極端情形：若模型接近共線，剔除比例可能很高，使用者拿到的 CI 實際上基於遠少於 $B$ 次的
重抽，而**報表上看不出來**。$df=B'-1$ 也隨之改變。

**建議處置**：`nSkipped > 0` 時在 bootstrap 表下方加一行註記
（「$B$ 次重抽中有 $k$ 次因不收斂或退化被剔除，推論基於 $B'$ 次」）；
比例超過某門檻（建議 5%）時升為警告。
**分級 L2**（純呈現層，不動數值）——依 §6.4 可當場修，但因涉及新增 i18n 文字與門檻選擇，列出供裁決。

### 待辦編號

本組開出 **R10（L2）**。第 6 節另列「$p$ 值口徑未對 seminr 核對」一項，需本機 R，
建議併入既有的「卡外部資源／需本機執行」清單。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
