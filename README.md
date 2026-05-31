# nuxt-email

Transactional email for Nuxt 4 — multi-provider support, Vue templates, and type-safe composables.

## Quick Setup

```bash
npm install nuxt-email
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-email'],
  email: {
    provider: 'console', // logs to terminal during development
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

| Provider | Status      |
|----------|-------------|
| console  | Available   |
| resend   | Coming soon |
| sendgrid | Coming soon |
| postmark | Coming soon |
| smtp     | Coming soon |

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

| Option        | Type     | Default           | Description                           |
|---------------|----------|-------------------|---------------------------------------|
| `provider`    | string   | `'console'`       | Email provider                        |
| `from`        | string   | —                 | Default sender address                |
| `apiKey`      | string   | —                 | Provider API key (prefer env var)     |
| `retries`     | number   | `2`               | Retry attempts on transient failures  |
| `retryDelay`  | number   | `1000`            | Delay between retries (ms)            |
| `templateDir` | string   | `'server/emails'` | Vue template directory                |
| `preview`     | boolean  | `true`            | Enable preview route in dev           |

Set `NUXT_EMAIL_API_KEY` as an environment variable to override `apiKey` at runtime.

## License

MIT
