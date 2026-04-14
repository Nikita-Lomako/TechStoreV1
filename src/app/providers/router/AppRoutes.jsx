import { Route, Routes } from 'react-router-dom'
import { Header } from '../../../widgets/header/ui/Header.jsx'
import { CartPage } from '../../../pages/cart-page/ui/CartPage.jsx'
import { CatalogPage } from '../../../pages/catalog-page/ui/CatalogPage.jsx'
import { ProductPage } from '../../../pages/product-page/ui/ProductPage.jsx'
import { APP_ROUTES } from '../../../shared/config/routes.js'

export const AppRoutes = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path={APP_ROUTES.catalog} element={<CatalogPage />} />
          <Route path={APP_ROUTES.product} element={<ProductPage />} />
          <Route path={APP_ROUTES.cart} element={<CartPage />} />
        </Routes>
      </main>
    </div>
  )
}
