/**
 * NCA — Result（中欄）
 *
 * 結構：
 *   - 關鍵統計量卡片（CE-FDH d、效果量分級、permutation p、CR-FDH d）
 *   - Scope 摘要（X / Y 實證範圍）
 *   - Ceiling line 摘要表（CE-FDH / CR-FDH：ceiling zone、d、準確度）
 *   - Bottleneck 表（各 Y 水準所需的 X；NN = 不必要）
 *   - 教學模式：白話解讀
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runNCACompute } from './compute'
import { ncaVerdict, NCA_ALPHA, NCA_MIN_EFFECT } from '../../lib/stats/nca'
import StatCards from '../../components/StatCards'
import { fmtNum, fmtP, fillTemplate, toneForP } from '../../lib/format'
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

function effectWord(label, t) {
  return t.nca.effect[label] || label
}

function ScopeRow({ nca, t, labelMap, xVar, yVar, nDropped, nTotal }) {
  const s = nca.scope
  return (
    <div>
      <Heading>{t.nca.result.scopeTitle}</Heading>
      <div className="bg-white border border-duo-cream-200 rounded-lg px-4 py-3 text-xs text-duo-cocoa-700 leading-relaxed">
        <span className="font-medium text-duo-cocoa-800">{labelMap[xVar] || xVar}</span>{' '}
        <span className="font-mono">[{fmtNum(s.xmin, 2)}, {fmtNum(s.xmax, 2)}]</span>
        {'  ·  '}
        <span className="font-medium text-duo-cocoa-800">{labelMap[yVar] || yVar}</span>{' '}
        <span className="font-mono">[{fmtNum(s.ymin, 2)}, {fmtNum(s.ymax, 2)}]</span>
        {'  ·  '}
        {t.nca.result.scope} <span className="font-mono">{fmtNum(s.area, 2)}</span>
        {'  ·  n = '}<span className="font-mono">{nca.n}</span>
        {/* ★ R37-b：修復前完全不揭露缺失值處理 */}
        {nDropped > 0 && (
          <span className="text-duo-sig-warn">
            {'  ·  '}{fillTemplate(t.nca.result.droppedNote, { dropped: nDropped, total: nTotal })}
          </span>
        )}
      </div>
    </div>
  )
}

function CeilingTable({ nca, t }) {
  const c = t.nca.result.cols
  const ce = nca.ceilings.ce_fdh
  const cr = nca.ceilings.cr_fdh
  const row = (name, obj) => (
    <tr>
      <Td align="left" mono={false} bold>{name}</Td>
      <Td>{fmtNum(obj.ceilingZone, 2)}</Td>
      <Td>{fmtNum(obj.effectSize, 3)}</Td>
      <Td mono={false}>{effectWord(obj.effectLabel, t)}</Td>
      <Td>{fmtNum(obj.accuracy * 100, 1)}%</Td>
      {/* ★ R47：CR-FDH 的賣點正是「ceiling 可以寫成一條方程式」，修復前 intercept／slope
          有基準、有逐值比對，卻零 UI 消費者——使用者拿不到那條方程式就無法自行代入計算。 */}
      <Td align="left" mono>
        {Number.isFinite(obj.intercept) && Number.isFinite(obj.slope)
          ? `y = ${fmtNum(obj.intercept, 3)} ${obj.slope < 0 ? '−' : '+'} ${fmtNum(Math.abs(obj.slope), 3)}x`
          : t.nca.result.ceilingStep}
      </Td>
    </tr>
  )
  return (
    <div>
      <Heading>{t.nca.result.ceilingTitle}</Heading>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{c.ceiling}</Th>
              <Th>{c.zone}</Th>
              <Th>{c.d}</Th>
              <Th>{c.effect}</Th>
              <Th>{c.accuracy}</Th>
              <Th align="left">{c.equation}</Th>
            </tr>
          </thead>
          <tbody>
            {row('CE-FDH', ce)}
            {row('CR-FDH', cr)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-duo-cocoa-400 mt-1.5 leading-relaxed">{t.nca.result.ceilingHint}</p>
    </div>
  )
}

function BottleneckTable({ nca, t, labelMap, xVar, yVar }) {
  const c = t.nca.result.cols
  const bn = nca.ceilings.ce_fdh.bottleneck
  return (
    <div>
      <Heading>{t.nca.result.bottleneckTitle}</Heading>
      {/* ★ R47：本表讀值一律錨定於 CE-FDH 階梯（`nca.js:249` 的 cr_fdh.bottleneck 是本表的複本）。
          修復前標題與註記都沒說是哪一條 ceiling，而上方的 ceiling 表才剛把 CE 與 CR 並列。 */}
      <p className="text-[11px] text-duo-cocoa-500 mb-1.5 leading-snug">{t.nca.result.bottleneckSource}</p>
      <div className="overflow-x-auto bg-white border border-duo-cream-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-duo-cream-50">
            <tr>
              <Th align="left">{labelMap[yVar] || yVar} {c.yLevel}</Th>
              <Th>{c.yValue}</Th>
              <Th>{labelMap[xVar] || xVar} {c.xRequired}</Th>
              <Th>{c.xPercent}</Th>
            </tr>
          </thead>
          <tbody>
            {bn.map((b) => (
              <tr key={b.level}>
                <Td align="left" bold>{b.level}%</Td>
                <Td>{fmtNum(b.yValue, 2)}</Td>
                <Td>
                  {b.nn
                    ? <span className="text-duo-cocoa-400">{t.nca.result.nn}</span>
                    : fmtNum(b.xValue, 2)}
                </Td>
                <Td>{b.nn ? <span className="text-duo-cocoa-400">—</span> : `${fmtNum(b.xPercent, 1)}%`}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-duo-cocoa-400 mt-1.5 leading-relaxed">{t.nca.result.nnHint}</p>
    </div>
  )
}

function Interpretation({ nca, t, labelMap, xVar, yVar }) {
  const ce = nca.ceilings.ce_fdh
  // ★ R42：與報表、敘述句共讀同一份判準
  const { supported: sig, p } = ncaVerdict(nca.test, ce.effectSize)
  const text = fillTemplate(t.nca.interp.sentence, {
    xLabel: labelMap[xVar] || xVar,
    yLabel: labelMap[yVar] || yVar,
    d: fmtNum(ce.effectSize, 3),
    effectWord: effectWord(ce.effectLabel, t),
    pStr: fmtP(p),
    concl: sig ? t.nca.interp.supported : t.nca.interp.notSupported,
  })
  return (
    <div className="mt-5">
      <Heading>{t.nca.result.readingTitle}</Heading>
      <p className="text-sm leading-relaxed text-duo-cocoa-700 bg-white border border-duo-cream-200 rounded-md px-4 py-3">
        {text}
      </p>
    </div>
  )
}

function Result() {
  const { dataset, lang, mode, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runNCACompute(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    const msg = t.nca.config[result.error] || t.errors.stats[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
  const nca = result.nca
  const ce = nca.ceilings.ce_fdh
  // ★ R42：整體判準只有這一份（`ncaVerdict`）；燈號、註記、敘述句都由它決定
  const verdict = ncaVerdict(nca.test, ce.effectSize)
  const p = verdict.p
  const cols = t.nca.result.cols

  return (
    <div>
      <StatCards
        items={[
          { label: cols.dCe, value: fmtNum(ce.effectSize, 3), sub: effectWord(ce.effectLabel, t),
            tone: verdict.dOk ? 'ok' : undefined },
          {
            label: cols.p,
            value: fmtP(p),
            tone: toneForP(p),
            sub: Number.isFinite(p) ? (p < 0.05 ? 'p < .05' : 'n.s.') : undefined,
          },
          { label: cols.dCr, value: fmtNum(nca.ceilings.cr_fdh.effectSize, 3),
            sub: effectWord(nca.ceilings.cr_fdh.effectLabel, t) },
          { label: cols.nPeers, value: String(ce.peers.length) },
        ]}
      />

      <ScopeRow nca={nca} t={t} labelMap={labelMap} xVar={result.xVar} yVar={result.yVar}
        nDropped={result.nDropped} nTotal={result.nTotal} />
      <CeilingTable nca={nca} t={t} />
      {/* ★ R37-e：修復前 permutation 的次數、seed 與 p 的分母慣例在 UI 完全不揭露 */}
      <p className="text-xs text-duo-cocoa-400 -mt-1 leading-relaxed">
        {fillTemplate(t.nca.result.permNote, {
          perms: nca.test ? nca.test.nPermutations.toLocaleString('en-US') : '—',
          minP: nca.test ? (1 / nca.test.nPermutations).toFixed(4) : '—',
        })}
      </p>
      {/* ★ R42：複合判準（p < .05 且 d >= .1）是本工具口徑，兩篇原文都沒有合併過——
          修復前使用者看到「不足以作為必要條件」卻無從得知是哪一項沒過。 */}
      <p className="text-xs text-duo-cocoa-500 -mt-1 leading-relaxed">
        {fillTemplate(t.nca.result.verdictNote, {
          alpha: NCA_ALPHA.toFixed(2).replace(/^0/, ''),
          dMin: NCA_MIN_EFFECT.toFixed(1),
          verdict: verdict.supported ? t.nca.interp.supported : t.nca.interp.notSupported,
          // ★ reason 本身含 {dMin} 插槽 → 先 fill 一次再帶入外層，避免巢狀插槽漏替換
          reason: fillTemplate(
            verdict.supported
              ? t.nca.result.verdictBoth
              : (!verdict.pOk && !verdict.dOk
                ? t.nca.result.verdictNeither
                : (verdict.pOk ? t.nca.result.verdictDOnly : t.nca.result.verdictPOnly)),
            { dMin: NCA_MIN_EFFECT.toFixed(1) },
          ),
        })}
      </p>
      <BottleneckTable nca={nca} t={t} labelMap={labelMap} xVar={result.xVar} yVar={result.yVar} />
      {mode === 'teaching' && (
        <Interpretation nca={nca} t={t} labelMap={labelMap} xVar={result.xVar} yVar={result.yVar} />
      )}
    </div>
  )
}

export default Result
