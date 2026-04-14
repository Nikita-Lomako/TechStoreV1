import { NavLink } from 'react-router-dom'
import { APP_ROUTES } from '../../../shared/config/routes.js'

export const Header = () => {
  return (
    <header className="header">
      <div className="header__content">
        <NavLink className="header__logo" to={APP_ROUTES.catalog}>
          Tech Store
        </NavLink>

        <nav className="header__nav" aria-label="Main menu">
          <NavLink to={APP_ROUTES.catalog}>Catalog</NavLink>
          <NavLink to={APP_ROUTES.cart}>Cart</NavLink>
        </nav>

        <NavLink className="header__cart" to={APP_ROUTES.cart}>
          Cart
          <span className="header__badge">0</span>
        </NavLink>
      </div>
    </header>
  )
}
