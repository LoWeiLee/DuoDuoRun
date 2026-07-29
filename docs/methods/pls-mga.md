# 多群組分析 PLS-MGA（Multigroup Analysis）

> 方法代號 `pls_mga`｜基準組 `reference.json → pls_mga_formulas`（7 欄＋2×B 筆 draws）、`pls_mga_perm`（2 欄＋40 筆 permDiffs）、`pls_mga_perm_inputs`（輸入型）｜溯源 tier **B** / verified（輸入組 tier I / exempt）
> 最後更新：2026-07-29（階段 A / A3a）

---

## 1. 這個方法在回答什麼問題

一條路徑係數 $\beta$ 是「整個樣本平均而言」的關係強度。但研究問題常常是：
**這條關係在男性與女性之間一樣強嗎？在製造業與服務業之間呢？**

MGA 回答的就是這個：**同一個模型分別在兩個群組上估計，然後檢定「兩群的某條路徑係數是否顯著不同」**。

要注意它問的**不是**「這條路徑在群組 1 顯著、在群組 2 不顯著」。
兩群各自的顯著性是兩個獨立的檢定，「一邊顯著一邊不顯著」**不等於**「兩邊有顯著差異」——
這是社科論文最常見的誤推之一。MGA 直接檢定 $\beta_1-\beta_2$，正是為了避開它。

★ **前置條件**：比較係數之前必須先確認兩群的**測量恆等性**（見 [`pls-micom.md`](pls-micom.md)）。
沒有 compositional invariance，$\beta_1\neq\beta_2$ 可能只是因為兩群的構念根本不是同一個東西。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 群組是**理論上事先界定**的（性別、產業、國別、實驗組／對照組），而且你有理論預期差異會出現在哪條路徑
- 兩群樣本量都足夠（本工具在任一群 < 30 時警告，`pls.js:2953`）

**不該用**

- **用資料找出來的群組**（例如先跑 FIMIX 或 POS 分出來的段別）：那些段別是**依變異最大化切出來的**，
  再拿去做 MGA 等於用同一批資料既切又檢定，p 值沒有意義。分段的異質性判讀請看 FIMIX／POS 自己的準則
- 群組多於兩個：本工具只支援兩群（`pls.js:2862–2864`）。三群以上需要多重比較校正，本工具**未實作**
- 尚未通過 MICOM step 2

**常見誤用**

1. **「一邊顯著、一邊不顯著」當成群組差異**（見第 1 節）
2. **挑選最好看的那個 p**。本工具同時給四個 p（permutation／Henseler／pooled t／Welch），
   它們的假設不同、數值也不同。**判讀以 permutation 為主**（假設最弱），其餘供對照。
   事後挑一個最小的報告是 p-hacking
3. **把 Henseler p 當雙尾用**。它是單尾 $P(\beta_1\le\beta_2)$，**接近 0 或接近 1 都代表差異**。
   本工具自 2026-07-29 起同時顯示雙尾版（見第 3.3 節）
4. **忘了 MGA 的兩群是各自跑完整管線**——包含各自的權重、各自的 bootstrap。
   兩群的構念分數不是同一條線性組合，這正是 MICOM 要檢查的事

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $\theta_1,\theta_2$ | 兩群各自估計的同一條路徑係數（點估計） |
| $n_1,n_2$ | 兩群的有效樣本數 |
| $\mathrm{se}_1,\mathrm{se}_2$ | 兩群各自 bootstrap 得到的標準誤 |
| $\theta^*_{1b}$ | 群組 1 第 $b$ 次 bootstrap 重抽的估計，$b=1,\dots,B$ |
| $\bar\theta^*_g$ | 群組 $g$ 的 bootstrap 平均 |
| $d=\theta_1-\theta_2$ | 觀察到的組間差異 |
| $d^*_{(p)}$ | 第 $p$ 次 permutation 重排後的組間差異 |
| $P$ | permutation 次數（預設 1000；UI 走 500） |

### 3.2 參數檢定（兩式）

**pooled t（Keil et al. 2000；等變異假設）**

$$s_p=\sqrt{\frac{(n_1-1)^2}{n_1+n_2-2}\mathrm{se}_1^2+\frac{(n_2-1)^2}{n_1+n_2-2}\mathrm{se}_2^2}\cdot\sqrt{\frac{1}{n_1}+\frac{1}{n_2}}$$

$$t_{\text{pooled}}=\frac{d}{s_p},\qquad \mathrm{df}=n_1+n_2-2$$

→ `src/lib/stats/pls.js:2787–2792`

**Welch–Satterthwaite（Sarstedt, Henseler & Ringle 2011；不假設等變異）**

$$v_g=\frac{n_g-1}{n_g}\mathrm{se}_g^2,\qquad
t_{\text{Welch}}=\frac{d}{\sqrt{v_1+v_2}},\qquad
\mathrm{df}_{\text{Welch}}=\frac{(v_1+v_2)^2}{\dfrac{v_1^2}{n_1-1}+\dfrac{v_2^2}{n_2-1}}$$

→ `pls.js:2795–2800`

兩式的 $p$ 皆為雙尾 $2\cdot P(T_{\mathrm{df}}>|t|)$。→ `pls.js:2803–2804`

★ **$(n_g-1)/n_g$ 這個加權是 Welch 式的關鍵**，也是 2026-07-13 R 抽驗抓到並修掉的一個 bug（漏了加權）。
其效果是把 bootstrap 標準誤轉成「母體式」變異數估計。

★ **$n_1=n_2$ 時兩式的 $t$ 統計量逐位元相同**（本工具實測差 0），
但 **df 與 $p$ 不同**：示範資料 $n=30/30$ 時 df 58 vs 52.23、$p$ .0194 vs .0198。
$n_1\neq n_2$ 時連 $t$ 都不同（實測 $n=40/20$：2.4038 vs 2.4154）。
這一點先前的說明文字寫成「兩組人數相等時與 pooled t 恆等」，容易被讀成「結果一樣」，
已於 2026-07-29 精確化（紅隊 R28）。

### 3.3 Henseler's MGA（單尾 bootstrap 比較）

Henseler, Ringle & Sinkovics (2009) 的成對比較，**錨點為 bootstrap 平均**：

$$c_{gb}=2\bar\theta^*_g-\theta^*_{gb}$$

$$p_{\text{Henseler}}=\widehat{P}(\theta_1\le\theta_2)=1-\frac{\#\{(b_1,b_2):c_{1b_1}>c_{2b_2}\}}{B_1B_2}$$

→ `pls.js:2821–2837`（$\bar\theta^*$ `2825–2826`、$c$ `2828–2829`、
排序後雙指針計數 `2830–2835`、回傳 `2836`）

★ **這是單尾**：$p$ 小 → 群組 1 顯著**大於**群組 2；$p$ 接近 1 → 群組 1 顯著**小於**群組 2。
本工具另回報雙尾版 $p_2=2\min(p,1-p)$（`pls.js:2929`），自 2026-07-29 起顯示於報表（紅隊 R25）。

★ **錨點是 $\bar\theta^*$ 不是 $\hat\theta$**。原實作曾以點估計 $\hat\theta$ 作鏡射錨點，
2026-07-13 對照 seminr 的 `estimate_pls_mga.R`（`2*group1_beta_mean - draw1 - 2*group2_beta_mean + draw2`）後修正。
兩者相差一個 bootstrap 偏誤，結果接近但不相同。

★ **與 cSEM 0.6.1 的差異**：cSEM 的 Henseler p 與「不做偏誤校正、直接比較原始 draws」一致，
與本式差異較大。本工具跟隨 seminr（Hair 團隊）與原文，不跟隨 cSEM。

### 3.4 permutation 檢定（主判準）

Chin & Dibbern (2010) 的程序：把兩群的列**合併**（群組 1 在前），
隨機重排列標籤後重新切成兩個 pseudo-group，各自跑完整 PLS，取路徑差 $d^*_{(p)}$。

$$p_{\text{perm}}=\frac{\#\{p:|d^*_{(p)}|\ge|d|\}+1}{P'+1}$$

其中 $P'$ 為**有效**（兩個 pseudo-group 都估計成功）的重排次數。

→ `pls.js:2885–2909`（合併 `2886`、重排 `2896`、切分 `2899`、各自估計 `2900–2901`、
累積差異 `2903–2905`）、`pls.js:2919–2921`（$p$）

★ 三個要點：

1. **分子分母各加 1**，這是 permutation 檢定的標準做法（避免 $p=0$，
   等價於把「觀察到的分割」也算成一次重排）
2. **雙尾**（比較 $|d^*|$ 與 $|d|$）
3. **估計失敗的重排被剔除**，不計入 $P'$；剔除數回報於 `nPermFailed`（`pls.js:2949`）

### 3.5 與 PLSc 併用

`consistent: true` 會一路傳進兩群的點估計、兩群的 bootstrap、以及**每一次 permutation 的重估**
（`pls.js:2869–2871` 建 `baseOpts`，後續各處沿用），所以四個檢定全部走反衰減後的相關矩陣，
不會出現「點估計校正、推論未校正」的混用。→ `pls.js:2935–2946`

★ 反衰減的分母是**各群組各自的** $\rho_A$。群組樣本小時 $\rho_A$ 不穩，
跨群的係數差異會同時反映信度估計的差異——這一點寫進了 UI 警告（`pls.js:2955`）。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| 恰兩個群組值 | 檢查 `groups` 陣列長度 | **硬擋** `mga-bad-groups` | `pls.js:2862–2864` |
| 每組至少 5 筆 | 分群後計數 | **硬擋** `mga-too-few`，訊息指名兩組實際筆數 | `pls.js:2866–2868` |
| 兩群各自可估計 | 分別跑 `runPLS` | 回傳該群的錯誤碼，訊息**指名是哪一群** | `pls.js:2873–2876` |
| 檢定力 | $n_1<30$ 或 $n_2<30$ | 警告（不擋） | `pls.js:2953` |
| PLSc 的群組層限制 | `consistent === true` | 警告＋轉呈各群的 PLSc 警告 | `pls.js:2940–2946`、`2955` |
| **測量恆等性** | ✗ **不檢核** | 只在說明文字與 APA 敘述句提醒「應先跑 MICOM」 | 見第 6 節 |

★ **最後一列是本方法最重要的未檢核前提**：MGA 不會因為沒跑 MICOM 而擋下來，也不會警告。
使用者可以在完全沒有恆等性證據的情況下得到一張看起來很正常的 MGA 表。
本工具的處置是「文字提醒」而非「硬擋」——因為恆等性判定需要研究者的實質判斷（部分恆等仍可做 MGA），
不宜由工具代決。但這是一個**誠實的弱點**，見第 6 節。

★ **MGA 支援含調節／高階構念的模型**（不呼叫 `rejectW4`），因為兩群各自跑完整管線；
MICOM／PLSpredict／IPMA 則不支援。這個不對稱寫在說明區的「限制」行。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Keil, M., Tan, B. C. Y., Wei, K.-K., Saarinen, T., Tuunainen, V., & Wassenaar, A. (2000). A cross-cultural study on escalation of commitment behavior in software projects. *MIS Quarterly*, 24(2), 299–325. | §3.2 pooled t | 【原文未取得】 |
| Sarstedt, M., Henseler, J., & Ringle, C. M. (2011). Multigroup analysis in partial least squares (PLS) path modeling: Alternative methods and empirical results. *Advances in International Marketing*, 22, 195–218. | §3.2 Welch–Satterthwaite | 【原文未取得】（卷期頁碼 2026-07-29 已查證） |
| Henseler, J., Ringle, C. M., & Sinkovics, R. R. (2009). The use of partial least squares path modeling in international marketing. *Advances in International Marketing*, 20, 277–319. | §3.3 Henseler MGA | 【原文未取得】 |
| Chin, W. W., & Dibbern, J. (2010). An introduction to a permutation based procedure for multi-group PLS analysis. In V. Esposito Vinzi, W. W. Chin, J. Henseler, & H. Wang (Eds.), *Handbook of Partial Least Squares* (pp. 171–193). Springer. | §3.4 permutation | 【原文未取得】（頁碼 2026-07-29 已查證） |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| seminr `estimate_pls_mga.R`（Hair 團隊） | §3.3 的偏誤校正錨點；2026-07-13 R 抽驗的對照實作 |
| cSEM 0.6.1 | §3.2／§3.4 的對照；§3.3 的**已知分歧**來源 |
| SmartPLS 4 Multigroup Analysis 官方文件 | 三法並列的報表版面 |

★ **四篇方法出處全部未取得原文**，第 3 節**不宣稱任何方程式編號**。
本組的 verified 建立在「對可執行第三方（seminr／cSEM）的逐值比對」，不是對原文的逐式核對——
這個區別見第 6 節。

## 6. 對照與驗證狀態

**基準組**

| 組 | 內容 | 欄位 |
|---|---|---|
| `pls_mga_formulas` | 固定 $\theta$／se／draws 輸入 → 三個檢定的公式層輸出 | 7 個統計量＋2×B 筆 draws |
| `pls_mga_perm` | 注入 40 組固定標籤指派 → 引擎層 permutation | `diffObs`、`pPerm`＋40 筆 `permDiffs` |
| `pls_mga_perm_inputs` | 40 組固定指派本身（tier **I**／exempt） | — |

**tier / status**：tier **B** / **verified**（輸入組 tier I / exempt）

### 溯源的實際強度

| 道 | 內容 |
|---|---|
| 1 | **2026-07-13 R 抽驗**：`diffObs` 0.332255 與 cSEM Chin approach 的 −0.3323 同值（僅群組相減方向不同）；permutation $p$ 以 1000 次跑得 0.042 vs cSEM 0.032（近似檢定、種子不同，**同決策**） |
| 2 | 同次抽驗對照 seminr 的 `estimate_pls_mga.R` 原始碼，**發現並修復兩個 bug**：Welch 漏了 $(n-1)/n$ 加權、Henseler 的鏡射錨點誤用點估計 |
| 3 | JS 與獨立 numpy 引擎逐值互驗（`compare.test.js`），permutation 以注入同一批固定指派達成引擎層級比對 |
| 4 | **本文件的獨立重寫（2026-07-29）**：依第 3 節文字規格以 numpy 重寫。`pls_mga_formulas` 7 欄**最大絕對差 0.0**（逐位元相同）；`pls_mga_perm` 的 `diffObs`／`pPerm` 差 1.1e−16、40 筆 `permDiffs` 最大差 3.886e−16 |

★ 第 4 道的 permutation 部分需要**完整重寫 PLS 核心**（依 `pls-basic.md` §3.2–3.5 的文字規格）
再跑 40 次雙群估計，是本批成本最高的一項；能對到 1e−16 表示第 3.4 節的三個要點
（±1 修正、雙尾、剔除失敗重排）與 §3.5 的合併順序都寫對了。

**已對照過的第三方**：cSEM 0.6.1（R，Kevin 本機）、seminr（R，原始碼層）、numpy（沙盒）。
**沒有對照過**：SmartPLS 4（授權過期）。

**已知的慣例差異**

| 項目 | 本工具 | 其他 |
|---|---|---|
| Henseler p 的偏誤校正錨點 | $\bar\theta^*$（bootstrap 平均） | cSEM 0.6.1 等同不做校正 |
| 群組相減方向 | 群組 1 − 群組 2（UI 依使用者選擇的順序） | cSEM 相反，數值同絕對值 |
| permutation $p$ 的 ±1 修正 | 有 | 未逐一查核其他實作是否一致 |

### ★ 尚未驗證的部分

1. **四篇方法出處原文皆未取得。** 第 3 節的公式來自第三方實作的原始碼與程序文件，
   **不是**對原文逐式核對。§3.2 的兩個 $t$ 式、§3.3 的鏡射式，若原文另有細節（例如 df 的取法），
   本工具無從得知。這是 tier B 的本質限制。
2. **permutation $p$ 的 ±1 修正未對第三方逐值核對**：2026-07-13 的抽驗因種子不同只能比較「同決策」，
   無法分辨 $p$ 的分母是 $P$ 還是 $P+1$。要真正鎖住需要在 cSEM 端注入同一批指派——**未做**。
3. **bootstrap SE 本身的 $p$ 值口徑未對 seminr 核對**（$t$ 分布、$\mathrm{df}=B'-1$），
   這一項自 A1 起就掛在待辦上，卡本機 R。它會連帶影響 §3.2 兩個參數檢定的輸入。
4. **測量恆等性不檢核**（第 4 節末列）。工具允許在零恆等性證據下產出 MGA 表。
   要真正防呆需要「MICOM 未跑時在 MGA 表上顯示前置未滿足」——**未實作**，屬功能擴充。
5. **三群以上不支援**，也**沒有多重比較校正**。使用者若想比較三群，只能兩兩跑，
   而工具**不會提醒**這需要 Bonferroni 之類的校正。這是一個真實的誤用入口。
6. **邊界條件未測**：`nPermFailed > 0`（部分重排估計失敗）這條路徑**無測試覆蓋**；
   $B_1\neq B_2$（兩群 bootstrap 次數不同）在 `henselerMgaP` 的分母 $B_1B_2$ 是正確的，
   但引擎目前兩群一律用同一個 $B$，**該分支未被實際走過**。
7. **`nPermValid` 偏低時沒有警告**：如果 1000 次重排只有 50 次成功，$p$ 的解析度只剩 1/51，
   報表照樣顯示三位小數的 $p$。有效次數有顯示於 meta 行，但**沒有門檻警告**。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| meta 行（兩群 $n$、bootstrap 次數、有效 permutation 次數） | §3.4 | `Result.jsx:1067–1073`、i18n `mgaMeta` |
| 路徑 | — | `pls.js:2923–2924` |
| $\beta$（群組 1／群組 2） | 各群 `runPLS` 的路徑係數 | `pls.js:2912–2913` |
| 差異 | $d=\theta_1-\theta_2$ | `pls.js:2786` |
| p (permutation) ★主判準，帶燈號 | §3.4 | `pls.js:2919–2921` |
| p (Henseler) | §3.3 單尾 | `pls.js:2836` |
| **p (Henseler 雙尾)** ★2026-07-29 新增 | $2\min(p,1-p)$ | `pls.js:2929`、`Result.jsx:1086`（表頭）、`1107`（數值） |
| p (pooled t) | §3.2 | `pls.js:2803` |
| p (Welch) | §3.2 | `pls.js:2804` |
| PLSc 標記 | §3.5 | `pls.js:2940`、i18n `mgaPlscTag` |
| 警告區 | §4 | `pls.js:2952–2958` |

**孤兒欄位檢查**：修正 R25 後，`mga.paths[]` 的每個欄位都有對應呈現。
`nPermFailed`（`pls.js:2949`）**仍未顯示**——它與 `nPermValid` 互補，
有效次數已顯示，失敗次數可由 $P-P'$ 反推，故不另立欄位（書面記錄）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A3a

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫：公式層 0.0、permutation 層 3.886e−16） |
| 2 | authority 是否支持該公式 | **通過**。`provenance.json` 誠實寫明 fixture 為 numpy 手算但已與 seminr／cSEM 逐項核對，並記錄該次抽驗抓到的兩個 bug。無「以記憶充當引用」 |
| 3 | 文獻真實性 | **通過**。四筆全部標【原文未取得】；Chin & Dibbern (2010) 的頁碼 171–193 與 Sarstedt et al. (2011) 的 22, 195–218 本次已查證屬實 |
| 4 | 報表可追溯 | ★ **開出 R25**（見下） |
| 5 | 假設前提 | ★ **發現一項未檢核前提**：測量恆等性（第 4 節末列、第 6 節第 4 點）。**維持現狀**——恆等性判定需研究者實質判斷，硬擋不恰當；已在說明文字、APA 敘述句兩處提醒 |
| 6 | 慣例分歧 | **通過**，三項差異已書面化（第 6 節表） |
| 7 | 邊界條件 | ★ **發現三處未覆蓋**（第 6 節第 6、7 點）：`nPermFailed > 0`、$B_1\neq B_2$、有效次數偏低無警告 |
| 8 | APA 敘述句 | ★ **開出 R29**（見 [`pls-micom.md`](pls-micom.md) §8）：`mgaTail` 要求讀者檢視 MICOM，而 MICOM 先前**完全不進**敘述句 |

### R25（L2，已修）雙尾 Henseler p 算了但看不到

`henselerP2 = 2·min(p, 1−p)` 在 `pls.js:2929` 算出、`pls.test.js:808` 也有斷言鎖住，
但 `Result.jsx` 只顯示單尾的 `henselerP`。

單尾值本身沒有錯，說明文字也講明了「接近 0 或 1 都代表差異」——
但要求讀者自己做 $2\min(p,1-p)$ 這個換算，是把工具該做的事推給使用者，
而且 $p=0.97$ 這種值在表上看起來像「非常不顯著」。

**處置（Kevin 2026-07-29 核定）**：MGA 表新增「p (Henseler 雙尾)」欄，沿用 `toneForP` 燈號語意色。
`Result.jsx:1086`（表頭）、`1107`（數值）、`1101`；i18n 中英各一（`mgaColHenseler2`）。引擎與 fixture **零改動**。

### R28（L1，當場修）「與 pooled t 恆等」的措辭不精確

`mgaNote` 原寫「兩組人數相等時與 pooled t 恆等」。實跑：

```
n1 = n2 = 30   t_pooled = t_Welch = 2.404991730065274（差 0）
               df 58 vs 52.2325       p .01938 vs .01975
n1 = 40, n2 = 20  t 2.403844 vs 2.415409（差 .0116）
                  p .01944 vs .02056
```

敘述沒錯（說的是 $t$），但容易被讀成「結果一樣」。已改為明示「$t$ 逐位元相同，
但自由度與 $p$ 不同」並附實測數字。中英各一處。

### 本批未開出 L3／L4

三個檢定的公式層與引擎層都對得起獨立重寫，無數值問題。
第 6 節新增的七項「尚未驗證」中，**第 2、5、6、7 點先前未記錄於任何地方**——
特別是第 5 點（測量恆等性不檢核）與第 7 點（有效重排次數偏低無警告），
是使用者可以在不知情的狀況下踩到的誤用入口。兩者皆屬功能擴充，記入 `roadmap-v2.md §6.6` 待辦。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
