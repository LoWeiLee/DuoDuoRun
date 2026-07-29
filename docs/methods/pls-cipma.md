# 組合式重要性－績效地圖分析 cIPMA（combined IPMA × NCA）

> 方法代號 `pls_cipma`｜基準組 `reference.json → pls_cipma`（10 欄）＋ `datasets.json` 的 199 組固定排列｜溯源 tier **B** / verified
> 最後更新：2026-07-29（階段 A / A3b）

---

## 1. 這個方法在回答什麼問題

[IPMA](pls-ipma.md) 問的是「哪個構念**重要**」，而重要的意思是「它增加，目標平均會跟著增加」——
這是**充分性**邏輯（more X → more Y）。

但實務上還有另一種關係：**必要性**。有些條件不會讓結果變好，但**缺了它結果一定不好**。
（沒有預算不會自動讓專案成功，但沒有預算專案一定失敗。）
充分性分析看的是散布圖的**趨勢線**，必要性分析看的是散布圖的**左上角是不是空的**。

cIPMA（Hauff et al., 2024）把兩者疊起來問：

> 這個構念不只**重要**，還是**必要**的嗎？而且它現在的**表現**夠嗎？

三者都成立（重要 ＋ 必要 ＋ 表現差）就是**最高優先**的改善對象——
因為必要條件有「天花板」性質：**它不到某個水準，目標就不可能到某個水準**，
再怎麼加強別的構念都沒用。

★ 附帶的產物是 **bottleneck 表**：要讓目標達到 80% 的水準，這個條件至少要到幾分？
這是 cIPMA 最能直接拿去做決策的東西。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 已經跑完 IPMA，想進一步分辨「重要」與「必要」
- 理論上有理由相信某個前置構念是必要條件（**必要性不能只靠資料宣稱**，見下）

**不該用**

- 含調節項或高階構念的模型：**直接擋**（承 `ipmaPLS` 的 `rejectW4`）
- 塊內指標量尺不一：Hauff et al. §4.1 明文要求單一構念的指標同量尺，
  混合量尺＝未滿足假設（本工具警告不擋，見 [`pls-ipma.md`](pls-ipma.md) §4）
- **沒有理論支持時單憑 $d\ge.1$ 且 $p<.05$ 就宣稱必要性**——
  NCA 的效果量在小樣本很容易偶然變大，這正是為什麼原文與本工具都寫「另需理論支持」

**常見誤用**

1. **把必要性當成因果**。左上角是空的，只說明「這批資料裡沒有出現低 X 高 Y 的人」，
   不說明為什麼
2. **對非直接前置構念做 NCA**。cIPMA 只測目標的**直接前置構念**（`pls.js:3648–3651`）——
   間接路徑的必要性沒有明確的解讀
3. **忽略 NN**。bottleneck 表出現 NN（not necessary）代表**該水準沒有門檻**，
   不是「門檻是 0 分」。本工具在表上顯示 `NN` 而不是數字，就是為了避免這個誤讀
4. **拿 CE-FDH 與 CR-FDH 的 $d$ 挑大的報告**。兩者是不同的天花板定義，
   應該**並列報告**、以 CE-FDH 為主判準（原文 §5.4–5.5 的做法）

## 3. 公式與定義

### 3.1 符號表

| 符號 | 意義 |
|---|---|
| $X_i, Y_i$ | 條件構念與目標構念的 **0–100 重標定分數**（IPMA 的 `scores100`） |
| scope | 資料的實證範圍矩形 $[\,x_{\min},x_{\max}\,]\times[\,y_{\min},y_{\max}\,]$ |
| $S$ | scope 面積 $=(x_{\max}-x_{\min})(y_{\max}-y_{\min})$ |
| $C$ | ceiling zone（天花板線上方的空白面積） |
| $d=C/S$ | 效果量 |

### 3.2 輸入：IPMA 的 0–100 分數

cIPMA **不是**對原始指標跑 NCA，而是對 IPMA 的 **0–100 重標定構念分數**跑
（Hauff et al. §4.3）。→ `pls.js:3644`（先跑 `ipmaPLS`）、`3652–3656`（取 `scores100`）

★ 這個選擇的意義：0–100 分數與 IPMA 的 performance 同尺度，
所以 bottleneck 表讀出來的「所需分數」可以直接和 IPMA 圖上的 performance 對照。

**只取目標構念的直接前置構念**（Hauff et al. §4.4）：

$$\text{conditions}=\{\,p.\text{from}\ :\ p\in\text{paths},\ p.\text{to}=T\,\}$$

→ `pls.js:3648–3651`

### 3.3 CE-FDH 天花板與效果量

**CE-FDH**（Ceiling Envelopment with Free Disposal Hull）是一條**階梯狀**的天花板：
把資料點由左至右掃過去，只留下「比目前最高的 $Y$ 還高」的轉角點。

$$\text{peers}=\{(x_{(1)},y_{(1)}),\dots\}\ \text{使}\ y_{(1)}<y_{(2)}<\cdots$$

→ `nca.js:63–83`（`ceFdhPeers`；同 $x$ 值取最大 $y$、再取遞增者）

**ceiling zone** ＝ 階梯上方的空白面積：

$$C_{\text{CE}}=\sum_{j}\big(y_{\max}-y_{(j)}\big)\big(x_{(j+1)}-x_{(j)}\big)$$

（最後一段的右界取 $x_{\max}$）→ `nca.js:97–104`

$$d_{\text{CE}}=\frac{C_{\text{CE}}}{S}$$

→ `nca.js:196`

★ **$d$ 是「左上角空了多少比例」**。$d=0$ 表示左上角完全被填滿（沒有必要性），
$d$ 越大表示天花板越明顯。

### 3.4 CR-FDH 天花板

**CR-FDH**（Ceiling Regression with FDH）：對 **CE-FDH 的轉角點**做 OLS，得到一條直線天花板

$$\hat y=a+bx\quad\text{（OLS on peers）}$$

→ `nca.js:129–140`

其上方空白面積在 $[y_{\min},y_{\max}]$ **夾擠**後以分段線性精確計算
（直線可能穿出 scope 矩形），$d_{\text{CR}}=C_{\text{CR}}/S$。→ `nca.js:107–128`

★ **兩者並列報告**：CE-FDH 貼合資料但可能過擬合（階梯），CR-FDH 平滑但假設線性。
原文以 CE-FDH 為主判準、CR-FDH 供對照討論。

### 3.5 permutation 檢定

隨機重排 $Y$ 後重算 $d_{\text{CE}}$，統計量為 CE-FDH 的效果量：

$$p=\frac{\#\{\,d^{*}\ge d_{\text{CE}}\,\}}{P}$$

→ `nca.js:222–238`（本工具預設 $P=10{,}000$；`pls.js:3659` 提供 `ncaPermutations`）

★ ★ **這裡沒有 ±1 修正**，與 MGA／MICOM 的 permutation 檢定不同
（那兩處是 $(\#+1)/(P+1)$）。**本工具內部兩種慣例並存**——沿用已驗證的 NCA 助手
（對 R `NCA` 5.0.2 逐值對過），見第 6 節。

### 3.6 必要性判準

$$\text{necessary}\iff d_{\text{CE}}\ge 0.1\ \text{且}\ p<0.05$$

→ `pls.js:3682`

★ **原文另要求理論支持**，那是研究者的判斷，工具無法代勞——
本工具的 UI 註記與敘述句都寫明這一條。

### 3.7 bottleneck 表

對每個目標水準（scope 內的 % of range）讀出 CE-FDH 天花板所需的 $X$：

$$y^{*}=y_{\min}+\tfrac{\text{pct}}{100}(y_{\max}-y_{\min}),\qquad
x^{*}=\min\{\,x_{(j)}\ :\ y_{(j)}\ge y^{*}\,\}$$

（沒有任何轉角點達到 $y^*$ 時取 $x_{\max}$）→ `nca.js:154–171`

$$\text{NN}\iff x^{*}\le x_{\min}+10^{-9}$$

**「未達所需水準之案例 %」**（Hauff et al. §4.5 的 percentile 格式）：

$$\text{pctBelow}=\frac{\#\{\,i:X_i<x^{*}\,\}}{n}\times100\qquad(\text{NN 時記 }0)$$

→ `pls.js:3668–3672`

★ 這一欄才是決策資訊：「要讓目標到 80%，這個條件至少要 25 分，
而**目前有 8.3% 的案例達不到**」——直接指出改善的對象與規模。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| IPMA 的全部前提 | 先跑 `ipmaPLS` | 直接回傳其錯誤（含 W4 擋下、目標須內生等） | `pls.js:3644–3645` |
| **塊內指標同量尺**（Hauff §4.1 明文要求） | 承 IPMA 的觀察全距比值 ≥ 3 | **警告**（不擋） | `pls.js:3526–3547` |
| 目標至少有一個直接前置構念 | 掃 `model.paths` | 條件清單為空 → cIPMA 區塊不渲染 | `pls.js:3648–3651`、`Result.jsx:1387` |
| $n\ge5$、$X$／$Y$ 皆有變異 | `runNCA` 內部 | **硬擋** `cipma-nca-failed`，**指名構念** | `pls.js:3661–3663` |
| **理論支持** | ✗ **不檢核**（也不可能） | 註記與敘述句明文提醒 | i18n `cipmaNote` |

★ **最後一列是本方法最重要的未檢核前提**。$d\ge.1$ 且 $p<.05$ 是**必要條件的必要條件**，
不是充分條件——資料上的天花板可能只是樣本沒覆蓋到左上角。工具給的是燈號，不是結論。

★ **NCA 沒有分布假設**（它是無母數的幾何方法），但**對離群值極度敏感**：
左上角出現**一個**極端點就會把 ceiling zone 壓掉一大塊。本工具**不檢核離群值**，見第 6 節。

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Hauff, S., Richter, N. F., Sarstedt, M., & Ringle, C. M. (2024). Importance and performance in PLS-SEM and NCA: Introducing the combined importance-performance map analysis (cIPMA). *Journal of Retailing and Consumer Services*, 78, 103723. | §3.2–§3.7 全部程序 | **已取得**（OA：researchonline.jcu.edu.au/87274） |
| Dul, J. (2016). Necessary condition analysis (NCA): Logic and methodology of "necessary but not sufficient" causality. *Organizational Research Methods*, 19(1), 10–52. | §3.3–§3.5 的 NCA 核心 | 【原文未取得】 |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| R `NCA` 5.0.2（Dul 的官方套件） | §3.3–§3.7 的計算核心；`nca_ce_fdh`／`nca_cr_fdh`／`nca_bottleneck` 三組基準已對它逐值比對 |

★ ★ **cIPMA 原文已取得，這是 PLS 側少數如此的一組。**
但原文**全文無編號方程式**（期刊排版事實），所以 `provenance.json` 的 `authority`
以**節號＋原式**錨定，不宣稱方程式編號：
§3 效果量 $d=C/S$ 與必要性判準、§4.3 0–100 分數作 NCA 輸入、§4.4 只取直接前置構念＋CE-FDH bottleneck、
§4.5 「未達所需水準之案例 %」、§5.4–5.5 實例流程。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_cipma`（10 欄：2 個條件 × 5 欄）
＋ `datasets.json` 的 199 組固定排列（輸入型）

**tier / status**：tier **B** / **verified**

### 溯源的實際強度

| 道 | 內容 |
|---|---|
| 1 | **逐項對 Hauff et al. (2024) 全文**（2026-07-14 Session Q2）：0–100 分數作輸入、實證 scope、只取直接前置構念、CE-FDH＋CR-FDH 並列、$d\ge.1$ 且 $p<.05$、bottleneck 實際值＋未達案例 %——**六項口徑逐項一致** |
| 2 | **NCA 計算核心重用已驗證的助手**：`nca_ce_fdh`／`nca_cr_fdh`／`nca_bottleneck` 三組已對 **R `NCA` 5.0.2 逐值對過**。cIPMA 新增的只有「組合口徑」 |
| 3 | JS 與獨立 numpy 引擎逐值互驗（`compare.test.js` 10 欄） |
| 4 | **本文件的獨立重寫（2026-07-29）**：依第 3 節文字規格以 numpy 重寫（含 CE-FDH 階梯、CR-FDH 的夾擠面積、199 次 permutation、bottleneck 與 pctBelow），對 10 欄比對，**最大絕對差 3.553e−15** |

★ **本組是 PLS 側溯源強度最高的幾組之一**：原文已取得、NCA 核心已對過官方 R 套件。
它的 tier B 不是因為缺乏對照，而是因為**「IPMA × NCA 的組合」這個口徑本身**
只有原文一個來源、沒有第二個可執行實作（SmartPLS 4 授權過期）。

**已對照過的第三方**：R `NCA` 5.0.2（Kevin 本機，經由三組 NCA 基準）、numpy（沙盒）。
**沒有對照過**：SmartPLS 4 cIPMA（授權過期）。

### 已知的慣例差異

| 項目 | 本工具 | 備註 |
|---|---|---|
| permutation $p$ 的分母 | $\#/P$（**無 ±1 修正**） | 沿用已對 R `NCA` 驗過的助手；MGA／MICOM 用 $(\#+1)/(P+1)$——**工具內部兩種慣例並存** |
| bottleneck 的 ceiling | CR-FDH 的 bottleneck **也讀 CE-FDH 的天花板** | NCA 慣例（bottleneck 用實際 ceiling），`nca.js:151` 有註解 |
| 預設 permutation 次數 | 10,000（cIPMA）；基準組注入 199 組 | 原文未指定 |

### ★ 尚未驗證的部分

1. **permutation $p$ 的 ±1 慣例分歧未解決。** 本工具在 NCA 側用 $\#/P$、
   在 MGA／MICOM 用 $(\#+1)/(P+1)$。前者沿用 R `NCA` 的口徑（已對值），後者是 permutation 檢定的標準做法。
   **兩者在同一個工具裡並存**——各自都有依據，但**未曾書面說明為什麼不統一**。這是本次新記錄的一項。
2. **Dul (2016) 原文未取得。** NCA 核心的定義來自 R `NCA` 套件的行為與 cIPMA 原文的轉述。
3. **CR-FDH 的 bottleneck 讀 CE-FDH 天花板**（上表第二列）——這是 NCA 慣例，
   但**未在 UI 說明**，讀者可能以為 CR-FDH 有自己的 bottleneck 表。
4. **對離群值的敏感度未量化**（第 4 節末）。左上角一個極端點就能大幅改變 $d$，工具無警告。
5. **`effectLabel`（small／medium／large 的文字標籤）算了但 cIPMA 表不顯示**——
   NCA 模組自己的報表有顯示（`nca/Result.jsx:71`），cIPMA 表只給 $d$ 的數值。
   這是刻意的（cIPMA 表已有必要性燈號，再加一個標籤會混淆兩種判準），**本次書面記錄**。
6. **邊界條件未測**：`cipma-nca-failed` 這條路徑**無測試覆蓋**；
   「目標無直接前置構念」導致條件清單為空的情形也**無測試**。
7. **bottleneck 的水準預設為 0–100 每 10%**，原文未指定應取哪些水準；
   改變水準不影響 $d$ 與 $p$，但會改變決策讀值——**沒有敏感度說明**。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 標題 | — | `Result.jsx:1391`、i18n `cipmaTitle` |
| Importance（承 IPMA） | [`pls-ipma.md`](pls-ipma.md) §3.4 | `pls.js:3676`、`Result.jsx:1408` |
| Performance（承 IPMA） | [`pls-ipma.md`](pls-ipma.md) §3.5 | `pls.js:3677`、`Result.jsx:1409` |
| $d$ (CE-FDH) | §3.3 | `pls.js:3678`、`Result.jsx:1410` |
| $d$ (CR-FDH) | §3.4 | `pls.js:3679`、`Result.jsx:1411` |
| $p$ | §3.5 | `pls.js:3666`、`Result.jsx:1412` |
| 必要性燈號 | §3.6 | `pls.js:3682`、`Result.jsx:1413–1423` |
| bottleneck 表（各水準的所需分數＋未達案例 %） | §3.7 | `pls.js:3668–3672`、`Result.jsx:1428–1454` |
| NN 標記 | §3.7 | `nca.js:168`、`Result.jsx:1446` |
| 註記（含「另需理論支持」） | §3.6 | i18n `cipmaNote` |

**孤兒欄位檢查**：`effectLabel` 回傳但 cIPMA 表不顯示（刻意，見第 6 節第 5 點）；
其餘欄位全部有對應呈現。**本批未在 cIPMA 發現「算了但看不到」的缺口。**

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A3b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 10 欄，最大差 3.553e−15） |
| 2 | authority 是否支持該公式 | **通過**，且是全專案**唯一以「節號＋原式」錨定**的一組——因為原文全文無編號方程式。`provenance.json` 把這個排版事實寫出來，而不是虛構一個式號 |
| 3 | 文獻真實性 | **通過**。cIPMA 原文**已取得**（OA），Dul (2016) 標【原文未取得】 |
| 4 | 報表可追溯 | **通過**——本批唯一沒有「算了但看不到」缺口的一組 |
| 5 | 假設前提 | ★ **確認一項不可檢核**：理論支持（第 4 節末）。工具只能給燈號不能給結論，註記已寫明 |
| 6 | 慣例分歧 | ★ **發現一項未書面化**：permutation $p$ 的 ±1 修正在本工具內部**兩種並存**（第 6 節第 1 點）。各自有依據，但先前沒有任何地方說明為什麼不統一 |
| 7 | 邊界條件 | ★ **發現兩條路徑無測試**（第 6 節第 6 點）＋ 離群值敏感度未量化 |
| 8 | APA 敘述句 | **通過**——cIPMA 有專屬敘述句（2026-07-25 P1 補齊），且**必要性判準的三個條件（$d\ge.1$、$p<.05$、理論支持）都進了句子**，沒有過度宣稱 |

### 本批未開出 L1／L2／L3／L4

本組是 A3b 三份裡**唯一沒有開出待修項**的。第 6 節七項「尚未驗證」中，
**第 1、3、5、6、7 點先前未記錄於任何地方**，其中最值得記住的是：

★ **第 1 點：permutation $p$ 的 ±1 修正在同一個工具裡有兩種慣例。**
NCA 側用 $\#/P$（沿用 R `NCA`，已對值）、MGA／MICOM 用 $(\#+1)/(P+1)$（permutation 檢定的標準做法）。
兩者各自都對得起自己的來源，但**一個工具給出兩種 $p$ 值定義**這件事本身應該被使用者知道。
屬文件層處置（已寫入本節與第 6 節），不改數值——改任一側都會動到已對過第三方的基準。
記入 `roadmap-v2.md §6.6` 供階段 B 決定是否統一。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
