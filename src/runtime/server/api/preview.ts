import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { getEmailTemplate, getPreviewProps } from '../utils/templates.js'
import { renderEmailTemplate } from '../utils/template-renderer.js'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'template') ?? ''
  const query = getQuery(event)
  const props = query.props
    ? JSON.parse(query.props as string) as Record<string, unknown>
    : getPreviewProps(name)
  const { html } = await renderEmailTemplate(getEmailTemplate(name), props)
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})
