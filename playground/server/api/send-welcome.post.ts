export default defineEventHandler(async (event) => {
  const body = await readBody<{ to?: string, name?: string }>(event)

  if (!body?.to) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: to' })
  }

  const { sendEmail } = useEmail()

  const result = await sendEmail({
    to: body.to,
    subject: 'Welcome to the playground!',
    html: `<h1>Hello, ${body.name ?? 'there'}!</h1><p>This is a test email from the <strong>nuxt-email</strong> playground using the ConsoleProvider.</p>`,
    text: `Hello, ${body.name ?? 'there'}! This is a test email from the nuxt-email playground.`,
  })

  return result
})
