export default defineEventHandler(async (event) => {
  const body = await readBody<{ to?: string, name?: string }>(event)

  if (!body?.to) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: to' })
  }

  const { sendEmail } = useEmail()

  const result = await sendEmail({
    to: body.to,
    subject: 'Welcome to the playground!',
    template: 'welcome',
    props: {
      name: body.name ?? 'there',
      verifyUrl: 'https://example.com/verify/abc123',
    },
  })

  return result
})
