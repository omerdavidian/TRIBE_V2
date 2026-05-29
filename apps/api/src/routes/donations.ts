import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { db } from '../db/client.js'
import { donations, registries, registryItems } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { env } from '../lib/env.js'

// ─── Validation ───────────────────────────────────────────────────────────────

const paymentIntentBodySchema = z.object({
  registryId: z.string().uuid(),
  registryItemId: z.string().uuid().optional(),
  amountCents: z.number().int().min(50), // Stripe minimum is $0.50
  isAnonymous: z.boolean().default(false),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function donationRoutes(fastify: FastifyInstance) {

  // POST /donations/create-payment-intent , create Stripe PaymentIntent for inline Elements checkout.
  // Auth is optional: guests are allowed but always treated as anonymous.
  fastify.post('/donations/create-payment-intent', async (request, reply) => {
    if (!env.STRIPE_SECRET_KEY) {
      return reply
        .status(503)
        .send({ statusCode: 503, error: 'Service Unavailable', message: 'Payment processing is not configured' })
    }

    const parsed = paymentIntentBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ statusCode: 400, error: 'Bad Request', errors: parsed.error.flatten() })
    }
    const body = parsed.data

    // ── Validate registry ───────────────────────────────────────────────────
    const registry = await db.query.registries.findFirst({
      where: and(
        eq(registries.id, body.registryId),
        eq(registries.isPublished, true)
      ),
      columns: { id: true, title: true },
    })
    if (!registry) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Registry not found' })
    }

    // ── Validate optional item ──────────────────────────────────────────────
    if (body.registryItemId) {
      const item = await db.query.registryItems.findFirst({
        where: and(
          eq(registryItems.id, body.registryItemId),
          eq(registryItems.registryId, body.registryId)
        ),
        columns: { id: true },
      })
      if (!item) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Registry item not found' })
      }
    }

    // ── Determine supporter identity ────────────────────────────────────────
    const supporterId = request.user?.sub ?? null
    // Guests are always anonymous; logged-in users may opt in to anonymity
    const isAnonymous = !supporterId || body.isAnonymous

    // ── Insert pending donation row ─────────────────────────────────────────
    const pendingDonations = await db
      .insert(donations)
      .values({
        supporterId,
        registryId: body.registryId,
        registryItemId: body.registryItemId ?? null,
        amountCents: body.amountCents,
        isAnonymous,
        status: 'pending',
      })
      .returning({ id: donations.id })

    const pendingDonation = pendingDonations[0]
    if (!pendingDonation) {
      return reply
        .status(500)
        .send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create donation record' })
    }

    // ── Create Stripe Payment Intent ────────────────────────────────────────
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2026-04-22.dahlia' as any,
      typescript: true,
    })

    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: body.amountCents,
        currency: 'usd',
        payment_method_types: ['card', 'us_bank_account'],
        description: `Contribution to ${registry.title} via TRIBE`,
        metadata: {
          donationId: pendingDonation.id,
          registryId: body.registryId,
          registryItemId: body.registryItemId ?? '',
          supporterId: supporterId ?? '',
          isAnonymous: String(isAnonymous),
        },
      })
    } catch (err) {
      fastify.log.error(err, 'Stripe payment intent creation failed')
      const message = err instanceof Error ? err.message : 'Could not create payment intent'
      return reply.status(502).send({ statusCode: 502, error: 'Payment Gateway Error', message })
    }

    // ── Attach payment intent ID to donation ────────────────────────────────
    await db
      .update(donations)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(donations.id, pendingDonation.id))

    if (!paymentIntent.client_secret) {
      return reply.status(502).send({ statusCode: 502, error: 'Payment Gateway Error', message: 'Missing client secret from Stripe' })
    }

    return reply.send({
      donationId: pendingDonation.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    })
  })

  // GET /donations/registry/:registryId/supporters , public list of completed donors.
  fastify.get('/donations/registry/:registryId/supporters', async (request, reply) => {
    const { registryId } = request.params as { registryId: string }

    if (!registryId?.match(/^[0-9a-f-]{36}$/i)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid registry ID' })
    }

    const rows = await db.query.donations.findMany({
      where: and(
        eq(donations.registryId, registryId),
        eq(donations.status, 'completed')
      ),
      with: {
        supporter: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.amountCents), desc(t.createdAt)],
      limit: 10,
    })

    const supporters = rows.map((r) => ({
      amountCents: r.amountCents,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt,
      name: r.isAnonymous ? null : (r.supporter?.fullName ?? null),
      avatarUrl: r.isAnonymous ? null : (r.supporter?.avatarUrl ?? null),
    }))

    return reply.send({ count: rows.length, supporters })
  })
}
