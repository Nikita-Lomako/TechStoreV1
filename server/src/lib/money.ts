export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

export type PricedLine = {
  price: number
  quantity: number
}

export type CartTotals = {
  subtotal: number
  discount: number
  tax: number
  total: number
  totalQuantity: number
}

export function computeCartTotals(
  lines: PricedLine[],
  discountPercentage: number,
  taxRate: number,
): CartTotals {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + roundMoney(line.price * line.quantity), 0),
  )
  const safePercentage = Math.min(100, Math.max(0, discountPercentage || 0))
  const discount = roundMoney(subtotal * (safePercentage / 100))
  const taxable = roundMoney(subtotal - discount)
  const tax = roundMoney(taxable * taxRate)
  const total = roundMoney(taxable + tax)
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)

  return { subtotal, discount, tax, total, totalQuantity }
}
