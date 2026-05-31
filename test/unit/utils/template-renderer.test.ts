import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { renderEmailTemplate } from '../../../src/runtime/server/utils/template-renderer.js'

describe('renderEmailTemplate', () => {
  it('renders a component with props substituted', async () => {
    const component = defineComponent({
      props: { name: { type: String, required: true } },
      render() { return h('h1', `Hello ${this.name}`) },
    })

    const { html } = await renderEmailTemplate(component, { name: 'Alice' })

    expect(html).toContain('Hello Alice')
    expect(html).toContain('<h1')
  })

  it('extracts a plain-text version by stripping tags', async () => {
    const component = defineComponent({
      render() { return h('div', [h('h1', 'Title'), h('p', 'Body text')]) },
    })

    const { text } = await renderEmailTemplate(component)

    expect(text).toBe('Title Body text')
  })

  it('inlines a <style> block present in the rendered markup', async () => {
    const component = defineComponent({
      render() {
        return h('div', [
          h('style', '.btn { color: red; }'),
          h('a', { class: 'btn' }, 'Click'),
        ])
      },
    })

    const { html } = await renderEmailTemplate(component)

    expect(html).toContain('style="color: red;"')
  })

  it('defaults props to an empty object', async () => {
    const component = defineComponent({
      render() { return h('span', 'static') },
    })

    const { html } = await renderEmailTemplate(component)

    expect(html).toContain('static')
  })
})
