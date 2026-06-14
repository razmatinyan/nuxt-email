export interface SendLogEntry {
	id: string
	template?: string
	to: string[]
	subject: string
	success: boolean
	messageId?: string
	error?: string
	provider: string
	duration: number
	timestamp: number
}

const log: SendLogEntry[] = []

export function recordSend(entry: SendLogEntry): void {
	log.unshift(entry)
	if (log.length > 50) log.length = 50
}

export function getSendLog(): SendLogEntry[] {
	return log
}
