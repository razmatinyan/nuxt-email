import { describe, it, expect } from 'vitest'
import { resolveProviderConfig } from '../../../src/runtime/server/utils/email-utils.js'
import type { EmailRuntimeConfig } from '../../../src/runtime/types/index.js'

const base: EmailRuntimeConfig = {
  provider: 'console',
  apiKey: 'base-key',
  from: 'base@test.com',
  smtpHost: 'base.smtp.test',
  smtpPort: 587,
  smtpUser: 'base-user',
  smtpPass: 'base-pass',
  smtpSecure: false,
  retries: 2,
  retryDelay: 1000,
}

describe('resolveProviderConfig', () => {
  it('returns the base config unchanged when there is no providers map', () => {
    expect(resolveProviderConfig(base, 'resend')).toBe(base)
  })

  it('returns the base config when the provider has no override', () => {
    const config = { ...base, providers: { sendgrid: { apiKey: 'sg-key' } } }
    expect(resolveProviderConfig(config, 'resend')).toBe(config)
  })

  it('overrides the apiKey for the matching provider', () => {
    const config = { ...base, providers: { resend: { apiKey: 'resend-key' } } }
    const resolved = resolveProviderConfig(config, 'resend')
    expect(resolved.apiKey).toBe('resend-key')
    expect(resolved.from).toBe('base@test.com')
  })

  it('overrides the from address per provider', () => {
    const config = { ...base, providers: { resend: { from: 'resend@test.com' } } }
    expect(resolveProviderConfig(config, 'resend').from).toBe('resend@test.com')
  })

  it('falls back to base values for fields the override omits', () => {
    const config = { ...base, providers: { resend: { apiKey: 'resend-key' } } }
    const resolved = resolveProviderConfig(config, 'resend')
    expect(resolved.smtpHost).toBe('base.smtp.test')
    expect(resolved.retries).toBe(2)
  })

  it('resolves smtp fields from the override', () => {
    const config = {
      ...base,
      providers: {
        smtp: { smtpHost: 'mail.example.com', smtpPort: 465, smtpUser: 'u', smtpPass: 'p', smtpSecure: true },
      },
    }
    const resolved = resolveProviderConfig(config, 'smtp')
    expect(resolved.smtpHost).toBe('mail.example.com')
    expect(resolved.smtpPort).toBe(465)
    expect(resolved.smtpSecure).toBe(true)
  })
})
