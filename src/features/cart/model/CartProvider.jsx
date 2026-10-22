import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/index.js'
import * as cartApi from '../../../shared/api/cart.js'
import { getApiErrorMessage } from '../../../shared/api/client.js'
import { fetchProduct } from '../../../shared/api/products.js'
import {
  CART_TAX_RATE,
  PROMO_DISCOUNT_RATE,
  VALID_PROMO_CODE,
} from '../../../shared/config/promo.js'
import { loadCartState, saveCartState } from '../../../shared/lib/storage/cartPersistence.js'
import { CartContext } from './cart-context.js'

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100
const clampQuantity = (value) => Math.min(99, Math.max(1, Math.floor(Number(value)) || 1))

// Guest products are looked up by id and kept for the lifetime of the page.
const productCache = new Map()

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()

  const [guestItems, setGuestItems] = useState(() => loadCartState().items)
  const [guestPromo, setGuestPromo] = useState(() => loadCartState().appliedPromo)
  const [guestProducts, setGuestProducts] = useState({})
  const [serverCart, setServerCart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const syncRef = useRef({ userId: null, promise: null })
  const mutationQueue = useRef(Promise.resolve())

  const enqueueMutation = useCallback((task) => {
    const run = mutationQueue.current.then(task, task)
    mutationQueue.current = run.catch(() => {})
    return run
  }, [])

  // Persist the guest cart only while signed out.
  useEffect(() => {
    if (isAuthenticated) return
    saveCartState({ items: guestItems, appliedPromo: guestPromo })
  }, [guestItems, guestPromo, isAuthenticated])

  // Resolve product details for a guest cart (the API is the source of truth).
  useEffect(() => {
    if (isAuthenticated || guestItems.length === 0) {
      setGuestProducts({})
      return undefined
    }

    let cancelled = false
    setLoading(true)

    const productIds = [...new Set(guestItems.map((item) => item.productId))]
    Promise.allSettled(
      productIds.map(async (productId) => {
        if (productCache.has(productId)) return [productId, productCache.get(productId)]
        const product = await fetchProduct(productId)
        productCache.set(productId, product)
        return [productId, product]
      }),
    ).then((results) => {
      if (cancelled) return

      const resolved = {}
      const missingIds = []
      let hadServerError = false

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const [productId, product] = result.value
          resolved[productId] = product
        } else {
          const reason = result.reason
          if (reason?.status === 404) missingIds.push(productIds[index])
          else hadServerError = true
        }
      })

      if (missingIds.length > 0) {
        setGuestItems((prev) =>
          prev.filter((item) => !missingIds.includes(item.productId)),
        )
      }
      if (hadServerError) {
        setError('Не удалось загрузить часть товаров из корзины.')
      }
      setGuestProducts(resolved)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [guestItems, isAuthenticated])

  // Load the server cart after login and merge the guest cart exactly once.
  useEffect(() => {
    if (!isAuthenticated) {
      syncRef.current = { userId: null, promise: null }
      setServerCart(null)
      return undefined
    }

    if (syncRef.current.userId === user.id && syncRef.current.promise) {
      syncRef.current.promise
        .then((cart) => setServerCart(cart))
        .catch(() => {})
      return undefined
    }

    const promise = (async () => {
      setLoading(true)
      setError(null)

      try {
        let cart
        if (guestItems.length > 0) {
          cart = await cartApi.mergeGuestCart(
            guestItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          )
          setGuestItems([])
          saveCartState({ items: [], appliedPromo: null })
        } else {
          cart = await cartApi.fetchCart()
        }

        if (guestPromo) {
          try {
            cart = await cartApi.applyCartPromo(guestPromo)
          } catch {
            // The guest promo may have been disabled in the meantime.
          }
          setGuestPromo(null)
          saveCartState({ items: [], appliedPromo: null })
        }

        setServerCart(cart)
        return cart
      } catch (syncError) {
        setError(getApiErrorMessage(syncError))
        throw syncError
      } finally {
        setLoading(false)
      }
    })()

    syncRef.current = { userId: user.id, promise }
    promise.catch(() => {})
    return undefined
  }, [isAuthenticated, user?.id, guestItems, guestPromo])

  const runServerMutation = useCallback(
    (operation) =>
      enqueueMutation(async () => {
        setMutating(true)
        setError(null)
        try {
          const cart = await operation()
          setServerCart(cart)
          return cart
        } catch (mutationError) {
          setError(getApiErrorMessage(mutationError))
          return null
        } finally {
          setMutating(false)
        }
      }),
    [enqueueMutation],
  )

  const addToCart = useCallback(
    (productId, quantity = 1) => {
      const normalizedId = String(productId)
      const amount = clampQuantity(quantity)

      if (isAuthenticated) {
        return runServerMutation(() => cartApi.addCartItem(normalizedId, amount))
      }

      setGuestItems((prev) => {
        const existing = prev.find((item) => item.productId === normalizedId)
        if (existing) {
          return prev.map((item) =>
            item.productId === normalizedId
              ? { ...item, quantity: Math.min(99, item.quantity + amount) }
              : item,
          )
        }
        return [...prev, { productId: normalizedId, quantity: amount }]
      })
      setError(null)
      return undefined
    },
    [isAuthenticated, runServerMutation],
  )

  const removeFromCart = useCallback(
    (productId) => {
      const normalizedId = String(productId)

      if (isAuthenticated) {
        const item = serverCart?.items.find((row) => row.productId === normalizedId)
        if (!item) return undefined
        return runServerMutation(() => cartApi.removeCartItem(item.id))
      }

      setGuestItems((prev) => prev.filter((item) => item.productId !== normalizedId))
      return undefined
    },
    [isAuthenticated, serverCart, runServerMutation],
  )

  const setItemQuantity = useCallback(
    (productId, quantity) => {
      const normalizedId = String(productId)
      const nextQuantity = Math.floor(Number(quantity))

      if (nextQuantity < 1) {
        return removeFromCart(normalizedId)
      }

      const amount = Math.min(99, nextQuantity)

      if (isAuthenticated) {
        const item = serverCart?.items.find((row) => row.productId === normalizedId)
        if (!item) return undefined
        return runServerMutation(() => cartApi.updateCartItem(item.id, amount))
      }

      setGuestItems((prev) =>
        prev.map((item) =>
          item.productId === normalizedId ? { ...item, quantity: amount } : item,
        ),
      )
      return undefined
    },
    [isAuthenticated, serverCart, removeFromCart, runServerMutation],
  )

  const applyPromoCode = useCallback(
    async (rawCode) => {
      const code = String(rawCode ?? '').trim().toUpperCase()
      if (!code) return { ok: false, error: 'empty' }

      if (!isAuthenticated) {
        if (code === VALID_PROMO_CODE) {
          setGuestPromo(VALID_PROMO_CODE)
          return { ok: true }
        }
        return { ok: false, error: 'invalid' }
      }

      setMutating(true)
      setError(null)
      try {
        const cart = await cartApi.applyCartPromo(code)
        setServerCart(cart)
        return { ok: true }
      } catch (promoError) {
        if (promoError?.code === 'INVALID_PROMO_CODE') {
          return { ok: false, error: 'invalid' }
        }
        setError(getApiErrorMessage(promoError))
        return { ok: false, error: 'server', message: getApiErrorMessage(promoError) }
      } finally {
        setMutating(false)
      }
    },
    [isAuthenticated],
  )

  const removePromoCode = useCallback(async () => {
    if (!isAuthenticated) {
      setGuestPromo(null)
      return
    }

    await runServerMutation(() => cartApi.removeCartPromo())
  }, [isAuthenticated, runServerMutation])

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setGuestItems([])
      setGuestPromo(null)
      return
    }
    await runServerMutation(() => cartApi.clearCart())
  }, [isAuthenticated, runServerMutation])

  const lines = useMemo(() => {
    if (isAuthenticated) {
      return (serverCart?.items ?? []).map((item) => ({
        itemId: item.id,
        product: item.product,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      }))
    }

    return guestItems
      .map((item) => {
        const product = guestProducts[item.productId]
        if (!product) return null
        return {
          itemId: null,
          product,
          quantity: item.quantity,
          lineTotal: roundMoney(product.price * item.quantity),
        }
      })
      .filter(Boolean)
  }, [isAuthenticated, serverCart, guestItems, guestProducts])

  const totals = useMemo(() => {
    if (isAuthenticated && serverCart) {
      return {
        subtotal: serverCart.subtotal,
        discount: serverCart.discount,
        tax: serverCart.tax,
        total: serverCart.total,
        totalQuantity: serverCart.totalQuantity,
      }
    }

    const subtotal = roundMoney(
      lines.reduce((sum, line) => sum + line.lineTotal, 0),
    )
    const discount =
      guestPromo === VALID_PROMO_CODE
        ? roundMoney(subtotal * PROMO_DISCOUNT_RATE)
        : 0
    const taxable = roundMoney(subtotal - discount)
    const tax = roundMoney(taxable * CART_TAX_RATE)
    const total = roundMoney(taxable + tax)
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)

    return { subtotal, discount, tax, total, totalQuantity }
  }, [isAuthenticated, serverCart, lines, guestPromo])

  const appliedPromo = isAuthenticated
    ? (serverCart?.promo?.code ?? null)
    : guestPromo

  const value = useMemo(
    () => ({
      items: isAuthenticated
        ? (serverCart?.items ?? []).map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        : guestItems,
      lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      appliedPromo,
      totalQuantity: totals.totalQuantity,
      addToCart,
      removeFromCart,
      setItemQuantity,
      applyPromoCode,
      removePromoCode,
      clearCart,
      loading,
      mutating,
      error,
      clearError: () => setError(null),
    }),
    [
      isAuthenticated,
      serverCart,
      guestItems,
      lines,
      totals,
      appliedPromo,
      addToCart,
      removeFromCart,
      setItemQuantity,
      applyPromoCode,
      removePromoCode,
      clearCart,
      loading,
      mutating,
      error,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
