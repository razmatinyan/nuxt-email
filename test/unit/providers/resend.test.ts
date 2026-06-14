import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NormalizedPayload } from '../../../src/runtime/types/index.js'

const mockFetch = Object.assign(vi.fn(), { raw: vi.fn() })
vi.stubGlobal('$fetch', mockFetch)

const { ResendProvider } =
	await import('../../../src/runtime/server/utils/providers/resend.js')

const baseConfig = {
	provider: 'resend',
	apiKey: 'test-resend-key',
	from: 'sender@test.com',
	smtpHost: '',
	smtpPort: 587,
	smtpUser: '',
	smtpPass: '',
	smtpSecure: false,
	retries: 2,
	retryDelay: 1000,
}

const basePayload: NormalizedPayload = {
	from: 'sender@test.com',
	to: ['recipient@test.com'],
	subject: 'Hello',
	html: '<p>Hello</p>',
}

describe('ResendProvider — constructor', () => {
	it('throws when apiKey is missing', () => {
		expect(() => new ResendProvider({ ...baseConfig, apiKey: '' })).toThrow(
			'[nuxt-email] ResendProvider requires `apiKey`.',
		)
	})
})

describe('ResendProvider — send()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('calls the correct Resend API URL with Bearer auth', async () => {
		mockFetch.mockResolvedValue({ id: 'resend-msg-1' })

		const provider = new ResendProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-resend-key',
				}),
			}),
		)
		expect(result.success).toBe(true)
		expect(result.messageId).toBe('resend-msg-1')
		expect(result.provider).toBe('resend')
	})

	it('maps `to`, `cc`, `bcc`, `reply_to` correctly', async () => {
		mockFetch.mockResolvedValue({ id: 'resend-msg-2' })

		const provider = new ResendProvider(baseConfig)
		await provider.send({
			...basePayload,
			to: ['a@test.com', 'b@test.com'],
			cc: ['cc@test.com'],
			bcc: ['bcc@test.com'],
			replyTo: 'reply@test.com',
		})

		const body = mockFetch.mock.calls[0][1].body
		expect(body.to).toEqual(['a@test.com', 'b@test.com'])
		expect(body.cc).toEqual(['cc@test.com'])
		expect(body.bcc).toEqual(['bcc@test.com'])
		expect(body.reply_to).toBe('reply@test.com')
	})

	it('maps tags to [{name, value}] array', async () => {
		mockFetch.mockResolvedValue({ id: 'resend-msg-3' })

		const provider = new ResendProvider(baseConfig)
		await provider.send({ ...basePayload, tags: { campaign: 'welcome', source: 'app' } })

		const body = mockFetch.mock.calls[0][1].body
		expect(body.tags).toEqual(
			expect.arrayContaining([
				{ name: 'campaign', value: 'welcome' },
				{ name: 'source', value: 'app' },
			]),
		)
	})

	it('base64-encodes attachments and maps content_type', async () => {
		mockFetch.mockResolvedValue({ id: 'resend-msg-4' })

		const provider = new ResendProvider(baseConfig)
		await provider.send({
			...basePayload,
			attachments: [{ filename: 'hello.txt', content: 'hello', contentType: 'text/plain' }],
		})

		const body = mockFetch.mock.calls[0][1].body
		expect(body.attachments[0].content).toBe(Buffer.from('hello').toString('base64'))
		expect(body.attachments[0].content_type).toBe('text/plain')
		expect(body.attachments[0].filename).toBe('hello.txt')
	})

	it('maps scheduledAt to scheduled_at ISO string', async () => {
		mockFetch.mockResolvedValue({ id: 'resend-msg-5' })

		const date = new Date('2025-01-01T12:00:00Z')
		const provider = new ResendProvider(baseConfig)
		await provider.send({ ...basePayload, scheduledAt: date })

		const body = mockFetch.mock.calls[0][1].body
		expect(body.scheduled_at).toBe(date.toISOString())
	})

	it('returns success:false with status in error message on API failure', async () => {
		mockFetch.mockRejectedValue({ status: 429, data: { message: 'Too Many Requests' } })

		const provider = new ResendProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('429')
		expect(result.provider).toBe('resend')
	})

	it('returns success:false with status 500 in error for transient retry detection', async () => {
		mockFetch.mockRejectedValue({ status: 500, data: { message: 'Server Error' } })

		const provider = new ResendProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('500')
	})
})

describe('ResendProvider — verify()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns true on successful domains fetch', async () => {
		mockFetch.mockResolvedValue({ data: [] })

		const provider = new ResendProvider(baseConfig)
		expect(await provider.verify()).toBe(true)
	})

	it('returns false when fetch throws', async () => {
		mockFetch.mockRejectedValue(new Error('Unauthorized'))

		const provider = new ResendProvider(baseConfig)
		expect(await provider.verify()).toBe(false)
	})
})
