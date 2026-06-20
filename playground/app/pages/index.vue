<script setup lang="ts">
type SendResult = {
  success: boolean
  messageId?: string
  provider?: string
  duration?: number
  error?: string
}

type VerifyResult = {
  ok: boolean
  error?: string
}

const PROVIDERS = ['console', 'resend', 'sendgrid', 'postmark', 'smtp'] as const
const TEMPLATES = ['welcome', 'password-reset', 'order-confirmation'] as const

const SUBJECTS: Record<string, string> = {
  'welcome': 'Welcome to the playground!',
  'password-reset': 'Reset your password',
  'order-confirmation': 'Your order is confirmed',
}

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const result = ref<SendResult | null>(null)
const toAddress = ref('test@example.com')
const recipientName = ref('Jane Doe')
const provider = ref<string>('console')
const template = ref<string>('welcome')

const verifyStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const verifyResult = ref<VerifyResult | null>(null)

// The preview reloads when this changes, so debounce the name to avoid a reload per keystroke.
const previewName = ref(recipientName.value)
let nameTimer: ReturnType<typeof setTimeout> | undefined
watch(recipientName, (value) => {
  clearTimeout(nameTimer)
  nameTimer = setTimeout(() => {
    previewName.value = value
  }, 350)
})

function labelFor(name: string) {
  return name
    .split('-')
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

const previewData = computed<Record<string, Record<string, unknown>>>(() => ({
  'welcome': {
    name: previewName.value,
    verifyUrl: 'https://example.com/verify?token=abc123',
    appName: 'nuxt-email',
  },
  'password-reset': {
    name: previewName.value,
    resetUrl: 'https://example.com/reset?token=xyz789',
    expiresIn: '30 minutes',
    appName: 'nuxt-email',
  },
  'order-confirmation': {
    name: previewName.value,
    orderNumber: 'ORD-20240615-7842',
    items: [
      { name: 'Nuxt Pro License', quantity: 1, price: 149 },
      { name: 'DevTools Extension', quantity: 2, price: 29 },
    ],
    subtotal: 207,
    shipping: 0,
    total: 207,
    shippingAddress: '123 Main St, San Francisco, CA 94102',
    trackingUrl: 'https://example.com/track/ORD-20240615-7842',
    appName: 'nuxt-email',
  },
}))

const previewUrl = computed(() => {
  const props = encodeURIComponent(JSON.stringify(previewData.value[template.value] ?? {}))
  return `/_email/preview/${template.value}?props=${props}`
})

async function sendTestEmail() {
  status.value = 'loading'
  result.value = null

  try {
    result.value = await $fetch<SendResult>('/api/send-welcome', {
      method: 'POST',
      body: {
        to: toAddress.value,
        name: previewName.value,
        provider: provider.value,
        template: template.value,
      },
    })
    status.value = result.value?.success ? 'success' : 'error'
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    result.value = { success: false, error: message }
    status.value = 'error'
  }
}

async function verifyCredentials() {
  verifyStatus.value = 'loading'
  verifyResult.value = null

  try {
    verifyResult.value = await $fetch<VerifyResult>('/api/verify', {
      method: 'POST',
      body: { provider: provider.value },
    })
    verifyStatus.value = verifyResult.value?.ok ? 'success' : 'error'
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    verifyResult.value = { ok: false, error: message }
    verifyStatus.value = 'error'
  }
}
</script>

<template>
  <div>
    <div class="mb-8 max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">
        Send a test email
      </h1>
      <p class="mt-1.5 text-sm leading-relaxed text-zinc-500">
        Pick a template and provider, then send. The panel on the right renders the very same
        Vue template your server would email, updating live as you type.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-5">
        <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-zinc-600">Recipient</label>
              <input
                v-model="toAddress"
                type="email"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="test@example.com"
              >
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-zinc-600">Name</label>
              <input
                v-model="recipientName"
                type="text"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Jane Doe"
              >
            </div>
          </div>

          <div class="mt-4">
            <label class="mb-1.5 block text-xs font-medium text-zinc-600">Template</label>
            <div class="grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
              <button
                v-for="t in TEMPLATES"
                :key="t"
                type="button"
                class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                :class="template === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'"
                @click="template = t"
              >
                {{ labelFor(t) }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <label class="mb-1.5 block text-xs font-medium text-zinc-600">Provider</label>
            <select
              v-model="provider"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option v-for="p in PROVIDERS" :key="p" :value="p">
                {{ p }}
              </option>
            </select>
            <p class="mt-2 text-xs leading-relaxed text-zinc-400">
              <template v-if="provider === 'console'">
                The console provider logs the email to your terminal instead of sending it.
              </template>
              <template v-else>
                Sends real mail. Credentials are read from
                <code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-zinc-600">playground/.env</code>.
              </template>
            </p>
          </div>

          <div class="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="status === 'loading'"
              @click="sendTestEmail"
            >
              <svg v-if="status === 'loading'" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ status === 'loading' ? 'Sending…' : 'Send test email' }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="verifyStatus === 'loading'"
              @click="verifyCredentials"
            >
              <svg v-if="verifyStatus === 'loading'" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ verifyStatus === 'loading' ? 'Verifying…' : 'Verify' }}</span>
            </button>

            <Transition name="fade">
              <span
                v-if="verifyResult"
                class="text-xs font-medium"
                :class="verifyResult.ok ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ verifyResult.ok ? 'Credentials valid' : (verifyResult.error ?? 'Verification failed') }}
              </span>
            </Transition>
          </div>
        </div>

        <Transition name="fade">
          <div
            v-if="result"
            class="rounded-xl border p-5 shadow-sm"
            :class="result.success ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full text-white"
                :class="result.success ? 'bg-emerald-500' : 'bg-red-500'"
              >
                <svg v-if="result.success" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <h3 class="text-sm font-semibold text-zinc-900">
                {{ result.success ? 'Accepted by provider' : 'Send failed' }}
              </h3>
              <span
                v-if="result.duration !== undefined"
                class="ml-auto rounded-full bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200"
              >
                {{ result.duration }}ms
              </span>
            </div>

            <dl class="mt-4 space-y-2 text-xs">
              <div v-if="result.provider" class="flex gap-3">
                <dt class="w-20 shrink-0 text-zinc-400">Provider</dt>
                <dd class="font-medium text-zinc-700">{{ result.provider }}</dd>
              </div>
              <div v-if="result.messageId" class="flex gap-3">
                <dt class="w-20 shrink-0 text-zinc-400">Message ID</dt>
                <dd class="break-all font-mono text-zinc-700">{{ result.messageId }}</dd>
              </div>
              <div v-if="result.error" class="flex gap-3">
                <dt class="w-20 shrink-0 text-zinc-400">Error</dt>
                <dd class="break-words font-medium text-red-700">{{ result.error }}</dd>
              </div>
            </dl>
          </div>
        </Transition>
      </div>

      <div class="lg:sticky lg:top-24 lg:self-start">
        <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div class="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <div class="flex gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-zinc-300" />
              <span class="h-2.5 w-2.5 rounded-full bg-zinc-300" />
              <span class="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            </div>
            <span class="ml-2 truncate text-xs text-zinc-500">{{ SUBJECTS[template] }}</span>
            <span class="ml-auto text-[10px] font-medium uppercase tracking-wide text-zinc-400">Live preview</span>
          </div>
          <iframe
            :src="previewUrl"
            title="Email preview"
            class="h-[560px] w-full bg-white"
          />
        </div>
        <p class="mt-2.5 px-1 text-xs text-zinc-400">
          Rendered by
          <code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-zinc-500">GET /_email/preview/{{ template }}</code>,
          the same renderer used at send time.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
