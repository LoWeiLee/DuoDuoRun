/**
 * 模組級錯誤邊界
 *
 * React 的 render 期例外若無人攔截，會把整棵樹卸載 → 使用者看到全白畫面，
 * 且已載入的資料與設定一併消失。本元件把「單一分析模組炸掉」的爆炸半徑
 * 限制在該欄位內：其他兩欄仍可操作，資料仍在，換一個分析即可繼續工作。
 *
 * 用法：
 *   <ErrorBoundary resetKey={activeAnalysis} where={t.panels.resultTitle}>
 *     <analysisModule.Result />
 *   </ErrorBoundary>
 *
 * resetKey 變動時（例如切換分析）自動清除錯誤狀態並重新嘗試渲染——
 * 否則一旦某個分析炸過，切到別的分析仍會停留在錯誤卡片。
 *
 * ⚠ 錯誤邊界只攔 render / lifecycle 期的例外。事件處理器（onClick）、
 *   非同步（setTimeout、Promise、Worker 回呼）內的例外攔不到——那些必須在
 *   呼叫端自行 try/catch（見 TopToolbar 的匯出流程）。
 *
 * 必須是 class component：React 沒有對應 componentDidCatch 的 hook。
 */
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 保留在 console 供除錯；不外送任何資料（資料不離開本機是本專案的核心承諾）
    console.error('[多多快跑] 分析模組渲染失敗：', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, showDetails: false })
    }
  }

  handleRetry = () => {
    this.setState({ error: null, showDetails: false })
  }

  render() {
    const { error, showDetails } = this.state
    if (!error) return this.props.children

    const t = this.props.t
    const msg = String(error?.message || error)

    return (
      <div
        role="alert"
        className="rounded-lg border border-duo-sig-bad/40 bg-duo-sig-bad/5 px-4 py-4"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-duo-sig-bad shrink-0 shadow-led-bad"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base font-semibold text-duo-cocoa-900">
              {t.errors.boundaryTitle}
            </h3>
            <p className="mt-1.5 text-sm text-duo-cocoa-600 leading-relaxed">
              {t.errors.boundaryBody}
            </p>
            {this.props.where ? (
              <p className="mt-1 text-xs text-duo-cocoa-400">
                {t.errors.boundaryWhere}：{this.props.where}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-md border border-duo-cocoa-200 bg-white px-3 py-1.5 text-xs font-medium text-duo-cocoa-800
                           hover:border-duo-amber-500 hover:text-duo-amber-700 transition
                           focus-ring"
              >
                {t.errors.boundaryRetry}
              </button>
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                aria-expanded={showDetails}
                className="rounded-md px-2 py-1.5 text-xs text-duo-cocoa-400 hover:text-duo-cocoa-800 transition
                           focus-ring"
              >
                {showDetails ? t.errors.boundaryHideDetails : t.errors.boundaryShowDetails}
              </button>
            </div>

            {showDetails ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-duo-cocoa-900/90 px-3 py-2 font-mono text-[11px] leading-relaxed text-duo-cream-50 whitespace-pre-wrap break-words">
                {msg}
              </pre>
            ) : null}

            <p className="mt-3 text-[11px] text-duo-cocoa-400 leading-relaxed">
              {t.errors.boundaryHint}
            </p>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
