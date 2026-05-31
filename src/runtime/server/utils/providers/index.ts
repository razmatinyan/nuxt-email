import type { EmailProvider } from '../../../types/index.js'
import { ConsoleProvider } from './console.js'
import { ResendProvider } from './resend.js'
import { SendGridProvider } from './sendgrid.js'
import { PostmarkProvider } from './postmark.js'
import { SmtpProvider } from './smtp.js'

type ProviderName = 'console' | 'resend' | 'sendgrid' | 'postmark' | 'smtp'

const VALID_PROVIDERS: ProviderName[] = ['console', 'resend', 'sendgrid', 'postmark', 'smtp']

const factories: Record<ProviderName, () => EmailProvider> = {
  console: () => new ConsoleProvider(),
  resend: () => new ResendProvider(),
  sendgrid: () => new SendGridProvider(),
  postmark: () => new PostmarkProvider(),
  smtp: () => new SmtpProvider(),
}

export function createProvider(name: string): EmailProvider {
  const factory = factories[name as ProviderName]
  if (!factory) {
    throw new Error(
      `[nuxt-email] Unknown provider "${name}". `
      + `Valid providers: ${VALID_PROVIDERS.join(', ')}`,
    )
  }
  return factory()
}

export { ConsoleProvider } from './console.js'
export { ResendProvider } from './resend.js'
export { SendGridProvider } from './sendgrid.js'
export { PostmarkProvider } from './postmark.js'
export { SmtpProvider } from './smtp.js'
