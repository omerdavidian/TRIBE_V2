import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import { donations, motherPaymentAccounts, registryItems, users } from '../db/schema.js'
import { env } from '../lib/env.js'
import { requireRole } from '../plugins/auth.js'

const topUpSchema = z.object({
  registryItemId: z.string().uuid(),
})

const rolloverSchema = z.object({
  registryItemId: z.string().uuid(),
})

const PLATFORM_FEE_BPS = Number.parseInt(process.env['PLATFORM_FEE_BPS'] ?? '500', 10)

function platformFeeAmount(amountCents: number) {
  if (!Number.isFinite(PLATFORM_FEE_BPS) || PLATFORM_FEE_BPS <= 0) return 0
  return Math.max(0, Math.round(amountCents * (PLATFORM_FEE_BPS / 10000)))
}

const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/services/top-up', { preHandler: requireRole('mother') }, async (request, reply) => {
    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Stripe is not configured on the API',
      })
    }

    const parsed = topUpSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const motherUserId = request.user!.sub
    const item = await db.query.registryItems.findFirst({
      where: eq(registryItems.id, parsed.data.registryItemId),
      with: {
        registry: {
          columns: {
            id: true,
            slug: true,
            title: true,
            userId: true,
          },
        },
      },
    })

    if (!item || item.registry.userId !== motherUserId || item.paymentType !== 'monetary' || item.isArchived) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Registry service not found',
      })
    }

    const remainingCents = Math.max(0, item.targetAmountCents - item.fundedAmountCents)
    if (remainingCents <= 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'This service is already fully funded.',
      })
    }

    const [mother, paymentAccount] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, motherUserId),
        columns: {
          email: true,
          fullName: true,
          firstName: true,
          lastName: true,
        },
      }),
      db.query.motherPaymentAccounts.findFirst({
        where: eq(motherPaymentAccounts.motherUserId, motherUserId),
        columns: {
          stripeConnectAccountId: true,
          stripeCustomerId: true,
        },
      }),
    ])

    if (!mother?.email) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'A verified mother email is required to complete top-up payments.',
      })
    }

    if (!paymentAccount?.stripeConnectAccountId) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Please connect Stripe in Payment Hub before topping up a service.',
      })
    }

    const motherName =
      mother.fullName ??
      [mother.firstName, mother.lastName].filter(Boolean).join(' ').trim() ??
      'Mother'

    const [pendingDonation] = await db
      .insert(donations)
      .values({
        supporterId: motherUserId,
        registryId: item.registry.id,
        registryItemId: item.id,
        supporterNameSnapshot: motherName,
        supporterEmailSnapshot: mother.email,
        amountCents: remainingCents,
        status: 'pending',
        isAnonymous: false,
        isTestData: true,
        message: 'mother_top_up',
      })
      .returning({ id: donations.id })

    if (!pendingDonation) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to create top-up donation record',
      })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2026-04-22.dahlia' as any,
      typescript: true,
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: remainingCents,
      currency: 'usd',
      payment_method_types: ['card'],
      ...(paymentAccount.stripeCustomerId ? { customer: paymentAccount.stripeCustomerId } : {}),
      receipt_email: mother.email,
      application_fee_amount: platformFeeAmount(remainingCents),
      transfer_data: {
        destination: paymentAccount.stripeConnectAccountId,
      },
      description: `Top-up for ${item.title} in ${item.registry.title}`,
      metadata: {
        donationId: pendingDonation.id,
        registryId: item.registry.id,
        registryItemId: item.id,
        supporterId: motherUserId,
        supporterName: motherName,
        supporterEmail: mother.email,
        flowType: 'mother_top_up',
        isAnonymous: 'false',
      },
    })

    await db
      .update(donations)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        isTestData: !paymentIntent.livemode,
      })
      .where(eq(donations.id, pendingDonation.id))

    if (!paymentIntent.client_secret) {
      return reply.status(502).send({
        statusCode: 502,
        error: 'Payment Gateway Error',
        message: 'Missing client secret from Stripe',
      })
    }

    return reply.send({
      donationId: pendingDonation.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amountCents: remainingCents,
      registryItemId: item.id,
      itemTitle: item.title,
      registrySlug: item.registry.slug,
    })
  })

  fastify.post('/services/rollover', { preHandler: requireRole('mother') }, async (request, reply) => {
    const parsed = rolloverSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const motherUserId = request.user!.sub

    const result = await db.transaction(async (tx) => {
      const item = await tx.query.registryItems.findFirst({
        where: eq(registryItems.id, parsed.data.registryItemId),
        with: {
          registry: {
            columns: {
              id: true,
              userId: true,
            },
          },
        },
      })

      if (!item || item.registry.userId !== motherUserId || item.paymentType !== 'monetary' || item.isArchived) {
        return null
      }

      const transferableCents = Math.max(0, item.fundedAmountCents)

      await tx
        .insert(motherPaymentAccounts)
        .values({
          motherUserId,
          generalFundBalanceCents: transferableCents,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: motherPaymentAccounts.motherUserId,
          set: {
            generalFundBalanceCents: sql`${motherPaymentAccounts.generalFundBalanceCents} + ${transferableCents}`,
            updatedAt: new Date(),
          },
        })

      await tx
        .update(registryItems)
        .set({
          fundedAmountCents: 0,
          serviceStatus: 'rolled_over',
          isArchived: true,
        })
        .where(and(eq(registryItems.id, item.id), eq(registryItems.registryId, item.registry.id)))

      return {
        registryItemId: item.id,
        rolledAmountCents: transferableCents,
      }
    })

    if (!result) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Registry service not found',
      })
    }

    return reply.send({
      ok: true,
      ...result,
      status: 'rolled_over',
    })
  })
}

export default serviceRoutes