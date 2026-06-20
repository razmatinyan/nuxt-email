import type { EmailPayload } from '../../../src/runtime/types/index.js'
import { createProvider } from '../../../src/runtime/server/utils/providers/index.js'
import { validatePayload, buildNormalizedPayload } from '../../../src/runtime/server/utils/email-utils.js'
import { getEmailTemplate } from '../../../src/runtime/server/utils/templates.js'
import { renderEmailTemplate } from '../../../src/runtime/server/utils/template-renderer.js'
import { buildEmailConfig } from '../utils/email-config.js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ to?: string, name?: string, provider?: string, template?: string }>(event)

  if (!body?.to) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: to' })
  }

  const provider = body.provider || 'console'
  const template = body.template || 'welcome'

  const templateProps: Record<string, unknown> = {
    welcome: { name: body.name ?? 'there', verifyUrl: 'https://example.com/verify/abc123', appName: 'nuxt-email playground' },
    'password-reset': { name: body.name ?? 'there', resetUrl: 'https://example.com/reset/abc123', expiresIn: '30 minutes', appName: 'nuxt-email playground' },
    'order-confirmation': {
      name: body.name ?? 'there',
      orderNumber: 'ORD-PREVIEW-001',
      items: [{ name: 'Nuxt Pro License', quantity: 1, price: 149 }, { name: 'DevTools Extension', quantity: 2, price: 29 }],
      subtotal: 207, shipping: 0, total: 207,
      shippingAddress: '123 Main St, San Francisco, CA 94102',
      trackingUrl: 'https://example.com/track/ORD-PREVIEW-001',
      appName: 'nuxt-email playground',
    },
  }

  const subjectMap: Record<string, string> = {
    welcome: 'Welcome to the playground!',
    'password-reset': 'Reset your password',
    'order-confirmation': 'Your order is confirmed',
  }

  try {
    const payload: EmailPayload = {
      to: body.to,
      subject: subjectMap[template] ?? `Test: ${template}`,
      template,
      props: templateProps[template] ?? { name: body.name ?? 'there' },
    }

    validatePayload(payload)

    const rendered = await renderEmailTemplate(getEmailTemplate(template), payload.props ?? {})
    payload.html = rendered.html
    if (!payload.text) payload.text = rendered.text

    const cfg = buildEmailConfig(provider)
    const normalized = buildNormalizedPayload(payload, payload.html ?? '', cfg)

    return await createProvider(provider, cfg).send(normalized)
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message, provider, duration: 0 }
  }
})
