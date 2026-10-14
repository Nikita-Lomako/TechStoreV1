import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { ErrorResponseSchema } from '../../lib/schemas.js'
import { authenticate } from '../../plugins/auth.js'
import {
  AddCartItemBodySchema,
  ApplyPromoBodySchema,
  CartItemParamsSchema,
  CartResponseSchema,
  MergeCartBodySchema,
  UpdateCartItemBodySchema,
} from './schemas.js'
import {
  addCartItem,
  applyPromoCode,
  clearCart,
  getCart,
  mergeGuestCart,
  removeCartItem,
  removePromoCode,
  updateCartItem,
} from './service.js'

const cartResponses = {
  400: ErrorResponseSchema,
  401: ErrorResponseSchema,
  404: ErrorResponseSchema,
  409: ErrorResponseSchema,
}

export const cartRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/api/cart',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Get the current user cart with calculated totals',
        security: [{ bearerAuth: [] }],
        response: {
          200: CartResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => getCart(request.user.sub),
  )

  app.post(
    '/api/cart/items',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Add a product to the cart or increase its quantity',
        security: [{ bearerAuth: [] }],
        body: AddCartItemBodySchema,
        response: {
          200: CartResponseSchema,
          ...cartResponses,
        },
      },
    },
    async (request) => addCartItem(request.user.sub, request.body),
  )

  app.patch(
    '/api/cart/items/:id',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Update cart item quantity (0 removes the item)',
        security: [{ bearerAuth: [] }],
        params: CartItemParamsSchema,
        body: UpdateCartItemBodySchema,
        response: {
          200: CartResponseSchema,
          ...cartResponses,
        },
      },
    },
    async (request) =>
      updateCartItem(request.user.sub, request.params.id, request.body),
  )

  app.delete(
    '/api/cart/items/:id',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Remove an item from the cart',
        security: [{ bearerAuth: [] }],
        params: CartItemParamsSchema,
        response: {
          200: CartResponseSchema,
          ...cartResponses,
        },
      },
    },
    async (request) => removeCartItem(request.user.sub, request.params.id),
  )

  app.delete(
    '/api/cart',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Remove every item from the cart',
        security: [{ bearerAuth: [] }],
        response: {
          200: CartResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => clearCart(request.user.sub),
  )

  app.post(
    '/api/cart/apply-promo',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Validate and apply a promo code to the cart',
        security: [{ bearerAuth: [] }],
        body: ApplyPromoBodySchema,
        response: {
          200: CartResponseSchema,
          ...cartResponses,
        },
      },
    },
    async (request) => applyPromoCode(request.user.sub, request.body),
  )

  app.delete(
    '/api/cart/promo',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Remove the applied promo code',
        security: [{ bearerAuth: [] }],
        response: {
          200: CartResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => removePromoCode(request.user.sub),
  )

  app.post(
    '/api/cart/merge',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Cart'],
        summary: 'Merge a guest cart into the authenticated cart after login',
        security: [{ bearerAuth: [] }],
        body: MergeCartBodySchema,
        response: {
          200: CartResponseSchema,
          ...cartResponses,
        },
      },
    },
    async (request) => mergeGuestCart(request.user.sub, request.body),
  )
}
