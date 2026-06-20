<script lang="ts">
export const previewProps = {
	name: 'Jane Doe',
	verifyUrl: 'https://example.com/verify?token=abc123',
	appName: 'nuxt-email',
}
</script>

<script setup lang="ts">
defineProps<{
	name: string
	verifyUrl?: string
	appName?: string
}>()
</script>

<template>
	<div style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
		<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;">
			<tbody>
				<tr>
					<td style="padding:40px 16px;">
						<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
							<tbody>
								<tr>
									<td style="background-color:#18181b;padding:24px 32px;">
										<span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{ appName ?? 'nuxt-email' }}</span>
									</td>
								</tr>
								<tr>
									<td style="padding:40px 32px 32px;">
										<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Welcome aboard</p>
										<h1 style="margin:0 0 20px;font-size:28px;font-weight:700;line-height:1.2;color:#18181b;letter-spacing:-0.5px;">
											Hi {{ name }}, great to have you!
										</h1>
										<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#52525b;">
											Your account is all set. To get started, please verify your email address. It only takes a second and keeps your account secure.
										</p>
										<a
											v-if="verifyUrl"
											:href="verifyUrl"
											style="display:inline-block;padding:14px 28px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.01em;"
										>
											Verify my email
										</a>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px;">
										<div style="height:1px;background-color:#f4f4f5;"></div>
									</td>
								</tr>
								<tr>
									<td style="padding:28px 32px;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
											<tbody>
												<tr>
													<td style="width:33%;padding-right:12px;vertical-align:top;">
														<p style="margin:0 0 6px;font-size:18px;">✉️</p>
														<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#18181b;">Vue templates</p>
														<p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">Write emails as .vue files with full TypeScript support.</p>
													</td>
													<td style="width:33%;padding:0 6px;vertical-align:top;">
														<p style="margin:0 0 6px;font-size:18px;">🔌</p>
														<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#18181b;">Any provider</p>
														<p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">Resend, SendGrid, Postmark, SMTP and more.</p>
													</td>
													<td style="width:33%;padding-left:12px;vertical-align:top;">
														<p style="margin:0 0 6px;font-size:18px;">🔒</p>
														<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#18181b;">Server-only</p>
														<p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">API keys stay private, never exposed to the client.</p>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td style="padding:20px 32px 28px;border-top:1px solid #f4f4f5;">
										<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
											You received this because you signed up at {{ appName ?? 'nuxt-email' }}. If you didn't create an account, you can safely ignore this email.
										</p>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
