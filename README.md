# TechStore

Учебный интернет-магазин электроники: React SPA + REST API на Fastify, PostgreSQL, Prisma и Redis.

Проект развивает готовый фронтенд из предыдущих лабораторных работ и добавляет полноценный бэкенд: JWT-аутентификацию, роли, каталог с серверными фильтрами и пагинацией, корзину с промокодами, Redis-кэш каталога, загрузку изображений в Supabase Storage и конфигурацию деплоя в Docker / Koyeb.

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 8 |
| Backend | Node.js 24 LTS, Fastify 5, TypeBox, Swagger / OpenAPI 3 |
| База данных | PostgreSQL 16, Prisma ORM 6 |
| Кэш | Redis 7 (in-memory fallback для тестов) |
| Хранилище | Supabase Storage |
| Деплой | Docker, Docker Compose, Koyeb |
| Авторизация | JWT access + refresh, bcrypt, RBAC (`customer` / `admin`) |

## Возможности

- Регистрация и вход по email/паролю, короткоживущий access-токен и ротация refresh-токенов.
- Роли `customer` и `admin`; админ-панель и защищённые маршруты на фронтенде.
- Каталог: поиск, фильтры по категории, цене и рейтингу, сортировка и пагинация — всё на уровне SQL-запроса.
- Redis-кэш списков товаров, карточек, категорий и related-товаров; инвалидация при создании, изменении и удалении товара.
- Корзина: добавление, изменение количества, удаление, объединение гостевой корзины с серверной после входа.
- Промокоды `SAVE10` (−10%) и `WELCOME5` (−5%), налог 8%, пересчёт итогов на сервере.
- Soft-delete товаров и очистка связанных позиций корзины.
- Админ-CRUD товаров и загрузка изображений в Supabase Storage.
- Восстановление пароля: одноразовая ссылка на 15 минут и две лёгкие HTML-страницы без React-бандла.
- Swagger UI с описанием всех эндпоинтов.

## Структура репозитория

```
.
├── src/                     # React-приложение (FSD: app, pages, widgets, features, entities, shared)
├── server/                  # Fastify API
│   ├── prisma/              # schema.prisma, миграции, seed
│   ├── public/              # forgot-password.html, reset-password.html
│   ├── src/                 # app, config, plugins, modules, lib
│   ├── tests/               # unit-тесты (Vitest)
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── docker-compose.yml       # app + postgres + redis, named volumes
├── .env.example             # переменные для Docker Compose и Vite
└── server/.env.example      # переменные для локального запуска API
```

## Быстрый старт: весь стек в Docker

Требуются Docker Desktop и свободные порты `3000`, `5432`, `6379`.

```bash
cp .env.example .env
docker compose up --build
```

После старта:

- приложение (API + статические страницы): <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs/json>
- healthcheck: <http://localhost:3000/health/live>
- PostgreSQL: `localhost:5432`, Redis: `localhost:6379`

Контейнер `app` при запуске применяет миграции (`prisma migrate deploy`) и выполняет seed (`RUN_SEED=true`). Данные PostgreSQL и Redis сохраняются в named volumes `techstore_postgres_data` и `techstore_redis_data`.

Остановить стек:

```bash
docker compose down
```

Удалить данные вместе с контейнерами:

```bash
docker compose down -v
```

> В Docker-образе API работает от непривилегированного пользователя `node`, используется multi-stage сборка.

## Локальная разработка

### 1. PostgreSQL и Redis

```bash
docker compose up -d postgres redis
```

### 2. API

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

API будет доступен на <http://localhost:3000>, Swagger — на <http://localhost:3000/docs>.

Полезные команды:

```bash
npm run typecheck
npm test
npm run build
npx prisma studio
```

### 3. Frontend

В корне репозитория:

```bash
cp .env.example .env
npm install
npm run dev
```

Vite откроет приложение на <http://localhost:5173>. Переменная `VITE_API_URL` задаёт адрес API (по умолчанию `http://localhost:3000`).

Сборка и проверка:

```bash
npm run lint
npm run build
npm run preview
```

## Переменные окружения

### Корневой `.env` (Docker Compose + Vite)

| Переменная | Назначение | Пример |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Доступы к контейнеру PostgreSQL | `techstore` |
| `NODE_ENV` | Режим Vite; Compose принудительно ставит `production` для API | `development` |
| `DATABASE_URL`, `DIRECT_URL` | Подключение к PostgreSQL | `postgresql://techstore:techstore@localhost:5432/techstore?schema=public` |
| `REDIS_URL` | Подключение к Redis | `redis://localhost:6379` |
| `REDIS_TTL_SECONDS` | TTL кэша каталога, 60–120 секунд по ТЗ | `90` |
| `JWT_SECRET` | Секрет подписи JWT, минимум 16 символов | длинная случайная строка |
| `JWT_EXPIRES_IN` | Время жизни access-токена | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Время жизни refresh-токена | `7` |
| `BCRYPT_ROUNDS` | Стоимость хэширования пароля | `12` |
| `PASSWORD_RESET_TTL_MINUTES` | Время жизни ссылки сброса пароля | `15` |
| `EXPOSE_RESET_TOKEN` | Вернуть reset-токен в ответе (только для локальной разработки) | `false` |
| `CORS_ORIGINS` | Разрешённые origin через запятую | `http://localhost:5173,https://nikita-lomako.github.io` |
| `PUBLIC_API_URL` | Публичный адрес API для Swagger | `http://localhost:3000` |
| `APP_PUBLIC_URL` | Публичный адрес API для ссылок сброса | `http://localhost:3000` |
| `FRONTEND_URL` | Адрес фронтенда для ссылок из писем | `http://localhost:5173` |
| `TAX_RATE` | Ставка налога | `0.08` |
| `RATE_LIMIT_MAX` | Общий лимит запросов в минуту | `200` |
| `SWAGGER_ENABLED` | Включить `/docs` | `true` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Доступ к Supabase Storage | из панели Supabase |
| `SUPABASE_STORAGE_BUCKET` | Публичный bucket для изображений | `product-images` |
| `SMTP_*` | Отправка писем; если пусто, ссылка пишется в лог | — |
| `RUN_SEED` | Выполнять seed при старте контейнера | `true` |
| `VITE_API_URL` | Адрес API для фронтенда | `http://localhost:3000` |

### `server/.env` (локальный API)

Содержит те же серверные переменные. Для Supabase используйте pooler-подключение в `DATABASE_URL` и прямое — в `DIRECT_URL`:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

## API

Полная интерактивная документация — Swagger UI: `/docs`.

| Метод | Эндпоинт | Доступ | Описание |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | Регистрация customer |
| `POST` | `/api/auth/login` | public | Вход, выдача JWT |
| `POST` | `/api/auth/refresh` | public | Ротация refresh-токена |
| `POST` | `/api/auth/logout` | public | Отзыв refresh-токена |
| `GET` | `/api/auth/me` | auth | Текущий пользователь |
| `POST` | `/api/auth/forgot-password` | public | Запрос ссылки сброса |
| `POST` | `/api/auth/reset-password` | public | Установка нового пароля |
| `GET` | `/api/products` | public | Каталог с поиском, фильтрами, сортировкой, пагинацией |
| `GET` | `/api/products/categories` | public | Категории с количеством товаров |
| `GET` | `/api/products/:id` | public | Карточка товара |
| `GET` | `/api/products/:id/related` | public | Похожие товары |
| `POST` | `/api/products` | admin | Создание товара |
| `PATCH` | `/api/products/:id` | admin | Обновление товара |
| `DELETE` | `/api/products/:id` | admin | Soft-delete товара |
| `POST` | `/api/uploads` | admin | Загрузка изображения в Supabase Storage |
| `GET` | `/api/cart` | auth | Корзина с итогами |
| `POST` | `/api/cart/items` | auth | Добавить товар |
| `PATCH` | `/api/cart/items/:id` | auth | Изменить количество |
| `DELETE` | `/api/cart/items/:id` | auth | Удалить позицию |
| `DELETE` | `/api/cart` | auth | Очистить корзину |
| `POST` | `/api/cart/apply-promo` | auth | Применить промокод |
| `DELETE` | `/api/cart/promo` | auth | Убрать промокод |
| `POST` | `/api/cart/merge` | auth | Объединить гостевую корзину с серверной |
| `GET` | `/health/live` | public | Проверка живости |

### Параметры каталога

`GET /api/products` принимает:

- `page` — номер страницы (по умолчанию `1`);
- `limit` — размер страницы, до `100` (по умолчанию `12`);
- `search` — поиск по названию и описанию (`ILIKE` на уровне БД);
- `category` — точное совпадение без учёта регистра;
- `min_price`, `max_price` — диапазон цены;
- `min_rating` — минимальный рейтинг;
- `sort_by` — `price`, `title`, `rating`, `created_at`;
- `order` — `asc` или `desc`.

Ответ:

```json
{
  "items": [],
  "meta": {
    "total_items": 12,
    "total_pages": 1,
    "current_page": 1,
    "limit": 12
  }
}
```

### Кэширование

Ключи каталога строятся по нормализованной query-строке: `products:list:v1:<sha256>`. Дополнительно кэшируются карточка товара, related-товары и категории. TTL — `REDIS_TTL_SECONDS` (60–120 секунд). Любое изменение каталога администратором удаляет все ключи с префиксом `products:`.

Ответы каталога содержат заголовок `X-Cache: HIT | MISS` и `X-Cache-TTL` — удобно проверять кэш через `curl`.

```bash
curl -i "http://localhost:3000/api/products?page=1&limit=4&sort_by=price&order=asc"
```

### Демо-данные

После seed доступны:

| Роль | Email | Пароль |
| --- | --- | --- |
| Admin | `admin@techstore.local` | `Admin123!` |
| Customer | `customer@techstore.local` | `Customer123!` |

Промокоды: `SAVE10` (−10%), `WELCOME5` (−5%).

## Восстановление пароля

1. Пользователь открывает `/forgot-password` на домене API.
2. API создаёт одноразовый токен на 15 минут (в БД хранится только SHA-256 хэш) и отправляет ссылку.
3. Если SMTP не настроен, ссылка пишется в лог сервера.
4. `/reset-password?token=...` — лёгкая HTML-страница без React; после смены пароля токен становится недействительным.
5. Для локальной отладки можно включить `EXPOSE_RESET_TOKEN=true` — тогда токен возвращается в JSON-ответе `forgot-password`.

## Supabase

1. Создайте проект в Supabase.
2. Возьмите `DATABASE_URL` (pooler, порт `6543`) и `DIRECT_URL` (порт `5432`) из раздела **Database → Connection string**.
3. Создайте публичный bucket `product-images` (**Storage → New bucket → Public**).
4. Заполните `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
5. Примените миграции: `cd server && npx prisma migrate deploy`.

Без Supabase приложение работает, но загрузка изображений из админ-панели вернёт `503 STORAGE_NOT_CONFIGURED`. Товары можно создавать с внешними URL изображений.

## Деплой

### Koyeb (API)

Репозиторий содержит готовый `server/Dockerfile`. В Koyeb:

1. **Create Service → GitHub** и выберите репозиторий.
2. Builder: **Dockerfile**, Dockerfile path: `server/Dockerfile`, context: `server`.
3. Port: `3000`, protocol HTTP, healthcheck path `/health/live`.
4. Добавьте переменные окружения из `server/.env.example`:
   - `DATABASE_URL`, `DIRECT_URL` — Supabase;
   - `REDIS_URL` — Upstash Redis или другой managed Redis;
   - `JWT_SECRET`, `PUBLIC_API_URL` (URL сервиса Koyeb), `FRONTEND_URL`;
   - `CORS_ORIGINS` — домен фронтенда;
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`;
   - `RUN_MIGRATIONS=true`, `RUN_SEED=false` (после первого запуска).
5. Задеплойте сервис. Entrypoint применит миграции и запустит API.

После деплоя Swagger будет доступен по адресу `https://<your-service>.koyeb.app/docs`, OpenAPI — `https://<your-service>.koyeb.app/docs/json`.

### GitHub Pages (frontend)

```bash
VITE_API_URL=https://<your-service>.koyeb.app npm run deploy
```

`npm run deploy` собирает приложение и публикует `dist` в ветку `gh-pages`. Приложение использует `HashRouter`, поэтому прямые ссылки работают на статическом хостинге. Не забудьте добавить домен Pages в `CORS_ORIGINS` на API.

## Git Flow

История оформлена по Git Flow с датами коммитов 12–22 октября 2026:

- `master` — стабильные релизы;
- `develop` — интеграционная ветка;
- `feature/auth` — JWT, роли, восстановление пароля;
- `feature/products-cache` — каталог, админ-CRUD, Redis-кэш;
- `feature/cart` — корзина, промокоды, объединение гостевой корзины;
- сообщения коммитов — [Conventional Commits](https://www.conventionalcommits.org/).

## Тесты и качество

```bash
# backend
cd server
npm test
npm run typecheck
npm run build

# frontend
npm run lint
npm run build
```

Unit-тесты покрывают нормализацию query-параметров, кэш-ключи, расчёт корзины и промокодов, работу с токенами.

## Ограничения

- Оформление заказа (checkout) и платежи не входят в вариант задания — кнопка checkout является заглушкой.
- Реальный деплой Supabase / Koyeb не выполнялся: подготовлены Dockerfile, Compose, примеры окружения и инструкции.
- Загрузка изображений требует настроенного Supabase Storage.
- SMTP не обязателен: без него ссылка восстановления пароля выводится в лог.
