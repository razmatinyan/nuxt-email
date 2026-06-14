import { describe, it, expect } from 'vitest'
import { getEmailTemplate, getPreviewProps, listTemplates } from '../../../src/runtime/server/utils/templates.js'

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

describe('getPreviewProps', () => {
  it('returns previewProps for a known template', () => {
    const props = getPreviewProps('welcome')
    expect(props).toEqual({ name: 'Jane Doe' })
  })

  it('returns an empty object for an unknown template', () => {
    const props = getPreviewProps('nonexistent')
    expect(props).toEqual({})
  })
})

describe('listTemplates', () => {
  it('returns an array of template names', () => {
    const names = listTemplates()
    expect(Array.isArray(names)).toBe(true)
    expect(names).toContain('welcome')
  })
})
