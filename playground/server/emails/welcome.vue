<script setup lang="ts">
// Phase 2: Template rendering will be implemented in useEmailRenderer()
// This file establishes the server/emails/ convention for file-based templates.
defineProps<{
  name: string
  verifyUrl?: string
}>()
</script>

<template>
  <div>
    <h1>Welcome, {{ name }}!</h1>
    <p>This template will be rendered server-side in Phase 2.</p>
    <p v-if="verifyUrl">
      <a :href="verifyUrl">Verify your email</a>
    </p>
  </div>
</template>
