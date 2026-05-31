import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EmailResponse, NormalizedPayload } from '../../../src/runtime/types/index.js'

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    _email: {
      provider: 'console',
      from: 'default@test.com',
      apiKey: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      retries: 2,
      retryDelay: 10,
    },
  }),
}))

const mockSend = vi.fn<(payload: NormalizedPayload) => Promise<EmailResponse>>()

vi.mock('../../../src/runtime/server/utils/providers/index.js', () => ({
  createProvider: () => ({
    name: 'console',
    send: mockSend,
  }),
}))

const { useEmail } = await import('../../../src/runtime/server/composables/useEmail.js')

const successResponse: EmailResponse = {
  success: true,
  messageId: 'msg_ok',
  provider: 'console',
  duration: 1,
}

describe('useEmail — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue(successResponse)
  })

  it('throws when `to` is missing', async () => {
    const { sendEmail } = useEmail()
    await expect(sendEmail({ to: '', subject: 'Test', html: '<p>Hi</p>' }))
      .rejects.toThrow('`to` is required')
  })

  it('throws when no content is provided', async () => {
    const { sendEmail } = useEmail()
    await expect(sendEmail({ to: 'a@b.com', subject: 'Test' }))
      .rejects.toThrow('`html`, `text`, or `template`')
  })

  it('throws on header injection in `to`', async () => {
    const { sendEmail } = useEmail()
    await expect(sendEmail({ to: 'a@b.com\r\nBcc: evil@x.com', subject: 'Test', html: '<p>Hi</p>' }))
      .rejects.toThrow('header injection')
  })

  it('throws on header injection in `subject`', async () => {
    const { sendEmail } = useEmail()
    await expect(sendEmail({ to: 'a@b.com', subject: 'Test\r\nBcc: evil@x.com', html: '<p>Hi</p>' }))
      .rejects.toThrow('`subject` contains newline')
  })

  it('renders a template and passes html to the provider', async () => {
    const { sendEmail } = useEmail()
    await sendEmail({ to: 'a@b.com', subject: 'Test', template: 'welcome', props: { name: 'Alice' } })

    expect(mockSend.mock.calls[0][0].html).toContain('Welcome Alice')
  })

  it('fails when the template does not exist', async () => {
    const { sendEmail } = useEmail()
    await expect(sendEmail({ to: 'a@b.com', subject: 'Test', template: 'missing' }))
      .rejects.toThrow('Template "missing" not found')
  })
})

describe('useEmail — normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue(successResponse)
  })

  it('normalizes string `to` to array', async () => {
    const { sendEmail } = useEmail()
    await sendEmail({ to: 'user@test.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(mockSend.mock.calls[0][0].to).toEqual(['user@test.com'])
  })

  it('uses default `from` when not in payload', async () => {
    const { sendEmail } = useEmail()
    await sendEmail({ to: 'user@test.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(mockSend.mock.calls[0][0].from).toBe('default@test.com')
  })

  it('overrides default `from` with payload.from', async () => {
    const { sendEmail } = useEmail()
    await sendEmail({ to: 'user@test.com', from: 'custom@test.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(mockSend.mock.calls[0][0].from).toBe('custom@test.com')
  })

  it('normalizes string `cc` to array', async () => {
    const { sendEmail } = useEmail()
    await sendEmail({ to: 'a@test.com', cc: 'cc@test.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(mockSend.mock.calls[0][0].cc).toEqual(['cc@test.com'])
  })
})

describe('useEmail — retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns immediately on first success', async () => {
    mockSend.mockResolvedValue(successResponse)
    const { sendEmail } = useEmail()
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('retries on transient 500 error and succeeds', async () => {
    mockSend
      .mockResolvedValueOnce({ success: false, error: '500 Internal Server Error', provider: 'console', duration: 1 })
      .mockResolvedValueOnce(successResponse)

    const { sendEmail } = useEmail()
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('does not retry on permanent (non-transient) error', async () => {
    mockSend.mockResolvedValue({ success: false, error: 'Invalid recipient address', provider: 'console', duration: 1 })

    const { sendEmail } = useEmail()
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.success).toBe(false)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('exhausts all retries and returns last failure', async () => {
    mockSend.mockResolvedValue({ success: false, error: 'timeout', provider: 'console', duration: 1 })

    const { sendEmail } = useEmail()
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.success).toBe(false)
    // config.retries = 2 → maxAttempts = 3
    expect(mockSend).toHaveBeenCalledTimes(3)
  })
})

describe('useEmail — sendBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends all emails and returns all responses', async () => {
    mockSend.mockResolvedValue(successResponse)
    const { sendBatch } = useEmail()

    const results = await sendBatch([
      { to: 'a@test.com', subject: 'A', html: '<p>A</p>' },
      { to: 'b@test.com', subject: 'B', html: '<p>B</p>' },
      { to: 'c@test.com', subject: 'C', html: '<p>C</p>' },
    ])

    expect(results).toHaveLength(3)
    expect(results.every(r => r.success)).toBe(true)
  })

  it('captures validation errors per-email without failing the whole batch', async () => {
    // email[1] has to='bad' — fails validatePayload before reaching mockSend
    // so only 2 mockSend calls are made (for email[0] and email[2])
    mockSend
      .mockResolvedValueOnce(successResponse)
      .mockResolvedValueOnce(successResponse)

    const { sendBatch } = useEmail()
    const results = await sendBatch([
      { to: 'a@test.com', subject: 'A', html: '<p>A</p>' },
      { to: 'bad-address', subject: 'B', html: '<p>B</p>' },
      { to: 'c@test.com', subject: 'C', html: '<p>C</p>' },
    ])

    expect(results).toHaveLength(3)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(false)
    expect(results[1].error).toMatch(/Invalid email address/)
    expect(results[2].success).toBe(true)
  })
})
