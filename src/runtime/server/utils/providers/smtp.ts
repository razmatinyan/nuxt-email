import type { EmailProvider, NormalizedPayload, EmailResponse } from '../../../types/index.js'

export class SmtpProvider implements EmailProvider {
  name = 'smtp'

  async send(_payload: NormalizedPayload): Promise<EmailResponse> {
    throw new Error(
      '[nuxt-email] The SMTP provider is not yet implemented. '
      + 'It requires `nodemailer` as a peer dependency and will be available in Phase 3. '
      + 'Use provider: \'console\' for development.',
    )
  }
}
