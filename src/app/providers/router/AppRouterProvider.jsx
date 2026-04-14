import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes.jsx'

export const AppRouterProvider = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
