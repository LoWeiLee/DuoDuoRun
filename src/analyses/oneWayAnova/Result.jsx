/**
 * 單因子 ANOVA — Result（中欄）
 *
 * 結構：
 *   1. 假設前提檢核（Levene's + 各組 Shapiro-Wilk）
 *   2. 各組敘述統計（n, M, SD）
 *   3. ANOVA 表（組間/組內/總和）
 *   4. 效果量（η²、ω² + 解讀）
 *   5. Tukey HSD 兩兩比較
 *   6. 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runOneWayAnova } from './compute'
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

function Td({ children, align = 'right', mono = true, bold = false }) {
  return (
    <td className={[
      'px-3 py-1.5 border-b border-duo-cream-100',
      `text-${align}`,
      mono ? 'font-mono' : '',
      bold ? 'font-medium text-duo-cocoa-800' : 'text-duo-cocoa-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

function etaInterpKey(eta2) {
  if (!Number.isFinite(eta2)) return null
  if (eta2 < 0.06) return 'small'
  if (eta2 < 0.14) return 'medium'
  return 'large'
}

function AssumptionChecks({ assumptions, t }) {
  const r = t.anova.result
  const items = []

  if (assumptions.homogeneity) {
    const lv = assumptions.homogeneity
    const violated = lv.p < 0.05
    items.push({
      label: "Levene's",
      stat: `F(${lv.df1}, ${lv.df2}) = ${fmtNum(lv.F, 2)}, p = ${fmtP(lv.p)}`,
      ok: !violated,
    })
  }
  for (const sw of assumptions.normality) {
    const violated = sw.p < 0.05
    items.push({
      label: `Shapiro-Wilk（${sw.name}）`,
      stat: `W = ${fmtNum(sw.W, 3)}, p = ${fmtP(sw.p)}`,
      ok: !violated,
    })
  }
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
                · {it.ok ? t.ttest.result.assumpOk : t.ttest.result.assumpViolated}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GroupDescTable({ groupStats, t, valueLabels, lang }) {
  const r = t.anova.result
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  return (
    <div>
      <Heading>{r.groupStatsTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{r.groupCol}</Th>
              <Th>n</Th>
              <Th>M</Th>
              <Th>SD</Th>
            </tr>
          </thead>
          <tbody>
            {groupStats.map((g) => (
              <tr key={g.name}>
                <Td align="left" mono={false} bold>{labelOf(g.name)}</Td>
                <Td>{g.n}</Td>
                <Td>{fmtNum(g.mean, 2)}</Td>
                <Td>{fmtNum(g.sd, 2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnovaTable({ anova, t }) {
  const c = t.anova.result.cols
  return (
    <div>
      <Heading>{t.anova.result.anovaTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.source}</Th>
              <Th>{c.ss}</Th>
              <Th>{c.df}</Th>
              <Th>{c.ms}</Th>
              <Th>{c.f}</Th>
              <Th>{c.p}</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td align="left" mono={false} bold>{c.between}</Td>
              <Td>{fmtNum(anova.ssBetween, 2)}</Td>
              <Td>{anova.dfBetween}</Td>
              <Td>{fmtNum(anova.msBetween, 2)}</Td>
              <Td>{fmtNum(anova.F, 3)}</Td>
              <Td>{fmtP(anova.p)}{fmtSig(anova.p)}</Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.within}</Td>
              <Td>{fmtNum(anova.ssWithin, 2)}</Td>
              <Td>{anova.dfWithin}</Td>
              <Td>{fmtNum(anova.msWithin, 2)}</Td>
              <Td></Td>
              <Td></Td>
            </tr>
            <tr>
              <Td align="left" mono={false} bold>{c.total}</Td>
              <Td>{fmtNum(anova.ssTotal, 2)}</Td>
              <Td>{anova.dfTotal}</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EffectSize({ anova, t }) {
  const r = t.anova.result
  const ei = r.effectInterp
  const etaKey = etaInterpKey(anova.eta2)
  return (
    <div>
      <Heading>{r.effectSizeTitle}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-lg overflow-hidden text-xs">
        <div className="px-3 py-2 border-b border-duo-cream-100 flex items-center justify-between">
          <span className="text-duo-cocoa-700">{ei.eta2Label}</span>
          <span className="font-mono text-duo-cocoa-800">
            {fmtNum(anova.eta2, 3)}
            {etaKey && <span className="text-duo-amber-700 ml-2">{ei[etaKey]}</span>}
          </span>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-duo-cocoa-700">{ei.omega2Label}</span>
          <span className="font-mono text-duo-cocoa-800">{fmtNum(anova.omega2, 3)}</span>
        </div>
      </div>
    </div>
  )
}

function TukeyTable({ tukey, anova, t, valueLabels, lang }) {
  const c = t.anova.result.cols
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  // 整體 F 不顯著時，仍計算但加上提示
  const omnibusNs = anova.p >= 0.05
  return (
    <div>
      <Heading>{t.anova.result.tukeyTitle}</Heading>
      {omnibusNs && (
        <p className="text-[11px] text-duo-cocoa-400 mb-2">
          {lang === 'zh-TW'
            ? '整體 F 未顯著，事後比較僅供參考。'
            : 'Omnibus F not significant; post-hoc shown for reference only.'}
        </p>
      )}
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.pair}</Th>
              <Th>{c.meanDiff}</Th>
              <Th>{c.se}</Th>
              <Th>{c.q}</Th>
              <Th>{c.p}</Th>
            </tr>
          </thead>
          <tbody>
            {tukey.map((p, idx) => (
              <tr key={idx}>
                <Td align="left" mono={false} bold>
                  {labelOf(p.a)} − {labelOf(p.b)}
                </Td>
                <Td>{fmtNum(p.meanDiff, 2)}</Td>
                <Td>{fmtNum(p.se, 3)}</Td>
                <Td>{fmtNum(p.q, 3)}</Td>
                <Td>{fmtP(p.p)}{fmtSig(p.p)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>
    </div>
  )
}

function BonferroniTable({ bonferroni, anova, t, valueLabels, lang }) {
  const c = t.anova.result.cols
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }
  const omnibusNs = anova.p >= 0.05
  const hint = fillTemplate(t.anova.result.bonferroniHint, { m: bonferroni.m })
  return (
    <div>
      <Heading>{t.anova.result.bonferroniTitle}</Heading>
      {omnibusNs && (
        <p className="text-[11px] text-duo-cocoa-400 mb-2">
          {lang === 'zh-TW'
            ? '整體 F 未顯著，事後比較僅供參考。'
            : 'Omnibus F not significant; post-hoc shown for reference only.'}
        </p>
      )}
      <p className="text-[11px] text-duo-cocoa-400 mb-2 leading-snug">{hint}</p>
      <div className="overflow-x-auto bg-white border border-duo-cocoa-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.pair}</Th>
              <Th>{c.meanDiff}</Th>
              <Th>{c.se}</Th>
              <Th>{c.t}</Th>
              <Th>{c.pRaw}</Th>
              <Th>{c.pAdj}</Th>
            </tr>
          </thead>
          <tbody>
            {bonferroni.pairs.map((p, idx) => (
              <tr key={idx}>
                <Td align="left" mono={false} bold>
                  {labelOf(p.a)} − {labelOf(p.b)}
                </Td>
                <Td>{fmtNum(p.meanDiff, 2)}</Td>
                <Td>{fmtNum(p.se, 3)}</Td>
                <Td>{fmtNum(p.t, 3)}</Td>
                <Td>{fmtP(p.pRaw)}</Td>
                <Td>{fmtP(p.p)}{fmtSig(p.p)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-duo-cocoa-400 mt-2">
        * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
      </p>
    </div>
  )
}

function Interpretation({ result, t, valueLabels, lang }) {
  const { anova, tukey } = result
  const sig = anova.p < 0.05
  const etaKey = etaInterpKey(anova.eta2)
  const labelOf = (name) => {
    const dict = valueLabels?.[lang === 'zh-TW' ? 'zh' : 'en']
    return dict?.[name] || name
  }

  const overall = fillTemplate(t.anova.interp.overall, {
    sigWord: sig ? t.anova.interp.sigYes : t.anova.interp.sigNo,
    df1: anova.dfBetween,
    df2: anova.dfWithin,
    f: fmtNum(anova.F, 3),
    pStr: fmtP(anova.p),
    eta2: fmtNum(anova.eta2, 3),
    etaInterp: etaKey ? t.anova.result.effectInterp[etaKey] : '—',
    omega2: fmtNum(anova.omega2, 3),
  })

  return (
    <div className="mt-5">
      <Heading>{t.anova.interp.header}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-md px-4 py-3 text-sm leading-relaxed text-duo-cocoa-700">
        <p className="whitespace-pre-line">{overall}</p>
        {sig ? (
          <>
            <p className="mt-3 font-medium">{t.anova.interp.tukeyOpener}</p>
            <ul className="mt-1.5 space-y-1.5">
              {tukey.map((p, idx) => {
                const sigPair = p.p < 0.05
                const text = fillTemplate(t.anova.interp.tukeyPair, {
                  a: labelOf(p.a),
                  b: labelOf(p.b),
                  diff: fmtNum(p.meanDiff, 2),
                  q: fmtNum(p.q, 3),
                  pStr: fmtP(p.p),
                  sigWord: sigPair ? t.anova.interp.sigYes : t.anova.interp.sigNo,
                })
                return (
                  <li key={idx} className={sigPair ? 'text-duo-cocoa-800' : 'text-duo-cocoa-500'}>
                    · {text}
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-duo-cocoa-500">{t.anova.interp.noPosthoc}</p>
        )}
      </div>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runOneWayAnova(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg
    if (result.error === 'factorBadGroups')
      msg = fillTemplate(t.anova.config.factorBadGroups, { k: result.meta.k })
    else msg = t.anova.config[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const valueLabels = dataset.valueLabels?.[result.factor]

  return (
    <div>
      <AssumptionChecks assumptions={result.assumptions} t={t} />

      {/* 關鍵統計量卡片（2026-07 UI 改版；p 值紅綠語意：顯著=綠、未達顯著=紅色） */}
      <StatCards
        items={[
          {
            label: t.anova.result.cols.f,
            value: fmtNum(result.anova.F, 3),
            sub: `${t.anova.result.cols.df} = ${result.anova.dfBetween}, ${result.anova.dfWithin}`,
          },
          {
            label: t.anova.result.cols.p,
            value: fmtP(result.anova.p),
            tone: toneForP(result.anova.p),
            sub: Number.isFinite(result.anova.p) ? (result.anova.p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          { label: t.anova.result.effectInterp.eta2Label, value: fmtNum(result.anova.eta2, 3) },
          { label: t.anova.result.effectInterp.omega2Label, value: fmtNum(result.anova.omega2, 3) },
        ]}
      />

      <GroupDescTable groupStats={result.anova.groupStats} t={t} valueLabels={valueLabels} lang={lang} />
      <AnovaTable anova={result.anova} t={t} />
      <EffectSize anova={result.anova} t={t} />
      <TukeyTable tukey={result.tukey} anova={result.anova} t={t} valueLabels={valueLabels} lang={lang} />
      <BonferroniTable bonferroni={result.bonferroni} anova={result.anova} t={t} valueLabels={valueLabels} lang={lang} />
      {mode === 'teaching' && (
        <Interpretation result={result} t={t} valueLabels={valueLabels} lang={lang} />
      )}
    </div>
  )
}

export default Result
