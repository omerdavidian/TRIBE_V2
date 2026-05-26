/**
 * Stripe-related type definitions for TRIBE-V2
 */

export interface StripeBookingPayload {
  motherId: string
  providerId: string
  serviceId: string
  amount: number
  currency: 'usd'
  description: string
  paymentMethodId?: string
  savePaymentMethod?: boolean
}

export interface StripeRefundPayload {
  chargeId: string
  amount?: number
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent'
}

export interface StripeConnectAccount {
  providerId: string
  email: string
  name: string
  businessType: 'individual' | 'non_profit'
}

export interface StripeCustomer {
  motherId: string
  email: string
  name: string
  phone?: string
}

export interface BookingChargeResult {
  chargeId: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed'
  paymentMethodId?: string
  createdAt: Date
}

export interface ProviderPayoutResult {
  transferId: string
  amount: number
  currency: string
  status: 'pending' | 'in_transit' | 'paid' | 'failed'
  arrivalDate: Date
}

export interface RefundResult {
  refundId: string
  chargeId: string
  amount: number
  status: 'succeeded' | 'pending' | 'failed'
  reason: string
  createdAt: Date
}

export interface ConnectAccountResult {
  stripeAccountId: string
  providerId: string
  onboardingUrl: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
}
