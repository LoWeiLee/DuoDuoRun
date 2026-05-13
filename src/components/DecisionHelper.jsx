/**
 * 決策助手 — 浮動 Messenger 風格按鈕 + 對話流程
 *
 * 不知道用什麼分析時，點一下多多頭像，回答幾個問題後給出推薦分析。
 * 樹狀問答結構在本檔內以常數 TREE 表示；所有顯示文字走 i18n（t.helper）。
 *
 * 推薦結果可一鍵跳到該 analysis（呼叫 setActiveAnalysis）。
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ANALYSIS_GROUPS } from '../config/analyses'
import { isAnalysisImplemented } from '../analyses/registry'
import duoHead from '../assets/duoduo-assistant.png'

/* ─────────────────────  問答樹  ───────────────────── */
/**
 * 每個 node：
 *   { qKey, options: [{ key, optKey, next? | recommend? }] }
 *   - next      → 下一個 question node id
 *   - recommend → analysis id 陣列；點此選項即進入推薦頁
 */
const TREE = {
  start: {
    qKey: 'start',
    options: [
      { key: 'describe', optKey: 'describe', next: 'describe' },
      { key: 'compare',  optKey: 'compare',  next: 'compareDv' },
      { key: 'relate',   optKey: 'relate',   next: 'relate' },
      { key: 'scale',    optKey: 'scale',    next: 'scale' },
      { key: 'classify', optKey: 'classify', next: 'classify' },
    ],
  },
  describe: {
    qKey: 'describe',
    options: [
      { key: 'summary',   optKey: 'summary',   recommend: ['desc-stats'] },
      { key: 'visualize', optKey: 'visualize', recommend: ['visualization'] },
      { key: 'normality', optKey: 'normality', recommend: ['normality'] },
    ],
  },
  compareDv: {
    qKey: 'compareDv',
    options: [
      { key: 'continuous',  optKey: 'continuous',  next: 'compareN' },
      { key: 'categorical', optKey: 'categorical', recommend: ['chi-square', 'fisher-exact', 'z-prop'] },
      { key: 'nonnormal',   optKey: 'nonnormal',   recommend: ['nonparametric'] },
    ],
  },
  compareN: {
    qKey: 'compareN',
    options: [
      { key: 'oneVsFixed', optKey: 'oneVsFixed', recommend: ['t-test', 'z-prop'] },
      { key: 'two',        optKey: 'twoGroups',  next: 'compareTwoDesign' },
      { key: 'threePlus',  optKey: 'threePlus',  next: 'compareManyDesign' },
    ],
  },
  compareTwoDesign: {
    qKey: 'compareTwoDesign',
    options: [
      { key: 'independent', optKey: 'independent', recommend: ['t-test'] },
      { key: 'paired',      optKey: 'paired',      recommend: ['t-test'] },
    ],
  },
  compareManyDesign: {
    qKey: 'compareManyDesign',
    options: [
      { key: 'between',   optKey: 'between',   recommend: ['one-way-anova'] },
      { key: 'within',    optKey: 'within',    recommend: ['repeated-anova'] },
      { key: 'mixed',     optKey: 'mixed',     recommend: ['mixed-anova'] },
      { key: 'covariate', optKey: 'covariate', recommend: ['ancova'] },
      { key: 'multiDv',   optKey: 'multiDv',   recommend: ['manova'] },
    ],
  },
  relate: {
    qKey: 'relate',
    options: [
      { key: 'corr',        optKey: 'corr',        recommend: ['correlation'] },
      { key: 'simpleReg',   optKey: 'simpleReg',   recommend: ['simple-regression'] },
      { key: 'multiReg',    optKey: 'multiReg',    recommend: ['multiple-regression'] },
      { key: 'logisticReg', optKey: 'logisticReg', recommend: ['logistic-regression'] },
      { key: 'hierReg',     optKey: 'hierReg',     recommend: ['hierarchical-regression'] },
    ],
  },
  scale: {
    qKey: 'scale',
    options: [
      { key: 'reliability',   optKey: 'reliability',   recommend: ['cronbach-alpha'] },
      { key: 'explore',       optKey: 'explore',       recommend: ['efa'] },
      { key: 'confirm',       optKey: 'confirm',       recommend: ['cfa'] },
      { key: 'agreementCat',  optKey: 'agreementCat',  recommend: ['kappa'] },
      { key: 'agreementCont', optKey: 'agreementCont', recommend: ['icc'] },
    ],
  },
  classify: {
    qKey: 'classify',
    options: [
      { key: 'lda',     optKey: 'lda',     recommend: ['lda'] },
      { key: 'cluster', optKey: 'cluster', recommend: ['cluster'] },
    ],
  },
}

/* ─────────────────────  helpers  ───────────────────── */

function findAnalysisLabel(id, t) {
  for (const g of ANALYSIS_GROUPS) {
    const it = g.items.find((i) => i.id === id)
    if (it) return t.sidebar?.[it.i18nKey] || id
  }
  return id
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6l-3 2v-2H4a2 2 0 0 1-2-2z" />
    </svg>
  )
}

/* ─────────────────────  元件  ───────────────────── */

function DecisionHelper() {
  const { t, setActiveAnalysis } = useApp()
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState(['start']) // 已走過的 node id stack
  const [recommendation, setRecommendation] = useState(null) // analysis id[] | null

  const helper = t.helper || {}
  const currentNode = TREE[path[path.length - 1]] || TREE.start

  const reset = () => {
    setPath(['start'])
    setRecommendation(null)
  }
  const close = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }
  const back = () => {
    if (recommendation) {
      setRecommendation(null)
      return
    }
    if (path.length > 1) setPath((p) => p.slice(0, -1))
  }
  const handleOption = (opt) => {
    if (opt.recommend) {
      setRecommendation(opt.recommend)
    } else if (opt.next) {
      setPath((p) => [...p, opt.next])
    }
  }
  const jumpTo = (id) => {
    if (!isAnalysisImplemented(id)) return
    setActiveAnalysis(id)
    close()
  }

  /* ─── 浮動按鈕（未開啟） ─── */
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={helper.fabTitle}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 pl-1 pr-3.5 py-1 rounded-full bg-white shadow-xl ring-1 ring-duo-cocoa-100 hover:ring-duo-amber-400 hover:shadow-2xl transition-all"
      >
        <span className="relative inline-block">
          <img
            src={duoHead}
            alt="多多"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
          />
          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-duo-leaf ring-2 ring-white" />
        </span>
        <span className="font-serif text-[13px] font-medium text-duo-cocoa-800 group-hover:text-duo-amber-700 transition">
          {helper.fabBubble}
        </span>
      </button>
    )
  }

  /* ─── 對話視窗（開啟） ─── */
  return (
    <div
      className="fixed bottom-4 right-4 left-4 md:left-auto md:bottom-6 md:right-6 z-50 flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-duo-cocoa-100 overflow-hidden"
      style={{ width: 'min(380px, calc(100vw - 32px))', maxHeight: 'min(640px, calc(100vh - 80px))' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-duo-amber-50 to-duo-cream-50 border-b border-duo-cocoa-100">
        <span className="relative inline-block">
          <img
            src={duoHead}
            alt="多多"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-duo-cocoa-100"
          />
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-duo-leaf ring-2 ring-white" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-sm font-semibold text-duo-cocoa-900 leading-tight">
            {helper.fabTitle}
          </div>
          <div className="text-[11px] text-duo-cocoa-500 mt-0.5">{helper.fabHint}</div>
        </div>
        <button
          type="button"
          onClick={close}
          title={helper.closeBtn}
          className="p-1.5 rounded-md text-duo-cocoa-400 hover:text-duo-cocoa-800 hover:bg-white/60 transition"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* 開場（路徑只有 start 時顯示） */}
        {path.length === 1 && !recommendation && helper.intro && (
          <div className="flex items-start gap-2">
            <img src={duoHead} alt="" className="h-7 w-7 rounded-full mt-1 shrink-0 object-cover" />
            <div className="bg-duo-cream-50 rounded-2xl rounded-tl-sm px-3 py-2 text-[13px] text-duo-cocoa-800 leading-relaxed max-w-[85%]">
              {helper.intro}
            </div>
          </div>
        )}

        {/* 多多訊息（問題或推薦標題） */}
        <div className="flex items-start gap-2">
          <img src={duoHead} alt="" className="h-7 w-7 rounded-full mt-1 shrink-0 object-cover" />
          <div className="bg-duo-cream-50 rounded-2xl rounded-tl-sm px-3 py-2 text-[13px] text-duo-cocoa-800 leading-relaxed max-w-[85%]">
            {recommendation
              ? helper.recTitle
              : helper.q?.[currentNode.qKey] || currentNode.qKey}
          </div>
        </div>

        {/* 選項 / 推薦 */}
        <div className="ml-9 space-y-2 pt-1">
          {recommendation ? (
            <>
              {recommendation.map((id) => {
                const implemented = isAnalysisImplemented(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => jumpTo(id)}
                    disabled={!implemented}
                    className={[
                      'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left rounded-xl text-[13px] transition border',
                      implemented
                        ? 'bg-duo-amber-50 border-duo-amber-200 text-duo-cocoa-900 hover:bg-duo-amber-100 hover:border-duo-amber-400'
                        : 'bg-duo-cream-50 border-duo-cocoa-100 text-duo-cocoa-400 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <span className="font-medium">{findAnalysisLabel(id, t)}</span>
                    {implemented && <span className="text-duo-amber-700">→</span>}
                  </button>
                )
              })}
              {helper.recNote && (
                <p className="text-[11px] text-duo-cocoa-400 leading-snug pt-1">
                  {helper.recNote}
                </p>
              )}
            </>
          ) : (
            currentNode.options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleOption(opt)}
                className="w-full text-left px-3.5 py-2 rounded-xl text-[13px] text-duo-cocoa-800 bg-white border border-duo-cocoa-100 hover:border-duo-amber-400 hover:bg-duo-amber-50/40 transition"
              >
                {helper.opt?.[opt.optKey] || opt.optKey}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-duo-cream-50 border-t border-duo-cocoa-100">
        <button
          type="button"
          onClick={back}
          disabled={path.length === 1 && !recommendation}
          className="text-[11px] text-duo-cocoa-500 hover:text-duo-cocoa-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ← {helper.backBtn}
        </button>
        <div className="flex items-center gap-1 text-duo-cocoa-300">
          <ChatIcon />
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-duo-amber-700 hover:underline underline-offset-2 transition"
        >
          {helper.restartBtn}
        </button>
      </div>
    </div>
  )
}

export default DecisionHelper
