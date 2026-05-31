import type { EmailProvider, NormalizedPayload, EmailResponse } from '../../../types/index.js'

export class PostmarkProvider implements EmailProvider {
  name = 'postmark'

  async send(_payload: NormalizedPayload): Promise<EmailResponse> {
    throw new Error(
      '[nuxt-email] The Postmark provider is not yet implemented. '
      + 'It will be available in Phase 3. '
      + 'Use provider: \'console\' for development.',
    )
  }
}
