import { useMemo, useState } from 'react'
import { productsMock } from '../../../shared/api/mock/products.js'
import { ProductCard } from '../../../entities/product/ui/ProductCard.jsx'
import './CatalogPage.css'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

const PRICE_MAX = 3000

const IconSliders = () => (
  <svg className="catalog-toolbar__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 2v4M8 10v4M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconChevronDown = () => (
  <svg className="catalog-sort__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function FilterBlock({ idPrefix, priceMin, priceMax, ratingChecks, onPriceMin, onPriceMax, onRatingToggle, onClear }) {
  return (
    <div className="catalog-filters__inner">
      <h2 className="catalog-filters__title">
        <IconSliders />
        Filters
      </h2>

      <div className="catalog-filters__section">
        <h3 className="catalog-filters__subtitle">Rating</h3>
        <div className="catalog-filters__checks">
          {[5, 4, 3].map((level) => (
            <div key={level} className="catalog-filters__check-row">
              <input
                type="checkbox"
                id={`${idPrefix}rating-${level}`}
                className="catalog-filters__checkbox"
                checked={ratingChecks[level]}
                onChange={() => onRatingToggle(level)}
              />
              <label htmlFor={`${idPrefix}rating-${level}`} className="catalog-filters__check-label">
                {level}+ Stars
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="catalog-filters__section">
        <h3 className="catalog-filters__subtitle">Price Range</h3>
        <div className="catalog-filters__price-sliders">
          <label className="catalog-filters__range-label" htmlFor={`${idPrefix}price-min-range`}>
            Minimum
          </label>
          <input
            id={`${idPrefix}price-min-range`}
            type="range"
            min={0}
            max={PRICE_MAX}
            value={priceMin}
            className="catalog-filters__range"
            aria-label="Minimum price"
            onChange={(e) => {
              const v = Number(e.target.value)
              onPriceMin(Math.min(v, priceMax))
            }}
          />
          <label className="catalog-filters__range-label catalog-filters__range-label--spaced" htmlFor={`${idPrefix}price-max-range`}>
            Maximum
          </label>
          <input
            id={`${idPrefix}price-max-range`}
            type="range"
            min={0}
            max={PRICE_MAX}
            value={priceMax}
            className="catalog-filters__range"
            aria-label="Maximum price"
            onChange={(e) => {
              const v = Number(e.target.value)
              onPriceMax(Math.max(v, priceMin))
            }}
          />
        </div>
        <div className="catalog-filters__price-labels">
          <span>${priceMin}</span>
          <span>${priceMax}</span>
        </div>
      </div>

      <button type="button" className="catalog-filters__clear" onClick={onClear}>
        Clear All Filters
      </button>
    </div>
  )
}

export const CatalogPage = () => {
  const [sortBy, setSortBy] = useState('name-asc')
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(PRICE_MAX)
  const [ratingChecks, setRatingChecks] = useState({ 5: false, 4: false, 3: false })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const visibleProducts = useMemo(() => {
    let list = [...productsMock]

    const activeRatings = Object.entries(ratingChecks)
      .filter(([, on]) => on)
      .map(([k]) => Number(k))
    if (activeRatings.length > 0) {
      const threshold = Math.min(...activeRatings)
      list = list.filter((p) => p.rating >= threshold)
    }

    list = list.filter((p) => p.price >= priceMin && p.price <= priceMax)

    switch (sortBy) {
      case 'name-asc':
        list.sort((a, b) => a.title.localeCompare(b.title, 'en'))
        break
      case 'name-desc':
        list.sort((a, b) => b.title.localeCompare(a.title, 'en'))
        break
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      default:
        break
    }

    return list
  }, [sortBy, priceMin, priceMax, ratingChecks])

  const toggleRating = (level) => {
    setRatingChecks((prev) => ({ ...prev, [level]: !prev[level] }))
  }

  const clearFilters = () => {
    setPriceMin(0)
    setPriceMax(PRICE_MAX)
    setRatingChecks({ 5: false, 4: false, 3: false })
  }

  const closeMobileFilters = () => setMobileFiltersOpen(false)

  return (
    <div className="catalog-page">
      <div className="catalog-page__container">
        <div className="catalog-page__intro">
          <h1 className="catalog-page__heading">Premium Electronics</h1>
          <p className="catalog-page__subheading">Discover our curated collection of high-quality tech products</p>
        </div>

        <div className="catalog-toolbar">
          <div className="catalog-toolbar__left">
            <button
              type="button"
              className="catalog-toolbar__filters-btn"
              onClick={() => setMobileFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={mobileFiltersOpen}
            >
              <IconSliders />
              Filters
            </button>
            <p className="catalog-toolbar__count">
              {visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="catalog-toolbar__sort">
            <span className="catalog-toolbar__sort-label">Sort by:</span>
            <div className="catalog-sort">
              <select
                className="catalog-sort__select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <IconChevronDown />
            </div>
          </div>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-filters catalog-filters--desktop" aria-label="Product filters">
            <div className="catalog-filters__card">
              <FilterBlock
                idPrefix="d-"
                priceMin={priceMin}
                priceMax={priceMax}
                ratingChecks={ratingChecks}
                onPriceMin={setPriceMin}
                onPriceMax={setPriceMax}
                onRatingToggle={toggleRating}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <div className="catalog-grid-wrap">
            <div className="catalog-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {mobileFiltersOpen ? (
        <div className="catalog-sheet" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="catalog-sheet__backdrop" aria-label="Close filters" onClick={closeMobileFilters} />
          <div className="catalog-sheet__panel">
            <div className="catalog-sheet__head">
              <h2 className="catalog-sheet__title">Filters</h2>
              <button type="button" className="catalog-sheet__close" onClick={closeMobileFilters}>
                Close
              </button>
            </div>
            <div className="catalog-sheet__body">
              <FilterBlock
                idPrefix="m-"
                priceMin={priceMin}
                priceMax={priceMax}
                ratingChecks={ratingChecks}
                onPriceMin={setPriceMin}
                onPriceMax={setPriceMax}
                onRatingToggle={toggleRating}
                onClear={clearFilters}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
