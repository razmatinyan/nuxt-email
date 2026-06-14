import type {
	EmailProvider,
	EmailRuntimeConfig,
	NormalizedPayload,
	EmailResponse,
} from '../../../types/index.js'
import { toBase64, fetchErrorMessage, omitUndefined } from './shared.js'

export class PostmarkProvider implements EmailProvider {
	name = 'postmark'
	private readonly apiKey: string

	constructor(config: EmailRuntimeConfig) {
		if (!config.apiKey) {
			throw new Error('[nuxt-email] PostmarkProvider requires `apiKey`.')
		}
		this.apiKey = config.apiKey
	}

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()
		try {
			const headers = payload.headers
				? Object.entries(payload.headers).map(([Name, Value]) => ({ Name, Value }))
				: undefined

			const attachments = payload.attachments?.map(a => omitUndefined({
				Name: a.filename,
				Content: toBase64(a.content),
				ContentType: a.contentType ?? 'application/octet-stream',
				ContentID: a.cid,
			}))

			const body = omitUndefined({
				From: payload.from,
				To: payload.to.join(','),
				Cc: payload.cc?.join(','),
				Bcc: payload.bcc?.join(','),
				ReplyTo: payload.replyTo,
				Subject: payload.subject,
				HtmlBody: payload.html,
				TextBody: payload.text,
				Headers: headers,
				Attachments: attachments,
				Metadata: payload.tags,
				MessageStream: 'outbound',
			})

			const res = await $fetch<{ MessageID: string; ErrorCode: number; Message: string }>(
				'https://api.postmarkapp.com/email',
				{
					method: 'POST',
					headers: {
						'X-Postmark-Server-Token': this.apiKey,
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body,
				},
			)

			if (res.ErrorCode !== 0) {
				return {
					success: false,
					error: `[nuxt-email] Postmark error: ${res.Message}`,
					provider: this.name,
					duration: Date.now() - start,
				}
			}

			return {
				success: true,
				messageId: res.MessageID,
				provider: this.name,
				duration: Date.now() - start,
			}
		} catch (error) {
			const data = (error as Record<string, unknown>)?.data as
				| { ErrorCode?: number; Message?: string }
				| undefined
			if (data?.ErrorCode !== undefined && data.ErrorCode !== 0) {
				return {
					success: false,
					error: `[nuxt-email] Postmark error: ${data.Message ?? 'Unknown error'}`,
					provider: this.name,
					duration: Date.now() - start,
				}
			}
			return {
				success: false,
				error: fetchErrorMessage('Postmark', error),
				provider: this.name,
				duration: Date.now() - start,
			}
		}
	}

	async verify(): Promise<boolean> {
		try {
			await $fetch('https://api.postmarkapp.com/server', {
				headers: {
					'X-Postmark-Server-Token': this.apiKey,
					Accept: 'application/json',
				},
			})
			return true
		} catch {
			return false
		}
	}
}
