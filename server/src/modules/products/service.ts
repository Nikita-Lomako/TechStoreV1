import { Prisma, type Product } from '@prisma/client'
import { cache } from '../../lib/cache.js'
import { badRequest, notFound } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import {
  PRODUCTS_CACHE_PREFIX,
  normalizeProductQuery,
  type NormalizedProductQuery,
} from './cache.js'
import type {
  CategoryDto,
  CreateProductBody,
  ProductDto,
  ProductListResponse,
  ProductQuery,
  UpdateProductBody,
} from './schemas.js'

export const toProductDto = (product: Product): ProductDto => {
  const images = product.images ?? []
  return {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    longDescription: product.longDescription,
    price: Number(product.price),
    rating: product.rating,
    category: product.category,
    image: images[0] ?? '',
    images,
    stockQuantity: product.stockQuantity,
    reviewCount: product.reviewCount,
    highlights: Array.isArray(product.highlights)
      ? (product.highlights as { label: string; value: string }[])
      : null,
    specifications: product.specifications,
    freeShipping: product.freeShipping,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

function buildWhere(query: NormalizedProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { deletedAt: null }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { longDescription: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' }
  }

  if (query.minPrice !== null || query.maxPrice !== null) {
    where.price = {
      ...(query.minPrice !== null ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== null ? { lte: query.maxPrice } : {}),
    }
  }

  if (query.minRating !== null) {
    where.rating = { gte: query.minRating }
  }

  return where
}

function buildOrderBy(query: NormalizedProductQuery): Prisma.ProductOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = query.order
  const primary: Prisma.ProductOrderByWithRelationInput =
    query.sortBy === 'title'
      ? { title: direction }
      : query.sortBy === 'rating'
        ? { rating: direction }
        : query.sortBy === 'price'
          ? { price: direction }
          : { createdAt: direction }

  return [primary, { id: 'asc' }]
}

export async function listProducts(query: ProductQuery): Promise<ProductListResponse> {
  const normalized = normalizeProductQuery(query)

  if (
    normalized.minPrice !== null &&
    normalized.maxPrice !== null &&
    normalized.minPrice > normalized.maxPrice
  ) {
    throw badRequest('min_price cannot be greater than max_price')
  }

  const where = buildWhere(normalized)
  const orderBy = buildOrderBy(normalized)
  const skip = (normalized.page - 1) * normalized.limit

  const [totalItems, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: normalized.limit,
    }),
  ])

  return {
    items: products.map(toProductDto),
    meta: {
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / normalized.limit),
      current_page: normalized.page,
      limit: normalized.limit,
    },
  }
}

export async function getProductById(id: string): Promise<ProductDto> {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } })
  if (!product) throw notFound('Product not found')
  return toProductDto(product)
}

export async function getCategories(): Promise<CategoryDto[]> {
  const rows = await prisma.$queryRaw<
    { name: string; count: number; image: string | null }[]
  >(Prisma.sql`
    SELECT
      category AS name,
      COUNT(*)::int AS count,
      (ARRAY_AGG(images ORDER BY created_at ASC))[1][1] AS image
    FROM products
    WHERE deleted_at IS NULL AND category IS NOT NULL
    GROUP BY category
    ORDER BY category ASC
  `)

  return rows.map((row) => ({
    name: row.name,
    count: Number(row.count),
    image: row.image,
  }))
}

export async function getRelatedProducts(id: string, limit: number): Promise<ProductDto[]> {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } })
  if (!product) throw notFound('Product not found')

  const sameCategory = product.category
    ? await prisma.product.findMany({
        where: {
          id: { not: product.id },
          deletedAt: null,
          category: { equals: product.category, mode: 'insensitive' },
        },
        orderBy: [{ rating: 'desc' }, { id: 'asc' }],
        take: limit,
      })
    : []

  if (sameCategory.length >= limit) {
    return sameCategory.map(toProductDto)
  }

  const excludedIds = [product.id, ...sameCategory.map((item) => item.id)]
  const fallback = await prisma.product.findMany({
    where: { id: { notIn: excludedIds }, deletedAt: null },
    orderBy: [{ rating: 'desc' }, { id: 'asc' }],
    take: limit - sameCategory.length,
  })

  return [...sameCategory, ...fallback].map(toProductDto)
}

export async function createProduct(input: CreateProductBody): Promise<ProductDto> {
  const product = await prisma.product.create({
    data: {
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description,
      longDescription: input.longDescription ?? null,
      price: input.price,
      rating: input.rating ?? 0,
      category: input.category,
      images: input.images,
      stockQuantity: input.stockQuantity,
      reviewCount: input.reviewCount ?? 0,
      ...(input.highlights ? { highlights: input.highlights as Prisma.InputJsonValue } : {}),
      specifications: input.specifications ?? null,
      freeShipping: input.freeShipping ?? false,
    },
  })

  await invalidateProductCache()
  return toProductDto(product)
}

export async function updateProduct(
  id: string,
  input: UpdateProductBody,
): Promise<ProductDto> {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw notFound('Product not found')

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.longDescription !== undefined
        ? { longDescription: input.longDescription }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
      ...(input.reviewCount !== undefined ? { reviewCount: input.reviewCount } : {}),
      ...(input.highlights !== undefined
        ? { highlights: input.highlights as Prisma.InputJsonValue }
        : {}),
      ...(input.specifications !== undefined
        ? { specifications: input.specifications }
        : {}),
      ...(input.freeShipping !== undefined ? { freeShipping: input.freeShipping } : {}),
    },
  })

  await invalidateProductCache()
  return toProductDto(product)
}

/**
 * Soft-delete keeps historical references intact. Cart rows that point at the
 * product are removed so customers never see an unavailable item in the cart.
 */
export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw notFound('Product not found')

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { productId: id } }),
    prisma.product.update({ where: { id }, data: { deletedAt: new Date() } }),
  ])

  await invalidateProductCache()
}

export async function invalidateProductCache(): Promise<number> {
  return cache.deleteByPrefix(PRODUCTS_CACHE_PREFIX)
}
