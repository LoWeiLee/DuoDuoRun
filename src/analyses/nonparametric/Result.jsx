/**
 * 無母數檢定 — Result（中欄）
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runNonparametric } from './compute'
import { fmtNum, fmtP, fillTemplate } from '../../lib/format'

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

function effectKey(r) {
  if (!Number.isFinite(r)) return null
  const a = Math.abs(r)
  if (a < 0.3) return 'small'
  if (a < 0.5) return 'medium'
  return 'large'
}

function MWResult({ result, t, valueLabels, lang }) {
  const c = t.np.result.cols
  const labelOf = (n) => valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']?.[n] || n
  const ek = effectKey(result.r)
  return (
    <div>
      <Heading>{t.np.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.u1}</Th>
              <Th>{c.u2}</Th>
              <Th>{c.u}</Th>
              <Th>{c.z}</Th>
              <Th>{c.p}</Th>
              <Th>{c.n}</Th>
              <Th>{c.r}</Th>
              <Th align="left">效果量 / Effect</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.U1, 1)}</Td>
              <Td>{fmtNum(result.U2, 1)}</Td>
              <Td>{fmtNum(result.U, 1)}</Td>
              <Td>{fmtNum(result.z, 3)}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td>{result.N}</Td>
              <Td>{fmtNum(result.r, 3)}</Td>
              <Td align="left" mono={false}>{ek ? t.np.result.effect[ek] : '—'}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">{t.np.result.continuityNote}</p>
      {result.tieCorrection && (
        <p className="text-[11px] text-duo-cocoa-400 mt-1">{t.np.result.tieNote}</p>
      )}
      {result.smallSampleWarning && (
        <p className="text-[11px] text-duo-amber-700 mt-1">{t.np.result.smallSampleNote}</p>
      )}
    </div>
  )
}

function WilResult({ result, t }) {
  const c = t.np.result.cols
  const ek = effectKey(result.r)
  return (
    <div>
      <Heading>{t.np.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.wpos}</Th>
              <Th>{c.wneg}</Th>
              <Th>{c.t}</Th>
              <Th>{c.z}</Th>
              <Th>{c.p}</Th>
              <Th>{c.n}</Th>
              <Th>{c.r}</Th>
              <Th align="left">效果量 / Effect</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.Wpos, 1)}</Td>
              <Td>{fmtNum(result.Wneg, 1)}</Td>
              <Td>{fmtNum(result.T, 1)}</Td>
              <Td>{fmtNum(result.z, 3)}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td>{result.n}</Td>
              <Td>{fmtNum(result.r, 3)}</Td>
              <Td align="left" mono={false}>{ek ? t.np.result.effect[ek] : '—'}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      {result.nDropped > 0 && (
        <p className="text-[11px] text-duo-cocoa-400 mt-2">
          {fillTemplate(t.np.result.droppedNote, { n: result.nDropped })}
        </p>
      )}
      <p className="text-[11px] text-duo-cocoa-400 mt-1">{t.np.result.continuityNote}</p>
      {result.tieCorrection && (
        <p className="text-[11px] text-duo-cocoa-400 mt-1">{t.np.result.tieNote}</p>
      )}
      {result.allZeroDiffs && (
        <p className="text-[11px] text-duo-amber-700 mt-1">{t.np.result.allZeroDiffsNote}</p>
      )}
      {result.smallSampleWarning && !result.allZeroDiffs && (
        <p className="text-[11px] text-duo-amber-700 mt-1">{t.np.result.smallSampleNote}</p>
      )}
    </div>
  )
}

function KWResult({ result, t, valueLabels, lang }) {
  const c = t.np.result.cols
  const labelOf = (n) => valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']?.[n] || n
  const sig = result.p < 0.05
  return (
    <div>
      <Heading>{t.np.result.groupRanksTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{t.np.result.groupCol}</Th>
              <Th>{c.n}</Th>
              <Th>{c.meanRank}</Th>
              <Th>{c.sumRank}</Th>
            </tr>
          </thead>
          <tbody>
            {result.groupStats.map((g) => (
              <tr key={g.name}>
                <Td align="left" mono={false} bold>{labelOf(g.name)}</Td>
                <Td>{g.n}</Td>
                <Td>{fmtNum(g.meanRank, 2)}</Td>
                <Td>{fmtNum(g.sumRank, 1)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Heading>{t.np.result.statsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th>{c.h}</Th>
              <Th>{c.df}</Th>
              <Th>{c.p}</Th>
              <Th>{c.n}</Th>
              <Th>{c.eps2}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{fmtNum(result.H, 3)}</Td>
              <Td>{result.df}</Td>
              <Td>{fmtP(result.p)}</Td>
              <Td>{result.N}</Td>
              <Td>{fmtNum(result.epsilon2, 3)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {result.tieCorrection && (
        <p className="text-[11px] text-duo-cocoa-400 mt-2">{t.np.result.tieNote}</p>
      )}
      {sig && !result.dunn && (
        <p className="text-[11px] text-duo-amber-700 mt-2">{t.np.result.kwSigPosthoc}</p>
      )}

      {result.dunn && <DunnTable dunn={result.dunn} t={t} labelOf={labelOf} />}
    </div>
  )
}

function DunnTable({ dunn, t, labelOf }) {
  const c = t.np.result.cols
  const comps = dunn.comparisons || []
  return (
    <div>
      <Heading>{t.np.result.dunnTitle}</Heading>
      {comps.length === 0 ? (
        <p className="text-xs text-duo-cocoa-400">{t.np.result.dunnEmpty}</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-duo-cream-50">
              <tr>
                <Th align="left">{c.pair}</Th>
                <Th>{c.meanRankA}</Th>
                <Th>{c.meanRankB}</Th>
                <Th>{c.diffRank}</Th>
                <Th>{c.zDunn}</Th>
                <Th>{c.pRaw}</Th>
                <Th>{c.pAdj}</Th>
              </tr>
            </thead>
            <tbody>
              {comps.map((p, idx) => {
                const sig = p.pAdj < 0.05
                const rowCls = sig ? 'bg-duo-amber-50/40' : ''
                const cellCls = sig ? 'text-duo-amber-700 font-semibold' : ''
                return (
                  <tr key={idx} className={rowCls}>
                    <td className={[
                      'px-3 py-1.5 border-b border-duo-cream-50 text-left text-duo-cocoa-700',
                      cellCls,
                    ].join(' ')}>
                      {labelOf(p.groupA)} vs. {labelOf(p.groupB)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtNum(p.meanRankA, 2)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtNum(p.meanRankB, 2)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtNum(Math.abs(p.diff), 2)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtNum(p.z, 3)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtP(p.p)}
                    </td>
                    <td className={['px-3 py-1.5 border-b border-duo-cream-50 text-right font-mono text-duo-cocoa-700', cellCls].join(' ')}>
                      {fmtP(p.pAdj)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Interpretation({ result, t, dataset, lang }) {
  const sig = result.p < 0.05
  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  if (result.type === 'mw') {
    const valueLabels = dataset.valueLabels?.[result.groupVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const ek = effectKey(result.r)
    // 計算各組平均秩
    const mr1 = result.R1 / result.n1
    const mr2 = (result.n1 + result.n2) * (result.n1 + result.n2 + 1) / 2 - result.R1
    const mr2Avg = mr2 / result.n2
    const text = fillTemplate(t.np.interp.mw, {
      depLabel: labelMap[result.depVar] || result.depVar,
      g1Name: valueLabels[result.g1Name] || result.g1Name,
      g2Name: valueLabels[result.g2Name] || result.g2Name,
      mr1: fmtNum(mr1, 2),
      mr2: fmtNum(mr2Avg, 2),
      u: fmtNum(result.U, 1),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      r: fmtNum(result.r, 3),
      effect: ek ? t.np.result.effect[ek] : '—',
      sigWord: sig ? t.np.interp.sigYes : t.np.interp.sigNo,
    })
    return (
      <div className="mt-5">
        <Heading>{t.np.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
          {text}
        </div>
      </div>
    )
  }

  if (result.type === 'wilcoxon') {
    const ek = effectKey(result.r)
    const text = fillTemplate(t.np.interp.wilcoxon, {
      var1Name: labelMap[result.var1] || result.var1,
      var2Name: labelMap[result.var2] || result.var2,
      wpos: fmtNum(result.Wpos, 1),
      wneg: fmtNum(result.Wneg, 1),
      t: fmtNum(result.T, 1),
      z: fmtNum(result.z, 3),
      pStr: fmtP(result.p),
      n: result.n,
      r: fmtNum(result.r, 3),
      effect: ek ? t.np.result.effect[ek] : '—',
      sigWord: sig ? t.np.interp.sigYes : t.np.interp.sigNo,
    })
    return (
      <div className="mt-5">
        <Heading>{t.np.interp.header}</Heading>
        <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
          {text}
        </div>
      </div>
    )
  }

  // kw
  const text = fillTemplate(t.np.interp.kw, {
    factor: labelMap[result.factor] || result.factor,
    depLabel: labelMap[result.depVar] || result.depVar,
    df: result.df,
    n: result.N,
    h: fmtNum(result.H, 3),
    pStr: fmtP(result.p),
    eps2: fmtNum(result.epsilon2, 3),
    sigWord: sig ? t.np.interp.sigYes : t.np.interp.sigNo,
  })
  return (
    <div className="mt-5">
      <Heading>{t.np.interp.header}</Heading>
      <div className="bg-white border border-duo-cocoa-100 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-800 whitespace-pre-line">
        {text}
        {sig && (
          <p className="mt-2 text-duo-amber-700">{t.np.interp.kwPosthoc}</p>
        )}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  if (!dataset) return null

  const result = runNonparametric(dataset.rows, state)
  if (result.error) {
    let msg
    if (result.error === 'groupVarBadGroups')
      msg = fillTemplate(t.np.config.groupVarBadGroups, { k: result.meta.k })
    else if (result.error === 'factorBadGroups')
      msg = fillTemplate(t.np.config.factorBadGroups, { k: result.meta.k })
    else msg = t.np.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  return (
    <div>
      {result.type === 'mw' && (
        <MWResult result={result} t={t}
          valueLabels={dataset.valueLabels?.[result.groupVar]} lang={lang} />
      )}
      {result.type === 'wilcoxon' && <WilResult result={result} t={t} />}
      {result.type === 'kw' && (
        <KWResult result={result} t={t}
          valueLabels={dataset.valueLabels?.[result.factor]} lang={lang} />
      )}
      {mode === 'teaching' && (
        <Interpretation result={result} t={t} dataset={dataset} lang={lang} />
      )}
    </div>
  )
}

export default Result
