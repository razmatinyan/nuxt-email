import { defineEventHandler } from 'h3'
import { getSendLog } from '../utils/dev-log.js'

export default defineEventHandler(() => {
	return getSendLog()
})
