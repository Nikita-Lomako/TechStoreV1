import { describe, expect, it } from 'vitest'
import {
  buildCatalogCacheKey,
  normalizeProductQuery,
  PRODUCTS_CACHE_PREFIX,
} from '../src/modules/products/cache.js'

describe('catalog cache keys', () => {
  it('uses one key for equivalent query objects', () => {
    const first = buildCatalogCacheKey({
      page: 1,
      limit: 12,
      search: 'Laptop',
      sort_by: 'price',
      order: 'asc',
    })
    const second = buildCatalogCacheKey({
      order: 'asc',
      sort_by: 'price',
      search: ' laptop ',
      limit: 12,
      page: 1,
    })

    expect(first).toBe(second)
    expect(first.startsWith(PRODUCTS_CACHE_PREFIX)).toBe(true)
  })

  it('normalizes defaults to the same key', () => {
    expect(buildCatalogCacheKey({})).toBe(
      buildCatalogCacheKey({ page: 1, limit: 12, sort_by: 'created_at', order: 'desc' }),
    )
  })

  it('changes the key when filters change', () => {
    const base = buildCatalogCacheKey({ page: 1 })
    expect(buildCatalogCacheKey({ page: 2 })).not.toBe(base)
    expect(buildCatalogCacheKey({ min_price: 100 })).not.toBe(base)
    expect(buildCatalogCacheKey({ sort_by: 'title', order: 'asc' })).not.toBe(base)
  })

  it('defaults ordering for non-date sorts to ascending', () => {
    expect(normalizeProductQuery({ sort_by: 'price' }).order).toBe('asc')
    expect(normalizeProductQuery({ sort_by: 'created_at' }).order).toBe('desc')
  })
})
