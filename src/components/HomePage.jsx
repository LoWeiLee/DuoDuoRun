/**
 * HomePage — 首頁畫面
 *
 * 顯示時機：尚未載入資料集且未選任何分析時。
 *
 * 結構（Google 首頁式三段）：
 *   - 上：多多照片（圓形）
 *   - 中：中英文標題 + by 作者連結 + tagline
 *   - 下：4 張資訊卡（用途、開發、隱私、引用）+ footer 測試版聲明 + email
 */
import { useApp } from '../context/AppContext'
import duoduoBanner from '../assets/duoduo-banner.jpg'
import { useTimedFlash } from '../lib/hooks/useTimedFlash'

function InfoCard({ title, body }) {
  return (
    <div className="bg-white/70 rounded-xl border hairline p-5">
      <h3 className="font-serif text-base font-semibold text-duo-cocoa-900 mb-2">
        {title}
      </h3>
      <div className="text-sm text-duo-cocoa-700 leading-relaxed whitespace-pre-line">
        {body}
      </div>
    </div>
  )
}

function CopyButton({ text, copyLabel, copiedLabel }) {
  const [copied, flashCopied] = useTimedFlash(1500)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      flashCopied()
    } catch (e) {
      // fallback：選取以便手動複製
      console.error('Copy failed', e)
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        'shrink-0 px-2 py-0.5 text-[11px] font-medium rounded border transition',
        copied
          ? 'bg-duo-sig-ok/10 border-duo-sig-ok text-duo-sig-ok'
          : 'bg-white border-duo-cocoa-100 text-duo-cocoa-600 hover:border-duo-amber-400 hover:text-duo-amber-700',
      ].join(' ')}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  )
}

function CitationCard({ citation }) {
  if (!citation) return null
  return (
    <div className="bg-white/70 rounded-xl border hairline p-5">
      <h3 className="font-serif text-base font-semibold text-duo-cocoa-900 mb-2">
        {citation.title}
      </h3>
      {citation.intro && (
        <p className="text-sm text-duo-cocoa-700 leading-relaxed mb-3">
          {citation.intro}
        </p>
      )}

      {/* APA */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-duo-cocoa-400">
            {citation.apaLabel}
          </span>
          <CopyButton
            text={citation.apa}
            copyLabel={citation.copy}
            copiedLabel={citation.copied}
          />
        </div>
        <div className="text-xs text-duo-cocoa-700 leading-relaxed bg-duo-cream-50 border border-duo-cocoa-100 rounded px-3 py-2">
          {citation.apa}
        </div>
      </div>

      {/* BibTeX */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-duo-cocoa-400">
            {citation.bibtexLabel}
          </span>
          <CopyButton
            text={citation.bibtex}
            copyLabel={citation.copy}
            copiedLabel={citation.copied}
          />
        </div>
        <pre className="text-[11px] text-duo-cocoa-700 leading-snug bg-duo-cream-50 border border-duo-cocoa-100 rounded px-3 py-2 font-mono whitespace-pre overflow-x-auto">
{citation.bibtex}
        </pre>
      </div>
    </div>
  )
}

function HomePage() {
  const { t } = useApp()
  const cards = t.home?.cards || {}

  return (
    <div className="flex-1 overflow-y-auto bg-duo-cream-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 上：多多橫幅（寬度與下方卡片對齊） */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-duo-cocoa-100 bg-duo-cream-100"
          style={{ aspectRatio: '16 / 7' }}
        >
          <img
            src={duoduoBanner}
            alt="多多"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 中：標題與 tagline */}
        <div className="text-center mt-8">
          <h1 className="font-serif text-5xl font-bold text-duo-cocoa-900 tracking-tight">
            {t.app.title}
          </h1>
          <div className="font-mono text-sm tracking-[0.3em] text-duo-amber-700 mt-3 uppercase">
            {t.app.subtitle}
          </div>
          {t.home?.byAuthor && (
            <div className="mt-4 text-sm text-duo-cocoa-600">
              <a
                href={t.home.authorUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif italic hover:text-duo-amber-700 underline-offset-4 hover:underline transition"
              >
                {t.home.byAuthor}
              </a>
            </div>
          )}
          <p className="mt-5 text-base text-duo-cocoa-600 max-w-2xl mx-auto leading-relaxed">
            {t.home?.heroTagline || t.app.tagline}
          </p>
        </div>

        {/* 下：4 張資訊卡（單列、依序：開發 → 用途 → 隱私 → 引用） */}
        <div className="mt-12 flex flex-col gap-4">
          {cards.author && (
            <InfoCard title={cards.author.title} body={cards.author.body} />
          )}
          {cards.purpose && (
            <InfoCard title={cards.purpose.title} body={cards.purpose.body} />
          )}
          {cards.privacy && (
            <InfoCard title={cards.privacy.title} body={cards.privacy.body} />
          )}
          {cards.citation && <CitationCard citation={cards.citation} />}
        </div>

        {/* Footer：測試版聲明 + email mailto */}
        {(t.home?.footerPrefix || t.home?.footerEmail) && (
          <div className="mt-10 pb-4 text-center text-xs text-duo-cocoa-400 leading-relaxed">
            {t.home.footerPrefix}
            {t.home.footerEmail && (
              <a
                href={`mailto:${t.home.footerEmail}`}
                className="font-mono text-duo-amber-700 hover:underline underline-offset-2"
              >
                {t.home.footerEmail}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
