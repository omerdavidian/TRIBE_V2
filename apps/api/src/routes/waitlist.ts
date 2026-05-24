import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { waitlist } from '../db/schema.js'
import { sendWaitlistConfirmation } from '../lib/email.js'

const joinSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
})

const unsubscribeSchema = z.object({
  email: z.string().email(),
})

const waitlistRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /waitlist/join
  fastify.post('/waitlist/join', async (request, reply) => {
    try {
      const body = joinSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Valid email is required',
        })
      }

      const email = body.data.email.toLowerCase()

      const existing = await db.query.waitlist.findFirst({
        where: eq(waitlist.email, email),
      })

      if (existing) {
        if (existing.unsubscribedAt) {
          await db
            .update(waitlist)
            .set({ unsubscribedAt: null })
            .where(eq(waitlist.id, existing.id))
          return reply.send({ message: "You've been re-added to the waitlist." })
        }

        return reply.send({ message: "You're on the waitlist! We'll be in touch soon." })
      }

      await db.insert(waitlist).values({
        email,
        source: body.data.source ?? 'website',
      })

      sendWaitlistConfirmation(email).catch((error) => {
        fastify.log.error({ error, email }, 'Failed to send waitlist confirmation email')
      })

      return reply.status(201).send({
        message: "You're on the waitlist! We'll be in touch soon.",
      })
    } catch (error) {
      fastify.log.error({ error }, 'Waitlist join failed')
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Unable to join waitlist right now',
      })
    }
  })

  // POST /waitlist/unsubscribe
  fastify.post('/waitlist/unsubscribe', async (request, reply) => {
    const body = unsubscribeSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Valid email is required',
      })
    }

    const email = body.data.email.toLowerCase()

    await db
      .update(waitlist)
      .set({ unsubscribedAt: new Date() })
      .where(eq(waitlist.email, email))

    // Always succeed — no enumeration
    return reply.send({ message: 'You have been unsubscribed.' })
  })
}

export default waitlistRoutes
