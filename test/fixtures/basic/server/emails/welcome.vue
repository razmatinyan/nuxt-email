<script lang="ts">
export const previewProps = {
  name: 'Jane Doe',
}
</script>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <div>Welcome, {{ name }}!</div>
</template>
