import type { EmailPayload } from '../../../src/runtime/types/index.js'
import { createProvider } from '../../../src/runtime/server/utils/providers/index.js'
import { validatePayload, buildNormalizedPayload } from '../../../src/runtime/server/utils/email-utils.js'
import { getEmailTemplate } from '../../../src/runtime/server/utils/templates.js'
import { renderEmailTemplate } from '../../../src/runtime/server/utils/template-renderer.js'
import { buildEmailConfig } from '../utils/email-config.js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ to?: string, name?: string, provider?: string }>(event)

  if (!body?.to) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: to' })
  }

  const provider = body.provider || 'console'

  try {
    const payload: EmailPayload = {
      to: body.to,
      subject: 'Welcome to the playground!',
      template: 'welcome',
      props: {
        name: body.name ?? 'there',
        verifyUrl: 'https://example.com/verify/abc123',
      },
    }

    validatePayload(payload)

    const rendered = await renderEmailTemplate(getEmailTemplate('welcome'), payload.props ?? {})
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
