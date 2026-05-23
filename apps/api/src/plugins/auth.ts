import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { verifyJwt } from '../lib/jwt.js'
import type { JwtPayload } from '@tribe/shared'

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

/**
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Sets `request.user` if valid. Does NOT reject requests without a token —
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
      // Invalid token — leave user as undefined; protected routes will reject
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
 * Prehandler factory — requires a specific role.
 */
export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw { statusCode: 401, message: 'Authentication required' }
    }
    if (!roles.includes(request.user.role)) {
      throw { statusCode: 403, message: 'Insufficient permissions' }
    }
  }
}
