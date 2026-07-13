import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base path 必須與 GitHub repo 名稱「大小寫完全一致」，否則 Pages 部署後資源會 404（整頁空白）
// 部署網址：https://loweilee.github.io/DuoDuoRun/
export default defineConfig({
  plugins: [react()],
  base: '/DuoDuoRun/',
  test: {
    // 統計層測試跑在 node（快）；UI 測試在檔頭用 `// @vitest-environment jsdom` 切換。
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    css: false,
  },
})
