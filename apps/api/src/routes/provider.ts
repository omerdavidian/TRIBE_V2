import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { db } from '../db/client.js'
import {
  providerProfiles,
  providerServices,
  providerOperatingHours,
  serviceCategories,
  platformSettings,
} from '../db/schema.js'
import { requireRole } from '../plugins/auth.js'
import { env } from '../lib/env.js'

// ─── URL normalization ────────────────────────────────────────────────────────

/** Add https:// if no scheme; upgrade http:// to https://. Returns null for empty input. */
function normalizeUrl(v: string | null | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  if (!t) return null
  if (t.startsWith('https://')) return t
  if (t.startsWith('http://')) return t.replace('http://', 'https://')
  return `https://${t}`
}

/** Optional nullable URL field that auto-normalizes to https://. */
const urlField = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeUrl(v) : v),
  z.string().url({ message: 'Invalid URL — enter a valid domain (e.g. example.com)' }).max(500).nullable().optional()
)

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  // Business (public-facing)
  businessName: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  businessAddress: z.string().max(300).optional().nullable(),
  serviceAreas: z.array(z.string()).optional(),
  phone: z.string().max(30).optional().nullable(),
  websiteUrl: urlField,
  googleReviewUrl: urlField,
  instagramUrl: urlField,
  facebookUrl: urlField,
  attributes: z.array(z.string()).optional(),
  // Personal (admin-only / internal)
  ownerName: z.string().max(120).optional().nullable(),
  ownerDirectEmail: z.string().email().max(200).optional().nullable(),
  ownerDirectPhone: z.string().max(30).optional().nullable(),
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

  // GET /provider/profile — full profile with services and hours
  fastify.get('/provider/profile', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
      with: {
        services: { with: { category: true } },
        operatingHours: { orderBy: (h, { asc }) => [asc(h.dayOfWeek)] },
      },
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    return reply.send(profile)
  })

  // PUT /provider/profile — update business + personal info
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
        ...(body.data.businessAddress !== undefined && { businessAddress: body.data.businessAddress }),
        ...(body.data.serviceAreas !== undefined && { serviceAreas: body.data.serviceAreas }),
        ...(body.data.phone !== undefined && { phone: body.data.phone }),
        ...(body.data.websiteUrl !== undefined && { websiteUrl: body.data.websiteUrl }),
        ...(body.data.googleReviewUrl !== undefined && { googleReviewUrl: body.data.googleReviewUrl }),
        ...(body.data.instagramUrl !== undefined && { instagramUrl: body.data.instagramUrl }),
        ...(body.data.facebookUrl !== undefined && { facebookUrl: body.data.facebookUrl }),
        ...(body.data.attributes !== undefined && { attributes: body.data.attributes }),
        ...(body.data.ownerName !== undefined && { ownerName: body.data.ownerName }),
        ...(body.data.ownerDirectEmail !== undefined && { ownerDirectEmail: body.data.ownerDirectEmail }),
        ...(body.data.ownerDirectPhone !== undefined && { ownerDirectPhone: body.data.ownerDirectPhone }),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, request.user!.sub))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    return reply.send(updated)
  })

  // GET /provider/categories — available categories (convenience re-export)
  fastify.get('/provider/categories', { preHandler: providerOnly }, async (_request, reply) => {
    const cats = await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.isActive, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    })
    return reply.send(cats)
  })

  // PUT /provider/services — replace full service catalog for this provider
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

  // PUT /provider/hours — upsert full week schedule
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

  // ─── Commission rate ──────────────────────────────────────────────────────

  /** GET /provider/commission-rate — current platform commission rate (0–1 float) */
  fastify.get('/provider/commission-rate', { preHandler: providerOnly }, async (_request, reply) => {
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, 'provider_commission_rate'))
      .limit(1)

    const rate = row ? parseFloat(row.value) : 0.05
    return reply.send({ rate: isNaN(rate) ? 0.05 : rate })
  })

  // ─── Stripe Connect ───────────────────────────────────────────────────────

  /** POST /provider/stripe/connect — create / resume Stripe Express onboarding */
  fastify.post('/provider/stripe/connect', { preHandler: providerOnly }, async (request, reply) => {
    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Stripe is not configured on this environment' })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
    const userId = request.user!.sub

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, userId),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    try {
      let stripeAccountId = profile.stripeAccountId

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: { transfers: { requested: true } },
          business_type: 'individual',
          settings: { payouts: { schedule: { interval: 'weekly', weekly_anchor: 'friday' } } },
        })
        stripeAccountId = account.id

        await db
          .update(providerProfiles)
          .set({ stripeAccountId, updatedAt: new Date() })
          .where(eq(providerProfiles.userId, userId))
      }

      const origin = (request.headers['origin'] as string | undefined) ?? env.FRONTEND_URL
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/dashboard/provider?section=payments&stripe=refresh`,
        return_url: `${origin}/dashboard/provider?section=payments&stripe=success`,
        type: 'account_onboarding',
      })

      return reply.send({
        url: accountLink.url,
        accountId: stripeAccountId,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
      })
    } catch (error) {
      fastify.log.error({ error, userId }, 'Stripe Connect onboarding failed')
      return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create Stripe Connect link' })
    }
  })

  /** GET /provider/stripe/connect/status — returns current Stripe Connect state */
  fastify.get('/provider/stripe/connect/status', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    let stripeStatus = {
      accountId: profile.stripeAccountId ?? null,
      onboardingCompleted: profile.stripeOnboardingCompleted,
      chargesEnabled: false,
      payoutsEnabled: false,
    }

    if (profile.stripeAccountId && env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
        const account = await stripe.accounts.retrieve(profile.stripeAccountId)
        const onboardingCompleted = account.details_submitted && (account.charges_enabled ?? false)

        stripeStatus = {
          accountId: profile.stripeAccountId,
          onboardingCompleted,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
        }

        if (profile.stripeOnboardingCompleted !== onboardingCompleted) {
          await db
            .update(providerProfiles)
            .set({ stripeOnboardingCompleted: onboardingCompleted, updatedAt: new Date() })
            .where(eq(providerProfiles.userId, request.user!.sub))
        }
      } catch { /* non-fatal — return cached state */ }
    }

    return reply.send({ stripe: stripeStatus })
  })

  /** POST /provider/stripe/connect/dashboard — generate Stripe Express dashboard link */
  fastify.post('/provider/stripe/connect/dashboard', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile?.stripeAccountId) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No Stripe account linked. Complete onboarding first.' })
    }

    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Stripe is not configured' })
    }

    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
      const loginLink = await stripe.accounts.createLoginLink(profile.stripeAccountId)
      return reply.send({ url: loginLink.url })
    } catch (error) {
      fastify.log.error({ error }, 'Stripe dashboard link failed')
      return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to generate Stripe dashboard link' })
    }
  })
}

export default providerRoutes
