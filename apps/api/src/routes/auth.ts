import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { signJwt } from '../lib/jwt.js'
import { env } from '../lib/env.js'
import {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
} from '../lib/email.js'
import { requireAuth } from '../plugins/auth.js'
import type { UserRole } from '@tribe/shared'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(100),
  role: z.enum(['mother', 'supporter', 'provider', 'business']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

function getResetBaseOrigin(headers: Record<string, unknown>): string {
  const origin = typeof headers['origin'] === 'string' ? headers['origin'] : ''
  const referer = typeof headers['referer'] === 'string' ? headers['referer'] : ''

  const candidates = [origin, referer]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin
      }
    } catch {
      // ignore malformed header values and continue
    }
  }

  return env.FRONTEND_URL
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authSelect = {
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash,
    role: users.role,
    fullName: users.fullName,
    avatarUrl: users.avatarUrl,
    authProvider: users.authProvider,
    emailVerifiedAt: users.emailVerifiedAt,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerificationToken: users.emailVerificationToken,
    passwordResetToken: users.passwordResetToken,
    passwordResetExpiresAt: users.passwordResetExpiresAt,
  }

  // POST /auth/register
  fastify.post('/auth/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: body.error.flatten().fieldErrors,
      })
    }

    const { email, password, fullName, role } = body.data

    const [existing] = await db
      .select(authSelect)
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'This email is already registered. Please log in or reset your password.',
      })
    }

    const passwordHash = await hashPassword(password)
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        role: role as UserRole,
        authProvider: 'email',
        emailVerificationToken: verificationToken,
        emailVerificationSentAt: new Date(),
      })
      .returning()

    if (!user) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to create account',
      })
    }

    // Fire-and-forget emails
    sendWelcomeEmail(user.email, user.fullName ?? 'there').catch(console.error)
    sendEmailVerification(user.email, verificationToken).catch(console.error)

    const accessToken = await signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    return reply.status(201).send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    })
  })

  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      const { email, password } = body.data

      const [user] = await db
        .select(authSelect)
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)

      if (!user || !user.passwordHash) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
      }

      const valid = await verifyPassword(password, user.passwordHash)
      if (!valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
      }

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id))

      const accessToken = await signJwt({
        sub: user.id,
        email: user.email,
        role: user.role,
      })

      return reply.send({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          authProvider: user.authProvider,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          lastLoginAt: new Date().toISOString(),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      fastify.log.error({ error }, 'Login failed')
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Unable to log in right now',
      })
    }
  })

  // GET /auth/me , requires auth
  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select(authSelect)
      .from(users)
      .where(eq(users.id, request.user!.sub))
      .limit(1)

    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    return reply.send({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })
  })

  // POST /auth/verify-email
  fastify.post('/auth/verify-email', async (request, reply) => {
    const body = verifyEmailSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Token required' })
    }

    const [user] = await db
      .select(authSelect)
      .from(users)
      .where(eq(users.emailVerificationToken, body.data.token))
      .limit(1)

    if (!user) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid or expired token' })
    }

    await db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
      })
      .where(eq(users.id, user.id))

    return reply.send({ message: 'Email verified successfully' })
  })

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Valid email required' })
    }

    // Always return 200 to prevent email enumeration
    const [user] = await db
      .select(authSelect)
      .from(users)
      .where(eq(users.email, body.data.email.toLowerCase()))
      .limit(1)

    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      const resetBaseOrigin = getResetBaseOrigin(request.headers as unknown as Record<string, unknown>)

      await db
        .update(users)
        .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
        .where(eq(users.id, user.id))

      sendPasswordReset(user.email, token, resetBaseOrigin).catch(console.error)
    }

    return reply.send({ message: 'If an account with that email exists, a reset link has been sent.' })
  })

  // POST /auth/reset-password
  fastify.post('/auth/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Token and password required' })
    }

    const [user] = await db
      .select(authSelect)
      .from(users)
      .where(eq(users.passwordResetToken, body.data.token))
      .limit(1)

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid or expired token' })
    }

    const passwordHash = await hashPassword(body.data.password)

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id))

    return reply.send({ message: 'Password reset successfully' })
  })
}

export default authRoutes
