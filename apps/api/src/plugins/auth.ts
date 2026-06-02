import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { verifyJwt } from '../lib/jwt.js'
import { db } from '../db/client.js'
import { and, eq } from 'drizzle-orm'
import { managerPermissions } from '../db/schema.js'
import type { JwtPayload } from '@tribe/shared'

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

/**
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Sets `request.user` if valid. Does NOT reject requests without a token,
 * use `requireAuth` preHandler for that.
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return

    const token = authHeader.slice(7)
    try {
      request.user = await verifyJwt(token)
    } catch {
      // Invalid token, leave user as undefined; protected routes will reject
    }
  })
}

export default fp(authPlugin, { name: 'auth' })

/**
 * Prehandler that requires a valid authenticated user.
 */
export async function requireAuth(request: FastifyRequest) {
  if (!request.user) {
    throw { statusCode: 401, message: 'Authentication required' }
  }
}

/**
 * Prehandler factory, requires a specific role.
 * Also accepts users whose additionalRoles include any of the target roles.
 */
export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw { statusCode: 401, message: 'Authentication required' }
    }
    const { role, additionalRoles = [] } = request.user
    const allRoles = [role, ...additionalRoles]
    if (!roles.some((r) => allRoles.includes(r))) {
      throw { statusCode: 403, message: 'Insufficient permissions' }
    }
  }
}

/**
 * Prehandler factory — requires admin OR manager with a specific module permission.
 *
 * Usage:  { preHandler: requirePermission('vendors') }
 *
 * - Admins pass unconditionally.
 * - Managers must have a row in `manager_permissions` for the given module.
 * - All other roles are rejected with 403.
 */
export function requirePermission(module: string) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw { statusCode: 401, message: 'Authentication required' }
    }
    const { role, sub } = request.user
    if (role === 'admin') return          // admins always pass

    if (role !== 'manager') {
      throw { statusCode: 403, message: 'Insufficient permissions' }
    }

    const rows = await db
      .select({ id: managerPermissions.id })
      .from(managerPermissions)
      .where(
        and(
          eq(managerPermissions.userId, sub),
          eq(managerPermissions.module, module),
        )
      )
      .limit(1)

    if (rows.length === 0) {
      throw { statusCode: 403, message: `Access to module '${module}' not granted` }
    }
  }
}
