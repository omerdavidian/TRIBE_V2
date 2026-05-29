import type { FastifyPluginAsync } from 'fastify'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import { registries, supportPages, userFavorites, users } from '../db/schema.js'
import { requireAuth } from '../plugins/auth.js'

const toggleFavoriteBodySchema = z.object({
  supportPageOwnerId: z.string().uuid(),
})

const userPublicColumns = {
  id: true,
  fullName: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  email: false,
  passwordHash: false,
  googleId: false,
  appleId: false,
  emailVerificationToken: false,
  passwordResetToken: false,
} as const

const favoritesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/favorites/ids', { preHandler: requireAuth }, async (request) => {
    const currentUserId = request.user!.sub

    const rows = await db.query.userFavorites.findMany({
      where: eq(userFavorites.userId, currentUserId),
      columns: { supportPageOwnerId: true },
      orderBy: [desc(userFavorites.createdAt)],
    })

    return rows.map((row) => row.supportPageOwnerId)
  })

  fastify.get('/favorites', { preHandler: requireAuth }, async (request) => {
    const currentUserId = request.user!.sub

    const favoriteRows = await db.query.userFavorites.findMany({
      where: eq(userFavorites.userId, currentUserId),
      orderBy: [desc(userFavorites.createdAt)],
      columns: {
        supportPageOwnerId: true,
      },
    })

    if (favoriteRows.length === 0) {
      return []
    }

    const ownerIds = [...new Set(favoriteRows.map((row) => row.supportPageOwnerId))]

    const [ownerUsers, ownerSupportPages, ownerRegistries] = await Promise.all([
      db.query.users.findMany({
        where: inArray(users.id, ownerIds),
        columns: userPublicColumns,
      }),
      db.query.supportPages.findMany({
        where: and(inArray(supportPages.userId, ownerIds), eq(supportPages.isActive, true)),
        columns: {
          userId: true,
          slug: true,
        },
      }),
      db.query.registries.findMany({
        where: and(inArray(registries.userId, ownerIds), eq(registries.isPublished, true)),
        with: {
          items: {
            columns: {
              id: true,
              targetAmountCents: true,
              fundedAmountCents: true,
            },
          },
        },
      }),
    ])

    const ownerUserMap = new Map(ownerUsers.map((user) => [user.id, user]))
    const supportPageMap = new Map(ownerSupportPages.map((page) => [page.userId, page.slug]))

    const aggregateMap = new Map<string, {
      registryCount: number
      totalTargetCents: number
      totalFundedCents: number
      earliestDueDate: string | null
    }>()

    for (const registry of ownerRegistries) {
      const target = registry.items.reduce((sum, item) => sum + item.targetAmountCents, 0)
      const funded = registry.items.reduce((sum, item) => sum + item.fundedAmountCents, 0)
      const dueDateIso = registry.dueDate ? new Date(registry.dueDate as unknown as string).toISOString() : null

      const existing = aggregateMap.get(registry.userId)
      if (!existing) {
        aggregateMap.set(registry.userId, {
          registryCount: 1,
          totalTargetCents: target,
          totalFundedCents: funded,
          earliestDueDate: dueDateIso,
        })
        continue
      }

      let earliestDueDate = existing.earliestDueDate
      if (dueDateIso) {
        if (!earliestDueDate || new Date(dueDateIso).getTime() < new Date(earliestDueDate).getTime()) {
          earliestDueDate = dueDateIso
        }
      }

      aggregateMap.set(registry.userId, {
        registryCount: existing.registryCount + 1,
        totalTargetCents: existing.totalTargetCents + target,
        totalFundedCents: existing.totalFundedCents + funded,
        earliestDueDate,
      })
    }

    return favoriteRows
      .map((row) => row.supportPageOwnerId)
      .filter((ownerId, index, all) => all.indexOf(ownerId) === index)
      .map((ownerId) => {
        const ownerUser = ownerUserMap.get(ownerId)
        if (!ownerUser) return null

        const aggregate = aggregateMap.get(ownerId)

        return {
          userId: ownerId,
          user: ownerUser,
          supportPageSlug: supportPageMap.get(ownerId) ?? null,
          registryCount: aggregate?.registryCount ?? 0,
          totalTargetCents: aggregate?.totalTargetCents ?? 0,
          totalFundedCents: aggregate?.totalFundedCents ?? 0,
          earliestDueDate: aggregate?.earliestDueDate ?? null,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  })

  fastify.post('/favorites/toggle', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = toggleFavoriteBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const currentUserId = request.user!.sub
    const { supportPageOwnerId } = parsed.data

    const supportPage = await db.query.supportPages.findFirst({
      where: and(eq(supportPages.userId, supportPageOwnerId), eq(supportPages.isActive, true)),
      columns: { userId: true },
    })

    if (!supportPage) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Support page not found',
      })
    }

    const existing = await db.query.userFavorites.findFirst({
      where: and(
        eq(userFavorites.userId, currentUserId),
        eq(userFavorites.supportPageOwnerId, supportPageOwnerId)
      ),
      columns: { id: true },
    })

    if (existing) {
      await db.delete(userFavorites).where(eq(userFavorites.id, existing.id))
      return { favorited: false }
    }

    await db.insert(userFavorites).values({
      userId: currentUserId,
      supportPageOwnerId,
    })

    return { favorited: true }
  })
}

export default favoritesRoutes
