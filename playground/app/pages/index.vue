<script setup lang="ts">
type SendResult = {
  success: boolean
  messageId?: string
  provider?: string
  duration?: number
  error?: string
}

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const result = ref<SendResult | null>(null)
const toAddress = ref('test@example.com')
const recipientName = ref('Jane Doe')

async function sendTestEmail() {
  status.value = 'loading'
  result.value = null

  try {
    result.value = await $fetch<SendResult>('/api/send-welcome', {
      method: 'POST',
      body: {
        to: toAddress.value,
        name: recipientName.value,
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
</script>

<template>
  <div class="space-y-6">
    <!-- Send form -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">
        Send a test email
      </h2>
      <p class="text-sm text-gray-500 mb-5">
        Calls
        <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">
          POST /api/send-welcome
        </code>
        using the <strong>ConsoleProvider</strong>.
        Check your terminal for the formatted output.
      </p>

      <div class="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            v-model="toAddress"
            type="email"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="test@example.com"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            v-model="recipientName"
            type="text"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Jane Doe"
          >
        </div>
      </div>

      <button
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="status === 'loading'"
        @click="sendTestEmail"
      >
        <svg
          v-if="status === 'loading'"
          class="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{{ status === 'loading' ? 'Sending…' : 'Send test email' }}</span>
      </button>
    </div>

    <!-- Result -->
    <Transition name="fade">
      <div
        v-if="result"
        class="bg-white rounded-lg border p-6 shadow-sm"
        :class="result.success ? 'border-green-300' : 'border-red-300'"
      >
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base">{{ result.success ? '✅' : '❌' }}</span>
          <h3 class="font-medium text-gray-900">
            {{ result.success ? 'Email accepted by provider' : 'Send failed' }}
          </h3>
          <span
            v-if="result.duration !== undefined"
            class="ml-auto text-xs text-gray-400 font-mono"
          >
            {{ result.duration }}ms
          </span>
        </div>
        <pre class="bg-gray-50 rounded-md p-4 text-xs font-mono text-gray-600 overflow-auto">{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
    </Transition>

    <!-- Info banner -->
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
      <strong class="font-semibold">Phase 1:</strong>
      The ConsoleProvider logs email content to stdout instead of sending it.
      Real provider adapters (Resend, SMTP, SendGrid, Postmark) are implemented in Phase 3.
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
