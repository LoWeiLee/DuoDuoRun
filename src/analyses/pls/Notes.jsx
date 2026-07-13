/**
 * PLS-SEM — Notes（教學模式右欄）
 *
 * 用途／前提與適用情境／核心概念／怎麼讀（內容在 i18n 的 pls.notes）。
 */
import { useApp } from '../../context/AppContext'

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-duo-cocoa-400 mb-2">
        {title}
      </h4>
      <div className="text-sm text-duo-cocoa-700 leading-relaxed whitespace-pre-line">
        {children}
      </div>
    </section>
  )
}

function Notes() {
  const { t } = useApp()
  const n = t.pls.notes

  return (
    <div>
      <Section title={n.purposeTitle}>{n.purpose}</Section>
      <Section title={n.assumpTitle}>{n.assumptions}</Section>
      <Section title={n.conceptsTitle}>{n.concepts}</Section>
      <Section title={n.w4Title}>{n.w4}</Section>
      <Section title={n.w5Title}>{n.w5}</Section>
      <Section title={n.ctaTitle}>{n.cta}</Section>
      <Section title={n.fimixTitle}>{n.fimix}</Section>
      <Section title={n.posTitle}>{n.pos}</Section>
      <Section title={n.copulaTitle}>{n.copula}</Section>
      <Section title={n.readingTitle}>{n.reading}</Section>
    </div>
  )
}

export default Notes
