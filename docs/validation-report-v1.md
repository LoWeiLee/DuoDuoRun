# 多多快跑 統計演算法驗證報告 v1（2026-07-02）

Phase 1 首輪驗證。26 個分析模組的統計核心與黃金標準逐欄位比對，
比對已固化為常設回歸測試：`npm test`（180 項斷言通過、6 項記錄性跳過）。

## 基準環境

- 首選 R 因沙盒限制無法安裝，依路線圖退援 **Python**：
  scipy 1.15.3、statsmodels 0.14.6、pingouin 0.6.1、factor_analyzer、scikit-learn、semopy 2.3.11
- 這批套件與 R / JASP 底層演算法一致；標記為「慣例差異」的項目建議 Kevin 本機 JASP 抽驗複核
- 測試資料：固定種子（seed=42），n=60 主資料集 + 小樣本（n=8）與大量並列（Likert）邊界資料集
- 管線：`tests/generate_reference.py` → `fixtures/*.json` → `tests/compare.test.js`（Vitest）

## 總結

| 結果 | 數量 | 說明 |
|---|---|---|
| 完全對齊（相對誤差 < 1e-6） | 23 個模組 | 多數欄位達 1e-12 以上精度 |
| 可容忍數值差異（1e-6 ~ 5e-4） | Tukey HSD p、小樣本 MW p、EFA 轉軸負荷 | 數值積分 / 迭代收斂細節 |
| 修正後對齊 | 加權 Kappa、尾端 p 值 | 見「本輪修正」 |
| 記錄性慣例差異 | KS p 值、CFA χ² 家族、MW exact | 見「慣例差異」 |

## 本輪修正（2 項，均已修復並通過測試）

### 1. 加權 Cohen's Kappa 層級順序錯誤（嚴重）
- `src/lib/stats/kappa.js`
- 原實作以「rater1 出現順序」決定層級順序，且取兩位評分者層級**交集**。
  加權 κ 的權重 w_ij 取決於序位距離 |i−j|，順序錯 → 權重矩陣整個錯位。
  實測 linear κ 0.517 vs 正確 0.656、quadratic κ 0.580 vs 正確 0.802。
  無加權 κ 與順序無關，故未被發現。
- 修正：層級改取**聯集**並依自然序（數值優先）排序——對齊 SPSS crosstabs 與 sklearn。
  修正後三種加權與 sklearn 對齊至 1e-16。
- 影響評估：曾用本工具跑加權 Kappa 的結果需重跑。無加權 Kappa 不受影響。

### 2. 常態分布尾端 p 值精度不足（中等）
- `src/lib/stats/pvalue.js`
- 原 erf 用 Abramowitz & Stegun 7.1.26（絕對誤差 1.5e-7）。分布中央無妨，
  但 |z| > 4 時 p 值「相對」誤差放大至千分之一量級（Wilcoxon 實測 p 差 0.13%）。
- 修正：erf/normalCdf 改經規則化不完全 Gamma 函數（相對精度收斂），
  並將 betacf 收斂閾值由 3e-7 收緊至 3e-14。
  影響所有 z 檢定類 p 值（Mann-Whitney、Wilcoxon、Kappa z、比例檢定、Dunn）
  與 t/F 尾端 p 值，修正後對齊 scipy 至 1e-13 級。
- 影響評估：僅影響極小 p 值的第 3 位有效數字之後，不影響任何顯著性判定。

## 記錄性慣例差異（非錯誤，測試中以 skip + 註記管理）

1. **Mann-Whitney U 慣例**：JS 報 min(U₁,U₂)（SPSS 慣例），scipy 報第一組 U₁。可互換（U₁+U₂=n₁n₂），測試以 R1 換算比對。
2. **MW 小樣本 exact 法缺席**：SPSS/scipy 在小樣本無並列時預設 exact p；JS 目前只有常態近似（n=8 實測 asymptotic .0304 vs exact .0286）。→ **backlog P2：小樣本自動切 exact**
3. **K-S (Lilliefors) p 近似**：JS 用 Dallal-Wilkinson，statsmodels 用查表內插，p 相差可達 14%；D 統計量對齊至 1e-6。SPSS 亦用 Dallal-Wilkinson，JS 與 SPSS 屬同一家族。建議 JASP 抽驗。
4. **CFA χ² 慣例**：JS 用 (N−1)·F_ML（AMOS/Wishart 慣例），semopy 用 N·F_ML。比值恰為 N/(N−1)，測試含換算斷言。CFI JS 截斷於 1（lavaan 慣例）。
5. **Levene 預設**：JS 預設 median-based（Brown-Forsythe，穩健），SPSS 預設 mean-based。基準含兩版本參考值（`levene_mean_spss_default`），JS 目前無 mean-based 選項。→ backlog P3：提供 center 選項並在 UI 標註
6. **Welch t 為唯一獨立 t**：JS 僅 Welch（JASP 推薦方向）；SPSS 同時報 Student t。→ backlog P3（可選）

## 尚未納入首輪的模組（batch 2 待補）

cluster（k-means/Ward：隨機重啟，需以不變量與固定種子驗證）、LDA（需手算 canonical correlation 基準）、
Dunn 事後檢定（需 scikit-posthocs）、卡方適合度、Spearman/Pearson 矩陣版、
bonferroni 事後、ICC 信賴區間、EFA 未轉軸負荷、階層迴歸多步版、z 檢定單樣本 CI。
核心演算法已由同族函式覆蓋（如 anova→tukey 已驗、矩陣核心由迴歸/MANOVA 間接驗證），
batch 2 屬完整性補強，非風險缺口。

## W3 增補（2026-07-04）：PLS-SEM 對齊深化的基準驗證

W3 新增 6 組 PLS 基準（`generate_reference.py` 的「PLS-SEM Wave 3 基準」區塊），
`reference.json` **只增不改**（37 → 44 個方法、既有值逐位元不變、`datasets.json` 不變）。
測試由 246 項增至 343 項（337 過、6 記錄性跳過；compare +78、PLS 單元測試 +19）。

| 基準 | 來源 | 實測最大相對差 |
|---|---|---|
| `pls_scheme_centroid` | plspm 0.5.7（CENTROID scheme） | 2.3e-8 |
| `pls_scheme_factorial` | plspm 0.5.7（FACTORIAL scheme） | 6.6e-8 |
| `pls_formative`（Mode B ＋ 外部 VIF） | plspm（Mode B）＋ numpy 手算 VIF | 2.4e-15 |
| `pls_plsc`（rho_A／一致 loadings／校正路徑） | numpy 手算（Dijkstra & Henseler 2015） | 1.1e-15 |
| `pls_fit`（SRMR／d_ULS／d_G／NFI，飽和＋估計） | numpy 手算（Henseler et al. 2014; DH 2015; Bentler & Bonett 1980） | 1.5e-15 |
| `pls_q2`（blindfolding，D=7） | numpy 手算（Stone 1974/Geisser 1974；程序依 Hair et al. 2017） | 1.7e-15 |
| `pls_bca_reference`（BCa z₀/a/CI） | numpy 手算（Efron 1987），固定 draws＋jackknife 入 fixture | 1.1e-9（受 qnorm Acklam 近似 1.15e-9 限制） |

手算基準的獨立性：PLSc／fit／Q² 由 `generate_reference.py` 內**獨立實作的 numpy PLS 引擎**
（`_pls_engine`，與 JS 為兩套程式碼）計算，該引擎先以內建 assert 與 plspm（path scheme）
交叉驗證 < 1e-6 才放行。BCa 因 bootstrap 隨機性無法跨實作逐值比對，改為「固定 draws ＋
jackknife 入 fixture、JS `bcaInterval()` 複算公式」的逐值比對。

### W3 慣例差異與待抽驗清單（Kevin 本機 SmartPLS 4 / seminr / cSEM）

以下項目 plspm 不支援、SmartPLS 未完整公開實作細節，目前依原始文獻公式手算入基準，
**建議 Kevin 本機抽驗複核**（同一模型、同設定跑 SmartPLS 4 或 R seminr/cSEM 比對）：

1. **SRMR / d_ULS / d_G / NFI**：模型隱含矩陣採「區塊內 λλ′、區塊間 λ·r·λ′」
   （Henseler et al. 2014 的 composite factor model）；「估計模型」構念相關以遞迴
   path tracing 隱含。cSEM 與 SmartPLS 在此已知存在實作差異，屬高優先抽驗項。
2. **Blindfolding Q²**：略去點的走訪順序（本實作：區塊內 row-major、(i·k+h) mod D）
   與補值細節 SmartPLS 未文件化；程序依 Hair et al. (2017) 第 6 章。抽驗時 D=7 同設定比對。
3. **PLSc**：校正公式本身封閉（DH 2015 式 12），但校正後 |r|>1／一致 loading>1 的
   處理慣例（本實作：警告不截斷，對齊 cSEM）需與 SmartPLS 行為互證。
4. **BCa**：z₀ 用「嚴格小於」計數、加速常數 a 用 jackknife 三階動差（Efron & Tibshirani
   1993 §14.3）；SmartPLS 的 BCa 變體未文件化，屬中優先抽驗項。
5. **construct-level 符號校正**（沿 W1 記錄）：SmartPLS 預設 individual sign change 的
   精確定義沙盒不可查證，本實作用 construct-level（與原始 loadings 內積為負則翻轉）。

## 如何重跑

```bash
npm test                                # 回歸比對（不需 Python）
python3 tests/generate_reference.py     # 重生基準值（改測試資料時才需要）
node tests/probe.mjs                    # 除錯：逐欄位列出實際 vs 基準與相對差
```

## 給後續階段的提示

- Phase 2 UI 重構期間，任何觸碰 `src/lib/stats/` 的改動都必須過 `npm test`
- Phase 3 PLS-SEM 開發時，把 `seminr` 基準值加進同一套管線（`generate_reference.py` 加區塊即可）
- 測試資料集刻意設計為平衡 2×3 交叉；曾發現不平衡空格設計會讓 twoWayANOVA 正確回報
  singular-matrix，錯誤訊息可更友善（→ backlog P3：偵測空格提示「交叉格有空格」）
