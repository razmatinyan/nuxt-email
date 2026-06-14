import { existsSync, readdirSync } from 'node:fs'
import { join, relative, resolve as resolvePath } from 'node:path'
import {
	defineNuxtModule,
	createResolver,
	addServerImports,
	addServerHandler,
	addTemplate,
	addTypeTemplate,
	useLogger,
} from '@nuxt/kit'
import vuePlugin from 'unplugin-vue/rollup'
import type { EmailModuleOptions } from './runtime/types/index.js'

const MODULE_NAME = 'nuxt-email'
const CONFIG_KEY = 'email'
const VALID_PROVIDERS = ['console', 'resend', 'sendgrid', 'postmark', 'smtp']

interface ScannedTemplate {
	name: string
	absPath: string
}

function scanTemplates(dir: string): ScannedTemplate[] {
	if (!existsSync(dir)) return []

	const found: ScannedTemplate[] = []

	const walk = (current: string) => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (entry.isFile() && entry.name.endsWith('.vue')) {
				const name = relative(dir, full)
					.replace(/\\/g, '/')
					.replace(/\.vue$/, '')
				found.push({ name, absPath: full })
			}
		}
	}

	walk(dir)
	return found
}

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

		if (!VALID_PROVIDERS.includes(options.provider)) {
			throw new Error(
				`[nuxt-email] Unknown provider "${options.provider}". ` +
					`Valid options: ${VALID_PROVIDERS.join(', ')}`,
			)
		}

		if (options.provider !== 'console' && !options.from) {
			logger.warn(
				'`email.from` is not set. Emails will fail unless `from` is passed per-call. ' +
					'Set `email.from` in nuxt.config.ts.',
			)
		}

		;(nuxt.options.runtimeConfig as Record<string, unknown>)._email = {
			provider: options.provider,
			apiKey: options.apiKey ?? '',
			from: options.from ?? '',
			smtpHost: options.smtp?.host ?? '',
			smtpPort: options.smtp?.port ?? 587,
			smtpUser: options.smtp?.user ?? '',
			smtpPass: options.smtp?.pass ?? '',
			smtpSecure: options.smtp?.secure ?? false,
			retries: options.retries!,
			retryDelay: options.retryDelay!,
		}

		const templatesDir = resolvePath(
			nuxt.options.rootDir,
			options.templateDir!,
		)

		// Generate a real file in the build dir listing the user's compiled templates.
		const templatesFile = addTemplate({
			filename: 'nuxt-email/templates.mjs',
			write: true,
			getContents: () => {
				const templates = scanTemplates(templatesDir)
				const imports = templates
					.map(
						(t, i) =>
							`import t${i} from ${JSON.stringify(t.absPath.replace(/\\/g, '/'))}`,
					)
					.join('\n')
				const entries = templates
					.map((t, i) => `  ${JSON.stringify(t.name)}: t${i},`)
					.join('\n')
				return `${imports}\n\nexport const templates = {\n${entries}\n}\n`
			},
		})

		// Expose the generated file to server runtime via a server-safe Nitro alias (Vue app aliases
		// like `#build` are banned in server runtime; nitro virtuals aren't resolved in dev). The path
		// is forward-slashed so Nitro's resolver handles it rather than Node treating `d:\…` as a URL.
		// The file (and the user's `.vue` templates) must be inlined so Nitro's rollup + unplugin-vue
		// compile them — otherwise dev externalizes the file and Node fails on the raw `.vue` import.
		// `nitro:config` fires at runtime but is absent from this @nuxt/kit version's hook typings.
		const templatesFilePath = templatesFile.dst.replace(/\\/g, '/')
		const templatesDirPath = templatesDir.replace(/\\/g, '/')
		type NitroConfigHook = (nitro: {
			alias?: Record<string, string>
			externals?: { inline?: (string | RegExp)[] }
			rollupConfig?: { plugins?: unknown[] }
		}) => void
		;(nuxt.hook as (name: string, cb: NitroConfigHook) => void)(
			'nitro:config',
			nitro => {
				nitro.alias ||= {}
				nitro.alias['#nuxt-email/templates'] = templatesFilePath
				nitro.externals ||= {}
				nitro.externals.inline ||= []
				nitro.externals.inline.push(templatesFilePath, templatesDirPath)
				nitro.rollupConfig ||= {}
				nitro.rollupConfig.plugins ||= []
				nitro.rollupConfig.plugins.push(vuePlugin())
			},
		)

		addServerImports([
			{
				name: 'useEmail',
				from: resolve('./runtime/server/composables/useEmail'),
			},
		])

		if (nuxt.options.dev && options.preview) {
			addServerHandler({
				route: '/_email/preview/:template',
				handler: resolve('./runtime/server/api/preview'),
			})
		}

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

export type { EmailModuleOptions } from './runtime/types/index.js'
export type {
	EmailPayload,
	EmailResponse,
	EmailProvider,
	NormalizedPayload,
	EmailAttachment,
} from './runtime/types/index.js'
