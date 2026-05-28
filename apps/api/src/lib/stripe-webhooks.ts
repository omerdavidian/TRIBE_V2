/**
 * Webhook handler for Stripe events
 * 
 * This file shows how to handle critical Stripe events:
 * - Payment successes/failures
 * - Refunds
 * - Disputes (chargebacks)
 * - Provider account updates
 * - Donation checkout session completions
 */

import { Stripe } from 'stripe'
import { db } from '../db/client.js'
import { donations, registryItems, registries, users, vouchers } from '../db/schema.js'
import { eq, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { sendVoucherEmail } from './email.js'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export interface WebhookHandler {
  [key: string]: (event: Stripe.Event) => Promise<void>
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  console.log(`✅ Payment succeeded: ${paymentIntent.id}`)

  // TODO: Update booking status in database
  // TODO: Schedule provider payout
  // TODO: Send confirmation email to mother
  // TODO: Create invoice

  console.log('Metadata:', paymentIntent.metadata)
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  console.error(`❌ Payment failed: ${paymentIntent.id}`)
  console.error('Error:', paymentIntent.last_payment_error?.message)

  // TODO: Update booking status to failed
  // TODO: Send failure notification to mother
  // TODO: Suggest retry or alternative payment method
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
 * Handle checkout.session.completed — marks the donation as completed
 * and updates the registry item's funded amount if the donation was item-scoped.
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  const { donationId, registryItemId } = session.metadata ?? {}

  if (!donationId) {
    console.log('checkout.session.completed: no donationId in metadata — skipping donation update')
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null

  // Mark donation as completed
  await db
    .update(donations)
    .set({
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      completedAt: new Date(),
    })
    .where(eq(donations.id, donationId))

  // If donation was scoped to a specific registry item, update its funded amount
  if (registryItemId) {
    const amountCents = session.amount_total ?? 0

    await db
      .update(registryItems)
      .set({
        fundedAmountCents: sql`LEAST(${registryItems.fundedAmountCents} + ${amountCents}, ${registryItems.targetAmountCents})`,
        isFulfilled: sql`(${registryItems.fundedAmountCents} + ${amountCents}) >= ${registryItems.targetAmountCents}`,
      })
      .where(eq(registryItems.id, registryItemId))

    // Check if item is now fulfilled — generate voucher + notify mother
    const updatedItem = await db.query.registryItems.findFirst({
      where: eq(registryItems.id, registryItemId),
      columns: { id: true, registryId: true, title: true, isFulfilled: true },
    })

    if (updatedItem?.isFulfilled) {
      // Only generate a voucher if one doesn't already exist
      const existing = await db.query.vouchers.findFirst({
        where: eq(vouchers.registryItemId, registryItemId),
        columns: { id: true },
      })

      if (!existing) {
        // Generate a clean alphanumeric voucher code: VOUCH-XXXXXX
        const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
        const code = `VOUCH-${suffix}`

        await db.insert(vouchers).values({
          registryItemId,
          registryId: updatedItem.registryId,
          code,
        })

        // Fetch the registry + mother info for the notification email
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

        console.log(`🎁 Voucher ${code} generated for fulfilled item ${registryItemId}`)
      }
    }
  }

  console.log(`✅ Donation ${donationId} marked completed (payment: ${paymentIntentId ?? 'n/a'})`)
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
  'checkout.session.completed': handleCheckoutSessionCompleted,
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
