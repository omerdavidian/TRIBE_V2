import type { FastifyPluginAsync } from 'fastify'
import { avg, count, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  serviceCategories,
  providerProfiles,
  providerServices,
  providerReviews,
  users,
} from '../db/schema.js'
import { requireRole } from '../plugins/auth.js'

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  isRecommended: z.boolean(),
  reviewText: z.string().max(2000).optional(),
})

/** Pull avg rating + review/recommendation counts for a list of provider profile IDs */
async function getRatingsMap(profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, { avgRating: number; reviewCount: number; recommendCount: number }>()

  const rows = await db
    .select({
      providerProfileId: providerReviews.providerProfileId,
      avgRating: avg(providerReviews.rating),
      reviewCount: count(providerReviews.id),
      recommendCount: count(
        sql`case when ${providerReviews.isRecommended} = true then 1 end`
      ),
    })
    .from(providerReviews)
    .where(inArray(providerReviews.providerProfileId, profileIds))
    .groupBy(providerReviews.providerProfileId)

  const map = new Map<string, { avgRating: number; reviewCount: number; recommendCount: number }>()
  for (const row of rows) {
    map.set(row.providerProfileId, {
      avgRating: row.avgRating ? parseFloat(row.avgRating) : 0,
      reviewCount: Number(row.reviewCount),
      recommendCount: Number(row.recommendCount),
    })
  }
  return map
}

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /catalog/categories
  fastify.get('/catalog/categories', async (_request, reply) => {
    const categories = await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.isActive, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    })

    return reply.send(categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      iconName: c.iconName,
      sortOrder: c.sortOrder,
    })))
  })

  // GET /catalog/providers, list approved providers
  fastify.get('/catalog/providers', async (request, reply) => {
    const query = request.query as Record<string, string>
    const limit = Math.min(parseInt(query['limit'] ?? '20', 10), 100)
    const offset = parseInt(query['offset'] ?? '0', 10)

    const profiles = await db.query.providerProfiles.findMany({
      where: eq(providerProfiles.applicationStatus, 'approved'),
      limit,
      offset,
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: false,
            passwordHash: false,
            googleId: false,
            appleId: false,
            emailVerificationToken: false,
            passwordResetToken: false,
          },
        },
        services: {
          with: {
            category: true,
          },
        },
      },
    })

    return reply.send(profiles)
  })

  // GET /catalog/providers/:id
  fastify.get('/catalog/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.id, id),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: false,
            passwordHash: false,
            googleId: false,
            appleId: false,
            emailVerificationToken: false,
            passwordResetToken: false,
          },
        },
        services: {
          with: {
            category: true,
          },
        },
      },
    })

    if (!profile || profile.applicationStatus !== 'approved') {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider not found' })
    }

    return reply.send(profile)
  })
}

export default catalogRoutes
