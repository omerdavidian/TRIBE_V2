import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { motherPaymentAccounts, motherPayouts, users } from '../db/schema.js'
import { env } from '../lib/env.js'
import { requireRole } from '../plugins/auth.js'

type SummaryRow = {
	totalRaisedCents: number
}

const connectPaypalSchema = z.object({
	paypalEmail: z.string().email(),
})

const connectBankSchema = z.object({
	accountLast4: z.string().regex(/^\d{4}$/),
	routingLast4: z.string().regex(/^\d{4}$/),
})

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
	fastify.get('/payments/mother/summary', { preHandler: requireRole('mother') }, async (request) => {
		const motherUserId = request.user!.sub

		const summaryRows = await db.execute(sql`
			select coalesce(sum(d.amount_cents), 0)::int as "totalRaisedCents"
			from donations d
			inner join registries r on r.id = d.registry_id
			where r.user_id = ${motherUserId}
				and d.status = 'succeeded'
		`)
		const summary = (summaryRows as unknown as { rows: SummaryRow[] }).rows?.[0]

		const payoutRows = await db.query.motherPayouts.findMany({
			where: eq(motherPayouts.motherUserId, motherUserId),
			orderBy: [desc(motherPayouts.createdAt)],
			limit: 10,
		})

		const feeCents = Math.round((summary?.totalRaisedCents ?? 0) * 0.03)
		const availableBalanceCents = (summary?.totalRaisedCents ?? 0) - feeCents

		let paymentAccount = await db.query.motherPaymentAccounts.findFirst({
			where: eq(motherPaymentAccounts.motherUserId, motherUserId),
		})

		let stripeStatus = {
			accountId: paymentAccount?.stripeConnectAccountId ?? null,
			onboardingCompleted: paymentAccount?.stripeOnboardingCompleted ?? false,
			chargesEnabled: false,
			payoutsEnabled: false,
			detailsSubmitted: false,
		}

		if (paymentAccount?.stripeConnectAccountId && env.STRIPE_SECRET_KEY) {
			const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
			const account = await stripe.accounts.retrieve(paymentAccount.stripeConnectAccountId)
			const onboardingCompleted = !!account.details_submitted

			stripeStatus = {
				accountId: paymentAccount.stripeConnectAccountId,
				onboardingCompleted,
				chargesEnabled: !!account.charges_enabled,
				payoutsEnabled: !!account.payouts_enabled,
				detailsSubmitted: !!account.details_submitted,
			}

			if (paymentAccount.stripeOnboardingCompleted !== onboardingCompleted) {
				const [updated] = await db
					.update(motherPaymentAccounts)
					.set({
						stripeOnboardingCompleted: onboardingCompleted,
						updatedAt: new Date(),
					})
					.where(eq(motherPaymentAccounts.id, paymentAccount.id))
					.returning()
				paymentAccount = updated
			}
		}

		return {
			metrics: {
				totalRaisedCents: summary?.totalRaisedCents ?? 0,
				feeCents,
				availableBalanceCents: Math.max(availableBalanceCents, 0),
			},
			stripe: stripeStatus,
			paypal: {
				connected: paymentAccount?.paypalConnected ?? false,
				email: paymentAccount?.paypalEmail ?? null,
			},
			bank: {
				connected: paymentAccount?.bankConnected ?? false,
				accountLast4: paymentAccount?.bankAccountLast4 ?? null,
				routingLast4: paymentAccount?.bankRoutingLast4 ?? null,
			},
			payouts: payoutRows.map((row) => ({
				id: row.id,
				amountCents: row.amountCents,
				feeCents: row.feeCents,
				netCents: row.netCents,
				status: row.status,
				settledAt: row.settledAt,
				createdAt: row.createdAt,
			})),
		}
	})

	fastify.post('/payments/mother/connect/stripe/start', { preHandler: requireRole('mother') }, async (request, reply) => {
		if (!env.STRIPE_SECRET_KEY) {
			return reply.status(503).send({
				statusCode: 503,
				error: 'Service Unavailable',
				message: 'Stripe is not configured on the API',
			})
		}

		const motherUserId = request.user!.sub
		const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })

		const [user] = await db
			.select({ email: users.email, fullName: users.fullName })
			.from(users)
			.where(eq(users.id, motherUserId))
			.limit(1)

		if (!user) {
			return reply.status(404).send({
				statusCode: 404,
				error: 'Not Found',
				message: 'Mother account not found',
			})
		}

		let paymentAccount = await db.query.motherPaymentAccounts.findFirst({
			where: eq(motherPaymentAccounts.motherUserId, motherUserId),
		})

		let stripeAccountId = paymentAccount?.stripeConnectAccountId ?? null
		if (!stripeAccountId) {
			const account = await stripe.accounts.create({
				type: 'express',
				country: 'US',
				email: user.email,
				business_type: 'individual',
				metadata: {
					motherUserId,
					source: 'tribe-mother-onboarding',
				},
			})
			stripeAccountId = account.id
		}

		const [upserted] = await db
			.insert(motherPaymentAccounts)
			.values({
				motherUserId,
				stripeConnectAccountId: stripeAccountId,
				defaultCurrency: 'usd',
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: motherPaymentAccounts.motherUserId,
				set: {
					stripeConnectAccountId: stripeAccountId,
					updatedAt: new Date(),
				},
			})
			.returning()

		paymentAccount = upserted

		const accountLink = await stripe.accountLinks.create({
			account: stripeAccountId,
			type: 'account_onboarding',
			refresh_url: `${env.FRONTEND_URL}/dashboard/mother?section=payment&connect=retry`,
			return_url: `${env.FRONTEND_URL}/dashboard/mother?section=payment&connect=success`,
		})

		return {
			accountId: stripeAccountId,
			onboardingUrl: accountLink.url,
			onboardingCompleted: paymentAccount?.stripeOnboardingCompleted ?? false,
		}
	})

	fastify.post('/payments/mother/connect/stripe/dashboard', { preHandler: requireRole('mother') }, async (request, reply) => {
		if (!env.STRIPE_SECRET_KEY) {
			return reply.status(503).send({
				statusCode: 503,
				error: 'Service Unavailable',
				message: 'Stripe is not configured on the API',
			})
		}

		const motherUserId = request.user!.sub
		const paymentAccount = await db.query.motherPaymentAccounts.findFirst({
			where: eq(motherPaymentAccounts.motherUserId, motherUserId),
		})

		if (!paymentAccount?.stripeConnectAccountId) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Stripe is not connected yet',
			})
		}

		const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
		const loginLink = await stripe.accounts.createLoginLink(paymentAccount.stripeConnectAccountId)
		return { dashboardUrl: loginLink.url }
	})

	fastify.post('/payments/mother/connect/paypal', { preHandler: requireRole('mother') }, async (request, reply) => {
		const parsed = connectPaypalSchema.safeParse(request.body)
		if (!parsed.success) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Validation failed',
				errors: parsed.error.flatten().fieldErrors,
			})
		}

		const motherUserId = request.user!.sub
		await db
			.insert(motherPaymentAccounts)
			.values({
				motherUserId,
				paypalEmail: parsed.data.paypalEmail,
				paypalConnected: true,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: motherPaymentAccounts.motherUserId,
				set: {
					paypalEmail: parsed.data.paypalEmail,
					paypalConnected: true,
					updatedAt: new Date(),
				},
			})

		return { connected: true, email: parsed.data.paypalEmail }
	})

	fastify.post('/payments/mother/connect/bank', { preHandler: requireRole('mother') }, async (request, reply) => {
		const parsed = connectBankSchema.safeParse(request.body)
		if (!parsed.success) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Validation failed',
				errors: parsed.error.flatten().fieldErrors,
			})
		}

		const motherUserId = request.user!.sub
		await db
			.insert(motherPaymentAccounts)
			.values({
				motherUserId,
				bankAccountLast4: parsed.data.accountLast4,
				bankRoutingLast4: parsed.data.routingLast4,
				bankConnected: true,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: motherPaymentAccounts.motherUserId,
				set: {
					bankAccountLast4: parsed.data.accountLast4,
					bankRoutingLast4: parsed.data.routingLast4,
					bankConnected: true,
					updatedAt: new Date(),
				},
			})

		return {
			connected: true,
			accountLast4: parsed.data.accountLast4,
			routingLast4: parsed.data.routingLast4,
		}
	})
}

export default paymentRoutes
