import { createHash } from 'node:crypto'
import type { ProductQuery } from './schemas.js'

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 12
export const DEFAULT_SORT_BY = 'created_at'

export const PRODUCTS_CACHE_PREFIX = 'products:'

export function normalizeProductQuery(query: ProductQuery) {
  const page = query.page ?? DEFAULT_PAGE
  const limit = query.limit ?? DEFAULT_LIMIT
  const sortBy = query.sort_by ?? DEFAULT_SORT_BY
  const order = query.order ?? (sortBy === 'created_at' ? 'desc' : 'asc')

  return {
    page,
    limit,
    search: query.search?.trim().toLowerCase() || '',
    category: query.category?.trim().toLowerCase() || '',
    minPrice: query.min_price ?? null,
    maxPrice: query.max_price ?? null,
    minRating: query.min_rating ?? null,
    sortBy,
    order,
  }
}

export type NormalizedProductQuery = ReturnType<typeof normalizeProductQuery>

export function buildCatalogCacheKey(query: ProductQuery): string {
  const normalized = normalizeProductQuery(query)
  const params = new URLSearchParams({
    page: String(normalized.page),
    limit: String(normalized.limit),
    search: normalized.search,
    category: normalized.category,
    min_price: normalized.minPrice === null ? '' : String(normalized.minPrice),
    max_price: normalized.maxPrice === null ? '' : String(normalized.maxPrice),
    min_rating: normalized.minRating === null ? '' : String(normalized.minRating),
    sort_by: normalized.sortBy,
    order: normalized.order,
  })
  const digest = createHash('sha256').update(params.toString()).digest('hex')
  return `${PRODUCTS_CACHE_PREFIX}list:v1:${digest}`
}

export const buildProductCacheKey = (id: string): string =>
  `${PRODUCTS_CACHE_PREFIX}item:v1:${id}`

export const buildRelatedCacheKey = (id: string, limit: number): string =>
  `${PRODUCTS_CACHE_PREFIX}related:v1:${id}:${limit}`

export const CATEGORIES_CACHE_KEY = `${PRODUCTS_CACHE_PREFIX}categories:v1`
