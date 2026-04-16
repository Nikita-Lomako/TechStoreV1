import './ProductRating.css'

const StarFull = () => (
  <svg className="product-rating__star product-rating__star--full" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </svg>
)

const StarHalf = () => (
  <svg className="product-rating__star product-rating__star--half" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 18.338a2.1 2.1 0 0 0-.987.244L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16l2.309-4.679A.53.53 0 0 1 12 2" />
  </svg>
)

const StarEmpty = () => (
  <svg className="product-rating__star product-rating__star--empty" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </svg>
)

export const ProductRating = ({ rating, showValue = true, size = 'default' }) => {
  const stars = []
  for (let i = 1; i <= 5; i += 1) {
    if (rating >= i) {
      stars.push(<StarFull key={i} />)
    } else if (rating >= i - 0.5) {
      stars.push(<StarHalf key={i} />)
    } else {
      stars.push(<StarEmpty key={i} />)
    }
  }

  const rootClass = size === 'lg' ? 'product-rating product-rating--lg' : 'product-rating'

  return (
    <div className={rootClass}>
      <div className="product-rating__stars">{stars}</div>
      {showValue ? (
        <span className="product-rating__value">
          ({Number.isInteger(rating) ? rating : rating.toFixed(1)})
        </span>
      ) : null}
    </div>
  )
}
