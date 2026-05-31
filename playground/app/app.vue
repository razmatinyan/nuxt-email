<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="max-w-2xl mx-auto flex items-center gap-3">
        <span class="text-xl font-bold text-blue-600">✉</span>
        <h1 class="text-xl font-semibold text-gray-900">nuxt-email</h1>
        <span class="text-gray-300">|</span>
        <span class="text-sm text-gray-500">playground</span>
        <span class="ml-auto text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
          ConsoleProvider
        </span>
      </div>
    </header>
    <main class="max-w-2xl mx-auto px-6 py-10">
      <NuxtPage />
    </main>
  </div>
</template>
