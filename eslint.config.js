import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // reference/ 是專案最初的單檔原型（statlite.jsx），保留供溯源——
  // 三個統計檔的檔頭註解引用它為出處（「從 reference/statlite.jsx 抽出，已對標 SPSS」）。
  // 它不被任何程式碼 import、不進 build，也不維護，因此排除於 lint 之外，
  // 避免它的既有寫法持續產生噪音、掩蓋真正的新警報。
  globalIgnores(['dist', 'reference']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
