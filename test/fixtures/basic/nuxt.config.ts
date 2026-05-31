import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '../../src/module',
  ],
  email: {
    provider: 'console',
    from: 'Test <test@fixture.local>',
    preview: false,
    retries: 0,
    retryDelay: 0,
  },
})
