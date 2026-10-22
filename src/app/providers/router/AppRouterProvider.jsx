import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '../../../features/auth/index.js'
import { CartProvider } from '../../../features/cart/index.js'
import { AppRoutes } from './AppRoutes.jsx'

export const AppRouterProvider = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  )
}
