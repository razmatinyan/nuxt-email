export function toBase64(content: string | Buffer): string {
	if (Buffer.isBuffer(content)) return content.toString('base64')
	return Buffer.from(content).toString('base64')
}

export function parseAddress(addr: string): { email: string; name?: string } {
	const match = addr.match(/^(.+?)\s*<([^>]+)>$/)
	if (match) return { name: match[1].trim(), email: match[2].trim() }
	return { email: addr.trim() }
}

export function fetchErrorMessage(provider: string, error: unknown): string {
	if (error && typeof error === 'object') {
		const e = error as Record<string, unknown>
		const status = typeof e.status === 'number' ? e.status : undefined
		const data = e.data as Record<string, unknown> | undefined
		const message =
			(typeof data?.message === 'string' && data.message) ||
			(typeof data?.Message === 'string' && data.Message) ||
			(typeof e.message === 'string' && e.message) ||
			'Unknown error'
		if (status !== undefined) {
			return `[nuxt-email] ${provider} API error (${status}): ${message}`
		}
		return `[nuxt-email] ${provider} error: ${message}`
	}
	return `[nuxt-email] ${provider} error: ${String(error)}`
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const result: Partial<T> = {}
	for (const key of Object.keys(obj) as (keyof T)[]) {
		if (obj[key] !== undefined) result[key] = obj[key]
	}
	return result
}
