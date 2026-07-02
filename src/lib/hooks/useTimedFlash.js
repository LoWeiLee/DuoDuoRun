/**
 * Timer 相關 React hooks
 *
 * 集中處理「setTimeout 後改 state」這個常見 pattern 的 cleanup，避免：
 *   - 元件 unmount 後 setState 的 console warning
 *   - 連續快速觸發時前後 timer 互相覆蓋
 *   - 短時間多次操作造成 state 跳動
 *
 * 對外 API：
 *   useTimedFlash(duration)
 *     → [active, flash]
 *     active 為 boolean；呼叫 flash() 後 active=true，duration ms 後自動回 false。
 *     連續呼叫 flash 會重置計時。
 *     用途：CopyButton「已複製」flash、LoadDemoButton「已載入」flash。
 *
 *   useAutoClearTimer()
 *     → [schedule, cancel]
 *     schedule(fn, ms) 把 fn 排在 ms 後執行，新 schedule 會取消舊的。
 *     cancel() 手動取消尚未觸發的 timer。
 *     用途：toast 顯示一段時間後消失、DecisionHelper close 後 reset path 等。
 *
 * 兩個 hook 都會在元件 unmount 時自動清掉未觸發的 timer。
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export function useTimedFlash(duration = 1500) {
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)

  const flash = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActive(true)
    timerRef.current = setTimeout(() => {
      setActive(false)
      timerRef.current = null
    }, duration)
  }, [duration])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return [active, flash]
}

export function useAutoClearTimer() {
  const timerRef = useRef(null)

  const schedule = useCallback((fn, ms) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      fn()
    }, ms)
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return [schedule, cancel]
}
