import type { EmailModuleOptions } from '../src/runtime/types/index.js'

export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@nuxtjs/tailwindcss',
  ],

  email: {
    provider: (process.env.NUXT_EMAIL_PROVIDER as EmailModuleOptions['provider']) || 'console',
    apiKey: process.env.NUXT_EMAIL_API_KEY,
    from: process.env.NUXT_EMAIL_FROM || 'Playground <noreply@playground.local>',
    smtp: {
      host: process.env.NUXT_EMAIL_SMTP_HOST!,
      port: Number(process.env.NUXT_EMAIL_SMTP_PORT) || 587,
      user: process.env.NUXT_EMAIL_SMTP_USER,
      pass: process.env.NUXT_EMAIL_SMTP_PASS,
      secure: process.env.NUXT_EMAIL_SMTP_SECURE === 'true',
    },
    preview: true,
    retries: 1,
    retryDelay: 500,
  },

  devtools: { enabled: true },
})
