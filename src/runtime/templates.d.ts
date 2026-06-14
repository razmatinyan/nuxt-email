declare module '#nuxt-email/templates' {
  import type { Component } from 'vue'

  export const templates: Record<string, Component>
  export const previewProps: Record<string, Record<string, unknown>>
}
