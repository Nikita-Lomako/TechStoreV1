import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { useCart } from '../../../features/cart/index.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import './Header.css'

const IconSearch = () => (
  <svg className="site-header__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconCart = () => (
  <svg className="site-header__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
    <circle cx="19" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconMenu = () => (
  <svg className="site-header__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h16M4 6h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const navLinkClass = ({ isActive }) =>
  `site-header__nav-link${isActive ? ' site-header__nav-link--active' : ''}`

export const Header = () => {
  const { totalQuantity } = useCart()
  const { user, isAdmin, initializing, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    closeMenu()
    await logout()
    navigate(APP_ROUTES.catalog)
  }

  return (
    <header className="site-header">
      <div className="site-header__container">
        <div className="site-header__row">
          <NavLink className="site-header__brand" to={APP_ROUTES.catalog} onClick={closeMenu}>
            <div className="site-header__logo-mark" aria-hidden="true">
              <span>T</span>
            </div>
            <span className="site-header__brand-text">TechStore</span>
          </NavLink>

          <nav className={`site-header__nav ${menuOpen ? 'site-header__nav--open' : ''}`} aria-label="Main menu">
            <NavLink className={navLinkClass} to={APP_ROUTES.catalog} end onClick={closeMenu}>
              Products
            </NavLink>
            <NavLink className={navLinkClass} to={APP_ROUTES.categories} onClick={closeMenu}>
              Categories
            </NavLink>
            <NavLink className={navLinkClass} to={APP_ROUTES.deals} onClick={closeMenu}>
              Deals
            </NavLink>
            <NavLink className={navLinkClass} to={APP_ROUTES.about} onClick={closeMenu}>
              About
            </NavLink>

            {!initializing && !user ? (
              <>
                <NavLink className={`${navLinkClass({ isActive: false })} site-header__nav-link--mobile-auth`} to={APP_ROUTES.login} onClick={closeMenu}>
                  Войти
                </NavLink>
                <NavLink className={`${navLinkClass({ isActive: false })} site-header__nav-link--mobile-auth`} to={APP_ROUTES.register} onClick={closeMenu}>
                  Регистрация
                </NavLink>
              </>
            ) : null}

            {!initializing && user ? (
              <>
                {isAdmin ? (
                  <NavLink className={`${navLinkClass({ isActive: false })} site-header__nav-link--mobile-auth`} to={APP_ROUTES.adminProducts} onClick={closeMenu}>
                    Admin panel
                  </NavLink>
                ) : null}
                <button type="button" className="site-header__nav-link site-header__nav-link--mobile-auth site-header__nav-logout" onClick={handleLogout}>
                  Выйти ({user.email})
                </button>
              </>
            ) : null}
          </nav>

          <div className="site-header__actions">
            <NavLink className="site-header__icon-btn" to={APP_ROUTES.catalog} aria-label="Search products" onClick={closeMenu}>
              <IconSearch />
            </NavLink>

            <div className="site-header__auth">
              {initializing ? null : user ? (
                <>
                  {isAdmin ? (
                    <NavLink className="site-header__auth-link" to={APP_ROUTES.adminProducts}>
                      Admin
                    </NavLink>
                  ) : null}
                  <span className="site-header__auth-email" title={user.email}>
                    {user.email}
                  </span>
                  <button type="button" className="site-header__auth-btn" onClick={handleLogout}>
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <NavLink className="site-header__auth-link" to={APP_ROUTES.login}>
                    Войти
                  </NavLink>
                  <NavLink className="site-header__auth-link site-header__auth-link--primary" to={APP_ROUTES.register}>
                    Регистрация
                  </NavLink>
                </>
              )}
            </div>

            <NavLink
              className="site-header__icon-btn site-header__cart-link"
              to={APP_ROUTES.cart}
              aria-label="Shopping cart"
              onClick={closeMenu}
            >
              <IconCart />
              {totalQuantity > 0 ? <span className="site-header__cart-badge">{totalQuantity}</span> : null}
            </NavLink>
            <button
              type="button"
              className="site-header__icon-btn site-header__menu-btn"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <IconMenu />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
