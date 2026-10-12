import Fastify, { type FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { corsOrigins, env, isDevelopment, isProduction } from './config/env.js'
import { cache } from './lib/cache.js'
import { errorResponse, registerErrorHandler } from './lib/errors.js'
import { prisma } from './lib/prisma.js'
import { registerRoutes } from './routes.js'

function isAllowedOrigin(origin: string): boolean {
  return corsOrigins.some((allowed) => {
    if (allowed === '*') return true
    if (allowed === origin) return true
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1)
      return origin.endsWith(suffix)
    }
    return false
  })
}

function buildLogger(): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'test') return false
  if (isDevelopment) {
    return {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    }
  }
  return { level: env.LOG_LEVEL }
}

export async function buildApp() {
  const app = Fastify({
    logger: buildLogger(),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 1_048_576,
    disableRequestLogging: env.NODE_ENV === 'test',
  }).withTypeProvider<TypeBoxTypeProvider>()

  await app.register(cors, {
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, server-to-server) are allowed.
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Cache', 'X-Cache-TTL'],
    credentials: false,
    maxAge: 86_400,
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    errorResponseBuilder: () =>
      errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.'),
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  })

  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 10,
      fileSize: env.UPLOAD_MAX_BYTES,
    },
  })

  if (env.SWAGGER_ENABLED) {
    await app.register(swagger, {
      openapi: {
        openapi: '3.0.3',
        info: {
          title: 'TechStore API',
          version: '1.0.0',
          description: [
            'REST API for the TechStore electronics shop.',
            '',
            'Stack: Fastify, PostgreSQL, Prisma ORM, Redis.',
            'Authentication: JWT in the `Authorization: Bearer <token>` header.',
            'Catalog responses are cached in Redis for a short TTL and invalidated on catalog mutations.',
          ].join('\n'),
        },
        servers: [{ url: env.PUBLIC_API_URL, description: 'Public API' }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        tags: [
          { name: 'Auth', description: 'Registration, login and password recovery' },
          { name: 'Products', description: 'Public catalog' },
          { name: 'Cart', description: 'Authenticated customer cart' },
          { name: 'Admin', description: 'Admin-only catalog management' },
          { name: 'Health', description: 'Service health' },
        ],
      },
    })

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        persistAuthorization: true,
      },
      staticCSP: true,
    })
  }

  registerErrorHandler(app)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
    await cache.close()
  })

  await app.register(registerRoutes)
  await cache.connect()

  app.log.info(
    `Cache backend: ${cache.backend}${isProduction ? '' : ' (development)'}`,
  )

  return app
}
