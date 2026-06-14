import { describe, it, expect } from 'vitest'
import {
	toBase64,
	parseAddress,
	fetchErrorMessage,
	omitUndefined,
} from '../../../src/runtime/server/utils/providers/shared.js'

describe('toBase64', () => {
	it('encodes a string', () => {
		expect(toBase64('hello')).toBe(Buffer.from('hello').toString('base64'))
	})

	it('encodes a Buffer', () => {
		const buf = Buffer.from('world')
		expect(toBase64(buf)).toBe(buf.toString('base64'))
	})
})

describe('parseAddress', () => {
	it('extracts email and name from "Name <email>"', () => {
		expect(parseAddress('Alice Smith <alice@test.com>')).toEqual({
			name: 'Alice Smith',
			email: 'alice@test.com',
		})
	})

	it('returns just email when no name bracket', () => {
		expect(parseAddress('bob@test.com')).toEqual({ email: 'bob@test.com' })
	})

	it('trims whitespace', () => {
		expect(parseAddress('  carol@test.com  ')).toEqual({ email: 'carol@test.com' })
	})
})

describe('fetchErrorMessage', () => {
	it('includes status code and message from an ofetch-like error object', () => {
		const err = { status: 429, data: { message: 'Too Many Requests' } }
		const msg = fetchErrorMessage('Resend', err)
		expect(msg).toContain('429')
		expect(msg).toContain('Too Many Requests')
		expect(msg).toContain('[nuxt-email]')
	})

	it('includes status 500 in the message for transient detection', () => {
		const err = { status: 500, data: { message: 'Internal Server Error' } }
		const msg = fetchErrorMessage('SendGrid', err)
		expect(msg).toContain('500')
	})

	it('falls back to error.message when no status', () => {
		const err = new Error('connection refused')
		const msg = fetchErrorMessage('Postmark', err)
		expect(msg).toContain('connection refused')
		expect(msg).toContain('[nuxt-email]')
	})

	it('handles non-object errors', () => {
		const msg = fetchErrorMessage('SMTP', 'some string error')
		expect(msg).toContain('some string error')
	})

	it('prefers data.Message (capital M) for Postmark-style errors', () => {
		const err = { status: 422, data: { ErrorCode: 300, Message: 'Invalid email' } }
		const msg = fetchErrorMessage('Postmark', err)
		expect(msg).toContain('422')
		expect(msg).toContain('Invalid email')
	})
})

describe('omitUndefined', () => {
	it('removes keys with undefined values', () => {
		const result = omitUndefined({ a: 1, b: undefined, c: 'x' })
		expect(result).toEqual({ a: 1, c: 'x' })
		expect('b' in result).toBe(false)
	})

	it('keeps null and false and 0', () => {
		const result = omitUndefined({ a: null, b: false, c: 0 } as Record<string, unknown>)
		expect(result).toEqual({ a: null, b: false, c: 0 })
	})
})
