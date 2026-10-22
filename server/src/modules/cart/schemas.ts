import { Type, type Static } from '@sinclair/typebox'
import { ProductSchema } from '../products/schemas.js'

export const CartItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  productId: Type.String({ format: 'uuid' }),
  quantity: Type.Integer(),
  lineTotal: Type.Number(),
  product: ProductSchema,
})

export const CartPromoSchema = Type.Object({
  code: Type.String(),
  discountPercentage: Type.Integer(),
})

export const CartResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  items: Type.Array(CartItemSchema),
  promo: Type.Union([CartPromoSchema, Type.Null()]),
  subtotal: Type.Number(),
  discount: Type.Number(),
  tax: Type.Number(),
  total: Type.Number(),
  totalQuantity: Type.Integer(),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const AddCartItemBodySchema = Type.Object({
  productId: Type.String({ format: 'uuid' }),
  quantity: Type.Integer({ minimum: 1, maximum: 99, default: 1 }),
})

export const UpdateCartItemBodySchema = Type.Object({
  quantity: Type.Integer({ minimum: 0, maximum: 99 }),
})

export const CartItemParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

export const ApplyPromoBodySchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 50 }),
})

export const MergeCartBodySchema = Type.Object({
  items: Type.Array(
    Type.Object({
      productId: Type.String({ format: 'uuid' }),
      quantity: Type.Integer({ minimum: 1, maximum: 99 }),
    }),
    { maxItems: 50 },
  ),
})

export type CartResponse = Static<typeof CartResponseSchema>
export type AddCartItemBody = Static<typeof AddCartItemBodySchema>
export type UpdateCartItemBody = Static<typeof UpdateCartItemBodySchema>
export type ApplyPromoBody = Static<typeof ApplyPromoBodySchema>
export type MergeCartBody = Static<typeof MergeCartBodySchema>
