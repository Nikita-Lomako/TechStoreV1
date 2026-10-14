import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../../../shared/api/auth.js'
import { SESSION_EXPIRED_EVENT, tokenStorage } from '../../../shared/api/client.js'
import { AuthContext } from './auth-context.js'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      if (!tokenStorage.getAccess() && !tokenStorage.getRefresh()) {
        if (!cancelled) setInitializing(false)
        return
      }

      try {
        const currentUser = await fetchCurrentUser()
        if (!cancelled) setUser(currentUser)
      } catch {
        tokenStorage.clear()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    const handleSessionExpired = () => {
      tokenStorage.clear()
      setUser(null)
    }

    restoreSession()
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)

    return () => {
      cancelled = true
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [])

  const applySession = useCallback((data) => {
    tokenStorage.setTokens(data)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(
    async (credentials) => applySession(await loginAccount(credentials)),
    [applySession],
  )

  const register = useCallback(
    async (payload) => applySession(await registerAccount(payload)),
    [applySession],
  )

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefresh()
    tokenStorage.clear()
    setUser(null)
    try {
      await logoutAccount(refreshToken)
    } catch {
      // Local logout is already complete; a failed revocation is not critical.
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      initializing,
      login,
      register,
      logout,
    }),
    [user, initializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
