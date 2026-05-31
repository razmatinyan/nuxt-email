import { h } from 'vue'

export const templates = {
  welcome: {
    props: ['name'],
    render(this: { name?: string }) {
      return h('div', `Welcome ${this.name}`)
    },
  },
}
