const configuredUrl = import.meta.env.VITE_API_URL?.trim()
export const API_BASE_URL = (configuredUrl || 'http://localhost:3000').replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'techstore.auth.access'
const REFRESH_TOKEN_KEY = 'techstore.auth.refresh'
export const SESSION_EXPIRED_EVENT = 'techstore:session-expired'

const readStorage = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Private mode / quota: the in-memory session still works for this tab.
  }
}

export const tokenStorage = {
  getAccess: () => readStorage(ACCESS_TOKEN_KEY),
  getRefresh: () => readStorage(REFRESH_TOKEN_KEY),
  setTokens: ({ accessToken, refreshToken }) => {
    writeStorage(ACCESS_TOKEN_KEY, accessToken)
    writeStorage(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear: () => {
    writeStorage(ACCESS_TOKEN_KEY, null)
    writeStorage(REFRESH_TOKEN_KEY, null)
  },
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const parseBody = async (response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) throw new ApiError('Session expired', { status: 401, code: 'NO_REFRESH_TOKEN' })

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await parseBody(response)

    if (!response.ok) {
      tokenStorage.clear()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      throw new ApiError(
        data?.error?.message || 'Session expired',
        { status: response.status, code: data?.error?.code || 'SESSION_EXPIRED' },
      )
    }

    tokenStorage.setTokens(data)
    return data
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function request(path, { method = 'GET', body, auth = true, headers, signal, retry = true } = {}) {
  const requestHeaders = new Headers(headers || {})
  let requestBody = body

  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  if (auth) {
    const accessToken = tokenStorage.getAccess()
    if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('Не удалось подключиться к серверу. Проверьте соединение.', {
      code: 'NETWORK_ERROR',
    })
  }

  if (response.status === 401 && auth && retry && tokenStorage.getRefresh()) {
    try {
      await refreshAccessToken()
      return request(path, { method, body, auth, headers, signal, retry: false })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
    }
  }

  const data = await parseBody(response)

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || `Запрос завершился с ошибкой (${response.status})`,
      {
        status: response.status,
        code: data?.error?.code || 'REQUEST_FAILED',
        details: data?.error?.details,
      },
    )
  }

  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData, options) =>
    request(path, { ...options, method: 'POST', body: formData }),
}

export const getApiErrorMessage = (error) => {
  if (error instanceof ApiError) return error.message
  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
