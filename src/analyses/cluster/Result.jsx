/**
 * 集群分析 — Result（中欄）
 *
 * 結構：
 *   1. n / p / method / k 摘要列
 *   2. Elbow 曲線（小 SVG，含目前 k 的高亮）
 *   3. Cluster sizes table
 *   4. Cluster centroid / mean table（含 z-score）
 *   5. 品質指標：WSS, BSS, BSS/TSS, silhouette
 *   6. Hierarchical：簡化版 dendrogram（最後 n − 1 步合併）
 *   7. 教學模式：解讀建議
 *
 * Cluster analysis result panel: summary line, elbow curve, cluster
 * sizes, centroids with z-scores, quality metrics, dendrogram (Ward
 * only), recommendation.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runCluster } from './compute'
import { fmtNum, fillTemplate } from '../../lib/format'
import { niceTicks, linearScale, niceDomain } from '../../lib/viz/scale'

/* ─────────────────────────  shared helpers  ───────────────────────── */

function Heading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}
function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}
function Td({ children, align = 'right', mono = true, bold = false, color, bg }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      color || 'text-duo-cocoa-700',
      bg || '',
    ].join(' ')}>
      {children}
    </td>
  )
}

/** z-score → 顏色（z 大表示該變項在該群中相對突出） */
function zColor(z) {
  if (!Number.isFinite(z)) return 'text-duo-cocoa-300'
  const a = Math.abs(z)
  if (a < 0.25) return 'text-duo-cocoa-300'
  if (a < 0.5) return 'text-duo-cocoa-500'
  if (a < 1) return 'text-duo-cocoa-700'
  if (a < 1.5) return 'text-duo-amber-700 font-semibold'
  return 'text-duo-amber-800 font-semibold'
}

function silhouetteInterpKey(s) {
  if (!Number.isFinite(s)) return null
  if (s < 0.25) return 'noStructure'
  if (s < 0.5) return 'weak'
  if (s < 0.7) return 'reasonable'
  return 'strong'
}

/* ─────────────────────────  Summary  ───────────────────────── */

function SummaryLine({ result, t }) {
  const r = t.cluster.result
  const methodLabel = t.cluster.config.methods[result.method]
  return (
    <div className="bg-white border border-duo-cocoa-100 rounded-md px-3 py-2 text-xs text-duo-cocoa-700 font-mono">
      N = {result.n} &nbsp;·&nbsp; p = {result.p} ({r.vars}) &nbsp;·&nbsp; {r.method}: {methodLabel} &nbsp;·&nbsp; k = {result.k}
      {result.method === 'kmeans' && (
        <>
          &nbsp;·&nbsp; {result.iterations} {r.iterations}
          {result.converged ? '' : ` (${r.notConverged})`}
        </>
      )}
    </div>
  )
}

/* ─────────────────────────  Elbow plot  ───────────────────────── */

const FONT_MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace"
const FONT_SANS = 'system-ui, sans-serif'
const COLORS = {
  axis: '#a98257',
  axisText: '#7d5e3c',
  grid: '#ebd9c4',
  line: '#d97e2a',
  point: '#974f1a',
  current: '#fce0b8',
  bar: '#d97e2a',
  barAlt: '#a98257',
}

function ElbowPlot({ elbow, currentK, width = 560, height = 280 }) {
  if (!elbow || elbow.length === 0) return null
  const padding = { top: 18, right: 18, bottom: 44, left: 56 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const wssMax = Math.max(...elbow.map((d) => d.wss))
  const wssMin = Math.min(...elbow.map((d) => d.wss))
  const yDomain = niceDomain(0, wssMax)
  const yTicks = niceTicks(yDomain[0], yDomain[1], 5)
  const xCount = elbow.length
  const xOf = (i) => padding.left + (xCount > 1 ? (i / (xCount - 1)) * innerW : innerW / 2)
  const sy = (v) => padding.top + linearScale(v, yDomain, [innerH, 0])
  const points = elbow.map((d, i) => ({ x: xOf(i), y: sy(d.wss), k: d.k }))
  const linePath = 'M ' + points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
  const currentIdx = elbow.findIndex((d) => d.k === currentK)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ fontFamily: FONT_SANS }}>
      {/* y grid */}
      {yTicks.map((tv) => (
        <line key={tv} x1={padding.left} y1={sy(tv)} x2={padding.left + innerW} y2={sy(tv)}
          stroke={COLORS.grid} strokeWidth="0.5" strokeDasharray="2 3" />
      ))}
      {yTicks.map((tv) => (
        <text key={`yt${tv}`} x={padding.left - 8} y={sy(tv) + 3} textAnchor="end"
          style={{ fontFamily: FONT_MONO, fontSize: 10 }} fill={COLORS.axisText}>
          {Math.abs(tv) >= 1000 ? tv.toExponential(1) : Number.isInteger(tv) ? tv : tv.toFixed(1)}
        </text>
      ))}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH}
        stroke={COLORS.axis} strokeWidth="1" />
      <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH}
        stroke={COLORS.axis} strokeWidth="1" />
      {elbow.map((d, i) => (
        <text key={`xt${i}`} x={xOf(i)} y={padding.top + innerH + 16} textAnchor="middle"
          style={{ fontFamily: FONT_MONO, fontSize: 10 }} fill={COLORS.axisText}>
          {d.k}
        </text>
      ))}
      <text x={padding.left + innerW / 2} y={padding.top + innerH + 34} textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 500 }} fill={COLORS.axisText}>
        k
      </text>
      <text x={14} y={padding.top + innerH / 2} textAnchor="middle"
        transform={`rotate(-90 14 ${padding.top + innerH / 2})`}
        style={{ fontSize: 11, fontWeight: 500 }} fill={COLORS.axisText}>
        WSS
      </text>
      {/* current k highlight */}
      {currentIdx >= 0 && (
        <rect x={xOf(currentIdx) - 14} y={padding.top}
          width={28} height={innerH}
          fill={COLORS.current} fillOpacity="0.55" />
      )}
      <path d={linePath} stroke={COLORS.line} strokeWidth="2" fill="none" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.k === currentK ? 5 : 3}
          fill={p.k === currentK ? COLORS.line : 'white'}
          stroke={COLORS.point} strokeWidth="1.5" />
      ))}
    </svg>
  )
}

function ElbowSection({ result, t }) {
  const r = t.cluster.result
  return (
    <div>
      <Heading>{r.elbowTitle}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-3">
        <ElbowPlot elbow={result.elbow} currentK={result.k} />
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.elbowHint}</p>
    </div>
  )
}

/* ─────────────────────────  Cluster sizes  ───────────────────────── */

function SizesTable({ result, t }) {
  const r = t.cluster.result
  const c = r.cols
  return (
    <div>
      <Heading>{r.sizesTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.cluster}</Th>
              <Th>n</Th>
              <Th>{c.percent}</Th>
            </tr>
          </thead>
          <tbody>
            {result.clusterSizes.map((sz, gi) => (
              <tr key={gi}>
                <Td align="left" mono={false} bold>#{gi + 1}</Td>
                <Td>{sz}</Td>
                <Td>{fmtNum((sz / result.n) * 100, 2)}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────  Centroids / cluster profile  ───────────────────────── */

function CentroidsTable({ result, t, labelMap }) {
  const r = t.cluster.result
  const c = r.cols
  return (
    <div>
      <Heading>{r.centroidsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.cluster}</Th>
              {result.vars.map((v) => (
                <Th key={v}>{labelMap[v] || v}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.varMeansByCluster.map((row, gi) => (
              <tr key={gi}>
                <Td align="left" mono={false} bold>
                  #{gi + 1} (n = {result.clusterSizes[gi]})
                </Td>
                {row.map((m, j) => {
                  const z = result.varZScoresByCluster[gi][j]
                  return (
                    <Td key={j} color={zColor(z)}>
                      {fmtNum(m, 2)}
                      <span className="ml-1 text-[10px] text-duo-cocoa-400">
                        (z={fmtNum(z, 2)})
                      </span>
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.centroidsHint}</p>
    </div>
  )
}

/* ─────────────────────────  Quality metrics  ───────────────────────── */

function QualitySection({ result, t }) {
  const r = t.cluster.result
  const ratio = result.tss > 0 ? result.bss / result.tss : NaN
  const sKey = silhouetteInterpKey(result.silhouette)
  return (
    <div>
      <Heading>{r.qualityTitle}</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.wss}</div>
          <div className="font-mono text-base text-duo-cocoa-800 font-medium">{fmtNum(result.wss, 3)}</div>
        </div>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.bss}</div>
          <div className="font-mono text-base text-duo-cocoa-800 font-medium">{fmtNum(result.bss, 3)}</div>
        </div>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.bssRatio}</div>
          <div className="font-mono text-base text-duo-cocoa-800 font-medium">
            {Number.isFinite(ratio) ? fmtNum(ratio * 100, 2) + '%' : '—'}
          </div>
        </div>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{r.cols.silhouette}</div>
          <div className="font-mono text-base text-duo-cocoa-800 font-medium">
            {fmtNum(result.silhouette, 3)}
          </div>
          {sKey && (
            <div className="text-[11px] text-duo-amber-700 mt-0.5">
              {r.silhouetteInterp[sKey]}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.qualityHint}</p>
    </div>
  )
}

/* ─────────────────────────  Dendrogram (Ward only)  ───────────────────────── */

function Dendrogram({ linkageMatrix, k, width = 560, height = 280 }) {
  if (!linkageMatrix || linkageMatrix.length === 0) return null
  const padding = { top: 16, right: 16, bottom: 32, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const n = linkageMatrix.length + 1
  // 為了視覺簡潔，僅繪出最後一段（top-level structure）— 至多 60 步
  const displaySteps = linkageMatrix.slice(-Math.min(60, linkageMatrix.length))
  const maxD = Math.max(...displaySteps.map((row) => row[2]))
  const dDomain = niceDomain(0, maxD)
  const sx = (i) => padding.left + (displaySteps.length > 1 ? (i / (displaySteps.length - 1)) * innerW : innerW / 2)
  const sy = (v) => padding.top + linearScale(v, dDomain, [innerH, 0])
  // cut line：如果切到 k 群，則對應 step = n − k − 1（在原始 linkageMatrix 中），
  // 也就是顯示集合中倒數第 (n − k) 個的距離
  const cutStepGlobal = n - k
  const cutDist = cutStepGlobal >= 0 && cutStepGlobal < linkageMatrix.length
    ? linkageMatrix[cutStepGlobal][2]
    : null
  const yTicks = niceTicks(dDomain[0], dDomain[1], 4)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ fontFamily: FONT_SANS }}>
      {yTicks.map((tv) => (
        <line key={tv} x1={padding.left} y1={sy(tv)} x2={padding.left + innerW} y2={sy(tv)}
          stroke={COLORS.grid} strokeWidth="0.5" strokeDasharray="2 3" />
      ))}
      {yTicks.map((tv) => (
        <text key={`yt${tv}`} x={padding.left - 6} y={sy(tv) + 3} textAnchor="end"
          style={{ fontFamily: FONT_MONO, fontSize: 10 }} fill={COLORS.axisText}>
          {Math.abs(tv) >= 100 ? tv.toExponential(1) : Number.isInteger(tv) ? tv : tv.toFixed(1)}
        </text>
      ))}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH}
        stroke={COLORS.axis} strokeWidth="1" />
      <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH}
        stroke={COLORS.axis} strokeWidth="1" />
      {/* bars representing each merge step's distance */}
      {displaySteps.map((row, i) => {
        const x = sx(i)
        const y = sy(row[2])
        const yBase = padding.top + innerH
        return (
          <g key={i}>
            <line x1={x} y1={yBase} x2={x} y2={y}
              stroke={i >= displaySteps.length - (k - 1) ? COLORS.bar : COLORS.barAlt}
              strokeWidth="2" />
            <circle cx={x} cy={y} r="2.5"
              fill={i >= displaySteps.length - (k - 1) ? COLORS.bar : COLORS.barAlt} />
          </g>
        )
      })}
      {/* cut line */}
      {cutDist !== null && (
        <>
          <line x1={padding.left} y1={sy(cutDist)} x2={padding.left + innerW} y2={sy(cutDist)}
            stroke={COLORS.point} strokeWidth="1" strokeDasharray="5 4" />
          <text x={padding.left + innerW - 6} y={sy(cutDist) - 4} textAnchor="end"
            style={{ fontFamily: FONT_MONO, fontSize: 10 }} fill={COLORS.point}>
            cut → k = {k}
          </text>
        </>
      )}
      <text x={padding.left + innerW / 2} y={padding.top + innerH + 22} textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 500 }} fill={COLORS.axisText}>
        merge step
      </text>
      <text x={12} y={padding.top + innerH / 2} textAnchor="middle"
        transform={`rotate(-90 12 ${padding.top + innerH / 2})`}
        style={{ fontSize: 11, fontWeight: 500 }} fill={COLORS.axisText}>
        ΔSS
      </text>
    </svg>
  )
}

function DendrogramSection({ result, t }) {
  const r = t.cluster.result
  return (
    <div>
      <Heading>{r.dendroTitle}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-3">
        <Dendrogram linkageMatrix={result.linkageMatrix} k={result.k} />
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.dendroHint}</p>
    </div>
  )
}

/* ─────────────────────────  Interpretation (teaching mode)  ───────────────────────── */

function Interpretation({ result, t }) {
  const i = t.cluster.interp
  const r = t.cluster.result
  const ratio = result.tss > 0 ? result.bss / result.tss : NaN
  const sKey = silhouetteInterpKey(result.silhouette)
  const methodLabel = t.cluster.config.methods[result.method]
  const overall = fillTemplate(i.overall, {
    method: methodLabel,
    n: result.n,
    p: result.p,
    k: result.k,
    bssRatio: Number.isFinite(ratio) ? fmtNum(ratio * 100, 1) : '—',
    silhouette: fmtNum(result.silhouette, 3),
    sInterp: sKey ? r.silhouetteInterp[sKey] : '—',
  })
  return (
    <div className="mt-5">
      <Heading>{i.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p className="whitespace-pre-line">{overall}</p>
        <p className="mt-3">{i.recommendation}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────  Result entry  ───────────────────────── */

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runCluster(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'tooFewN')
      msg = fillTemplate(t.cluster.errors.tooFewN, {
        N: result.meta?.N ?? 0,
        k: result.meta?.k ?? 0,
        p: result.meta?.p ?? 0,
      })
    else msg = t.cluster.errors[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div className="space-y-1">
      <SummaryLine result={result} t={t} />
      <ElbowSection result={result} t={t} />
      <SizesTable result={result} t={t} />
      <CentroidsTable result={result} t={t} labelMap={labelMap} />
      <QualitySection result={result} t={t} />
      {result.method === 'hierarchical' && <DendrogramSection result={result} t={t} />}
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
