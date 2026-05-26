import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

/**
 * Initialize Stripe with secret key
 * Uses API version that matches your Stripe dashboard
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

export default stripe
