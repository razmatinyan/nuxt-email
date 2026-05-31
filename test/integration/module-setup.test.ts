import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'

describe('nuxt-email module — basic fixture integration', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
  })

  it('module initializes without throwing', () => {
    // If setup() did not throw, the module loaded and configured successfully
    expect(true).toBe(true)
  })
})
