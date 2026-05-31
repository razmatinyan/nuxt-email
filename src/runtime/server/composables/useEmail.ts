import { useRuntimeConfig } from 'nitropack/runtime'
import type { EmailPayload, EmailResponse, EmailRuntimeConfig } from '../../types/index.js'
import { createProvider } from '../utils/providers/index.js'
import {
  validatePayload,
  buildNormalizedPayload,
  isTransientError,
  sleep,
} from '../utils/email-utils.js'

export function useEmail() {
  const config = useRuntimeConfig()._email as EmailRuntimeConfig

  async function sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    validatePayload(payload)

    if (payload.template) {
      throw new Error(
        '[nuxt-email] Template rendering is not yet implemented. '
        + 'Pass `html` or `text` directly.',
      )
    }

    const html = payload.html ?? ''
    const normalized = buildNormalizedPayload(payload, html, config)

    const provider = createProvider(config.provider)
    const maxAttempts = (config.retries ?? 2) + 1
    let lastResponse: EmailResponse | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResponse = await provider.send(normalized)

      if (lastResponse.success) {
        return lastResponse
      }

      const shouldRetry = attempt < maxAttempts && isTransientError(lastResponse.error)
      if (shouldRetry) {
        await sleep((config.retryDelay ?? 1000) * attempt)
      }
      else {
        break
      }
    }

    return lastResponse!
  }

  async function sendBatch(
    payloads: EmailPayload[],
    options?: { concurrency?: number },
  ): Promise<EmailResponse[]> {
    const concurrency = options?.concurrency ?? 5
    const results: EmailResponse[] = []

    for (let i = 0; i < payloads.length; i += concurrency) {
      const chunk = payloads.slice(i, i + concurrency)
      const settled = await Promise.allSettled(chunk.map(p => sendEmail(p)))

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        }
        else {
          results.push({
            success: false,
            error: result.reason?.message ?? 'Unknown error',
            provider: config.provider ?? 'unknown',
            duration: 0,
          })
        }
      }
    }

    return results
  }

  return { sendEmail, sendBatch }
}
