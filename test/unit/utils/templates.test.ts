import { describe, it, expect } from 'vitest'
import { getEmailTemplate } from '../../../src/runtime/server/utils/templates.js'

describe('getEmailTemplate', () => {
  it('returns a registered template component', () => {
    const component = getEmailTemplate('welcome')
    expect(component).toBeDefined()
  })

  it('throws with the available list when the template is missing', () => {
    expect(() => getEmailTemplate('missing'))
      .toThrow('[nuxt-email] Template "missing" not found. Available: welcome')
  })
})
