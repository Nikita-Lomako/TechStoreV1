import { Link } from 'react-router-dom'
import { ProductRating } from './ProductRating.jsx'
import './ProductCard.css'

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const ProductCard = ({ product, onAddToCart }) => {
  const productUrl = `/product/${product.id}`

  return (
    <article className="product-card">
      <Link className="product-card__media" to={productUrl}>
        <img src={product.image} alt={product.title} className="product-card__img" loading="lazy" />
      </Link>
      <div className="product-card__body">
        <Link className="product-card__title-link" to={productUrl}>
          <h3 className="product-card__title">{product.title}</h3>
        </Link>
        <div className="product-card__rating-wrap">
          <ProductRating rating={product.rating} />
        </div>
        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <span className="product-card__category">{product.category}</span>
        </div>
        <button
          type="button"
          className="product-card__btn"
          onClick={() => onAddToCart?.(product)}
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
