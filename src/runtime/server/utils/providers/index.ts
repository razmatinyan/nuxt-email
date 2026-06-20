import type { EmailProvider, EmailRuntimeConfig } from '../../../types/index.js'
import { ConsoleProvider } from './console.js'
import { ResendProvider } from './resend.js'
import { SendGridProvider } from './sendgrid.js'
import { PostmarkProvider } from './postmark.js'
import { SmtpProvider } from './smtp.js'

type ProviderName = 'console' | 'resend' | 'sendgrid' | 'postmark' | 'smtp'

export const VALID_PROVIDERS: ProviderName[] = [
	'console',
	'resend',
	'sendgrid',
	'postmark',
	'smtp',
]

const factories: Record<ProviderName, (config: EmailRuntimeConfig) => EmailProvider> = {
	console: () => new ConsoleProvider(),
	resend: (config) => new ResendProvider(config),
	sendgrid: (config) => new SendGridProvider(config),
	postmark: (config) => new PostmarkProvider(config),
	smtp: (config) => new SmtpProvider(config),
}

export function createProvider(name: string, config: EmailRuntimeConfig): EmailProvider {
	const factory = factories[name as ProviderName]
	if (!factory) {
		throw new Error(
			`[nuxt-email] Unknown provider "${name}". ` +
				`Valid providers: ${VALID_PROVIDERS.join(', ')}`,
		)
	}
	return factory(config)
}

export { ConsoleProvider } from './console.js'
export { ResendProvider } from './resend.js'
export { SendGridProvider } from './sendgrid.js'
export { PostmarkProvider } from './postmark.js'
export { SmtpProvider } from './smtp.js'
