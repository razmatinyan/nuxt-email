import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import type { EmailRuntimeConfig } from '../../types/index.js'
import { VALID_PROVIDERS } from '../utils/providers/index.js'

export default defineEventHandler(() => {
	const config = useRuntimeConfig()._email as EmailRuntimeConfig
	return {
		provider: config.provider,
		providers: VALID_PROVIDERS,
	}
})
