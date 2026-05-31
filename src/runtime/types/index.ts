// ── Module Options (nuxt.config.ts) ──────────────────────────────────────────

export interface EmailModuleOptions {
  /** Email provider. Default: 'console' (logs to terminal) */
  provider: 'resend' | 'sendgrid' | 'postmark' | 'smtp' | 'console'

  /** Default sender address: "Name <email>" or "email" */
  from?: string

  /** Provider API key (prefer env vars via runtimeConfig) */
  apiKey?: string

  /** SMTP-specific config */
  smtp?: SmtpConfig

  /** Directory for Vue email templates relative to project root. Default: 'server/emails' */
  templateDir?: string

  /** Enable preview route in dev mode. Default: true */
  preview?: boolean

  /** Number of retry attempts on transient failures. Default: 2 */
  retries?: number

  /** Delay between retries in ms. Default: 1000 */
  retryDelay?: number
}

export interface SmtpConfig {
  host: string
  port?: number
  user?: string
  pass?: string
  secure?: boolean
}

// ── Internal Runtime Config ───────────────────────────────────────────────────
// Stored in nuxt.options.runtimeConfig._email — private, never serialized to client

export interface EmailRuntimeConfig {
  provider: string
  apiKey: string
  from: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  retries: number
  retryDelay: number
}

// ── Email Payload ─────────────────────────────────────────────────────────────

export interface EmailPayload {
  /** Recipient(s) */
  to: string | string[]

  /** Subject line */
  subject: string

  /** Pre-compiled HTML body (mutually exclusive with `template`) */
  html?: string

  /** Plain text fallback */
  text?: string

  /** Template name — filename without extension from templateDir (Phase 2+) */
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

// ── Email Response ────────────────────────────────────────────────────────────

export interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  duration: number
}

// ── Provider Adapter Interface ────────────────────────────────────────────────

export interface EmailProvider {
  name: string
  send(payload: NormalizedPayload): Promise<EmailResponse>
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
