import { Link } from 'react-router-dom'
import { ProductRating } from './ProductRating.jsx'
import './ProductCard.css'

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const ProductCard = ({ product, onAddToCart, dealBadge }) => {
  const productUrl = `/product/${product.id}`
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity <= 0

  return (
    <article className={`product-card${dealBadge ? ' product-card--deal' : ''}${outOfStock ? ' product-card--out-of-stock' : ''}`}>
      <Link className="product-card__media" to={productUrl}>
        {dealBadge ? <span className="product-card__deal-badge">{dealBadge}</span> : null}
        {outOfStock ? <span className="product-card__stock-badge">Out of stock</span> : null}
        {product.image ? (
          <img src={product.image} alt={product.title} className="product-card__img" loading="lazy" />
        ) : (
          <span className="product-card__img-placeholder">No image</span>
        )}
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
          <span className="product-card__category">{product.category ?? 'Uncategorized'}</span>
        </div>
        <button
          type="button"
          className="product-card__btn"
          onClick={() => onAddToCart?.(product)}
          disabled={outOfStock}
        >
          {outOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}
