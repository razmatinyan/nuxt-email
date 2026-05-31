<script setup lang="ts">
defineProps<{
  name: string
  verifyUrl?: string
}>()
</script>

<template>
  <div>
    <h1>Welcome, {{ name }}!</h1>
    <p v-if="verifyUrl">
      <a :href="verifyUrl">Verify your email</a>
    </p>
  </div>
</template>
