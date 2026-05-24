import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { serviceCategories, providerProfiles, providerServices, users } from '../db/schema.js'

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /catalog/categories
  fastify.get('/catalog/categories', async (_request, reply) => {
    const categories = await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.isActive, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    })

    return reply.send(categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      iconName: c.iconName,
      sortOrder: c.sortOrder,
    })))
  })

  // GET /catalog/providers, list approved providers
  fastify.get('/catalog/providers', async (request, reply) => {
    const query = request.query as Record<string, string>
    const limit = Math.min(parseInt(query['limit'] ?? '20', 10), 100)
    const offset = parseInt(query['offset'] ?? '0', 10)

    const profiles = await db.query.providerProfiles.findMany({
      where: eq(providerProfiles.applicationStatus, 'approved'),
      limit,
      offset,
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: false,
            passwordHash: false,
            googleId: false,
            appleId: false,
            emailVerificationToken: false,
            passwordResetToken: false,
          },
        },
        services: {
          with: {
            category: true,
          },
        },
      },
    })

    return reply.send(profiles)
  })

  // GET /catalog/providers/:id
  fastify.get('/catalog/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.id, id),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: false,
            passwordHash: false,
            googleId: false,
            appleId: false,
            emailVerificationToken: false,
            passwordResetToken: false,
          },
        },
        services: {
          with: {
            category: true,
          },
        },
      },
    })

    if (!profile || profile.applicationStatus !== 'approved') {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Provider not found' })
    }

    return reply.send(profile)
  })
}

export default catalogRoutes
