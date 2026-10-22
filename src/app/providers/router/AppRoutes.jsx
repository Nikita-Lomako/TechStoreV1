import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { Header } from '../../../widgets/header/ui/Header.jsx'
import { Footer } from '../../../widgets/footer/ui/Footer.jsx'
import { CartPage } from '../../../pages/cart-page/ui/CartPage.jsx'
import { CatalogPage } from '../../../pages/catalog-page/ui/CatalogPage.jsx'
import { CategoriesPage } from '../../../pages/categories-page/ui/CategoriesPage.jsx'
import { DealsPage } from '../../../pages/deals-page/ui/DealsPage.jsx'
import { AboutPage } from '../../../pages/about-page/ui/AboutPage.jsx'
import { ProductPage } from '../../../pages/product-page/ui/ProductPage.jsx'
import { LoginPage } from '../../../pages/auth-page/ui/LoginPage.jsx'
import { RegisterPage } from '../../../pages/auth-page/ui/RegisterPage.jsx'
import { AdminProductsPage } from '../../../pages/admin-page/ui/AdminProductsPage.jsx'
import { APP_ROUTES } from '../../../shared/config/routes.js'

const RequireAuth = ({ adminOnly = false, children }) => {
  const { user, isAdmin, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="app-route-status" role="status">
        Проверяем сессию…
      </div>
    )
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.login} state={{ from: location.pathname }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={APP_ROUTES.catalog} replace />
  }

  return children
}

export const AppRoutes = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path={APP_ROUTES.catalog} element={<CatalogPage />} />
          <Route path={APP_ROUTES.categories} element={<CategoriesPage />} />
          <Route path={APP_ROUTES.deals} element={<DealsPage />} />
          <Route path={APP_ROUTES.about} element={<AboutPage />} />
          <Route path={APP_ROUTES.product} element={<ProductPage />} />
          <Route path={APP_ROUTES.cart} element={<CartPage />} />
          <Route path={APP_ROUTES.login} element={<LoginPage />} />
          <Route path={APP_ROUTES.register} element={<RegisterPage />} />
          <Route
            path={APP_ROUTES.adminProducts}
            element={
              <RequireAuth adminOnly>
                <AdminProductsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={APP_ROUTES.catalog} replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
