import type { EmailPayload, EmailRuntimeConfig, NormalizedPayload } from '../../types/index.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const HEADER_INJECTION_PATTERN = /[\r\n]/

const TRANSIENT_ERROR_TOKENS = [
  'timeout',
  'timed out',
  'econnrefused',
  'econnreset',
  'etimedout',
  'rate limit',
  '429',
  '500',
  '502',
  '503',
  '504',
]

export function validateAddress(address: string, field: string): void {
  if (HEADER_INJECTION_PATTERN.test(address)) {
    throw new Error(
      `[nuxt-email] Invalid email address in \`${field}\`: contains newline characters (potential header injection).`,
    )
  }
  if (!EMAIL_PATTERN.test(address)) {
    throw new Error(
      `[nuxt-email] Invalid email address in \`${field}\`: "${address}"`,
    )
  }
}

export function validatePayload(payload: EmailPayload): void {
  if (!payload.to) {
    throw new Error('[nuxt-email] `to` is required.')
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to]

  if (toAddresses.length === 0) {
    throw new Error('[nuxt-email] `to` must contain at least one recipient.')
  }

  for (const addr of toAddresses) {
    validateAddress(addr, 'to')
  }

  if (!payload.html && !payload.template && !payload.text) {
    throw new Error(
      '[nuxt-email] At least one of `html`, `text`, or `template` is required.',
    )
  }

  if (HEADER_INJECTION_PATTERN.test(payload.subject ?? '')) {
    throw new Error(
      '[nuxt-email] `subject` contains newline characters (potential header injection).',
    )
  }
}

export function normalizeAddresses(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value : [value]
}

export function buildNormalizedPayload(
  payload: EmailPayload,
  html: string,
  config: Pick<EmailRuntimeConfig, 'from'>,
): NormalizedPayload {
  const from = payload.from || config.from
  if (!from) {
    throw new Error(
      '[nuxt-email] No `from` address. '
      + 'Set `email.from` in nuxt.config.ts or pass `from` in the payload.',
    )
  }

  return {
    from,
    to: normalizeAddresses(payload.to)!,
    subject: payload.subject,
    html,
    text: payload.text,
    cc: normalizeAddresses(payload.cc),
    bcc: normalizeAddresses(payload.bcc),
    replyTo: payload.replyTo,
    attachments: payload.attachments,
    headers: payload.headers,
    scheduledAt: payload.scheduledAt,
    tags: payload.tags,
  }
}

export function isTransientError(error?: string): boolean {
  if (!error) return false
  const lower = error.toLowerCase()
  return TRANSIENT_ERROR_TOKENS.some(token => lower.includes(token))
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
