import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, and, ilike, desc, gte, lte } from 'drizzle-orm'
import { db } from '../db/client.js'
import { registries, registryItems, users } from '../db/schema.js'
import { requireAuth, requireRole } from '../plugins/auth.js'

const createRegistrySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  coverImageUrl: z.string().url().optional(),
  targetAmountCents: z.number().int().positive().optional(),
})

const updateRegistrySchema = createRegistrySchema.partial().extend({
  isPublished: z.boolean().optional(),
})

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetAmountCents: z.number().int().positive(),
  categoryId: z.string().uuid().optional(),
  providerProfileId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
})

function generateSlug(title: string, userId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = userId.slice(0, 8)
  return `${base}-${suffix}`
}

const registryRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /registries, create a registry (mother only)
  fastify.post(
    '/registries',
    { preHandler: requireRole('mother') },
    async (request, reply) => {
      const body = createRegistrySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      const userId = request.user!.sub
      const slug = generateSlug(body.data.title, userId)

      const [registry] = await db
        .insert(registries)
        .values({
          userId,
          slug,
          title: body.data.title,
          description: body.data.description,
          dueDate: body.data.dueDate ? new Date(body.data.dueDate) : undefined,
          coverImageUrl: body.data.coverImageUrl,
          targetAmountCents: body.data.targetAmountCents,
        })
        .returning()

      return reply.status(201).send(registry)
    }
  )

  // GET /registries/mine, list my registries
  fastify.get(
    '/registries/mine',
    { preHandler: requireAuth },
    async (request, reply) => {
      const myRegistries = await db.query.registries.findMany({
        where: eq(registries.userId, request.user!.sub),
        orderBy: [desc(registries.createdAt)],
        with: { items: true },
      })

      return reply.send(myRegistries)
    }
  )

  // GET /registries/search — public unauthenticated directory search
  fastify.get('/registries/search', async (request, reply) => {
    const searchQuerySchema = z.object({
      q: z.string().optional().default(''),
      dueDateStart: z.string().datetime({ offset: true }).optional().catch(undefined),
      dueDateEnd: z.string().datetime({ offset: true }).optional().catch(undefined),
    })

    const parsed = searchQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.flatten().fieldErrors })
    }

    const { q, dueDateStart, dueDateEnd } = parsed.data
    const term = q.trim()

    const conditions = [eq(registries.isPublished, true)]
    if (term) conditions.push(ilike(registries.title, `%${term}%`))
    if (dueDateStart) conditions.push(gte(registries.dueDate, new Date(dueDateStart)))
    if (dueDateEnd) conditions.push(lte(registries.dueDate, new Date(dueDateEnd)))

    let rows = await db.query.registries.findMany({
      where: and(...conditions),
      orderBy: [desc(registries.createdAt)],
      limit: 80,
      with: {
        user: {
          columns: {
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
          },
        },
        items: {
          columns: {
            id: true,
            targetAmountCents: true,
            fundedAmountCents: true,
            isFulfilled: true,
          },
          with: {
            category: true,
          },
        },
      },
    })

    return reply.send(rows)
  })

  // GET /registries/:slug, public view
  fastify.get('/registries/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const registry = await db.query.registries.findFirst({
      where: and(
        eq(registries.slug, slug),
        eq(registries.isPublished, true)
      ),
      with: {
        items: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: {
            category: true,
            providerProfile: true,
          },
        },
        user: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: false,
            passwordHash: false,
            googleId: false,
            appleId: false,
            emailVerificationToken: false,
            passwordResetToken: false,
          },
        },
      },
    })

    if (!registry) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Registry not found' })
    }

    return reply.send(registry)
  })

  // PATCH /registries/:id, update my registry
  fastify.patch(
    '/registries/:id',
    { preHandler: requireRole('mother') },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateRegistrySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      const existing = await db.query.registries.findFirst({
        where: and(eq(registries.id, id), eq(registries.userId, request.user!.sub)),
      })

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Registry not found' })
      }

      const [updated] = await db
        .update(registries)
        .set({
          ...(body.data.title && { title: body.data.title }),
          ...(body.data.description !== undefined && { description: body.data.description }),
          ...(body.data.dueDate && { dueDate: new Date(body.data.dueDate) }),
          ...(body.data.coverImageUrl !== undefined && { coverImageUrl: body.data.coverImageUrl }),
          ...(body.data.targetAmountCents !== undefined && { targetAmountCents: body.data.targetAmountCents }),
          ...(body.data.isPublished !== undefined && { isPublished: body.data.isPublished }),
          updatedAt: new Date(),
        })
        .where(eq(registries.id, id))
        .returning()

      return reply.send(updated)
    }
  )

  // POST /registries/:id/items, add an item to a registry
  fastify.post(
    '/registries/:id/items',
    { preHandler: requireRole('mother') },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const existing = await db.query.registries.findFirst({
        where: and(eq(registries.id, id), eq(registries.userId, request.user!.sub)),
      })

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Registry not found' })
      }

      const body = createItemSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.flatten().fieldErrors,
        })
      }

      const [item] = await db
        .insert(registryItems)
        .values({
          registryId: id,
          title: body.data.title,
          description: body.data.description,
          targetAmountCents: body.data.targetAmountCents,
          categoryId: body.data.categoryId,
          providerProfileId: body.data.providerProfileId,
          sortOrder: body.data.sortOrder,
        })
        .returning()

      return reply.status(201).send(item)
    }
  )
}

export default registryRoutes
