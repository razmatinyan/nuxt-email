<script lang="ts">
export const previewProps = {
	name: 'Jane Doe',
	resetUrl: 'https://example.com/reset?token=xyz789',
	expiresIn: '30 minutes',
	appName: 'nuxt-email',
}
</script>

<script setup lang="ts">
defineProps<{
	name: string
	resetUrl: string
	expiresIn?: string
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
									<td style="padding:36px 32px 0;text-align:center;">
										<div style="display:inline-block;width:56px;height:56px;background-color:#fef3c7;border-radius:14px;line-height:56px;font-size:28px;">🔑</div>
									</td>
								</tr>
								<tr>
									<td style="padding:24px 32px 32px;text-align:center;">
										<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.2;color:#18181b;letter-spacing:-0.4px;">
											Password reset request
										</h1>
										<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#52525b;">
											Hi {{ name }}, we received a request to reset the password for your account. Click the button below to choose a new one.
										</p>
										<a
											:href="resetUrl"
											style="display:inline-block;padding:14px 32px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.01em;"
										>
											Reset my password
										</a>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px 28px;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
											<tbody>
												<tr>
													<td style="padding:16px 20px;">
														<p style="margin:0;font-size:13px;color:#52525b;line-height:1.5;">
															This link expires in <strong style="color:#18181b;">{{ expiresIn ?? '30 minutes' }}</strong>. If you didn't request a password reset, you can safely ignore this email and your password won't change.
														</p>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px 12px;">
										<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
											If the button above doesn't work, copy and paste this URL into your browser:
										</p>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px 28px;">
										<p style="margin:0;font-size:12px;color:#71717a;word-break:break-all;font-family:ui-monospace,'Courier New',monospace;background:#f9fafb;padding:10px 14px;border-radius:6px;border:1px solid #e4e4e7;">{{ resetUrl }}</p>
									</td>
								</tr>
								<tr>
									<td style="padding:20px 32px 28px;border-top:1px solid #f4f4f5;">
										<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
											For security, this request was received from {{ appName ?? 'nuxt-email' }}. If you did not make this request, please contact support immediately.
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
