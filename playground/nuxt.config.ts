export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@nuxtjs/tailwindcss',
  ],

  email: {
    provider: 'console',
    from: 'Playground <noreply@playground.local>',
    preview: true,
    retries: 1,
    retryDelay: 500,
  },

  devtools: { enabled: true },
})
