/**
 * Stripe service - handles all Stripe operations for TRIBE
 * 
 * Core responsibilities:
 * - Process booking payments (mother pays)
 * - Create provider Connect accounts
 * - Transfer funds to providers
 * - Handle refunds and disputes
 * - Manage payment methods
 */

import Stripe from 'stripe'
import { stripe } from './stripe.js'
import {
  StripeBookingPayload,
  StripeRefundPayload,
  StripeConnectAccount,
  StripeCustomer,
  BookingChargeResult,
  ProviderPayoutResult,
  RefundResult,
  ConnectAccountResult,
} from './stripe-types.js'

// Platform fee percentage (e.g., 8% = 800)
const PLATFORM_FEE_PERCENT = 8

/**
 * Get platform fee amount from total
 */
function calculatePlatformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100)
}

/**
 * Create or retrieve a customer (mother)
 */
export async function ensureCustomer(
  customerId: string,
  customer: StripeCustomer
): Promise<string> {
  try {
    // Try to retrieve first
    await stripe.customers.retrieve(customerId)
    return customerId
  } catch {
    // Create if doesn't exist (Stripe generates the ID)
    const created = await stripe.customers.create({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: {
        motherId: customer.motherId,
        customerId: customerId, // Store our ID in metadata
        source: 'tribe-booking',
      },
    })
    return created.id
  }
}

/**
 * Create a payment intent for a booking
 * Used for SCA/3D Secure compliance
 */
export async function createBookingPaymentIntent(
  payload: StripeBookingPayload & { customerId: string }
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const platformFee = calculatePlatformFee(payload.amount)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: payload.amount,
    currency: payload.currency,
    customer: payload.customerId,
    description: payload.description,
    payment_method: payload.paymentMethodId,
    confirm: !!payload.paymentMethodId,
    metadata: {
      motherId: payload.motherId,
      providerId: payload.providerId,
      serviceId: payload.serviceId,
      platformFee: platformFee.toString(),
    },
    // For Connect: automatically transfer to provider (requires setup)
    // transfer_data: {
    //   destination: providerStripeAccountId,
    // },
  })

  return {
    clientSecret: paymentIntent.client_secret || '',
    paymentIntentId: paymentIntent.id,
  }
}

/**
 * Create a charge directly (for saved payment methods)
 */
export async function createBookingCharge(
  payload: StripeBookingPayload & { customerId: string }
): Promise<BookingChargeResult> {
  if (!payload.paymentMethodId) {
    throw new Error('Payment method required for direct charge')
  }

  const platformFee = calculatePlatformFee(payload.amount)
  const providerAmount = payload.amount - platformFee

  const charge = await stripe.charges.create({
    amount: payload.amount,
    currency: payload.currency,
    customer: payload.customerId,
    source: payload.paymentMethodId,
    description: payload.description,
    metadata: {
      motherId: payload.motherId,
      providerId: payload.providerId,
      serviceId: payload.serviceId,
      platformFee: platformFee.toString(),
      providerAmount: providerAmount.toString(),
    },
  })

  return {
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    status: charge.status === 'succeeded' ? 'succeeded' : 'failed',
    paymentMethodId: payload.paymentMethodId,
    createdAt: new Date(charge.created * 1000),
  }
}

/**
 * Create a connected account for a service provider
 */
export async function createProviderConnectedAccount(
  payload: StripeConnectAccount
): Promise<ConnectAccountResult> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: payload.email,
    business_type: payload.businessType,
    business_profile: {
      name: payload.name,
      url: 'https://tribewishlist.com',
      support_email: payload.email,
    },
    metadata: {
      providerId: payload.providerId,
      source: 'tribe-provider-onboarding',
    },
  })

  // Create account link for provider onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    type: 'account_onboarding',
    refresh_url: 'https://tribewishlist.com/dashboard/settings',
    return_url: 'https://tribewishlist.com/dashboard/settings',
  })

  return {
    stripeAccountId: account.id,
    providerId: payload.providerId,
    onboardingUrl: accountLink.url,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  }
}

/**
 * Transfer funds to a provider's connected account
 */
export async function transferToProvider(
  stripeConnectedAccountId: string,
  amount: number,
  description: string
): Promise<ProviderPayoutResult> {
  const transfer = await stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: stripeConnectedAccountId,
    description,
    metadata: {
      source: 'tribe-booking-payout',
    },
  })

  return {
    transferId: transfer.id,
    amount: transfer.amount,
    currency: transfer.currency,
    status: 'pending',
    arrivalDate: new Date(transfer.created * 1000 + 2 * 24 * 60 * 60 * 1000), // Typically 2 business days
  }
}

/**
 * Refund a booking charge
 */
export async function refundBooking(payload: StripeRefundPayload): Promise<RefundResult> {
  const refund = await stripe.refunds.create({
    charge: payload.chargeId,
    amount: payload.amount,
    reason: payload.reason,
    metadata: {
      source: 'tribe-booking-refund',
    },
  })

  return {
    refundId: refund.id,
    chargeId: payload.chargeId,
    amount: refund.amount,
    status: refund.status === 'succeeded' ? 'succeeded' : 'failed',
    reason: payload.reason,
    createdAt: new Date(refund.created * 1000),
  }
}

/**
 * Save a payment method for a customer
 */
export async function savePaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })
}

/**
 * Retrieve customer's saved payment methods
 */
export async function getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  })

  return paymentMethods.data
}

/**
 * Get account balance
 */
export async function getAccountBalance() {
  const balance = await stripe.balance.retrieve()

  return {
    available: balance.available[0]?.amount || 0,
    pending: balance.pending[0]?.amount || 0,
    currency: balance.available[0]?.currency || 'usd',
  }
}
