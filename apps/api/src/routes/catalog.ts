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

const patchServiceSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  imageUrls: z.array(z.string().url()).max(12).optional(),
  locationCity: z.string().max(200).optional().nullable(),
  radiusMiles: z.number().int().min(1).max(500).optional().nullable(),
  priceMinCents: z.number().int().min(0).optional().nullable(),
  priceMaxCents: z.number().int().min(0).optional().nullable(),
})

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
    const location = query['location']?.trim() ?? ''

    const whereClause = location
      ? sql`${providerProfiles.applicationStatus} = 'approved' and (
          exists (
            select 1 from unnest(${providerProfiles.serviceAreas}) as area
            where area ilike ${'%' + location + '%'}
          )
          or exists (
            select 1 from "provider_services" ps
            where ps.provider_profile_id = ${providerProfiles.id}
            and ps.location_city ilike ${'%' + location + '%'}
          )
        )`
      : eq(providerProfiles.applicationStatus, 'approved')

    const profiles = await db.query.providerProfiles.findMany({
      where: () => whereClause,
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

    const ratingsMap = await getRatingsMap(profiles.map((p) => p.id))

    return reply.send(
      profiles.map((p) => ({
        ...p,
        averageRating: ratingsMap.get(p.id)?.avgRating ?? 0,
        reviewCount: ratingsMap.get(p.id)?.reviewCount ?? 0,
        recommendCount: ratingsMap.get(p.id)?.recommendCount ?? 0,
      }))
    )
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

    const ratingsMap = await getRatingsMap([profile.id])
    const ratingData = ratingsMap.get(profile.id)

    return reply.send({
      ...profile,
      averageRating: ratingData?.avgRating ?? 0,
      reviewCount: ratingData?.reviewCount ?? 0,
      recommendCount: ratingData?.recommendCount ?? 0,
    })
  })

  // POST /catalog/providers/:id/reviews — mothers only
  fastify.post(
    '/catalog/providers/:id/reviews',
    { preHandler: [requireRole('mother')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const body = createReviewSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      const profile = await db.query.providerProfiles.findFirst({
        where: eq(providerProfiles.id, id),
      })

      if (!profile || profile.applicationStatus !== 'approved') {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider not found' })
      }

      const motherId = request.user!.sub

      // Upsert: one review per mother per provider
      const [review] = await db
        .insert(providerReviews)
        .values({
          providerProfileId: id,
          motherId,
          rating: body.data.rating,
          isRecommended: body.data.isRecommended,
          reviewText: body.data.reviewText ?? null,
        })
        .onConflictDoUpdate({
          target: [providerReviews.providerProfileId, providerReviews.motherId],
          set: {
            rating: body.data.rating,
            isRecommended: body.data.isRecommended,
            reviewText: body.data.reviewText ?? null,
          },
        })
        .returning()

      return reply.status(201).send(review)
    }
  )

  // GET /catalog/services/:id — public service detail page
  fastify.get('/catalog/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const service = await db.query.providerServices.findFirst({
      where: eq(providerServices.id, id),
      with: {
        category: true,
        providerProfile: {
          with: {
            user: {
              columns: {
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
              },
            },
          },
        },
      },
    })

    if (!service || service.providerProfile.applicationStatus !== 'approved') {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Service not found' })
    }

    const ratingsMap = await getRatingsMap([service.providerProfileId])
    const ratingData = ratingsMap.get(service.providerProfileId)

    return reply.send({
      ...service,
      providerProfile: {
        ...service.providerProfile,
        averageRating: ratingData?.avgRating ?? 0,
        reviewCount: ratingData?.reviewCount ?? 0,
        recommendCount: ratingData?.recommendCount ?? 0,
      },
    })
  })

  // PATCH /catalog/services/:id — provider updates their own service
  fastify.patch(
    '/catalog/services/:id',
    { preHandler: [requireRole('provider')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const userId = request.user!.sub

      const body = patchServiceSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      // Verify the service belongs to this provider
      const existing = await db.query.providerServices.findFirst({
        where: eq(providerServices.id, id),
        with: { providerProfile: { columns: { id: true, userId: true } } },
      })

      if (!existing || existing.providerProfile.userId !== userId) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Service not found' })
      }

      const updateFields: Record<string, unknown> = {}
      if (body.data.title !== undefined) updateFields.title = body.data.title
      if (body.data.description !== undefined) updateFields.description = body.data.description
      if (body.data.imageUrls !== undefined) updateFields.imageUrls = body.data.imageUrls
      if (body.data.locationCity !== undefined) updateFields.locationCity = body.data.locationCity
      if (body.data.radiusMiles !== undefined) updateFields.radiusMiles = body.data.radiusMiles
      if (body.data.priceMinCents !== undefined) updateFields.priceMinCents = body.data.priceMinCents
      if (body.data.priceMaxCents !== undefined) updateFields.priceMaxCents = body.data.priceMaxCents

      const [updated] = await db
        .update(providerServices)
        .set(updateFields)
        .where(eq(providerServices.id, id))
        .returning()

      return reply.send(updated)
    }
  )
}

export default catalogRoutes
