import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { env } from '../../config/env.js'
import { cache } from '../../lib/cache.js'
import { ErrorResponseSchema } from '../../lib/schemas.js'
import { requireAdmin } from '../../plugins/auth.js'
import {
  CATEGORIES_CACHE_KEY,
  buildCatalogCacheKey,
  buildProductCacheKey,
  buildRelatedCacheKey,
} from './cache.js'
import {
  CategoriesResponseSchema,
  CreateProductBodySchema,
  ProductListQuerySchema,
  ProductListResponseSchema,
  ProductParamsSchema,
  ProductSchema,
  RelatedProductsQuerySchema,
  UpdateProductBodySchema,
  type ProductListResponse,
} from './schemas.js'
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProductById,
  getRelatedProducts,
  listProducts,
  updateProduct,
} from './service.js'

const notFoundResponse = {
  404: ErrorResponseSchema,
}

const adminResponses = {
  401: ErrorResponseSchema,
  403: ErrorResponseSchema,
  404: ErrorResponseSchema,
}

export const productRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/api/products',
    {
      schema: {
        tags: ['Products'],
        summary: 'List products with database-level search, filters, sorting and pagination',
        querystring: ProductListQuerySchema,
        response: {
          200: ProductListResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const cacheKey = buildCatalogCacheKey(request.query)
      const cached = await cache.get<ProductListResponse>(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }

      const result = await listProducts(request.query)
      await cache.set(cacheKey, result, env.REDIS_TTL_SECONDS)

      reply.header('X-Cache', 'MISS')
      reply.header('X-Cache-TTL', String(env.REDIS_TTL_SECONDS))
      return result
    },
  )

  app.get(
    '/api/products/categories',
    {
      schema: {
        tags: ['Products'],
        summary: 'List catalog categories with product counts',
        response: {
          200: CategoriesResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const cacheKey = CATEGORIES_CACHE_KEY
      const fromCache = await cache.get<Awaited<ReturnType<typeof getCategories>>>(cacheKey)
      if (fromCache) {
        reply.header('X-Cache', 'HIT')
        return fromCache
      }

      const categories = await getCategories()
      await cache.set(cacheKey, categories, env.REDIS_TTL_SECONDS)
      reply.header('X-Cache', 'MISS')
      return categories
    },
  )

  app.get(
    '/api/products/:id/related',
    {
      schema: {
        tags: ['Products'],
        summary: 'Return related products (same category first)',
        params: ProductParamsSchema,
        querystring: RelatedProductsQuerySchema,
        response: {
          200: Type.Array(ProductSchema),
          ...notFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const limit = request.query.limit ?? 4
      const cacheKey = buildRelatedCacheKey(request.params.id, limit)
      const cached = await cache.get<ProductListResponse['items']>(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }

      const items = await getRelatedProducts(request.params.id, limit)
      await cache.set(cacheKey, items, env.REDIS_TTL_SECONDS)
      reply.header('X-Cache', 'MISS')
      return items
    },
  )

  app.get(
    '/api/products/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Get a single product',
        params: ProductParamsSchema,
        response: {
          200: ProductSchema,
          ...notFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const cacheKey = buildProductCacheKey(request.params.id)
      const cached = await cache.get<Awaited<ReturnType<typeof getProductById>>>(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }

      const product = await getProductById(request.params.id)
      await cache.set(cacheKey, product, env.REDIS_TTL_SECONDS)
      reply.header('X-Cache', 'MISS')
      return product
    },
  )

  app.post(
    '/api/products',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'Create a product (admin only)',
        security: [{ bearerAuth: [] }],
        body: CreateProductBodySchema,
        response: {
          201: ProductSchema,
          ...adminResponses,
        },
      },
    },
    async (request, reply) => {
      const product = await createProduct(request.body)
      return reply.code(201).send(product)
    },
  )

  app.patch(
    '/api/products/:id',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'Update a product (admin only)',
        security: [{ bearerAuth: [] }],
        params: ProductParamsSchema,
        body: UpdateProductBodySchema,
        response: {
          200: ProductSchema,
          ...adminResponses,
        },
      },
    },
    async (request) => updateProduct(request.params.id, request.body),
  )

  app.delete(
    '/api/products/:id',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'Soft-delete a product and invalidate catalog cache (admin only)',
        security: [{ bearerAuth: [] }],
        params: ProductParamsSchema,
        response: {
          204: Type.Null(),
          ...adminResponses,
        },
      },
    },
    async (request, reply) => {
      await deleteProduct(request.params.id)
      return reply.code(204).send(null)
    },
  )
}
