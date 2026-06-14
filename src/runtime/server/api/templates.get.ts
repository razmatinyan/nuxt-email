import { defineEventHandler } from 'h3'
import { listTemplates, getPreviewProps } from '../utils/templates.js'

export default defineEventHandler(() => {
	return listTemplates().map(name => ({ name, previewProps: getPreviewProps(name) }))
})
