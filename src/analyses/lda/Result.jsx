/**
 * LDA — Result（中欄）
 *
 * 結構：
 *   1. n / k / p / # functions 摘要列
 *   2. 判別函數總表（eigenvalue / canonical r / % var / Wilks Λ / χ² / df / p）
 *   3. Standardized canonical coefficients（rows = predictors, cols = function 1..）
 *   4. Structure matrix（同 shape）
 *   5. Group centroids（rows = groups, cols = function 1..）
 *   6. Classification confusion matrix + overall / per-class accuracy
 *   7. Box's M 同質共變數矩陣檢定（小段註記）
 *   8. 教學模式：白話解讀
 *
 * LDA result panel: discriminant functions + standardized coefficients +
 * structure matrix + group centroids + classification + Box's M +
 * interpretation.
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runLDA } from './compute'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fmtSig, fillTemplate, toneForP } from '../../lib/format'
import Heading from '../../components/ui/Heading'

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cream-200 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false, color, bg }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-100',
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

function loadingColor(v) {
  if (!Number.isFinite(v)) return 'text-duo-cocoa-300'
  const a = Math.abs(v)
  if (a < 0.32) return 'text-duo-cocoa-300'
  if (a < 0.45) return 'text-duo-cocoa-500'
  if (a < 0.55) return 'text-duo-cocoa-700'
  if (a < 0.71) return 'text-duo-amber-700 font-semibold'
  return 'text-duo-amber-800 font-semibold'
}

function accuracyInterpKey(acc) {
  if (!Number.isFinite(acc)) return null
  if (acc < 0.5) return 'poor'
  if (acc < 0.7) return 'modest'
  if (acc < 0.85) return 'good'
  return 'excellent'
}

/* ─────────────────────────  Summary  ───────────────────────── */

function SummaryLine({ result, t }) {
  const r = t.lda.result
  return (
    <div className="bg-white border border-duo-cream-200 rounded-lg px-3 py-2 text-xs text-duo-cocoa-700 font-mono">
      N = {result.n} &nbsp;·&nbsp; k = {result.k} ({r.groups}) &nbsp;·&nbsp; p = {result.p} ({r.predictors}) &nbsp;·&nbsp; {r.functions}: {result.functions.length}
    </div>
  )
}

/* ─────────────────────────  Functions table  ───────────────────────── */

function FunctionsTable({ result, t }) {
  const r = t.lda.result
  const c = r.cols
  return (
    <div>
      <Heading>{r.functionsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.function}</Th>
              <Th>{c.eigenvalue}</Th>
              <Th>{c.canonicalR}</Th>
              <Th>{c.percent}</Th>
              <Th>{c.cumulative}</Th>
              <Th>{c.wilks}</Th>
              <Th>{c.chi2}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
            </tr>
          </thead>
          <tbody>
            {result.functions.map((fn) => (
              <tr key={fn.index}>
                <Td align="left" mono={false} bold>{fn.index}</Td>
                <Td>{fmtNum(fn.eigenvalue, 4)}</Td>
                <Td>{fmtNum(fn.canonicalCorrelation, 3)}</Td>
                <Td>
                  {Number.isFinite(fn.proportionOfVariance)
                    ? fmtNum(fn.proportionOfVariance * 100, 2)
                    : '—'}
                </Td>
                <Td>
                  {Number.isFinite(fn.cumulativeProportion)
                    ? fmtNum(fn.cumulativeProportion * 100, 2)
                    : '—'}
                </Td>
                <Td>{fmtNum(fn.wilksLambda, 3)}</Td>
                <Td>{fmtNum(fn.chi2, 2)}</Td>
                <Td>{fn.df}</Td>
                <Td>{fmtP(fn.p)}{fmtSig(fn.p)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.functionsHint}</p>
    </div>
  )
}

/* ─────────────────────────  Standardized coefficients  ───────────────────────── */

function StandardizedTable({ result, t, labelMap }) {
  const r = t.lda.result
  return (
    <div>
      <Heading>{r.stdCoefTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.predictor}</Th>
              {result.functions.map((fn) => (
                <Th key={fn.index}>F{fn.index}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.predictors.map((col, i) => (
              <tr key={col}>
                <Td align="left" mono={false} bold>{labelMap[col] || col}</Td>
                {result.functions.map((fn) => {
                  const v = fn.standardizedCoefficients[i]
                  return (
                    <Td key={fn.index} color={loadingColor(v)}>
                      {fmtNum(v, 3)}
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.stdCoefHint}</p>
    </div>
  )
}

/* ─────────────────────────  Structure matrix  ───────────────────────── */

function StructureTable({ result, t, labelMap }) {
  const r = t.lda.result
  return (
    <div>
      <Heading>{r.structureTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.predictor}</Th>
              {result.functions.map((fn) => (
                <Th key={fn.index}>F{fn.index}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.predictors.map((col, i) => (
              <tr key={col}>
                <Td align="left" mono={false} bold>{labelMap[col] || col}</Td>
                {result.functions.map((fn) => {
                  const v = fn.structureCoefficients[i]
                  return (
                    <Td key={fn.index} color={loadingColor(v)}>
                      {fmtNum(v, 3)}
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.structureHint}</p>
    </div>
  )
}

/* ─────────────────────────  Group centroids  ───────────────────────── */

function CentroidsTable({ result, t, valueLabels, lang }) {
  const r = t.lda.result
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  return (
    <div>
      <Heading>{r.centroidsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.group}</Th>
              <Th>n</Th>
              {result.functions.map((fn) => (
                <Th key={fn.index}>F{fn.index}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.groups.map((g, gi) => (
              <tr key={g}>
                <Td align="left" mono={false} bold>{labelOf(g)}</Td>
                <Td>{result.groupSizes[gi]}</Td>
                {result.functions.map((fn, fi) => (
                  <Td key={fn.index}>{fmtNum(result.groupCentroids[gi]?.[fi], 3)}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.centroidsHint}</p>
    </div>
  )
}

/* ─────────────────────────  Confusion matrix / classification  ───────────────────────── */

function ClassificationTable({ result, t, valueLabels, lang }) {
  const r = t.lda.result
  const cl = result.classification
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  const accKey = accuracyInterpKey(cl.overallAccuracy)
  return (
    <div>
      <Heading>{r.classifyTitle}</Heading>
      <div className="mb-3 px-3 py-2 rounded-md bg-duo-amber-50 border border-duo-amber-200 text-xs text-duo-cocoa-800">
        <span className="font-medium">{r.overallAccuracy}：</span>
        <span className="font-mono ml-1">{fmtNum(cl.overallAccuracy * 100, 2)}%</span>
        {accKey && (
          <span className="ml-2 text-duo-amber-700">
            （{r.accuracyInterp[accKey]}）
          </span>
        )}
        <span className="ml-2 text-duo-cocoa-500">({cl.n} {r.cases})</span>
      </div>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.cols.actualBackslashPredicted}</Th>
              {result.groups.map((g) => (
                <Th key={g}>{labelOf(g)}</Th>
              ))}
              <Th>{r.cols.total}</Th>
              <Th>{r.cols.classAccuracy}</Th>
            </tr>
          </thead>
          <tbody>
            {result.groups.map((g, gi) => (
              <tr key={g}>
                <Td align="left" mono={false} bold>{labelOf(g)}</Td>
                {result.groups.map((g2, gj) => {
                  const v = cl.confusionMatrix[gi][gj]
                  const onDiagonal = gi === gj
                  return (
                    <Td
                      key={g2}
                      bold={onDiagonal}
                      color={onDiagonal ? 'text-duo-amber-800' : 'text-duo-cocoa-700'}
                      bg={onDiagonal ? 'bg-duo-amber-50/60' : ''}
                    >
                      {v}
                    </Td>
                  )
                })}
                <Td>{result.groupSizes[gi]}</Td>
                <Td>
                  {Number.isFinite(cl.perClassAccuracy[gi])
                    ? fmtNum(cl.perClassAccuracy[gi] * 100, 2) + '%'
                    : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{r.classifyHint}</p>
    </div>
  )
}

/* ─────────────────────────  Box's M  ───────────────────────── */

function BoxMRow({ result, t }) {
  const r = t.lda.result
  const box = result.boxM
  if (!box || !box.applicable) {
    return (
      <div>
        <Heading>{r.boxMTitle}</Heading>
        <div className="bg-white border border-duo-cream-200 rounded-lg px-3 py-2 text-xs text-duo-cocoa-500">
          {r.boxMNotApplicable}
        </div>
      </div>
    )
  }
  const violated = Number.isFinite(box.p) && box.p <= 0.001
  return (
    <div>
      <Heading>{r.boxMTitle}</Heading>
      {violated && (
        <div className="mb-3 p-3 rounded-md bg-duo-amber-50 border border-duo-amber-200 text-xs text-duo-cocoa-800 leading-relaxed">
          {r.boxMViolatedWarn}
        </div>
      )}
      <div className="bg-white border border-duo-cream-200 rounded-lg text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className={[
              'inline-block w-2 h-2 rounded-full shrink-0',
              violated ? 'bg-duo-sig-warn shadow-led-warn' : 'bg-duo-sig-ok shadow-led-ok',
            ].join(' ')} />
            <span className="text-duo-cocoa-700">{r.boxMLabel}</span>
          </span>
          <span className="font-mono text-duo-cocoa-700 ml-auto text-right whitespace-nowrap">
            M = {fmtNum(box.m, 2)}, χ²({box.df}) = {fmtNum(box.chi2, 2)}, p = {fmtP(box.p)}{' '}
            <span className={violated ? 'text-duo-sig-warn font-semibold' : 'text-duo-sig-ok'}>
              · {violated ? r.boxMViolated : r.boxMOk}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────  Interpretation (teaching)  ───────────────────────── */

function Interpretation({ result, t }) {
  const r = t.lda.result
  const i = t.lda.interp
  const f1 = result.functions[0]
  const sigF1 = Number.isFinite(f1?.p) && f1.p < 0.05
  const accKey = accuracyInterpKey(result.classification.overallAccuracy)

  const overall = fillTemplate(i.overall, {
    group: result.groupVar,
    p: result.p,
    k: result.k,
    n: result.n,
    nFns: result.functions.length,
    sigWord: sigF1 ? i.sigYes : i.sigNo,
    f1Lambda: fmtNum(f1?.wilksLambda, 3),
    f1Chi2: fmtNum(f1?.chi2, 2),
    f1Df: f1?.df ?? '—',
    f1Pstr: fmtP(f1?.p),
    f1CanR: fmtNum(f1?.canonicalCorrelation, 3),
    f1PctVar: Number.isFinite(f1?.proportionOfVariance)
      ? fmtNum(f1.proportionOfVariance * 100, 1)
      : '—',
    accPct: fmtNum(result.classification.overallAccuracy * 100, 2),
    accInterp: accKey ? r.accuracyInterp[accKey] : '—',
  })

  const boxLine = result.boxM?.applicable
    ? fillTemplate(i.boxLine, {
        chi2: fmtNum(result.boxM.chi2, 2),
        df: result.boxM.df,
        pStr: fmtP(result.boxM.p),
        verdict: result.boxM.p <= 0.001 ? i.boxBad : i.boxOk,
      })
    : i.boxNotApplicable

  return (
    <div className="mt-5">
      <Heading>{i.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{overall}</p>
        <p className="mt-3">{boxLine}</p>
        {sigF1 ? (
          <p className="mt-2 text-duo-cocoa-700">{i.sigFollowUp}</p>
        ) : (
          <p className="mt-2 text-duo-cocoa-500">{i.nsAdvice}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────  Result entry  ───────────────────────── */

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runLDA(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'groupBadGroups')
      msg = fillTemplate(t.lda.errors.groupBadGroups, { k: result.meta?.k ?? 0 })
    else if (result.error === 'tooFewN')
      msg = fillTemplate(t.lda.errors.tooFewN, {
        N: result.meta?.N ?? 0,
        k: result.meta?.k ?? 0,
        p: result.meta?.p ?? 0,
      })
    else msg = t.lda.errors[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabels = dataset.valueLabels?.[result.groupVar]

  const f1 = result.functions[0]

  return (
    <div className="space-y-1">
      <SummaryLine result={result} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版；p 值紅綠語意：顯著=綠、未達顯著=紅） */}
      <StatCards
        items={[
          {
            label: t.lda.result.cols.wilks,
            value: fmtNum(f1?.wilksLambda, 3),
            sub: `${t.lda.result.cols.chi2}(${f1?.df ?? '—'}) = ${fmtNum(f1?.chi2, 2)}`,
          },
          {
            label: t.lda.result.cols.p,
            value: fmtP(f1?.p),
            tone: toneForP(f1?.p),
            sub: Number.isFinite(f1?.p) ? (f1.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          {
            label: t.lda.result.overallAccuracy,
            value: `${fmtNum(result.classification.overallAccuracy * 100, 2)}%`,
          },
        ]}
      />

      <FunctionsTable result={result} t={t} />
      <StandardizedTable result={result} t={t} labelMap={labelMap} />
      <StructureTable result={result} t={t} labelMap={labelMap} />
      <CentroidsTable result={result} t={t} valueLabels={valueLabels} lang={lang} />
      <ClassificationTable result={result} t={t} valueLabels={valueLabels} lang={lang} />
      <BoxMRow result={result} t={t} />
      {mode === 'teaching' && <Interpretation result={result} t={t} />}
    </div>
  )
}

export default Result
