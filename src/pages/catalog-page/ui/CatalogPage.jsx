import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../../../features/cart/index.js'
import { getApiErrorMessage } from '../../../shared/api/client.js'
import { fetchProducts } from '../../../shared/api/products.js'
import { useDebouncedValue } from '../../../shared/lib/useDebouncedValue.js'
import { ProductCard } from '../../../entities/product/ui/ProductCard.jsx'
import './CatalogPage.css'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)', sortBy: 'title', order: 'asc' },
  { value: 'name-desc', label: 'Name (Z-A)', sortBy: 'title', order: 'desc' },
  { value: 'price-asc', label: 'Price: Low to High', sortBy: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', sortBy: 'price', order: 'desc' },
  { value: 'rating-desc', label: 'Rating: High to Low', sortBy: 'rating', order: 'desc' },
]

const PRICE_MAX = 3000
const PAGE_LIMIT = 12

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

const IconSearch = () => (
  <svg className="catalog-search__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const buildPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.min(Math.max(1, currentPage - 2), totalPages - 4)
  return Array.from({ length: 5 }, (_, index) => start + index)
}

export const CatalogPage = () => {
  const { addToCart } = useCart()
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') || ''

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(PRICE_MAX)
  const [ratingChecks, setRatingChecks] = useState({ 5: false, 4: false, 3: false })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total_items: 0, total_pages: 0, current_page: 1, limit: PAGE_LIMIT })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const debouncedSearch = useDebouncedValue(search.trim(), 350)
  const debouncedPriceMin = useDebouncedValue(priceMin, 400)
  const debouncedPriceMax = useDebouncedValue(priceMax, 400)

  const minRating = useMemo(() => {
    const activeRatings = Object.entries(ratingChecks)
      .filter(([, on]) => on)
      .map(([level]) => Number(level))
    return activeRatings.length > 0 ? Math.min(...activeRatings) : undefined
  }, [ratingChecks])

  const filtersKey = [
    debouncedSearch,
    debouncedPriceMin,
    debouncedPriceMax,
    minRating ?? '',
    sortBy,
    categoryFilter,
  ].join('|')

  // Fetch from the API whenever filters, sorting or the page changes.
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const sort = SORT_OPTIONS.find((option) => option.value === sortBy) ?? SORT_OPTIONS[0]

      try {
        const data = await fetchProducts(
          {
            page,
            limit: PAGE_LIMIT,
            search: debouncedSearch || undefined,
            category: categoryFilter || undefined,
            min_price: debouncedPriceMin > 0 ? debouncedPriceMin : undefined,
            max_price: debouncedPriceMax < PRICE_MAX ? debouncedPriceMax : undefined,
            min_rating: minRating,
            sort_by: sort.sortBy,
            order: sort.order,
          },
          { signal: controller.signal },
        )

        if (cancelled) return
        setItems(data.items)
        setMeta(data.meta)
      } catch (loadError) {
        if (cancelled || loadError?.name === 'AbortError') return
        setError(getApiErrorMessage(loadError))
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [page, debouncedSearch, debouncedPriceMin, debouncedPriceMax, minRating, sortBy, categoryFilter, reloadToken])

  // A new filter combination always starts from the first page.
  useEffect(() => {
    setPage(1)
  }, [filtersKey])

  const toggleRating = (level) => {
    setRatingChecks((prev) => ({ ...prev, [level]: !prev[level] }))
  }

  const clearFilters = () => {
    setSearch('')
    setPriceMin(0)
    setPriceMax(PRICE_MAX)
    setRatingChecks({ 5: false, 4: false, 3: false })
  }

  const closeMobileFilters = () => setMobileFiltersOpen(false)
  const hasActiveFilters = Boolean(search.trim()) || priceMin > 0 || priceMax < PRICE_MAX || Boolean(minRating)
  const pageNumbers = buildPageNumbers(meta.current_page, meta.total_pages)

  return (
    <div className="catalog-page">
      <div className="catalog-page__container">
        <div className="catalog-page__intro">
          <h1 className="catalog-page__heading">Premium Electronics</h1>
          <p className="catalog-page__subheading">Discover our curated collection of high-quality tech products</p>
          {categoryFilter ? (
            <p className="catalog-page__category-filter">
              Category: <strong>{categoryFilter}</strong>
              <Link className="catalog-page__category-clear" to="/">
                Show all products
              </Link>
            </p>
          ) : null}
        </div>

        <div className="catalog-search">
          <IconSearch />
          <input
            type="search"
            className="catalog-search__input"
            placeholder="Search products by name or description…"
            aria-label="Search products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button type="button" className="catalog-search__clear" onClick={() => setSearch('')}>
              Clear
            </button>
          ) : null}
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
            <p className="catalog-toolbar__count" aria-live="polite">
              {loading && items.length === 0
                ? 'Loading products…'
                : `${meta.total_items} product${meta.total_items === 1 ? '' : 's'}`}
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
            {error ? (
              <div className="catalog-status catalog-status--error" role="alert">
                <p className="catalog-status__text">{error}</p>
                <button
                  type="button"
                  className="catalog-status__action"
                  onClick={() => setReloadToken((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {!error && loading && items.length === 0 ? (
              <div className="catalog-status" role="status">
                <span className="catalog-status__spinner" aria-hidden="true" />
                <p className="catalog-status__text">Loading products…</p>
              </div>
            ) : null}

            {!error && !loading && items.length === 0 ? (
              <div className="catalog-status">
                <p className="catalog-status__title">No products found</p>
                <p className="catalog-status__text">
                  {hasActiveFilters || categoryFilter
                    ? 'Try changing the search text or clearing the filters.'
                    : 'The catalog is empty right now. Please check back later.'}
                </p>
                {hasActiveFilters ? (
                  <button type="button" className="catalog-status__action" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
                {categoryFilter ? (
                  <Link className="catalog-status__action" to="/">
                    Show all products
                  </Link>
                ) : null}
              </div>
            ) : null}

            {items.length > 0 ? (
              <>
                <div className={`catalog-grid${loading ? ' catalog-grid--loading' : ''}`} aria-busy={loading}>
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={() => addToCart(product.id, 1)} />
                  ))}
                </div>

                {meta.total_pages > 1 ? (
                  <nav className="catalog-pagination" aria-label="Catalog pages">
                    <button
                      type="button"
                      className="catalog-pagination__btn"
                      disabled={meta.current_page <= 1 || loading}
                      onClick={() => {
                        setPage((value) => Math.max(1, value - 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      Previous
                    </button>

                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`catalog-pagination__btn${
                          pageNumber === meta.current_page ? ' catalog-pagination__btn--active' : ''
                        }`}
                        aria-current={pageNumber === meta.current_page ? 'page' : undefined}
                        disabled={loading}
                        onClick={() => {
                          setPage(pageNumber)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="catalog-pagination__btn"
                      disabled={meta.current_page >= meta.total_pages || loading}
                      onClick={() => {
                        setPage((value) => Math.min(meta.total_pages, value + 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      Next
                    </button>
                  </nav>
                ) : null}
              </>
            ) : null}
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
