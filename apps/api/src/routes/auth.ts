import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { db } from '../db/client.js'
import { users, providerProfiles, managerPermissions, adminNotifications } from '../db/schema.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { signJwt } from '../lib/jwt.js'
import { env } from '../lib/env.js'
import {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendProviderVerificationAlert,
  sendVendorSignupNotificationEmail,
} from '../lib/email.js'
import { requireAuth } from '../plugins/auth.js'
import type { UserRole } from '@tribe/shared'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
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

/**
 * Fire-and-forget: creates admin_notifications rows and emails all admins +
 * managers who have the 'vendors' permission module.
 */
async function notifyAdminsAndManagersOfVendorSignup(vendorName: string, vendorEmail: string) {
  // 1. Collect recipient emails and ids
  const admins = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, 'admin'))

  const managersWithVendors = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .innerJoin(managerPermissions, eq(managerPermissions.userId, users.id))
    .where(eq(managerPermissions.module, 'vendors'))

  // 2. Insert a single shared admin_notification visible to admins + vendor-managers
  await db.insert(adminNotifications).values({
    type: 'provider_signup',
    title: `New vendor signup: ${vendorName}`,
    body: `${vendorName} (${vendorEmail}) registered as a provider and is awaiting review.`,
    metadata: { vendorName, vendorEmail },
    targetRoles: ['admin', 'manager'],
    requiredPermission: 'vendors',
    isRead: false,
  })

  // 3. Email all admin recipients (no duplicate filtering needed; admins always included)
  const adminEmails = admins.map((a) => a.email)
  const managerEmails = managersWithVendors.map((m) => m.email)
  const allRecipients = [...new Set([...adminEmails, ...managerEmails])]

  for (const email of allRecipients) {
    await sendVendorSignupNotificationEmail(email, vendorName, vendorEmail).catch(console.error)
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authSelect = {
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash,
    role: users.role,
    additionalRoles: users.additionalRoles,
    firstName: users.firstName,
    lastName: users.lastName,
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

    const { email, password, firstName, lastName, role } = body.data

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
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
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
    sendWelcomeEmail(user.email, user.firstName ?? user.fullName ?? 'there').catch(console.error)
    sendEmailVerification(user.email, verificationToken).catch(console.error)

    // If provider role: bootstrap pending profile and alert platform management
    if (role === 'provider') {
      db.insert(providerProfiles)
        .values({ userId: user.id, applicationStatus: 'draft' })
        .catch((err: unknown) => console.error('[PROVIDER PROFILE CREATE]', err))
      sendProviderVerificationAlert(
        user.fullName ?? user.email,
        user.email
      ).catch(console.error)
      // Notify all admins + managers with 'vendors' permission via DB notification + email
      notifyAdminsAndManagersOfVendorSignup(
        user.fullName ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email),
        user.email,
      ).catch(console.error)
    }

    const accessToken = await signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      additionalRoles: user.additionalRoles ?? [],
    })

    return reply.status(201).send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        additionalRoles: user.additionalRoles ?? [],
        firstName: user.firstName,
        lastName: user.lastName,
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
          firstName: user.firstName,
          lastName: user.lastName,
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
      firstName: user.firstName,
      lastName: user.lastName,
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

  // POST /auth/add-role — add an additional workspace/role to an existing account
  fastify.post('/auth/add-role', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      role: z.enum(['mother', 'supporter', 'provider']),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const userId = request.user!.sub
    const newRole = body.data.role

    const [user] = await db.select(authSelect).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })

    // Check not already held
    const allRoles = [user.role, ...(user.additionalRoles ?? [])]
    if (allRoles.includes(newRole)) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: `You already have the '${newRole}' workspace.` })
    }

    const updatedAdditionalRoles = [...(user.additionalRoles ?? []), newRole]

    await db.update(users)
      .set({ additionalRoles: updatedAdditionalRoles, updatedAt: new Date() })
      .where(eq(users.id, userId))

    // Bootstrap required profile rows for the new role
    if (newRole === 'provider') {
      const existingProfile = await db.query.providerProfiles.findFirst({
        where: eq(providerProfiles.userId, userId),
      })
      if (!existingProfile) {
        await db.insert(providerProfiles)
          .values({ userId, applicationStatus: 'draft' })
          .onConflictDoNothing()
      }
    }

    // Issue a fresh JWT with the updated additionalRoles so it takes effect immediately
    const accessToken = await signJwt({
      sub: userId,
      email: user.email,
      role: user.role,
      additionalRoles: updatedAdditionalRoles,
    })

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        additionalRoles: updatedAdditionalRoles,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  })

  // POST /auth/change-password , requires authentication
  fastify.post('/auth/change-password', { preHandler: requireAuth }, async (request, reply) => {
    const changePasswordSchema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    })

    const body = changePasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: body.error.flatten().fieldErrors,
      })
    }

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash, authProvider: users.authProvider })
      .from(users)
      .where(eq(users.id, request.user!.sub))
      .limit(1)

    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    if (user.authProvider !== 'email' || !user.passwordHash) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Password change is only available for email accounts',
      })
    }

    const valid = await verifyPassword(body.data.currentPassword, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Current password is incorrect',
      })
    }

    const newPasswordHash = await hashPassword(body.data.newPassword)

    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return reply.send({ message: 'Password changed successfully' })
  })
}

export default authRoutes
