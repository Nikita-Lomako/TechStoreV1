import { describe, expect, it } from 'vitest'
import { Value } from '@sinclair/typebox/value'
import {
  CreateProductBodySchema,
  ProductListQuerySchema,
} from '../src/modules/products/schemas.js'

const validProduct = {
  title: 'Test product',
  description: 'A product used in tests',
  price: 99.99,
  category: 'Audio',
  images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
  stockQuantity: 10,
}

describe('product schemas', () => {
  it('accepts a valid product body', () => {
    expect(Value.Check(CreateProductBodySchema, validProduct)).toBe(true)
  })

  it('requires at least three images', () => {
    const body = { ...validProduct, images: ['https://example.com/1.jpg'] }
    expect(Value.Check(CreateProductBodySchema, body)).toBe(false)
  })

  it('rejects a price above the allowed range', () => {
    expect(
      Value.Check(CreateProductBodySchema, { ...validProduct, price: 100_000_001 }),
    ).toBe(false)
  })

  it('validates list query limits', () => {
    expect(Value.Check(ProductListQuerySchema, { page: 1, limit: 100 })).toBe(true)
    expect(Value.Check(ProductListQuerySchema, { limit: 101 })).toBe(false)
    expect(Value.Check(ProductListQuerySchema, { sort_by: 'unknown' })).toBe(false)
  })
})
