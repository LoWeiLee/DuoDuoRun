/**
 * PLS-SEM — 把 Config 送出的 committed 設定轉成計算結果。
 *
 * committed（Config 按「執行分析」時經 validatePLSModel 驗證後寫入 analysisState）：
 *   { model, bootstrapN, options, draft }
 *     model      — docs/pls-model-schema.md 格式的模型 JSON（含 mode）
 *     bootstrapN — 500 | 1000 | 5000
 *     options    — { scheme:'path'|'factorial'|'centroid', consistent:boolean,
 *                    ciType:'percentile'|'bca', q2:boolean }（W3）
 *     draft      — 執行當下的表單快照（Config 用來偵測「設定已變更」）
 *
 * 回傳：
 *   { estimate, bootstrap, q2 } — estimate 為 runPLS 結果；
 *                                 bootstrap / q2 失敗時為 { error, message }（estimate 仍可用）；
 *                                 q2 未開啟時為 null
 *   { error, message }          — 點估計本身失敗
 *
 * TODO(W5)：Worker 接線 — src/lib/plsWorker.js 已備妥訊息協定（run / progress / result / error，
 * 含 q2），本檔目前為主執行緒同步計算（bootstrap ≤ 5000 次在示範資料量約 1–3 秒；
 * BCa 另加 n 次 jackknife；W4 兩階段模型每次重抽跑 2–3 次估計，成本約 2–3 倍，
 * 到 W5 的 permutation/k-fold 重運算時一併接 Worker）。接線時把 Result/Narrative 的
 * useMemo 改為 useEffect + worker.postMessage，以 progress 訊息驅動進度條。
 */
import {
  runPLS, bootstrapPLS, blindfoldPLS, mgaPLS, micomPLS, plspredictPLS, ipmaPLS, cipmaPLS, ctaPLS,
  copulaPLS, fimixPLS, posPLS,
} from '../../lib/stats/pls.js'

/** committed.options.w5 → 各 W5 API 的 options（worker 與同步路徑共用） */
export function buildW5Options(committed) {
  const w5 = (committed.options || {}).w5 || {}
  const grp = w5.groupColumn && w5.g1 !== undefined && w5.g2 !== undefined
    ? { groupColumn: w5.groupColumn, groups: [w5.g1, w5.g2], permutations: w5.permutations ?? 500, seed: 42 }
    : null
  return {
    mga: w5.mga && grp ? { ...grp, bootstrapN: committed.bootstrapN ?? 1000 } : null,
    micom: w5.micom && grp ? grp : null,
    predict: w5.predict ? { k: w5.k ?? 10, seed: 42 } : null,
    ipma: w5.ipma && w5.target
      ? { target: w5.target, ...(w5.cipma === true ? { cipma: true } : {}) }
      : null,
    // W6.3 CTA-PLS：bootstrap 次數沿用主設定（Gudergan et al. 2008 建議 ≥ 5000）
    cta: w5.cta === true ? { n: committed.bootstrapN ?? 1000, seed: 42, ciAlpha: 0.05 } : null,
    // W6.5 Gaussian copula：bootstrap 次數沿用主設定（Hult et al. 2018 建議 bootstrap 求 SE）
    copula: w5.copula === true
      ? { bootstrapN: committed.bootstrapN ?? 1000, seed: 42, ciAlpha: 0.05 }
      : null,
    // W6.1 FIMIX-PLS：多起點固定種子（EM 對起始值敏感）；kMax 產生段數選擇表
    fimix: w5.fimix === true
      ? { segments: w5.fimixK ?? 2, kMax: w5.fimixKMax ?? 4, restarts: 10, seed: 42 }
      : null,
    // W6.2 PLS-POS：多起始分割（爬山法只保證局部最優）；段數沿用 FIMIX 的設定
    pos: w5.pos === true
      ? { segments: w5.fimixK ?? 2, starts: 10, seed: 42 }
      : null,
  }
}

/** committed → plsWorker 'run' 訊息的 options（與下方同步計算同一組設定） */
export function buildWorkerOptions(committed) {
  const opts = committed.options || {}
  return {
    scheme: opts.scheme ?? 'path',
    consistent: opts.consistent === true,
    missing: opts.missing ?? 'casewise',
    ...(opts.weightsCol ? { weights: opts.weightsCol } : {}),
    bootstrap: {
      n: committed.bootstrapN ?? 1000,
      seed: 42,
      ciType: opts.ciType === 'bca' ? 'bca' : 'percentile',
    },
    q2: opts.q2 === true,
    ...buildW5Options(committed),
  }
}

// Result 與 Narrative 會在同一次 render 各自呼叫一次；
// 以「最後一次引數」快取避免 bootstrap 重跑兩遍（rows / committed 引用不變即命中）。
let lastRows = null
let lastCommitted = null
let lastResult = null

export function runPLSAnalysis(rows, committed) {
  if (!committed || !committed.model) return { error: 'not-run', message: '' }
  if (rows === lastRows && committed === lastCommitted && lastResult) return lastResult

  const opts = committed.options || {}
  const estimateOptions = {
    scheme: opts.scheme ?? 'path',
    consistent: opts.consistent === true,
    missing: opts.missing ?? 'casewise',
    ...(opts.weightsCol ? { weights: opts.weightsCol } : {}),
  }

  const estimate = runPLS(rows, committed.model, estimateOptions)
  if (estimate.error) {
    lastResult = { error: estimate.error, message: estimate.message }
  } else {
    const bootstrap = bootstrapPLS(rows, committed.model, {
      ...estimateOptions,
      n: committed.bootstrapN ?? 1000,
      seed: 42,
      ciType: opts.ciType === 'bca' ? 'bca' : 'percentile',
    })
    const q2 = opts.q2 === true
      ? blindfoldPLS(rows, committed.model, estimateOptions)
      : null
    const w5 = buildW5Options(committed)
    lastResult = {
      estimate,
      bootstrap,
      q2,
      mga: w5.mga ? mgaPLS(rows, committed.model, { ...estimateOptions, ...w5.mga }) : null,
      micom: w5.micom ? micomPLS(rows, committed.model, { ...estimateOptions, ...w5.micom }) : null,
      predict: w5.predict ? plspredictPLS(rows, committed.model, { ...estimateOptions, ...w5.predict }) : null,
      ipma: w5.ipma
        ? (w5.ipma.cipma ? cipmaPLS : ipmaPLS)(rows, committed.model, { ...estimateOptions, ...w5.ipma })
        : null,
      cta: w5.cta ? ctaPLS(rows, committed.model, { ...estimateOptions, ...w5.cta }) : null,
      copula: w5.copula
        ? copulaPLS(rows, committed.model, { ...estimateOptions, ...w5.copula })
        : null,
      fimix: w5.fimix
        ? fimixPLS(rows, committed.model, { ...estimateOptions, ...w5.fimix })
        : null,
      pos: w5.pos
        ? posPLS(rows, committed.model, { ...estimateOptions, ...w5.pos })
        : null,
    }
  }
  lastRows = rows
  lastCommitted = committed
  return lastResult
}
