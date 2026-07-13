/**
 * Vitest 全域 setup。
 *
 * 統計層測試跑在 node 環境、UI 測試跑在 jsdom（檔頭 `// @vitest-environment jsdom`），
 * 兩者共用同一個 setupFiles。jest-dom 的 matcher 需要 document，故只在 jsdom 下載入。
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')

  // jsdom 沒有實作 matchMedia；AppContext 初始化側欄收合狀態時會呼叫。
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
  }
}
