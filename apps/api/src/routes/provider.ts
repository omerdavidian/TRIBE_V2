import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import {
  providerProfiles,
  providerServices,
  providerOperatingHours,
  serviceCategories,
} from '../db/schema.js'
import { requireRole } from '../plugins/auth.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  serviceAreas: z.array(z.string()).optional(),
  phone: z.string().max(30).optional().nullable(),
  websiteUrl: z.string().url().max(500).optional().nullable(),
  googleReviewUrl: z.string().url().max(500).optional().nullable(),
  instagramUrl: z.string().url().max(500).optional().nullable(),
  facebookUrl: z.string().url().max(500).optional().nullable(),
  attributes: z.array(z.string()).optional(),
})

const serviceEntrySchema = z.object({
  categoryId: z.string().uuid(),
  priceMinCents: z.number().int().nonnegative().nullable().optional(),
  priceMaxCents: z.number().int().nonnegative().nullable().optional(),
  billingFrequency: z.enum(['flat', 'hourly', 'daily', 'weekly']).default('flat'),
  description: z.string().max(1000).optional().nullable(),
})

const updateServicesSchema = z.object({
  services: z.array(serviceEntrySchema),
})

const hourEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean().default(false),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

const updateHoursSchema = z.object({
  hours: z.array(hourEntrySchema),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const providerRoutes: FastifyPluginAsync = async (fastify) => {
  const providerOnly = requireRole('provider')

  // GET /provider/profile, full profile with services and hours
  fastify.get('/provider/profile', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
      with: {
        services: {
          with: { category: true },
        },
        operatingHours: {
          orderBy: (h, { asc }) => [asc(h.dayOfWeek)],
        },
      },
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    return reply.send(profile)
  })

  // PUT /provider/profile, update business info
  fastify.put('/provider/profile', { preHandler: providerOnly }, async (request, reply) => {
    const body = updateProfileSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const [updated] = await db
      .update(providerProfiles)
      .set({
        ...(body.data.businessName !== undefined && { businessName: body.data.businessName }),
        ...(body.data.bio !== undefined && { bio: body.data.bio }),
        ...(body.data.serviceAreas !== undefined && { serviceAreas: body.data.serviceAreas }),
        ...(body.data.phone !== undefined && { phone: body.data.phone }),
        ...(body.data.websiteUrl !== undefined && { websiteUrl: body.data.websiteUrl }),
        ...(body.data.googleReviewUrl !== undefined && { googleReviewUrl: body.data.googleReviewUrl }),
        ...(body.data.instagramUrl !== undefined && { instagramUrl: body.data.instagramUrl }),
        ...(body.data.facebookUrl !== undefined && { facebookUrl: body.data.facebookUrl }),
        ...(body.data.attributes !== undefined && { attributes: body.data.attributes }),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, request.user!.sub))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    return reply.send(updated)
  })

  // GET /catalog/categories, available categories (re-exposed for provider convenience)
  fastify.get('/provider/categories', { preHandler: providerOnly }, async (_request, reply) => {
    const cats = await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.isActive, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    })
    return reply.send(cats)
  })

  // PUT /provider/services, replace full service catalog for this provider
  fastify.put('/provider/services', { preHandler: providerOnly }, async (request, reply) => {
    const body = updateServicesSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    // Delete all existing services for this provider, then re-insert
    await db.delete(providerServices).where(eq(providerServices.providerProfileId, profile.id))

    const inserted = body.data.services.length > 0
      ? await db.insert(providerServices).values(
          body.data.services.map((s) => ({
            providerProfileId: profile.id,
            categoryId: s.categoryId,
            priceMinCents: s.priceMinCents ?? null,
            priceMaxCents: s.priceMaxCents ?? null,
            billingFrequency: s.billingFrequency,
            description: s.description ?? null,
          }))
        ).returning()
      : []

    return reply.send(inserted)
  })

  // GET /provider/hours
  fastify.get('/provider/hours', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    const hours = await db.query.providerOperatingHours.findMany({
      where: eq(providerOperatingHours.providerProfileId, profile.id),
      orderBy: (h, { asc }) => [asc(h.dayOfWeek)],
    })

    return reply.send(hours)
  })

  // PUT /provider/hours, upsert the full week schedule
  fastify.put('/provider/hours', { preHandler: providerOnly }, async (request, reply) => {
    const body = updateHoursSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    // Delete then re-insert for simplicity (avoid complex upsert on composite key)
    await db.delete(providerOperatingHours).where(
      eq(providerOperatingHours.providerProfileId, profile.id)
    )

    const inserted = body.data.hours.length > 0
      ? await db.insert(providerOperatingHours).values(
          body.data.hours.map((h) => ({
            providerProfileId: profile.id,
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: h.openTime ?? null,
            closeTime: h.closeTime ?? null,
          }))
        ).returning()
      : []

    return reply.send(inserted)
  })
}

export default providerRoutes
