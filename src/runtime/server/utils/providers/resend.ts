import type { EmailProvider, NormalizedPayload, EmailResponse } from '../../../types/index.js'

export class ResendProvider implements EmailProvider {
  name = 'resend'

  async send(_payload: NormalizedPayload): Promise<EmailResponse> {
    throw new Error(
      '[nuxt-email] The Resend provider is not yet implemented. '
      + 'Use provider: \'console\' for development.',
    )
  }
}
