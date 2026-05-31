import type { Component } from 'vue'
import { templates } from '#nuxt-email/templates'

export function getEmailTemplate(name: string): Component {
  const component = templates[name]
  if (!component) {
    const available = Object.keys(templates).join(', ') || 'none'
    throw new Error(`[nuxt-email] Template "${name}" not found. Available: ${available}`)
  }
  return component
}
