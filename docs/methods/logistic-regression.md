# 二元邏輯迴歸（Binary Logistic Regression）

> 方法代號 `logistic-regression`｜基準組 `reference.json → logistic_regression`（13）｜溯源 tier **A** / verified
> 最後更新：2026-07-30（階段 A / A6b）｜相關文件：`regression-multiple.md`（線性版）

---

## 1. 這個方法在回答什麼問題

**「這些預測變項，能不能預測『會不會發生』這件二元的事？」**

$$\ln\frac{p}{1-p}=b_0+b_1x_1+\cdots+b_kx_k$$

左邊是 **log-odds**。$e^{b_j}$ 是 **odds ratio**：$x_j$ 每增加一單位，勝算變成原本的幾倍。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 依變項為二元（通過／未通過、採用／未採用）
- 需要各預測變項在控制其他變項後的獨立效果

**不該用**

- **依變項為連續**：用線性迴歸
- **三類以上**：需要多項式邏輯迴歸（★ **本工具未實作**，E126）
- ★ **事件極少（rare events）**：$n$ 小而事件比例低時 MLE 有偏

**常見誤用**

1. ★ **把 $b$ 當機率變化解讀。** $b$ 在 log-odds 尺度上，要看 $e^b$（odds ratio）
2. ★ **拿 pseudo-$R^2$ 當線性迴歸的 $R^2$ 比較。** 三種 pseudo-$R^2$ 定義不同、數值不可互比（見 §3.3）
3. **AUC 高就宣稱模型好**：AUC 只看排序能力，不看校準

## 3. 公式與定義

### 3.1 估計：IRLS（`logisticRegression.js:58–130`）

以 **Iteratively Reweighted Least Squares** 求 MLE，與 `R::glm(family=binomial)` 同一族：

$$\boldsymbol\beta^{(t+1)}=(\mathbf X'\mathbf W\mathbf X)^{-1}\mathbf X'\mathbf W\mathbf z,\qquad
w_i=p_i(1-p_i),\quad z_i=\eta_i+\frac{y_i-p_i}{w_i}$$

收斂條件：係數最大變動 $<10^{-8}$，上限 50 次迭代（`logisticRegression.js:79–80`）。
$SE(b_j)=\sqrt{[(\mathbf X'\mathbf W\mathbf X)^{-1}]_{jj}}$，$z=b_j/SE$，雙尾常態。

### 3.2 對數概似與 LR 檢定

$$\ell=\sum_i\bigl[y_i\ln p_i+(1-y_i)\ln(1-p_i)\bigr],\qquad
LR=2(\ell-\ell_0),\quad \mathrm{df}=k$$

$\ell_0$ 為只含截距的模型。

### 3.3 ★ 三種 pseudo-$R^2$（`logisticRegression.js:190–193`）

$$R^2_{\text{McF}}=1-\frac{\ell}{\ell_0},\qquad
R^2_{\text{CS}}=1-e^{\frac{2}{n}(\ell_0-\ell)},\qquad
R^2_{\text{Nag}}=\frac{R^2_{\text{CS}}}{1-e^{\frac{2}{n}\ell_0}}$$

★ 本工具**報 McFadden 與 Nagelkerke**，Cox-Snell 只是中間值（不呈現）。
本資料集：McFadden 0.0321、Nagelkerke 0.0572 ——**同一個模型，兩個數字差 1.8 倍**。

### 3.4 AUC（`logisticRegression.js` 的 `roc`）

ROC 曲線與其下面積。★ 本工具的 AUC 與 `sklearn.roc_auc_score`、R `pROC::auc`
在本資料集**三方逐值相符**（0.61342593）。

### 3.5 退化情形（2026-07-30 實跑確認）

| 情形 | 處理 |
|---|---|
| $y$ 全為同一類 | ✅ 硬擋 `y-all-same-class` |
| 完全分離（perfect separation） | ✅ 硬擋 `singular-matrix`（IRLS 的 $\mathbf X'\mathbf W\mathbf X$ 退化） |

★ **這一支的守衛是 A6 全批最完整的**——不需要 R69／R72 型的修補。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼處理 |
|---|---|
| 依變項為二元 | Config 限二元變項 |
| log-odds 與預測變項線性 | ★ **不檢核**（Box-Tidwell 未實作，E127） |
| 觀察值獨立 | 不檢核 |
| 低共線性 | ★ **不報 VIF**——線性迴歸有、這一支沒有（E128） |
| 樣本量足夠（EPV $\ge10$） | ★ **不檢核也不提醒**（E129） |
| 非完全分離 | ✅ 硬擋 |

## 5. 參考文獻

**方法出處**

| 文獻 | 對應內容 | 取得狀態 |
|---|---|---|
| Hosmer, D. W., Lemeshow, S., & Sturdivant, R. X. (2013). *Applied Logistic Regression* (3rd ed.). Wiley. | IRLS、LR 檢定、模型診斷 | 【原文未取得】 |
| Nagelkerke, N. J. D. (1991). A note on a general definition of the coefficient of determination. *Biometrika*, 78(3), 691-692. | §3.3 的 Nagelkerke $R^2$ | 【原文未取得】 |
| McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In P. Zarembka (Ed.), *Frontiers in Econometrics*. Academic Press. | §3.3 的 McFadden $R^2$ | 【原文未取得】 |

## 6. 對照與驗證狀態

**基準組**：`logistic_regression`（13 欄）

**tier / status**：tier **A** / **verified**

| 道 | 內容 |
|---|---|
| 1 | **statsmodels `Logit` 逐值**（12 欄）＋ `sklearn.roc_auc_score`（`auc`）。★ `p_x1` 的容差目前放寬到 **1e-5**（見下） |
| 2 | ★★ **R 側交叉驗證（2026-07-30，Kevin 本機 R 4.6.0）**：`glm(family=binomial)` 的三個係數、`se`、`z`、`p` **全部對上**；`logLik(model)` = −39.08259402、`logLik(null)` = −40.38070002 逐值相符；McFadden 手算 0.03214669 相符；★ **`pROC::auc` = 0.61342593 與本工具逐值相同** |
| 3 | ★ **本文件的獨立重寫（2026-07-30）**：依 §3.1–§3.4 的文字規格以 numpy 自寫 IRLS，**不呼叫 `statsmodels.Logit` 也不呼叫 `sklearn.roc_auc_score`**（AUC 改用 Mann-Whitney $U$ 形式自行計算）。12 欄相對差 **1.8e−16 ~ 4.2e−9**，★ **`auc` 逐位元相同（0.00e+00）** |
| 4 | ★ **`llNull` 的相對差 1.4e−10 是本組最大的一項**：本工具與重寫都用閉式解 $n[\bar p\ln\bar p+(1-\bar p)\ln(1-\bar p)]$，而 statsmodels 是**迭代求 null 模型**——差異來自它的收斂容差，不是公式。連帶讓 `lrStat`／`mcFadden`／`nagelkerke` 也停在 4e−9 |

**已知與 SPSS／R 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| 估計法 | IRLS | 同 R `glm` | 一致 |
| pseudo-$R^2$ | McFadden ＋ Nagelkerke | SPSS 報 Cox-Snell ＋ Nagelkerke；R `glm` **都不報** | ★ 拿 SPSS 對照時 Cox-Snell 那一欄本工具不呈現 |
| Odds ratio 的 CI | ★ **不報** | SPSS／R 都有 | APA 要求（E130） |
| Hosmer-Lemeshow 適配檢定 | ★ **未實作** | SPSS 有 | 缺（E131） |
| 分類表與切點 | ★ **未實作** | SPSS 預設 .5 | 缺（E132） |
| VIF | ★ **不報** | R `car::vif` 可用於 glm | 缺（E128） |

### ★ 尚未驗證的部分

1. **三篇原文皆未取得**
2. ★ **`p_x1` 的 1e-5 容差**：本批未逐一重驗（A6a 掃過的三條中兩條是假放寬）。
   ★ **本組的獨立重寫顯示 `p_x1` 相對差 2.2e−14** ⇒ **這一條放寬很可能也是遺留**，
   但為求保守未在本批收回——列為 E133，收回前應先掃參數空間
3. ★ **Odds ratio 與其 CI 零基準**（本工具是否呈現 OR 見 §7）
4. **Hosmer-Lemeshow、分類表、VIF 皆未實作**
5. **從未與 SPSS 對照過**
6. ★ **參數空間未掃描**：只有 $n=60$、$k=2$、事件比例約 .5 的一個點。
   ★ **rare events 與接近完全分離的區域零基準**，而那是 MLE 最不穩的地方（E134）

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 係數表 $b$／$SE$／$z$／$p$ | §3.1 | `logisticRegression.js:58–130` |
| Odds ratio | §1 | `logisticRegression.js` 的 `coefficients[].or` |
| $\ell_0$／$\ell$／LR／df／$p$ | §3.2 | `logisticRegression.js` 的 `fit` |
| McFadden／Nagelkerke | §3.3 | `logisticRegression.js:190–193` |
| ROC 曲線與 AUC | §3.4 | `logisticRegression.js` 的 `roc` |
| 迭代次數與收斂旗標 | §3.1 | `logisticRegression.js:84–126` |

**孤兒欄位檢查**（2026-07-30 實跑）：★ **`coxSnell` 有算但不呈現**（`logisticRegression.js:191`）
——它是 Nagelkerke 的中間值，屬刻意保留；★ 但 **SPSS 使用者會找這一欄**，
呈現它的成本是零（E135）。

## 8. 紅隊檢核紀錄

**日期** 2026-07-30　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A6b

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | 逐條對得起來；獨立重寫 12 欄最大 4.2e−9（成因已查明，見 §6 第 4 道） |
| 2 | authority | provenance 為 statsmodels，與產生方一致 |
| 3 | 文獻真實性 | 三篇可查、皆標【原文未取得】 |
| 4 | 報表可追溯 | ★ `coxSnell` 算了不呈現（刻意，但 SPSS 使用者會找，E135） |
| 5 | 假設前提 | ★ **本支的硬擋是 A6 全批最完整的**（`y-all-same-class` ＋ `singular-matrix` 都正確）；但線性、EPV、VIF 三項不檢核 |
| 6 | 慣例分歧 | 六項書面化；核心是 pseudo-$R^2$ 的三種定義與「SPSS 報 Cox-Snell 而本工具不報」 |
| 7 | 邊界條件 | 實跑兩種：$y$ 全為 1（硬擋）、完全分離（硬擋）。★ **兩者都正確，不需要修補** |
| 8 | APA 敘述句 | 報係數、OR、pseudo-$R^2$；★ 應載明是哪一種 pseudo-$R^2$ |
| 9 | 數學小工具的第二套實作 | ★ 本檔自寫矩陣求逆（IRLS 用）——與 `multipleRegression.js` 的求逆**是兩份**。兩者用途不同（加權 vs 未加權）但演算法相同 ⇒ 可合併（E136，同 R71 之型） |
| 10 | 效果量的名稱與值域 | pseudo-$R^2$ 三種定義並存且數值差 1.8 倍 ⇒ **必須標名**。McFadden 值域 $[0,1]$、Nagelkerke 已正規化到 $[0,1]$，實作未見越界 |
| 11 | 掃描結論的前提 | ★ 只有事件比例約 .5 的一個點；rare events 區零基準（E134） |

### 本批本組另記錄但不修

| # | 內容 |
|---|---|
| E126 | **多項式（3 類以上）邏輯迴歸未實作** |
| E127 | **log-odds 線性前提不檢核**（Box-Tidwell 未實作） |
| E128 | **不報 VIF**：線性迴歸有、這一支沒有，而共線性對 MLE 的影響更嚴重 |
| E129 | **EPV（每變項事件數）不檢核也不提醒** |
| E130 | **Odds ratio 的 CI 未實作**（APA 要求） |
| E131 | **Hosmer-Lemeshow 適配檢定未實作** |
| E132 | **分類表與切點未實作** |
| E133 | ★ **`p_x1` 的 1e-5 容差可能是遺留**：本組獨立重寫顯示該欄相對差 2.2e−14。收回前應先掃參數空間（比照 A5b／A6a 的做法） |
| E134 | ★★ **rare events 與接近完全分離的區域零基準**：唯一的基準是事件比例約 .5 的平衡情形，而 MLE 最不穩的地方正好沒驗 |
| E135 | **`coxSnell` 算了不呈現**：SPSS 使用者會找這一欄，呈現成本為零 |
| E136 | **矩陣求逆有兩份實作**（本檔與 `multipleRegression.js`），同 R71 之型 |
