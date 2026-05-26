import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { stripe } from '../lib/stripe.js'
import { verifyAndProcessWebhook } from '../lib/stripe-webhooks.js'

export async function registerWebhookRoutes(fastify: FastifyInstance) {
  // POST /v1/webhooks/stripe
  fastify.post<{ Body: Buffer }>(
    '/webhooks/stripe',
    async (request: FastifyRequest<{ Body: Buffer }>, reply: FastifyReply) => {
      const sig = request.headers['stripe-signature'] as string

      try {
        // Get raw body for signature verification
        let body: string | Buffer = request.body

        if (typeof body !== 'string') {
          body = body.toString('utf8')
        }

        // Verify Stripe signature
        const event = stripe.webhooks.constructEvent(
          body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        )

        console.log(`✅ Webhook verified: ${event.type}`)

        // Process the event
        await verifyAndProcessWebhook(body, sig)

        return reply.code(200).send({ received: true })
      } catch (error: any) {
        if (error.message?.includes('No signatures found matching')) {
          console.error('❌ Invalid Stripe signature')
          return reply.code(403).send({ error: 'Webhook signature verification failed' })
        }

        console.error('❌ Webhook processing error:', error.message)
        return reply.code(400).send({ error: 'Webhook failed' })
      }
    }
  )
}
