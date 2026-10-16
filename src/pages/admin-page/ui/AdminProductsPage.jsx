import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  uploadProductImage,
} from '../../../shared/api/products.js'
import './AdminPage.css'

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  description: '',
  longDescription: '',
  price: '',
  rating: '',
  category: '',
  images: '',
  stockQuantity: '',
  reviewCount: '',
  specifications: '',
  freeShipping: false,
}

const toFormState = (product) => ({
  title: product.title,
  subtitle: product.subtitle ?? '',
  description: product.description,
  longDescription: product.longDescription ?? '',
  price: String(product.price),
  rating: String(product.rating),
  category: product.category ?? '',
  images: product.images.join('\n'),
  stockQuantity: String(product.stockQuantity),
  reviewCount: String(product.reviewCount),
  specifications: product.specifications ?? '',
  freeShipping: product.freeShipping,
})

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const AdminProductsPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchProducts({
        limit: 100,
        page: 1,
        sort_by: 'created_at',
        order: 'desc',
      })
      setProducts(data.items)
    } catch (loadError) {
      setError(loadError?.message || 'Не удалось загрузить товары.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    const images = form.images
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!form.title.trim()) throw new Error('Укажите название товара.')
    if (!form.description.trim()) throw new Error('Укажите краткое описание.')
    if (!form.category.trim()) throw new Error('Укажите категорию.')
    if (images.length < 3) throw new Error('Нужно минимум 3 изображения (по одному URL в строке).')

    const price = Number(form.price)
    const stockQuantity = Number(form.stockQuantity)
    const rating = form.rating === '' ? 0 : Number(form.rating)
    const reviewCount = form.reviewCount === '' ? 0 : Number(form.reviewCount)

    if (!Number.isFinite(price) || price < 0) throw new Error('Некорректная цена.')
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error('Количество на складе должно быть целым неотрицательным числом.')
    }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      throw new Error('Рейтинг должен быть от 0 до 5.')
    }
    if (!Number.isInteger(reviewCount) || reviewCount < 0) {
      throw new Error('Число отзывов должно быть целым неотрицательным числом.')
    }

    return {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim(),
      longDescription: form.longDescription.trim() || undefined,
      price,
      rating,
      category: form.category.trim(),
      images,
      stockQuantity,
      reviewCount,
      specifications: form.specifications.trim() || undefined,
      freeShipping: Boolean(form.freeShipping),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    let payload
    try {
      payload = buildPayload()
    } catch (validationError) {
      setError(validationError.message)
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        setNotice('Товар обновлён. Кэш каталога сброшен.')
      } else {
        await createProduct(payload)
        setNotice('Товар создан. Кэш каталога сброшен.')
      }
      resetForm()
      await loadProducts()
    } catch (saveError) {
      setError(saveError?.message || 'Не удалось сохранить товар.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setForm(toFormState(product))
    setError(null)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Удалить товар «${product.title}»?`)
    if (!confirmed) return

    setError(null)
    setNotice(null)
    try {
      await deleteProduct(product.id)
      setNotice('Товар удалён (soft-delete). Кэш каталога сброшен.')
      if (editingId === product.id) resetForm()
      await loadProducts()
    } catch (deleteError) {
      setError(deleteError?.message || 'Не удалось удалить товар.')
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadProductImage(file)
      setForm((prev) => ({
        ...prev,
        images: [prev.images.trim(), uploaded.url].filter(Boolean).join('\n'),
      }))
      setNotice('Изображение загружено в Supabase Storage.')
    } catch (uploadError) {
      setError(
        uploadError?.message ||
          'Не удалось загрузить изображение. Проверьте настройки Supabase Storage.',
      )
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const imagesPreview = useMemo(
    () =>
      form.images
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6),
    [form.images],
  )

  return (
    <div className="admin-page">
      <div className="admin-page__container">
        <div className="admin-page__head">
          <div>
            <p className="admin-page__eyebrow">Admin</p>
            <h1 className="admin-page__title">Управление товарами</h1>
            <p className="admin-page__lead">
              Создание, редактирование и удаление товаров. После каждого изменения кэш
              каталога в Redis инвалидируется.
            </p>
          </div>
          <Link className="admin-page__back" to={APP_ROUTES.catalog}>
            ← В каталог
          </Link>
        </div>

        {error ? (
          <div className="admin-alert admin-alert--error" role="alert">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="admin-alert admin-alert--ok" role="status">
            {notice}
          </div>
        ) : null}

        <div className="admin-layout">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2 className="admin-card__title">
                {editingId ? 'Редактировать товар' : 'Новый товар'}
              </h2>
              {editingId ? (
                <button className="admin-card__cancel" type="button" onClick={resetForm}>
                  Отмена
                </button>
              ) : null}
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <label className="admin-form__field admin-form__field--wide">
                <span>Название *</span>
                <input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  maxLength={200}
                  required
                />
              </label>

              <label className="admin-form__field">
                <span>Подзаголовок</span>
                <input
                  value={form.subtitle}
                  onChange={(event) => updateField('subtitle', event.target.value)}
                  maxLength={250}
                />
              </label>

              <label className="admin-form__field">
                <span>Категория *</span>
                <input
                  value={form.category}
                  onChange={(event) => updateField('category', event.target.value)}
                  maxLength={100}
                  placeholder="Audio"
                  required
                />
              </label>

              <label className="admin-form__field admin-form__field--wide">
                <span>Краткое описание *</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={3}
                  maxLength={5000}
                  required
                />
              </label>

              <label className="admin-form__field admin-form__field--wide">
                <span>Расширенное описание</span>
                <textarea
                  value={form.longDescription}
                  onChange={(event) => updateField('longDescription', event.target.value)}
                  rows={3}
                />
              </label>

              <label className="admin-form__field">
                <span>Цена, USD *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  required
                />
              </label>

              <label className="admin-form__field">
                <span>Рейтинг (0–5)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) => updateField('rating', event.target.value)}
                />
              </label>

              <label className="admin-form__field">
                <span>На складе *</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQuantity}
                  onChange={(event) => updateField('stockQuantity', event.target.value)}
                  required
                />
              </label>

              <label className="admin-form__field">
                <span>Количество отзывов</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.reviewCount}
                  onChange={(event) => updateField('reviewCount', event.target.value)}
                />
              </label>

              <label className="admin-form__field admin-form__field--wide">
                <span>Изображения * (по одному URL в строке, минимум 3)</span>
                <textarea
                  value={form.images}
                  onChange={(event) => updateField('images', event.target.value)}
                  rows={4}
                  placeholder="https://.../image-1.jpg"
                />
              </label>

              <div className="admin-form__upload">
                <label className="admin-form__upload-btn">
                  {uploading ? 'Загрузка…' : 'Загрузить файл в Supabase Storage'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
                {imagesPreview.length > 0 ? (
                  <div className="admin-form__previews">
                    {imagesPreview.map((src) => (
                      <img key={src} src={src} alt="" />
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="admin-form__field admin-form__field--wide">
                <span>Технические характеристики (каждая строка отдельно)</span>
                <textarea
                  value={form.specifications}
                  onChange={(event) => updateField('specifications', event.target.value)}
                  rows={4}
                />
              </label>

              <label className="admin-form__checkbox">
                <input
                  type="checkbox"
                  checked={form.freeShipping}
                  onChange={(event) => updateField('freeShipping', event.target.checked)}
                />
                <span>Бесплатная доставка</span>
              </label>

              <button className="admin-form__submit" type="submit" disabled={saving}>
                {saving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Создать товар'}
              </button>
            </form>
          </section>

          <section className="admin-card admin-card--list">
            <div className="admin-card__head">
              <h2 className="admin-card__title">Каталог ({products.length})</h2>
              <button
                className="admin-card__cancel"
                type="button"
                onClick={loadProducts}
                disabled={loading}
              >
                Обновить
              </button>
            </div>

            {loading ? (
              <p className="admin-list__status">Загружаем товары…</p>
            ) : products.length === 0 ? (
              <p className="admin-list__status">Товаров пока нет.</p>
            ) : (
              <div className="admin-list">
                {products.map((product) => (
                  <article key={product.id} className="admin-row">
                    <img className="admin-row__thumb" src={product.image} alt="" />
                    <div className="admin-row__body">
                      <Link className="admin-row__title" to={`/product/${product.id}`}>
                        {product.title}
                      </Link>
                      <p className="admin-row__meta">
                        {product.category} · {formatPrice(product.price)} · склад:{' '}
                        {product.stockQuantity}
                      </p>
                    </div>
                    <div className="admin-row__actions">
                      <button type="button" onClick={() => handleEdit(product)}>
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="admin-row__delete"
                        onClick={() => handleDelete(product)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
