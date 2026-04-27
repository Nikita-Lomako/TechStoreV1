import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../../features/cart/index.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import { VALID_PROMO_CODE } from '../../../shared/config/promo.js'
import './CartPage.css'

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const IconTrash = () => (
  <svg className="cart-page__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconTruck = () => (
  <svg className="cart-page__ship-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconMapPin = () => (
  <svg className="cart-page__pin-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const CartPage = () => {
  const {
    lines,
    subtotal,
    discount,
    tax,
    total,
    appliedPromo,
    removeFromCart,
    setItemQuantity,
    applyPromoCode,
  } = useCart()

  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState(null)

  const handleApplyPromo = (e) => {
    e.preventDefault()
    const trimmed = promoInput.trim()
    if (!trimmed) {
      setPromoError(null)
      return
    }
    const result = applyPromoCode(trimmed)
    if (result.ok) {
      setPromoError(null)
      setPromoInput('')
    } else if (result.error === 'invalid') {
      setPromoError('invalid')
    } else {
      setPromoError(null)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="cart-page cart-page--empty">
        <div className="cart-page__container">
          <h1 className="cart-page__title">Корзина</h1>
          <p className="cart-page__empty-text">В корзине пока ничего нет.</p>
          <Link className="cart-page__empty-btn" to={APP_ROUTES.catalog}>
            Вернуться в каталог
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="cart-page__container">
        <h1 className="cart-page__title">Shopping Cart</h1>

        <div className="cart-page__grid">
          <div className="cart-page__lines">
            {lines.map(({ product, quantity, lineTotal }) => (
              <div key={product.id} className="cart-line">
                <Link className="cart-line__thumb-wrap" to={`/product/${product.id}`}>
                  <img src={product.image} alt="" className="cart-line__thumb" />
                </Link>
                <div className="cart-line__body">
                  <div className="cart-line__top">
                    <div>
                      <Link className="cart-line__title" to={`/product/${product.id}`}>
                        {product.title}
                      </Link>
                      <p className="cart-line__category">{product.subtitle ?? product.category}</p>
                    </div>
                    <button
                      type="button"
                      className="cart-line__remove"
                      aria-label="Remove item"
                      onClick={() => removeFromCart(product.id)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                  <div className="cart-line__bottom">
                    <div className="cart-line__qty">
                      <button
                        type="button"
                        className="cart-line__qty-btn"
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setItemQuantity(product.id, quantity - 1)}
                      >
                        −
                      </button>
                      <span className="cart-line__qty-value">{quantity}</span>
                      <button
                        type="button"
                        className="cart-line__qty-btn"
                        aria-label="Increase quantity"
                        disabled={quantity >= 99}
                        onClick={() => setItemQuantity(product.id, quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-line__prices">
                      <p className="cart-line__line-total">{formatPrice(lineTotal)}</p>
                      <p className="cart-line__each">{formatPrice(product.price)} each</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-page__aside">
            <div className="cart-summary">
              <h2 className="cart-summary__title">Order Summary</h2>
              <div className="cart-summary__rows">
                <div className="cart-summary__row">
                  <span className="cart-summary__label">Subtotal</span>
                  <span className="cart-summary__value">{formatPrice(subtotal)}</span>
                </div>
                {appliedPromo === VALID_PROMO_CODE ? (
                  <div className="cart-summary__row cart-summary__row--discount">
                    <span className="cart-summary__label">Discount ({VALID_PROMO_CODE})</span>
                    <span className="cart-summary__value">−{formatPrice(discount)}</span>
                  </div>
                ) : null}
                <div className="cart-summary__row">
                  <span className="cart-summary__label">Tax (8%)</span>
                  <span className="cart-summary__value">{formatPrice(tax)}</span>
                </div>
                <div className="cart-summary__row cart-summary__row--total">
                  <span className="cart-summary__label">Total</span>
                  <span className="cart-summary__total">{formatPrice(total)}</span>
                </div>
              </div>

              <form className="cart-promo" onSubmit={handleApplyPromo}>
                <label className="cart-promo__label" htmlFor="cart-promo-input">
                  Promo Code
                </label>
                <div className="cart-promo__row">
                  <input
                    id="cart-promo-input"
                    type="text"
                    className="cart-promo__input"
                    placeholder="Enter code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value)
                      if (promoError) setPromoError(null)
                    }}
                  />
                  <button
                    type="submit"
                    className="cart-promo__apply"
                    disabled={!promoInput.trim()}
                  >
                    Apply
                  </button>
                </div>
                {promoError === 'invalid' ? (
                  <p className="cart-promo__error" role="alert">
                    Неверный промокод
                  </p>
                ) : null}
                <p className="cart-promo__hint">Try code &quot;SAVE10&quot; for 10% off</p>
              </form>

              <button type="button" className="cart-summary__checkout">
                Proceed to Checkout
              </button>
            </div>

            <div className="cart-shipping">
              <h3 className="cart-shipping__title">
                <IconTruck />
                Shipping Information
              </h3>
              <div className="cart-shipping__block">
                <div className="cart-shipping__addr">
                  <IconMapPin />
                  <div>
                    <p className="cart-shipping__addr-title">Delivery Address</p>
                    <p className="cart-shipping__addr-line">123 Tech Street</p>
                    <p className="cart-shipping__addr-line">San Francisco, CA 94105</p>
                  </div>
                </div>
                <div className="cart-shipping__est">
                  <p className="cart-shipping__addr-title">Estimated Delivery</p>
                  <p className="cart-shipping__addr-line">3-5 business days</p>
                  <p className="cart-shipping__free">Free shipping on orders over $50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
