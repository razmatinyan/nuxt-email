import { createProvider } from '../../../src/runtime/server/utils/providers/index.js'
import { buildEmailConfig } from '../utils/email-config.js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ provider?: string }>(event)
  const provider = body?.provider || 'console'

  try {
    const cfg = buildEmailConfig(provider)
    const instance = createProvider(provider, cfg)
    const ok = instance.verify ? await instance.verify() : true
    return { ok }
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
})
