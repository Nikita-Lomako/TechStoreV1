import { storageKeys } from './localStorage.js'

const defaultState = () => ({ items: [], appliedPromo: null })

export function loadCartState() {
  try {
    const raw = localStorage.getItem(storageKeys.cart)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed.items) ? parsed.items : []
    const appliedPromo = parsed.appliedPromo === 'SAVE10' ? 'SAVE10' : null
    return {
      items: items
        .filter((row) => row && typeof row.productId === 'string' && typeof row.quantity === 'number')
        .map((row) => ({
          productId: row.productId,
          quantity: Math.min(99, Math.max(1, Math.floor(row.quantity))),
        })),
      appliedPromo,
    }
  } catch {
    return defaultState()
  }
}

export function saveCartState(state) {
  try {
    localStorage.setItem(storageKeys.cart, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}
