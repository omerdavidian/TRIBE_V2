import type { FastifyPluginAsync } from 'fastify'
import { SignJWT } from 'jose'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { db } from '../db/client.js'
import {
  adminActionLogs,
  adminNotifications,
  betaInvitations,
  bookings,
  donations,
  enterprisePartners,
  managerPermissions,
  passItForwardAllocations,
  platformSettings,
  providerServices,
  providerProfiles,
  registries,
  serviceCategories,
  servicePriceCaps,
  systemFeatureFlags,
  users,
  waitlist,
} from '../db/schema.js'
import { requirePermission, requireRole } from '../plugins/auth.js'
import { hashPassword } from '../lib/password.js'
import { sendPasswordReset, sendProviderApprovalEmail, sendProviderRejectionEmail, sendProviderInfoRequestEmail } from '../lib/email.js'
import { env } from '../lib/env.js'

const userRoleSchema = z.enum([
  'mother',
  'supporter',
  'provider',
  'business',
  'admin',
  'manager',
])

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120).optional(),
  role: userRoleSchema,
  password: z.string().min(8).optional(),
})

const patchUserSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  role: userRoleSchema.optional(),
  additionalRoles: z.array(userRoleSchema).optional(),
  isActive: z.boolean().optional(),
  suspendedReason: z.string().max(300).optional(),
})

const resetTriggerSchema = z.object({
  reason: z.string().max(250).optional(),
})

const invitationBulkSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
})

const invitationStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'opened', 'accepted', 'revoked']),
})

const refundSchema = z.object({
  donationId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  amountCents: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
})

const allocateSchema = z.object({
  recipientUserId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  note: z.string().max(500).optional(),
})

const vettingSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested']),
  note: z.string().max(500).optional(),
  infoMessage: z.string().max(2000).optional(),
})

const rescueSchema = z.object({
  newProviderId: z.string().uuid(),
})

const priceCapSchema = z.object({
  capCents: z.number().int().positive(),
})

const featureFlagSchema = z.object({
  enabled: z.boolean(),
  label: z.string().min(2).max(120).optional(),
})

const createProviderSchema = z.object({
  email: z.string().email().optional(), // auto-generated placeholder if omitted
  fullName: z.string().min(1).max(120).optional(),
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  password: z.string().min(8).optional(),
  businessName: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  serviceAreas: z.array(z.string()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
})

const enterprisePartnerSchema = z.object({
  name: z.string().min(2).max(200),
  domain: z
    .string()
    .min(3)
    .max(255)
    .transform((v) => v.toLowerCase().replace(/^@/, '')),
  budgetCents: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
})

function makeInviteCode() {
  return randomBytes(6).toString('hex').toUpperCase()
}

function makeTempPassword() {
  return randomBytes(8).toString('base64url').slice(0, 10)
}

async function logAdminAction(params: {
  adminUserId: string
  action: string
  targetType?: string
  targetId?: string
  details?: string
}) {
  await db.insert(adminActionLogs).values({
    adminUserId: params.adminUserId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details,
  })
}

async function getMigrationStats() {
  try {
    const countRows = await db.execute(sql`select count(*)::int as count from schema_migrations`)
    const latestRows = await db.execute(
      sql`select max(created_at)::text as latest from schema_migrations`
    )

    const migrationCount = Number(
      ((countRows as unknown as { rows: Array<{ count: number }> }).rows?.[0]?.count ?? 0)
    )
    const latestMigrationAt =
      (latestRows as unknown as { rows: Array<{ latest: string | null }> }).rows?.[0]
        ?.latest ?? null

    return { migrationCount, latestMigrationAt }
  } catch {
    return { migrationCount: 0, latestMigrationAt: null }
  }
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = requireRole('admin')

  /** Extra guard for the most sensitive endpoint:
   *  requires role=admin AND the specific bootstrap admin email.
   *  Prevents accidental or elevation-based access via other admin accounts. */
  async function requireBootstrapAdmin(request: import('fastify').FastifyRequest) {
    await adminOnly(request)
    const email = request.user?.email ?? ''
    if (email.toLowerCase() !== 'omerdavidian@gmail.com') {
      throw { statusCode: 403, message: 'Forbidden , reserved for the platform owner' }
    }
  }

  fastify.get(
    '/dashboard/admin/overview',
    { preHandler: requireBootstrapAdmin },
    async (_request, reply) => {
      const now = new Date()
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const deadAirThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const [gmvDonations] = await db
        .select({
          value: sql<number>`coalesce(sum(${donations.amountCents}), 0)`,
        })
        .from(donations)
        .where(eq(donations.status, 'completed'))

      const [gmvBookings] = await db
        .select({
          value: sql<number>`coalesce(sum(${bookings.amountCents}), 0)`,
        })
        .from(bookings)
        .where(eq(bookings.status, 'completed'))

      const roleRows = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(eq(users.isActive, true))
        .groupBy(users.role)

      const activeUsers: Record<string, number> = {
        mother: 0,
        supporter: 0,
        provider: 0,
        business: 0,
        admin: 0,
        manager: 0,
      }

      for (const row of roleRows) {
        activeUsers[row.role] = Number(row.count)
      }

      const [waitlistCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(waitlist)
        .where(sql`${waitlist.unsubscribedAt} is null`)

      const [convertedRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          sql`exists (
            select 1
            from waitlist w
            where lower(w.email) = lower(${users.email})
          )`
        )

      const [retained30Row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(sql`${users.lastLoginAt} is not null`, sql`${users.lastLoginAt} >= ${d30}`))

      const [retained90Row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(sql`${users.lastLoginAt} is not null`, sql`${users.lastLoginAt} >= ${d90}`))

      const [rescueRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(and(eq(bookings.status, 'pending'), sql`${bookings.updatedAt} <= ${deadAirThreshold}`))

      const [vettingRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(providerProfiles)
        .where(eq(providerProfiles.applicationStatus, 'pending'))

      const { migrationCount, latestMigrationAt } = await getMigrationStats()

      const waitlistCount = Number(waitlistCountRow?.count ?? 0)
      const converted = Number(convertedRow?.count ?? 0)

      return reply.send({
        gmvCents: Number(gmvDonations?.value ?? 0) + Number(gmvBookings?.value ?? 0),
        activeUsers,
        waitlistCount,
        waitlistToSignupConversionRate:
          waitlistCount > 0 ? Number((converted / waitlistCount).toFixed(4)) : 0,
        retention30dRate:
          converted > 0 ? Number((Number(retained30Row?.count ?? 0) / converted).toFixed(4)) : 0,
        retention90dRate:
          converted > 0 ? Number((Number(retained90Row?.count ?? 0) / converted).toFixed(4)) : 0,
        rescueQueueCount: Number(rescueRow?.count ?? 0),
        openProviderVettingCount: Number(vettingRow?.count ?? 0),
        migrationCount,
        latestMigrationAt,
      })
    }
  )

  fastify.get('/dashboard/admin/health', { preHandler: adminOnly }, async (_request, reply) => {
    const apiStart = Date.now()
    const dbStart = Date.now()
    await db.execute(sql`select 1`)
    const dbLatencyMs = Date.now() - dbStart

    const [disputedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, 'disputed'))

    const [bookingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)

    const { migrationCount, latestMigrationAt } = await getMigrationStats()

    return reply.send({
      apiLatencyMs: Date.now() - apiStart,
      dbLatencyMs,
      errorRate1h:
        Number(bookingCount?.count ?? 0) > 0
          ? Number(
              (
                Number(disputedCount?.count ?? 0) / Number(bookingCount?.count ?? 1)
              ).toFixed(4)
            )
          : 0,
      schemaMigrationCount: migrationCount,
      latestMigrationAt,
      generatedAt: new Date().toISOString(),
    })
  })

  fastify.get('/dashboard/admin/system/flags', { preHandler: adminOnly }, async (_request, reply) => {
    const flags = await db.query.systemFeatureFlags.findMany({
      orderBy: [desc(systemFeatureFlags.updatedAt)],
    })
    return reply.send(flags)
  })

  fastify.put('/dashboard/admin/system/flags/:key', { preHandler: adminOnly }, async (request, reply) => {
    const body = featureFlagSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const key = (request.params as { key: string }).key
    const [updated] = await db
      .insert(systemFeatureFlags)
      .values({
        key,
        label: body.data.label ?? key,
        enabled: body.data.enabled,
        updatedBy: request.user!.sub,
      })
      .onConflictDoUpdate({
        target: systemFeatureFlags.key,
        set: {
          enabled: body.data.enabled,
          label: body.data.label ?? key,
          updatedBy: request.user!.sub,
          updatedAt: new Date(),
        },
      })
      .returning()

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'system.flag.update',
      targetType: 'system_feature_flag',
      targetId: key,
      details: JSON.stringify({ enabled: body.data.enabled }),
    })

    return reply.send(updated)
  })

  fastify.get('/dashboard/admin/users', { preHandler: requirePermission('users') }, async (request, reply) => {
    const query = request.query as {
      role?: string
      q?: string
      page?: string
      pageSize?: string
    }

    const page = Math.max(Number(query.page ?? 1), 1)
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 200)
    const offset = (page - 1) * pageSize

    const filters: any[] = []
    if (query.role && ['mother', 'supporter', 'provider', 'business', 'admin'].includes(query.role)) {
      filters.push(eq(users.role, query.role as 'mother'))
    }
    if (query.q) {
      const qLike = `%${query.q}%`
      filters.push(
        sql`(
          ${users.email} ilike ${qLike}
          or coalesce(${users.fullName}, '') ilike ${qLike}
        )`
      )
    }

    const whereClause =
      filters.length === 0
        ? undefined
        : filters.length === 1
        ? filters[0]
        : and(...filters)

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        additionalRoles: users.additionalRoles,
        fullName: users.fullName,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        suspendedAt: users.suspendedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset)

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)

    return reply.send({
      data: rows,
      total: Number(countRow?.count ?? 0),
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(Number(countRow?.count ?? 0) / pageSize), 1),
    })
  })

  fastify.post('/dashboard/admin/users', { preHandler: adminOnly }, async (request, reply) => {
    const body = createUserSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, body.data.email.toLowerCase()) })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'User already exists' })
    }

    const password = body.data.password ?? makeTempPassword()
    const passwordHash = await hashPassword(password)

    const [created] = await db
      .insert(users)
      .values({
        email: body.data.email.toLowerCase(),
        fullName: body.data.fullName,
        role: body.data.role,
        passwordHash,
      })
      .returning()

    if (!created) {
      return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create user' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'user.create',
      targetType: 'user',
      targetId: created.id,
      details: JSON.stringify({ email: created.email, role: created.role }),
    })

    return reply.status(201).send({ ...created, temporaryPassword: password })
  })

  fastify.patch('/dashboard/admin/users/:id', { preHandler: adminOnly }, async (request, reply) => {
    const body = patchUserSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const id = (request.params as { id: string }).id
    const [updated] = await db
      .update(users)
      .set({
        ...(body.data.fullName !== undefined && { fullName: body.data.fullName }),
        ...(body.data.role !== undefined && { role: body.data.role }),
        ...(body.data.additionalRoles !== undefined && { additionalRoles: body.data.additionalRoles }),
        ...(body.data.isActive !== undefined && {
          isActive: body.data.isActive,
          suspendedAt: body.data.isActive ? null : new Date(),
          suspendedReason: body.data.isActive ? null : body.data.suspendedReason ?? 'Suspended by admin',
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'user.update',
      targetType: 'user',
      targetId: id,
      details: JSON.stringify(body.data),
    })

    return reply.send(updated)
  })

  fastify.delete('/dashboard/admin/users/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = (request.params as { id: string }).id

    const [updated] = await db
      .update(users)
      .set({
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason: 'Deactivated by admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id })

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'user.deactivate',
      targetType: 'user',
      targetId: id,
    })

    return reply.send({ success: true })
  })

  fastify.post('/dashboard/admin/users/:id/reset-password-trigger', { preHandler: adminOnly }, async (request, reply) => {
    const body = resetTriggerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const id = (request.params as { id: string }).id
    const target = await db.query.users.findFirst({ where: eq(users.id, id) })

    if (!target) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db
      .update(users)
      .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
      .where(eq(users.id, id))

    await sendPasswordReset(target.email, token)

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'user.reset_password_trigger',
      targetType: 'user',
      targetId: id,
      details: body.data.reason,
    })

    return reply.send({ success: true, expiresAt: expiresAt.toISOString() })
  })

  fastify.get('/dashboard/admin/users/:id/impersonation-view', { preHandler: adminOnly }, async (request, reply) => {
    const id = (request.params as { id: string }).id
    const target = await db.query.users.findFirst({ where: eq(users.id, id) })

    if (!target) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }

    const token = await new SignJWT({
      mode: 'read_only_impersonation',
      targetUserId: target.id,
      targetRole: target.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(request.user!.sub)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 15 * 60)
      .sign(new TextEncoder().encode(env.JWT_SECRET))

    return reply.send({
      token,
      expiresInSeconds: 900,
      user: {
        id: target.id,
        email: target.email,
        role: target.role,
        fullName: target.fullName,
      },
      note: 'Read-only support impersonation token for troubleshooting workflows.',
    })
  })

  fastify.get('/dashboard/admin/beta/invitations', { preHandler: adminOnly }, async (_request, reply) => {
    const rows = await db.query.betaInvitations.findMany({
      orderBy: [desc(betaInvitations.createdAt)],
    })
    return reply.send(rows)
  })

  fastify.post('/dashboard/admin/beta/invitations/bulk', { preHandler: adminOnly }, async (request, reply) => {
    const body = invitationBulkSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const created = [] as Array<{ email: string; inviteCode: string }>

    for (const email of body.data.emails.map((e) => e.toLowerCase())) {
      const [row] = await db
        .insert(betaInvitations)
        .values({
          email,
          inviteCode: makeInviteCode(),
          status: 'sent',
          sentAt: new Date(),
          createdBy: request.user!.sub,
        })
        .returning({ email: betaInvitations.email, inviteCode: betaInvitations.inviteCode })
      if (row) created.push(row)
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'beta.bulk_invite',
      targetType: 'beta_invitations',
      details: JSON.stringify({ count: created.length }),
    })

    return reply.status(201).send({ createdCount: created.length, created })
  })

  fastify.post('/dashboard/admin/beta/invitations/:id/mark', { preHandler: adminOnly }, async (request, reply) => {
    const body = invitationStatusSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const id = (request.params as { id: string }).id
    const now = new Date()

    const [updated] = await db
      .update(betaInvitations)
      .set({
        status: body.data.status,
        ...(body.data.status === 'opened' && { openedAt: now }),
        ...(body.data.status === 'accepted' && { acceptedAt: now }),
        ...(body.data.status === 'sent' && { sentAt: now }),
        updatedAt: now,
      })
      .where(eq(betaInvitations.id, id))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invitation not found' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'beta.invitation_mark',
      targetType: 'beta_invitation',
      targetId: id,
      details: body.data.status,
    })

    return reply.send(updated)
  })

  fastify.get('/dashboard/admin/ledger/overview', { preHandler: requirePermission('financials') }, async (_request, reply) => {
    const [donationCompleted] = await db
      .select({ value: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.status, 'completed'))

    const [donationPending] = await db
      .select({ value: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.status, 'pending'))

    const [bookingCompleted] = await db
      .select({ value: sql<number>`coalesce(sum(${bookings.amountCents}), 0)` })
      .from(bookings)
      .where(eq(bookings.status, 'completed'))

    const [refunded] = await db
      .select({ value: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.status, 'refunded'))

    const [passItForwardPool] = await db
      .select({ value: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(and(eq(donations.status, 'completed'), isNull(donations.registryId)))

    const [allocated] = await db
      .select({ value: sql<number>`coalesce(sum(${passItForwardAllocations.amountCents}), 0)` })
      .from(passItForwardAllocations)

    return reply.send({
      registryEscrowCents: Number(donationPending?.value ?? 0),
      totalFundedCents: Number(donationCompleted?.value ?? 0) + Number(bookingCompleted?.value ?? 0),
      refundedCents: Number(refunded?.value ?? 0),
      passItForwardPoolCents: Number(passItForwardPool?.value ?? 0),
      passItForwardAllocatedCents: Number(allocated?.value ?? 0),
    })
  })

  fastify.post('/dashboard/admin/ledger/refunds', { preHandler: adminOnly }, async (request, reply) => {
    const body = refundSchema.safeParse(request.body)
    if (!body.success || (!body.data.donationId && !body.data.bookingId)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'donationId or bookingId is required' })
    }

    if (body.data.donationId) {
      const [updatedDonation] = await db
        .update(donations)
        .set({ status: 'refunded' })
        .where(eq(donations.id, body.data.donationId))
        .returning()

      if (!updatedDonation) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Donation not found' })
      }
    }

    if (body.data.bookingId) {
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          cancellationReason: body.data.reason ?? 'Refunded by admin',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, body.data.bookingId))
        .returning()

      if (!updatedBooking) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Booking not found' })
      }
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'ledger.refund',
      targetType: body.data.donationId ? 'donation' : 'booking',
      targetId: body.data.donationId ?? body.data.bookingId,
      details: JSON.stringify(body.data),
    })

    return reply.send({ success: true, provider: 'stripe', simulated: true })
  })

  fastify.post('/dashboard/admin/ledger/pass-it-forward/allocate', { preHandler: adminOnly }, async (request, reply) => {
    const body = allocateSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const [allocation] = await db
      .insert(passItForwardAllocations)
      .values({
        recipientUserId: body.data.recipientUserId,
        amountCents: body.data.amountCents,
        note: body.data.note,
        allocatedBy: request.user!.sub,
      })
      .returning()

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'ledger.pass_it_forward_allocate',
      targetType: 'user',
      targetId: body.data.recipientUserId,
      details: JSON.stringify(body.data),
    })

    return reply.status(201).send(allocation)
  })

  fastify.get('/dashboard/admin/ledger/pass-it-forward/allocations', { preHandler: adminOnly }, async (_request, reply) => {
    const rows = await db.query.passItForwardAllocations.findMany({
      orderBy: [desc(passItForwardAllocations.createdAt)],
      with: {
        recipient: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return reply.send(rows)
  })

  fastify.get('/dashboard/admin/providers/vetting', { preHandler: requirePermission('vendors') }, async (request, reply) => {
    const q = request.query as { status?: string }
    const statusVal = q.status
    const whereClause = statusVal === 'all'
      ? undefined
      : eq(providerProfiles.applicationStatus, (statusVal ?? 'pending') as 'pending' | 'approved' | 'rejected' | 'info_requested')
    const rows = await db.query.providerProfiles.findMany({
      where: whereClause,
      orderBy: [desc(providerProfiles.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        },
        services: {
          with: {
            category: {
              columns: { id: true, name: true, slug: true },
            },
          },
        },
        documents: true,
      },
    })

    return reply.send(rows)
  })

  // POST /dashboard/admin/providers , manually onboard an approved provider
  fastify.post('/dashboard/admin/providers', { preHandler: adminOnly }, async (request, reply) => {
    const body = createProviderSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    // Auto-generate a placeholder email if none supplied (shell vendor mode)
    const { randomUUID } = await import('crypto')
    const vendorEmail = body.data.email ?? `vendor-${randomUUID()}@tribe.internal`
    const emailLower = vendorEmail.toLowerCase()

    const existing = await db.query.users.findFirst({ where: eq(users.email, emailLower) })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'A user with this email already exists' })
    }

    const password = body.data.password ?? makeTempPassword()
    const passwordHash = await hashPassword(password)

    const [newUser] = await db
      .insert(users)
      .values({
        email: emailLower,
        fullName: body.data.fullName ?? body.data.businessName ?? null,
        firstName: body.data.firstName ?? null,
        lastName: body.data.lastName ?? null,
        role: 'provider',
        passwordHash,
      })
      .returning()

    if (!newUser) {
      return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create provider account' })
    }

    const [profile] = await db
      .insert(providerProfiles)
      .values({
        userId: newUser.id,
        businessName: body.data.businessName,
        bio: body.data.bio ?? null,
        serviceAreas: body.data.serviceAreas,
        applicationStatus: 'approved',
        reviewedAt: new Date(),
      })
      .returning()

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'provider.admin_create',
      targetType: 'user',
      targetId: newUser.id,
      details: JSON.stringify({ email: newUser.email, businessName: body.data.businessName }),
    })

    if (profile && body.data.categoryIds.length > 0) {
      await db.insert(providerServices).values(
        body.data.categoryIds.map((catId) => ({
          providerProfileId: profile.id,
          categoryId: catId,
        }))
      ).onConflictDoNothing()
    }

    // Only send back a temporaryPassword if a real email was provided (for actual logins)
    const isShellVendor = !body.data.email
    return reply.status(201).send({
      user: newUser,
      providerProfile: profile,
      temporaryPassword: isShellVendor ? undefined : (body.data.password ? undefined : password),
    })
  })

  fastify.post('/dashboard/admin/providers/:id/vetting', { preHandler: adminOnly }, async (request, reply) => {
    const body = vettingSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const id = (request.params as { id: string }).id
    const [updated] = await db
      .update(providerProfiles)
      .set({
        applicationStatus: body.data.status,
        reviewNote: body.data.note ?? null,
        infoRequestMessage: body.data.infoMessage ?? null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, id))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider profile not found' })
    }

    // Fire status-specific lifecycle emails
    const providerUser = await db.query.users.findFirst({ where: eq(users.id, updated.userId) })
    if (providerUser) {
      const name = providerUser.fullName ?? providerUser.email
      if (body.data.status === 'approved') {
        sendProviderApprovalEmail(providerUser.email, name).catch(console.error)
      } else if (body.data.status === 'rejected') {
        sendProviderRejectionEmail(providerUser.email, name, body.data.note).catch(console.error)
      } else if (body.data.status === 'info_requested') {
        const msg = body.data.infoMessage ?? body.data.note ?? 'Please provide additional information.'
        sendProviderInfoRequestEmail(providerUser.email, name, msg).catch(console.error)
      }
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'provider.vetting_update',
      targetType: 'provider_profile',
      targetId: id,
      details: JSON.stringify(body.data),
    })

    return reply.send(updated)
  })

  fastify.get('/dashboard/admin/bookings/dead-air', { preHandler: adminOnly }, async (request, reply) => {
    const q = request.query as { minutes?: string }
    const thresholdMinutes = Math.max(Number(q.minutes ?? 180), 5)
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000)

    const rows = await db.query.bookings.findMany({
      where: and(eq(bookings.status, 'pending'), sql`${bookings.updatedAt} <= ${threshold}`),
      orderBy: [desc(bookings.updatedAt)],
    })

    return reply.send({
      thresholdMinutes,
      count: rows.length,
      rows,
    })
  })

  fastify.post('/dashboard/admin/bookings/:id/rescue', { preHandler: adminOnly }, async (request, reply) => {
    const body = rescueSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const id = (request.params as { id: string }).id
    const [updated] = await db
      .update(bookings)
      .set({
        providerId: body.data.newProviderId,
        notes: sql`coalesce(${bookings.notes}, '') || '\n[Rescued by admin at ${new Date().toISOString()}]'`,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    if (!updated) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Booking not found' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'booking.rescue',
      targetType: 'booking',
      targetId: id,
      details: JSON.stringify(body.data),
    })

    return reply.send(updated)
  })

  fastify.get('/dashboard/admin/catalog/price-caps', { preHandler: adminOnly }, async (_request, reply) => {
    const rows = await db.query.serviceCategories.findMany({
      orderBy: [serviceCategories.sortOrder],
    })

    const serviceRows = await db
      .select({
        categoryId: providerServices.categoryId,
        priceMaxCents: providerServices.priceMaxCents,
      })
      .from(providerServices)

    const caps = await db.query.servicePriceCaps.findMany()
    const capsByCategory = new Map(caps.map((c) => [c.categoryId, c]))

    const maxByCategory = new Map<string, number>()
    for (const row of serviceRows) {
      if (!row.categoryId) continue
      const current = maxByCategory.get(row.categoryId) ?? 0
      const next = row.priceMaxCents ?? 0
      maxByCategory.set(row.categoryId, Math.max(current, next))
    }

    return reply.send(
      rows.map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        observedMaxCents: maxByCategory.get(category.id) ?? 0,
        capCents: capsByCategory.get(category.id)?.capCents ?? null,
      }))
    )
  })

  fastify.put('/dashboard/admin/catalog/price-caps/:categoryId', { preHandler: adminOnly }, async (request, reply) => {
    const body = priceCapSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const categoryId = (request.params as { categoryId: string }).categoryId

    const [updated] = await db
      .insert(servicePriceCaps)
      .values({
        categoryId,
        capCents: body.data.capCents,
        updatedBy: request.user!.sub,
      })
      .onConflictDoUpdate({
        target: servicePriceCaps.categoryId,
        set: {
          capCents: body.data.capCents,
          updatedBy: request.user!.sub,
          updatedAt: new Date(),
        },
      })
      .returning()

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'catalog.price_cap_update',
      targetType: 'service_category',
      targetId: categoryId,
      details: JSON.stringify({ capCents: body.data.capCents }),
    })

    return reply.send(updated)
  })

  fastify.post('/dashboard/admin/enterprise/partners', { preHandler: adminOnly }, async (request, reply) => {
    const body = enterprisePartnerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const [created] = await db
      .insert(enterprisePartners)
      .values({
        name: body.data.name,
        domain: body.data.domain,
        budgetCents: body.data.budgetCents,
        isActive: body.data.isActive,
        createdBy: request.user!.sub,
      })
      .returning()

    if (!created) {
      return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create enterprise partner' })
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'enterprise.partner_create',
      targetType: 'enterprise_partner',
      targetId: created.id,
      details: JSON.stringify(body.data),
    })

    return reply.status(201).send(created)
  })

  fastify.get('/dashboard/admin/enterprise/partners', { preHandler: adminOnly }, async (_request, reply) => {
    const rows = await db.query.enterprisePartners.findMany({
      orderBy: [desc(enterprisePartners.createdAt)],
    })
    return reply.send(rows)
  })

  fastify.get('/dashboard/admin/enterprise/partners/:id/report', { preHandler: adminOnly }, async (request, reply) => {
    const id = (request.params as { id: string }).id

    const partner = await db.query.enterprisePartners.findFirst({
      where: eq(enterprisePartners.id, id),
    })

    if (!partner) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Partner not found' })
    }

    const [totalBookings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)

    const [totalDonations] = await db
      .select({ value: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.status, 'completed'))

    return reply.send({
      partner: {
        id: partner.id,
        name: partner.name,
        domain: partner.domain,
      },
      month: new Date().toISOString().slice(0, 7),
      metrics: {
        totalBookings: Number(totalBookings?.count ?? 0),
        fundedCareValueCents: Number(totalDonations?.value ?? 0),
        budgetCents: partner.budgetCents,
      },
      format: 'pdf-ready-json',
    })
  })

  // ─── Platform Settings ────────────────────────────────────────────────────

  /** GET /dashboard/admin/settings — list all platform settings */
  fastify.get('/dashboard/admin/settings', { preHandler: requirePermission('settings') }, async (_request, reply) => {
    const rows = await db.select().from(platformSettings).orderBy(platformSettings.key)
    return reply.send(rows)
  })

  /** GET /dashboard/admin/settings/:key — get a single setting */
  fastify.get('/dashboard/admin/settings/:key', { preHandler: requirePermission('settings') }, async (request, reply) => {
    const { key } = request.params as { key: string }
    const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1)
    if (!row) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Setting not found' })
    return reply.send(row)
  })

  /** PATCH /dashboard/admin/settings/:key — update a setting value (admin only) */
  fastify.patch('/dashboard/admin/settings/:key', { preHandler: adminOnly }, async (request, reply) => {
    const { key } = request.params as { key: string }
    const body = z.object({ value: z.string().min(1), label: z.string().optional() }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    const [existing] = await db.select({ id: platformSettings.id }).from(platformSettings).where(eq(platformSettings.key, key)).limit(1)

    let row
    if (existing) {
      const updates: Record<string, unknown> = { value: body.data.value, updatedAt: new Date() }
      if (body.data.label !== undefined) updates.label = body.data.label
      ;[row] = await db.update(platformSettings).set(updates).where(eq(platformSettings.key, key)).returning()
    } else {
      ;[row] = await db.insert(platformSettings).values({ key, value: body.data.value, label: body.data.label ?? null }).returning()
    }

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'settings.update',
      targetType: 'platform_settings',
      targetId: key,
      details: JSON.stringify({ value: body.data.value }),
    })

    return reply.send(row)
  })

  // ─── Manager Permissions ──────────────────────────────────────────────────

  /** GET /dashboard/manager/me/permissions — returns the current manager's own permission modules */
  fastify.get('/dashboard/manager/me/permissions', { preHandler: [requireRole('admin', 'manager')] }, async (request, reply) => {
    const { sub } = request.user!
    const rows = await db.select({ module: managerPermissions.module }).from(managerPermissions).where(eq(managerPermissions.userId, sub))
    return reply.send(rows.map((r) => r.module))
  })

  /** GET /dashboard/admin/managers/:userId/permissions — list permissions for a manager */
  fastify.get('/dashboard/admin/managers/:userId/permissions', { preHandler: adminOnly }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const rows = await db.select().from(managerPermissions).where(eq(managerPermissions.userId, userId))
    return reply.send(rows)
  })

  /** PUT /dashboard/admin/managers/:userId/permissions — replace full permission set */
  fastify.put('/dashboard/admin/managers/:userId/permissions', { preHandler: adminOnly }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const body = z.object({ modules: z.array(z.string().min(1)) }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.flatten().fieldErrors })
    }

    // Verify user exists and is a manager
    const [mgr] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    if (!mgr) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    if (mgr.role !== 'manager') return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'User is not a manager' })

    // Replace all permissions
    await db.delete(managerPermissions).where(eq(managerPermissions.userId, userId))
    const inserted = body.data.modules.length > 0
      ? await db.insert(managerPermissions).values(body.data.modules.map((module) => ({ userId, module }))).returning()
      : []

    await logAdminAction({
      adminUserId: request.user!.sub,
      action: 'manager.permissions_update',
      targetType: 'user',
      targetId: userId,
      details: JSON.stringify({ modules: body.data.modules }),
    })

    return reply.send(inserted)
  })

  // ─── Admin Notifications ──────────────────────────────────────────────────

  /** GET /dashboard/admin/notifications — returns notifications relevant to the requesting user */
  fastify.get('/dashboard/admin/notifications', { preHandler: [requireRole('admin', 'manager')] }, async (request, reply) => {
    const { role, sub } = request.user!
    const q = request.query as { unread?: string; limit?: string }
    const limitVal = Math.min(parseInt(q.limit ?? '50', 10), 200)

    let rows
    if (role === 'admin') {
      // Admins see everything
      const conditions = q.unread === 'true' ? eq(adminNotifications.isRead, false) : undefined
      rows = await db.select().from(adminNotifications)
        .where(conditions)
        .orderBy(desc(adminNotifications.createdAt))
        .limit(limitVal)
    } else {
      // Managers see only notifications for roles that include 'manager' and where
      // they have the required_permission module
      const managersModules = await db.select({ module: managerPermissions.module })
        .from(managerPermissions)
        .where(eq(managerPermissions.userId, sub))
      const modules = managersModules.map((r) => r.module)

      rows = await db.select().from(adminNotifications)
        .where(
          and(
            sql`'manager' = ANY(${adminNotifications.targetRoles})`,
            or(
              isNull(adminNotifications.requiredPermission),
              modules.length > 0
                ? sql`${adminNotifications.requiredPermission} = ANY(ARRAY[${sql.join(modules.map((m) => sql`${m}`), sql`, `)}]::text[])`
                : sql`false`,
            ),
            q.unread === 'true' ? eq(adminNotifications.isRead, false) : sql`true`,
          )
        )
        .orderBy(desc(adminNotifications.createdAt))
        .limit(limitVal)
    }

    const unreadCount = rows.filter((n) => !n.isRead).length
    return reply.send({ notifications: rows, unreadCount })
  })

  /** PATCH /dashboard/admin/notifications/:id/read — mark a notification as read */
  fastify.patch('/dashboard/admin/notifications/:id/read', { preHandler: [requireRole('admin', 'manager')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const [updated] = await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, id))
      .returning()
    if (!updated) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Notification not found' })
    return reply.send(updated)
  })

  /** PATCH /dashboard/admin/notifications/mark-all-read — mark all visible notifications as read */
  fastify.patch('/dashboard/admin/notifications/mark-all-read', { preHandler: [requireRole('admin', 'manager')] }, async (_request, reply) => {
    await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.isRead, false))
    return reply.send({ success: true })
  })
}

export default adminRoutes
