# nuxt-email — Complete Module Development Plan

> Transactional & templated email for Nuxt 4.  
> Goal: production-grade module → published to npm → listed on nuxt.com/modules.

---

## 1. Vision & Scope

### What nuxt-email is

A Nuxt 4 module that provides a **unified, provider-agnostic email API** for server-side email sending with **Vue-powered templates**, zero-config defaults, and first-class TypeScript support. It should feel like a natural extension of Nuxt — auto-imported composables, file-based conventions, runtime config integration, and DevTools support.

### What nuxt-email is NOT

- Not a client-side email form builder (that's UI territory)
- Not a marketing/bulk email platform (no list management, campaigns, unsubscribes)
- Not a mail server — it delegates to providers (Resend, SendGrid, Postmark, AWS SES, Mailgun, SMTP)

### Core Principles

1. **Convention over configuration** — drop a `.vue` file in `server/emails/`, it becomes a template
2. **Provider-agnostic** — swap providers in `nuxt.config.ts`, zero code changes
3. **Type-safe end-to-end** — template props are inferred and validated
4. **SSR-safe** — all email logic runs server-side only; no client bundle leak
5. **Fail loudly in dev, fail gracefully in prod** — clear errors during development, retry/queue in production

---

## 2. Project Initialization

### 2.1 Scaffold with the Official Starter

```bash
npx nuxi init -t module nuxt-email
cd nuxt-email
pnpm install
```

This creates the canonical structure that the Nuxt team expects:

```
nuxt-email/
├── src/
│   ├── module.ts              # Module definition (entry point)
│   └── runtime/               # Everything injected into the host app
│       ├── server/
│       │   ├── composables/   # useEmail(), useEmailRenderer()
│       │   ├── utils/         # Provider adapters, template compiler
│       │   └── api/           # Optional preview endpoint
│       └── types/             # Shared TypeScript types
├── playground/                # Dev Nuxt app for manual testing
│   ├── nuxt.config.ts
│   ├── server/
│   │   └── emails/            # Example templates
│   └── app/
│       └── pages/
├── test/
│   ├── unit/                  # Provider adapter tests, template rendering
│   ├── integration/           # Full Nuxt lifecycle tests
│   └── fixtures/              # Nuxt configs for different scenarios
├── docs/                      # Documentation (Nuxt Content or Docus)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── CHANGELOG.md
├── LICENSE                    # MIT
└── README.md
```

### 2.2 package.json Essentials

```jsonc
{
	"name": "nuxt-email",
	"version": "0.1.0",
	"description": "Transactional email for Nuxt with Vue templates and multi-provider support",
	"license": "MIT",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/types.d.ts",
			"import": "./dist/module.mjs",
			"require": "./dist/module.cjs",
		},
	},
	"main": "./dist/module.cjs",
	"types": "./dist/types.d.ts",
	"files": ["dist"],
	"keywords": [
		"nuxt",
		"nuxt-module",
		"email",
		"transactional-email",
		"vue-email",
	],
	"scripts": {
		"prepack": "nuxt-module-build build",
		"dev": "nuxi dev playground",
		"dev:build": "nuxi build playground",
		"lint": "eslint .",
		"test": "vitest run",
		"test:watch": "vitest watch",
		"release": "pnpm test && changelogen --release && npm publish && git push --follow-tags",
	},
	"dependencies": {
		"@nuxt/kit": "^4.0.0",
	},
	"devDependencies": {
		"@nuxt/devtools-kit": "^2.0.0",
		"@nuxt/eslint-config": "latest",
		"@nuxt/module-builder": "latest",
		"@nuxt/test-utils": "latest",
		"changelogen": "latest",
		"eslint": "latest",
		"nuxt": "^4.0.0",
		"vitest": "latest",
	},
	"peerDependencies": {
		"nuxt": "^4.0.0",
	},
}
```

---

## 3. Architecture

### 3.1 Module Definition (`src/module.ts`)

The heart of the module. Responsibilities:

1. Merge user options with defaults
2. Register server composables (auto-imported in `server/` context)
3. Scan `server/emails/` for Vue email templates
4. Inject runtime config (provider keys go to private runtimeConfig)
5. Add Nitro plugin for provider initialization
6. Register DevTools tab (dev only)
7. Add optional email preview API route (dev only)

```typescript
// src/module.ts
import {
	defineNuxtModule,
	createResolver,
	addServerImports,
	addServerPlugin,
	addServerHandler,
	useLogger,
} from '@nuxt/kit'
import type { EmailModuleOptions } from './runtime/types'

const MODULE_NAME = 'nuxt-email'
const CONFIG_KEY = 'email'

export default defineNuxtModule<EmailModuleOptions>({
	meta: {
		name: MODULE_NAME,
		configKey: CONFIG_KEY,
		compatibility: {
			nuxt: '>=4.0.0',
		},
	},
	defaults: {
		provider: 'console', // safe default — logs to terminal
		from: undefined,
		templateDir: 'server/emails',
		preview: true, // enable preview route in dev
		retries: 2,
		retryDelay: 1000,
	},
	async setup(options, nuxt) {
		const logger = useLogger(MODULE_NAME)
		const { resolve } = createResolver(import.meta.url)

		// ── 1. Validate options ──────────────────────────────
		if (options.provider !== 'console' && !options.from) {
			logger.warn(
				'`email.from` is not set. Emails will fail in production.',
			)
		}

		// ── 2. Inject runtime config ─────────────────────────
		// Private keys: never exposed to client
		nuxt.options.runtimeConfig._email = {
			provider: options.provider,
			apiKey: options.apiKey || '',
			from: options.from || '',
			smtpHost: options.smtp?.host || '',
			smtpPort: options.smtp?.port || 587,
			smtpUser: options.smtp?.user || '',
			smtpPass: options.smtp?.pass || '',
			retries: options.retries!,
			retryDelay: options.retryDelay!,
		}

		// ── 3. Register server composables ───────────────────
		addServerImports([
			{
				name: 'useEmail',
				from: resolve('./runtime/server/composables/useEmail'),
			},
			{
				name: 'useEmailRenderer',
				from: resolve('./runtime/server/composables/useEmailRenderer'),
			},
		])

		// ── 4. Register Nitro plugin (provider init) ─────────
		addServerPlugin(resolve('./runtime/server/plugins/email'))

		// ── 5. Template scanning ─────────────────────────────
		// Register a Nitro hook to scan the templateDir at build time
		// and compile .vue files into render functions

		// ── 6. Dev-only: preview route + DevTools ────────────
		if (nuxt.options.dev && options.preview) {
			addServerHandler({
				route: '/_email/preview/:template',
				handler: resolve('./runtime/server/api/preview'),
			})

			addServerHandler({
				route: '/_email/send-test/:template',
				method: 'post',
				handler: resolve('./runtime/server/api/send-test'),
			})

			logger.info('Email preview available at /_email/preview/:template')
		}

		// ── 7. DevTools integration ──────────────────────────
		if (nuxt.options.dev) {
			// Register custom DevTools tab
		}

		logger.success(`Module initialized with provider: ${options.provider}`)
	},
})
```

### 3.2 Type Definitions (`src/runtime/types/index.ts`)

```typescript
// ── Module Options (nuxt.config.ts) ──────────────────────
export interface EmailModuleOptions {
	/** Email provider. Default: 'console' (logs to terminal) */
	provider:
		| 'resend'
		| 'sendgrid'
		| 'postmark'
		| 'ses'
		| 'mailgun'
		| 'smtp'
		| 'console'

	/** Default sender address: "Name <email>" or "email" */
	from?: string

	/** Provider API key (prefer env vars via runtimeConfig) */
	apiKey?: string

	/** SMTP-specific config */
	smtp?: SmtpConfig

	/** Directory for Vue email templates (relative to project root) */
	templateDir?: string

	/** Enable preview route in dev mode */
	preview?: boolean

	/** Number of retry attempts on transient failures */
	retries?: number

	/** Delay between retries in ms */
	retryDelay?: number
}

export interface SmtpConfig {
	host: string
	port?: number
	user?: string
	pass?: string
	secure?: boolean
}

// ── Email Payload (what you pass to sendEmail) ───────────
export interface EmailPayload {
	/** Recipient(s) */
	to: string | string[]

	/** Subject line */
	subject: string

	/** Pre-compiled HTML body (mutually exclusive with `template`) */
	html?: string

	/** Plain text fallback */
	text?: string

	/** Template name (filename without extension from templateDir) */
	template?: string

	/** Props passed to the Vue template */
	props?: Record<string, unknown>

	/** Override the default `from` */
	from?: string

	/** CC recipients */
	cc?: string | string[]

	/** BCC recipients */
	bcc?: string | string[]

	/** Reply-to address */
	replyTo?: string

	/** File attachments */
	attachments?: EmailAttachment[]

	/** Custom headers */
	headers?: Record<string, string>

	/** Scheduling: send at a future time (provider must support it) */
	scheduledAt?: Date

	/** Tags for analytics/filtering (provider-dependent) */
	tags?: Record<string, string>
}

export interface EmailAttachment {
	filename: string
	content: string | Buffer
	contentType?: string
	/** 'attachment' | 'inline' */
	disposition?: string
	/** Content-ID for inline images */
	cid?: string
}

// ── Email Response ───────────────────────────────────────
export interface EmailResponse {
	/** Whether the email was accepted by the provider */
	success: boolean

	/** Provider-specific message ID */
	messageId?: string

	/** Error message on failure */
	error?: string

	/** Provider name that handled the send */
	provider: string

	/** Time taken in ms */
	duration: number
}

// ── Provider Adapter Interface ───────────────────────────
export interface EmailProvider {
	name: string
	send(payload: NormalizedPayload): Promise<EmailResponse>
	/** Optional: check if the provider is correctly configured */
	verify?(): Promise<boolean>
}

export interface NormalizedPayload {
	from: string
	to: string[]
	subject: string
	html: string
	text?: string
	cc?: string[]
	bcc?: string[]
	replyTo?: string
	attachments?: EmailAttachment[]
	headers?: Record<string, string>
	scheduledAt?: Date
	tags?: Record<string, string>
}
```

### 3.3 Provider Adapter Pattern

Each provider implements the `EmailProvider` interface. The module ships with built-in adapters and allows custom ones.

```
src/runtime/server/utils/providers/
├── console.ts       # Default: logs to stdout (dev/testing)
├── resend.ts        # Resend (resend.com)
├── sendgrid.ts      # SendGrid (@sendgrid/mail)
├── postmark.ts      # Postmark (postmark.js)
├── ses.ts           # AWS SES (@aws-sdk/client-ses)
├── mailgun.ts       # Mailgun (mailgun.js)
├── smtp.ts          # Generic SMTP (nodemailer)
└── index.ts         # Provider registry & factory
```

**Provider factory:**

```typescript
// src/runtime/server/utils/providers/index.ts
import type { EmailProvider } from '../../types'
import { ConsoleProvider } from './console'
import { ResendProvider } from './resend'
// ... other imports

const providers: Record<string, () => EmailProvider> = {
	console: () => new ConsoleProvider(),
	resend: () => new ResendProvider(),
	sendgrid: () => new SendGridProvider(),
	postmark: () => new PostmarkProvider(),
	ses: () => new SESProvider(),
	mailgun: () => new MailgunProvider(),
	smtp: () => new SMTPProvider(),
}

export function createProvider(name: string): EmailProvider {
	const factory = providers[name]
	if (!factory) {
		throw new Error(
			`[nuxt-email] Unknown provider "${name}". ` +
				`Available: ${Object.keys(providers).join(', ')}`,
		)
	}
	return factory()
}
```

**Example provider (Resend):**

```typescript
// src/runtime/server/utils/providers/resend.ts
import type {
	EmailProvider,
	NormalizedPayload,
	EmailResponse,
} from '../../types'

export class ResendProvider implements EmailProvider {
	name = 'resend'
	private apiKey: string

	constructor() {
		const config = useRuntimeConfig()._email
		this.apiKey = config.apiKey

		if (!this.apiKey) {
			throw new Error(
				'[nuxt-email] Resend provider requires an API key. Set `email.apiKey` or NUXT_EMAIL_API_KEY.',
			)
		}
	}

	async send(payload: NormalizedPayload): Promise<EmailResponse> {
		const start = Date.now()

		try {
			const response = await $fetch<{ id: string }>(
				'https://api.resend.com/emails',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json',
					},
					body: {
						from: payload.from,
						to: payload.to,
						subject: payload.subject,
						html: payload.html,
						text: payload.text,
						cc: payload.cc,
						bcc: payload.bcc,
						reply_to: payload.replyTo,
						attachments: payload.attachments?.map(a => ({
							filename: a.filename,
							content:
								typeof a.content === 'string'
									? a.content
									: a.content.toString('base64'),
							type: a.contentType,
						})),
						headers: payload.headers,
						scheduled_at: payload.scheduledAt?.toISOString(),
						tags: payload.tags
							? Object.entries(payload.tags).map(
									([name, value]) => ({ name, value }),
								)
							: undefined,
					},
				},
			)

			return {
				success: true,
				messageId: response.id,
				provider: this.name,
				duration: Date.now() - start,
			}
		} catch (error: any) {
			return {
				success: false,
				error: error?.data?.message || error.message || 'Unknown error',
				provider: this.name,
				duration: Date.now() - start,
			}
		}
	}

	async verify(): Promise<boolean> {
		try {
			await $fetch('https://api.resend.com/domains', {
				headers: { Authorization: `Bearer ${this.apiKey}` },
			})
			return true
		} catch {
			return false
		}
	}
}
```

### 3.4 Core Composable (`useEmail`)

```typescript
// src/runtime/server/composables/useEmail.ts
import type { EmailPayload, EmailResponse } from '../../types'
import { createProvider } from '../utils/providers'
import { renderEmailTemplate } from '../utils/renderer'

let providerInstance: EmailProvider | null = null

function getProvider(): EmailProvider {
	if (!providerInstance) {
		const config = useRuntimeConfig()._email
		providerInstance = createProvider(config.provider)
	}
	return providerInstance
}

export function useEmail() {
	const config = useRuntimeConfig()._email

	/**
	 * Send a single email.
	 *
	 * @example
	 * const { sendEmail } = useEmail()
	 * await sendEmail({
	 *   to: 'user@example.com',
	 *   subject: 'Welcome!',
	 *   template: 'welcome',
	 *   props: { name: 'John' },
	 * })
	 */
	async function sendEmail(payload: EmailPayload): Promise<EmailResponse> {
		// ── Validate ──────────────────────────────────────
		if (!payload.to) {
			throw new Error('[nuxt-email] `to` is required.')
		}
		if (!payload.html && !payload.template && !payload.text) {
			throw new Error(
				'[nuxt-email] Provide `html`, `template`, or `text`.',
			)
		}

		// ── Render template if needed ─────────────────────
		let html = payload.html
		let text = payload.text

		if (payload.template) {
			const rendered = await renderEmailTemplate(
				payload.template,
				payload.props || {},
			)
			html = rendered.html
			text = text || rendered.text
		}

		// ── Normalize ─────────────────────────────────────
		const normalized = {
			from: payload.from || config.from,
			to: Array.isArray(payload.to) ? payload.to : [payload.to],
			subject: payload.subject,
			html: html!,
			text,
			cc: payload.cc
				? Array.isArray(payload.cc)
					? payload.cc
					: [payload.cc]
				: undefined,
			bcc: payload.bcc
				? Array.isArray(payload.bcc)
					? payload.bcc
					: [payload.bcc]
				: undefined,
			replyTo: payload.replyTo,
			attachments: payload.attachments,
			headers: payload.headers,
			scheduledAt: payload.scheduledAt,
			tags: payload.tags,
		}

		if (!normalized.from) {
			throw new Error(
				'[nuxt-email] No `from` address. Set `email.from` in nuxt.config.ts or pass it in the payload.',
			)
		}

		// ── Send with retries ─────────────────────────────
		const provider = getProvider()
		let lastResponse: EmailResponse | null = null
		const maxAttempts = config.retries + 1

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			lastResponse = await provider.send(normalized)

			if (lastResponse.success) return lastResponse

			// Only retry on transient errors (5xx, timeouts, network)
			if (attempt < maxAttempts && isTransientError(lastResponse.error)) {
				await sleep(config.retryDelay * attempt) // exponential-ish backoff
			}
		}

		return lastResponse!
	}

	/**
	 * Send multiple emails in parallel (with concurrency limit).
	 */
	async function sendBatch(
		payloads: EmailPayload[],
		options?: { concurrency?: number },
	): Promise<EmailResponse[]> {
		const concurrency = options?.concurrency || 5
		const results: EmailResponse[] = []

		for (let i = 0; i < payloads.length; i += concurrency) {
			const batch = payloads.slice(i, i + concurrency)
			const batchResults = await Promise.allSettled(
				batch.map(p => sendEmail(p)),
			)

			for (const result of batchResults) {
				if (result.status === 'fulfilled') {
					results.push(result.value)
				} else {
					results.push({
						success: false,
						error: result.reason?.message || 'Unknown error',
						provider: config.provider,
						duration: 0,
					})
				}
			}
		}

		return results
	}

	return { sendEmail, sendBatch }
}

function isTransientError(error?: string): boolean {
	if (!error) return false
	const transient = [
		'timeout',
		'econnrefused',
		'rate limit',
		'429',
		'500',
		'502',
		'503',
	]
	return transient.some(t => error.toLowerCase().includes(t))
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
```

### 3.5 Template Rendering Engine

The module scans `server/emails/` for `.vue` files and compiles them to HTML at render time.

**Strategy:** Use `@vue-email/compiler` (or a lighter custom solution) to transform Vue SFCs into email-safe HTML. The renderer:

1. Compiles the `.vue` file's `<template>` block into a Vue render function
2. Passes `props` as component props
3. Renders to an HTML string via `@vue/server-renderer`
4. Runs the HTML through an inliner (CSS → inline styles) for email client compatibility
5. Optionally generates a plain-text version by stripping tags

```typescript
// src/runtime/server/composables/useEmailRenderer.ts
export function useEmailRenderer() {
	async function render(
		templateName: string,
		props: Record<string, unknown>,
	): Promise<{ html: string; text: string }> {
		// 1. Resolve template path
		// 2. Import compiled component
		// 3. SSR render with props
		// 4. Inline CSS
		// 5. Generate text fallback
	}

	/** List all available templates */
	function listTemplates(): string[] {
		/* ... */
	}

	/** Render a preview with sample data */
	async function preview(
		templateName: string,
		sampleProps?: Record<string, unknown>,
	): Promise<string> {
		/* ... */
	}

	return { render, listTemplates, preview }
}
```

---

## 4. Edge Cases & Error Handling

### 4.1 Configuration Errors

| Scenario                           | Behavior                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| No `from` set + provider ≠ console | Warn at module setup; throw at send time with clear message                |
| Invalid provider name              | Throw at module init with list of valid providers                          |
| Missing API key for cloud provider | Throw at first `send()` call, not at module init (allows lazy env loading) |
| SMTP config incomplete             | Validate host/port at first connection, throw with field-specific message  |
| `templateDir` doesn't exist        | Warn at setup (not error — user may only use `html` directly)              |

### 4.2 Runtime Errors

| Scenario                               | Behavior                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Provider API returns 4xx (bad request) | Return `{ success: false, error }` — do NOT retry (client error)         |
| Provider API returns 5xx / timeout     | Retry up to `retries` times with exponential backoff                     |
| Provider API returns 429 (rate limit)  | Retry with `Retry-After` header if present, else backoff                 |
| Network error (DNS, ECONNREFUSED)      | Retry; if all fail, return structured error                              |
| Template not found                     | Throw `Error('[nuxt-email] Template "xyz" not found in ${templateDir}')` |
| Template render error (bad props)      | Throw with template name + original Vue error                            |
| Attachment too large                   | Throw with size limit info (provider-specific)                           |
| Invalid email address format           | Validate with regex before sending; throw with which field               |
| `to` is empty array                    | Throw `'at least one recipient required'`                                |
| `sendBatch` with 1000+ emails          | Process in chunks with concurrency limit; warn if > 500                  |

### 4.3 SSR / Lifecycle Gotchas

| Scenario                                | Behavior                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `useEmail()` called in client-side code | Composable only registered via `addServerImports` — import will fail with clear error |
| Module imported in `app/composables/`   | TypeScript error — types are server-only                                              |
| Provider instance created too early     | Lazy-init pattern: provider created on first `send()`, not at module setup            |
| Multiple Nuxt instances (testing)       | Provider instance scoped to runtime config, not global singleton                      |
| Prerendering / SSG                      | Skip email sending during prerender (detect via `import.meta.prerender`)              |

### 4.4 Security

| Concern                            | Mitigation                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------- |
| API keys in client bundle          | Keys stored in `runtimeConfig._email` (private, never serialized to client) |
| Email injection (header injection) | Sanitize `subject`, `from`, `to` — reject newlines/carriage returns         |
| XSS in HTML templates              | Vue's template renderer escapes by default; warn about `v-html` in docs     |
| Preview route in production        | Only registered when `nuxt.options.dev === true`                            |
| SSRF via template includes         | Templates must be local files; no URL-based template loading                |

### 4.5 Provider-Specific Quirks

| Provider | Edge Case                            | Handling                                                       |
| -------- | ------------------------------------ | -------------------------------------------------------------- |
| Resend   | `scheduled_at` format                | Convert Date to ISO-8601                                       |
| SendGrid | Attachments as base64 strings only   | Auto-convert Buffer to base64                                  |
| Postmark | No BCC support on some plans         | Warn + fall back to individual sends                           |
| SES      | Requires verified sender domain      | `verify()` method checks domain status                         |
| SMTP     | Connection pooling / TLS negotiation | Use nodemailer's pool transport; handle STARTTLS               |
| Console  | Should never throw                   | Always returns `{ success: true }`                             |
| All      | Provider SDK not installed           | Dynamic import with try/catch; throw clear "install X" message |

---

## 5. DevTools Integration

### 5.1 Custom DevTools Tab

Register a DevTools tab showing:

- **Configuration** — current provider, from address, template dir
- **Templates** — list all discovered templates with preview links
- **Send Log** — recent emails sent during dev session (stored in memory)
- **Test Send** — form to send a test email with any template + custom props

```typescript
// Inside module setup, dev-only:
if (nuxt.options.dev) {
	nuxt.hook('devtools:customTabs', tabs => {
		tabs.push({
			name: 'nuxt-email',
			title: 'Email',
			icon: 'i-lucide-mail',
			view: {
				type: 'iframe',
				src: '/_email/devtools',
			},
		})
	})
}
```

### 5.2 Dev Preview Route

`GET /_email/preview/:template` — renders the template with sample data and returns HTML. This lets developers iterate on email designs in the browser with hot reload.

`POST /_email/send-test/:template` — actually sends the email to a test address. Requires `?to=dev@example.com` query param.

---

## 6. File-Based Email Templates

### 6.1 Convention

```
server/emails/
├── welcome.vue              # → template: 'welcome'
├── password-reset.vue       # → template: 'password-reset'
├── order-confirmation.vue   # → template: 'order-confirmation'
└── _components/             # Shared sub-components (not standalone templates)
    ├── EmailLayout.vue
    ├── EmailButton.vue
    └── EmailFooter.vue
```

Underscore-prefixed directories are private — they're importable by templates but not addressable as template names.

### 6.2 Template Authoring

```vue
<!-- server/emails/welcome.vue -->
<script setup lang="ts">
// Props are fully typed and validated
defineProps<{
	name: string
	verifyUrl: string
	expiresIn?: string
}>()
</script>

<template>
	<EmailLayout>
		<h1>Welcome, {{ name }}!</h1>
		<p>Please verify your email address by clicking the button below.</p>
		<EmailButton :href="verifyUrl">Verify Email</EmailButton>
		<p v-if="expiresIn">This link expires in {{ expiresIn }}.</p>
	</EmailLayout>
</template>
```

### 6.3 Preview Data

Templates can export sample data for the preview route:

```vue
<script lang="ts">
// Named export for preview — not included in production builds
export const previewProps = {
	name: 'Jane Doe',
	verifyUrl: 'https://example.com/verify?token=abc123',
	expiresIn: '24 hours',
}
</script>
```

---

## 7. User-Facing API (How Developers Use It)

### 7.1 Basic Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
	modules: ['nuxt-email'],

	email: {
		provider: 'resend',
		from: 'Acme <hello@acme.com>',
		// apiKey loaded from NUXT_EMAIL_API_KEY env var automatically
	},
})
```

```env
# .env
NUXT_EMAIL_API_KEY=re_abc123...
```

### 7.2 Sending Emails

```typescript
// server/api/auth/register.post.ts
export default defineEventHandler(async event => {
	const body = await readBody(event)
	const user = await createUser(body)

	// Auto-imported server composable
	const { sendEmail } = useEmail()

	const result = await sendEmail({
		to: user.email,
		subject: 'Welcome to Acme!',
		template: 'welcome',
		props: {
			name: user.name,
			verifyUrl: `https://acme.com/verify?token=${user.verifyToken}`,
			expiresIn: '24 hours',
		},
	})

	if (!result.success) {
		console.error('Email failed:', result.error)
		// Don't fail the request — user was created successfully
	}

	return { user: { id: user.id, email: user.email } }
})
```

### 7.3 Raw HTML (No Template)

```typescript
const { sendEmail } = useEmail()

await sendEmail({
	to: 'admin@company.com',
	subject: 'Alert: System threshold exceeded',
	html: '<h1>Warning</h1><p>CPU usage above 90% for 5 minutes.</p>',
	text: 'Warning: CPU usage above 90% for 5 minutes.',
})
```

### 7.4 Batch Sending

```typescript
const { sendBatch } = useEmail()

const results = await sendBatch(
	users.map(user => ({
		to: user.email,
		subject: 'Monthly Newsletter',
		template: 'newsletter',
		props: { name: user.name, articles },
	})),
	{ concurrency: 10 },
)

const failed = results.filter(r => !r.success)
if (failed.length) {
	console.warn(`${failed.length}/${results.length} emails failed`)
}
```

### 7.5 Attachments

```typescript
await sendEmail({
	to: 'customer@example.com',
	subject: 'Your Invoice #1234',
	template: 'invoice',
	props: { invoiceNumber: '1234', amount: '$99.00' },
	attachments: [
		{
			filename: 'invoice-1234.pdf',
			content: pdfBuffer,
			contentType: 'application/pdf',
		},
	],
})
```

### 7.6 Environment-Based Provider Switching

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
	email: {
		// Console in dev, Resend in production
		provider: process.env.NODE_ENV === 'production' ? 'resend' : 'console',
		from: 'App <noreply@myapp.com>',
	},
})
```

---

## 8. Testing Strategy

### 8.1 Test Structure

```
test/
├── unit/
│   ├── providers/
│   │   ├── console.test.ts          # Console provider logs correctly
│   │   ├── resend.test.ts           # Resend API calls are correct
│   │   ├── sendgrid.test.ts         # SendGrid API calls
│   │   └── smtp.test.ts             # SMTP transport
│   ├── composables/
│   │   ├── useEmail.test.ts         # Validation, normalization, retry logic
│   │   └── useEmailRenderer.test.ts # Template rendering
│   └── utils/
│       ├── validation.test.ts       # Email address validation
│       └── sanitize.test.ts         # Header injection prevention
├── integration/
│   ├── module-setup.test.ts         # Module initializes correctly
│   ├── send-with-template.test.ts   # End-to-end template → send
│   └── preview-route.test.ts        # Dev preview route works
├── e2e/
│   └── playground.test.ts           # Full playground app sends email
└── fixtures/
    ├── basic/                       # Minimal config
    │   ├── nuxt.config.ts
    │   └── server/emails/welcome.vue
    ├── smtp/                        # SMTP provider config
    │   └── nuxt.config.ts
    ├── no-templates/                # No template dir
    │   └── nuxt.config.ts
    └── invalid-config/              # Missing required fields
        └── nuxt.config.ts
```

### 8.2 Unit Tests (Vitest)

```typescript
// test/unit/composables/useEmail.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('useEmail', () => {
	describe('validation', () => {
		it('throws when `to` is missing', async () => {
			const { sendEmail } = useEmail()
			await expect(
				sendEmail({ subject: 'Test', html: '<p>Hi</p>' } as any),
			).rejects.toThrow('`to` is required')
		})

		it('throws when no content provided', async () => {
			const { sendEmail } = useEmail()
			await expect(
				sendEmail({ to: 'a@b.com', subject: 'Test' }),
			).rejects.toThrow('Provide `html`, `template`, or `text`')
		})

		it('throws on email header injection attempt', async () => {
			const { sendEmail } = useEmail()
			await expect(
				sendEmail({
					to: 'a@b.com\r\nBcc: evil@hacker.com',
					subject: 'Test',
					html: 'x',
				}),
			).rejects.toThrow('Invalid email address')
		})
	})

	describe('retry logic', () => {
		it('retries on 5xx errors', async () => {
			/* ... */
		})
		it('does not retry on 4xx errors', async () => {
			/* ... */
		})
		it('respects max retries config', async () => {
			/* ... */
		})
		it('uses exponential backoff', async () => {
			/* ... */
		})
	})

	describe('normalization', () => {
		it('converts single `to` string to array', async () => {
			/* ... */
		})
		it('uses default `from` when not provided', async () => {
			/* ... */
		})
	})
})
```

### 8.3 Integration Tests (@nuxt/test-utils)

```typescript
// test/integration/module-setup.test.ts
import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('module setup - basic fixture', async () => {
	await setup({
		rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
	})

	it('module initializes without errors', () => {
		// If setup() didn't throw, the module loaded successfully
		expect(true).toBe(true)
	})

	it('preview route is available in dev', async () => {
		const html = await $fetch('/_email/preview/welcome')
		expect(html).toContain('Welcome')
	})

	it('send-test route accepts POST', async () => {
		const result = await $fetch('/_email/send-test/welcome', {
			method: 'POST',
			body: { to: 'test@example.com' },
		})
		expect(result.success).toBe(true) // Console provider always succeeds
	})
})
```

### 8.4 Testing Provider Adapters (Mocking HTTP)

```typescript
// test/unit/providers/resend.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResendProvider } from '../../../src/runtime/server/utils/providers/resend'

// Mock $fetch globally
vi.mock('#imports', () => ({
	useRuntimeConfig: () => ({
		_email: { apiKey: 'test-key', from: 'test@test.com' },
	}),
}))

describe('ResendProvider', () => {
	let provider: ResendProvider

	beforeEach(() => {
		provider = new ResendProvider()
		vi.restoreAllMocks()
	})

	it('sends email with correct payload shape', async () => {
		const fetchSpy = vi.fn().mockResolvedValue({ id: 'msg_123' })
		vi.stubGlobal('$fetch', fetchSpy)

		const result = await provider.send({
			from: 'sender@test.com',
			to: ['recipient@test.com'],
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.success).toBe(true)
		expect(result.messageId).toBe('msg_123')
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				body: expect.objectContaining({
					from: 'sender@test.com',
					to: ['recipient@test.com'],
					subject: 'Test',
					html: '<p>Hello</p>',
				}),
			}),
		)
	})

	it('returns structured error on API failure', async () => {
		vi.stubGlobal(
			'$fetch',
			vi.fn().mockRejectedValue({
				data: { message: 'Invalid API key' },
			}),
		)

		const result = await provider.send({
			from: 'sender@test.com',
			to: ['recipient@test.com'],
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe('Invalid API key')
	})
})
```

### 8.5 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/runtime/types/**'],
			thresholds: {
				statements: 80,
				branches: 75,
				functions: 80,
				lines: 80,
			},
		},
	},
})
```

### 8.6 What to Test (Checklist)

**Unit Tests (fast, no Nuxt):**

- [ ] Each provider adapter correctly shapes API payloads
- [ ] Each provider adapter handles success/error responses
- [ ] Email address validation accepts/rejects correctly
- [ ] Header injection sanitization
- [ ] Retry logic (transient vs permanent errors)
- [ ] `to` / `cc` / `bcc` normalization (string → array)
- [ ] Template rendering with valid/invalid props
- [ ] Attachment encoding (Buffer → base64)
- [ ] Batch sending with concurrency limits
- [ ] `from` fallback to default

**Integration Tests (with Nuxt):**

- [ ] Module loads with valid config
- [ ] Module warns on missing `from`
- [ ] Module throws on invalid provider
- [ ] Server composable is auto-imported
- [ ] Preview route serves HTML in dev mode
- [ ] Preview route is NOT registered in production build
- [ ] Template scanning finds `.vue` files
- [ ] Underscore dirs are excluded from template list
- [ ] Runtime config correctly injects private keys
- [ ] Environment variable override works (`NUXT_EMAIL_API_KEY`)

**E2E Tests (playground):**

- [ ] Dev server starts and email preview works
- [ ] Sending email through console provider works end-to-end
- [ ] Build succeeds with the module installed

---

## 9. Development Phases

### Phase 1: Foundation (Week 1–2)

- [ ] Scaffold project with `nuxi init -t module`
- [ ] Define TypeScript interfaces (options, payload, response, provider)
- [ ] Implement `ConsoleProvider` (logs to stdout)
- [ ] Implement `useEmail()` composable (validation, normalization, retry)
- [ ] Register composable via `addServerImports`
- [ ] Inject runtime config
- [ ] Set up playground with basic example
- [ ] Unit tests for validation, normalization, console provider
- [ ] Integration test: module loads and composable is importable

### Phase 2: Template Engine (Week 3)

- [ ] Template scanning at build time (`server/emails/`)
- [ ] Vue SFC → HTML rendering pipeline
- [ ] CSS inlining for email client compatibility
- [ ] Plain-text generation from HTML
- [ ] `useEmailRenderer()` composable
- [ ] Preview route (`/_email/preview/:template`)
- [ ] Sample templates in playground
- [ ] Tests for template rendering

### Phase 3: Provider Adapters (Week 4–5)

- [ ] Resend adapter + tests
- [ ] SendGrid adapter + tests
- [ ] Postmark adapter + tests
- [ ] SMTP (nodemailer) adapter + tests
- [ ] AWS SES adapter + tests
- [ ] Mailgun adapter + tests
- [ ] Dynamic import pattern (optional peer deps)
- [ ] Provider `verify()` method

### Phase 4: Polish (Week 6)

- [ ] DevTools tab integration
- [ ] Test send route (`/_email/send-test/:template`)
- [ ] Batch sending with concurrency
- [ ] Attachments support (all providers)
- [ ] `scheduledAt` support (providers that support it)
- [ ] Tags/metadata support
- [ ] Comprehensive error messages
- [ ] Edge case hardening (see Section 4)

### Phase 5: Documentation & Release (Week 7–8)

- [ ] README with quickstart, full API, examples
- [ ] Docs site (Docus or Nuxt Content)
- [ ] StackBlitz playground reproduction
- [ ] CHANGELOG (via changelogen)
- [ ] CI/CD (GitHub Actions: lint, test, publish)
- [ ] Publish to npm
- [ ] Submit PR to `nuxt/modules` registry

---

## 10. Documentation Plan

### 10.1 Structure (Matching Nuxt Module Docs Style)

```
docs/
├── content/
│   ├── 0.index.md                 # Landing / overview
│   ├── 1.getting-started/
│   │   ├── 1.installation.md      # Install + basic config
│   │   ├── 2.configuration.md     # Full options reference
│   │   └── 3.first-email.md       # Send your first email
│   ├── 2.usage/
│   │   ├── 1.sending-emails.md    # sendEmail() API
│   │   ├── 2.templates.md         # Vue email templates
│   │   ├── 3.attachments.md       # File attachments
│   │   ├── 4.batch-sending.md     # sendBatch() API
│   │   └── 5.error-handling.md    # Retry, errors, logging
│   ├── 3.providers/
│   │   ├── 1.resend.md
│   │   ├── 2.sendgrid.md
│   │   ├── 3.postmark.md
│   │   ├── 4.ses.md
│   │   ├── 5.mailgun.md
│   │   ├── 6.smtp.md
│   │   ├── 7.console.md
│   │   └── 8.custom.md           # Writing your own provider
│   ├── 4.advanced/
│   │   ├── 1.preview.md          # Dev preview route
│   │   ├── 2.devtools.md         # DevTools integration
│   │   ├── 3.testing.md          # Testing emails in your app
│   │   └── 4.security.md         # Security best practices
│   └── 5.api/
│       ├── 1.use-email.md         # Composable reference
│       ├── 2.use-email-renderer.md
│       ├── 3.types.md             # All TypeScript types
│       └── 4.module-options.md    # Config reference
```

### 10.2 README.md Essentials

The README should include:

1. **Badges** — npm version, downloads, license, Nuxt compatibility
2. **One-paragraph description**
3. **Features list** (6–8 bullets)
4. **Quick Setup** (3 steps: install, add to config, send)
5. **Example** — minimal working code
6. **Providers table** — name, status, link
7. **Documentation link**
8. **Contributing** section
9. **License**

---

## 11. Publishing to the Nuxt Modules Registry

### 11.1 Prerequisites (Before Submitting)

1. **Published on npm** — `npm publish` or use the `release` script from the starter
2. **README** — clear description, install steps, at least one example
3. **License** — MIT recommended (matching Nuxt ecosystem convention)
4. **Nuxt 4 compatibility** — `meta.compatibility.nuxt: '>=4.0.0'` in module definition
5. **Tests passing** — CI green, reasonable coverage
6. **No excessive dependencies** — keep the install footprint small
7. **Playground** — working demo app in the repo
8. **StackBlitz** — a "try it online" link in the README (highly recommended)

### 11.2 Submission Process

1. Fork the `nuxt/modules` repository on GitHub
2. Create a new `.yml` file in the `modules/` directory:

```yaml
# modules/nuxt-email.yml
name: nuxt-email
description: Transactional email for Nuxt with Vue templates and multi-provider support
repo: your-username/nuxt-email
npm: nuxt-email
icon: email
category: devtools # or 'extensions' — pick from lib/categories.json
type: community
compatibility:
    nuxt: '>=4.0.0'
```

3. Open a PR to `nuxt/modules` with:
    - A short description of the module
    - Link to the npm package
    - Link to the docs / README
    - Link to the playground / StackBlitz demo

4. The Nuxt team reviews the PR. Criteria they check:
    - Module works and is installable
    - README is clear
    - No malicious code
    - Follows naming conventions ("X for Nuxt", not "X for Nuxt 4")
    - Compatible with current Nuxt version

5. Once merged, the module appears on [nuxt.com/modules](https://nuxt.com/modules)

### 11.3 Post-Publication Maintenance

- **npm version syncing** — the registry auto-syncs description, version, maintainers from npm
- **Compatibility updates** — update `meta.compatibility` when Nuxt 5 arrives
- **Issue triage** — respond to community issues within 48h (sets a good precedent)
- **Changelog** — use `changelogen` for consistent, automated changelogs

---

## 12. CI/CD Pipeline

### 12.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    lint:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 22
                  cache: pnpm
            - run: pnpm install
            - run: pnpm lint

    test:
        runs-on: ubuntu-latest
        strategy:
            matrix:
                node-version: [20, 22]
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: ${{ matrix.node-version }}
                  cache: pnpm
            - run: pnpm install
            - run: pnpm test
            - run: pnpm dev:build # Ensure playground builds

    publish:
        needs: [lint, test]
        if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, 'release')
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 22
                  registry-url: https://registry.npmjs.org
            - run: pnpm install
            - run: pnpm prepack
            - run: npm publish
              env:
                  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 13. Playground App

The playground is a fully working Nuxt 4 app that demonstrates all module features.

```
playground/
├── nuxt.config.ts
├── app/
│   ├── app.vue
│   └── pages/
│       └── index.vue          # Links to test email sending
├── server/
│   ├── api/
│   │   ├── send-welcome.post.ts
│   │   ├── send-raw.post.ts
│   │   └── send-batch.post.ts
│   └── emails/
│       ├── welcome.vue
│       ├── password-reset.vue
│       ├── order-confirmation.vue
│       └── _components/
│           ├── EmailLayout.vue
│           ├── EmailButton.vue
│           └── EmailFooter.vue
└── .env.example
```

```typescript
// playground/nuxt.config.ts
export default defineNuxtConfig({
	modules: ['../src/module'],

	email: {
		provider: 'console',
		from: 'Playground <noreply@playground.local>',
		preview: true,
	},
})
```

---

## 14. Dependency Strategy

### Required (bundled)

- `@nuxt/kit` — module authoring utilities

### Optional Peer Dependencies (user installs what they need)

| Provider   | Peer Dependency       | Why Optional                   |
| ---------- | --------------------- | ------------------------------ |
| SMTP       | `nodemailer`          | Only needed for SMTP provider  |
| SES        | `@aws-sdk/client-ses` | Only needed for AWS SES        |
| All others | None                  | Use `$fetch` directly (no SDK) |

### Dev Dependencies

- `@nuxt/module-builder` — builds the module
- `@nuxt/test-utils` — integration testing
- `@nuxt/eslint-config` — consistent linting
- `vitest` — test runner
- `changelogen` — changelog generation

### Template Rendering

- `@vue/server-renderer` — already available in Nuxt (no extra install)
- Optionally `juice` or similar for CSS inlining

**Key principle:** Resend, SendGrid, Postmark, and Mailgun all have simple REST APIs. Use `$fetch` (already available in Nitro) instead of their official SDKs to avoid bloating the dependency tree. Only SMTP (nodemailer) and SES (@aws-sdk) genuinely need external packages.

---

## 15. Naming & Branding Checklist

- [ ] npm package name: `nuxt-email` (check availability)
- [ ] GitHub repo: `your-org/nuxt-email`
- [ ] Module `meta.name`: `nuxt-email`
- [ ] Module `meta.configKey`: `email`
- [ ] Use "Email for Nuxt" in marketing (not "Email for Nuxt 4")
- [ ] Module icon: `email` or custom SVG
- [ ] `meta.compatibility.nuxt`: `'>=4.0.0'`

---

## 16. Open Questions & Decisions

| #   | Question                                          | Options                                         | Recommended                                       |
| --- | ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| 1   | Template engine                                   | `@vue-email/nuxt` integration vs custom Vue SSR | Custom Vue SSR — fewer deps, more control         |
| 2   | CSS inlining library                              | `juice` vs `inline-css` vs custom               | `juice` — battle-tested, maintained               |
| 3   | Plain text generation                             | `html-to-text` vs regex strip                   | `html-to-text` — handles tables/links properly    |
| 4   | Should the module re-export vue-email components? | Yes (convenience) vs No (keep scope small)      | No — document interop, don't bundle               |
| 5   | Webhook handling (delivery events)                | In scope vs separate module                     | Separate module (`nuxt-email-webhooks`)           |
| 6   | Queue/async sending                               | Built-in vs defer to `nuxt-queue`               | Defer — keep scope focused                        |
| 7   | npm scope                                         | `nuxt-email` vs `@nuxtjs/email`                 | `nuxt-email` — `@nuxtjs` is reserved for official |

---

## 17. Success Criteria

Before v1.0.0 release:

- [ ] All 6 providers work and have tests
- [ ] Template rendering produces email-client-compatible HTML
- [ ] Console provider works out of the box with zero config
- [ ] Preview route works in dev mode
- [ ] DevTools tab shows templates and send log
- [ ] TypeScript types are fully exported and accurate
- [ ] README covers install → first email in under 2 minutes
- [ ] StackBlitz playground works
- [ ] CI passes on Node 20 + 22
- [ ] Test coverage ≥ 80%
- [ ] Zero `any` types in public API
- [ ] Module listed on nuxt.com/modules
