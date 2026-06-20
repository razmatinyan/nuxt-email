<script lang="ts">
export const previewProps = {
	name: 'Jane Doe',
	orderNumber: 'ORD-20240615-7842',
	items: [
		{ name: 'Nuxt Pro License', quantity: 1, price: 149 },
		{ name: 'DevTools Extension', quantity: 2, price: 29 },
	],
	subtotal: 207,
	shipping: 0,
	total: 207,
	shippingAddress: '123 Main St, San Francisco, CA 94102',
	trackingUrl: 'https://example.com/track/ORD-20240615-7842',
	appName: 'nuxt-email',
}
</script>

<script setup lang="ts">
export interface OrderItem {
	name: string
	quantity: number
	price: number
}

defineProps<{
	name: string
	orderNumber: string
	items: OrderItem[]
	subtotal: number
	shipping?: number
	total: number
	shippingAddress?: string
	trackingUrl?: string
	appName?: string
}>()

function formatPrice(amount: number) {
	return '$' + amount.toFixed(2)
}
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
									<td style="background-color:#f0fdf4;padding:20px 32px;border-bottom:1px solid #dcfce7;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
											<tbody>
												<tr>
													<td style="vertical-align:middle;">
														<span style="display:inline-block;width:32px;height:32px;background-color:#16a34a;border-radius:50%;text-align:center;line-height:32px;font-size:16px;color:#fff;margin-right:12px;vertical-align:middle;">✓</span>
														<span style="font-size:15px;font-weight:600;color:#15803d;vertical-align:middle;">Order confirmed</span>
													</td>
													<td style="text-align:right;">
														<span style="font-size:12px;color:#166534;font-family:ui-monospace,'Courier New',monospace;">{{ orderNumber }}</span>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td style="padding:32px 32px 24px;">
										<h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.4px;">Thanks for your order, {{ name }}!</h1>
										<p style="margin:0;font-size:15px;line-height:1.65;color:#52525b;">
											We've received your order and are getting it ready. You'll get another email once it ships.
										</p>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px 24px;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
											<thead>
												<tr style="background-color:#fafafa;">
													<th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;border-bottom:1px solid #e4e4e7;">Item</th>
													<th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;border-bottom:1px solid #e4e4e7;">Qty</th>
													<th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;border-bottom:1px solid #e4e4e7;">Price</th>
												</tr>
											</thead>
											<tbody>
												<tr v-for="(item, i) in items" :key="i" :style="i < items.length - 1 ? 'border-bottom:1px solid #f4f4f5;' : ''">
													<td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;">{{ item.name }}</td>
													<td style="padding:12px 16px;font-size:14px;color:#52525b;text-align:center;">{{ item.quantity }}</td>
													<td style="padding:12px 16px;font-size:14px;color:#18181b;text-align:right;font-weight:500;">{{ formatPrice(item.price * item.quantity) }}</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td style="padding:0 32px 28px;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
											<tbody>
												<tr>
													<td style="padding:4px 0;font-size:13px;color:#71717a;">Subtotal</td>
													<td style="padding:4px 0;font-size:13px;color:#52525b;text-align:right;">{{ formatPrice(subtotal) }}</td>
												</tr>
												<tr>
													<td style="padding:4px 0;font-size:13px;color:#71717a;">Shipping</td>
													<td style="padding:4px 0;font-size:13px;color:#52525b;text-align:right;">{{ shipping ? formatPrice(shipping) : 'Free' }}</td>
												</tr>
												<tr>
													<td style="padding:12px 0 0;border-top:1px solid #e4e4e7;">
														<span style="font-size:15px;font-weight:700;color:#18181b;">Total</span>
													</td>
													<td style="padding:12px 0 0;text-align:right;border-top:1px solid #e4e4e7;">
														<span style="font-size:15px;font-weight:700;color:#18181b;">{{ formatPrice(total) }}</span>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr v-if="shippingAddress || trackingUrl">
									<td style="padding:0 32px 28px;">
										<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
											<tbody>
												<tr>
													<td v-if="shippingAddress" style="vertical-align:top;padding-right:16px;width:55%;">
														<p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Shipping to</p>
														<p style="margin:0;font-size:13px;color:#52525b;line-height:1.5;">{{ shippingAddress }}</p>
													</td>
													<td v-if="trackingUrl" style="vertical-align:top;text-align:right;">
														<a
															:href="trackingUrl"
															style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:7px;"
														>
															Track order
														</a>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td style="padding:20px 32px 28px;border-top:1px solid #f4f4f5;">
										<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
											Questions? Reply to this email or contact our support team. This email was sent by {{ appName ?? 'nuxt-email' }} regarding order {{ orderNumber }}.
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
