# nuxt-email

Transactional email for Nuxt 4: a provider-agnostic API, Vue-powered templates, and type-safe server composables.

- 📨 **One API, many providers** — Resend, SendGrid, Postmark, SMTP, and a console provider for local dev
- 🧩 **Vue email templates** — author emails as `.vue` files, rendered on the server and CSS-inlined
- 🔒 **Server-only & type-safe** — credentials stay private; `useEmail()` is auto-imported in your server routes
- 📎 **Attachments, CC/BCC, reply-to, headers, tags, and scheduling**
- 🔁 **Automatic retries** on transient failures, plus batch sending with a concurrency limit
- 🛠 **Nuxt DevTools tab** — browse templates, live-preview them, send a test, and watch a send log

## Quick Setup

```bash
npm install nuxt-email
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-email'],
  email: {
    provider: 'console', // logs to the terminal during development
    from: 'App <noreply@myapp.com>',
  },
})
```

Send your first email from any server route:

```ts
// server/api/register.post.ts
export default defineEventHandler(async (event) => {
  const { sendEmail } = useEmail() // auto-imported on the server

  const result = await sendEmail({
    to: 'user@example.com',
    subject: 'Welcome!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  })

  if (!result.success) {
    console.error('Email failed:', result.error)
  }

  return result
})
```

## Providers

All providers share the same API — switch by changing `provider` in `nuxt.config.ts`, no code changes.

| Provider   | Transport          | Extra dependency        |
|------------|--------------------|-------------------------|
| `console`  | Logs to stdout     | —                       |
| `resend`   | REST (`$fetch`)    | —                       |
| `sendgrid` | REST (`$fetch`)    | —                       |
| `postmark` | REST (`$fetch`)    | —                       |
| `smtp`     | `nodemailer`       | `npm install nodemailer` (optional peer dependency) |

The REST providers use Nitro's built-in `$fetch`, so no SDKs are added to your dependency tree. SMTP needs `nodemailer`, which is an optional peer dependency you install only if you use it.

```ts
export default defineNuxtConfig({
  email: {
    provider: 'resend',
    from: 'Acme <hello@acme.com>',
    apiKey: process.env.NUXT_EMAIL_API_KEY,
  },
})
```

```ini
# .env
NUXT_EMAIL_API_KEY=re_your_key_here
```

For SMTP:

```ts
email: {
  provider: 'smtp',
  from: 'Acme <hello@acme.com>',
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: false, // true for port 465
  },
}
```

## Vue email templates

Drop a `.vue` file into `server/emails/` (configurable via `templateDir`) and reference it by filename:

```vue
<!-- server/emails/welcome.vue -->
<script setup lang="ts">
defineProps<{ name: string, verifyUrl: string }>()
</script>

<template>
  <div style="font-family: sans-serif; padding: 24px;">
    <h1>Welcome, {{ name }}!</h1>
    <p>Please confirm your email address.</p>
    <a :href="verifyUrl">Verify</a>
  </div>
</template>
```

```ts
await sendEmail({
  to: user.email,
  subject: 'Welcome to Acme!',
  template: 'welcome',
  props: { name: user.name, verifyUrl: 'https://acme.com/verify?token=abc' },
})
```

The template is rendered to HTML on the server, CSS is inlined for email-client compatibility, and a plain-text fallback is generated automatically. Style with inline `style` attributes or `<style>` blocks inside the `<template>` — SFC `<style>` blocks are stripped during compilation and won't be inlined.

### Preview data

Export `previewProps` from a plain `<script>` block to give the dev preview and DevTools sample data:

```vue
<script lang="ts">
export const previewProps = {
  name: 'Jane Doe',
  verifyUrl: 'https://example.com/verify',
}
</script>
```

## Sending options

```ts
await sendEmail({
  to: ['a@example.com', 'b@example.com'],
  cc: 'manager@example.com',
  bcc: 'audit@example.com',
  replyTo: 'support@example.com',
  from: 'Billing <billing@acme.com>', // overrides the default `from`
  subject: 'Your invoice',
  template: 'invoice',
  props: { total: '$99.00' },
  headers: { 'X-Entity-Ref-Id': 'inv_123' },
  tags: { category: 'billing' },          // resend, sendgrid, postmark
  scheduledAt: new Date(Date.now() + 3600_000), // resend, sendgrid
  attachments: [
    {
      filename: 'invoice.pdf',
      content: pdfBuffer,           // string or Buffer
      contentType: 'application/pdf',
    },
  ],
})
```

Every send returns a structured result (never throws from a provider):

```ts
interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  duration: number // ms
}
```

`tags` and `scheduledAt` are applied by the providers that support them and ignored by the rest.

### Batch sending

```ts
const { sendBatch } = useEmail()

const results = await sendBatch(
  users.map(u => ({ to: u.email, subject: 'Newsletter', template: 'newsletter', props: { name: u.name } })),
  { concurrency: 10 }, // default 5
)

const failed = results.filter(r => !r.success)
```

### Per-call provider override

Override the configured provider for a single send (handy for testing). The override reuses the same credentials, so only providers whose credentials are configured will succeed — `console` always works:

```ts
await sendEmail({ to: 'me@example.com', subject: 'Test', template: 'welcome', props }, { provider: 'console' })
```

## Reliability & validation

- **Retries** — failures that look transient (HTTP 429/5xx, timeouts, connection resets) are retried up to `retries` times with a growing delay. Client errors (4xx) are not retried.
- **Validation** — recipient addresses (`to`/`cc`/`bcc`/`replyTo`) and `from` are validated, `"Name <email>"` form is accepted, and newlines are rejected to prevent header injection. Attachments must have a `filename` and `content`.
- **Prerendering** — sends are skipped during `nuxi generate` / prerendering and return a no-op success.

## DevTools

In dev, an **Email** tab appears in Nuxt DevTools. From it you can browse discovered templates, live-preview them (using their `previewProps`), pick a provider and send a test email, and watch an in-session send log. The panel follows the DevTools light/dark theme.

These dev-only routes back the tab (and are handy on their own):

| Route                          | Purpose                                  |
|--------------------------------|------------------------------------------|
| `GET /_email/preview/:template`| Render a template to HTML                |
| `GET /_email/templates`        | List templates and their preview props   |
| `POST /_email/send-test/:template` | Send a test email                    |
| `GET /_email/log`              | Recent sends from this dev session       |
| `GET /_email/config`           | Configured provider and available list   |

Set `preview: false` to disable them.

## Configuration

| Option        | Type      | Default           | Description                          |
|---------------|-----------|-------------------|--------------------------------------|
| `provider`    | string    | `'console'`       | `console` · `resend` · `sendgrid` · `postmark` · `smtp` |
| `from`        | string    | —                 | Default sender (`"Name <email>"` or `email`) |
| `apiKey`      | string    | —                 | API key for the REST providers       |
| `smtp`        | object    | —                 | `{ host, port?, user?, pass?, secure? }` |
| `templateDir` | string    | `'server/emails'` | Directory scanned for `.vue` templates |
| `preview`     | boolean   | `true`            | Enable dev preview routes + DevTools tab |
| `retries`     | number    | `2`               | Retry attempts on transient failures |
| `retryDelay`  | number    | `1000`            | Base delay between retries (ms)      |

Keep secrets in `.env` and read them via `process.env` in `nuxt.config.ts`, as shown above. Provider credentials live in private runtime config and are never exposed to the client.

## Development

```bash
npm install              # installs deps and builds module stubs
npm run dev              # playground at http://localhost:3000
npm run test:unit        # fast unit tests
npm run test:integration # boots Nuxt, slower
npx tsc --noEmit         # type-check
```

## License

[MIT](./LICENSE)
