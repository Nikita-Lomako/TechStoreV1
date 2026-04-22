import { Route, Routes } from 'react-router-dom'
import { Header } from '../../../widgets/header/ui/Header.jsx'
import { Footer } from '../../../widgets/footer/ui/Footer.jsx'
import { CartPage } from '../../../pages/cart-page/ui/CartPage.jsx'
import { CatalogPage } from '../../../pages/catalog-page/ui/CatalogPage.jsx'
import { CategoriesPage } from '../../../pages/categories-page/ui/CategoriesPage.jsx'
import { DealsPage } from '../../../pages/deals-page/ui/DealsPage.jsx'
import { ProductPage } from '../../../pages/product-page/ui/ProductPage.jsx'
import { APP_ROUTES } from '../../../shared/config/routes.js'

export const AppRoutes = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path={APP_ROUTES.catalog} element={<CatalogPage />} />
          <Route path={APP_ROUTES.categories} element={<CategoriesPage />} />
          <Route path={APP_ROUTES.deals} element={<DealsPage />} />
          <Route path={APP_ROUTES.product} element={<ProductPage />} />
          <Route path={APP_ROUTES.cart} element={<CartPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
