/**
 * PLS-SEM — Result（中欄）
 *
 * 結構：
 *   1. StatCards：N / PLS 迭代 / Bootstrap 有效重抽 / 主要內生構念 R²
 *   2. 測量模型：外部負荷量表（含 bootstrap SE, t, p）＋ 信度效度表（α / rho_A / CR / AVE，LED 綠紅）
 *   3. 區辨效度：Fornell-Larcker 矩陣 ＋ HTMT 表（< .85 綠、≥ .85 紅）
 *   4. 結構模型：路徑係數表（β / SE / t / p / 95% CI）＋ R² 表 ＋ f² / VIF 表
 *
 * 檢視模式：state.plsView === 'canvas'（桌面）時，本元件改渲染 Canvas（拖拉式畫布），
 * 與表單共用同一份模型 state；窄幅退回表單結果。
 *
 * 計算觸發：Config 按「執行分析」把驗證過的模型寫入 state.committed，
 * 本元件 useMemo 依 [dataset, committed] 計算（Worker 接線見 compute.js 檔頭 TODO）。
 */
import { useEffect, useMemo, useState } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runPLSAnalysis } from './compute'
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

function LoadingsTable({ estimate, loadMap, bootOk, r, labelMap }) {
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
          {estimate.outerLoadings.map((q, i, arr) => {
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

function ReliabilityTable({ estimate, kByLv, r }) {
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
          {estimate.reliability.map((q) => {
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

/* ─────────────────────  主元件  ───────────────────── */

function Result() {
  const { dataset, lang, t } = useApp()
  const [rawState] = useAnalysisState()
  const committed = rawState?.committed || null
  const narrow = useIsNarrow()
  const canvasMode = !narrow && rawState?.plsView === 'canvas'

  const res = useMemo(
    () => (dataset && committed ? runPLSAnalysis(dataset.rows, committed) : null),
    [dataset, committed]
  )

  const r = t.pls.result
  if (!dataset) return null

  // 畫布模式：主區顯示 Canvas（佔滿 Result 面板寬度），與表單共用同一份模型 state
  if (canvasMode) return <Canvas />
  if (!committed || !res) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{r.runFirst}</div>
  }
  if (res.error) {
    return (
      <div className="p-3 rounded-md bg-duo-sig-bad/10 border border-duo-sig-bad text-sm text-duo-cocoa-800 leading-relaxed">
        {res.message || res.error}
      </div>
    )
  }

  const { estimate, bootstrap: boot } = res
  const bootOk = Boolean(boot && !boot.error)
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  // bootstrap loadings 查表
  const loadMap = new Map()
  if (bootOk) {
    for (const q of boot.loadings) loadMap.set(`${q.lv}｜${q.indicator}`, q)
  }
  // 每個構念的指標數（單指標構念的信度定義上為 1，顯示為 —）
  const kByLv = new Map()
  for (const q of estimate.outerLoadings) kByLv.set(q.lv, (kByLv.get(q.lv) || 0) + 1)

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

      <LoadingsTable estimate={estimate} loadMap={loadMap} bootOk={bootOk} r={r} labelMap={labelMap} />
      <ReliabilityTable estimate={estimate} kByLv={kByLv} r={r} />
      <FornellLarckerTable estimate={estimate} r={r} />
      <HtmtTable estimate={estimate} r={r} />
      <PathsTable estimate={estimate} boot={boot} bootOk={bootOk} r={r} />
      <R2Table estimate={estimate} r={r} />
      <EffectsTable estimate={estimate} r={r} />
    </div>
  )
}

export default Result
