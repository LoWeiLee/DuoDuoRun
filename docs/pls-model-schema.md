# PLS-SEM 模型 JSON Schema v3（2026-07-04）

本文件定義多多快跑 PLS-SEM 引擎（`src/lib/stats/pls.js`）唯一的模型輸入格式。
表單式宣告器（W1）與拖拉式畫布（W2）都只是產生這份 JSON 的編輯器；
引擎、報表、測試不知道任何 UI 存在（見 `pls-sem-roadmap-v1.md` 架構原則）。

**v3 變更（W4）**：新增 `interactions[]`（調節／二次效果／三向交互）與
`higherOrder[]`（高階構念）兩個選填欄位。既有欄位語意未變，`schemaVersion`
維持 `1`（向後相容原則：只加欄位不改語意，v1/v2 模型檔在 v3 引擎完全可用）。

**v2 變更（W3）**：`mode: "formative"` 由「schema 預留、引擎拒絕」升為**正式支援**。

## 1. 結構

```json
{
  "schemaVersion": 1,
  "latentVariables": [
    { "name": "F1", "indicators": ["i1", "i2", "i3"], "mode": "reflective" },
    { "name": "F2", "indicators": ["i4", "i5", "i6"], "mode": "reflective" },
    { "name": "M",  "indicators": ["m1", "m2"], "mode": "reflective" },
    { "name": "Y",  "indicators": ["y1"] }
  ],
  "higherOrder": [
    { "name": "G", "components": ["F1", "F2"], "mode": "reflective", "method": "disjoint" }
  ],
  "interactions": [
    { "name": "G×M", "factors": ["G", "M"], "method": "two-stage" }
  ],
  "paths": [
    { "from": "G", "to": "Y" },
    { "from": "M", "to": "Y" },
    { "from": "G×M", "to": "Y" }
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
| `paths[].from` / `paths[].to` | string | 是 | `from` 可為 LV／高階構念／交互項名稱；`to` 只能是 LV 或高階構念（交互項不能被解釋）。被 `higherOrder` 吸收的低階構念不可直接出現在路徑中 |
| `higherOrder` | array | 否 | **W4**：高階構念宣告 |
| `higherOrder[].name` | string | 是 | 全模型唯一（不可與 LV／指標／交互項同名） |
| `higherOrder[].components` | string[] | 是 | ≥ 2 個已宣告的 LV；一個 LV 只能屬於一個高階構念 |
| `higherOrder[].mode` | `"reflective"` \| `"formative"` | 否 | 預設 `"reflective"` |
| `higherOrder[].method` | `"repeated"` \| `"two-stage"` \| `"disjoint"` | 否 | 預設 `"repeated"`；多個 HOC 的 method 必須一致。repeated＝HOC 區塊為全部 LOC 指標（單次估計）；disjoint／two-stage（embedded）＝兩階段（第二階段以 LOC 分數為 HOC 指標） |
| `interactions` | array | 否 | **W4**：調節／二次效果／三向交互宣告 |
| `interactions[].name` | string | 是 | 全模型唯一；同時是報表中的構念名 |
| `interactions[].factors` | string[] | 是 | ≥ 2 個構念名（LV 或 HOC；不可是 LOC）。同名重複＝次方（如 `["F1","F1"]` 為二次效果）；3 個＝三向交互 |
| `interactions[].method` | `"two-stage"` \| `"product-indicator"` \| `"orthogonal"` | 否 | 預設 `"two-stage"`（對齊 SmartPLS 4：自動補主效果路徑、交互項不標準化）。PI／orthogonal 對齊 seminr（標準化量尺），僅支援兩個相異的反映型 LV；多個交互項的 method 必須一致 |

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
- **W4 限制**：`consistent: true` 與 `interactions`／`higherOrder` 併用回傳
  `plsc-w4-not-supported`；`blindfoldPLS` 對 W4 模型回傳 `q2-not-supported`

## 3. 引擎 API 摘要（詳見 `src/lib/stats/pls.js` 檔頭）

```js
runPLS(rows, model, options?)
// options: { scheme: 'path' | 'factorial' | 'centroid',   // W3：三種 weighting scheme
//            consistent: false,                            // W3：PLSc（Dijkstra-Henseler 2015）
//            tolerance: 1e-7, maxIterations: 300,
//            missing: 'casewise' | 'mean' }
// → { meta(scheme/consistent/…/autoAddedPaths?/interactionMethod?/hocMethod?/stages?),
//     lvNames, lvModes, outerLoadings, outerWeights(含形成型外部 VIF),
//     scores, latentCorrelations(PLSc 時為校正後), pathCoefficients,
//     structural(R²/adjR²/f²/VIF), reliability(α/rho_A/rho_c/AVE；形成型為 null),
//     fornellLarcker, crossLoadings, htmt,
//     fit: { saturated:{srmr,dUls,dG,nfi}, estimated:{…} },   // W3：多階段最終模型為 null
//     plsc?: { rhoA },
//     // W4（依模型內容出現）：
//     stage1?: 第一階段完整子報表（原始指標的量測統計量）,
//     interactions?: [{ name, factors, method, sdProduct,
//                       targets: [{ to, coef(未標準化乘積量尺), coefStd,
//                                   slopes?: [{level:-1|0|1, slope, intercept?}],
//                                   quadratic?, curve? }] }],
//     mediation?: { effects: [{ from, to, direct|null,
//                               chains: [{via, coef}], totalIndirect, total, vaf }] },
//     derived?: { columns, rows }    // 兩階段的「LV 分數新資料檔」
//   } 或 { error, message }
//
// 交互項路徑（two-stage）：pathCoefficients[].coef 為未標準化乘積量尺（SmartPLS 4 慣例），
// coefStd 保留標準化值；PI/orthogonal 為標準化量尺（無 coefStd）。

bootstrapPLS(rows, model, options?)
// options: { n: 5000, seed: 42, ciAlpha: 0.05, signCorrection: 'construct' | 'none',
//            ciType: 'percentile' | 'bca',                 // W3：BCa（含 n 次 jackknife）
//            onProgress(done, total), ...runPLS options }   // consistent=true 即 consistent bootstrap
// → { nRequested, nValid, nSkipped, seed, ciType, nJackknife?,
//     paths / loadings / weights: [{…, original, mean, se, t, p, ciLower, ciUpper}],
//     // W4：每次重抽重跑整條管線（多階段模型 loadings/weights 取第一階段、paths 取最終模型）
//     indirectEffects? / totalIndirectEffects? / totalEffects?:
//       [{ from, to, via?, …同上摘要 }],                    // 中介（Preacher & Hayes 2008）
//     slopes?: [{ interaction, to, level, quadratic, …同上摘要 }] }  // simple slopes
//     （weights 供形成型 outer weights 檢定表）或 { error, message }

blindfoldPLS(rows, model, options?)                          // W3：blindfolding Q²
// options: { omissionDistance: 7, ...runPLS options }
// → { omissionDistance, constructs: [{ lv, q2, sse, sso }], warnings } 或 { error, message }

bcaInterval(draws, jackknife, original, ciAlpha?)            // W3：BCa 公式（測試/內部共用）
// → { ciLower, ciUpper, z0, a }

// ── W5：群組與預測（皆僅支援一般模型，W4 管線模型回傳明確錯誤；MGA 例外——
//        各群組獨立跑完整管線，W4 模型亦可） ──
mgaPLS(rows, model, { groupColumn, groups:[g1,g2], bootstrapN=1000,
                      permutations=1000, seed=42, ...runPLS options })
// → { n1, n2, paths: [{ from, to, group1:{coef,se}, group2:{coef,se}, diff,
//      henselerP(單尾 P(β₁≤β₂)), henselerP2, parametric:{t,df,p}, welch:{t,df,p},
//      permutation:{p, diffs} }], nPermValid }
micomPLS(rows, model, { groupColumn, groups, permutations=1000, seed=42 })
// → { constructs: [{ lv, c, cQuantile5, cP,
//      mean:{diff,ciLower,ciUpper}, variance:{diff,ciLower,ciUpper} }] }
plspredictPLS(rows, model, { k=10, seed=42 })
// → { k, indicators: [{ lv, indicator, rmse, mae, q2predict, lm:{...} }],
//     cvpat: { vsIA:{dBar,t,df,p}, vsLM:{...} } }
ipmaPLS(rows, model, { target })
// → { target, targetPerformance, constructs: [{lv, importance, performance}],
//     indicators: [...], unstandardizedPaths }
mgaParametricTest(th1, se1, n1, th2, se2, n2)   // 公式函式（測試共用）
henselerMgaP(draws1, draws2, th1, th2)
// runPLS 附帶：structural[].itCriteria = { aic, aicc, bic, hq }（Sharma et al. 2019）、
// gof（Tenenhaus et al. 2005，多階段模型為 null）
```

皆為純函式、無 UI 依賴，Node（Vitest）與瀏覽器（Web Worker，
`src/lib/plsWorker.js`；訊息協定含 `options.q2`）雙環境同構執行。

## 4. 版本紀錄

- v3.1（2026-07-06）：W5——mgaPLS／micomPLS／plspredictPLS／ipmaPLS 四個新 API、
  structural[].itCriteria 與 gof；模型 JSON 欄位無變更。
- v3（2026-07-04）：W4——新增 `interactions[]`（two-stage／product indicator／
  orthogonalizing；二次效果與三向交互）與 `higherOrder[]`（repeated indicators／
  disjoint／embedded two-stage）；runPLS 回傳新增 stage1／interactions／mediation／
  derived；bootstrapPLS 新增中介效果與 simple slopes 摘要。`schemaVersion` 維持 1。
- v2（2026-07-04）：formative（Mode B）正式支援；新增三種 weighting scheme、
  PLSc、BCa、model fit（SRMR/d_ULS/d_G/NFI）、blindfolding Q² 的選項與 API 說明。
  `schemaVersion` 維持 1（欄位語意未變）。
- v1（2026-07-04）：初版。reflective 完整實作；formative 欄位預留（W3）；
  驗證規則 11 條＋執行期檢查。
