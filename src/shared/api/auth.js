import { api } from './client.js'

export const registerAccount = (payload) =>
  api.post('/api/auth/register', payload, { auth: false })

export const loginAccount = (payload) =>
  api.post('/api/auth/login', payload, { auth: false })

export const fetchCurrentUser = () => api.get('/api/auth/me')

export const logoutAccount = (refreshToken) =>
  api.post('/api/auth/logout', { refreshToken }, { auth: false })

export const requestPasswordReset = (email) =>
  api.post('/api/auth/forgot-password', { email }, { auth: false })

export const resetPassword = (token, password) =>
  api.post('/api/auth/reset-password', { token, password }, { auth: false })
