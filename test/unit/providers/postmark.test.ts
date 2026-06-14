import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NormalizedPayload } from '../../../src/runtime/types/index.js'

const mockFetch = Object.assign(vi.fn(), { raw: vi.fn() })
vi.stubGlobal('$fetch', mockFetch)

const { PostmarkProvider } =
	await import('../../../src/runtime/server/utils/providers/postmark.js')

const baseConfig = {
	provider: 'postmark',
	apiKey: 'test-postmark-token',
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

describe('PostmarkProvider — constructor', () => {
	it('throws when apiKey is missing', () => {
		expect(() => new PostmarkProvider({ ...baseConfig, apiKey: '' })).toThrow(
			'[nuxt-email] PostmarkProvider requires `apiKey`.',
		)
	})
})

describe('PostmarkProvider — send()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('calls the correct Postmark API URL with server token header', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-1', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.postmarkapp.com/email',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'X-Postmark-Server-Token': 'test-postmark-token',
					Accept: 'application/json',
				}),
			}),
		)
		expect(result.success).toBe(true)
		expect(result.messageId).toBe('pm-msg-1')
		expect(result.provider).toBe('postmark')
	})

	it('comma-joins multiple To recipients', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-2', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send({ ...basePayload, to: ['a@test.com', 'b@test.com'] })

		const body = mockFetch.mock.calls[0][1].body
		expect(body.To).toBe('a@test.com,b@test.com')
	})

	it('comma-joins Cc and Bcc', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-3', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send({
			...basePayload,
			cc: ['cc1@test.com', 'cc2@test.com'],
			bcc: ['bcc@test.com'],
		})

		const body = mockFetch.mock.calls[0][1].body
		expect(body.Cc).toBe('cc1@test.com,cc2@test.com')
		expect(body.Bcc).toBe('bcc@test.com')
	})

	it('maps headers to [{Name, Value}] array', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-4', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send({ ...basePayload, headers: { 'X-Custom': 'value' } })

		const body = mockFetch.mock.calls[0][1].body
		expect(body.Headers).toEqual([{ Name: 'X-Custom', Value: 'value' }])
	})

	it('maps tags as Metadata', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-5', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send({ ...basePayload, tags: { env: 'prod' } })

		const body = mockFetch.mock.calls[0][1].body
		expect(body.Metadata).toEqual({ env: 'prod' })
	})

	it('sets MessageStream to outbound', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-6', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send(basePayload)

		const body = mockFetch.mock.calls[0][1].body
		expect(body.MessageStream).toBe('outbound')
	})

	it('base64-encodes attachments', async () => {
		mockFetch.mockResolvedValue({ MessageID: 'pm-msg-7', ErrorCode: 0, Message: 'OK' })

		const provider = new PostmarkProvider(baseConfig)
		await provider.send({
			...basePayload,
			attachments: [{ filename: 'doc.txt', content: 'content', contentType: 'text/plain' }],
		})

		const body = mockFetch.mock.calls[0][1].body
		expect(body.Attachments[0].Content).toBe(Buffer.from('content').toString('base64'))
		expect(body.Attachments[0].ContentType).toBe('text/plain')
		expect(body.Attachments[0].Name).toBe('doc.txt')
	})

	it('returns success:false when ErrorCode !== 0', async () => {
		mockFetch.mockResolvedValue({
			MessageID: '',
			ErrorCode: 300,
			Message: 'Invalid email address',
		})

		const provider = new PostmarkProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('Invalid email address')
	})

	it('returns success:false with status in error message on HTTP failure', async () => {
		mockFetch.mockRejectedValue({ status: 429, data: { message: 'Rate limit exceeded' } })

		const provider = new PostmarkProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('429')
		expect(result.provider).toBe('postmark')
	})

	it('handles 422 errors with ErrorCode in data', async () => {
		mockFetch.mockRejectedValue({
			status: 422,
			data: { ErrorCode: 300, Message: 'Inactive recipient' },
		})

		const provider = new PostmarkProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('Inactive recipient')
	})
})

describe('PostmarkProvider — verify()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns true on successful server fetch', async () => {
		mockFetch.mockResolvedValue({ Name: 'My Server' })

		const provider = new PostmarkProvider(baseConfig)
		expect(await provider.verify()).toBe(true)
	})

	it('returns false when fetch throws', async () => {
		mockFetch.mockRejectedValue(new Error('Unauthorized'))

		const provider = new PostmarkProvider(baseConfig)
		expect(await provider.verify()).toBe(false)
	})
})
