import { useRuntimeConfig } from 'nitropack/runtime'
import type {
	EmailPayload,
	EmailResponse,
	EmailRuntimeConfig,
} from '../../types/index.js'
import { createProvider } from '../utils/providers/index.js'
import {
	validatePayload,
	buildNormalizedPayload,
	isTransientError,
	sleep,
} from '../utils/email-utils.js'
import { getEmailTemplate } from '../utils/templates.js'
import { renderEmailTemplate } from '../utils/template-renderer.js'
import { recordSend } from '../utils/dev-log.js'

export function useEmail() {
	const config = useRuntimeConfig()._email as EmailRuntimeConfig

	async function sendEmail(payload: EmailPayload): Promise<EmailResponse> {
		if (import.meta.prerender) {
			return { success: true, messageId: 'skipped-prerender', provider: config.provider, duration: 0 }
		}

		validatePayload(payload)

		if (payload.template) {
			const rendered = await renderEmailTemplate(
				getEmailTemplate(payload.template),
				payload.props ?? {},
			)
			payload.html = rendered.html
			if (!payload.text) payload.text = rendered.text
		}

		const html = payload.html ?? ''
		const normalized = buildNormalizedPayload(payload, html, config)

		const provider = createProvider(config.provider, config)
		const maxAttempts = (config.retries ?? 2) + 1
		let lastResponse: EmailResponse | null = null

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			lastResponse = await provider.send(normalized)

			if (lastResponse.success) {
				break
			}

			const shouldRetry =
				attempt < maxAttempts && isTransientError(lastResponse.error)
			if (shouldRetry) {
				await sleep((config.retryDelay ?? 1000) * attempt)
			} else {
				break
			}
		}

		if (import.meta.dev) {
			recordSend({
				id: lastResponse!.messageId ?? `send-${Date.now()}`,
				template: payload.template,
				to: normalized.to,
				subject: normalized.subject,
				success: lastResponse!.success,
				messageId: lastResponse!.messageId,
				error: lastResponse!.error,
				provider: lastResponse!.provider,
				duration: lastResponse!.duration,
				timestamp: Date.now(),
			})
		}

		return lastResponse!
	}

	async function sendBatch(
		payloads: EmailPayload[],
		options?: { concurrency?: number },
	): Promise<EmailResponse[]> {
		if (payloads.length > 500) console.warn('[nuxt-email] sendBatch called with more than 500 emails; consider chunking or a queue.')

		const concurrency = options?.concurrency ?? 5
		const results: EmailResponse[] = []

		for (let i = 0; i < payloads.length; i += concurrency) {
			const chunk = payloads.slice(i, i + concurrency)
			const settled = await Promise.allSettled(
				chunk.map(p => sendEmail(p)),
			)

			for (const result of settled) {
				if (result.status === 'fulfilled') {
					results.push(result.value)
				} else {
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
