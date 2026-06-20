import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { useEmail } from '../composables/useEmail.js'

export default defineEventHandler(async (event) => {
	const name = getRouterParam(event, 'template') ?? ''
	const body = await readBody<{ to?: string; props?: Record<string, unknown>; provider?: string }>(event)

	if (!body?.to) {
		throw createError({ statusCode: 400, message: '[nuxt-email] `to` is required for test send.' })
	}

	const { sendEmail } = useEmail()

	try {
		const response = await sendEmail({
			to: body.to,
			subject: `[Preview] ${name}`,
			template: name,
			props: body.props,
		}, { provider: body.provider })
		return response
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err)
		return { success: false, error: message, provider: 'unknown', duration: 0 }
	}
})
