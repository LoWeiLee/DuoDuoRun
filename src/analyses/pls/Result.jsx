/**
 * PLS-SEM — Result（中欄）
 *
 * 結構：
 *   1. StatCards：N / PLS 迭代 / Bootstrap 有效重抽 / 主要內生構念 R²
 *      ＋ 設定列（weighting scheme、PLSc 標記）
 *   2. 測量模型：
 *      反映型 — 外部負荷量表（含 bootstrap SE, t, p）＋ 信度效度表（α / rho_A / CR / AVE）
 *      形成型 — 外部權重檢定表（權重 / 外部 VIF / SE / t / p / CI ＋ 負荷量備援）
 *   3. 區辨效度：Fornell-Larcker 矩陣 ＋ HTMT 表（形成型配對顯示 —）
 *   4. 結構模型：路徑係數表（β / SE / t / p / 95% CI）＋ R² 表 ＋ f² / VIF 表
 *   5. 模型適配：SRMR / d_ULS / d_G / NFI（飽和 vs 估計模型，SRMR < .08 LED）
 *   6. 預測相關性：blindfolding Q²（開啟時）
 *
 * 檢視模式：state.plsView === 'canvas'（桌面）時，本元件改渲染 Canvas（拖拉式畫布）。
 * 計算觸發：Config 按「執行分析」把驗證過的模型與選項寫入 state.committed。
 */
import { useEffect, useState } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { usePLSResult } from './usePLSResult'
import Canvas from './Canvas'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtInt, fmtP, fillTemplate, toneForP } from '../../lib/format'

/** 手機窄幅偵測（md 斷點 = 768px）；畫布在窄幅退回表單結果 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

const TONE_TEXT = {
  ok: 'text-duo-sig-ok',
  warn: 'text-duo-sig-warn',
  bad: 'text-duo-sig-bad',
}

function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

function Th({ children, align = 'right' }) {
  return (
    <th
      className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap`}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td
      className={[
        'px-3 py-1.5 border-b border-duo-cream-100',
        `text-${align}`,
        mono ? 'font-mono' : '',
        bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
      ].join(' ')}
    >
      {children}
    </td>
  )
}

function TableBox({ children }) {
  return (
    <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
      <table className="w-full text-xs">{children}</table>
    </div>
  )
}

function Note({ children }) {
  return <p className="text-[11px] text-duo-cocoa-400 mt-1.5 leading-snug whitespace-pre-line">{children}</p>
}

/** LED 燈號（同 AssumptionChecker 的綠黃紅語意） */
function Led({ status }) {
  const cls =
    status === 'ok'
      ? 'bg-duo-sig-ok shadow-led-ok'
      : status === 'warn'
        ? 'bg-duo-sig-warn shadow-led-warn'
        : 'bg-duo-sig-bad shadow-led-bad'
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />
}

function WarnBox({ children }) {
  return (
    <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
      {children}
    </div>
  )
}

function loadingStatus(l) {
  if (!Number.isFinite(l)) return 'bad'
  const a = Math.abs(l)
  if (a >= 0.708) return 'ok'
  if (a >= 0.4) return 'warn'
  return 'bad'
}

function vifStatus(v) {
  if (!Number.isFinite(v)) return 'bad'
  if (v < 3.3) return 'ok'
  if (v < 5) return 'warn'
  return 'bad'
}

function srmrStatus(v) {
  if (!Number.isFinite(v)) return 'bad'
  if (v < 0.08) return 'ok'
  if (v < 0.1) return 'warn'
  return 'bad'
}

function f2InterpKey(f2) {
  if (!Number.isFinite(f2)) return 'none'
  if (f2 >= 0.35) return 'large'
  if (f2 >= 0.15) return 'medium'
  if (f2 >= 0.02) return 'small'
  return 'none'
}

/** 通過／未通過的雙色 mono 數值 */
function PassNum({ value, ok, decimals = 3 }) {
  return <span className={ok ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(value, decimals)}</span>
}

/* ─────────────────────  區塊元件  ───────────────────── */

function LoadingsTable({ rows, loadMap, bootOk, r, labelMap }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.measurementTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.lv}</Th>
            <Th align="left">{c.indicator}</Th>
            <Th>{c.loading}</Th>
            {bootOk && (
              <>
                <Th>{c.se}</Th>
                <Th>{c.t}</Th>
                <Th>{c.p}</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((q, i, arr) => {
            const st = loadingStatus(q.loading)
            const b = bootOk ? loadMap.get(`${q.lv}｜${q.indicator}`) : null
            const firstOfBlock = i === 0 || arr[i - 1].lv !== q.lv
            return (
              <tr key={`${q.lv}-${q.indicator}`}>
                <Td align="left" mono={false} bold>
                  {firstOfBlock ? q.lv : ''}
                </Td>
                <Td align="left" mono={false}>
                  <span className="inline-flex items-center gap-2">
                    <Led status={st} />
                    {labelMap[q.indicator] || q.indicator}
                  </span>
                </Td>
                <Td>
                  <span className={TONE_TEXT[st]}>{fmtNum(q.loading, 3)}</span>
                </Td>
                {bootOk && (
                  <>
                    <Td>{fmtNum(b?.se, 3)}</Td>
                    <Td>{fmtNum(b?.t, 2)}</Td>
                    <Td>
                      <span className={TONE_TEXT[toneForP(b?.p)] || ''}>{fmtP(b?.p)}</span>
                    </Td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.loadingNote}</Note>
    </div>
  )
}

/** 形成型構念：外部權重檢定表（取代信度表；權重 + 外部 VIF + bootstrap 檢定 + 負荷量備援） */
function FormativeWeightsTable({ rows, weightMap, loadingByKey, bootOk, r, labelMap }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.formativeTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.lv}</Th>
            <Th align="left">{c.indicator}</Th>
            <Th>{c.weight}</Th>
            <Th>{c.outerVif}</Th>
            {bootOk && (
              <>
                <Th>{c.se}</Th>
                <Th>{c.t}</Th>
                <Th>{c.p}</Th>
                <Th>{c.ci}</Th>
              </>
            )}
            <Th>{c.loading}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q, i, arr) => {
            const b = bootOk ? weightMap.get(`${q.lv}｜${q.indicator}`) : null
            const firstOfBlock = i === 0 || arr[i - 1].lv !== q.lv
            const vs = q.vif === null ? null : vifStatus(q.vif)
            const loading = loadingByKey.get(`${q.lv}｜${q.indicator}`)
            return (
              <tr key={`${q.lv}-${q.indicator}`}>
                <Td align="left" mono={false} bold>
                  {firstOfBlock ? q.lv : ''}
                </Td>
                <Td align="left" mono={false}>{labelMap[q.indicator] || q.indicator}</Td>
                <Td>{fmtNum(q.weight, 3)}</Td>
                <Td>
                  {vs === null ? '—' : (
                    <span className="inline-flex items-center gap-2">
                      <Led status={vs} />
                      <span className={TONE_TEXT[vs]}>{fmtNum(q.vif, 2)}</span>
                    </span>
                  )}
                </Td>
                {bootOk && (
                  <>
                    <Td>{fmtNum(b?.se, 3)}</Td>
                    <Td>{fmtNum(b?.t, 2)}</Td>
                    <Td>
                      <span className={TONE_TEXT[toneForP(b?.p)] || ''}>{fmtP(b?.p)}</span>
                    </Td>
                    <Td>
                      [{fmtNum(b?.ciLower, 3)}, {fmtNum(b?.ciUpper, 3)}]
                    </Td>
                  </>
                )}
                <Td>{fmtNum(loading, 3)}</Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.formativeNote}</Note>
    </div>
  )
}

function ReliabilityTable({ rows, kByLv, r }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.reliabilityTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.lv}</Th>
            <Th>{c.alpha}</Th>
            <Th>{c.rhoA}</Th>
            <Th>{c.cr}</Th>
            <Th>{c.ave}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => {
            const single = (kByLv.get(q.lv) || 0) < 2
            if (single) {
              return (
                <tr key={q.lv}>
                  <Td align="left" mono={false} bold>{q.lv}</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                </tr>
              )
            }
            const okAlpha = q.alpha >= 0.7
            const okRhoA = q.rhoA >= 0.7
            const okCr = q.rhoC >= 0.7
            const okAve = q.ave >= 0.5
            const allOk = okAlpha && okRhoA && okCr && okAve
            return (
              <tr key={q.lv}>
                <Td align="left" mono={false} bold>
                  <span className="inline-flex items-center gap-2">
                    <Led status={allOk ? 'ok' : 'bad'} />
                    {q.lv}
                  </span>
                </Td>
                <Td><PassNum value={q.alpha} ok={okAlpha} /></Td>
                <Td><PassNum value={q.rhoA} ok={okRhoA} /></Td>
                <Td><PassNum value={q.rhoC} ok={okCr} /></Td>
                <Td><PassNum value={q.ave} ok={okAve} /></Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.reliabilityNote}</Note>
    </div>
  )
}

function FornellLarckerTable({ estimate, r }) {
  const { lvNames, matrix } = estimate.fornellLarcker
  // 對角線通過檢查：√AVE 是否大於該構念與所有其他構念的相關（同列＋同欄）
  const diagOk = lvNames.map((_, a) => {
    if (matrix[a][a] === null) return null
    let maxCorr = 0
    for (let b = 0; b < lvNames.length; b++) {
      if (b === a) continue
      const v = Math.abs(matrix[a][b])
      if (Number.isFinite(v) && v > maxCorr) maxCorr = v
    }
    return matrix[a][a] > maxCorr
  })
  return (
    <div>
      <Heading>{r.discriminantFLTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left"> </Th>
            {lvNames.map((name) => (
              <Th key={name}>{name}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, a) => (
            <tr key={lvNames[a]}>
              <Td align="left" mono={false} bold>{lvNames[a]}</Td>
              {row.map((v, b) => {
                if (b > a) return <Td key={b}> </Td>
                if (a === b) {
                  if (v === null) return <Td key={b}>—</Td>
                  return (
                    <Td key={b}>
                      <span className={`font-bold ${diagOk[a] ? TONE_TEXT.ok : TONE_TEXT.bad}`}>
                        {fmtNum(v, 3)}
                      </span>
                    </Td>
                  )
                }
                return <Td key={b}>{fmtNum(v, 3)}</Td>
              })}
            </tr>
          ))}
        </tbody>
      </TableBox>
      <Note>{r.flNote}</Note>
    </div>
  )
}

function HtmtTable({ estimate, r }) {
  const { lvNames, matrix } = estimate.htmt
  return (
    <div>
      <Heading>{r.discriminantHTMTTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left"> </Th>
            {lvNames.map((name) => (
              <Th key={name}>{name}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, a) => (
            <tr key={lvNames[a]}>
              <Td align="left" mono={false} bold>{lvNames[a]}</Td>
              {row.map((v, b) => {
                if (b >= a) return <Td key={b}> </Td>
                if (v === null || !Number.isFinite(v)) return <Td key={b}>—</Td>
                return (
                  <Td key={b}>
                    <span className={v < 0.85 ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(v, 3)}</span>
                  </Td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </TableBox>
      <Note>{r.htmtNote}</Note>
    </div>
  )
}

function PathsTable({ estimate, boot, bootOk, r }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.structuralTitle}</Heading>
      {bootOk && (
        <p className="text-[11px] text-duo-cocoa-400 mb-1.5 font-mono">
          {fillTemplate(r.bootstrapMeta, {
            nValid: boot.nValid,
            nRequested: boot.nRequested,
            seed: boot.seed,
            ciType: boot.ciType === 'bca' ? 'BCa' : 'percentile',
          })}
        </p>
      )}
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.path}</Th>
            <Th>{c.beta}</Th>
            {bootOk && (
              <>
                <Th>{c.se}</Th>
                <Th>{c.t}</Th>
                <Th>{c.p}</Th>
                <Th>{c.ci}</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {bootOk
            ? boot.paths.map((q) => (
                <tr key={`${q.from}-${q.to}`}>
                  <Td align="left" mono={false} bold>{q.from} → {q.to}</Td>
                  <Td>{fmtNum(q.original, 3)}</Td>
                  <Td>{fmtNum(q.se, 3)}</Td>
                  <Td>{fmtNum(q.t, 2)}</Td>
                  <Td>
                    <span className={TONE_TEXT[toneForP(q.p)] || ''}>{fmtP(q.p)}</span>
                  </Td>
                  <Td>
                    [{fmtNum(q.ciLower, 3)}, {fmtNum(q.ciUpper, 3)}]
                  </Td>
                </tr>
              ))
            : estimate.pathCoefficients.map((q) => (
                <tr key={`${q.from}-${q.to}`}>
                  <Td align="left" mono={false} bold>{q.from} → {q.to}</Td>
                  <Td>{fmtNum(q.coef, 3)}</Td>
                </tr>
              ))}
        </tbody>
      </TableBox>
    </div>
  )
}

function R2Table({ estimate, r }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.r2Title}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.lv}</Th>
            <Th>{c.r2}</Th>
            <Th>{c.adjR2}</Th>
          </tr>
        </thead>
        <tbody>
          {estimate.structural.map((q) => (
            <tr key={q.lv}>
              <Td align="left" mono={false} bold>{q.lv}</Td>
              <Td>{fmtNum(q.r2, 3)}</Td>
              <Td>{fmtNum(q.adjR2, 3)}</Td>
            </tr>
          ))}
        </tbody>
      </TableBox>
    </div>
  )
}

function EffectsTable({ estimate, r }) {
  const c = r.cols
  const rows = estimate.structural.flatMap((s) =>
    s.predictors.map((p) => ({ from: p.from, to: s.lv, f2: p.f2, vif: p.vif }))
  )
  return (
    <div>
      <Heading>{r.effectsTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.path}</Th>
            <Th>{c.f2}</Th>
            <Th align="left">{c.effect}</Th>
            <Th>{c.vif}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => {
            const vs = vifStatus(q.vif)
            return (
              <tr key={`${q.from}-${q.to}`}>
                <Td align="left" mono={false} bold>{q.from} → {q.to}</Td>
                <Td>{fmtNum(q.f2, 3)}</Td>
                <Td align="left" mono={false}>{r.f2Interp[f2InterpKey(q.f2)]}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={vs} />
                    <span className={TONE_TEXT[vs]}>{fmtNum(q.vif, 2)}</span>
                  </span>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.f2Note}</Note>
    </div>
  )
}

/** 模型適配：SRMR / d_ULS / d_G / NFI（飽和 vs 估計模型；SRMR 與 NFI 帶 LED）＋ GoF（附不建議註記） */
function FitTable({ fit, gof, r }) {
  const c = r.cols
  const rows = [
    { key: 'SRMR', get: (f) => f.srmr, led: srmrStatus, dec: 3 },
    { key: 'd_ULS', get: (f) => f.dUls, led: null, dec: 3 },
    { key: 'd_G', get: (f) => f.dG, led: null, dec: 3 },
    { key: 'NFI', get: (f) => f.nfi, led: (v) => (Number.isFinite(v) ? (v >= 0.9 ? 'ok' : v >= 0.8 ? 'warn' : 'bad') : 'bad'), dec: 3 },
  ]
  const cell = (row, f) => {
    const v = row.get(f)
    if (v === null || !Number.isFinite(v)) return <Td>—</Td>
    if (!row.led) return <Td>{fmtNum(v, row.dec)}</Td>
    const st = row.led(v)
    return (
      <Td>
        <span className="inline-flex items-center gap-2">
          <Led status={st} />
          <span className={TONE_TEXT[st]}>{fmtNum(v, row.dec)}</span>
        </span>
      </Td>
    )
  }
  return (
    <div>
      <Heading>{r.fitTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.fitIndex}</Th>
            <Th>{c.saturated}</Th>
            <Th>{c.estimated}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <Td align="left" mono bold>{row.key}</Td>
              {cell(row, fit.saturated)}
              {cell(row, fit.estimated)}
            </tr>
          ))}
          {Number.isFinite(gof) && (
            <tr>
              <Td align="left" mono bold>GoF</Td>
              <Td>—</Td>
              <Td>{fmtNum(gof, 3)}</Td>
            </tr>
          )}
        </tbody>
      </TableBox>
      <Note>{r.fitNote}</Note>
    </div>
  )
}

/** 預測相關性：blindfolding Q² */
function Q2Table({ q2res, r }) {
  const c = r.cols
  return (
    <div>
      <Heading>{r.q2Title}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.lv}</Th>
            <Th>{c.q2}</Th>
          </tr>
        </thead>
        <tbody>
          {q2res.constructs.map((q) => {
            const ok = Number.isFinite(q.q2) && q.q2 > 0
            return (
              <tr key={q.lv}>
                <Td align="left" mono={false} bold>{q.lv}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={ok ? 'ok' : 'bad'} />
                    <span className={ok ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(q.q2, 3)}</span>
                  </span>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{fillTemplate(r.q2Note, { d: q2res.omissionDistance })}</Note>
    </div>
  )
}

/** simple slope 三線圖／二次效果曲線（SVG，design tokens 用 currentColor） */
function SlopePlot({ target, interaction, r }) {
  const W = 320
  const H = 190
  const PAD = { l: 34, r: 10, t: 10, b: 26 }
  const xs = [-2, -1, 0, 1, 2]
  let series
  if (target.quadratic) {
    const pts = []
    for (let x = -2; x <= 2.001; x += 0.2) {
      pts.push([x, target.curve.linear * x + target.curve.quad * x * x])
    }
    series = [{ key: 'mid', pts, cls: 'text-duo-amber-500', dash: '' }]
  } else {
    const mk = (m) => xs.map((x) => {
      const sl = target.slopes.find((q) => q.level === m)
      return [x, sl.slope * x + sl.intercept]
    })
    series = [
      { key: 'lo', pts: mk(-1), cls: 'text-duo-cocoa-300', dash: '4 3' },
      { key: 'mid', pts: mk(0), cls: 'text-duo-cocoa-500', dash: '' },
      { key: 'hi', pts: mk(1), cls: 'text-duo-amber-500', dash: '' },
    ]
  }
  const ys = series.flatMap((s) => s.pts.map((q) => q[1]))
  let yMin = Math.min(...ys, 0)
  let yMax = Math.max(...ys, 0)
  const padY = Math.max((yMax - yMin) * 0.1, 0.1)
  yMin -= padY
  yMax += padY
  const sx = (x) => PAD.l + ((x + 2) / 4) * (W - PAD.l - PAD.r)
  const sy = (y) => PAD.t + ((yMax - y) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const lvNames = r.slopeLevelNames
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm" role="img"
         aria-label={`simple slopes: ${interaction.name}`}>
      {/* 軸線 */}
      <line x1={PAD.l} y1={sy(0)} x2={W - PAD.r} y2={sy(0)}
            className="text-duo-cream-200" stroke="currentColor" strokeWidth="1" />
      <line x1={sx(0)} y1={PAD.t} x2={sx(0)} y2={H - PAD.b}
            className="text-duo-cream-200" stroke="currentColor" strokeWidth="1" />
      {[-2, -1, 0, 1, 2].map((x) => (
        <text key={x} x={sx(x)} y={H - 8} textAnchor="middle"
              className="text-duo-cocoa-400 font-mono" fill="currentColor" fontSize="9">
          {x}
        </text>
      ))}
      {[yMin + padY, yMax - padY].map((y, i) => (
        <text key={i} x={PAD.l - 4} y={sy(y) + 3} textAnchor="end"
              className="text-duo-cocoa-400 font-mono" fill="currentColor" fontSize="9">
          {y.toFixed(1)}
        </text>
      ))}
      {series.map((s) => (
        <polyline
          key={s.key}
          points={s.pts.map((q) => `${sx(q[0])},${sy(q[1])}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={s.dash}
          className={s.cls}
        />
      ))}
      {/* 圖例 */}
      {!target.quadratic && series.map((s, i) => (
        <g key={s.key} className={s.cls} transform={`translate(${PAD.l + 6 + i * 92}, ${PAD.t + 6})`}>
          <line x1="0" y1="0" x2="16" y2="0" stroke="currentColor" strokeWidth="2" strokeDasharray={s.dash} />
          <text x="20" y="3" fill="currentColor" fontSize="9" className="font-mono">
            {lvNames[s.key]}
          </text>
        </g>
      ))}
      <text x={W - PAD.r} y={H - 8} textAnchor="end"
            className="text-duo-cocoa-400" fill="currentColor" fontSize="9">
        {fillTemplate(r.slopeAxisX, { iv: target.iv })}
      </text>
    </svg>
  )
}

/** 調節：交互效果摘要 ＋ simple slopes（two-stage 二因子／二次） */
function InteractionBlock({ estimate, boot, bootOk, r }) {
  const c = r.cols
  const slopeMap = new Map()
  if (bootOk && Array.isArray(boot.slopes)) {
    for (const s of boot.slopes) slopeMap.set(`${s.interaction}|${s.to}|${s.level}`, s)
  }
  const levelName = (lv) => (lv < 0 ? r.slopeLevelNames.lo : lv > 0 ? r.slopeLevelNames.hi : r.slopeLevelNames.mid)
  return (
    <div>
      <Heading>{r.interactionTitle}</Heading>
      {estimate.interactions.map((it) => (
        <div key={it.name} className="mb-4">
          <p className="text-[11px] text-duo-cocoa-400 mb-1.5 font-mono">
            {it.name}｜{fillTemplate(r.interactionMethodLine, { method: it.method })}
            {it.sdProduct !== null ? r.sdProductTag : ''}
          </p>
          {it.targets.map((tg) => (
            <div key={tg.to} className="mb-3">
              {Array.isArray(tg.slopes) && (
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="bg-white border border-duo-cream-200 rounded-lg p-2 shrink-0">
                    <SlopePlot target={tg} interaction={it} r={r} />
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <TableBox>
                      <thead className="bg-duo-cream-50">
                        <tr>
                          <Th align="left">
                            {tg.quadratic ? tg.iv : tg.moderator}
                            {tg.quadratic ? `（${r.quadraticTag}）` : ''}
                          </Th>
                          <Th>{r.slopeCol}</Th>
                          {bootOk && (
                            <>
                              <Th>{c.se}</Th>
                              <Th>{c.t}</Th>
                              <Th>{c.p}</Th>
                              <Th>{c.ci}</Th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tg.slopes.map((sl) => {
                          const b = slopeMap.get(`${it.name}|${tg.to}|${sl.level}`)
                          return (
                            <tr key={sl.level}>
                              <Td align="left" mono={false} bold>{levelName(sl.level)}</Td>
                              <Td>{fmtNum(sl.slope, 3)}</Td>
                              {bootOk && (
                                <>
                                  <Td>{fmtNum(b?.se, 3)}</Td>
                                  <Td>{fmtNum(b?.t, 2)}</Td>
                                  <Td>
                                    <span className={TONE_TEXT[toneForP(b?.p)] || ''}>{fmtP(b?.p)}</span>
                                  </Td>
                                  <Td>[{fmtNum(b?.ciLower, 3)}, {fmtNum(b?.ciUpper, 3)}]</Td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </TableBox>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <Note>{r.slopesNote}</Note>
    </div>
  )
}

/** 中介：直接／特定間接／間接總和／總效果 分解表（bootstrap CI） */
function MediationTable({ estimate, boot, bootOk, r }) {
  const c = r.cols
  const indMap = new Map()
  const tiMap = new Map()
  const totMap = new Map()
  const pathMap = new Map()
  if (bootOk) {
    for (const q of boot.indirectEffects || []) indMap.set(`${q.from}|${q.to}|${q.via.join('→')}`, q)
    for (const q of boot.totalIndirectEffects || []) tiMap.set(`${q.from}|${q.to}`, q)
    for (const q of boot.totalEffects || []) totMap.set(`${q.from}|${q.to}`, q)
    for (const q of boot.paths) pathMap.set(`${q.from}|${q.to}`, q)
  }
  const bootCells = (b) => (
    <>
      <Td>{fmtNum(b ? b.se : null, 3)}</Td>
      <Td>{fmtNum(b ? b.t : null, 2)}</Td>
      <Td>{b ? <span className={TONE_TEXT[toneForP(b.p)] || ''}>{fmtP(b.p)}</span> : '—'}</Td>
      <Td>{b ? `[${fmtNum(b.ciLower, 3)}, ${fmtNum(b.ciUpper, 3)}]` : '—'}</Td>
    </>
  )
  return (
    <div>
      <Heading>{r.mediationTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{c.path}</Th>
            <Th align="left">{r.effectCol}</Th>
            <Th>{c.beta}</Th>
            {bootOk && (
              <>
                <Th>{c.se}</Th>
                <Th>{c.t}</Th>
                <Th>{c.p}</Th>
                <Th>{c.ci}</Th>
              </>
            )}
            <Th>{r.vafCol}</Th>
          </tr>
        </thead>
        <tbody>
          {estimate.mediation.effects.flatMap((eff) => {
            const key = `${eff.from}|${eff.to}`
            const rows = []
            const pairLabel = `${eff.from} → ${eff.to}`
            rows.push(
              <tr key={`${key}-direct`}>
                <Td align="left" mono={false} bold>{pairLabel}</Td>
                <Td align="left" mono={false}>{r.directLabel}</Td>
                <Td>{eff.direct === null ? '—' : fmtNum(eff.direct, 3)}</Td>
                {bootOk && bootCells(eff.direct === null ? null : pathMap.get(key))}
                <Td>—</Td>
              </tr>
            )
            eff.chains.forEach((ch, ci) => {
              const b = bootOk ? indMap.get(`${key}|${ch.via.join('→')}`) : null
              const sig = b && Number.isFinite(b.ciLower) && (b.ciLower > 0 || b.ciUpper < 0)
              rows.push(
                <tr key={`${key}-ch${ci}`}>
                  <Td align="left" mono={false}> </Td>
                  <Td align="left" mono={false}>
                    <span className="inline-flex items-center gap-2">
                      {bootOk && <Led status={sig ? 'ok' : 'bad'} />}
                      {fillTemplate(r.indirectVia, { via: ch.via.join(' → ') })}
                    </span>
                  </Td>
                  <Td>{fmtNum(ch.coef, 3)}</Td>
                  {bootOk && bootCells(b)}
                  <Td>—</Td>
                </tr>
              )
            })
            rows.push(
              <tr key={`${key}-ti`}>
                <Td align="left" mono={false}> </Td>
                <Td align="left" mono={false}>{r.totalIndirectLabel}</Td>
                <Td>{fmtNum(eff.totalIndirect, 3)}</Td>
                {bootOk && bootCells(tiMap.get(key))}
                <Td>{eff.vaf === null ? '—' : `${fmtNum(eff.vaf * 100, 1)}%`}</Td>
              </tr>
            )
            rows.push(
              <tr key={`${key}-tot`}>
                <Td align="left" mono={false}> </Td>
                <Td align="left" mono={false} bold>{r.totalLabel}</Td>
                <Td>{fmtNum(eff.total, 3)}</Td>
                {bootOk && bootCells(totMap.get(key))}
                <Td>—</Td>
              </tr>
            )
            return rows
          })}
        </tbody>
      </TableBox>
      <Note>{r.mediationNote}</Note>
    </div>
  )
}

/** 第二階段資料（LV 分數新資料檔）下載 */
function DerivedBlock({ derived, r }) {
  const download = () => {
    const esc = (v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v))
    const lines = [derived.columns.map(esc).join(',')]
    for (const row of derived.rows) lines.push(row.map((v) => (Number.isFinite(v) ? String(v) : '')).join(','))
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pls_stage2_scores.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div>
      <Heading>{r.derivedTitle}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-lg p-3 flex items-center justify-between gap-3">
        <span className="text-[11px] text-duo-cocoa-500 font-mono">
          {derived.columns.join('、')}（n = {derived.rows.length}）
        </span>
        <button
          type="button"
          onClick={download}
          className="px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-duo-amber-500 text-white hover:bg-duo-amber-600 transition shrink-0"
        >
          {r.downloadDerived}
        </button>
      </div>
      <Note>{r.derivedNote}</Note>
    </div>
  )
}

/** W5：PLS-MGA 三法並列表 */
function MgaBlock({ mga, r }) {
  return (
    <div>
      <Heading>{r.mgaTitle}</Heading>
      <p className="text-[11px] text-duo-cocoa-400 mb-1.5 font-mono">
        {fillTemplate(r.mgaMeta, {
          g1: mga.groups[0], n1: mga.n1, g2: mga.groups[1], n2: mga.n2,
          b: mga.bootstrapN, np: mga.nPermValid,
        })}
      </p>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{r.cols.path}</Th>
            <Th>{fillTemplate(r.mgaColG1, { g: mga.groups[0] })}</Th>
            <Th>{fillTemplate(r.mgaColG2, { g: mga.groups[1] })}</Th>
            <Th>{r.mgaColDiff}</Th>
            <Th>{r.mgaColPerm}</Th>
            <Th>{r.mgaColHenseler}</Th>
            <Th>{r.mgaColParam}</Th>
            <Th>{r.mgaColWelch}</Th>
          </tr>
        </thead>
        <tbody>
          {mga.paths.map((q) => {
            const sig = Number.isFinite(q.permutation.p) && q.permutation.p < 0.05
            return (
              <tr key={`${q.from}-${q.to}`}>
                <Td align="left" mono={false} bold>{q.from} → {q.to}</Td>
                <Td>{fmtNum(q.group1.coef, 3)}</Td>
                <Td>{fmtNum(q.group2.coef, 3)}</Td>
                <Td>{fmtNum(q.diff, 3)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={sig ? 'ok' : 'warn'} />
                    <span className={TONE_TEXT[toneForP(q.permutation.p)] || ''}>{fmtP(q.permutation.p)}</span>
                  </span>
                </Td>
                <Td>{fmtNum(q.henselerP, 3)}</Td>
                <Td><span className={TONE_TEXT[toneForP(q.parametric.p)] || ''}>{fmtP(q.parametric.p)}</span></Td>
                <Td><span className={TONE_TEXT[toneForP(q.welch.p)] || ''}>{fmtP(q.welch.p)}</span></Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.mgaNote}</Note>
    </div>
  )
}

/** W5：MICOM 三步表 */
function MicomBlock({ micom, r }) {
  return (
    <div>
      <Heading>{r.micomTitle}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{r.cols.lv}</Th>
            <Th>{r.micomColC}</Th>
            <Th>{r.micomColQ5}</Th>
            <Th>{r.micomColMean}</Th>
            <Th>{r.micomColVar}</Th>
          </tr>
        </thead>
        <tbody>
          {micom.constructs.map((q) => {
            const step2ok = q.c >= q.cQuantile5
            const meanOk = q.mean.diff >= q.mean.ciLower && q.mean.diff <= q.mean.ciUpper
            const varOk = q.variance.diff >= q.variance.ciLower && q.variance.diff <= q.variance.ciUpper
            return (
              <tr key={q.lv}>
                <Td align="left" mono={false} bold>{q.lv}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={step2ok ? 'ok' : 'bad'} />
                    <span className={step2ok ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(q.c, 3)}</span>
                  </span>
                </Td>
                <Td>{fmtNum(q.cQuantile5, 3)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={meanOk ? 'ok' : 'warn'} />
                    {fmtNum(q.mean.diff, 3)} [{fmtNum(q.mean.ciLower, 3)}, {fmtNum(q.mean.ciUpper, 3)}]
                  </span>
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={varOk ? 'ok' : 'warn'} />
                    {fmtNum(q.variance.diff, 3)} [{fmtNum(q.variance.ciLower, 3)}, {fmtNum(q.variance.ciUpper, 3)}]
                  </span>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </TableBox>
      <Note>{r.micomNote}</Note>
    </div>
  )
}

/** W5：PLSpredict ＋ CVPAT */
function PredictBlock({ predict, r }) {
  const cvRow = (label, cv) => (
    <tr key={label}>
      <Td align="left" mono={false} bold>{label}</Td>
      <Td>{fmtNum(cv.dBar, 3)}</Td>
      <Td>{fmtNum(cv.t, 2)}</Td>
      <Td><span className={TONE_TEXT[toneForP(cv.p)] || ''}>{fmtP(cv.p)}</span></Td>
      <Td> </Td>
    </tr>
  )
  return (
    <div>
      <Heading>{fillTemplate(r.predictTitle, { k: predict.k })}</Heading>
      <TableBox>
        <thead className="bg-duo-cream-50">
          <tr>
            <Th align="left">{r.cols.lv}</Th>
            <Th align="left">{r.cols.indicator}</Th>
            <Th>{r.predictColQ2p}</Th>
            <Th>{r.predictColRmsePls}</Th>
            <Th>{r.predictColRmseLm}</Th>
            <Th>{r.predictColMae}</Th>
          </tr>
        </thead>
        <tbody>
          {predict.indicators.map((q, i, arr) => {
            const q2ok = Number.isFinite(q.q2predict) && q.q2predict > 0
            const beatsLm = q.rmse < q.lm.rmse
            const firstOfBlock = i === 0 || arr[i - 1].lv !== q.lv
            return (
              <tr key={`${q.lv}-${q.indicator}`}>
                <Td align="left" mono={false} bold>{firstOfBlock ? q.lv : ''}</Td>
                <Td align="left" mono={false}>{q.indicator}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Led status={q2ok ? 'ok' : 'bad'} />
                    <span className={q2ok ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(q.q2predict, 3)}</span>
                  </span>
                </Td>
                <Td>
                  <span className={beatsLm ? TONE_TEXT.ok : TONE_TEXT.bad}>{fmtNum(q.rmse, 3)}</span>
                </Td>
                <Td>{fmtNum(q.lm.rmse, 3)}</Td>
                <Td>{fmtNum(q.mae, 3)}</Td>
              </tr>
            )
          })}
          {cvRow(r.cvpatVsIA, predict.cvpat.vsIA)}
          {cvRow(r.cvpatVsLM, predict.cvpat.vsLM)}
        </tbody>
      </TableBox>
      <Note>{r.predictNote}</Note>
    </div>
  )
}

/** W5：IPMA 象限散布圖＋表 */
function IpmaBlock({ ipma, r }) {
  const W = 340
  const H = 240
  const PAD = { l: 42, r: 14, t: 12, b: 30 }
  const pts = ipma.constructs
  const xs = pts.map((q) => q.importance)
  const ys = pts.map((q) => q.performance)
  const xMin = Math.min(...xs, 0)
  const xMax = Math.max(...xs, 0)
  const xPad = Math.max((xMax - xMin) * 0.15, 0.05)
  const yMin = Math.max(Math.min(...ys) - 8, 0)
  const yMax = Math.min(Math.max(...ys) + 8, 100)
  const sx = (x) => PAD.l + ((x - (xMin - xPad)) / ((xMax + xPad) - (xMin - xPad))) * (W - PAD.l - PAD.r)
  const sy = (y) => PAD.t + ((yMax - y) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const xMean = xs.reduce((s, v) => s + v, 0) / xs.length
  const yMean = ys.reduce((s, v) => s + v, 0) / ys.length
  return (
    <div>
      <Heading>{fillTemplate(r.ipmaTitle, { target: ipma.target })}</Heading>
      <div className="flex flex-wrap gap-4 items-start">
        <div className="bg-white border border-duo-cream-200 rounded-lg p-2 shrink-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm" role="img" aria-label="IPMA">
            <line x1={sx(xMean)} y1={PAD.t} x2={sx(xMean)} y2={H - PAD.b}
                  className="text-duo-cream-200" stroke="currentColor" strokeDasharray="4 3" />
            <line x1={PAD.l} y1={sy(yMean)} x2={W - PAD.r} y2={sy(yMean)}
                  className="text-duo-cream-200" stroke="currentColor" strokeDasharray="4 3" />
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b}
                  className="text-duo-cocoa-200" stroke="currentColor" />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b}
                  className="text-duo-cocoa-200" stroke="currentColor" />
            {pts.map((q) => (
              <g key={q.lv}>
                <circle cx={sx(q.importance)} cy={sy(q.performance)} r="5"
                        className="text-duo-amber-500" fill="currentColor" />
                <text x={sx(q.importance) + 8} y={sy(q.performance) + 3}
                      className="text-duo-cocoa-800" fill="currentColor" fontSize="10">
                  {q.lv}
                </text>
              </g>
            ))}
            <text x={W - PAD.r} y={H - 8} textAnchor="end"
                  className="text-duo-cocoa-400" fill="currentColor" fontSize="9">
              {r.ipmaColImportance}
            </text>
            <text x={12} y={PAD.t + 8} className="text-duo-cocoa-400" fill="currentColor" fontSize="9">
              {r.ipmaColPerformance}
            </text>
            {[xMin, xMax].map((x, i) => (
              <text key={i} x={sx(x)} y={H - 14} textAnchor="middle"
                    className="text-duo-cocoa-400 font-mono" fill="currentColor" fontSize="9">
                {x.toFixed(2)}
              </text>
            ))}
            {[yMin, yMax].map((y, i) => (
              <text key={i} x={PAD.l - 4} y={sy(y) + 3} textAnchor="end"
                    className="text-duo-cocoa-400 font-mono" fill="currentColor" fontSize="9">
                {Math.round(y)}
              </text>
            ))}
          </svg>
        </div>
        <div className="flex-1 min-w-[240px]">
          <TableBox>
            <thead className="bg-duo-cream-50">
              <tr>
                <Th align="left">{r.cols.lv}</Th>
                <Th>{r.ipmaColImportance}</Th>
                <Th>{r.ipmaColPerformance}</Th>
              </tr>
            </thead>
            <tbody>
              {ipma.constructs.map((q) => (
                <tr key={q.lv}>
                  <Td align="left" mono={false} bold>{q.lv}</Td>
                  <Td>{fmtNum(q.importance, 3)}</Td>
                  <Td>{fmtNum(q.performance, 1)}</Td>
                </tr>
              ))}
              {ipma.indicators.map((q) => (
                <tr key={`${q.lv}-${q.indicator}`}>
                  <Td align="left" mono={false}>
                    <span className="pl-4 text-duo-cocoa-500">{q.indicator}</span>
                  </Td>
                  <Td>{fmtNum(q.importance, 3)}</Td>
                  <Td>{fmtNum(q.performance, 1)}</Td>
                </tr>
              ))}
            </tbody>
          </TableBox>
        </div>
      </div>
      <Note>{fillTemplate(r.ipmaNote, { targetPerf: fmtNum(ipma.targetPerformance, 1) })}</Note>
    </div>
  )
}

/** W5 功能的錯誤/結果包裝 */
function W5Section({ data, feature, r, children }) {
  if (!data) return null
  if (data.error) {
    return <WarnBox>{fillTemplate(r.w5ErrorPrefix, { feature, message: data.message || data.error })}</WarnBox>
  }
  return children
}

/* ─────────────────────  主元件  ───────────────────── */

function Result() {
  const { dataset, lang, t } = useApp()
  const [rawState] = useAnalysisState()
  const committed = rawState?.committed || null
  const narrow = useIsNarrow()
  const canvasMode = !narrow && rawState?.plsView === 'canvas'

  const { status, progress, result: res } = usePLSResult(dataset, committed)

  const r = t.pls.result
  if (!dataset) return null

  // 畫布模式：主區顯示 Canvas（佔滿 Result 面板寬度），與表單共用同一份模型 state
  if (canvasMode) return <Canvas />
  if (!committed) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{r.runFirst}</div>
  }
  if (status === 'running' || !res) {
    const pct = Math.round(progress * 100)
    return (
      <div className="max-w-sm">
        <div className="text-sm text-duo-cocoa-500 mb-2">
          {fillTemplate(r.computing, { pct })}
        </div>
        <div className="h-2 rounded-full bg-duo-cream-100 overflow-hidden">
          <div
            className="h-full bg-duo-amber-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }
  if (res.error) {
    return (
      <div className="p-3 rounded-md bg-duo-sig-bad/10 border border-duo-sig-bad text-sm text-duo-cocoa-800 leading-relaxed">
        {res.message || res.error}
      </div>
    )
  }

  const { estimate, bootstrap: boot, q2: q2res, mga, micom, predict, ipma } = res
  const bootOk = Boolean(boot && !boot.error)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  // 多階段模型（two-stage 調節／HOC）：量測統計量取第一階段（原始指標），結構取最終階段
  const meas = estimate.stage1 || estimate
  const lvModes = meas.lvModes || {}

  // bootstrap loadings / weights 查表
  const loadMap = new Map()
  const weightMap = new Map()
  if (bootOk) {
    for (const q of boot.loadings) loadMap.set(`${q.lv}｜${q.indicator}`, q)
    for (const q of boot.weights || []) weightMap.set(`${q.lv}｜${q.indicator}`, q)
  }
  const loadingByKey = new Map(
    meas.outerLoadings.map((q) => [`${q.lv}｜${q.indicator}`, q.loading]))
  // 每個構念的指標數（單指標構念的信度定義上為 1，顯示為 —）
  const kByLv = new Map()
  for (const q of meas.outerLoadings) kByLv.set(q.lv, (kByLv.get(q.lv) || 0) + 1)

  const reflectiveLoadings = meas.outerLoadings.filter((q) => lvModes[q.lv] !== 'formative')
  const formativeWeights = meas.outerWeights.filter((q) => lvModes[q.lv] === 'formative')
  const reflectiveReliability = meas.reliability.filter((q) => q.mode !== 'formative')

  const lastStructural = estimate.structural[estimate.structural.length - 1]

  const cards = [
    { label: r.cards.n, value: fmtInt(estimate.meta.n) },
    {
      label: r.cards.iterations,
      value: fmtInt(estimate.meta.iterations),
      sub: estimate.meta.converged ? r.converged : r.notConverged,
      tone: estimate.meta.converged ? 'ok' : 'bad',
    },
    {
      label: r.cards.bootstrap,
      value: bootOk ? fmtInt(boot.nValid) : '—',
      sub: bootOk ? `/ ${boot.nRequested}` : undefined,
    },
  ]
  if (lastStructural) {
    cards.push({
      label: `${r.cards.r2}（${lastStructural.lv}）`,
      value: fmtNum(lastStructural.r2, 3),
    })
  }

  return (
    <div>
      {estimate.meta.warnings.length > 0 && (
        <WarnBox>
          {estimate.meta.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </WarnBox>
      )}
      {boot && boot.error && (
        <WarnBox>{fillTemplate(r.bootstrapUnavailable, { message: boot.message || boot.error })}</WarnBox>
      )}

      <StatCards items={cards} />

      <p className="text-[11px] text-duo-cocoa-400 mb-1 font-mono">
        {fillTemplate(r.settingsLine, {
          scheme: estimate.meta.scheme,
          plsc: estimate.meta.consistent ? r.plscTag : '',
        })}
      </p>
      {Array.isArray(estimate.meta.autoAddedPaths) && estimate.meta.autoAddedPaths.length > 0 && (
        <p className="text-[11px] text-duo-cocoa-400 mb-1 font-mono">
          {fillTemplate(r.autoAddedLine, {
            paths: estimate.meta.autoAddedPaths.map((q) => `${q.from} → ${q.to}`).join('、'),
          })}
        </p>
      )}
      {estimate.stage1 && (
        <p className="text-[11px] text-duo-cocoa-500 leading-snug bg-duo-cream-50 border border-duo-cocoa-100 rounded-md px-3 py-2 mb-2">
          {r.stage1Note}
        </p>
      )}

      {reflectiveLoadings.length > 0 && (
        <LoadingsTable rows={reflectiveLoadings} loadMap={loadMap} bootOk={bootOk} r={r} labelMap={labelMap} />
      )}
      {formativeWeights.length > 0 && (
        <FormativeWeightsTable
          rows={formativeWeights}
          weightMap={weightMap}
          loadingByKey={loadingByKey}
          bootOk={bootOk}
          r={r}
          labelMap={labelMap}
        />
      )}
      {reflectiveReliability.length > 0 && (
        <ReliabilityTable rows={reflectiveReliability} kByLv={kByLv} r={r} />
      )}
      <FornellLarckerTable estimate={meas} r={r} />
      <HtmtTable estimate={meas} r={r} />
      <PathsTable estimate={estimate} boot={boot} bootOk={bootOk} r={r} />
      {Array.isArray(estimate.interactions) && estimate.interactions.length > 0 && (
        <InteractionBlock estimate={estimate} boot={boot} bootOk={bootOk} r={r} />
      )}
      <R2Table estimate={estimate} r={r} />
      <EffectsTable estimate={estimate} r={r} />
      {estimate.mediation && (
        <MediationTable estimate={estimate} boot={boot} bootOk={bootOk} r={r} />
      )}
      {meas.fit && <FitTable fit={meas.fit} gof={meas.gof} r={r} />}
      {estimate.derived && <DerivedBlock derived={estimate.derived} r={r} />}
      {q2res && q2res.error && (
        <WarnBox>{fillTemplate(r.q2Unavailable, { message: q2res.message || q2res.error })}</WarnBox>
      )}
      {q2res && !q2res.error && <Q2Table q2res={q2res} r={r} />}
      <W5Section data={micom} feature="MICOM" r={r}>
        <MicomBlock micom={micom} r={r} />
      </W5Section>
      <W5Section data={mga} feature="PLS-MGA" r={r}>
        <MgaBlock mga={mga} r={r} />
      </W5Section>
      <W5Section data={predict} feature="PLSpredict" r={r}>
        <PredictBlock predict={predict} r={r} />
      </W5Section>
      <W5Section data={ipma} feature="IPMA" r={r}>
        <IpmaBlock ipma={ipma} r={r} />
      </W5Section>
    </div>
  )
}

export default Result
