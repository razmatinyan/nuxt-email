import { describe, it, expect } from 'vitest'
import { ConsoleProvider } from '../../../src/runtime/server/utils/providers/console.js'

const basePayload = {
  from: 'sender@test.com',
  to: ['recipient@test.com'],
  subject: 'Unit test',
  html: '<p>Hello</p>',
}

describe('ConsoleProvider', () => {
  it('always returns success: true', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send(basePayload)
    expect(result.success).toBe(true)
  })

  it('returns provider name "console"', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send(basePayload)
    expect(result.provider).toBe('console')
  })

  it('returns a non-empty messageId string', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send(basePayload)
    expect(typeof result.messageId).toBe('string')
    expect(result.messageId!.length).toBeGreaterThan(0)
  })

  it('returns a numeric duration', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send(basePayload)
    expect(typeof result.duration).toBe('number')
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('verify() returns true', async () => {
    const provider = new ConsoleProvider()
    expect(await provider.verify!()).toBe(true)
  })

  it('handles multiple recipients', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send({
      ...basePayload,
      to: ['a@test.com', 'b@test.com', 'c@test.com'],
    })
    expect(result.success).toBe(true)
  })

  it('handles all optional fields without error', async () => {
    const provider = new ConsoleProvider()
    const result = await provider.send({
      ...basePayload,
      text: 'Hello plain',
      cc: ['cc@test.com'],
      bcc: ['bcc@test.com'],
      replyTo: 'reply@test.com',
      tags: { campaign: 'welcome' },
      attachments: [{ filename: 'file.txt', content: 'data' }],
    })
    expect(result.success).toBe(true)
  })
})
