import { Link } from 'react-router-dom'
import { getCategoryTiles } from '../../../shared/api/mock/products.js'
import './CategoriesPage.css'

const thumbUrl = (url) => (url.includes('?') ? `${url}&w=400` : `${url}?w=400`)

export const CategoriesPage = () => {
  const tiles = getCategoryTiles()

  return (
    <div className="categories-page">
      <div className="categories-page__container">
        <h1 className="categories-page__title">Product Categories</h1>
        <p className="categories-page__lead">Browse our wide selection of premium electronics by category</p>

        <div className="categories-page__grid">
          {tiles.map((tile) => (
            <Link
              key={tile.name}
              className="categories-card"
              to={`/?category=${encodeURIComponent(tile.name)}`}
            >
              <img
                className="categories-card__img"
                src={thumbUrl(tile.image)}
                alt={tile.name}
                loading="lazy"
              />
              <div className="categories-card__overlay">
                <div className="categories-card__text">
                  <h3 className="categories-card__name">{tile.name}</h3>
                  <p className="categories-card__count">
                    {tile.count} product{tile.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
