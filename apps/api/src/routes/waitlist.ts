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

const unsubscribeQuerySchema = z.object({
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
        return reply.send({
          message: "You're already on the list! We will keep you posted when we go live",
        })
      }

      await db.insert(waitlist).values({
        email,
        source: body.data.source ?? 'website',
      })

      const result = await sendWaitlistConfirmation(email)
      if (!result.delivered) {
        fastify.log.error({ email, result }, 'Waitlist email delivery failed')
        return reply.status(502).send({
          statusCode: 502,
          error: 'Bad Gateway',
          message: 'Joined waitlist, but confirmation email delivery failed. Please try again later.',
        })
      }

      return reply.status(201).send({
        message: "You're on the waitlist! Confirmation email sent.",
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

    await db.delete(waitlist).where(eq(waitlist.email, email))

    // Always succeed, no enumeration
    return reply.send({ message: 'You have been unsubscribed.' })
  })

  // GET /waitlist/unsubscribe?email=... (public email footer endpoint)
  fastify.get('/waitlist/unsubscribe', async (request, reply) => {
    const parsed = unsubscribeQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply
        .type('text/html; charset=utf-8')
        .status(400)
        .send('<h1>Invalid unsubscribe link</h1>')
    }

    const email = parsed.data.email.toLowerCase()
    await db.delete(waitlist).where(eq(waitlist.email, email))

    return reply
      .type('text/html; charset=utf-8')
      .send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>TRIBE Unsubscribe</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 32px; color: #1f2937; }
              .card { max-width: 560px; margin: 40px auto; background: #fff; border: 1px solid #e7eaf1; border-radius: 16px; padding: 28px; }
              h1 { margin: 0 0 10px 0; color: #1f4a45; }
              p { line-height: 1.6; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>You have successfully unsubscribed</h1>
              <p>Your email has been removed from the TRIBE waitlist.</p>
            </div>
          </body>
        </html>
      `)
  })
}

export default waitlistRoutes
