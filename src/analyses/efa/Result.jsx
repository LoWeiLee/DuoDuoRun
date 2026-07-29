import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runEFA } from './compute'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fmtSig, fillTemplate, toneForP } from '../../lib/format'
import { ScreePlot } from './ScreePlot'
import Heading from '../../components/ui/Heading'

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}
function Td({ children, align = 'right', mono = true, bold = false, color }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium' : '',
      color || 'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function kmoInterpKey(kmo) {
  if (!Number.isFinite(kmo)) return null
  if (kmo < 0.5) return 'unacceptable'
  if (kmo < 0.6) return 'miserable'
  if (kmo < 0.7) return 'mediocre'
  if (kmo < 0.8) return 'middling'
  if (kmo < 0.9) return 'meritorious'
  return 'marvelous'
}

function loadingColor(v) {
  const a = Math.abs(v)
  if (a < 0.32) return 'text-duo-cocoa-300'
  if (a < 0.45) return 'text-duo-cocoa-500'
  if (a < 0.55) return 'text-duo-cocoa-700'
  if (a < 0.71) return 'text-duo-amber-700 font-semibold'
  return 'text-duo-amber-800 font-semibold'
}

function SuitabilitySection({ result, t }) {
  const c = t.efa.result.cols
  const kmoNA = result.kmo?.unavailable || null
  const ki = kmoNA ? null : kmoInterpKey(result.kmo.overall)
  const singular = !!result.bartlett.singular
  const bSig = !singular && Number.isFinite(result.bartlett.p) && result.bartlett.p < 0.05
  return (
    <div>
      <Heading>{t.efa.result.suitabilityTitle}</Heading>
      {singular && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/10 border border-duo-tongue/20 text-xs text-duo-cocoa-800 leading-relaxed">
          {t.efa.result.singularWarn}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{c.kmo}</div>
          {/* ★ R40-i：KMO 算不出來時顯示原因，不再整張卡片消失 */}
          <div className="font-mono text-2xl text-duo-cocoa-800 font-medium">
            {kmoNA ? '—' : fmtNum(result.kmo.overall, 3)}
          </div>
          {kmoNA
            ? <div className="text-xs text-duo-sig-bad mt-0.5">{t.efa.result.kmoUnavailable[kmoNA]}</div>
            : ki && <div className="text-xs text-duo-amber-700 mt-0.5">{t.efa.result.kmoInterp[ki]}</div>}
        </div>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-duo-cocoa-400 mb-1">{c.bartlett}</div>
          <div className="font-mono text-sm text-duo-cocoa-800">
            χ²({result.bartlett.df}) = {fmtNum(result.bartlett.chi2, 2)}
          </div>
          <div className="font-mono text-xs text-duo-cocoa-600">
            p = {fmtP(result.bartlett.p)}{fmtSig(result.bartlett.p)}
          </div>
          <div className={`text-[11px] mt-1 ${singular ? 'text-duo-sig-bad' : bSig ? 'text-duo-sig-ok' : 'text-duo-sig-bad'}`}>
            {singular ? t.efa.result.bartlettSingular : bSig ? t.efa.result.bartlettSig : t.efa.result.bartlettNs}
          </div>
          {/* ★ R40-c：|R| 原本是孤兒欄位（算了、零 UI）。|R| → 0 是多元共線的標準警訊 */}
          <div className="font-mono text-[11px] text-duo-cocoa-400 mt-1">
            {fillTemplate(t.efa.result.detR, { det: fmtNum(result.determinant, 5) })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ★ R40-b：逐變項 MSA（KMO 的 perVar）原本是孤兒欄位。
   它是 SPSS 用來決定「該刪哪一題」的標準診斷欄，過去算了卻沒有任何 UI 讀它。 */
function MsaTable({ result, t, labelMap }) {
  if (result.kmo?.unavailable) return null
  const c = t.efa.result.cols
  return (
    <div>
      <Heading>{t.efa.result.msaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.variable}</Th>
              <Th>{c.msa}</Th>
              <Th align="left">{c.msaVerdict}</Th>
            </tr>
          </thead>
          <tbody>
            {result.columns.map((col, i) => {
              const v = result.kmo.perVar[i]
              const key = kmoInterpKey(v)
              return (
                <tr key={col}>
                  <Td align="left" mono={false} bold>{labelMap[col] || col}</Td>
                  <Td color={Number.isFinite(v) && v < 0.5 ? 'text-duo-sig-bad font-semibold' : 'text-duo-cocoa-700'}>
                    {fmtNum(v, 3)}
                  </Td>
                  <Td align="left" mono={false}>{key ? t.efa.result.kmoInterp[key] : '—'}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">{t.efa.result.msaHint}</p>
    </div>
  )
}

function EigenvaluesTable({ result, t }) {
  const c = t.efa.result.cols
  const ev = result.varianceExplained
  return (
    <div>
      <Heading>{t.efa.result.eigenvaluesTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.factor}</Th>
              <Th>{c.eigenvalue}</Th>
              <Th>{c.percent}</Th>
              <Th>{c.cumulative}</Th>
            </tr>
          </thead>
          <tbody>
            {ev.values.map((v, i) => {
              const kept = i < result.nFactors
              return (
                <tr key={i} className={kept ? 'bg-duo-amber-50/30' : ''}>
                  <Td align="left" mono={false} bold>{i + 1}</Td>
                  <Td>{fmtNum(v, 3)}</Td>
                  <Td>{fmtNum(ev.percent[i], 2)}</Td>
                  <Td>{fmtNum(ev.cumulative[i], 2)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* ★ R40-a：修復前此處硬編中文，完全不經 i18n → 英文介面顯示中文 */}
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        {fillTemplate(t.efa.result.keptHint, { k: result.nFactors })}
      </p>
    </div>
  )
}

function LoadingsTable({ result, t, labelMap }) {
  const c = t.efa.result.cols
  const loadings = result.rotatedLoadings || result.unrotatedLoadings
  const k = result.nFactors
  return (
    <div>
      <Heading>
        {t.efa.result.loadingsTitle}
        {/* ★ R40-a：修復前此處硬編中文 */}
        {result.rotation === 'varimax' && (
          <span className="ml-2 text-[10px] font-normal text-duo-cocoa-500">{t.efa.result.rotatedTag}</span>
        )}
      </Heading>
      {/* ★ R40-d：選了 varimax 但因子數 < 2 → 不轉軸。修復前完全靜默 */}
      {result.rotationSkipped && (
        <p className="text-[11px] text-duo-sig-bad mb-1.5 leading-snug">{t.efa.result.rotationSkipped}</p>
      )}
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.variable}</Th>
              {Array.from({ length: k }, (_, j) => (
                <Th key={j}>{c.factor} {j + 1}</Th>
              ))}
              <Th>{c.h2}</Th>
            </tr>
          </thead>
          <tbody>
            {result.columns.map((col, i) => (
              <tr key={col}>
                <Td align="left" mono={false} bold>{labelMap[col] || col}</Td>
                {loadings[i].map((v, j) => (
                  <Td key={j} color={loadingColor(v)}>{fmtNum(v, 3)}</Td>
                ))}
                <Td>{fmtNum(result.communalities[i], 3)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ★ R40-a：修復前此處硬編中文 */}
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{t.efa.result.loadingColorHint}</p>
    </div>
  )
}

function Interpretation({ result, t }) {
  const ki = result.kmo ? kmoInterpKey(result.kmo.overall) : null
  const cumPct = result.varianceExplained.cumulative[result.nFactors - 1]
  const text = fillTemplate(t.efa.interp.summary, {
    kmo: result.kmo ? fmtNum(result.kmo.overall, 3) : '—',
    kmoInterp: ki ? t.efa.result.kmoInterp[ki] : '—',
    df: result.bartlett.df,
    chi2: fmtNum(result.bartlett.chi2, 2),
    pStr: fmtP(result.bartlett.p),
    k: result.nFactors,
    cumPct: fmtNum(cumPct, 1),
    rotationLine: result.rotation === 'varimax' ? t.efa.interp.rotationLineYes : t.efa.interp.rotationLineNo,
  })
  return (
    <div className="mt-5">
      <Heading>{t.efa.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
        {text}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runEFA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    // ★ R40-h：零變異要指名是哪幾個變項（比照 A1 的 R7）
    const msg = result.error === 'zero-variance-vars'
      ? fillTemplate(t.efa.config['zero-variance-vars'], { vars: (result.vars || []).join('、') })
      : t.efa.config[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  return (
    <div>
      <SuitabilitySection result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版；p 值紅綠語意：顯著=綠、未達顯著=紅） */}
      <StatCards
        items={[
          {
            label: t.efa.result.cols.kmo,
            value: result.kmo?.unavailable ? '—' : fmtNum(result.kmo.overall, 3),
          },
          {
            label: t.efa.result.cols.bartlett,
            value: fmtP(result.bartlett.p),
            tone: toneForP(result.bartlett.p),
            sub: Number.isFinite(result.bartlett.p)
              ? (result.bartlett.p < 0.05 ? 'p < .05' : 'n.s.')
              : undefined,
          },
          { label: t.efa.config.nFactorsTitle, value: result.nFactors },
          {
            label: t.efa.result.cols.cumulative,
            value: fmtNum(result.varianceExplained.cumulative[result.nFactors - 1], 1),
          },
        ]}
      />

      <div>
        <Heading>{t.efa.result.screeTitle}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md p-3">
          <ScreePlot eigenvalues={result.eigenvalues} nFactors={result.nFactors} />
        </div>
      </div>
      <EigenvaluesTable result={result} t={t} />
      <LoadingsTable result={result} t={t} labelMap={labelMap} />
      <MsaTable result={result} t={t} labelMap={labelMap} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
