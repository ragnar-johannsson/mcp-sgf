import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/[.]**',
        '**/*.d.ts',
        '**/*.config.*',
        'tests/**',
        '**/{vitest,vite}.config.*'
      ],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    testTimeout: 5000,
    hookTimeout: 10000
  }
})
