import type { Component } from 'vue'
import { createSSRApp } from '@vue/runtime-dom'
import { renderToString } from '@vue/server-renderer'
import juice from 'juice'

export async function renderEmailTemplate(
  component: Component,
  props: Record<string, unknown> = {},
): Promise<{ html: string, text: string }> {
  const app = createSSRApp(component, props)
  const rendered = await renderToString(app)
  const html = juice(rendered)
  const text = rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return { html, text }
}
