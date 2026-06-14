import type {
	EmailProvider,
	NormalizedPayload,
	EmailResponse,
} from '../../../types/index.js'

export class ConsoleProvider implements EmailProvider {
	name = 'console'

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()
		const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

		console.log('\n' + '─'.repeat(60))
		console.log('[nuxt-email] ConsoleProvider — Email would be sent')
		console.log('─'.repeat(60))
		console.log(`  From:    ${payload.from}`)
		console.log(`  To:      ${payload.to.join(', ')}`)
		if (payload.cc?.length)
			console.log(`  CC:      ${payload.cc.join(', ')}`)
		if (payload.bcc?.length)
			console.log(`  BCC:     ${payload.bcc.join(', ')}`)
		console.log(`  Subject: ${payload.subject}`)
		if (payload.replyTo) console.log(`  ReplyTo: ${payload.replyTo}`)
		console.log(
			`  HTML:    ${payload.html.slice(0, 120)}${payload.html.length > 120 ? '...' : ''}`,
		)
		if (payload.text)
			console.log(
				`  Text:    ${payload.text.slice(0, 120)}${payload.text.length > 120 ? '...' : ''}`,
			)
		if (payload.attachments?.length) {
			console.log(
				`  Attachments: ${payload.attachments.map(a => a.filename).join(', ')}`,
			)
		}
		if (payload.tags && Object.keys(payload.tags).length > 0) {
			console.log(`  Tags:    ${JSON.stringify(payload.tags)}`)
		}
		console.log(`  ID:      ${messageId}`)
		console.log('─'.repeat(60) + '\n')

		return {
			success: true,
			messageId,
			provider: this.name,
			duration: Date.now() - start,
		}
	}

	async verify(): Promise<boolean> {
		return true
	}
}
