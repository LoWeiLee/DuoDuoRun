# 驗證性因素分析（Confirmatory Factor Analysis, CFA）

> 方法代號 `cfa`｜基準組 `reference.json → cfa_2factor`（5）＋`cfa_2factor_loadings`（7）＋`cfa_noncentral_chi2`（8）＋`cfa_rmsea_ci`（12）｜溯源 tier **A** / verified
> 最後更新：2026-07-29（階段 A / A4）

---

## 1. 這個方法在回答什麼問題

探索性因素分析（EFA）問「這些題目背後有幾個維度」；CFA 問的是**你先講、資料再回答**的版本：
**「我主張 i1–i3 量的是 F1、i4–i6 量的是 F2，資料支持這個主張嗎？」**

作法是：把主張寫成一個共變數矩陣的**模型**

$$\boldsymbol\Sigma(\boldsymbol\theta)=\boldsymbol\Lambda\boldsymbol\Phi\boldsymbol\Lambda^{\!\top}+\boldsymbol\Theta$$

再問「有沒有一組參數，能讓模型隱含的共變數矩陣 $\boldsymbol\Sigma$ 逼近實際觀察到的 $\mathbf S$」。
逼得夠近，就說模型**適配**；逼不近，就是你的主張與資料不合。

本工具實作的是**簡單結構**：每個指標只裝載一個因子、無交叉負荷、無相關殘差、
因子變異固定為 1 以識別模型。⇒ 這涵蓋了量表驗證的最常見情境，但**不是完整的 SEM**。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 借用既有量表、要在自己的樣本上驗證其因素結構
- 有明確的理論分組，想拿出適配指標當證據
- 需要標準化負荷量與因子相關來論證收斂與區別效度

**不該用**

- ★ **心裡還沒有明確結構時**——那該做 EFA。CFA 不會告訴你「應該是三個因子」
- **需要交叉負荷、相關殘差、二階因子、結構路徑**：★ 本工具**都不支援**，也擋不住你誤以為它支援
- **樣本很小**。守衛只有 $n\ge p+5$（`cfa.js:547`），這是**識別**下限，遠低於 CFA 的實務建議
- **指標為類別或嚴重偏態**：ML 假設多元常態，本工具**沒有** WLSMV／robust ML 等替代估計法

**常見誤用**

1. ★ **模型改到適配為止。** 適配指標好只代表「不與資料矛盾」，反覆依 modification index 修改會把樣本噪音當結構——本工具**不提供** modification index，某種程度上避開了這個陷阱
2. ★ **只看 CFI／RMSEA 不看 χ²。** χ² 是唯一有分布理論的檢定，其餘都是描述性指標
3. **拿本工具的 χ² 直接與 SPSS AMOS／lavaan 的數字比對。** ★ 見 §3.3 的 $N$ vs $N-1$ 慣例
4. **忽略未收斂或 SE 不可得的警示。** 2026-07-29 起這兩種情形已進 APA 敘述句（R39）
5. **把 RMSEA 的點估計當唯一依據。** 90% CI 才看得出精確度；小樣本時 CI 常常寬到 $[0,.20]$

## 3. 公式與定義

### 3.1 符號與模型設定

| 符號 | 意義 |
|---|---|
| $N,\ p,\ m$ | 有效樣本數、指標數、因子數 |
| $\mathbf S$ | 樣本共變數矩陣（listwise，$\mathrm{ddof}=1$；`cfa.js:42–81`） |
| $\boldsymbol\Lambda$ | $p\times m$ 負荷量（簡單結構：每列只有一個非零） |
| $\boldsymbol\Phi$ | $m\times m$ 因子共變數，**對角固定為 1** ⇒ 即因子相關矩陣 |
| $\boldsymbol\Theta$ | $p\times p$ 對角殘差變異 |

自由參數 $t=p+\tfrac{m(m-1)}{2}+p$，自由度

$$\mathrm{df}=\frac{p(p+1)}{2}-t$$

（`cfa.js:548–556`）。

★ **識別策略：固定因子變異為 1**（不是固定第一個負荷量為 1）。
這讓所有負荷量都是自由參數、都可解釋，但也代表**本工具的未標準化負荷量與 lavaan 預設輸出不同尺度**。

★ **重新參數化以避開邊界**（`cfa.js:115–154`）：
殘差變異用 $\tau=\ln\theta$（保證 $\theta>0$）、因子相關用 $z=\operatorname{atanh}\rho$（保證 $\rho\in(-1,1)$）。
⇒ **本工具不會出現 Heywood case（負殘差變異）**，因為參數化在數學上排除了它。
這是優點也是限制：真正的 Heywood 情形會表現為 $\theta\to0^+$ 而不是負值，工具**不另外警告**。

### 3.2 ML 適配函數與最佳化

$$F_{ML}(\boldsymbol\theta)=\ln\bigl|\boldsymbol\Sigma(\boldsymbol\theta)\bigr|+\operatorname{tr}\bigl(\mathbf S\,\boldsymbol\Sigma(\boldsymbol\theta)^{-1}\bigr)-\ln|\mathbf S|-p$$

（`cfa.js:191–207`）。以 quasi-Newton **BFGS ＋ 中央差分數值梯度**最小化
（`cfa.js:211–228`、`263–361`），收斂條件為 $\|\nabla F\|<10^{-6}$ 或 $\Delta F<10^{-9}$ 或 200 次迭代
（`cfa.js:575`）。起始值：負荷量 $0.7\cdot\mathrm{SD}$、因子相關 $0.3$、殘差變異 $0.5\,s_{ii}$（`cfa.js:560–570`）。

### 3.3 ★ χ² 的 $N$ vs $N-1$ 慣例

$$\chi^2=(N-1)\cdot F_{\min}$$

（`cfa.js:587`）。

★ **這是本專案最明確的一項慣例分歧。** 兩種寫法都有文獻依據：

| 慣例 | 用者 | 依據 |
|---|---|---|
| $(N-1)F$ | ★ **本工具**、AMOS、lavaan 預設 | Wishart 分布的自由度 |
| $N\cdot F$ | **semopy**（本工具的基準來源） | 概似比檢定的直接形式 |

⇒ 兩者恰差 $N/(N-1)$。本基準 $N=60$：本工具 $\chi^2=7.1044$、semopy $=7.2248$，
比值 $1.01695=60/59$，**逐位元對得上**。
`compare.test.js:61–64` 以明文 skip 記錄這四欄的差異，並另設一條 χ² 換算測試（`compare.test.js:110–116`）
**鎖住這個比值**——不是放過差異，是把差異本身變成斷言。

### 3.4 適配指標

**虛無（獨立）模型**：所有指標互不相關，$\chi^2_0=(N-1)F_0$、$\mathrm{df}_0=p(p-1)/2$（`cfa.js:372–378`、`591–593`）。

$$\mathrm{CFI}=1-\frac{\max(\chi^2-\mathrm{df},0)}{\max\bigl(\chi^2_0-\mathrm{df}_0,\ \max(\chi^2-\mathrm{df},0),\ 10^{-12}\bigr)}$$

★ 分母取 max 的第二項使 **CFI 被截斷於 $[0,1]$**（lavaan 慣例）；**semopy 不截斷**，
故本基準 semopy 報 CFI $=1.0101$、本工具報 $1.000$（`cfa.js:596–598`）。

$$\mathrm{TLI}=\frac{\chi^2_0/\mathrm{df}_0-\chi^2/\mathrm{df}}{\chi^2_0/\mathrm{df}_0-1}$$

（`cfa.js:600–605`）。★ TLI **不截斷**，可以 $>1$（本基準 1.0223）。

$$\mathrm{RMSEA}=\sqrt{\frac{\max(\chi^2-\mathrm{df},0)}{\mathrm{df}\cdot(N-1)}}$$

（`cfa.js:607–609`）。**90% CI** 以非中心 $\chi^2$ 求解（`cfa.js:425–463`）：
$\lambda_L$ 使 $P(\chi^2_{\mathrm{df},\lambda}\ge\chi^2_{\text{obs}})=.05$、$\lambda_U$ 使 $=.95$，
再代回 $\sqrt{\lambda/(\mathrm{df}(N-1))}$。
**close-fit $p$**：$P(\chi^2\ge\chi^2_{\text{obs}}\mid\lambda=.05^2\,\mathrm{df}\,(N-1))$（`cfa.js:464–468`）。

$$\mathrm{SRMR}=\sqrt{\frac{2}{p(p+1)}\sum_{i\le j}\left(\frac{s_{ij}-\sigma_{ij}}{\sqrt{s_{ii}s_{jj}}}\right)^{\!2}}$$

（`cfa.js:472–485`）。★ 分母慣例 $p(p+1)/2$（含對角）——與 `pls-fit.md` §3.4 記載的同一項慣例。

**判讀門檻**（`cfa.js:489–508`）：CFI／TLI $\ge.95$ 好、$\ge.90$ 可接受；
RMSEA $\le.06$ 好、$\le.08$ 可接受；SRMR $\le.08$ 好。★ 這組門檻是 Hu & Bentler (1999) 的慣例，
**本工具未在 UI 標注出處**。

### 3.5 標準化負荷量與標準誤

$$\lambda^{\text{std}}_i=\frac{\lambda_i}{\sqrt{\sigma_{ii}}},\qquad R^2_i=1-\frac{\theta_i}{\sigma_{ii}}$$

（`cfa.js:615–630`）。因 $\phi_{jj}=1$ 且 $\sigma_{ii}=\lambda_i^2+\theta_i$，兩式一致。

**SE**：由數值 Hessian 反矩陣估得（`cfa.js:726–777`），$z=\lambda/\mathrm{SE}$、雙尾常態 $p$（`cfa.js:664–668`）。
殘差變異因走 $\tau=\ln\theta$，SE 以 delta method 還原：$\mathrm{SE}(\theta)\approx\theta\cdot\mathrm{SE}(\tau)$（`cfa.js:673–682`）。
★ **Hessian 非正定或反矩陣失敗時 `hasStandardErrors = false`**，SE 欄整欄消失——
2026-07-29 起這件事已進 APA 敘述句（R39-b）。

## 4. 假設前提與本工具的檢核方式

★ **CFA 不在 `assumptionChecker` 的涵蓋範圍內**（`assumptionChecker.js:283–289`）。

| 前提 | 工具怎麼檢核 | 違反時 |
|---|---|---|
| $\mathbf S$ 正定 | ✅ Cholesky（`cfa.js:557`） | 回 `sample-cov-not-pd` |
| 模型可識別（$\mathrm{df}\ge0$） | ✅ `cfa.js:553` | 回 `underidentified` |
| 每因子至少若干指標、指標不重複 | ✅ `cfa.js:520–543` | 回 `too-few-indicators`／`duplicate-indicator`／`too-few-total-indicators` |
| $n\ge p+5$ | ✅ `cfa.js:547` | 回 `need-more-data` |
| 最佳化收斂 | ✅ `converged` 旗標 | 報表徽章＋★ **APA 句警語（R39-a）**；**不擋** |
| SE 可得 | ✅ `hasStandardErrors` | SE 欄消失＋★ **APA 句警語（R39-b）** |

**沒有檢核、但方法確實要求的**：

1. ★ **多元常態**。ML 的 $\chi^2$ 與 SE 都建立在常態上，工具**完全不檢核**，也沒有 robust 替代
2. ★ **樣本量足夠**。$n\ge p+5$ 就放行；6 指標時 $n=11$ 即可跑，而 CFA 的實務建議通常 $n\ge200$
3. **模型設定正確**：交叉負荷與相關殘差不支援，⇒ 真實結構若有這些，適配會差而工具不會指出原因
4. **無離群值**

## 5. 參考文獻

**方法出處**

| 文獻 | 對應段落 | 取得狀態 |
|---|---|---|
| Jöreskog, K. G. (1969). A general approach to confirmatory maximum likelihood factor analysis. *Psychometrika*, 34(2), 183–202. | §3.1 模型設定、§3.2 $F_{ML}$ | ★ **【原文未取得】** |
| Bentler, P. M. (1990). Comparative fit indexes in structural models. *Psychological Bulletin*, 107(2), 238–246. | §3.4 CFI | ★ **【原文未取得】** |
| Tucker, L. R., & Lewis, C. (1973). A reliability coefficient for maximum likelihood factor analysis. *Psychometrika*, 38(1), 1–10. | §3.4 TLI | ★ **【原文未取得】** |
| Steiger, J. H. (1990). Structural model evaluation and modification. *Multivariate Behavioral Research*, 25(2), 173–180. | §3.4 RMSEA | ★ **【原文未取得】** |
| MacCallum, R. C., Browne, M. W., & Sugawara, H. M. (1996). Power analysis and determination of sample size for covariance structure modeling. *Psychological Methods*, 1(2), 130–149. | §3.4 RMSEA 的 90% CI 與 close-fit 檢定 | ★ **【原文未取得】** — CI 定義由 `generate_reference.py` 的實作反映，**未逐式核對** |

**程序指引**

| 文獻／來源 | 用途 |
|---|---|
| **semopy** | ★ `cfa_2factor` 與 `cfa_2factor_loadings` 的基準產生方 |
| **scipy**（`ncx2`＋`brentq`） | ★ `cfa_noncentral_chi2` 與 `cfa_rmsea_ci` 的基準產生方 |
| Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes. *Structural Equation Modeling*, 6(1), 1–55. | §3.4 的判讀門檻 — ★ **【原文未取得】**，且 **UI 未標出處** |
| R `lavaan` | ★ **未使用**：本工具與 lavaan 的對照從未做過（見第 6 節） |

## 6. 對照與驗證狀態

**基準組（四組）**

| 組 | 欄位 | 來源 | tier |
|---|---|---|---|
| `cfa_2factor` | 5（`chi2`／`df`／`cfi`／`tli`／`rmsea`） | semopy(ML) | **A** |
| `cfa_2factor_loadings` | 7（6 個標準化負荷＋F1–F2 相關） | semopy(ML) 標準化解 | **A** |
| `cfa_noncentral_chi2` | 8（非中央 $\chi^2$ 尾機率格點） | scipy `ncx2.sf` | **A** |
| `cfa_rmsea_ci` | 12（4 組情境 × 上界／下界／pclose） | scipy `ncx2`＋`brentq` | **A** |

**tier / status**：tier **A** / **verified**（四組皆是）

| 道 | 內容 |
|---|---|
| 1 | **semopy 逐值**：`cfa_2factor_loadings` 7 欄逐值比對（容差 **5e−4**，實際最大絕對差 1.1e−4——放寬是因為兩套最佳化器的收斂細節不同，見 `compare.test.js:41–47`） |
| 2 | ★ **`cfa_2factor` 的四欄以明文 skip 處理**（`compare.test.js:61–64`），因 $N$ vs $N-1$ 慣例；`df` 仍逐值比對，另有一條**換算比值測試**鎖住 $\chi^2_{\text{semopy}}/\chi^2_{\text{JS}}=N/(N-1)$ |
| 3 | **scipy 逐值**：非中央 $\chi^2$ 8 個格點與 RMSEA CI 12 個量，容差 1e−6。★ 格點刻意涵蓋 $\text{ncp}\gtrsim100$（2026-07-13 修復前該區塊會塌成 ~0），且 2026-07-13 修復過「CI 上下界標籤對調」的 bug——這兩組是那次修復的回歸防線 |
| 4 | ★ **本文件的獨立重寫（2026-07-29）**：依 §3.1–3.4 的文字規格，以 **scipy `L-BFGS-B`** 重新求 $F_{ML}$ 的極小（本工具用自寫 BFGS＋中央差分梯度，是完全不同的最佳化器）。結果：$\chi^2=7.104400474$ vs 引擎 $7.104400478$（差 **4.3e−9**）、TLI 逐位元相同、7 個標準化負荷最大差 **6.4e−8**。★ 同時**再跑一次 semopy** 確認 fixture 可重現（$\chi^2$ 差 1.3e−14）。⇒ 兩套最佳化器落在同一個極小點，§3 的規格足以重建 |

**已知與 lavaan／AMOS／semopy 的慣例差異**

| 項目 | 本工具 | 他方 | 影響 |
|---|---|---|---|
| $\chi^2$ 的乘數 | $N-1$ | semopy 用 $N$；lavaan／AMOS 同本工具 | 差 $N/(N-1)$；$N$ 小時可觀（$N=60$ 差 1.7%） |
| CFI 截斷 | 截斷於 $[0,1]$ | semopy 不截斷 | 適配極好時本工具印 1.000，semopy 印 1.0101 |
| TLI 截斷 | **不截斷** | 多數軟體同 | 可 $>1$ |
| 識別方式 | 因子變異固定 1 | lavaan 預設固定首個負荷為 1 | 未標準化負荷不同尺度；**標準化解相同** |
| SRMR 分母 | $p(p+1)/2$ | 有 $p(p-1)/2$ 的版本 | 見 `pls-fit.md` §3.4 |
| 殘差變異參數化 | $\ln\theta$（排除負值） | lavaan 允許負值並警告 Heywood | ★ 本工具**不會**報 Heywood，也不警告 |

### ★ 尚未驗證的部分

1. ★ ★ **五篇方法原文全部未取得**。CFI／TLI／RMSEA／CI 的公式都只對到 scipy 與 semopy 的**輸出**，沒有對到原文方程式編號
2. ★ ★ **從未與 lavaan 對照過**。lavaan 是 CFA 的事實標準，且與本工具的 $\chi^2$ 慣例相同——
   ⇒ 這是最有價值、成本也最低的一次抽驗（Kevin 本機 R 即可），**但至今未做**。
   `cfa_rmsea_ci` 的 provenance 早已註記「可日後以 Kevin 本機 lavaan 佐證（低優先）」
3. ★ **SRMR 沒有任何基準**：`cfa_2factor` 的 5 欄不含 SRMR，semopy 的 SRMR 未取用。
   ⇒ §3.4 的 SRMR 公式與分母慣例**零第三方對照**
4. ★ **標準誤（SE／$z$／$p$）沒有任何基準**：Hessian 反矩陣路徑完全未被逐值驗證，
   delta method 還原殘差變異 SE 亦然
5. **`converged = false` 的情形沒有基準情境**：R39-a 補的警語**無法以現有 fixture 觸發**，
   目前只有 i18n 字串測試在鎖
6. **Heywood 邊界行為未探討**：$\theta\to0^+$ 時工具的表現未測
7. **多元常態違反時的行為未探討**，亦無 robust 替代
8. **僅支援簡單結構**：交叉負荷、相關殘差、二階因子、結構路徑皆未實作 ⇒ 無基準

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| 收斂徽章 | §3.2 | `cfa.js:697`、`Result.jsx:102–113` |
| $\chi^2$、df、$p$ | §3.3 | `cfa.js:587–588`、`698–700` |
| CFI／TLI＋色階 | §3.4 | `cfa.js:596–605`、`489–497` |
| RMSEA＋90% CI＋close-fit $p$ | §3.4 | `cfa.js:607–611`、`498–503` |
| SRMR＋色階 | §3.4 | `cfa.js:613`、`504–508` |
| 標準化負荷量、$R^2$ | §3.5 | `cfa.js:615–630` |
| SE／$z$／$p$（僅 `hasStandardErrors` 時） | §3.5 | `cfa.js:659–672`、`Result.jsx:196`＋`305` |
| 殘差變異＋SE | §3.5 | `cfa.js:636–641`、`673–682` |
| 因子相關矩陣 | §3.1 | `cfa.js:643–649` |
| ★ APA 句的未收斂警語 | §3.2 | `Narrative.jsx:48–51`、i18n `notConvergedCaveat`（R39-a） |
| ★ APA 句的 SE 不可得警語 | §3.5 | `Narrative.jsx:52–53`、i18n `noSeCaveat`（R39-b） |

**孤兒欄位檢查**（2026-07-29 實跑）

| 欄位 | 狀態 |
|---|---|
| `converged`／`hasStandardErrors` | ★ **已修（2026-07-29）**——原本只在 Result 徽章／SE 欄的存否上顯示，敘述句隻字未提（R39） |
| `chi2Null`／`dfNull`／`fitFunction` | ★ **孤兒**：CFI 與 TLI 由它們算出，讀者無法自行驗算。**書面記錄**（Kevin 2026-07-29 裁決），見 R46 |
| `Sigma`／`S`／`indicatorFactor`／`iterations` | **孤兒，屬中介量**。書面記錄 |
| 其餘（`loadings`／`residualVariances`／`factorCorrelations`／`fitIndices.*`／`n`／`p`／`m`／`chi2`／`df`／`pChi2`） | 全部有對應呈現 |

## 8. 紅隊檢核紀錄

**日期** 2026-07-29　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A4

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼 | **通過**（獨立重寫換最佳化器，$\chi^2$ 差 4.3e−9、負荷差 6.4e−8） |
| 2 | authority | ★ **不足**：五篇原文未取得，公式只對到 scipy／semopy 的輸出 |
| 3 | 文獻真實性 | Jöreskog (1969)、Bentler (1990)、Tucker & Lewis (1973)、Steiger (1990)、MacCallum et al. (1996) 卷期頁碼可查、真實存在；★ 皆標【原文未取得】 |
| 4 | 報表可追溯／孤兒欄位 | ★ **R39 已修**；★ **開出 R46**（`chi2Null`／`dfNull`／`fitFunction`） |
| 5 | 假設前提 | ★ **多元常態零檢核**、$n$ 下限過寬，已於 §4 誠實列出 |
| 6 | 慣例分歧 | ★ **六項全部書面化**（§6 對照表），其中 $\chi^2$ 慣例另有專屬換算測試鎖住 |
| 7 | 邊界條件 | ★ **SRMR 與 SE 零基準**、未收斂情境無 fixture、Heywood 邊界未測——記入 §6 第 3–6 項 |
| 8 | APA 敘述句 | ★ **開出並已修 R39-a／R39-b** |

### R39-a（L2，前批次交付）未收斂時 APA 敘述句隻字未提

**發現**　`converged = false` 時 Result 有徽章，但 APA 敘述句照常輸出
「模型適配如下：χ²(...) = ...；CFI = ...」——**一整段可以直接貼進論文的數字，
而那些數字全部不可靠**。使用者按「一鍵複製」時，警示留在畫面上、沒有跟著走。

**處置**　✅ 已修（`Narrative.jsx:48–51`）：句首插入
「【警告：本模型的 ML 疊代未收斂，以下所有估計值與適配指標都不可靠，不應直接引用。】」，中英各一。
★ 行為測試另鎖「措辭必須含『不可靠 / unreliable』」——弱化成「請注意」等於沒說。

### R39-b（L2，前批次交付）SE 不可得時 APA 敘述句同樣不提

**處置**　✅ 已修（`Narrative.jsx:52–53`）：句首插入 SE 不可得的說明，指出負荷量的顯著性檢定不可得。

### R46（L1）`chi2Null`／`dfNull`／`fitFunction` 是孤兒欄位

**發現**　虛無模型的 $\chi^2_0$ 與 $\mathrm{df}_0$ 是 CFI 與 TLI 的組成，lavaan 與 AMOS 都會另列
「Model Test Baseline Model」。本工具算了、回傳了，但報表上沒有 ⇒ 讀者無法自行驗算 CFI／TLI。
$F_{\min}$ 同理（$\chi^2$ 由它乘 $N-1$ 得到）。

**處置（Kevin 2026-07-29 裁決）**　**書面記錄，不改 UI**。
本節（§7）與 §3.4 已把 $\chi^2_0$、$\mathrm{df}_0$ 的定義與程式碼行號寫明，
需要驗算的讀者可循此追到。列進報表屬功能擴充，留階段 B。

### 本批本組未開出 L3／L4
