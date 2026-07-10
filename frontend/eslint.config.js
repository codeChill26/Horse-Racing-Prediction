import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'e2e', 'playwright.config.js']),
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
    rules: {
      // Dự án dùng useEffect để fetch API (chưa có React Query).
      // Pattern `useEffect(() => { loadData(); }, [loadData])` là chuẩn trong codebase này.
      // Tắt rule strict này để tránh cascade-render warnings không phù hợp với thực tế dự án.
      'react-hooks/set-state-in-effect': 'off',

      // Cho phép tên tham số bắt đầu bằng `_` để đánh dấu intentionally unused
      // (thường gặp trong mock/dummy code và khi giữ signature để tương thích API).
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
])