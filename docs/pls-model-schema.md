# PLS-SEM 模型 JSON Schema v1（2026-07-04）

本文件定義多多快跑 PLS-SEM 引擎（`src/lib/stats/pls.js`）唯一的模型輸入格式。
表單式宣告器（W1）與拖拉式畫布（W2）都只是產生這份 JSON 的編輯器；
引擎、報表、測試不知道任何 UI 存在（見 `pls-sem-roadmap-v1.md` 架構原則）。

## 1. 結構

```json
{
  "schemaVersion": 1,
  "latentVariables": [
    { "name": "F1", "indicators": ["i1", "i2", "i3"], "mode": "reflective" },
    { "name": "F2", "indicators": ["i4", "i5", "i6"], "mode": "reflective" }
  ],
  "paths": [
    { "from": "F1", "to": "F2" }
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
| `latentVariables[].mode` | `"reflective"` \| `"formative"` | 否 | 測量模式，預設 `"reflective"`。**schema 已預留 `formative`（Mode B），但 W1 引擎只實作 reflective（Mode A）**——傳入 formative 會被引擎以明確錯誤擋下，於 Wave 3 開通 |
| `paths` | array | 是 | 至少 1 條結構路徑 |
| `paths[].from` / `paths[].to` | string | 是 | 必須是 `latentVariables` 中宣告的 LV 名稱 |

### 保留欄位（未來波次，只加不改）

- `latentVariables[].mode: "formative"` — Wave 3（外部 VIF、權重顯著性）
- 高階構念宣告（repeated indicators / two-stage）— Wave 4，將以新欄位擴充，
  不改變上述欄位語意

演算法選項（weighting scheme、缺失值策略、bootstrap 次數與種子等）**不屬於模型 JSON**，
而是 `runPLS(rows, model, options)` / `bootstrapPLS(rows, model, options)` 的
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
7. `mode` 若存在必須是 `"reflective"` 或 `"formative"`
8. `paths` 為陣列且長度 ≥ 1；`from`/`to` 必須是已宣告的 LV 名稱
9. 不可有自環（`from === to`）；不可有重複路徑（同一組 from→to 宣告兩次）
10. **無環（acyclic）**：結構模型必須是 DAG（以 Kahn 拓撲排序檢查），
    遞迴模型是 PLS-SEM 的前提
11. 每個 LV 至少出現在一條路徑中（孤立 LV 不允許——PLS 內部估計需要相鄰 LV）

以下屬**執行期檢查**（在 `runPLS` 內，因為需要資料）：
- 指標欄位必須存在於資料且可轉為數值
- 缺失值處理後樣本數過低（n < 5）報錯、n < 30 給警告
- 零變異指標報錯（指名是哪個指標）
- 迭代不收斂時明確報錯，不回傳半成品（roadmap 風險對策）
- W1 限制：`mode: "formative"` 與 `scheme !== 'path'` 皆報「尚未支援」錯誤

## 3. 引擎 API 摘要（詳見 `src/lib/stats/pls.js` 檔頭）

```js
runPLS(rows, model, options?)
// options: { scheme: 'path', tolerance: 1e-7, maxIterations: 300,
//            missing: 'casewise' | 'mean' }
// → { meta, outerLoadings, outerWeights, scores, latentCorrelations,
//     pathCoefficients, structural(R²/adjR²/f²/VIF), reliability(α/rho_A/rho_c/AVE),
//     fornellLarcker, crossLoadings, htmt } 或 { error, message }

bootstrapPLS(rows, model, options?)
// options: { n: 5000, seed: 42, ciAlpha: 0.05, signCorrection: 'construct' | 'none',
//            onProgress(done, total), ...runPLS options }
// → { nRequested, nValid, nSkipped, paths: [{from, to, original, mean, se, t, p,
//     ciLower, ciUpper}], loadings: [同構], seed, signCorrection } 或 { error, message }
```

兩者皆為純函式、無 UI 依賴，Node（Vitest）與瀏覽器（Web Worker，
`src/lib/plsWorker.js`）雙環境同構執行。

## 4. 版本紀錄

- v1（2026-07-04）：初版。reflective 完整實作；formative 欄位預留（W3）；
  驗證規則 11 條＋執行期檢查。
