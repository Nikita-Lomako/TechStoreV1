import { useState } from 'react'
import { NavLink } from 'react-router-dom'
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

export const Header = ({ cartCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="site-header__container">
        <div className="site-header__row">
          <NavLink className="site-header__brand" to={APP_ROUTES.catalog} onClick={() => setMenuOpen(false)}>
            <div className="site-header__logo-mark" aria-hidden="true">
              <span>T</span>
            </div>
            <span className="site-header__brand-text">TechStore</span>
          </NavLink>

          <nav className={`site-header__nav ${menuOpen ? 'site-header__nav--open' : ''}`} aria-label="Main menu">
            <NavLink
              className={({ isActive }) =>
                `site-header__nav-link${isActive ? ' site-header__nav-link--active' : ''}`
              }
              to={APP_ROUTES.catalog}
              onClick={() => setMenuOpen(false)}
            >
              Products
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-header__nav-link${isActive ? ' site-header__nav-link--active' : ''}`
              }
              to={APP_ROUTES.categories}
              onClick={() => setMenuOpen(false)}
            >
              Categories
            </NavLink>
            <span className="site-header__nav-link site-header__nav-link--muted" tabIndex={-1} aria-disabled="true">
              Deals
            </span>
            <span className="site-header__nav-link site-header__nav-link--muted" tabIndex={-1} aria-disabled="true">
              About
            </span>
          </nav>

          <div className="site-header__actions">
            <button type="button" className="site-header__icon-btn" aria-label="Search">
              <IconSearch />
            </button>
            <NavLink
              className="site-header__icon-btn site-header__cart-link"
              to={APP_ROUTES.cart}
              aria-label="Shopping cart"
              onClick={() => setMenuOpen(false)}
            >
              <IconCart />
              <span className="site-header__cart-badge">{cartCount}</span>
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
