import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('nuxt-email module — basic fixture integration', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
    dev: true,
  })

  it('module initializes without throwing', () => {
    // If setup() did not throw, the module loaded and configured successfully
    expect(true).toBe(true)
  })

  it('GET /_email/templates returns array with welcome', async () => {
    const data = await $fetch('/_email/templates', { method: 'GET' })
    expect(Array.isArray(data)).toBe(true)
    const item = (data as Array<{ name: string }>).find(t => t.name === 'welcome')
    expect(item).toBeDefined()
    expect(item!.name).toBe('welcome')
  })

  it('POST /_email/send-test/welcome returns success', async () => {
    const data = await $fetch('/_email/send-test/welcome', {
      method: 'POST',
      body: { to: 'test@example.com' },
    })
    expect((data as { success: boolean }).success).toBe(true)
  })

  it('GET /_email/devtools returns HTML with nuxt-email marker', async () => {
    const html = await $fetch('/_email/devtools', { method: 'GET', responseType: 'text' })
    expect(typeof html).toBe('string')
    expect(html).toContain('nuxt-email')
  })

  it('GET /_email/preview/welcome returns HTML', async () => {
    const html = await $fetch('/_email/preview/welcome', { method: 'GET', responseType: 'text' })
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })
})
