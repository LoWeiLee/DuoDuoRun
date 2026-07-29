import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runTwoWayAnova } from './compute'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fmtSig, fillTemplate, toneForP } from '../../lib/format'
import { InteractionPlot } from './InteractionPlot'
import Heading from '../../components/ui/Heading'

function Th({ children, align = 'right' }) {
  return (
    <th className={`px-3 py-2 text-${align} font-medium text-duo-cocoa-700 border-b border-duo-cocoa-100 whitespace-nowrap`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-50',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function effectKey(pe) {
  if (!Number.isFinite(pe)) return null
  if (pe < 0.06) return 'small'
  if (pe < 0.14) return 'medium'
  return 'large'
}

function CellMeansTable({ result, t, dataset, lang }) {
  const c = t.anova2.result.cols
  const valueLabelsA = dataset.valueLabels?.[result.factorA]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabelsB = dataset.valueLabels?.[result.factorB]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const labelA = (k) => valueLabelsA[k] || k
  const labelB = (k) => valueLabelsB[k] || k

  return (
    <div>
      <Heading>{t.anova2.result.cellMeansTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">A \ B</Th>
              {result.levelsB.map((b) => <Th key={b}>{labelB(b)}</Th>)}
              <Th>{c.marginalRow}</Th>
            </tr>
          </thead>
          <tbody>
            {result.levelsA.map((a) => (
              <tr key={a}>
                <Td align="left" mono={false} bold>{labelA(a)}</Td>
                {result.levelsB.map((b) => {
                  const cell = result.cellMeans[a][b]
                  return (
                    <Td key={b}>
                      {Number.isFinite(cell.mean) ? (
                        <>
                          <div>{fmtNum(cell.mean, 2)}</div>
                          <div className="text-[10px] text-duo-cocoa-400">SD = {fmtNum(cell.sd, 2)}</div>
                          <div className="text-[10px] text-duo-cocoa-400">n = {cell.n}</div>
                        </>
                      ) : '—'}
                    </Td>
                  )
                })}
                <Td bold>{fmtNum(result.marginalA[a].mean, 2)}</Td>
              </tr>
            ))}
            <tr className="bg-duo-cream-50/50">
              <Td align="left" mono={false} bold>{c.marginalCol}</Td>
              {result.levelsB.map((b) => (
                <Td key={b} bold>{fmtNum(result.marginalB[b].mean, 2)}</Td>
              ))}
              <Td bold>{fmtNum(result.grandMean, 2)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnovaTable({ result, t }) {
  const c = t.anova2.result.cols
  const a = result.effectA
  const b = result.effectB
  const ab = result.effectAB
  const err = result.errorTerm
  const tot = result.total
  return (
    <div>
      <Heading>{t.anova2.result.anovaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.source}</Th>
              <Th>{c.ss}</Th>
              <Th>{c.df}</Th>
              <Th>{c.ms}</Th>
              <Th>{c.f}</Th>
              <Th>{c.p}</Th>
              <Th>{c.partialEta2}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.effectA}</Td>
              <Td>{fmtNum(a.ss, 2)}</Td>
              <Td>{a.df}</Td>
              <Td>{fmtNum(a.ms, 2)}</Td>
              <Td>{fmtNum(a.F, 3)}</Td>
              <Td>{fmtP(a.p)}{fmtSig(a.p)}</Td>
              <Td>{fmtNum(a.partialEta2, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.effectB}</Td>
              <Td>{fmtNum(b.ss, 2)}</Td>
              <Td>{b.df}</Td>
              <Td>{fmtNum(b.ms, 2)}</Td>
              <Td>{fmtNum(b.F, 3)}</Td>
              <Td>{fmtP(b.p)}{fmtSig(b.p)}</Td>
              <Td>{fmtNum(b.partialEta2, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.effectAB}</Td>
              <Td>{fmtNum(ab.ss, 2)}</Td>
              <Td>{ab.df}</Td>
              <Td>{fmtNum(ab.ms, 2)}</Td>
              <Td>{fmtNum(ab.F, 3)}</Td>
              <Td>{fmtP(ab.p)}{fmtSig(ab.p)}</Td>
              <Td>{fmtNum(ab.partialEta2, 3)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.error}</Td>
              <Td>{fmtNum(err.ss, 2)}</Td>
              <Td>{err.df}</Td>
              <Td>{fmtNum(err.ms, 2)}</Td>
              <Td></Td><Td></Td><Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.total}</Td>
              <Td>{fmtNum(tot.ss, 2)}</Td>
              <Td>{tot.df}</Td>
              <Td></Td><Td></Td><Td></Td><Td></Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>
    </div>
  )
}

function PlotSection({ result, dataset, lang, t }) {
  const labelMapY = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabelsA = dataset.valueLabels?.[result.factorA]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const valueLabelsB = dataset.valueLabels?.[result.factorB]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const labelsA = result.levelsA.map((a) => valueLabelsA[a] || a)
  const labelsB = result.levelsB.map((b) => valueLabelsB[b] || b)
  return (
    <div>
      <Heading>{t.anova2.result.interactionPlotTitle}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-3">
        <InteractionPlot
          cellMeans={result.cellMeans}
          levelsA={result.levelsA}
          levelsB={result.levelsB}
          labelsA={labelsA}
          labelsB={labelsB}
          yLabel={labelMapY[result.depVar] || result.depVar}
        />
      </div>
    </div>
  )
}

function Interpretation({ result, t, labelMap }) {
  const peKa = effectKey(result.effectA.partialEta2)
  const peKb = effectKey(result.effectB.partialEta2)
  const peKab = effectKey(result.effectAB.partialEta2)
  const sigA = result.effectA.p < 0.05
  const sigB = result.effectB.p < 0.05
  const sigAB = result.effectAB.p < 0.05

  const summary = fillTemplate(t.anova2.interp.summary, {
    factorA: labelMap[result.factorA] || result.factorA,
    factorB: labelMap[result.factorB] || result.factorB,
    df1A: result.effectA.df,
    df1B: result.effectB.df,
    df1AB: result.effectAB.df,
    df2: result.errorTerm.df,
    fA: fmtNum(result.effectA.F, 3),
    fB: fmtNum(result.effectB.F, 3),
    fAB: fmtNum(result.effectAB.F, 3),
    pA: fmtP(result.effectA.p),
    pB: fmtP(result.effectB.p),
    pAB: fmtP(result.effectAB.p),
    peA: fmtNum(result.effectA.partialEta2, 3),
    peB: fmtNum(result.effectB.partialEta2, 3),
    peAB: fmtNum(result.effectAB.partialEta2, 3),
    sigA: sigA ? t.anova2.interp.sigYes : t.anova2.interp.sigNo,
    sigB: sigB ? t.anova2.interp.sigYes : t.anova2.interp.sigNo,
    sigAB: sigAB ? t.anova2.interp.sigYes : t.anova2.interp.sigNo,
    effectA: peKa ? t.anova2.result.effectInterp[peKa] : '—',
    effectB: peKb ? t.anova2.result.effectInterp[peKb] : '—',
    effectAB: peKab ? t.anova2.result.effectInterp[peKab] : '—',
  })

  return (
    <div className="mt-5">
      <Heading>{t.anova2.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800">
        <p className="whitespace-pre-line">{summary}</p>
        {sigAB && (
          <p className="mt-3 text-duo-amber-700 font-medium">⚠ {t.anova2.interp.interactionWarn}</p>
        )}
      </div>
    </div>
  )
}

/* ★ 2026-07-29 紅隊 R52（階段 A / A5a）：雙因子 ANOVA 原本完全沒有前提檢核區塊。
   細格層 Levene（誤差項＝細格內變異）＋ 全模型殘差的 Shapiro-Wilk（雙因子的常態假設是
   殘差常態，不是逐組常態）。比照 oneWayAnova/Result.jsx:47–100 的呈現，只警告不擋。 */
function AssumptionChecks({ assumptions, t }) {
  if (!assumptions) return null
  const r = t.anova2.result
  const items = []
  if (assumptions.homogeneity) {
    const lv = assumptions.homogeneity
    items.push({
      label: r.homogeneityCells,
      stat: `F(${lv.df1}, ${lv.df2}) = ${fmtNum(lv.F, 2)}, p = ${fmtP(lv.p)}`,
      ok: !(lv.p < 0.05),
    })
  }
  if (assumptions.normality) {
    const sw = assumptions.normality
    items.push({
      label: r.normalityResid,
      stat: `W = ${fmtNum(sw.W, 3)}, p = ${fmtP(sw.p)}`,
      ok: !(sw.p < 0.05),
    })
  }
  if (items.length === 0) return null
  const anyViolated = items.some((x) => !x.ok)
  return (
    <div>
      <Heading>{r.assumpTitle}</Heading>
      {anyViolated && (
        <div className="mb-3 p-3 rounded-md bg-duo-tongue/20 border border-duo-tongue text-xs text-duo-cocoa-800 leading-relaxed">
          {r.assumpViolationWarn}
        </div>
      )}
      <ul className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
        {items.map((it, idx) => (
          <li key={idx} className={[
            'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2',
            idx > 0 ? 'border-t border-duo-cream-100' : '',
          ].join(' ')}>
            <span className="flex items-center gap-2 min-w-0">
              <span className={[
                'inline-block w-2 h-2 rounded-full shrink-0',
                it.ok ? 'bg-duo-sig-ok shadow-led-ok' : 'bg-duo-sig-bad shadow-led-bad',
              ].join(' ')} />
              <span className="text-duo-cocoa-700">{it.label}</span>
            </span>
            <span className="font-mono text-duo-cocoa-700 ml-auto text-right whitespace-nowrap">
              {it.stat}{' '}
              <span className={it.ok ? 'text-duo-sig-ok' : 'text-duo-sig-bad'}>
                · {it.ok ? r.assumpOk : r.assumpViolated}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-duo-cocoa-400 mt-2 leading-snug">{r.assumpHint}</p>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  // ⚠ 2026-07-13 紅隊 R4：原本在 useMemo 之外就地寫入 `result.factorA = state.factorA`
  //   ——那是直接修改 useMemo 快取住的物件。React 允許重用（甚至丟棄再重算）memo 值，
  //   對它就地寫入的結果不保證可見、也不保證只發生一次；error 分支還會提前 return，
  //   導致 result 有時帶這三個欄位、有時沒有。改為在 memo 內部組出**新物件**。
  const result = useMemo(() => {
    if (!dataset) return null
    const r = runTwoWayAnova(dataset.rows, state)
    if (r.error) return r
    return { ...r, factorA: state.factorA, factorB: state.factorB, depVar: state.depVar }
  }, [dataset, state])
  if (!dataset) return null
  if (result.error) {
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.anova2.config[result.error] || t.errors.stats[result.error] || result.error}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  const cols2 = t.anova2.result.cols
  return (
    <div>
      {/* 關鍵統計量卡片（2026-07 UI 改版；每個效果一張卡，p 值紅綠語意） */}
      <StatCards
        items={[
          {
            label: cols2.effectA,
            value: fmtP(result.effectA.p),
            tone: toneForP(result.effectA.p),
            sub: `F(${result.effectA.df}, ${result.errorTerm.df}) = ${fmtNum(result.effectA.F, 3)}`,
          },
          {
            label: cols2.effectB,
            value: fmtP(result.effectB.p),
            tone: toneForP(result.effectB.p),
            sub: `F(${result.effectB.df}, ${result.errorTerm.df}) = ${fmtNum(result.effectB.F, 3)}`,
          },
          {
            label: cols2.effectAB,
            value: fmtP(result.effectAB.p),
            tone: toneForP(result.effectAB.p),
            sub: `F(${result.effectAB.df}, ${result.errorTerm.df}) = ${fmtNum(result.effectAB.F, 3)}`,
          },
        ]}
      />

      <CellMeansTable result={result} t={t} dataset={dataset} lang={lang} />
      <AssumptionChecks assumptions={result.assumptions} t={t} />
      <AnovaTable result={result} t={t} />
      <PlotSection result={result} dataset={dataset} lang={lang} t={t} />
      {mode === 'teaching' && <Interpretation result={result} t={t} labelMap={labelMap} />}
    </div>
  )
}

export default Result
