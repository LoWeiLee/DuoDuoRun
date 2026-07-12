# 多多快跑 CB-SEM 開發設計規劃書 v1（2026-07-12）

**讀者**：Opus 4.8（執行者）與 Kevin。
**定位**：`handoff-roadmap-v1.md` §6 承諾的展開——**spike-first，通過 gate 才承諾波次時程**。
本文件定義 spike 的範圍與通過判準、通過後的波次骨架、驗證策略與決策點。

## 1. 目標定位與既有基礎

**目標：複製 lavaan（R）的數字與工作流程，不複製其語法介面。**
同設定下每個估計值、SE、p、適配指標都應與 lavaan／semopy 一致（數值容差內）。
對齊對象選 lavaan（學術引用主流），沙盒基準用 semopy，Kevin 本機 lavaan 抽驗複核。

既有可複用資產：
- `src/lib/stats/cfa.js`（768 行）：ML 估計＋BFGS＋中央差分梯度、
  重新參數化避界（log 變異、atanh 相關）、χ²/CFI/TLI/RMSEA/SRMR，對標 lavaan::cfa()。
  **CB-SEM 引擎的直接起點**——full SEM 只是在 Σ(θ) 中加入結構矩陣 B
  （Σ = Λ(I−B)⁻¹Ψ(I−B)⁻ᵀΛᵀ + Θ）
- semopy 基準管線：`tests/generate_reference.py` 已有 CFA 區塊（semopy ML）
- PLS 的模型 JSON schema／表單宣告器／React Flow 畫布／Web Worker 架構：
  「潛在變數＋指標＋路徑」的宣告結構與 CB-SEM 完全同構，可直接複用

## 2. Phase S：可行性 spike（1–2 sessions，先做，不通過就停）

**範圍**（刻意小）：
- 2–3 構念、每構念 3–4 指標的完整 SEM（測量模型＋結構路徑），ML 估計
- 標準誤：觀察訊息矩陣（Hessian 數值近似）→ z 檢定、95% CI
- 完整適配指標族：χ²（＋baseline χ²）、CFI、TLI、RMSEA（含 90% CI）、SRMR、AIC/BIC
- 標準化解（std.lv 與 std.all 兩種，對齊 lavaan 慣例）
- 收斂穩定性壓測：不同起始值、病態資料（高共線、小樣本 n=100）下的行為

**通過判準（gate，全數成立才排 Wave）**：
1. 點估計、SE、適配指標全部對齊 semopy（容差 ≤ 1e-4；SE 因 Hessian 數值法放寬至 1e-3）
2. 收斂：教科書資料 < 2 秒（主執行緒可接受）；不收斂案例明確報錯不回半成品
3. Kevin 本機 lavaan 抽驗一組完整輸出一致
4. spike 報告寫入 `docs/`（比照 `w0-engine-spike-report.md`），記錄數值障礙與對策

**不通過的處置**：報告記錄障礙（如 Hessian 精度不足、BFGS 病態不收斂），
提出替代路徑（如 SE 改 bootstrap-only、或引入外部 WASM 優化器）交 Kevin 裁決，不硬上。

## 3. 通過後的波次骨架（時程於 spike 報告中承諾）

### Wave C1：核心引擎＋模組上線
- full SEM 引擎（`src/lib/stats/sem.js` 新檔，cfa.js 不動保持回歸安全）：
  自由參數規格（loadings／結構路徑／因子共變／殘差變異＋相關殘差）、
  識別性檢查（df ≥ 0、量尺設定：固定首負荷或固定因子變異，預設對齊 lavaan）、
  ML＋BFGS、SE＋z＋CI、標準化解、R²（內生構念）
- 模型 JSON：schemaVersion 加 `type: "cbsem"` 分支，宣告器與畫布複用 PLS 元件
- 分析模組六件套（sem 群組），報表：估計表（非標準化＋標準化雙欄）、
  適配指標表（含判準紅綠燈：CFI ≥ .95 等，出處 Hu & Bentler 1999）、APA Narrative
- 基準：semopy 全量＋lavaan 抽驗；fixture-first 紅綠流程沿 PLS 慣例

### Wave C2：模型評估深化
- 修正指數（MI）與期望參數改變（EPC）；殘差矩陣（標準化殘差）
- 間接效果：delta method＋bootstrap CI（bootstrap 進 Web Worker，複用 PLS 協定）
- 巢套模型比較：χ² 差異檢定、AIC/BIC 表

### Wave C3：穩健與群組
- 穩健 ML（MLM，Satorra-Bentler 校正 χ² 與 robust CFI/RMSEA）
- 多群組 SEM＋測量恆等性階梯（configural→metric→scalar→strict，Δχ²/ΔCFI 判準）

### Wave C4：長尾（需求出現再排，逐項獨立）
- FIML 缺失值處理（casewise log-likelihood，成本高）
- 序位變數 WLSMV（polychoric 相關＋對角加權最小平方）——**本波風險最高**，
  進入前比照本文件再做一次小 spike
- 二階因子、bifactor

## 4. 驗證策略與風險

- 基準鏈：semopy（沙盒主基準，`run_pls_ref_only.py` 模式抽 CB-SEM 區塊）→
  Kevin 本機 lavaan（第二道防線）→ 教科書範例（第三道）
- 慣例差異管理沿 PLS：semopy／lavaan 預設不同處（如量尺設定、TLI 公式變體）
  在 UI Notes＋validation-report 雙處標註

| 風險 | 對策 |
|---|---|
| BFGS＋數值梯度在大模型收斂慢或掉入局部最優 | spike 壓測定界；多起點；必要時解析梯度（ML 的梯度封閉式存在，可 C1 後補） |
| Hessian 數值近似的 SE 精度 | 對齊容差放寬並於 spike 驗證；不達標改解析或 bootstrap |
| Σ 非正定／Heywood cases | 對齊 lavaan 行為：警告＋照報，不靜默截斷（沿「數值誠實」不變量） |
| 與既有 CFA 模組的關係混淆使用者 | 見 §5 決策點 1 |

## 5. 決策點（開工前由 Kevin 裁決）

1. **既有 CFA 模組的去留**：(a) 保留並列（CFA 輕量入口＋SEM 完整版）或
   (b) CFA 併入 SEM 模組成為特例。建議 (a)——回歸風險零，之後再評
2. **量尺設定預設**：固定首負荷（lavaan 預設）vs 固定因子變異（現行 cfa.js 作法）。
   建議對齊 lavaan（固定首負荷），cfa.js 不動
3. **Wave C4 是否進入承諾範圍**：建議 spike 報告後再議

## 6. 執行紀律

- 沙盒限制、fixture-first、架構不變量、git 流程全部沿用
  `handoff-roadmap-v1.md` §2–§3 與 `pls-sem-w6-workplan-v1.md` §4，不重述
- **啟動順序建議**：PLS 收尾 workplan 的 Session A–F 完成後再啟動 Phase S；
  若 Kevin 想提前，Phase S 與 PLS W6 各 session 相互獨立、可穿插

## 版本紀錄

- v1（2026-07-12）：初版（Fable 5 產出，供 Opus 4.8 執行）。
