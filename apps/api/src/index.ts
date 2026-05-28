// Trigger Railway deployment
import 'dotenv/config'
import './lib/env.js' // validate env vars before anything else
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './lib/env.js'
import authPlugin from './plugins/auth.js'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import waitlistRoutes from './routes/waitlist.js'
import catalogRoutes from './routes/catalog.js'
import registryRoutes from './routes/registry.js'
import adminRoutes from './routes/admin.js'
import providerRoutes from './routes/provider.js'
import donationRoutes from './routes/donations.js'
import { registerWebhookRoutes } from './routes/webhooks.js'
import { ensureBaselineSchema } from './db/ensure-baseline-schema.js'

const fastify = Fastify({
  logger:
    env.NODE_ENV === 'production'
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        },
}).withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

function buildCorsMatchers(raw: string) {
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((origin) => {
      if (!origin.includes('*')) {
        return { kind: 'exact' as const, value: origin }
      }

      const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      const pattern = `^${escaped.replace(/\*/g, '.*')}$`
      return { kind: 'regex' as const, value: new RegExp(pattern, 'i') }
    })
}

async function bootstrap() {
  await ensureBaselineSchema()
  const corsMatchers = buildCorsMatchers(env.CORS_ORIGIN)

  // ─── Security plugins ────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true)
        return
      }

      const allowed = corsMatchers.some((matcher) => {
        if (matcher.kind === 'exact') return matcher.value === origin
        return matcher.value.test(origin)
      })

      cb(null, allowed)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await fastify.register(cookie, {
    secret: env.JWT_SECRET, // signs cookies
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait a moment.',
    }),
  })

  // ─── Auth plugin ──────────────────────────────────────────────────────────────
  await fastify.register(authPlugin)

  // ─── Routes (all under /v1 prefix) ──────────────────────────────────────────
  await fastify.register(
    async (app) => {
      await app.register(healthRoutes)
      await app.register(authRoutes)
      await app.register(waitlistRoutes)
      await app.register(catalogRoutes)
      await app.register(registryRoutes)
      await app.register(adminRoutes)
      await app.register(providerRoutes)
      await app.register(donationRoutes)
      await registerWebhookRoutes(app)
    },
    { prefix: '/v1' }
  )

  // ─── 404 handler ─────────────────────────────────────────────────────────────
  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Route not found',
    })
  })

  // ─── Error handler ────────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error)
    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Error',
      message: statusCode === 500 ? 'Internal server error' : error.message,
    })
  })

  // ─── Start ────────────────────────────────────────────────────────────────────
  const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'
  await fastify.listen({ port: env.PORT, host })
  fastify.log.info(`TRIBE API ready on port ${env.PORT}`)
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
