import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { and, eq, desc } from 'drizzle-orm'
import Stripe from 'stripe'
import { db } from '../db/client.js'
import {
  providerProfiles,
  providerServices,
  providerOperatingHours,
  providerDocuments,
  serviceCategories,
  platformSettings,
} from '../db/schema.js'
import { requireRole } from '../plugins/auth.js'
import { env } from '../lib/env.js'

// ─── URL normalization ────────────────────────────────────────────────────────

function normalizeUrl(v: string | null | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  if (!t) return null
  if (t.startsWith('https://')) return t
  if (t.startsWith('http://')) return t.replace('http://', 'https://')
  return `https://${t}`
}

const urlField = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeUrl(v) : v),
  z.string().url({ message: 'Invalid URL — enter a valid domain (e.g. example.com)' }).max(500).nullable().optional()
)

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
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

const ALLOWED_DOC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const DOCUMENT_TYPES = [
  'ein_certificate',
  'irs_letter',
  'w2',
  'identity_front',
  'identity_back',
  'other',
] as const

type DocumentType = (typeof DOCUMENT_TYPES)[number]

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  ein_certificate: 'EIN Certificate',
  irs_letter: 'IRS Letter',
  w2: 'W-2',
  identity_front: 'ID — Front',
  identity_back: 'ID — Back',
  other: 'Other',
}

// Stripe purpose mapping: identity docs vs additional_verification for business docs
function stripeFilePurpose(type: DocumentType): 'identity_document' | 'additional_verification' {
  if (type === 'identity_front' || type === 'identity_back') return 'identity_document'
  return 'additional_verification'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the app's base URL for Stripe return/refresh URLs.
 *  Priority: FRONTEND_URL env var → request origin header → fallback localhost. */
function resolveAppBaseUrl(requestOrigin: string | undefined): string {
  // env.FRONTEND_URL is always the canonical production URL (set in Railway / Vercel)
  if (env.FRONTEND_URL && env.FRONTEND_URL !== 'http://localhost:3000') {
    return env.FRONTEND_URL
  }
  // In development, use the actual origin if present and valid
  if (requestOrigin && requestOrigin.startsWith('http')) {
    return requestOrigin
  }
  return env.FRONTEND_URL
}

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

  // GET /provider/categories
  fastify.get('/provider/categories', { preHandler: providerOnly }, async (_request, reply) => {
    const cats = await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.isActive, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    })
    return reply.send(cats)
  })

  // PUT /provider/services
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

  // PUT /provider/hours
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

  // ─── Custom services ──────────────────────────────────────────────────────

  /** POST /provider/custom-services — submit a custom (non-catalog) service for admin review */
  fastify.post('/provider/custom-services', { preHandler: providerOnly }, async (request, reply) => {
    const body = z.object({
      customName: z.string().min(2).max(200),
      description: z.string().max(2000).optional().nullable(),
      billingFrequency: z.enum(['flat', 'hourly', 'daily', 'weekly']).default('flat'),
      priceMinCents: z.number().int().nonnegative().nullable().optional(),
      priceMaxCents: z.number().int().nonnegative().nullable().optional(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    const [inserted] = await db.insert(providerServices).values({
      providerProfileId: profile.id,
      categoryId: null,
      isCustom: true,
      customName: body.data.customName,
      customStatus: 'pending',
      billingFrequency: body.data.billingFrequency,
      description: body.data.description ?? null,
      priceMinCents: body.data.priceMinCents ?? null,
      priceMaxCents: body.data.priceMaxCents ?? null,
    }).returning()

    return reply.status(201).send(inserted)
  })

  /** GET /provider/custom-services — list provider's custom service submissions */
  fastify.get('/provider/custom-services', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    const customs = await db
      .select()
      .from(providerServices)
      .where(and(eq(providerServices.providerProfileId, profile.id), eq(providerServices.isCustom, true)))
      .orderBy(desc(providerServices.id))

    return reply.send(customs)
  })

  // ─── Application submission ───────────────────────────────────────────────

  /**
   * POST /provider/submit-application
   *
   * Validates all required fields are present, then moves applicationStatus
   * from 'draft' → 'pending' so the admin vetting queue picks it up.
   * Inputs are locked on the frontend once this succeeds.
   */
  fastify.post('/provider/submit-application', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
      with: {
        services: true,
        documents: true,
      },
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    if (profile.applicationStatus === 'pending' || profile.applicationStatus === 'approved') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Application already ${profile.applicationStatus === 'approved' ? 'approved' : 'under review'}.`,
      })
    }

    // Validate completeness
    const errors: string[] = []
    if (!profile.businessName?.trim()) errors.push('Business name is required (Business Profile tab)')
    if (!profile.ownerName?.trim()) errors.push('Owner name is required (Personal Info tab)')
    if (!profile.ownerDirectEmail?.trim()) errors.push('Direct email is required (Personal Info tab)')
    if (!profile.services || profile.services.length === 0) {
      errors.push('At least one service with pricing must be configured')
    } else {
      const hasPriced = profile.services.some((s) => (s.priceMaxCents ?? 0) > 0 || (s.priceMinCents ?? 0) > 0)
      if (!hasPriced) errors.push('At least one service must have pricing configured')
    }

    if (errors.length > 0) {
      return reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Application is incomplete',
        errors,
      })
    }

    const [updated] = await db
      .update(providerProfiles)
      .set({ applicationStatus: 'pending', updatedAt: new Date() })
      .where(eq(providerProfiles.userId, request.user!.sub))
      .returning()

    return reply.send(updated)
  })

  // ─── Commission rate ──────────────────────────────────────────────────────

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

  /**
   * POST /provider/stripe/connect
   *
   * Creates (or resumes) a Stripe Express onboarding link.
   *
   * Root cause of the previous crash: `stripe.accounts.create()` was called with
   * `settings.payouts.schedule.weekly_anchor` — a field only available on Custom
   * accounts. Stripe rejects the entire call, leaving `stripeAccountId` null in
   * the DB, so `accountLinks.create()` is never reached. Fixed below.
   */
  fastify.post('/provider/stripe/connect', { preHandler: providerOnly }, async (request, reply) => {
    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Stripe is not configured on this environment.',
      })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia' as any,
    })
    const userId = request.user!.sub

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, userId),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    let stripeAccountId = profile.stripeAccountId

    // ── Step 1: ensure the provider has a Stripe account ─────────────────────
    if (!stripeAccountId) {
      let account: Stripe.Account
      try {
        account = await stripe.accounts.create({
          type: 'express',
          // Only request capabilities — Express onboarding UI handles everything else.
          // Do NOT pass settings.payouts.schedule or business_type here; those are
          // Custom-account-only fields that cause a 400 from Stripe on Express accounts.
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        })
      } catch (err) {
        const message = err instanceof Stripe.errors.StripeError
          ? `Stripe account creation failed: ${err.message}`
          : 'Failed to create Stripe account'
        fastify.log.error({ err, userId }, message)
        return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message })
      }

      stripeAccountId = account.id

      // Persist the new account ID before creating the link, so a partial failure
      // (link creation failing) can be retried without creating duplicate accounts.
      await db
        .update(providerProfiles)
        .set({ stripeAccountId, updatedAt: new Date() })
        .where(eq(providerProfiles.userId, userId))
    }

    // ── Step 2: create the onboarding link ────────────────────────────────────
    const baseUrl = resolveAppBaseUrl(request.headers['origin'] as string | undefined)

    let accountLink: Stripe.AccountLink
    try {
      accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/dashboard/provider?section=payments&stripe=refresh`,
        return_url: `${baseUrl}/dashboard/provider?section=payments&stripe=success`,
        type: 'account_onboarding',
        collect: 'currently_due',
      })
    } catch (err) {
      const message = err instanceof Stripe.errors.StripeError
        ? `Stripe link creation failed: ${err.message}`
        : 'Failed to create Stripe onboarding link'
      fastify.log.error({ err, userId, stripeAccountId }, message)
      return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message })
    }

    return reply.send({
      url: accountLink.url,
      accountId: stripeAccountId,
      expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
    })
  })

  /** GET /provider/stripe/connect/status — live Stripe account state */
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
      detailsSubmitted: false,
    }

    if (profile.stripeAccountId && env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
        const account = await stripe.accounts.retrieve(profile.stripeAccountId)
        const onboardingCompleted = (account.details_submitted ?? false) && (account.charges_enabled ?? false)

        stripeStatus = {
          accountId: profile.stripeAccountId,
          onboardingCompleted,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
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
    } catch (err) {
      const message = err instanceof Stripe.errors.StripeError ? err.message : 'Failed to generate Stripe dashboard link'
      fastify.log.error({ err }, 'Stripe dashboard link failed')
      return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message })
    }
  })

  // ─── Provider documents (KYC / business verification) ────────────────────

  /**
   * POST /provider/documents/upload
   *
   * Accepts multipart/form-data with:
   *   - file   : the document file (PDF, JPEG, PNG, WebP) — max 10 MB
   *   - type   : one of the DocumentType values
   *
   * Uploads to Stripe Files API and stores a record in provider_documents.
   * If the provider has a connected Stripe account, automatically attaches
   * the file to the account for verification.
   */
  fastify.post('/provider/documents/upload', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    // Parse multipart
    let fileData: Awaited<ReturnType<typeof request.file>>
    try {
      fileData = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } })
    } catch {
      return reply.status(413).send({ statusCode: 413, error: 'Payload Too Large', message: 'File must be under 10 MB.' })
    }

    if (!fileData) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No file provided. Send multipart/form-data with a "file" field.' })
    }

    if (!ALLOWED_DOC_MIME_TYPES.includes(fileData.mimetype)) {
      fileData.file.resume()
      return reply.status(415).send({ statusCode: 415, error: 'Unsupported Media Type', message: 'Only PDF, JPEG, PNG, and WebP files are accepted.' })
    }

    const docTypeRaw = fileData.fields?.['type']
    const docType = typeof docTypeRaw === 'object' && 'value' in docTypeRaw
      ? String(docTypeRaw.value)
      : String(docTypeRaw ?? 'other')

    if (!DOCUMENT_TYPES.includes(docType as DocumentType)) {
      fileData.file.resume()
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid document type. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      })
    }

    // Buffer the file
    const chunks: Buffer[] = []
    for await (const chunk of fileData.file) {
      chunks.push(chunk as Buffer)
    }
    const fileBuffer = Buffer.concat(chunks)

    if (fileBuffer.length === 0) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Empty file received.' })
    }

    // Upload to Stripe Files API (if Stripe is configured)
    let stripeFileId: string | null = null

    if (env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })

      try {
        const purpose = stripeFilePurpose(docType as DocumentType)
        const stripeFile = await stripe.files.create({
          purpose,
          file: {
            data: fileBuffer,
            name: fileData.filename,
            type: fileData.mimetype,
          },
        })
        stripeFileId = stripeFile.id

        // Attach the file to the provider's Stripe account if onboarding is in progress
        if (profile.stripeAccountId) {
          try {
            const dt = docType as DocumentType
            if (dt === 'identity_front' || dt === 'identity_back') {
              await stripe.accounts.update(profile.stripeAccountId, {
                individual: {
                  verification: {
                    document: {
                      [dt === 'identity_front' ? 'front' : 'back']: stripeFileId,
                    },
                  },
                },
              } as any)
            } else {
              await stripe.accounts.update(profile.stripeAccountId, {
                individual: {
                  verification: {
                    additional_document: { front: stripeFileId },
                  },
                },
              } as any)
            }
          } catch (attachErr) {
            // Log but don't fail — the file is still uploaded to Stripe
            fastify.log.warn({ attachErr, stripeFileId }, 'Could not attach verification document to Stripe account')
          }
        }
      } catch (uploadErr) {
        const message = uploadErr instanceof Stripe.errors.StripeError
          ? `Stripe file upload failed: ${uploadErr.message}`
          : 'Failed to upload document to Stripe'
        fastify.log.error({ uploadErr }, message)
        return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message })
      }
    }

    // Persist record
    const [doc] = await db
      .insert(providerDocuments)
      .values({
        providerProfileId: profile.id,
        documentType: docType as DocumentType,
        stripeFileId,
        originalFilename: fileData.filename,
        fileSizeBytes: fileBuffer.length,
        mimeType: fileData.mimetype,
      })
      .returning()

    return reply.status(201).send({
      ...doc,
      documentTypeLabel: DOC_TYPE_LABELS[docType as DocumentType],
    })
  })

  /** GET /provider/documents — list all documents for this provider */
  fastify.get('/provider/documents', { preHandler: providerOnly }, async (request, reply) => {
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    const docs = await db
      .select()
      .from(providerDocuments)
      .where(eq(providerDocuments.providerProfileId, profile.id))
      .orderBy(desc(providerDocuments.createdAt))

    return reply.send(
      docs.map((d) => ({
        ...d,
        documentTypeLabel: DOC_TYPE_LABELS[d.documentType as DocumentType] ?? d.documentType,
      }))
    )
  })

  /** DELETE /provider/documents/:id */
  fastify.delete('/provider/documents/:id', { preHandler: providerOnly }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, request.user!.sub),
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    const [deleted] = await db
      .delete(providerDocuments)
      .where(eq(providerDocuments.id, id))
      .returning({ id: providerDocuments.id, providerProfileId: providerDocuments.providerProfileId })

    if (!deleted || deleted.providerProfileId !== profile.id) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Document not found' })
    }

    return reply.send({ success: true })
  })
}

export default providerRoutes
