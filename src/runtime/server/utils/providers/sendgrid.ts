import type { EmailProvider, NormalizedPayload, EmailResponse } from '../../../types/index.js'

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid'

  async send(_payload: NormalizedPayload): Promise<EmailResponse> {
    throw new Error(
      '[nuxt-email] The SendGrid provider is not yet implemented. '
      + 'Use provider: \'console\' for development.',
    )
  }
}
