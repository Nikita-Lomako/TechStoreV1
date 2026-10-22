import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { API_BASE_URL } from '../../../shared/api/client.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import './AuthPage.css'

export const LoginPage = () => {
  const { user, initializing, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || APP_ROUTES.catalog

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!initializing && user) {
      navigate(from, { replace: true })
    }
  }, [initializing, user, from, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (loginError) {
      if (loginError?.status === 401) {
        setError('Неверный email или пароль.')
      } else if (loginError?.status === 429) {
        setError('Слишком много попыток входа. Попробуйте через несколько минут.')
      } else {
        setError(loginError?.message || 'Не удалось войти. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link className="auth-card__brand" to={APP_ROUTES.catalog}>
          <span className="auth-card__logo">T</span>
          TechStore
        </Link>

        <h1 className="auth-card__title">С возвращением</h1>
        <p className="auth-card__lead">Войдите, чтобы синхронизировать корзину и управлять заказами.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="auth-form__input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <div className="auth-form__label-row">
            <label className="auth-form__label" htmlFor="login-password">
              Пароль
            </label>
            <a
              className="auth-form__hint-link"
              href={`${API_BASE_URL}/forgot-password`}
            >
              Забыли пароль?
            </a>
          </div>
          <input
            id="login-password"
            className="auth-form__input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ваш пароль"
          />

          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="auth-demo">
          <p className="auth-demo__title">Демо-аккаунты</p>
          <p className="auth-demo__row">
            <span>Customer</span>
            <code>customer@techstore.local / Customer123!</code>
          </p>
          <p className="auth-demo__row">
            <span>Admin</span>
            <code>admin@techstore.local / Admin123!</code>
          </p>
        </div>

        <p className="auth-card__switch">
          Нет аккаунта? <Link to={APP_ROUTES.register}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
