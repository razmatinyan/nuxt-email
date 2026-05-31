import { describe, it, expect } from 'vitest'
import {
  validateAddress,
  validatePayload,
  normalizeAddresses,
  buildNormalizedPayload,
  isTransientError,
} from '../../../src/runtime/server/utils/email-utils.js'

const mockConfig = { from: 'default@test.com' }

describe('validateAddress', () => {
  it('accepts valid email addresses', () => {
    expect(() => validateAddress('user@example.com', 'to')).not.toThrow()
    expect(() => validateAddress('user+tag@sub.domain.co', 'to')).not.toThrow()
  })

  it('rejects email with newline (header injection)', () => {
    expect(() => validateAddress('a@b.com\r\nBcc: evil@x.com', 'to'))
      .toThrow('header injection')
  })

  it('rejects malformed email addresses', () => {
    expect(() => validateAddress('not-an-email', 'to')).toThrow('Invalid email address')
    expect(() => validateAddress('@nodomain.com', 'to')).toThrow('Invalid email address')
    expect(() => validateAddress('no@', 'to')).toThrow('Invalid email address')
  })
})

describe('validatePayload', () => {
  it('throws when `to` is missing', () => {
    expect(() => validatePayload({ to: '', subject: 'Hi', html: '<p>Hi</p>' }))
      .toThrow('`to` is required')
  })

  it('throws when `to` is an empty array', () => {
    expect(() => validatePayload({ to: [] as unknown as string, subject: 'Hi', html: '<p>Hi</p>' }))
      .toThrow('at least one recipient')
  })

  it('throws when no content is provided', () => {
    expect(() => validatePayload({ to: 'a@b.com', subject: 'Hi' }))
      .toThrow('`html`, `text`, or `template`')
  })

  it('throws on newline in subject', () => {
    expect(() => validatePayload({ to: 'a@b.com', subject: 'Hi\r\nBcc: x@y.com', html: '<p>Hi</p>' }))
      .toThrow('`subject` contains newline')
  })

  it('accepts valid payload with html', () => {
    expect(() => validatePayload({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' }))
      .not.toThrow()
  })

  it('accepts valid payload with text only', () => {
    expect(() => validatePayload({ to: 'a@b.com', subject: 'Hi', text: 'Hello' }))
      .not.toThrow()
  })

  it('accepts template as content indicator', () => {
    expect(() => validatePayload({ to: 'a@b.com', subject: 'Hi', template: 'welcome' }))
      .not.toThrow()
  })
})

describe('normalizeAddresses', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeAddresses(undefined)).toBeUndefined()
  })

  it('wraps a single string in an array', () => {
    expect(normalizeAddresses('a@b.com')).toEqual(['a@b.com'])
  })

  it('returns an existing array unchanged', () => {
    expect(normalizeAddresses(['a@b.com', 'c@d.com'])).toEqual(['a@b.com', 'c@d.com'])
  })
})

describe('buildNormalizedPayload', () => {
  it('uses default from when payload.from is not set', () => {
    const result = buildNormalizedPayload(
      { to: 'user@test.com', subject: 'Hi', html: '<p>Hi</p>' },
      '<p>Hi</p>',
      mockConfig,
    )
    expect(result.from).toBe('default@test.com')
  })

  it('uses payload.from when provided', () => {
    const result = buildNormalizedPayload(
      { to: 'user@test.com', from: 'custom@test.com', subject: 'Hi', html: '<p>Hi</p>' },
      '<p>Hi</p>',
      mockConfig,
    )
    expect(result.from).toBe('custom@test.com')
  })

  it('throws when no from address is available', () => {
    expect(() =>
      buildNormalizedPayload(
        { to: 'user@test.com', subject: 'Hi', html: '<p>Hi</p>' },
        '<p>Hi</p>',
        { from: '' },
      ),
    ).toThrow('No `from` address')
  })

  it('normalizes string `to` to array', () => {
    const result = buildNormalizedPayload(
      { to: 'user@test.com', subject: 'Hi', html: '<p>Hi</p>' },
      '<p>Hi</p>',
      mockConfig,
    )
    expect(result.to).toEqual(['user@test.com'])
  })

  it('normalizes string `cc` to array', () => {
    const result = buildNormalizedPayload(
      { to: 'a@test.com', cc: 'cc@test.com', subject: 'Hi', html: '<p>Hi</p>' },
      '<p>Hi</p>',
      mockConfig,
    )
    expect(result.cc).toEqual(['cc@test.com'])
  })
})

describe('isTransientError', () => {
  it('returns false for undefined', () => {
    expect(isTransientError(undefined)).toBe(false)
  })

  it('returns false for permanent errors', () => {
    expect(isTransientError('Invalid recipient address')).toBe(false)
    expect(isTransientError('400 Bad Request')).toBe(false)
  })

  it('returns true for transient errors', () => {
    expect(isTransientError('Request timed out')).toBe(true)
    expect(isTransientError('ECONNREFUSED')).toBe(true)
    expect(isTransientError('429 Too Many Requests')).toBe(true)
    expect(isTransientError('500 Internal Server Error')).toBe(true)
    expect(isTransientError('503 Service Unavailable')).toBe(true)
  })
})
