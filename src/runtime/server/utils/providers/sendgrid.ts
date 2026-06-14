import type {
	EmailProvider,
	EmailRuntimeConfig,
	NormalizedPayload,
	EmailResponse,
} from '../../../types/index.js'
import { toBase64, parseAddress, fetchErrorMessage, omitUndefined } from './shared.js'

export class SendGridProvider implements EmailProvider {
	name = 'sendgrid'
	private readonly apiKey: string

	constructor(config: EmailRuntimeConfig) {
		if (!config.apiKey) {
			throw new Error('[nuxt-email] SendGridProvider requires `apiKey`.')
		}
		this.apiKey = config.apiKey
	}

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()
		try {
			const personalization: Record<string, unknown> = {
				to: payload.to.map(e => ({ email: e })),
			}
			if (payload.cc?.length) personalization.cc = payload.cc.map(e => ({ email: e }))
			if (payload.bcc?.length) personalization.bcc = payload.bcc.map(e => ({ email: e }))
			if (payload.scheduledAt) {
				personalization.send_at = Math.floor(payload.scheduledAt.getTime() / 1000)
			}

			const content: { type: string; value: string }[] = []
			if (payload.text) content.push({ type: 'text/plain', value: payload.text })
			content.push({ type: 'text/html', value: payload.html })

			const attachments = payload.attachments?.map(a => omitUndefined({
				filename: a.filename,
				content: toBase64(a.content),
				type: a.contentType,
				disposition: a.disposition,
				content_id: a.cid,
			}))

			const body = omitUndefined({
				personalizations: [personalization],
				from: parseAddress(payload.from),
				reply_to: payload.replyTo ? parseAddress(payload.replyTo) : undefined,
				subject: payload.subject,
				content,
				attachments,
				headers: payload.headers,
				custom_args: payload.tags,
			})

			const res = await $fetch.raw('https://api.sendgrid.com/v3/mail/send', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body,
			})

			if (res.status !== 202) {
				return {
					success: false,
					error: `[nuxt-email] SendGrid API error (${res.status}): unexpected status`,
					provider: this.name,
					duration: Date.now() - start,
				}
			}

			const messageId = res.headers.get('x-message-id') ?? undefined

			return {
				success: true,
				messageId,
				provider: this.name,
				duration: Date.now() - start,
			}
		} catch (error) {
			return {
				success: false,
				error: fetchErrorMessage('SendGrid', error),
				provider: this.name,
				duration: Date.now() - start,
			}
		}
	}

	async verify(): Promise<boolean> {
		try {
			await $fetch('https://api.sendgrid.com/v3/scopes', {
				headers: { Authorization: `Bearer ${this.apiKey}` },
			})
			return true
		} catch {
			return false
		}
	}
}
