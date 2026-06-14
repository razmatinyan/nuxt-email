import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NormalizedPayload } from '../../../src/runtime/types/index.js'

const mockFetch = Object.assign(vi.fn(), { raw: vi.fn() })
vi.stubGlobal('$fetch', mockFetch)

const { SendGridProvider } =
	await import('../../../src/runtime/server/utils/providers/sendgrid.js')

const baseConfig = {
	provider: 'sendgrid',
	apiKey: 'test-sg-key',
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
	from: 'Sender <sender@test.com>',
	to: ['recipient@test.com'],
	subject: 'Hello',
	html: '<p>Hello</p>',
}

describe('SendGridProvider — constructor', () => {
	it('throws when apiKey is missing', () => {
		expect(() => new SendGridProvider({ ...baseConfig, apiKey: '' })).toThrow(
			'[nuxt-email] SendGridProvider requires `apiKey`.',
		)
	})
})

describe('SendGridProvider — send()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('calls $fetch.raw with correct URL and Bearer auth', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => 'sg-msg-id-1' },
		})

		const provider = new SendGridProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(mockFetch.raw).toHaveBeenCalledWith(
			'https://api.sendgrid.com/v3/mail/send',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-sg-key',
				}),
			}),
		)
		expect(result.success).toBe(true)
		expect(result.messageId).toBe('sg-msg-id-1')
		expect(result.provider).toBe('sendgrid')
	})

	it('extracts messageId from x-message-id header', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: (name: string) => name === 'x-message-id' ? 'header-msg-id' : null },
		})

		const provider = new SendGridProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.messageId).toBe('header-msg-id')
	})

	it('maps from as parseAddress object', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({ ...basePayload, from: 'Alice <alice@test.com>' })

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.from).toEqual({ name: 'Alice', email: 'alice@test.com' })
	})

	it('maps to as personalizations array of {email} objects', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({ ...basePayload, to: ['a@test.com', 'b@test.com'] })

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.personalizations[0].to).toEqual([
			{ email: 'a@test.com' },
			{ email: 'b@test.com' },
		])
	})

	it('maps cc and bcc in personalizations', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({
			...basePayload,
			cc: ['cc@test.com'],
			bcc: ['bcc@test.com'],
		})

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.personalizations[0].cc).toEqual([{ email: 'cc@test.com' }])
		expect(body.personalizations[0].bcc).toEqual([{ email: 'bcc@test.com' }])
	})

	it('maps content with text/plain first when text provided', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({ ...basePayload, text: 'plain text' })

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.content[0]).toEqual({ type: 'text/plain', value: 'plain text' })
		expect(body.content[1]).toEqual({ type: 'text/html', value: '<p>Hello</p>' })
	})

	it('base64-encodes attachments', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({
			...basePayload,
			attachments: [{ filename: 'f.txt', content: 'data', contentType: 'text/plain' }],
		})

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.attachments[0].content).toBe(Buffer.from('data').toString('base64'))
		expect(body.attachments[0].type).toBe('text/plain')
	})

	it('maps tags to custom_args', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const provider = new SendGridProvider(baseConfig)
		await provider.send({ ...basePayload, tags: { campaign: 'promo' } })

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.custom_args).toEqual({ campaign: 'promo' })
	})

	it('maps scheduledAt to send_at unix timestamp', async () => {
		mockFetch.raw.mockResolvedValue({
			status: 202,
			headers: { get: () => null },
		})

		const date = new Date('2025-06-01T00:00:00Z')
		const provider = new SendGridProvider(baseConfig)
		await provider.send({ ...basePayload, scheduledAt: date })

		const body = mockFetch.raw.mock.calls[0][1].body
		expect(body.personalizations[0].send_at).toBe(Math.floor(date.getTime() / 1000))
	})

	it('returns success:false with status in error on API failure', async () => {
		mockFetch.raw.mockRejectedValue({ status: 429, data: { message: 'Rate limit' } })

		const provider = new SendGridProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('429')
		expect(result.provider).toBe('sendgrid')
	})

	it('returns success:false with 500 in error for transient detection', async () => {
		mockFetch.raw.mockRejectedValue({ status: 500, data: { message: 'Server Error' } })

		const provider = new SendGridProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('500')
	})
})

describe('SendGridProvider — verify()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns true on successful scopes fetch', async () => {
		mockFetch.mockResolvedValue({ scopes: [] })

		const provider = new SendGridProvider(baseConfig)
		expect(await provider.verify()).toBe(true)
	})

	it('returns false when fetch throws', async () => {
		mockFetch.mockRejectedValue(new Error('Unauthorized'))

		const provider = new SendGridProvider(baseConfig)
		expect(await provider.verify()).toBe(false)
	})
})
