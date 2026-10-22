import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../../shared/api/client.js'
import { fetchCategories } from '../../../shared/api/products.js'
import './CategoriesPage.css'

const thumbUrl = (url) => (url.includes('?') ? `${url}&w=400` : `${url}?w=400`)

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchCategories({ signal: controller.signal })
        if (!cancelled) setCategories(data)
      } catch (loadError) {
        if (cancelled || loadError?.name === 'AbortError') return
        setError(getApiErrorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [reloadToken])

  return (
    <div className="categories-page">
      <div className="categories-page__container">
        <h1 className="categories-page__title">Product Categories</h1>
        <p className="categories-page__lead">Browse our wide selection of premium electronics by category</p>

        {error ? (
          <div className="categories-page__status categories-page__status--error" role="alert">
            <p className="categories-page__status-text">{error}</p>
            <button type="button" className="categories-page__status-btn" onClick={() => setReloadToken((v) => v + 1)}>
              Try again
            </button>
          </div>
        ) : null}

        {!error && loading ? (
          <div className="categories-page__status" role="status">
            <span className="categories-page__spinner" aria-hidden="true" />
            <p className="categories-page__status-text">Loading categories…</p>
          </div>
        ) : null}

        {!error && !loading && categories.length === 0 ? (
          <div className="categories-page__status">
            <p className="categories-page__status-text">No categories available yet.</p>
            <Link className="categories-page__status-btn" to="/">
              Browse all products
            </Link>
          </div>
        ) : null}

        {categories.length > 0 ? (
          <div className="categories-page__grid">
            {categories.map((tile) => (
              <Link
                key={tile.name}
                className="categories-card"
                to={`/?category=${encodeURIComponent(tile.name)}`}
              >
                {tile.image ? (
                  <img
                    className="categories-card__img"
                    src={thumbUrl(tile.image)}
                    alt={tile.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="categories-card__placeholder" aria-hidden="true">
                    {tile.name.slice(0, 1)}
                  </div>
                )}
                <div className="categories-card__overlay">
                  <div className="categories-card__text">
                    <h2 className="categories-card__name">{tile.name}</h2>
                    <p className="categories-card__count">
                      {tile.count} product{tile.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
