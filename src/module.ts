import {
  defineNuxtModule,
  createResolver,
  addServerImports,
  addTypeTemplate,
  useLogger,
} from '@nuxt/kit'
import type { EmailModuleOptions } from './runtime/types/index.js'

const MODULE_NAME = 'nuxt-email'
const CONFIG_KEY = 'email'
const VALID_PROVIDERS = ['console', 'resend', 'sendgrid', 'postmark', 'smtp']

export default defineNuxtModule<EmailModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: CONFIG_KEY,
    compatibility: {
      nuxt: '>=4.0.0',
    },
  },
  defaults: {
    provider: 'console',
    from: undefined,
    templateDir: 'server/emails',
    preview: true,
    retries: 2,
    retryDelay: 1000,
  },
  setup(options, nuxt) {
    const logger = useLogger(MODULE_NAME)
    const { resolve } = createResolver(import.meta.url)

    // ── Validate options ──────────────────────────────────────────────
    if (!VALID_PROVIDERS.includes(options.provider)) {
      throw new Error(
        `[nuxt-email] Unknown provider "${options.provider}". `
        + `Valid options: ${VALID_PROVIDERS.join(', ')}`,
      )
    }

    if (options.provider !== 'console' && !options.from) {
      logger.warn(
        '`email.from` is not set. Emails will fail unless `from` is passed per-call. '
        + 'Set `email.from` in nuxt.config.ts.',
      )
    }

    // ── Inject private runtime config (never sent to client) ──────────
    ;(nuxt.options.runtimeConfig as Record<string, unknown>)._email = {
      provider: options.provider,
      apiKey: options.apiKey ?? '',
      from: options.from ?? '',
      smtpHost: options.smtp?.host ?? '',
      smtpPort: options.smtp?.port ?? 587,
      smtpUser: options.smtp?.user ?? '',
      smtpPass: options.smtp?.pass ?? '',
      retries: options.retries!,
      retryDelay: options.retryDelay!,
    }

    // ── Register server-only auto-imports ─────────────────────────────
    addServerImports([
      {
        name: 'useEmail',
        from: resolve('./runtime/server/composables/useEmail'),
      },
    ])

    // ── TypeScript augmentation for runtimeConfig._email ─────────────
    addTypeTemplate({
      filename: 'types/nuxt-email.d.ts',
      getContents: () => `
import type { EmailRuntimeConfig } from '${resolve('./runtime/types/index.js')}'

declare module 'nitropack' {
  interface NitroRuntimeConfig {
    _email: EmailRuntimeConfig
  }
}

export {}
`,
    })

    logger.success(`nuxt-email ready (provider: ${options.provider})`)
  },
})

// Re-export public types for module consumers
export type { EmailModuleOptions } from './runtime/types/index.js'
export type {
  EmailPayload,
  EmailResponse,
  EmailProvider,
  NormalizedPayload,
  EmailAttachment,
} from './runtime/types/index.js'
