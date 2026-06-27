import type { EmailRuntimeConfig } from '../../../src/runtime/types/index.js'

function apiKeyFor(provider: string): string {
  switch (provider) {
    case 'resend':
      return process.env.NUXT_EMAIL_RESEND_API_KEY ?? ''
    case 'sendgrid':
      return process.env.NUXT_EMAIL_SENDGRID_API_KEY ?? ''
    case 'postmark':
      return process.env.NUXT_EMAIL_POSTMARK_API_KEY ?? ''
    default:
      return ''
  }
}

export function buildEmailConfig(provider: string): EmailRuntimeConfig {
  return {
    provider,
    apiKey: apiKeyFor(provider),
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
