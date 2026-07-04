# PLS-SEM 模型 JSON Schema v2（2026-07-04）

本文件定義多多快跑 PLS-SEM 引擎（`src/lib/stats/pls.js`）唯一的模型輸入格式。
表單式宣告器（W1）與拖拉式畫布（W2）都只是產生這份 JSON 的編輯器；
引擎、報表、測試不知道任何 UI 存在（見 `pls-sem-roadmap-v1.md` 架構原則）。

**v2 變更（W3）**：`mode: "formative"` 由「schema 預留、引擎拒絕」升為**正式支援**。
欄位語意未變，`schemaVersion` 維持 `1`（向後相容原則：只加欄位不改語意，
v1 寫出的模型檔在 v2 引擎完全可用）。

## 1. 結構

```json
{
  "schemaVersion": 1,
  "latentVariables": [
    { "name": "F1", "indicators": ["i1", "i2", "i3"], "mode": "reflective" },
    { "name": "XF", "indicators": ["x1", "x2", "x3"], "mode": "formative" }
  ],
  "paths": [
    { "from": "F1", "to": "XF" }
  ]
}
```

### 欄位定義

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `schemaVersion` | integer | 是 | 目前為 `1`。只加欄位不改語意；舊版模型檔永遠可載入（向後相容原則） |
| `latentVariables` | array | 是 | 至少 2 個潛在變數（LV） |
| `latentVariables[].name` | string | 是 | 非空、全模型唯一；不可與任何指標名稱相同 |
| `latentVariables[].indicators` | string[] | 是 | 至少 1 個資料欄位名；同一指標不可重複掛載（同一 LV 內或跨 LV 皆不可） |
| `latentVariables[].mode` | `"reflective"` \| `"formative"` | 否 | 測量模式，預設 `"reflective"`。**W3 起兩者皆完整支援**：reflective = Mode A（correlation weights）、formative = Mode B（regression weights）。形成型構念不計算 α/rho_A/CR/AVE/HTMT（回傳 `null`），改以 outer weights 的 bootstrap 檢定＋外部 VIF 評估，報表分區呈現 |
| `paths` | array | 是 | 至少 1 條結構路徑 |
| `paths[].from` / `paths[].to` | string | 是 | 必須是 `latentVariables` 中宣告的 LV 名稱 |

### 保留欄位（未來波次，只加不改）

- 高階構念宣告（repeated indicators / two-stage）— Wave 4，將以新欄位擴充，
  不改變上述欄位語意

演算法選項（weighting scheme、PLSc、缺失值策略、bootstrap 設定、CI 類型、
omission distance 等）**不屬於模型 JSON**，而是
`runPLS(rows, model, options)` / `bootstrapPLS(...)` / `blindfoldPLS(...)` 的
`options` 參數——模型描述「研究者的理論」，選項描述「這一次估計怎麼跑」。

## 2. 驗證規則（`validatePLSModel(model)`）

驗證器在模型進引擎前執行，任何一條不過即回傳 `{ ok: false, errors: [中文訊息…] }`，
全部通過回傳 `{ ok: true, model: 正規化後的模型 }`（補上預設 `mode`）。

1. `model` 必須是物件；`schemaVersion` 必須是正整數且 ≤ 目前支援版本（1）
2. `latentVariables` 為陣列且長度 ≥ 2
3. 每個 LV：`name` 為非空字串；名稱全模型唯一
4. 每個 LV：`indicators` 為非空字串陣列
5. **指標不重複掛載**：任一指標欄位只能屬於一個 LV，且同一 LV 內不可重複
6. LV 名稱不可與任何指標名稱相同（避免報表歧義）
7. `mode` 若存在必須是 `"reflective"` 或 `"formative"`（兩者引擎皆支援；
   形成型的信效度欄位規則見上表）
8. `paths` 為陣列且長度 ≥ 1；`from`/`to` 必須是已宣告的 LV 名稱
9. 不可有自環（`from === to`）；不可有重複路徑（同一組 from→to 宣告兩次）
10. **無環（acyclic）**：結構模型必須是 DAG（以 Kahn 拓撲排序檢查），
    遞迴模型是 PLS-SEM 的前提
11. 每個 LV 至少出現在一條路徑中（孤立 LV 不允許——PLS 內部估計需要相鄰 LV）

以下屬**執行期檢查**（在 `runPLS` 等 API 內，因為需要資料或選項）：
- 指標欄位必須存在於資料且可轉為數值
- 缺失值處理後樣本數過低（n < 5）報錯、n < 30 給警告
- 零變異指標報錯（指名是哪個指標）
- 迭代不收斂時明確報錯，不回傳半成品（roadmap 風險對策）
- `options.scheme` 必須是 `'path'`（預設）/ `'factorial'`（別名 `'factor'`）/ `'centroid'`
- `options.ciType` 必須是 `'percentile'`（預設）/ `'bca'`
- `blindfoldPLS` 的 `omissionDistance` 必須是 ≥ 2 的整數；n 為其整數倍時警告
- PLSc（`options.consistent`）：校正後 |相關| > 1 或一致 loading > 1 時
  **警告不截斷**（對齊 cSEM 慣例）；c² ≤ 0 時該構念退回未校正估計並警告

## 3. 引擎 API 摘要（詳見 `src/lib/stats/pls.js` 檔頭）

```js
runPLS(rows, model, options?)
// options: { scheme: 'path' | 'factorial' | 'centroid',   // W3：三種 weighting scheme
//            consistent: false,                            // W3：PLSc（Dijkstra-Henseler 2015）
//            tolerance: 1e-7, maxIterations: 300,
//            missing: 'casewise' | 'mean' }
// → { meta(scheme/consistent/…), lvNames, lvModes, outerLoadings, outerWeights(含形成型外部 VIF),
//     scores, latentCorrelations(PLSc 時為校正後), pathCoefficients,
//     structural(R²/adjR²/f²/VIF), reliability(α/rho_A/rho_c/AVE；形成型為 null),
//     fornellLarcker, crossLoadings, htmt,
//     fit: { saturated:{srmr,dUls,dG,nfi}, estimated:{…} },   // W3：model fit
//     plsc?: { rhoA } } 或 { error, message }

bootstrapPLS(rows, model, options?)
// options: { n: 5000, seed: 42, ciAlpha: 0.05, signCorrection: 'construct' | 'none',
//            ciType: 'percentile' | 'bca',                 // W3：BCa（含 n 次 jackknife）
//            onProgress(done, total), ...runPLS options }   // consistent=true 即 consistent bootstrap
// → { nRequested, nValid, nSkipped, seed, ciType, nJackknife?,
//     paths / loadings / weights: [{…, original, mean, se, t, p, ciLower, ciUpper}] }
//     （weights 供形成型 outer weights 檢定表）或 { error, message }

blindfoldPLS(rows, model, options?)                          // W3：blindfolding Q²
// options: { omissionDistance: 7, ...runPLS options }
// → { omissionDistance, constructs: [{ lv, q2, sse, sso }], warnings } 或 { error, message }

bcaInterval(draws, jackknife, original, ciAlpha?)            // W3：BCa 公式（測試/內部共用）
// → { ciLower, ciUpper, z0, a }
```

皆為純函式、無 UI 依賴，Node（Vitest）與瀏覽器（Web Worker，
`src/lib/plsWorker.js`；訊息協定含 `options.q2`）雙環境同構執行。

## 4. 版本紀錄

- v2（2026-07-04）：formative（Mode B）正式支援；新增三種 weighting scheme、
  PLSc、BCa、model fit（SRMR/d_ULS/d_G/NFI）、blindfolding Q² 的選項與 API 說明。
  `schemaVersion` 維持 1（欄位語意未變）。
- v1（2026-07-04）：初版。reflective 完整實作；formative 欄位預留（W3）；
  驗證規則 11 條＋執行期檢查。
