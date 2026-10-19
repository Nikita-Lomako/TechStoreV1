import { api } from './client.js'

export const fetchCart = (options = {}) => api.get('/api/cart', { signal: options.signal })

export const addCartItem = (productId, quantity = 1) =>
  api.post('/api/cart/items', { productId, quantity })

export const updateCartItem = (itemId, quantity) =>
  api.patch(`/api/cart/items/${itemId}`, { quantity })

export const removeCartItem = (itemId) => api.delete(`/api/cart/items/${itemId}`)

export const clearCart = () => api.delete('/api/cart')

export const applyCartPromo = (code) => api.post('/api/cart/apply-promo', { code })

export const removeCartPromo = () => api.delete('/api/cart/promo')

export const mergeGuestCart = (items) => api.post('/api/cart/merge', { items })
