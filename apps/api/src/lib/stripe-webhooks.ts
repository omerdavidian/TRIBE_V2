/**
 * Webhook handler for Stripe events
 * 
 * This file shows how to handle critical Stripe events:
 * - Payment successes/failures
 * - Refunds
 * - Disputes (chargebacks)
 * - Provider account updates
 * - Donation payment intent completions
 */

import { Stripe } from 'stripe'
import { db } from '../db/client.js'
import { donations, registryItems, registries, supporterThankYouMessages, users, vouchers } from '../db/schema.js'
import { eq, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { sendContributionConfirmationEmail, sendVoucherEmail } from './email.js'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export interface WebhookHandler {
  [key: string]: (event: Stripe.Event) => Promise<void>
}

async function completeDonationAfterPayment(
  livemode: boolean,
  paymentIntentId: string,
  metadata: Stripe.Metadata,
  amountReceivedCents: number
): Promise<void> {
  const donationId = metadata['donationId']

  const donation = donationId
    ? await db.query.donations.findFirst({
        where: eq(donations.id, donationId),
        columns: {
          id: true,
          status: true,
          amountCents: true,
          supporterId: true,
          supporterNameSnapshot: true,
          supporterEmailSnapshot: true,
          isAnonymous: true,
          registryItemId: true,
          registryId: true,
        },
      })
    : await db.query.donations.findFirst({
        where: eq(donations.stripePaymentIntentId, paymentIntentId),
        columns: {
          id: true,
          status: true,
          amountCents: true,
          supporterId: true,
          supporterNameSnapshot: true,
          supporterEmailSnapshot: true,
          isAnonymous: true,
          registryItemId: true,
          registryId: true,
        },
      })

  if (!donation) {
    console.warn(`No donation row found for paymentIntent ${paymentIntentId}`)
    return
  }

  if (donation.status === 'completed') {
    console.log(`Donation ${donation.id} already completed; skipping repeat webhook`)
    return
  }

  const registryItemId = donation.registryItemId ?? metadata['registryItemId'] ?? null
  const donationAmountCents = donation.amountCents || amountReceivedCents
  const completedAt = new Date()

  await db
    .update(donations)
    .set({
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      isTestData: !livemode,
      supporterNameSnapshot: donation.supporterNameSnapshot ?? metadata['supporterName'] ?? null,
      supporterEmailSnapshot: donation.supporterEmailSnapshot ?? metadata['supporterEmail'] ?? null,
      completedAt,
    })
    .where(eq(donations.id, donation.id))

  const registry = donation.registryId
    ? await db.query.registries.findFirst({
        where: eq(registries.id, donation.registryId),
        columns: { id: true, title: true, slug: true, userId: true },
      })
    : null
  const registryItem = registryItemId
    ? await db.query.registryItems.findFirst({
        where: eq(registryItems.id, registryItemId),
        columns: { id: true, title: true, registryId: true, isFulfilled: true },
      })
    : null
  const supporter = donation.supporterId
    ? await db.query.users.findFirst({
        where: eq(users.id, donation.supporterId),
        columns: { id: true, email: true, fullName: true, firstName: true, lastName: true },
      })
    : null
  const supporterName =
    donation.supporterNameSnapshot ??
    metadata['supporterName'] ??
    supporter?.fullName ??
    [supporter?.firstName, supporter?.lastName].filter(Boolean).join(' ').trim() ??
    'Supporter'
  const supporterEmail = donation.supporterEmailSnapshot ?? metadata['supporterEmail'] ?? supporter?.email ?? null

  if (registry?.userId && supporterEmail) {
    const existingThankYou = await db.query.supporterThankYouMessages.findFirst({
      where: eq(supporterThankYouMessages.donationId, donation.id),
      columns: { id: true },
    })

    if (!existingThankYou) {
      await db.insert(supporterThankYouMessages).values({
        motherUserId: registry.userId,
        donationId: donation.id,
        supporterUserId: donation.supporterId,
        recipientEmailSnapshot: supporterEmail,
        recipientNameSnapshot: donation.isAnonymous ? 'Anonymous supporter' : supporterName,
        subject: 'Thank you for supporting my postpartum journey',
        body: 'Your care means the world to our family. Thank you for helping us feel seen and supported.',
        status: 'draft',
      })
    }

    await sendContributionConfirmationEmail({
      to: supporterEmail,
      supporterName: donation.isAnonymous ? 'Supporter' : supporterName,
      amountCents: donationAmountCents,
      registryTitle: registry.title,
      serviceTitle: registryItem?.title ?? null,
      livemode,
    })
  }

  // If donation was scoped to a specific registry item, update its funded amount.
  if (registryItemId) {
    await db
      .update(registryItems)
      .set({
        fundedAmountCents: sql`LEAST(${registryItems.fundedAmountCents} + ${donationAmountCents}, ${registryItems.targetAmountCents})`,
        isFulfilled: sql`(${registryItems.fundedAmountCents} + ${donationAmountCents}) >= ${registryItems.targetAmountCents}`,
        serviceStatus: sql`case when (${registryItems.fundedAmountCents} + ${donationAmountCents}) >= ${registryItems.targetAmountCents} then 'ready_to_book' else ${registryItems.serviceStatus} end`,
      })
      .where(eq(registryItems.id, registryItemId))

    const updatedItem = await db.query.registryItems.findFirst({
      where: eq(registryItems.id, registryItemId),
      columns: { id: true, registryId: true, title: true, isFulfilled: true },
    })

    if (updatedItem?.isFulfilled) {
      const existing = await db.query.vouchers.findFirst({
        where: eq(vouchers.registryItemId, registryItemId),
        columns: { id: true },
      })

      if (!existing) {
        const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
        const code = `VOUCH-${suffix}`

        await db.insert(vouchers).values({
          registryItemId,
          registryId: updatedItem.registryId,
          code,
        })

        const registry = await db.query.registries.findFirst({
          where: eq(registries.id, updatedItem.registryId),
          columns: { slug: true, userId: true },
        })

        if (registry) {
          const mother = await db.query.users.findFirst({
            where: eq(users.id, registry.userId),
            columns: { email: true, fullName: true, firstName: true },
          })

          if (mother?.email) {
            const motherName = mother.fullName ?? mother.firstName ?? 'Mom'
            sendVoucherEmail({
              to: mother.email,
              motherName,
              itemTitle: updatedItem.title,
              voucherCode: code,
              registrySlug: registry.slug,
            }).catch((err: unknown) => console.error('Voucher email failed:', err))
          }
        }

        console.log(`Voucher ${code} generated for fulfilled item ${registryItemId}`)
      }
    }
  }

  console.log(`Donation ${donation.id} marked completed (payment: ${paymentIntentId})`)
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  console.log(`Payment succeeded: ${paymentIntent.id}`)

  await completeDonationAfterPayment(
    paymentIntent.livemode,
    paymentIntent.id,
    paymentIntent.metadata ?? {},
    paymentIntent.amount_received || paymentIntent.amount
  )
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  console.error(`Payment failed: ${paymentIntent.id}`)
  console.error('Error:', paymentIntent.last_payment_error?.message)

  const donationId = paymentIntent.metadata?.['donationId']

  if (donationId) {
    await db
      .update(donations)
      .set({ status: 'failed', stripePaymentIntentId: paymentIntent.id })
      .where(eq(donations.id, donationId))
  } else {
    await db
      .update(donations)
      .set({ status: 'failed' })
      .where(eq(donations.stripePaymentIntentId, paymentIntent.id))
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge

  console.log(`🔄 Charge refunded: ${charge.id}`)
  console.log('Refunds:', charge.refunds)

  // TODO: Update booking status to refunded
  // TODO: Reverse provider payout if applicable
  // TODO: Send refund confirmation to mother
}

/**
 * Handle charge dispute created (chargeback)
 */
async function handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute

  console.warn(`⚠️  Dispute created: ${dispute.id}`)
  console.warn('Amount:', dispute.amount)
  console.warn('Reason:', dispute.reason)

  // TODO: Alert admin to investigate
  // TODO: Freeze booking dispute resolution
  // TODO: Prepare defense evidence
}

/**
 * Handle connected account updated
 */
async function handleConnectAccountUpdated(event: Stripe.Event): Promise<void> {
  const account = event.data.object as Stripe.Account

  console.log(`🔗 Connected account updated: ${account.id}`)
  console.log('Charges enabled:', account.charges_enabled)
  console.log('Payouts enabled:', account.payouts_enabled)

  // TODO: Update provider account status in database
  // TODO: Notify provider if onboarding incomplete
}

/**
 * Map webhook event types to handlers
 */
export const webhookHandlers: WebhookHandler = {
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'charge.refunded': handleChargeRefunded,
  'charge.dispute.created': handleChargeDisputeCreated,
  'account.updated': handleConnectAccountUpdated,
}

/**
 * Verify and process webhook
 * Usage in route handler:
 *
 * export async function POST(req: Request) {
 *   const body = await req.text()
 *   const event = await verifyAndProcessWebhook(body, req.headers.get('stripe-signature') || '')
 *   return Response.json({ received: true })
 * }
 */
export async function verifyAndProcessWebhook(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  // In a real app, use stripe.webhooks.constructEvent()
  // For now, just parse the JSON
  const event = JSON.parse(body) as Stripe.Event

  console.log(`Webhook event: ${event.type}`)

  // Get the handler for this event type
  const handler = webhookHandlers[event.type]

  if (handler) {
    await handler(event)
    console.log(`✅ Handled ${event.type}`)
  } else {
    console.warn(`⚠️  No handler for ${event.type}`)
  }

  return event
}
