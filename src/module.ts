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
import { addCustomTab } from '@nuxt/devtools-kit'
import vuePlugin from 'unplugin-vue/rollup'
import type { EmailModuleOptions, ProviderRuntimeOptions } from './runtime/types/index.js'

const MODULE_NAME = 'nuxt-email'
const CONFIG_KEY = 'email'
const VALID_PROVIDERS = ['console', 'resend', 'sendgrid', 'postmark', 'smtp']

interface ScannedTemplate {
	name: string
	absPath: string
}

// The bits of the nitro:config payload we touch. That hook isn't in @nuxt/kit's
// types, so we cast nuxt.hook to accept it (see setup).
interface NitroConfig {
	alias?: Record<string, string>
	externals?: { inline?: (string | RegExp)[] }
	rollupConfig?: { plugins?: unknown[] }
}

function flattenProviders(
	providers: EmailModuleOptions['providers'],
): Record<string, ProviderRuntimeOptions> | undefined {
	if (!providers) return undefined

	const result: Record<string, ProviderRuntimeOptions> = {}
	for (const [name, opts] of Object.entries(providers)) {
		if (!opts) continue
		result[name] = {
			apiKey: opts.apiKey,
			from: opts.from,
			smtpHost: opts.smtp?.host,
			smtpPort: opts.smtp?.port,
			smtpUser: opts.smtp?.user,
			smtpPass: opts.smtp?.pass,
			smtpSecure: opts.smtp?.secure,
		}
	}
	return result
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

		const runtimeConfig = nuxt.options.runtimeConfig as Record<
			string,
			unknown
		>
		runtimeConfig._email = {
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
			providers: flattenProviders(options.providers),
		}

		const templatesDir = resolvePath(
			nuxt.options.rootDir,
			options.templateDir!,
		)

		// Write a file that imports every .vue template, plus a map of their preview props.
		const templatesFile = addTemplate({
			filename: 'nuxt-email/templates.mjs',
			write: true,
			getContents: () => {
				const templates = scanTemplates(templatesDir)
				const imports = templates
					.map(
						(t, i) =>
							`import * as t${i} from ${JSON.stringify(t.absPath.replace(/\\/g, '/'))}`,
					)
					.join('\n')
				const entries = templates
					.map(
						(t, i) => `  ${JSON.stringify(t.name)}: t${i}.default,`,
					)
					.join('\n')
				const previewEntries = templates
					.map((t, i) => `  ${JSON.stringify(t.name)}: __pp(t${i}),`)
					.join('\n')
				return `${imports}\n\nconst __pp = m => (m && m.previewProps) ? m.previewProps : {}\n\nexport const templates = {\n${entries}\n}\n\nexport const previewProps = {\n${previewEntries}\n}\n`
			},
		})

		// Give the server an alias to that file and let unplugin-vue compile the .vue
		// templates. We inline both so Nitro bundles them instead of trying to import
		// the raw .vue at runtime.
		const templatesFilePath = templatesFile.dst.replace(/\\/g, '/')
		const templatesDirPath = templatesDir.replace(/\\/g, '/')

		const onNitroConfig = nuxt.hook as (
			name: 'nitro:config',
			cb: (config: NitroConfig) => void,
		) => void

		onNitroConfig('nitro:config', config => {
			config.alias = config.alias || {}
			config.alias['#nuxt-email/templates'] = templatesFilePath

			config.externals = config.externals || {}
			config.externals.inline = config.externals.inline || []
			config.externals.inline.push(templatesFilePath, templatesDirPath)

			config.rollupConfig = config.rollupConfig || {}
			config.rollupConfig.plugins = config.rollupConfig.plugins || []
			config.rollupConfig.plugins.push(vuePlugin())
		})

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
			addServerHandler({
				route: '/_email/send-test/:template',
				method: 'post',
				handler: resolve('./runtime/server/api/send-test.post'),
			})
			addServerHandler({
				route: '/_email/templates',
				method: 'get',
				handler: resolve('./runtime/server/api/templates.get'),
			})
			addServerHandler({
				route: '/_email/log',
				method: 'get',
				handler: resolve('./runtime/server/api/log.get'),
			})
			addServerHandler({
				route: '/_email/config',
				method: 'get',
				handler: resolve('./runtime/server/api/config.get'),
			})
			addServerHandler({
				route: '/_email/devtools',
				handler: resolve('./runtime/server/api/devtools'),
			})
			addCustomTab({
				name: 'nuxt-email',
				title: 'Email',
				icon: 'carbon:email',
				view: { type: 'iframe', src: '/_email/devtools' },
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
