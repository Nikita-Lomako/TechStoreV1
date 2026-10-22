import { Type, type Static } from '@sinclair/typebox'

export const HighlightSchema = Type.Object({
  label: Type.String({ maxLength: 100 }),
  value: Type.String({ maxLength: 200 }),
})

export const ProductSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  subtitle: Type.Union([Type.String(), Type.Null()]),
  description: Type.String(),
  longDescription: Type.Union([Type.String(), Type.Null()]),
  price: Type.Number(),
  rating: Type.Number(),
  category: Type.Union([Type.String(), Type.Null()]),
  image: Type.String(),
  images: Type.Array(Type.String()),
  stockQuantity: Type.Integer(),
  reviewCount: Type.Integer(),
  highlights: Type.Union([Type.Array(HighlightSchema), Type.Null()]),
  specifications: Type.Union([Type.String(), Type.Null()]),
  freeShipping: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const ProductListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100_000, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 12 })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  category: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  min_price: Type.Optional(Type.Number({ minimum: 0 })),
  max_price: Type.Optional(Type.Number({ minimum: 0 })),
  min_rating: Type.Optional(Type.Number({ minimum: 0, maximum: 5 })),
  sort_by: Type.Optional(
    Type.Union([
      Type.Literal('price'),
      Type.Literal('title'),
      Type.Literal('rating'),
      Type.Literal('created_at'),
    ]),
  ),
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
})

export const ProductListResponseSchema = Type.Object({
  items: Type.Array(ProductSchema),
  meta: Type.Object({
    total_items: Type.Integer(),
    total_pages: Type.Integer(),
    current_page: Type.Integer(),
    limit: Type.Integer(),
  }),
})

export const ProductParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

export const RelatedProductsQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 12, default: 4 })),
})

export const CategorySchema = Type.Object({
  name: Type.String(),
  count: Type.Integer(),
  image: Type.Union([Type.String(), Type.Null()]),
})

export const CategoriesResponseSchema = Type.Array(CategorySchema)

export const CreateProductBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  subtitle: Type.Optional(Type.String({ maxLength: 250 })),
  description: Type.String({ minLength: 1, maxLength: 5_000 }),
  longDescription: Type.Optional(Type.String({ maxLength: 20_000 })),
  price: Type.Number({ minimum: 0, maximum: 100_000_000 }),
  rating: Type.Optional(Type.Number({ minimum: 0, maximum: 5 })),
  category: Type.String({ minLength: 1, maxLength: 100 }),
  images: Type.Array(Type.String({ minLength: 1, maxLength: 2_000 }), {
    minItems: 3,
    maxItems: 12,
  }),
  stockQuantity: Type.Integer({ minimum: 0, maximum: 1_000_000 }),
  reviewCount: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000_000 })),
  highlights: Type.Optional(Type.Array(HighlightSchema, { maxItems: 20 })),
  specifications: Type.Optional(Type.String({ maxLength: 20_000 })),
  freeShipping: Type.Optional(Type.Boolean()),
})

export const UpdateProductBodySchema = Type.Partial(CreateProductBodySchema, {
  minProperties: 1,
})

export type ProductQuery = Static<typeof ProductListQuerySchema>
export type ProductDto = Static<typeof ProductSchema>
export type CreateProductBody = Static<typeof CreateProductBodySchema>
export type UpdateProductBody = Static<typeof UpdateProductBodySchema>
export type ProductListResponse = Static<typeof ProductListResponseSchema>
export type CategoryDto = Static<typeof CategorySchema>
