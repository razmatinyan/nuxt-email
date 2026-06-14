import { h } from 'vue'

export const templates = {
  welcome: {
    props: ['name'],
    render(this: { name?: string }) {
      return h('div', `Welcome ${this.name}`)
    },
  },
}

export const previewProps: Record<string, Record<string, unknown>> = {
  welcome: { name: 'Jane Doe' },
}
