# 多多快跑 PLS-SEM 開發路線圖 v1（2026-07-04）

本文件是 `optimization-roadmap-v1.md` Phase 3 的展開，以 SmartPLS 4 全功能為長期路徑圖，
按波次（wave）遞進。SmartPLS 4 功能清單已於 2026-07-04 依官方文件查證
（smartpls.com「Algorithms and Techniques」與「What's new in SmartPLS 4」）。

## 前言：定位與原則

**目標定位：複製 SmartPLS 4 的數字與工作流程，不複製其介面外觀。**
使用者在多多快跑跑出的每一個係數、p 值、信賴區間，都應與 SmartPLS 4 /
R（seminr、cSEM）在同設定下一致（浮點與 bootstrap 隨機性容差內）；
但介面遵循多多快跑自己的設計語言（Phase 2 儀表板），不模仿 SmartPLS 外觀。

**架構原則：模型宣告與畫布解耦。**
PLS 引擎唯一的輸入是「模型 JSON」（潛在變數、指標、路徑、測量模式、演算法選項），
唯一的輸出是「結果 JSON」。表單式宣告器（Wave 1）與拖拉式畫布（Wave 2）
只是產生同一份模型 JSON 的兩種編輯器；引擎、報表、測試都不知道畫布存在。
這使得：(1) 引擎可在 Node（Vitest）與瀏覽器（Web Worker）雙環境跑同一份程式；
(2) 基準比對直接餵模型 JSON，不經 UI；(3) 畫布可以晚做、慢做、甚至重做，不動引擎。

**每一波的交付判準（三條，全數成立才算交付）：**
1. 數字對齊基準——該波所有新統計量與 R/Python 基準值比對通過（管線沿用
   `validation-report-v1.md`：`tests/generate_reference.py` → `fixtures/*.json` → Vitest）
2. `npm test` 綠燈——含既有 180+ 斷言，確保不回歸
3. 可獨立上線——該波功能對使用者是完整可用的切片，不留半成品入口

## SmartPLS 4 功能覆蓋對照（2026-07-04 查證）

官方 PLS-SEM 功能 → 波次配置：

| SmartPLS 4 功能 | 波次 | | SmartPLS 4 功能 | 波次 |
|---|---|---|---|---|
| PLS-SEM 演算法（三種 scheme） | W1/W3 | | Higher-order Models | W4 |
| Bootstrapping（percentile/BCa） | W1/W3 | | Mediation | W4 |
| 缺失值處理（mean/casewise/pairwise） | W1 | | Moderation（two-stage、多向交互、simple slope） | W4 |
| HTMT 與區辨效度 | W1 | | Nonlinear（二次效果）＊增補 | W4 |
| Consistent PLS（PLSc）＋ consistent bootstrap | W3 | | MGA ＋ Permutation | W5 |
| Model Fit（SRMR、d_ULS、d_G、NFI、χ²） | W3 | | MICOM | W5 |
| GoF index＊增補（官方文件列出但不建議） | W3 | | PLSpredict ＋ CVPAT | W5 |
| Blindfolding（Q²） | W3 | | Model Comparison（BIC/AIC）＊增補 | W5 |
| CCA 工作流程＊增補 | W3 | | IPMA | W5 |
| 標準化/非標準化/mean-centered 估計＊增補 | W3 | | FIMIX-PLS、PLS-POS＊增補 | W6 |
| | | | CTA-PLS、NCA、Gaussian copula、WPLS＊增補 | W6 |

**查證後對原骨架的修正：**
- **調節三法修正**：SmartPLS 4 的調節**只用 two-stage**（自動補主效果路徑、
  交互項不標準化；官方 Moderation 文件明載）。product indicator 與 orthogonalizing
  是 SmartPLS 3 / seminr 的選項。故 Wave 4 以 two-stage 為對齊目標，
  另兩法降為「與 seminr 對齊」的選配。
- **增補**（原骨架遺漏、SmartPLS 4 有）：非線性二次效果（W4）、simple slope 圖（W4）、
  三向以上交互（W4）、CCA 工作流程（W3）、GoF index（W3，附不建議註記）、
  標準化/非標準化/mean-centered 三種估計（W3）、模型比較 BIC/AIC 與
  prediction-oriented model selection（W5）、consistent MGA/permutation（W5）、
  PLS-POS（W6）、WPLS 加權 PLS（W6）、由 LV 分數產生新資料檔（W4）。
- **明確排除**（SmartPLS 4 有、但不屬本路線圖）：GSCA（另一套估計典範，需求出現再評）；
  Regression／Logistic Regression／Path Analysis + PROCESS（與既有 26 模組重疊，
  PROCESS 式條件間接效果併入 W4 backlog）；PCA（既有 EFA 模組）；
  CB-SEM/CFA（多多快跑已有 CFA 模組，完整 CB-SEM 維持原路線圖的可行性 spike 承諾，見 W6）；
  Excel/SPSS 檔直讀、報表存檔比對等桌面軟體工作流程（另屬資料匯入 backlog）。

---

## Wave 0：基建（模型 JSON schema ＋ Worker 架構 ＋ 基準管線）

**範圍**
- 模型 JSON schema v1：`latentVariables[]`（名稱、指標清單、測量模式 reflective/formative）、
  `paths[]`（from/to）、`options`（weighting scheme、缺失值策略、bootstrap 設定、種子）。
  含 schema 版本欄位與驗證器（壞模型要在進引擎前被擋下並給中文錯誤訊息）
- Web Worker 運算架構：引擎程式碼同構（Node/Worker 雙跑）、進度回報協定
  （bootstrap 完成百分比）、可取消。此基建同時供既有 EFA/CFA 大樣本效能問題復用
- 基準管線擴充：`generate_reference.py` 加 PLS 區塊。**基準來源查證結果**——
  首選 R（seminr ＋ cSEM），但沙盒裝不了 R（Phase 1 已確認）；Python 備援用
  **plspm**（PyPI，GoogleCloudPlatform/plspm-python，R plspm 的移植並吸收部分 seminr 功能）：
  已查證支援 centroid/factorial/path 三種 scheme、反映型/形成型、缺失值、bootstrap，
  **可覆蓋 Wave 1 核心**；但 rho_A、HTMT、PLSc、SRMR、PLSpredict、MICOM 等進階量
  plspm 不齊，須以 NumPy 依公式手算入基準（公式明確、皆為相關矩陣代數，風險低），
  並由 Kevin 本機 R（seminr/cSEM）抽驗複核。另一候選 pylspm（lseman/pylspm）功能面較廣
  但成熟度未驗證，列為第二意見來源，不作主基準
- 測試資料集：沿用 seed=42 慣例，造一份教科書型資料（3–4 個 LV、反映型為主、n≈250）
  ＋ 邊界集（小樣本 n=50、含缺失值、含形成型區塊）

**驗證基準**：schema 驗證器單元測試；Worker 協定煙霧測試；管線能產出並讀回 PLS fixtures。
**預估工作階段數**：1–2。
**交付判準**：schema 文件化＋驗證器過測試；Worker 跑通假運算並回報進度；
`generate_reference.py` PLS 區塊產出第一份 fixture。（本波無使用者可見功能，
「可獨立上線」判準改為：不影響既有功能上線。）

## Wave 1：核心引擎 ＋ 表單式宣告 ＋ 標準報表

**範圍**
- PLS-SEM 迭代估計：path weighting scheme（SmartPLS 4 預設）、反映型測量（Mode A）、
  標準化資料、收斂準則與最大迭代數對齊 SmartPLS 預設（stop criterion 1e-7、300 次）
- 缺失值基本處理：mean replacement 與 casewise deletion（pairwise 列 W3）
- Bootstrap percentile CI：跑在 Web Worker，預設 5,000 次、可設定、固定種子可重現；
  回報路徑係數、loadings、HTMT 等的 SE、t、p、CI
- 標準報表（一次到位，這是論文使用者的最小完整集）：outer loadings、
  Cronbach's α、rho_A、rho_c（CR）、AVE、Fornell-Larcker、cross-loadings、HTMT、
  內部 VIF、路徑係數＋CI、R²/adj R²、f²、LV 描述統計與相關矩陣
- 表單式模型宣告器：建在 Phase 2 新 UI 上（下拉＋多選建 LV 與路徑），產出模型 JSON；
  報表沿用既有模組的 Result/Narrative/Notes 架構（含 APA 敘述與假設檢核紅綠燈）

**驗證基準**：plspm（scheme、scores、loadings、路徑係數、R²、bootstrap SE 統計性質）；
rho_A/HTMT/f²/VIF/Fornell-Larcker 以 NumPy 手算入 fixture；Kevin 本機 seminr 抽驗一份完整報表。
bootstrap 比對用「大 B 下的統計容差」而非逐值相等。
**預估工作階段數**：3–4。
**交付判準**：教科書資料集全報表數字對齊；n=50 與含缺失值邊界集不炸並給合理警告；
`npm test` 綠燈；表單式宣告器可完整跑完一篇論文的測量＋結構模型評估。

## Wave 2：拖拉式畫布

**範圍**
- React Flow（MIT 授權）建模畫布：拖拉 LV、連路徑、指標自動排列（環繞 LV 的扇形/矩形布局）
- 結果覆蓋層：估計後在圖上標路徑係數、p 值星號、R²（SmartPLS 使用者的核心心智模型，
  但視覺風格走多多快跑自己的 design tokens）
- 模型圖匯出：SVG/PNG，黑白可印、期刊解析度（論文用）
- 畫布與表單雙向同步（同一份模型 JSON）；表單式降為資料層檢視與手機 fallback

**驗證基準**：本波不新增統計量——迴歸測試確保引擎零改動（`npm test` 全綠即可）；
畫布→JSON 序列化的往返（round-trip）單元測試；匯出圖的快照測試。
**預估工作階段數**：2–3。
**交付判準**：畫布建的模型與表單建的同構 JSON 產出逐位元相同結果；
匯出圖可直接進論文；手機上 fallback 到表單式不失功能。

## Wave 3：SmartPLS 對齊深化（估計選項與模型評估補齊）

**進度註記（2026-07-04）**：核心切片已交付 ✅——
- [x] 形成型測量（Mode B）：outer weights bootstrap 檢定、外部 VIF、formative 專屬報表區
- [x] 三種 weighting schemes（path／factorial／centroid）
- [x] PLSc ＋ consistent bootstrapping
- [x] BCa bootstrap CI（percentile 維持預設）
- [x] Model fit：SRMR、d_ULS、d_G、NFI（saturated vs estimated 兩欄；χ² 與 GoF 未列）
- [x] Blindfolding Q²（omission distance 預設 7、構念層 cross-validated redundancy）
- [x] 標準化／非標準化估計（2026-07-06：併入 W5 IPMA 的非標準化流程）
- [x] CCA 工作流程指引（Notes「怎麼讀」步驟 7）；GoF index（附不建議註記）
- [ ] pairwise deletion（相關矩陣驅動引擎設計完成，實作交接 → handoff-roadmap）

驗證：plspm（scheme／形成型）＋ numpy 手算（PLSc／fit／Q²／BCa，附文獻出處）全部對齊，
`npm test` 337 過（見 `validation-report-v1.md` W3 增補節）；
PLSc／SRMR／Q² 待 Kevin 本機 SmartPLS 4／seminr 抽驗複核。

**範圍**
- 形成型測量完整支援：outer weights ＋ bootstrap 顯著性檢定、外部 VIF、
  formative 專屬報表區（權重、負荷量備援判讀）
- 三種 weighting schemes 齊備：path／factorial／centroid
- PLSc（consistent PLS）：含 consistent bootstrapping（官方文件：PLSc 專用 bootstrap 流程）
- BCa bootstrap（SmartPLS 4 的 CI 選項之一；percentile 維持預設）
- Model fit：SRMR、d_ULS、d_G、NFI、χ²（saturated vs estimated model 兩欄）；
  GoF index 一併提供但依官方文件註記「不建議作為適配指標」
- Blindfolding Q²（omission distance 預設 7，SmartPLS 慣例）
- 標準化／非標準化／mean-centered 三種估計（SmartPLS 4 新增，影響調節與 IPMA 的下游）
- pairwise deletion；CCA（確認性組合分析）作為「工作流程指引」呈現——
  它是既有指標的評估程序而非新演算法，以報表導覽＋Notes 實作

**驗證基準**：cSEM（PLSc、SRMR/d_ULS/d_G、三 scheme）為主——由 Kevin 本機 R 產基準 JSON
入庫（管線支援「外部貢獻的 fixture」）；沙盒內 plspm 驗 scheme 與形成型；
blindfolding 手算小例對齊。
**預估工作階段數**：3–4。
**交付判準**：同一模型在 SmartPLS 4 與多多快跑切換 scheme/PLSc/CI 法，數字逐項對齊；
形成型模型全流程可用；`npm test` 綠燈。

## Wave 4：研究設計進階（調節、高階構念、中介）

**進度註記（2026-07-04）**：全數交付 ✅——
- [x] 調節 two-stage（自動補主效果路徑、交互項不標準化；`coefStd` 保留標準化值）
- [x] 三向以上交互（分數連乘）；二次效果（同機制，分數平方）
- [x] simple slope（±1 SD 條件斜率，點估計＋bootstrap CI；Result 附三線圖／二次曲線 SVG）
- [x] product indicator 與 orthogonalizing 選配（對齊 seminr，標準化量尺）
- [x] 高階構念三法：repeated indicators／disjoint two-stage／embedded two-stage
- [x] 「以 LV 分數產生新資料檔」（result.derived；UI 可下載 CSV）
- [x] 中介分解：direct／specific indirect／total indirect／total、VAF、
      Zhao et al. (2010) 類型判讀（Narrative）；bootstrap CI（percentile／BCa 皆支援）
- 模型 JSON schema v3：`interactions[]` 與 `higherOrder[]` 欄位（schemaVersion 維持 1，只加不改）
- 範圍限制：PLSc 與 blindfolding Q² 不支援 W4 模型（引擎明確報錯）；
  Worker 接線順延 W5（兩階段 bootstrap 成本約 2–3 倍，示範資料量仍在秒級）

驗證：plspm（two-stage 第一階段、HOC repeated 欄位別名雙實作）＋ numpy 手算
（全部 9 組 W4 基準，附文獻出處）全部對齊至機器精度（≤ 1.5e-14），
`npm test` 423 過（見 `validation-report-v1.md` W4 增補節）；
two-stage 交互項係數、HOC 兩階段流程、PI／orthogonal 待 Kevin 本機 SmartPLS 4／seminr 抽驗。

**範圍**
- 調節：**two-stage 為對齊 SmartPLS 4 的主路徑**（自動補「調節變數→依變數」路徑、
  交互項不標準化——官方文件明載的兩個行為都要複製）；三向以上交互；
  simple slope plot（±1 SD 三線圖）；product indicator／orthogonalizing 作為選配
  （對齊 seminr，供方法學比較需求）；二次效果（nonlinear）用同一套交互項機制實作
- 高階構念：repeated indicators 與 two-stage（含 disjoint two-stage）兩法；
  「以 LV 分數產生新資料檔」作為 two-stage 的顯式步驟（對齊 SmartPLS 4 工作流程）
- 中介分析報表：specific/total indirect effects 的 bootstrap CI、
  direct/indirect/total 分解表、VAF 註記與 Zhao et al. 類型判讀 Narrative
- backlog：moderated mediation（條件間接效果，對齊 PROCESS 式輸出）——
  機制與本波同源，需求出現即可低成本補上

**驗證基準**：seminr（Kevin 本機；seminr 原生支援三種交互項生成法與兩種 HOC 法、
中介效果 bootstrap）；沙盒 plspm 可驗 repeated indicators 與間接效果點估計；
simple slope 為代數導出，手算入 fixture。
**預估工作階段數**：2–3。
**交付判準**：教科書調節案例（如 corporate reputation 模型）數字對齊 seminr；
高階構念兩法結果可互驗；中介報表含完整 CI；`npm test` 綠燈。

## Wave 5：群組與預測

**進度註記（2026-07-06）**：核心交付 ✅——
- [x] PLS-MGA：Henseler's MGA（單尾 bootstrap 比較）＋ permutation ＋ 參數檢定
      （pooled／Welch-Satterthwaite）三法並列
- [x] MICOM 三步驟：configural（程序性）＋ compositional invariance（c 與
      permutation 5% 分位）＋ 等平均/等變異（permutation 95% CI）
- [x] PLSpredict：k-fold（預設 10）、Q²predict、LM 基準、RMSE/MAE 比較表與
      Shmueli et al. (2019) 四級判讀 Notes
- [x] CVPAT：PLS vs IA 與 PLS vs LM（逐案損失成對 t 檢定）
- [x] 模型比較 IT 準則：AIC／AICc／BIC／HQ（每個內生構念自動回報）
- [x] IPMA：構念層＋指標層、非標準化總效果 × 0–100 績效、象限圖（SVG）
- [x] 群組變數 UI（欄位＋兩群組值選擇器）；Worker 接線（bootstrap 與
      permutation 全部進 Web Worker，進度條驅動）
- 順延：MGA 的 consistent（PLSc）版（PLSc 目前限一般單群組模型）；
  PLSpredict 多次重複取平均（SmartPLS 預設 10 reps，本版單次固定種子）；
  MICOM／PLSpredict／IPMA 對 W4 管線模型的支援——見 handoff-roadmap

驗證：pls_mga_perm 與 pls_predict 用「固定 permutation／fold 指派」做引擎層級
交叉驗證（numpy 與 JS 兩套實作的逐 pseudo-group 估計差逐值對齊 ≤ 1.9e-14）；
公式層（參數檢定／Henseler p／IT 準則／IPMA／GoF）numpy 手算全對齊。
`npm test` 541 過（見 validation-report W5 增補節）。

**範圍**
- PLS-MGA：Henseler's MGA ＋ permutation test ＋ 參數檢定（含 Welch-Satterthwaite），
  對齊 SmartPLS 4 的 MGA 報表三法並列；consistent（PLSc）版 MGA/permutation 一併支援
- MICOM 測量恆等性：三步驟（configural、compositional invariance permutation、
  等均值/等變異）完整報表，作為 MGA 的前置檢核（UI 上強制推薦順序）
- PLSpredict：k-fold（預設 k=10）、Q²predict、PLS vs LM 的 RMSE/MAE 比較表與判讀 Narrative
- CVPAT：PLS vs indicator-average（IA）與 PLS vs LM 的預測能力檢定
- 模型比較：BIC/AIC/GM 等 IT 準則 ＋ prediction-oriented model selection
  （對齊 SmartPLS 4 Model Comparison 報表）
- IPMA：importance（非標準化 total effects）× performance（0–100 重標定分數），
  LV 層與指標層兩張圖——依賴 Wave 3 的非標準化估計
- 群組變數 UI：沿用既有模組的分組欄位選擇器

**驗證基準**：cSEM `testMGD`/`testMICOM`（Kevin 本機）；seminr PLSpredict；
CVPAT 依 Liengaard et al. 公開程式碼複算；IPMA 無現成 R 主流實作，
以官方文件公式手算＋已發表教科書範例數字（Ringle & Sarstedt 2016 corporate reputation）雙重驗證；
permutation/k-fold 用固定種子＋統計容差。
**預估工作階段數**：3–4。
**交付判準**：MGA 三法與 MICOM 三步數字對齊；PLSpredict 表與 seminr 一致；
IPMA 重現教科書範例；`npm test` 綠燈。

## Wave 6：探索與長尾

**範圍**（各項相互獨立，可按需求優先序單獨出貨；每項≈1 階段）
- FIMIX-PLS：潛在異質性分段（EM 演算法、分段數選擇準則 AIC/BIC/CAIC/EN）
- PLS-POS：prediction-oriented segmentation（與 FIMIX 互補，SmartPLS 4 內建，原骨架遺漏之增補）
- CTA-PLS：確認性四分差分析（測量模式 reflective vs formative 的實證檢核）
- NCA：必要條件分析含 CE-FDH/CR-FDH ceiling、bottleneck 表、permutation 顯著性檢定；
  完成後可再談 cIPMA（NCA×IPMA 組合，SmartPLS 生態近年主推）
- Gaussian copula 內生性檢查：copula 項顯著性檢定，含非常態性前提檢查（Hult et al. 2018 流程）
- WPLS：加權 PLS（抽樣權重），對齊 SmartPLS 4 Weighted PLS
- CB-SEM 銜接：維持原路線圖承諾——先做瀏覽器端 ML 估計收斂與完整適配指標族的
  可行性 spike，通過才承諾時程（多多快跑已有 CFA 模組可作起點，與 semopy 基準管線已存在）

**驗證基準**：本波是基準最稀缺的一波，逐項註記——FIMIX/PLS-POS 主流 R 套件無完整實作，
以已發表範例數字（Hair et al. 教科書、原始論文）＋演算法性質測試（EM 單調收斂、
分段還原模擬資料的已知結構）驗證；CTA-PLS 依 Gudergan et al. 公式手算 tetrads；
NCA 用 R `NCA` 套件（Kevin 本機）；Gaussian copula 依 Park & Gupta 公開 R 程式碼複算；
WPLS 以加權相關矩陣手算對齊。
**預估工作階段數**：4–6（依實際排入項目數）。

**進度註記（2026-07-13）**：本波已交付三項 ✅——
- **NCA**（2026-07-09）：`src/lib/stats/nca.js`；CE-FDH/CR-FDH ceiling、scope、
  effect size d、bottleneck 表、permutation p；基準 3 組，JS↔numpy bit-for-bit。
- **cIPMA**（2026-07-10）：`cipmaPLS`（Hauff et al. 2024）；基準 `pls_cipma`。
- **CTA-PLS**（2026-07-13）：`ctaPLS`（Gudergan et al. 2008）；非冗餘 tetrad
  k(k−3)/2、bias-corrected ＋ 區塊內 Bonferroni 的 bootstrap CI；基準 `pls_cta`
  （專屬固定種子資料集 `datasets.json:cta`：cr1–cr5 單因子反映型、cm1–cm4 非單因子；
  300 組固定重抽索引注入）；PLS 模組新報表區＋Notes 測量模式判讀＋中英 i18n。
  另補 `pvalue.js` 的 `qT()`（t 分布雙尾臨界值，對齊 scipy 至 1e-10 級）。

`npm test`：589 → **651 過、6 記錄性跳過**；基準方法 65 → **66 組**。
- **Gaussian copula 內生性檢查**（2026-07-13）：`copulaPLS`（Park & Gupta 2012；
  流程依 Hult et al. 2018）。copula 項 c = Φ⁻¹(ecdf(P)(P))；KS 非常態前置把關（警告不擋）；
  每個內生構念的方程跑 2^k − 1 個 copula 組合；bootstrap 完整巢套（重估權重＋重算 copula）。
  新增 2 組基準（`pls_copula` 30 值、`pls_copula_inputs`），測試 879 → **923 過、6 跳過**。

- **FIMIX-PLS**（2026-07-13）：`fimixPLS`（Hahn et al. 2002；準則依 Sarstedt et al. 2011）。
  有限混合迴歸 EM（無截距）；AIC/AIC3/AIC4/BIC/CAIC/HQ/MDL5/EN 八個準則；多起點取最佳；
  段別依佔比排序消除 label switching。新增專屬模擬資料集 `datasets.json:fimix`
  （兩段 β = ±0.80，還原率 0.853）與 2 組基準，測試 923 → **1009 過、6 跳過**。

- **PLS-POS**（2026-07-13）：`posPLS`（Becker et al. 2013）。預測誤差為目標的硬指派爬山法，
  與 FIMIX 互補（不假設分布）；充分統計量增量更新；多起始分割；段別依大小排序。
  與 FIMIX 共用模擬資料：全域 R² = 0.101 → 分段後 0.787，還原率 0.837。
  UI 強制警告「POS 不能用來選段數」（目標函數必然隨 K 下降）。新增 2 組基準，
  測試 1009 → **1056 過、6 跳過**。

- **pairwise deletion ＋ WPLS**（2026-07-13）：核心迭代重構為 `estimateCoreFromCorr(R, spec)`——
  **單一實作、三個入口**（完整資料／pairwise-complete 相關／加權相關）。重構後既有 733 個
  基準欄位逐值全過，**零回歸**。pairwise：不剔除任何列、R 非半正定時警告、配對 < 3 筆報錯、
  與 blindfolding 互斥。WPLS：`options.weights`（欄位名或陣列），權重同乘常數不變、
  0 權重列不參與估計；推論仍未加權重抽（SmartPLS 未文件化，不擅自實作）。
  新增 1 組基準（含 `full_*` 自我一致性欄位），測試 1056 → **1126 過、6 跳過**。

**W6 的 Session A–F 全數交付。** 剩餘：品質小任務（handoff §6.8，可塞縫隙）。
執行層規畫見 `docs/pls-sem-w6-workplan-v1.md`。
**交付判準**：排入項逐項對齊其註記基準；未排入項不留死入口；`npm test` 綠燈。

---

## 跨波原則

1. **先基準後實作**：每波動工前先把該波統計量的基準值產進 fixtures（R 或 Python 或手算，
   來源在 fixture 內註明），JS 實作對著基準寫——測試先紅後綠
2. **所有重運算進 Web Worker**：bootstrap、permutation、k-fold、FIMIX EM 一律不在主執行緒；
   統一進度回報與取消協定（Wave 0 基建）
3. **模型 JSON 向後相容**：schema 帶版本號，只加欄位不改語意；舊版模型檔永遠可載入
   （這是「專案檔本地保存」backlog 的前提）
4. **每波交付 = 三判準全過**（數字對齊＋`npm test` 綠燈＋可獨立上線），不因趕波次妥協
5. **與 SmartPLS 差異顯式化**：凡預設值、慣例與 SmartPLS 4 不同處（如 CI 法預設），
   在 UI Notes 與驗證報告雙處標註，沿用 Phase 1「慣例差異」管理方式

## 風險清單

| 風險 | 影響 | 對策 |
|---|---|---|
| 數值收斂：PLS 迭代在病態資料（高共線、零變異指標）不收斂或收斂到不同解 | W1 起全程 | 對齊 SmartPLS 停止準則；不收斂時明確報錯而非回傳半成品；邊界資料集常駐測試 |
| PLSc 校正後係數可能 >1 或矩陣非正定 | W3 | 對齊 cSEM 的處理慣例並在報表警告，不靜默截斷 |
| bootstrap 效能：5,000 次 × 大模型在低階裝置過慢 | W1、W5 | Worker ＋ 分批回報；矩陣運算熱點用 TypedArray；必要時多 Worker 分片（次數可分割） |
| 瀏覽器記憶體上限：bootstrap 全量中間結果 × 大 n | W1、W5、W6 | 只保留摘要統計量的線上累積（streaming quantile 用 P² 或保留係數矩陣而非資料副本）；設次數上限並提示 |
| 基準稀缺：FIMIX、PLS-POS、IPMA、CTA 無主流 R 套件對照 | W5–W6 | 教科書已發表數字＋模擬資料還原測試＋演算法性質斷言，三者並用；fixture 註明來源等級 |
| 沙盒無 R：plspm 覆蓋不到的量只能手算，手算本身可能錯 | 全程 | 手算 fixture 一律附公式出處；Kevin 本機 seminr/cSEM 抽驗為第二道防線 |
| bootstrap 隨機性使跨實作逐值比對不可能 | 全程 | 點估計逐值比、bootstrap 統計量用大 B 統計容差；JS 內部用固定種子保自身可重現 |

## 版本紀錄

- v1（2026-07-04）：初版。SmartPLS 4 功能清單經官方文件查證；
  修正調節三法（SmartPLS 4 僅 two-stage）；增補 CCA、非線性、simple slope、
  模型比較、PLS-POS、WPLS、GoF、三種估計尺度；排除 GSCA、Regression/PROCESS 家族、PCA。
- v1.1（2026-07-13）：W6 進度註記——NCA／cIPMA／CTA-PLS 三項交付（Opus 4.8）。
