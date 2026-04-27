import { HashRouter } from 'react-router-dom'
import { CartProvider } from '../../../features/cart/index.js'
import { AppRoutes } from './AppRoutes.jsx'

export const AppRouterProvider = () => {
  return (
    <HashRouter>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </HashRouter>
  )
}
