import type { FastifyPluginAsync } from 'fastify'
import { Type } from '@sinclair/typebox'
import { authRoutes } from './modules/auth/routes.js'
import { cartRoutes } from './modules/cart/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { productRoutes } from './modules/products/routes.js'
import { uploadRoutes } from './modules/uploads/routes.js'

export const registerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      schema: {
        hide: true,
        response: {
          200: Type.Object({
            name: Type.String(),
            version: Type.String(),
            docs: Type.String(),
            health: Type.String(),
          }),
        },
      },
    },
    async () => ({
      name: 'TechStore API',
      version: '1.0.0',
      docs: '/docs',
      health: '/health',
    }),
  )

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(productRoutes)
  await app.register(cartRoutes)
  await app.register(uploadRoutes)
}
