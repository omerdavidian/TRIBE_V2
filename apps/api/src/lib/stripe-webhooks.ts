/**
 * Webhook handler for Stripe events
 * 
 * This file shows how to handle critical Stripe events:
 * - Payment successes/failures
 * - Refunds
 * - Disputes (chargebacks)
 * - Provider account updates
 */

import { Stripe } from 'stripe'

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
