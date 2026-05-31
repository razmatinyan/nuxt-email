export interface EmailModuleOptions {
  /** Email provider. Default: 'console' (logs to terminal) */
  provider: 'resend' | 'sendgrid' | 'postmark' | 'smtp' | 'console'

  /** Default sender address: "Name <email>" or "email" */
  from?: string

  /** Provider API key (prefer env vars via runtimeConfig) */
  apiKey?: string

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

/** Stored in runtimeConfig._email — private, never serialized to the client */
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

export interface EmailPayload {
  to: string | string[]
  subject: string

  /** Mutually exclusive with `template` */
  html?: string

  text?: string
  template?: string
  props?: Record<string, unknown>
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: EmailAttachment[]
  headers?: Record<string, string>

  /** Provider must support scheduled sends */
  scheduledAt?: Date

  /** Provider-dependent */
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

export interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  duration: number
}

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
