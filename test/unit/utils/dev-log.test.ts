import { describe, it, expect } from 'vitest'
import { recordSend, getSendLog } from '../../../src/runtime/server/utils/dev-log.js'
import type { SendLogEntry } from '../../../src/runtime/server/utils/dev-log.js'

function makeEntry(id: string): SendLogEntry {
  return {
    id,
    to: ['test@example.com'],
    subject: 'Test',
    success: true,
    provider: 'console',
    duration: 1,
    timestamp: Date.now(),
  }
}

describe('dev-log', () => {
  it('recordSend puts the newest entry first', () => {
    const before = getSendLog().length
    recordSend(makeEntry('first'))
    recordSend(makeEntry('second'))
    const log = getSendLog()
    expect(log[0]!.id).toBe('second')
    expect(log[1]!.id).toBe('first')
    expect(log.length).toBe(before + 2)
  })

  it('getSendLog returns all recorded entries', () => {
    const before = getSendLog().length
    recordSend(makeEntry('check-a'))
    expect(getSendLog().length).toBe(before + 1)
    expect(getSendLog()[0]!.id).toBe('check-a')
  })

  it('caps the log at 50 entries', () => {
    for (let i = 0; i < 60; i++) {
      recordSend(makeEntry(`cap-${i}`))
    }
    expect(getSendLog().length).toBeLessThanOrEqual(50)
  })
})
