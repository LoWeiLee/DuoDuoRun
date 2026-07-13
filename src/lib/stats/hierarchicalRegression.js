/**
 * 階層迴歸（Hierarchical regression）
 *
 * 對外 API：
 *   hierarchicalRegression(rows, yVar, blocks)
 *
 * 參數：
 *   rows   : Array<Record<string, any>>  原始資料列
 *   yVar   : string                       依變項欄位名
 *   blocks : Array<Array<string>>         區塊預測變項；blocks[k] 為第 k+1 個區塊新加入的預測變項
 *
 * 處理：
 *   1. 對 (Y, 所有區塊中所有預測變項) 做 listwise deletion，使每一步使用相同 N
 *   2. 對 k = 1..K，取前 k 個區塊的累積預測變項集合，呼叫 multipleRegression
 *   3. 計算每一步的 R²、Adj R²、F、df、p
 *   4. k ≥ 2 時計算 ΔR²、ΔF、Δp（與前一步比較）
 *
 * ΔR² 顯著性檢定（partial F）：
 *   ΔR² = R²_k − R²_{k-1}
 *   dfNum = 該步新加入的預測變項數
 *   dfDen = N − df1_k − 1（df1_k 為到第 k 步累積的預測變項數）
 *   ΔF = (ΔR² / dfNum) / ((1 − R²_k) / dfDen)
 *   Δp = pF(ΔF, dfNum, dfDen)
 *
 * 回傳：
 *   {
 *     steps: [{ predictors, R2, adjR2, F, p, dfNum, dfDen,
 *               deltaR2, deltaF, deltaDfNum, deltaDfDen, deltaP }],
 *     finalReg,   // 最後一步的完整 multipleRegression 物件（含係數表）
 *     n,          // 共用樣本數
 *     yVar,
 *     blocks,
 *     error?      // 設定錯誤或計算失敗訊息
 *   }
 */
import { isMissing } from '../variableTypes.js'
import { multipleRegression } from './multipleRegression.js'
import { pF } from './pvalue.js'

export function hierarchicalRegression(rows, yVar, blocks) {
  if (!yVar) return { error: 'pickY' }
  if (!Array.isArray(blocks) || blocks.length < 1) {
    return { error: 'needBlock' }
  }

  // 攤平所有預測變項，檢查每一個 block 至少有 1 變項
  const allPredictors = []
  for (const blk of blocks) {
    if (!Array.isArray(blk) || blk.length < 1) {
      return { error: 'emptyBlock' }
    }
    for (const v of blk) allPredictors.push(v)
  }

  // 不允許重複（同一變項出現在多個 block）
  const seen = new Set()
  for (const v of allPredictors) {
    if (seen.has(v)) return { error: 'dupPredictor' }
    seen.add(v)
  }

  // 不允許 Y 出現在 X
  if (allPredictors.includes(yVar)) return { error: 'yInX' }

  // listwise deletion：Y 與「所有區塊預測變項」皆需有效
  const cleanedRows = []
  for (const r of rows) {
    const yv = r[yVar]
    if (isMissing(yv)) continue
    const yn = Number(yv)
    if (!Number.isFinite(yn)) continue
    let bad = false
    const numericCache = {}
    for (const xName of allPredictors) {
      const xv = r[xName]
      if (isMissing(xv)) { bad = true; break }
      const xn = Number(xv)
      if (!Number.isFinite(xn)) { bad = true; break }
      numericCache[xName] = xn
    }
    if (bad) continue
    cleanedRows.push({ y: yn, x: numericCache })
  }

  const n = cleanedRows.length
  if (n < allPredictors.length + 2) return { error: 'tooFewN' }

  // 為每一步建立 X 矩陣（cumulative predictors）
  const steps = []
  let prevR2 = 0
  let cumPredictors = []
  let finalReg = null

  for (let k = 0; k < blocks.length; k++) {
    cumPredictors = cumPredictors.concat(blocks[k])
    const X = cleanedRows.map((r) => cumPredictors.map((name) => r.x[name]))
    const y = cleanedRows.map((r) => r.y)

    const reg = multipleRegression(X, y, cumPredictors)
    if (reg.error) return { error: reg.error }

    const dfNum = cumPredictors.length
    const dfDen = n - dfNum - 1

    const step = {
      predictors: cumPredictors.slice(),
      added: blocks[k].slice(),
      R2: reg.fit.r2,
      adjR2: reg.fit.adjR2,
      F: reg.anova.F,
      p: reg.anova.p,
      dfNum,
      dfDen,
      // Δ 量在 k=0 時設為 null
      deltaR2: null,
      deltaF: null,
      deltaDfNum: null,
      deltaDfDen: null,
      deltaP: null,
    }

    if (k >= 1) {
      const dR2 = reg.fit.r2 - prevR2
      const dN = blocks[k].length          // 該步新加入的預測變項數
      const dD = n - dfNum - 1              // 殘差自由度（以本步累積後）
      let dF = NaN
      let dP = NaN
      if (dN > 0 && dD > 0 && (1 - reg.fit.r2) > 1e-12) {
        dF = (dR2 / dN) / ((1 - reg.fit.r2) / dD)
        dP = pF(dF, dN, dD)
      } else if (dR2 <= 0) {
        // 加入變項後 R² 沒有上升（理論上 OLS 不應發生，但防呆）
        dF = 0
        dP = 1
      }
      step.deltaR2 = dR2
      step.deltaF = dF
      step.deltaDfNum = dN
      step.deltaDfDen = dD
      step.deltaP = dP
    }

    steps.push(step)
    prevR2 = reg.fit.r2
    finalReg = reg
  }

  return {
    steps,
    finalReg,
    n,
    yVar,
    blocks,
  }
}
