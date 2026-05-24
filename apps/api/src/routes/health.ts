import type { FastifyPluginAsync } from 'fastify'
import { db } from '../db/client.js'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /health
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'ok'
    let dbLatencyMs = 0

    try {
      const start = Date.now()
      await db.execute('SELECT 1')
      dbLatencyMs = Date.now() - start
    } catch (err) {
      dbStatus = 'error'
      fastify.log.error(err, 'Database health check failed')
    }

    const status = dbStatus === 'ok' ? 200 : 503

    return reply.status(status).send({
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    })
  })

  // GET /health/ping, lightweight liveness check
  fastify.get('/health/ping', async (_request, reply) => {
    return reply.send({ pong: true })
  })
}

export default healthRoutes
