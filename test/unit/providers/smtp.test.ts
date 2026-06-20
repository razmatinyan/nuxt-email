import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NormalizedPayload } from '../../../src/runtime/types/index.js'

const mockSendMail = vi.fn()
const mockVerify = vi.fn()
const mockCreateTransport = vi.fn(() => ({
	sendMail: mockSendMail,
	verify: mockVerify,
}))

vi.mock('nodemailer', () => ({
	createTransport: mockCreateTransport,
}))

const { SmtpProvider } =
	await import('../../../src/runtime/server/utils/providers/smtp.js')

const baseConfig = {
	provider: 'smtp',
	apiKey: '',
	from: 'sender@test.com',
	smtpHost: 'smtp.test.com',
	smtpPort: 587,
	smtpUser: 'user@test.com',
	smtpPass: 'secret',
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

describe('SmtpProviderconstructor', () => {
	it('throws when smtpHost is missing', () => {
		expect(() => new SmtpProvider({ ...baseConfig, smtpHost: '' })).toThrow(
			'[nuxt-email] SmtpProvider requires `smtp.host`.',
		)
	})
})

describe('SmtpProvidersend()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCreateTransport.mockImplementation(() => ({
			sendMail: mockSendMail,
			verify: mockVerify,
		}))
	})

	it('creates transport with correct host, port, secure, and auth', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-1' })

		const provider = new SmtpProvider(baseConfig)
		await provider.send(basePayload)

		expect(mockCreateTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'smtp.test.com',
				port: 587,
				secure: false,
				auth: { user: 'user@test.com', pass: 'secret' },
			}),
		)
	})

	it('sets secure=true when smtpSecure is true', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-2' })

		const provider = new SmtpProvider({ ...baseConfig, smtpSecure: true })
		await provider.send(basePayload)

		expect(mockCreateTransport).toHaveBeenCalledWith(
			expect.objectContaining({ secure: true }),
		)
	})

	it('sets secure=true when port is 465', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-3' })

		const provider = new SmtpProvider({ ...baseConfig, smtpPort: 465 })
		await provider.send(basePayload)

		expect(mockCreateTransport).toHaveBeenCalledWith(
			expect.objectContaining({ secure: true }),
		)
	})

	it('omits auth when no smtpUser', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-4' })

		const provider = new SmtpProvider({ ...baseConfig, smtpUser: '' })
		await provider.send(basePayload)

		expect(mockCreateTransport).toHaveBeenCalledWith(
			expect.objectContaining({ auth: undefined }),
		)
	})

	it('maps from, to, subject, html, text, cc, bcc, replyTo to sendMail', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-5' })

		const provider = new SmtpProvider(baseConfig)
		await provider.send({
			...basePayload,
			text: 'plain',
			cc: ['cc@test.com'],
			bcc: ['bcc@test.com'],
			replyTo: 'reply@test.com',
		})

		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'sender@test.com',
				to: ['recipient@test.com'],
				subject: 'Hello',
				html: '<p>Hello</p>',
				text: 'plain',
				cc: ['cc@test.com'],
				bcc: ['bcc@test.com'],
				replyTo: 'reply@test.com',
			}),
		)
	})

	it('returns messageId from sendMail result', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-result-id' })

		const provider = new SmtpProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(true)
		expect(result.messageId).toBe('smtp-result-id')
		expect(result.provider).toBe('smtp')
	})

	it('maps attachments with filename, content, contentType, cid', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-6' })

		const provider = new SmtpProvider(baseConfig)
		await provider.send({
			...basePayload,
			attachments: [{
				filename: 'file.png',
				content: Buffer.from('imgdata'),
				contentType: 'image/png',
				cid: 'img1',
			}],
		})

		const sentAttachments = mockSendMail.mock.calls[0][0].attachments
		expect(sentAttachments[0].filename).toBe('file.png')
		expect(sentAttachments[0].contentType).toBe('image/png')
		expect(sentAttachments[0].cid).toBe('img1')
	})

	it('returns success:false on sendMail error', async () => {
		mockSendMail.mockRejectedValue(new Error('Connection refused'))

		const provider = new SmtpProvider(baseConfig)
		const result = await provider.send(basePayload)

		expect(result.success).toBe(false)
		expect(result.error).toContain('Connection refused')
		expect(result.provider).toBe('smtp')
	})
})

describe('SmtpProviderverify()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCreateTransport.mockImplementation(() => ({
			sendMail: mockSendMail,
			verify: mockVerify,
		}))
	})

	it('returns true when transporter.verify() resolves', async () => {
		mockVerify.mockResolvedValue(true)

		const provider = new SmtpProvider(baseConfig)
		expect(await provider.verify()).toBe(true)
	})

	it('returns false when transporter.verify() rejects', async () => {
		mockVerify.mockRejectedValue(new Error('Auth failed'))

		const provider = new SmtpProvider(baseConfig)
		expect(await provider.verify()).toBe(false)
	})
})
