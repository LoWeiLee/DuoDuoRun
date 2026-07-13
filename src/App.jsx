import AppProvider from './context/AppProvider'
import { useApp } from './context/AppContext'
import ToastProvider from './components/Toast'
import TopToolbar from './components/TopToolbar'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import DecisionHelper from './components/DecisionHelper'

// ToastProvider 需要 t（關閉鈕的 aria-label）→ 必須在 AppProvider 內側取得
function Shell() {
  const { t } = useApp()
  return (
    <ToastProvider closeLabel={t.common.close}>
      <div className="min-h-screen md:h-screen flex flex-col">
        <TopToolbar />
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
          <Sidebar />
          <MainContent />
        </div>
        {/* 浮動決策助手（首頁與分析頁皆可用） */}
        <DecisionHelper />
      </div>
    </ToastProvider>
  )
}

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

export default App
