import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import './AuthPage.css'

export const RegisterPage = () => {
  const { user, initializing, register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!initializing && user) {
      navigate(APP_ROUTES.catalog, { replace: true })
    }
  }, [initializing, user, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов.')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }

    setSubmitting(true)
    try {
      await register({ email: email.trim(), password })
      navigate(APP_ROUTES.catalog, { replace: true })
    } catch (registerError) {
      if (registerError?.status === 409) {
        setError('Аккаунт с таким email уже существует.')
      } else if (registerError?.status === 429) {
        setError('Слишком много попыток регистрации. Попробуйте позже.')
      } else {
        setError(registerError?.message || 'Не удалось создать аккаунт.')
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

        <h1 className="auth-card__title">Создать аккаунт</h1>
        <p className="auth-card__lead">
          Зарегистрируйтесь, чтобы сохранять корзину и оформлять заказы с любого устройства.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            className="auth-form__input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <label className="auth-form__label" htmlFor="register-password">
            Пароль
          </label>
          <input
            id="register-password"
            className="auth-form__input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Минимум 8 символов"
          />

          <label className="auth-form__label" htmlFor="register-confirm">
            Повторите пароль
          </label>
          <input
            id="register-confirm"
            className="auth-form__input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите пароль"
          />

          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-card__switch">
          Уже есть аккаунт? <Link to={APP_ROUTES.login}>Войти</Link>
        </p>
      </div>
    </div>
  )
}
