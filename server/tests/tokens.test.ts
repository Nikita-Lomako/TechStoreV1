import { describe, expect, it } from 'vitest'
import { createOpaqueToken, hashToken } from '../src/lib/tokens.js'

describe('token helpers', () => {
  it('creates URL-safe tokens with enough entropy', () => {
    const token = createOpaqueToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token.length).toBeGreaterThanOrEqual(40)
    expect(createOpaqueToken()).not.toBe(token)
  })

  it('hashes tokens deterministically without storing the raw value', () => {
    const token = createOpaqueToken()
    const hash = hashToken(token)

    expect(hash).toHaveLength(64)
    expect(hash).toBe(hashToken(token))
    expect(hash).not.toContain(token)
  })
})
