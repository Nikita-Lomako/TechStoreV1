import { api } from './client.js'

const buildQuery = (params = {}) => {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }

  const stringified = query.toString()
  return stringified ? `?${stringified}` : ''
}

export const fetchProducts = (params = {}, options = {}) =>
  api.get(`/api/products${buildQuery(params)}`, { signal: options.signal })

export const fetchProduct = (productId, options = {}) =>
  api.get(`/api/products/${productId}`, { signal: options.signal })

export const fetchRelatedProducts = (productId, limit = 4, options = {}) =>
  api.get(`/api/products/${productId}/related${buildQuery({ limit })}`, {
    signal: options.signal,
  })

export const fetchCategories = (options = {}) =>
  api.get('/api/products/categories', { signal: options.signal })

export const createProduct = (payload) => api.post('/api/products', payload)

export const updateProduct = (productId, payload) =>
  api.patch(`/api/products/${productId}`, payload)

export const deleteProduct = (productId) => api.delete(`/api/products/${productId}`)

export const uploadProductImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.upload('/api/uploads', formData)
}
