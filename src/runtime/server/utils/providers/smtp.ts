import type {
	EmailProvider,
	EmailRuntimeConfig,
	NormalizedPayload,
	EmailResponse,
} from '../../../types/index.js'

export class SmtpProvider implements EmailProvider {
	name = 'smtp'
	private readonly config: EmailRuntimeConfig

	constructor(config: EmailRuntimeConfig) {
		if (!config.smtpHost) {
			throw new Error('[nuxt-email] SmtpProvider requires `smtp.host`.')
		}
		this.config = config
	}

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()
		try {
			let nodemailer: typeof import('nodemailer')
			try {
				nodemailer = await import('nodemailer')
			} catch {
				return {
					success: false,
					error: '[nuxt-email] SMTP requires the optional peer dep `nodemailer`. Run `npm i nodemailer`.',
					provider: this.name,
					duration: Date.now() - start,
				}
			}

			const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } =
				this.config

			const transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort,
				secure: smtpSecure || smtpPort === 465,
				auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
			})

			const attachments = payload.attachments?.map(a => ({
				filename: a.filename,
				content: a.content,
				contentType: a.contentType,
				cid: a.cid,
			}))

			const info = await transporter.sendMail({
				from: payload.from,
				to: payload.to,
				cc: payload.cc,
				bcc: payload.bcc,
				replyTo: payload.replyTo,
				subject: payload.subject,
				html: payload.html,
				text: payload.text,
				headers: payload.headers,
				attachments,
			})

			return {
				success: true,
				messageId: info.messageId,
				provider: this.name,
				duration: Date.now() - start,
			}
		} catch (error) {
			return {
				success: false,
				error: `[nuxt-email] SMTP error: ${error instanceof Error ? error.message : String(error)}`,
				provider: this.name,
				duration: Date.now() - start,
			}
		}
	}

	async verify(): Promise<boolean> {
		try {
			let nodemailer: typeof import('nodemailer')
			try {
				nodemailer = await import('nodemailer')
			} catch {
				return false
			}

			const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } =
				this.config

			const transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort,
				secure: smtpSecure || smtpPort === 465,
				auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
			})

			await transporter.verify()
			return true
		} catch {
			return false
		}
	}
}
