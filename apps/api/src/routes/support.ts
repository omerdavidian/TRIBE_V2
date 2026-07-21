import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, and, ilike, desc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { supportPages, registries, registryItems, users } from '../db/schema.js'
import { requireAuth, requireRole } from '../plugins/auth.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSupportSlug(firstName: string | null, lastName: string | null, fullName: string | null, userId: string): string {
  const name = [firstName, lastName].filter(Boolean).join(' ') || fullName || 'mother'
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = userId.replace(/-/g, '').slice(0, 8)
  return `${base}-${suffix}`
}

// Safe projection of user columns (no sensitive data)
const userPublicColumns = {
  id: true,
  fullName: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  email: false,
  passwordHash: false,
  googleId: false,
  appleId: false,
  emailVerificationToken: false,
  passwordResetToken: false,
} as const

// ─── Route plugin ─────────────────────────────────────────────────────────────

const supportRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /support/mine , get or auto-create the calling mother's support page
  fastify.get(
    '/support/mine',
    { preHandler: requireRole('mother') },
    async (request, reply) => {
      const userId = request.user!.sub

      let page = await db.query.supportPages.findFirst({
        where: eq(supportPages.userId, userId),
      })

      if (!page) {
        // Auto-create on first access
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
        const slug = generateSupportSlug(user?.firstName ?? null, user?.lastName ?? null, user?.fullName ?? null, userId)
        const [created] = await db
          .insert(supportPages)
          .values({ userId, slug, isActive: true })
          .returning()
        page = created
      }

      return reply.send(page)
    }
  )

  // PATCH /support/mine , update bio or heroImageUrl
  fastify.patch(
    '/support/mine',
    { preHandler: requireRole('mother') },
    async (request, reply) => {
      const userId = request.user!.sub
      const bodySchema = z.object({
        title: z.string().max(120).optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
        heroImageUrl: z.string().url().optional().nullable(),
      })
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          errors: body.error.flatten().fieldErrors,
        })
      }

      let page = await db.query.supportPages.findFirst({ where: eq(supportPages.userId, userId) })
      if (!page) {
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
        const slug = generateSupportSlug(user?.firstName ?? null, user?.lastName ?? null, user?.fullName ?? null, userId)
        const [created] = await db
          .insert(supportPages)
          .values({ userId, slug, ...body.data, isActive: true })
          .returning()
        return reply.send(created)
      }

      const [updated] = await db
        .update(supportPages)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(supportPages.userId, userId))
        .returning()

      return reply.send(updated)
    }
  )

  // GET /support/search , public search returning one result per mother
  fastify.get('/support/search', async (request, reply) => {
    const searchQuerySchema = z.object({
      q: z.string().optional().default(''),
    })
    const parsed = searchQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid query' })
    }
    const { q } = parsed.data
    const term = q.trim()

    // Fetch all published registries with user + items (to compute aggregate funding)
    const conditions = [eq(registries.isPublished, true)]
    if (term) conditions.push(ilike(registries.title, `%${term}%`))

    const rows = await db.query.registries.findMany({
      where: and(...conditions),
      orderBy: [desc(registries.createdAt)],
      limit: 200,
      with: {
        user: { columns: userPublicColumns },
        items: {
          columns: {
            id: true,
            targetAmountCents: true,
            fundedAmountCents: true,
            isFulfilled: true,
          },
        },
      },
    })

    // Group by userId → one entry per mother, aggregating all their registries
    const byUser = new Map<string, {
      userId: string
      user: typeof rows[0]['user']
      supportPageSlug: string | null
      registryCount: number
      totalTargetCents: number
      totalFundedCents: number
      earliestDueDate: string | null
      latestCreatedAt: string
    }>()

    // Pre-fetch all support pages for the matched user IDs
    const userIds = [...new Set(rows.map((r) => r.userId))]
    const pages = userIds.length > 0
      ? await db.query.supportPages.findMany({
          where: (sp, { inArray }) => inArray(sp.userId, userIds),
        })
      : []
    const pageByUserId = new Map(pages.map((p) => [p.userId, p.slug]))

    for (const r of rows) {
      const existing = byUser.get(r.userId)
      const itemTarget = r.items.reduce((s, i) => s + i.targetAmountCents, 0)
      const itemFunded = r.items.reduce((s, i) => s + i.fundedAmountCents, 0)

      if (!existing) {
        byUser.set(r.userId, {
          userId: r.userId,
          user: r.user,
          supportPageSlug: pageByUserId.get(r.userId) ?? null,
          registryCount: 1,
          totalTargetCents: itemTarget,
          totalFundedCents: itemFunded,
          earliestDueDate: r.dueDate ? r.dueDate.toISOString?.() ?? (r.dueDate as unknown as string) : null,
          latestCreatedAt: r.createdAt ? r.createdAt.toISOString?.() ?? (r.createdAt as unknown as string) : '',
        })
      } else {
        existing.registryCount += 1
        existing.totalTargetCents += itemTarget
        existing.totalFundedCents += itemFunded
        const rDue = r.dueDate ? new Date(r.dueDate as unknown as string).getTime() : null
        const eDue = existing.earliestDueDate ? new Date(existing.earliestDueDate).getTime() : null
        if (rDue && (!eDue || rDue < eDue)) {
          existing.earliestDueDate = r.dueDate ? r.dueDate.toISOString?.() ?? (r.dueDate as unknown as string) : null
        }
      }
    }

    return reply.send([...byUser.values()])
  })

  // GET /support/:slug , public view of a support page (all registries + items)
  fastify.get('/support/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const page = await db.query.supportPages.findFirst({
      where: and(eq(supportPages.slug, slug), eq(supportPages.isActive, true)),
    })

    if (!page) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Support page not found' })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, page.userId),
      columns: userPublicColumns,
    })

    const userRegistries = await db.query.registries.findMany({
      where: and(
        eq(registries.userId, page.userId),
        eq(registries.isPublished, true)
      ),
      orderBy: [desc(registries.createdAt)],
      with: {
        items: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: {
            category: true,
            providerProfile: {
              columns: {
                id: true,
                businessName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    return reply.send({
      ...page,
      user,
      registries: userRegistries,
    })
  })
}

export default supportRoutes
