# 多多快跑 PLS-SEM 收尾工作規劃書 v1（2026-07-12）

**讀者**：Opus 4.8（執行者）與 Kevin。
**定位**：`pls-sem-roadmap-v1.md`（波次規畫）與 `handoff-roadmap-v1.md`（交接規格）的
**執行層展開**，只規劃「尚未完成」的項目。演算法細節與基準策略以 handoff §5–§6 為準，
本文件負責：切 session、定順序、定每個 session 的交付判準與開工前置。
規格衝突時以 handoff-roadmap 為準並回報 Kevin。

## 1. 現況快照（開工前先驗證）

- W0–W5 全數交付；W6 已完成 NCA（2026-07-09）＋ cIPMA（2026-07-10）
- `npm test`：589 過、6 記錄性跳過；65 組基準方法（tests/fixtures/reference.json）
- **每個 session 開工第一步**：跑 `npm test` 確認起點綠燈；不綠先修再動工

## 2. 未完成項總表與優先序

| # | 項目 | handoff 節 | 預估 | 依賴 |
|---|---|---|---|---|
| A | 抽驗回饋消化（Kevin 本機 SmartPLS 4／seminr／cSEM／R NCA 數字對表） | §4 | 1 session | 等 Kevin 回報數字，隨到隨做，**優先於一切新開發** |
| B | CTA-PLS | §6.3 | 1 session | 無 |
| C | Gaussian copula 內生性檢查 | §6.5 | 1 session | 無 |
| D | FIMIX-PLS | §6.1 | 1–1.5 session | 無 |
| E | PLS-POS | §6.2 | 1 session | 建議在 D 之後（共用分段報表 UI） |
| F | pairwise deletion ＋ WPLS（合併做） | §6.7＋§6.6 | 1–1.5 session | 相關矩陣驅動重構，設計已在 §6.7 |
| G | 品質小任務打包 | §6.8 | 1 session | 無；可塞任何縫隙 |

順序沿 handoff §9 價值序：A（隨到隨做）→ B → C → D → E → F → G。
Kevin 可調整；調整時只動順序，不動單項範圍。

## 3. 各 session 執行規格

共通模式（handoff §5 開頭，全項適用）：
`tests/generate_reference.py` 加基準區塊（沙盒用 `tests/run_pls_ref_only.py` 跑，2–3 秒）
→ `tests/adapters.mjs` 加 adapter → 紅燈 → `src/lib/stats/pls.js` 新 export
（沿 `rejectW4` 與中文錯誤慣例）→ `tests/pls.test.js` 行為測試 →
Config/Result/i18n（zh-TW＋en 同步）→ 文件三件套更新
（pls-sem-roadmap 進度註記、validation-report 增補節、handoff-roadmap §1/§9 勾銷）。

### Session A：抽驗回饋消化
- 輸入：Kevin 本機回報的數字（validation-report 各波「待抽驗清單」，含 W6/NCA 7 項）
- 工作：逐項對表 → 一致則在 validation-report 標「已抽驗 ✓」；不一致則判定是
  實作錯誤（修）還是慣例差異（UI Notes＋validation-report 雙處標註，沿 Phase 1 慣例）
- 交付：validation-report 抽驗欄位全數更新；如有修正，`npm test` 綠燈
- 若 Kevin 尚未跑：代產 R／SmartPLS 抽驗腳本與對照表（handoff §4），Kevin 只執行與回報

### Session B：CTA-PLS（§6.3）
- Gudergan et al. (2008)：每構念 ≥4 指標，model-implied nonredundant tetrads，
  bootstrap CI（Bonferroni 調整），判讀反映型/形成型
- 基準：tetrad 封閉式 numpy 手算；bootstrap 用固定 draws 注入模式（範例 `pls_bca_reference`）
- UI：PLS 模組內新報表區＋Notes 判讀指引；指標不足 4 的構念明確中文提示（不靜默略過）

### Session C：Gaussian copula（§6.5）
- Park & Gupta (2012)、Hult et al. (2018)：copula 項 = Φ⁻¹(ECDF(x)) 加入迴歸檢定；
  前提把關：解釋變數非常態（KS 檢定先行，常態則警告不建議）
- 基準：numpy 手算（ECDF＋qnorm 沙盒既有）＋ Hult et al. 公開程式碼複算

### Session D：FIMIX-PLS（§6.1）
- Hahn et al. (2002) EM；段數選擇 AIC/BIC/CAIC/EN（封閉式手算入 fixture）
- 基準三件組：模擬資料還原測試（兩段已知係數）＋ EM 單調收斂斷言＋教科書範例數字
- 注意：多起點（固定種子集）取最佳；EN ≥ .50 判準入 UI；EM 進 Web Worker（可能較慢）

### Session E：PLS-POS（§6.2）
- Becker et al. (2013)；距離量＝預測誤差，逐案重新指派爬山法
- 基準策略同 FIMIX；報表與 FIMIX 共用分段呈現元件（先做 D 的原因）

### Session F：pairwise deletion ＋ WPLS（§6.7＋§6.6，合併）
- 核心：`estimateCoreFromCorr(R, spec)` 相關矩陣驅動重構（設計已完成，見 §6.7 全文）
- pairwise：R 用 pairwise-complete 相關；LV 分數用 zero-imputed 標準化值（文件註明）；
  blindfolding 與 pairwise 互斥（中文報錯）
- WPLS：加權相關矩陣（封閉式）走同一入口
- 基準：numpy 同程序複算＋固定 MCAR 缺失遮罩入 fixture；加權相關矩陣手算
- **回歸風險最高的一項**：重構後全量 `npm test` 必須零改動通過既有 589 項

### Session G：品質小任務（§6.8 全清單）
59 個既有 eslint 清理、W4 畫布顯示層、MGA/PLSpredict/IPMA APA 敘述句、
PLSpredict 10 reps、MGA 的 PLSc 版、IPMA 量表理論界線 UI、moderated mediation、
含調節/HOC/群組欄位的 PLS 示範資料集。單項獨立，可拆散塞縫隙。

## 4. 沙盒與紀律提醒（執行者必讀）

- handoff §3 沙盒作業手冊全文適用：45 秒 bash 上限、禁 `git stash`、
  比對 HEAD 用 `git show HEAD:path`、大檔寫入用 heredoc＋tail 驗尾
- **plspm 版本敏感性**（handoff §6.4 管線備忘）：重生基準後必 diff reference.json
  確認既有鍵零改動
- 架構不變量（handoff §2 七條）改壞任何一條都算回歸
- git 流程：Kevin 先 Desktop Fetch/Pull → AI 改 → Kevin 看 Changes 清單 → Commit → Push；
  AI 交付時主動提醒此順序，永不 force push

## 5. 完成定義

全部 A–F 交付（G 可延後為長期縫隙任務）＋ validation-report 高優先抽驗項全數銷帳
＝ PLS-SEM 路線圖 W0–W6 收尾完成，之後轉入 CB-SEM（見 `cb-sem-design-plan-v1.md`）
與產品 backlog（handoff §7）。

## 版本紀錄

- v1（2026-07-12）：初版（Fable 5 產出，供 Opus 4.8 執行）。
