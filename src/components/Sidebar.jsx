/**
 * 左側垂直導覽列
 *
 * 視覺風格（暖色 AI 質感）：
 *   - 群組標題：serif、半粗、低調
 *   - 選中項目：左 2px duo-amber border + duo-amber-700 文字（不用色塊背景）
 *   - 未選 hover：底色 duo-cream-50
 *   - Priority 徽章：font-mono、細邊框
 *   - 即將開放群組：所有項目灰色、不可點擊
 *
 * 收起狀態：sidebarCollapsed = true 時，僅顯示一條極窄的展開條。
 * 注意：桌面版 aside 必須是 md:relative（不能 md:static），
 * 否則 absolute 定位的收起按鈕會錨到外層版面容器、跑到整個畫面右上角
 * （看起來像最右欄的按鈕、點了卻收合側欄）。
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ANALYSIS_GROUPS, COMING_SOON } from '../config/analyses'

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 4 10 8 6 12" />
    </svg>
  )
}

function PanelChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 4 6 8 10 12" />
    </svg>
  )
}

function PanelChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  )
}

// P2/P3 徽章已停用（Tier 1+2 全部上線後不再有意義）
function PriorityBadge() {
  return null
}

function Sidebar() {
  const { activeAnalysis, setActiveAnalysis, t, sidebarCollapsed, toggleSidebar } = useApp()
  const [openGroups, setOpenGroups] = useState(
    () => ({
      ...Object.fromEntries(ANALYSIS_GROUPS.map(g => [g.id, true])),
      'coming-soon': false,
    })
  )

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // 收起狀態：桌面顯示窄條；手機完全不渲染（drawer 已關）
  if (sidebarCollapsed) {
    return (
      <aside className="hidden md:flex w-7 shrink-0 border-r border-duo-cocoa-100 bg-white flex-col items-center pt-3">
        <button
          type="button"
          onClick={toggleSidebar}
          title={t.common?.expand || '展開'}
          className="p-1 text-duo-cocoa-400 hover:text-duo-amber-700 transition"
        >
          <PanelChevronRight />
        </button>
      </aside>
    )
  }

  return (
    <>
      {/* 手機 backdrop：點擊關閉 drawer */}
      <div
        className="md:hidden fixed inset-0 top-16 bg-black/30 z-30"
        onClick={toggleSidebar}
        aria-hidden
      />
      <aside className="fixed top-16 bottom-0 left-0 w-72 z-40 shadow-xl md:relative md:top-auto md:bottom-auto md:left-auto md:w-60 md:z-auto md:shadow-none shrink-0 border-r border-duo-cocoa-100 bg-white overflow-y-auto">
      {/* 收起按鈕（錨定在本欄右上角，收合的是側欄自己） */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={t.common?.collapse || '收起'}
        className="absolute top-3 right-2 p-1 text-duo-cocoa-300 hover:text-duo-amber-700 transition z-10"
      >
        <PanelChevronLeft />
      </button>

      <nav className="py-4">
        {ANALYSIS_GROUPS.map(group => {
          const open = openGroups[group.id]
          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2.5 px-5 py-2 font-serif text-[15px] font-semibold text-duo-cocoa-900 hover:text-duo-amber-700 transition"
              >
                <span className="text-duo-cocoa-300">
                  <ChevronIcon open={open} />
                </span>
                {t.sidebar[group.i18nKey]}
              </button>

              {open && (
                <ul className="pl-5">
                  {group.items.map(item => {
                    const isActive = activeAnalysis === item.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveAnalysis(item.id)}
                          className={[
                            'w-full flex items-center pl-5 pr-3 py-1.5 text-xs text-left transition border-l-2',
                            isActive
                              ? 'border-duo-amber-500 text-duo-amber-700 bg-duo-amber-50/40 font-medium'
                              : 'border-transparent text-duo-cocoa-600 hover:text-duo-cocoa-900 hover:bg-duo-cream-50',
                          ].join(' ')}
                        >
                          <span>{t.sidebar[item.i18nKey]}</span>
                          <PriorityBadge priority={item.priority} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {/* 即將開放功能（COMING_SOON） */}
        <div className="mb-1 mt-3 border-t border-duo-cocoa-100 pt-2">
          <button
            type="button"
            onClick={() => toggleGroup('coming-soon')}
            className="w-full flex items-center gap-2.5 px-5 py-2 font-serif text-[15px] font-semibold text-duo-cocoa-400 hover:text-duo-cocoa-700 transition"
          >
            <span className="text-duo-cocoa-300">
              <ChevronIcon open={openGroups['coming-soon']} />
            </span>
            {t.sidebar.comingSoon}
          </button>

          {openGroups['coming-soon'] && (
            <ul className="pl-5">
              {COMING_SOON.map(item => (
                <li key={item.id}>
                  {/*
                    2026-07-13 紅隊 R3：原本是 <div>，螢幕報讀完全不會提及它是
                    「尚未開放的分析項目」——只會念出項目名稱，使用者以為可以點。
                    改為 disabled 的 <button> ＋ aria-disabled，輔具會明確播報停用狀態。
                  */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={t.sidebar.comingSoonHint}
                    className="w-full flex items-center pl-5 pr-3 py-1.5 text-xs text-left border-l-2 border-transparent text-duo-cocoa-300 cursor-not-allowed select-none"
                  >
                    <span>{t.sidebar[item.i18nKey] || item.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </aside>
    </>
  )
}

export default Sidebar
