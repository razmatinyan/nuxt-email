import type { EmailRuntimeConfig } from '../../../src/runtime/types/index.js'

export function buildEmailConfig(provider: string): EmailRuntimeConfig {
  return {
    provider,
    apiKey: process.env.NUXT_EMAIL_API_KEY ?? '',
    from: process.env.NUXT_EMAIL_FROM || 'Playground <noreply@playground.local>',
    smtpHost: process.env.NUXT_EMAIL_SMTP_HOST ?? '',
    smtpPort: Number(process.env.NUXT_EMAIL_SMTP_PORT) || 587,
    smtpUser: process.env.NUXT_EMAIL_SMTP_USER ?? '',
    smtpPass: process.env.NUXT_EMAIL_SMTP_PASS ?? '',
    smtpSecure: process.env.NUXT_EMAIL_SMTP_SECURE === 'true',
    retries: 1,
    retryDelay: 500,
  }
}
