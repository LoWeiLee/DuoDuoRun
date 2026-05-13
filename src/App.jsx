import { AppProvider } from './context/AppContext'
import TopToolbar from './components/TopToolbar'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import DecisionHelper from './components/DecisionHelper'

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen md:h-screen flex flex-col">
        <TopToolbar />
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
          <Sidebar />
          <MainContent />
        </div>
        {/* 浮動決策助手（首頁與分析頁皆可用） */}
        <DecisionHelper />
      </div>
    </AppProvider>
  )
}

export default App
