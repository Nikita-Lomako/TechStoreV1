import { describe, expect, it } from 'vitest'
import { computeCartTotals, roundMoney } from '../src/lib/money.js'

describe('roundMoney', () => {
  it('rounds to two decimal places', () => {
    expect(roundMoney(10.005)).toBe(10.01)
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })
})

describe('computeCartTotals', () => {
  it('applies the promo discount before tax', () => {
    const totals = computeCartTotals(
      [
        { price: 100, quantity: 1 },
        { price: 50, quantity: 2 },
      ],
      10,
      0.08,
    )

    expect(totals.subtotal).toBe(200)
    expect(totals.discount).toBe(20)
    expect(totals.tax).toBe(14.4)
    expect(totals.total).toBe(194.4)
    expect(totals.totalQuantity).toBe(3)
  })

  it('works without a promo code', () => {
    const totals = computeCartTotals([{ price: 19.99, quantity: 3 }], 0, 0.08)

    expect(totals.subtotal).toBe(59.97)
    expect(totals.discount).toBe(0)
    expect(totals.tax).toBe(4.8)
    expect(totals.total).toBe(64.77)
  })

  it('clamps an invalid discount percentage', () => {
    const totals = computeCartTotals([{ price: 100, quantity: 1 }], 150, 0)
    expect(totals.discount).toBe(100)
    expect(totals.total).toBe(0)
  })
})
