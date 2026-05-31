import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 120000,
    alias: {
      '#nuxt-email/templates': fileURLToPath(new URL('./test/stubs/email-templates.ts', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/runtime/types/**'],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
})
