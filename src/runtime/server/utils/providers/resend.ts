import type {
	EmailProvider,
	EmailRuntimeConfig,
	NormalizedPayload,
	EmailResponse,
} from '../../../types/index.js'
import { toBase64, fetchErrorMessage, omitUndefined } from './shared.js'

export class ResendProvider implements EmailProvider {
	name = 'resend'
	private readonly apiKey: string

	constructor(config: EmailRuntimeConfig) {
		if (!config.apiKey) {
			throw new Error('[nuxt-email] ResendProvider requires `apiKey`.')
		}
		this.apiKey = config.apiKey
	}

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()
		try {
			const attachments = payload.attachments?.map(a =>
				omitUndefined({
					filename: a.filename,
					content: toBase64(a.content),
					content_type: a.contentType,
					content_id: a.cid,
				}),
			)

			const tags = payload.tags
				? Object.entries(payload.tags).map(([name, value]) => ({
						name,
						value,
					}))
				: undefined

			const body = omitUndefined({
				from: payload.from,
				to: payload.to,
				cc: payload.cc,
				bcc: payload.bcc,
				reply_to: payload.replyTo,
				subject: payload.subject,
				html: payload.html,
				text: payload.text,
				headers: payload.headers,
				attachments,
				tags,
				scheduled_at: payload.scheduledAt?.toISOString(),
			})

			const res = await $fetch<{ id: string }>(
				'https://api.resend.com/emails',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${this.apiKey}` },
					body,
				},
			)

			return {
				success: true,
				messageId: res.id,
				provider: this.name,
				duration: Date.now() - start,
			}
		} catch (error) {
			return {
				success: false,
				error: fetchErrorMessage('Resend', error),
				provider: this.name,
				duration: Date.now() - start,
			}
		}
	}

	async verify(): Promise<boolean> {
		try {
			await $fetch('https://api.resend.com/domains', {
				headers: { Authorization: `Bearer ${this.apiKey}` },
			})
			return true
		} catch {
			return false
		}
	}
}
