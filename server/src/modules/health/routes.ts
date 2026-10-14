import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { cache } from '../../lib/cache.js'
import { prisma } from '../../lib/prisma.js'

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/health/live',
    {
      schema: {
        hide: true,
        response: {
          200: Type.Object({
            status: Type.String(),
            uptime: Type.Number(),
          }),
        },
      },
    },
    async () => ({ status: 'ok', uptime: process.uptime() }),
  )

  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness check for the database and cache',
        response: {
          200: Type.Object({
            status: Type.String(),
            database: Type.String(),
            cache: Type.String(),
            uptime: Type.Number(),
          }),
          503: Type.Object({
            status: Type.String(),
            database: Type.String(),
            cache: Type.String(),
            uptime: Type.Number(),
          }),
        },
      },
    },
    async (_request, reply) => {
      let database = 'up'
      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        database = 'down'
      }

      const cacheStatus = cache.backend
      const healthy = database === 'up'
      const body = {
        status: healthy ? 'ok' : 'degraded',
        database,
        cache: cacheStatus,
        uptime: process.uptime(),
      }

      return reply.code(healthy ? 200 : 503).send(body)
    },
  )
}
