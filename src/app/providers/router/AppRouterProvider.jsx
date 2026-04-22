import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from '../../../features/cart/index.js'
import { AppRoutes } from './AppRoutes.jsx'

export const AppRouterProvider = () => {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </BrowserRouter>
  )
}
