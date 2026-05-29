import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { and, asc, desc, eq, gte } from 'drizzle-orm'
import { db } from '../db/client.js'
import {
	donations,
	motherPaymentAccounts,
	motherProfiles,
	motherPayouts,
	registries,
	registryItems,
	serviceSignups,
	users,
} from '../db/schema.js'
import { requireRole } from '../plugins/auth.js'

const updateMotherProfileSchema = z.object({
	fullName: z.string().min(1).max(120).optional(),
	firstName: z.string().min(1).max(60).optional(),
	lastName: z.string().min(1).max(60).optional(),
	email: z.string().email().optional(),
	avatarUrl: z.string().url().nullable().optional(),
	phone: z.string().max(40).optional(),
	addressStreet: z.string().max(160).optional(),
	addressCity: z.string().max(80).optional(),
	addressState: z.string().max(80).optional(),
	addressZip: z.string().max(20).optional(),
	instagramUrl: z.string().url().nullable().optional(),
	facebookUrl: z.string().url().nullable().optional(),
	tiktokUrl: z.string().url().nullable().optional(),
	websiteUrl: z.string().url().nullable().optional(),
})

const motherRoutes: FastifyPluginAsync = async (fastify) => {
	fastify.get('/mother/dashboard-overview', { preHandler: requireRole('mother') }, async (request) => {
		const motherUserId = request.user!.sub

		const completedDonations = await db
			.select({
				amountCents: donations.amountCents,
				createdAt: donations.createdAt,
			})
			.from(donations)
			.innerJoin(registries, eq(donations.registryId, registries.id))
			.where(
				and(
					eq(registries.userId, motherUserId),
					eq(donations.status, 'completed')
				)
			)

		const totalRaisedCents = completedDonations.reduce(
			(sum, row) => sum + row.amountCents,
			0
		)

		const pendingPayoutRows = await db
			.select({ netCents: motherPayouts.netCents })
			.from(motherPayouts)
			.where(
				and(
					eq(motherPayouts.motherUserId, motherUserId),
					eq(motherPayouts.status, 'pending')
				)
			)
		const pendingPayoutCents = pendingPayoutRows.reduce(
			(sum, row) => sum + row.netCents,
			0
		)

		const today = new Date()
		const velocity = Array.from({ length: 6 }).map((_, idx) => {
			const weekStart = new Date(today)
			weekStart.setDate(today.getDate() - (5 - idx) * 7)
			weekStart.setHours(0, 0, 0, 0)
			const weekEnd = new Date(weekStart)
			weekEnd.setDate(weekStart.getDate() + 6)
			weekEnd.setHours(23, 59, 59, 999)
			const amountCents = completedDonations
				.filter((row) => {
					const ts = new Date(row.createdAt)
					return ts >= weekStart && ts <= weekEnd
				})
				.reduce((sum, row) => sum + row.amountCents, 0)
			return {
				label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				amountCents,
			}
		})

		const upcomingSignups = await db
			.select({
				id: serviceSignups.id,
				scheduledFor: serviceSignups.scheduledFor,
				volunteerName: serviceSignups.volunteerName,
				volunteerEmail: serviceSignups.volunteerEmail,
				itemTitle: registryItems.title,
				registryTitle: registries.title,
			})
			.from(serviceSignups)
			.innerJoin(registryItems, eq(serviceSignups.registryItemId, registryItems.id))
			.innerJoin(registries, eq(serviceSignups.registryId, registries.id))
			.where(
				and(
					eq(serviceSignups.motherUserId, motherUserId),
					gte(serviceSignups.scheduledFor, new Date())
				)
			)
			.orderBy(asc(serviceSignups.scheduledFor))
			.limit(5)

		const itemRows = await db
			.select({
				paymentType: registryItems.paymentType,
				targetAmountCents: registryItems.targetAmountCents,
				fundedAmountCents: registryItems.fundedAmountCents,
				quantityRequested: registryItems.quantityRequested,
				quantityFulfilled: registryItems.quantityFulfilled,
			})
			.from(registryItems)
			.innerJoin(registries, eq(registryItems.registryId, registries.id))
			.where(eq(registries.userId, motherUserId))

		const openCommunityNeeds = itemRows.filter(
			(row) =>
				row.paymentType === 'community' &&
				row.quantityRequested !== null &&
				row.quantityRequested > row.quantityFulfilled
		).length

		const underFundedMonetary = itemRows.filter(
			(row) =>
				row.paymentType === 'monetary' &&
				row.fundedAmountCents < row.targetAmountCents
		).length

		const paidOutRows = await db
			.select({ netCents: motherPayouts.netCents })
			.from(motherPayouts)
			.where(
				and(
					eq(motherPayouts.motherUserId, motherUserId),
					eq(motherPayouts.status, 'paid')
				)
			)
		const totalPaidOutCents = paidOutRows.reduce(
			(sum, row) => sum + row.netCents,
			0
		)

		const paymentAccount = await db.query.motherPaymentAccounts.findFirst({
			where: eq(motherPaymentAccounts.motherUserId, motherUserId),
			columns: {
				stripeOnboardingCompleted: true,
				paypalConnected: true,
				bankConnected: true,
			},
		})

		const insights: string[] = []
		if (openCommunityNeeds > 0) {
			insights.push(
				`${openCommunityNeeds} community care item${openCommunityNeeds === 1 ? '' : 's'} still need volunteer coverage.`
			)
		}
		if (underFundedMonetary > 0) {
			insights.push(
				`${underFundedMonetary} monetary item${underFundedMonetary === 1 ? '' : 's'} are still under-funded.`
			)
		}
		if (
			!paymentAccount?.stripeOnboardingCompleted &&
			!paymentAccount?.paypalConnected &&
			!paymentAccount?.bankConnected
		) {
			insights.push('Connect a payout account to unlock faster disbursements.')
		}

		return {
			financial: {
				totalRaisedCents,
				totalPaidOutCents,
				pendingPayoutCents,
				velocity,
			},
			communityTimeline: upcomingSignups,
			insights,
		}
	})

	fastify.get('/mother/profile', { preHandler: requireRole('mother') }, async (request) => {
		const motherUserId = request.user!.sub

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				fullName: users.fullName,
				firstName: users.firstName,
				lastName: users.lastName,
				avatarUrl: users.avatarUrl,
			})
			.from(users)
			.where(eq(users.id, motherUserId))
			.limit(1)

		const profile = await db.query.motherProfiles.findFirst({
			where: eq(motherProfiles.userId, motherUserId),
		})

		return {
			user,
			profile,
		}
	})

	fastify.patch('/mother/profile', { preHandler: requireRole('mother') }, async (request, reply) => {
		const parsed = updateMotherProfileSchema.safeParse(request.body)
		if (!parsed.success) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Validation failed',
				errors: parsed.error.flatten().fieldErrors,
			})
		}

		const motherUserId = request.user!.sub
		const payload = parsed.data

		const userPatch: Partial<typeof users.$inferInsert> = {}
		if (payload.fullName !== undefined) userPatch.fullName = payload.fullName
		if (payload.firstName !== undefined) userPatch.firstName = payload.firstName
		if (payload.lastName !== undefined) userPatch.lastName = payload.lastName
		if (payload.email !== undefined) userPatch.email = payload.email
		if (payload.avatarUrl !== undefined) userPatch.avatarUrl = payload.avatarUrl

		if (Object.keys(userPatch).length > 0) {
			await db.update(users).set(userPatch).where(eq(users.id, motherUserId))
		}

		await db
			.insert(motherProfiles)
			.values({
				userId: motherUserId,
				phone: payload.phone,
				addressStreet: payload.addressStreet,
				addressCity: payload.addressCity,
				addressState: payload.addressState,
				addressZip: payload.addressZip,
				instagramUrl: payload.instagramUrl ?? null,
				facebookUrl: payload.facebookUrl ?? null,
				tiktokUrl: payload.tiktokUrl ?? null,
				websiteUrl: payload.websiteUrl ?? null,
			})
			.onConflictDoUpdate({
				target: motherProfiles.userId,
				set: {
					phone: payload.phone,
					addressStreet: payload.addressStreet,
					addressCity: payload.addressCity,
					addressState: payload.addressState,
					addressZip: payload.addressZip,
					instagramUrl: payload.instagramUrl ?? null,
					facebookUrl: payload.facebookUrl ?? null,
					tiktokUrl: payload.tiktokUrl ?? null,
					websiteUrl: payload.websiteUrl ?? null,
					updatedAt: new Date(),
				},
			})

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				fullName: users.fullName,
				firstName: users.firstName,
				lastName: users.lastName,
				avatarUrl: users.avatarUrl,
			})
			.from(users)
			.where(eq(users.id, motherUserId))
			.limit(1)

		const profile = await db.query.motherProfiles.findFirst({
			where: eq(motherProfiles.userId, motherUserId),
		})

		return {
			user,
			profile,
		}
	})
}

export default motherRoutes
