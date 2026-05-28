import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { motherProfiles, users } from '../db/schema.js'
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
