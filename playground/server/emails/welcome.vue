<script setup lang="ts">
defineProps<{
	name: string
	verifyUrl?: string
}>()
</script>

<template>
	<div
		style="
			margin: 0;
			padding: 24px;
			background-color: #f4f4f5;
			font-family: Arial, Helvetica, sans-serif;
		"
	>
		<table
			role="presentation"
			cellpadding="0"
			cellspacing="0"
			width="100%"
			style="
				max-width: 480px;
				margin: 0 auto;
				background-color: #ffffff;
				border-radius: 8px;
			"
		>
			<tbody>
				<tr>
					<td style="padding: 32px">
						<h1
							style="
								margin: 0 0 16px;
								font-size: 22px;
								color: #18181b;
							"
						>
							Welcome, {{ name }}!
						</h1>
						<p
							style="
								margin: 0 0 24px;
								font-size: 15px;
								line-height: 1.6;
								color: #3f3f46;
							"
						>
							Thanks for trying out <strong>nuxt-email</strong>.
							This message was rendered from a Vue template on the
							server.
						</p>
						<a
							v-if="verifyUrl"
							:href="verifyUrl"
							style="
								display: inline-block;
								padding: 12px 20px;
								background-color: #18181b;
								color: #ffffff;
								font-size: 14px;
								text-decoration: none;
								border-radius: 6px;
							"
						>
							Verify your email
						</a>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
