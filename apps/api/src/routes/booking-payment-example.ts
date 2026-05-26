/**
 * Example Route: Create Booking Payment
 * 
 * POST /v1/bookings/pay
 * 
 * Request body:
 * {
 *   "motherId": "mother_123",
 *   "providerId": "provider_456",
 *   "serviceId": "service_789",
 *   "amount": 15000,  // cents
 *   "paymentMethodId": "pm_xxx"
 * }
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  ensureCustomer,
  createBookingCharge,
} from '../lib/stripe-service.js'

const createBookingPaymentSchema = z.object({
  motherId: z.string().min(1),
  providerName: z.string().min(1),
  providerEmail: z.string().email(),
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  amount: z.number().min(100), // minimum $1.00
  paymentMethodId: z.string().min(1),
})

type CreateBookingPaymentRequest = z.infer<typeof createBookingPaymentSchema>

/**
 * Example route implementation
 */
export async function registerBookingPaymentRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateBookingPaymentRequest }>(
    '/bookings/pay',
    {
      schema: {
        body: createBookingPaymentSchema,
      },
    },
    async (request: FastifyRequest<{ Body: CreateBookingPaymentRequest }>, reply: FastifyReply) => {
      try {
        const {
          motherId,
          providerName,
          providerEmail,
          providerId,
          serviceId,
          amount,
          paymentMethodId,
        } = request.body as CreateBookingPaymentRequest

        // Ensure customer exists in Stripe
        const stripeCustomerId = await ensureCustomer(
          `mother_${motherId}`,
          {
            motherId,
            email: providerEmail, // TODO: use actual mother email
            name: providerName, // TODO: use actual mother name
          }
        )

        // Create the charge
        const result = await createBookingCharge({
          motherId,
          providerId,
          serviceId,
          amount,
          currency: 'usd',
          description: `TRIBE Booking - ${providerName}`,
          paymentMethodId,
          customerId: stripeCustomerId,
        })

        // TODO: Create booking record in database
        // TODO: Send confirmation email
        // TODO: Schedule provider payout (on webhook confirmation)

        return reply.code(201).send({
          success: true,
          bookingPayment: {
            chargeId: result.chargeId,
            amount: result.amount,
            status: result.status,
            createdAt: result.createdAt,
          },
        })
      } catch (error) {
        console.error('Booking payment error:', error)
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Payment failed',
        })
      }
    }
  )
}
