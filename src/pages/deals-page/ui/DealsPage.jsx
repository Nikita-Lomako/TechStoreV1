import { Link } from 'react-router-dom'
import { getProductById } from '../../../shared/api/mock/products.js'
import { useCart } from '../../../features/cart/index.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import { ProductCard } from '../../../entities/product/ui/ProductCard.jsx'
import './DealsPage.css'

const DEAL_IDS = ['1', '2', '3', '4']

const IconTag = () => (
  <svg className="deals-page__tag-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
  </svg>
)

const IconClock = () => (
  <svg className="deals-page__clock-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const DealsPage = () => {
  const { addToCart } = useCart()
  const dealProducts = DEAL_IDS.map((id) => getProductById(id)).filter(Boolean)

  return (
    <div className="deals-page">
      <div className="deals-page__container">
        <div className="deals-page__intro">
          <div className="deals-page__heading-row">
            <IconTag />
            <h1 className="deals-page__title">Special Deals</h1>
          </div>
          <p className="deals-page__subtitle">Limited time offers on our best products — Don&apos;t miss out!</p>
        </div>

        <div className="deals-page__banner">
          <div className="deals-page__banner-inner">
            <div>
              <h2 className="deals-page__banner-title">Flash Sale Event</h2>
              <p className="deals-page__banner-text">Save up to 30% on selected items</p>
            </div>
            <div className="deals-page__banner-timer">
              <IconClock />
              <span className="deals-page__banner-timer-text">Ends in 2 days</span>
            </div>
          </div>
        </div>

        <div className="deals-page__grid">
          {dealProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              dealBadge="Save 20%"
              onAddToCart={() => addToCart(product.id, 1)}
            />
          ))}
        </div>

        <div className="deals-page__cta-wrap">
          <p className="deals-page__cta-text">Want to see more products?</p>
          <Link className="deals-page__cta-btn" to={APP_ROUTES.catalog}>
            Browse All Products
          </Link>
        </div>
      </div>
    </div>
  )
}
