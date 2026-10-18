import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../../../features/cart/index.js'
import { getApiErrorMessage } from '../../../shared/api/client.js'
import { fetchProduct, fetchRelatedProducts } from '../../../shared/api/products.js'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import { ProductCard } from '../../../entities/product/ui/ProductCard.jsx'
import { ProductRating } from '../../../entities/product/ui/ProductRating.jsx'
import './ProductPage.css'

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const IconChevronRight = () => (
  <svg className="product-page__bc-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconChevronLeft = () => (
  <svg className="product-page__gallery-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconChevronRightNav = () => (
  <svg className="product-page__gallery-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconCart = () => (
  <svg className="product-page__cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
    <circle cx="19" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function ProductPageContent({ product }) {
  const { addToCart, mutating } = useCart()
  const [related, setRelated] = useState([])
  const [relatedError, setRelatedError] = useState(null)

  const galleryImages = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : []

  const [activeIndex, setActiveIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const stockQuantity = product.stockQuantity ?? 0
  const outOfStock = stockQuantity <= 0
  const maxQuantity = Math.max(1, Math.min(99, stockQuantity))

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    fetchRelatedProducts(product.id, 3, { signal: controller.signal })
      .then((items) => {
        if (!cancelled) setRelated(items)
      })
      .catch((error) => {
        if (cancelled || error?.name === 'AbortError') return
        setRelatedError(getApiErrorMessage(error))
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [product.id])

  const goPrev = () => {
    if (galleryImages.length === 0) return
    setActiveIndex((i) => (i <= 0 ? galleryImages.length - 1 : i - 1))
  }

  const goNext = () => {
    if (galleryImages.length === 0) return
    setActiveIndex((i) => (i >= galleryImages.length - 1 ? 0 : i + 1))
  }

  const decQty = () => setQuantity((q) => Math.max(1, q - 1))
  const incQty = () => setQuantity((q) => Math.min(maxQuantity, q + 1))

  const handleAddToCart = async () => {
    if (outOfStock) return
    setAdding(true)
    setAdded(false)
    try {
      const result = await addToCart(product.id, quantity)
      if (result !== null) {
        setAdded(true)
        window.setTimeout(() => setAdded(false), 2500)
      }
    } finally {
      setAdding(false)
    }
  }

  const highlights = product.highlights ?? []
  const longDescription = product.longDescription ?? product.description
  const specsText = product.specifications ?? ''
  const reviewCount = product.reviewCount ?? 0

  return (
    <div className="product-page">
      <div className="product-page__container">
        <nav className="product-page__breadcrumb" aria-label="Breadcrumb">
          <ol className="product-page__breadcrumb-list">
            <li className="product-page__breadcrumb-item">
              <Link className="product-page__breadcrumb-link" to={APP_ROUTES.catalog}>
                Products
              </Link>
            </li>
            <li className="product-page__breadcrumb-sep" aria-hidden="true">
              <IconChevronRight />
            </li>
            {product.category ? (
              <>
                <li className="product-page__breadcrumb-item">
                  <Link
                    className="product-page__breadcrumb-link"
                    to={`/?category=${encodeURIComponent(product.category)}`}
                  >
                    {product.category}
                  </Link>
                </li>
                <li className="product-page__breadcrumb-sep" aria-hidden="true">
                  <IconChevronRight />
                </li>
              </>
            ) : null}
            <li className="product-page__breadcrumb-item">
              <span className="product-page__breadcrumb-current" aria-current="page">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>

        <div className="product-page__grid">
          <div className="product-page__gallery-col">
            <div className="product-page__hero">
              {galleryImages.length > 0 ? (
                <img
                  className="product-page__hero-img"
                  src={galleryImages[activeIndex]}
                  alt={`${product.title} — image ${activeIndex + 1}`}
                />
              ) : (
                <div className="product-page__hero-placeholder">No image</div>
              )}
              {galleryImages.length > 1 ? (
                <>
                  <button type="button" className="product-page__hero-nav product-page__hero-nav--prev" aria-label="Previous image" onClick={goPrev}>
                    <IconChevronLeft />
                  </button>
                  <button type="button" className="product-page__hero-nav product-page__hero-nav--next" aria-label="Next image" onClick={goNext}>
                    <IconChevronRightNav />
                  </button>
                </>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="product-page__thumbs">
                {galleryImages.map((src, idx) => (
                  <button
                    key={`${product.id}-thumb-${idx}`}
                    type="button"
                    className={`product-page__thumb${idx === activeIndex ? ' product-page__thumb--active' : ''}`}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Show image ${idx + 1}`}
                  >
                    <img src={src} alt="" className="product-page__thumb-img" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-page__info">
            <h1 className="product-page__title">{product.title}</h1>
            {product.subtitle ? <p className="product-page__subtitle">{product.subtitle}</p> : null}

            <div className="product-page__rating-block">
              <ProductRating rating={product.rating} size="lg" />
              <p className="product-page__reviews">Based on {reviewCount} reviews</p>
            </div>

            <div className="product-page__price-row">
              <span className="product-page__price">{formatPrice(product.price)}</span>
              {product.freeShipping ? <span className="product-page__shipping">Free shipping</span> : null}
            </div>

            <p className={`product-page__stock${outOfStock ? ' product-page__stock--out' : ''}`}>
              {outOfStock ? 'Out of stock' : `In stock: ${stockQuantity}`}
            </p>

            {highlights.length > 0 ? (
              <div className="product-page__highlights">
                <h2 className="product-page__highlights-title">Key Highlights</h2>
                <ul className="product-page__highlights-list">
                  {highlights.map((highlight, index) => (
                    <li key={`${highlight.label}-${index}`} className="product-page__highlights-item">
                      <span className="product-page__highlights-dot" aria-hidden="true" />
                      <span>
                        <span className="product-page__highlights-label">{highlight.label}:</span> {highlight.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="product-page__description-block">
              <h2 className="product-page__section-title">Description</h2>
              <p className="product-page__description-text">{product.description}</p>
            </div>

            <div className="product-page__qty">
              <span className="product-page__qty-label">Quantity</span>
              <div className="product-page__qty-controls">
                <button
                  type="button"
                  className="product-page__qty-btn"
                  onClick={decQty}
                  disabled={outOfStock || quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="product-page__qty-value">{outOfStock ? 0 : quantity}</span>
                <button
                  type="button"
                  className="product-page__qty-btn"
                  onClick={incQty}
                  disabled={outOfStock || quantity >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="product-page__add-cart"
              onClick={handleAddToCart}
              disabled={outOfStock || adding || mutating}
            >
              <IconCart />
              {outOfStock ? 'Out of stock' : adding ? 'Adding…' : 'Add to Cart'}
            </button>

            {added ? (
              <p className="product-page__added" role="status">
                Added to cart. <Link to={APP_ROUTES.cart}>View cart</Link>
              </p>
            ) : null}

            <details className="product-page__accordion">
              <summary className="product-page__accordion-summary">Расширенное описание</summary>
              <div className="product-page__accordion-body">
                <p className="product-page__accordion-text">{longDescription}</p>
              </div>
            </details>

            {specsText ? (
              <details className="product-page__accordion">
                <summary className="product-page__accordion-summary">Technical Specifications</summary>
                <div className="product-page__accordion-body">
                  {specsText
                    .split('\n')
                    .filter((line) => line.trim().length > 0)
                    .map((line, idx) => (
                      <p key={idx} className="product-page__accordion-text">
                        {line}
                      </p>
                    ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>

        {relatedError && related.length === 0 ? (
          <p className="product-page__related-empty">{relatedError}</p>
        ) : null}

        {related.length > 0 ? (
          <section className="product-page__related">
            <h2 className="product-page__related-title">Related Products</h2>
            <div className="product-page__related-grid">
              {related.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  onAddToCart={() => addToCart(relatedProduct.id, 1)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export const ProductPage = () => {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const data = await fetchProduct(productId, { signal: controller.signal })
        if (!cancelled) setProduct(data)
      } catch (loadError) {
        if (cancelled || loadError?.name === 'AbortError') return
        if (loadError?.status === 404) setNotFound(true)
        else setError(getApiErrorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [productId, reloadToken])

  if (loading && !product) {
    return (
      <div className="product-page product-page--empty">
        <div className="product-page__container">
          <div className="product-page__status" role="status">
            <span className="product-page__spinner" aria-hidden="true" />
            <p className="product-page__empty-text">Loading product…</p>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="product-page product-page--empty">
        <div className="product-page__container">
          <h1 className="product-page__empty-title">Product not found</h1>
          <p className="product-page__empty-text">It may have been removed or the link is incorrect.</p>
          <Link className="product-page__empty-link" to={APP_ROUTES.catalog}>
            Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-page product-page--empty">
        <div className="product-page__container">
          <h1 className="product-page__empty-title">Could not load the product</h1>
          <p className="product-page__empty-text" role="alert">
            {error || 'Something went wrong. Please try again.'}
          </p>
          <div className="product-page__status-actions">
            <button type="button" className="product-page__empty-link" onClick={() => setReloadToken((v) => v + 1)}>
              Try again
            </button>
            <Link className="product-page__empty-link" to={APP_ROUTES.catalog}>
              Back to catalog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <ProductPageContent key={product.id} product={product} />
}
