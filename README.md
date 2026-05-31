# nuxt-email

Transactional email for Nuxt 4 — multi-provider support, Vue templates, and type-safe composables.

> **Status:** Phase 1 — Foundation. ConsoleProvider is functional. Real provider adapters land in Phase 3.

## Quick Setup

```bash
npm install nuxt-email
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-email'],
  email: {
    provider: 'console', // logs to terminal; swap for 'resend', 'smtp', etc. in Phase 3
    from: 'App <noreply@myapp.com>',
  },
})
```

## Usage

```typescript
// server/api/register.post.ts
export default defineEventHandler(async (event) => {
  const { sendEmail } = useEmail() // auto-imported on server

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

| Provider | Status       |
|----------|--------------|
| console  | ✅ Phase 1   |
| resend   | 🔜 Phase 3  |
| sendgrid | 🔜 Phase 3  |
| postmark | 🔜 Phase 3  |
| smtp     | 🔜 Phase 3  |

## Development

```bash
# Install dependencies and build stubs
npm install

# Run playground (http://localhost:3000)
npm run dev

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

## Configuration

| Option        | Type     | Default          | Description                              |
|---------------|----------|------------------|------------------------------------------|
| `provider`    | string   | `'console'`      | Email provider                           |
| `from`        | string   | —                | Default sender address                   |
| `apiKey`      | string   | —                | Provider API key (prefer env var)        |
| `retries`     | number   | `2`              | Retry attempts on transient failures     |
| `retryDelay`  | number   | `1000`           | Delay between retries (ms)               |
| `templateDir` | string   | `'server/emails'`| Vue template directory (Phase 2+)        |
| `preview`     | boolean  | `true`           | Enable preview route in dev (Phase 2+)   |

Set `NUXT_EMAIL_API_KEY` as an environment variable to override `apiKey` at runtime.

## License

MIT
