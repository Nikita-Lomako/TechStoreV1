import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProductById } from '../../../shared/api/mock/products.js'
import { CART_TAX_RATE, PROMO_DISCOUNT_RATE, VALID_PROMO_CODE } from '../../../shared/config/promo.js'
import { loadCartState, saveCartState } from '../../../shared/lib/storage/cartPersistence.js'
import { CartContext } from './cart-context.js'

const roundMoney = (n) => Math.round(n * 100) / 100

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => loadCartState().items)
  const [appliedPromo, setAppliedPromo] = useState(() => loadCartState().appliedPromo)

  useEffect(() => {
    saveCartState({ items, appliedPromo })
  }, [items, appliedPromo])

  const addToCart = useCallback((productId, quantity = 1) => {
    const qty = Math.min(99, Math.max(1, Math.floor(Number(quantity)) || 1))
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === String(productId))
      if (existing) {
        return prev.map((i) =>
          i.productId === String(productId) ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i,
        )
      }
      return [...prev, { productId: String(productId), quantity: qty }]
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== String(productId)))
  }, [])

  const setItemQuantity = useCallback((productId, quantity) => {
    const qty = Math.floor(Number(quantity))
    setItems((prev) => {
      if (qty < 1) {
        return prev.filter((i) => i.productId !== String(productId))
      }
      return prev.map((i) =>
        i.productId === String(productId) ? { ...i, quantity: Math.min(99, qty) } : i,
      )
    })
  }, [])

  const applyPromoCode = useCallback((rawCode) => {
    const code = String(rawCode ?? '').trim().toUpperCase()
    if (!code) {
      return { ok: false, error: 'empty' }
    }
    if (code === VALID_PROMO_CODE) {
      setAppliedPromo(VALID_PROMO_CODE)
      return { ok: true }
    }
    return { ok: false, error: 'invalid' }
  }, [])

  const totals = useMemo(() => {
    let subtotal = 0
    const lines = []
    for (const row of items) {
      const product = getProductById(row.productId)
      if (!product) continue
      const lineTotal = roundMoney(product.price * row.quantity)
      subtotal += lineTotal
      lines.push({ product, quantity: row.quantity, lineTotal })
    }
    subtotal = roundMoney(subtotal)
    const discount = appliedPromo === VALID_PROMO_CODE ? roundMoney(subtotal * PROMO_DISCOUNT_RATE) : 0
    const afterDiscount = roundMoney(subtotal - discount)
    const tax = roundMoney(afterDiscount * CART_TAX_RATE)
    const total = roundMoney(afterDiscount + tax)
    return { lines, subtotal, discount, tax, total }
  }, [items, appliedPromo])

  const totalQuantity = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items])

  const value = useMemo(
    () => ({
      items,
      lines: totals.lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      appliedPromo,
      totalQuantity,
      addToCart,
      removeFromCart,
      setItemQuantity,
      applyPromoCode,
    }),
    [items, totals, appliedPromo, totalQuantity, addToCart, removeFromCart, setItemQuantity, applyPromoCode],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
