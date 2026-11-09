# 02. Архитектура: кто кого вызывает и почему

## 1. Взгляд сверху

Проект состоит из четырёх исполняемых частей и двух внешних сервисов.

```text
┌──────────────────────────────┐
│ Браузер                      │
│ React SPA + HashRouter       │
│ localStorage: токены, корзина│
└──────────────┬───────────────┘
               │ HTTPS, JSON, Bearer JWT
               ▼
┌──────────────────────────────┐        ┌──────────────────────┐
│ Fastify API (Docker/Render)   │───────►│ PostgreSQL           │
│ routes → services → lib      │ Prisma │ users, products, ... │
│                              │        └──────────────────────┘
│                              │        ┌──────────────────────┐
│                              │───────►│ Redis                │
│                              │ioredis │ кэш каталога, TTL 90с│
│                              │        └──────────────────────┘
│                              │        ┌──────────────────────┐
│                              │───────►│ Supabase Storage     │
│                              │ fetch  │ product-images       │
│                              │        └──────────────────────┘
│                              │        ┌──────────────────────┐
│                              │───────►│ SMTP (опционально)   │
└──────────────────────────────┘nodemail│ письма сброса пароля │
                                        └──────────────────────┘
```

**Почему так.** Браузер не имеет доступа к БД и секретам. API — единственная точка, где проверяются права и бизнес-правила. PostgreSQL хранит истину, Redis — только ускоритель, Storage — только файлы. Любую часть можно заменить/масштабировать отдельно.

## 2. Frontend: слои и направления зависимостей

```text
src/app
  ├── App.jsx
  ├── providers/router/AppRouterProvider.jsx
  │     HashRouter → AuthProvider → CartProvider → AppRoutes
  └── providers/router/AppRoutes.jsx
        │
        ├── src/pages/*          (Catalog, Product, Cart, Login, Admin...)
        ├── src/widgets/*        (Header, Footer)
        ├── src/features/*       (auth, cart: контекст + действия)
        ├── src/entities/*       (ProductCard, ProductRating)
        └── src/shared/*         (api, config, lib, storage)
```

Правило FSD: верхний слой может импортировать нижний, но не наоборот. Страница может использовать `features/cart`, а `shared/api` не должен импортировать страницу. Это предотвращает циклические зависимости.

### 2.1. Точка входа

1. `index.html` содержит `<div id="root">`.
2. `src/main.jsx` вызывает `createRoot(...).render(<App />)` в `StrictMode`.
3. `App` возвращает `AppRouterProvider`.
4. `AppRouterProvider` создаёт `HashRouter`, затем `AuthProvider`, затем `CartProvider`, затем `AppRoutes`.
5. `AppRoutes` рисует `Header`, `<Routes>` и `Footer`.

Порядок провайдеров не случаен: `CartProvider` вызывает `useAuth()`, поэтому должен быть внутри `AuthProvider`.

### 2.2. Слои ответственности

| Слой | Что делает | Чего не делает |
| --- | --- | --- |
| `pages` | Композиция UI, локальное состояние страницы, загрузка данных | Не хранит глобальную сессию, не знает SQL |
| `widgets` | Header/Footer, навигация, badge корзины | Не содержит бизнес-правил корзины |
| `features/auth` | Восстановление сессии, login/register/logout, `useAuth` | Не рисует страницы |
| `features/cart` | Гостевая/серверная корзина, merge, промо, итоги | Не занимается товарами каталога |
| `entities` | Карточка товара, рейтинг | Не ходит в API |
| `shared/api` | fetch-обёртка, токены, refresh, endpoints | Не знает о React |
| `shared/lib` | debounce, localStorage, утилиты | Не знает о бизнес-смыслах |

### 2.3. Поток данных на фронтенде

```text
Пользователь нажал «Add to cart»
        │
        ▼
ProductCard / ProductPage
        │ useCart().addToCart(productId, qty)
        ▼
CartProvider
        ├── не авторизован → обновить guestItems → useEffect сохранит в localStorage
        └── авторизован   → enqueueMutation → shared/api/cart.addCartItem
                                              │
                                              ▼
                                        POST /api/cart/items
                                              │
                                              ▼
                                        сервер вернул всю корзину
                                              │
                                              ▼
                                        setServerCart(cart) → ререндер Header/CartPage
```

Ключевая идея: **сервер возвращает корзину целиком** после каждой мутации. Клиент не пересчитывает итоги для авторизованного пользователя — он доверяет серверу.

### 2.4. Восстановление сессии при загрузке

```text
AuthProvider mount
  ├── нет токенов → initializing=false, user=null
  └── есть токены
        → GET /api/auth/me
            ├── 200 → user
            └── 401 → client пытается refresh
                  ├── refresh ok → повтор /me → user
                  └── refresh fail → очистить токены → user=null
```

Пока `initializing=true`, guard показывает «Проверяем сессию…» и не редиректит раньше времени.

### 2.5. Обновление access-токена

`src/shared/api/client.js`:

- каждый запрос с `auth: true` добавляет `Authorization: Bearer <access>`;
- если пришёл `401` и есть refresh, вызывается `refreshAccessToken()`;
- одновременно может быть много запросов, поэтому `refreshPromise` играет роль «замка»: все ждут один и тот же refresh, а не делают пять параллельных;
- после успеха исходный запрос повторяется один раз (`retry: false`);
- при неудаче токены очищаются, выбрасывается событие `SESSION_EXPIRED_EVENT`, `AuthProvider` сбрасывает пользователя.

## 3. Backend: слои и файлы

```text
server/src
├── server.ts              запуск, SIGINT/SIGTERM, подключение Prisma
├── app.ts                 сборка Fastify, плагины, error handler, Swagger
├── routes.ts              регистрация модулей
├── config/env.ts          Zod-валидация env, fail-fast
├── plugins/auth.ts        authenticate, requireAdmin
├── lib/
│   ├── prisma.ts          singleton PrismaClient
│   ├── cache.ts           Redis + memory fallback
│   ├── errors.ts          AppError, единый формат ошибок
│   ├── money.ts           округление и итоги корзины
│   ├── tokens.ts          randomBytes + SHA-256
│   ├── mailer.ts          nodemailer / лог ссылки
│   └── schemas.ts         общие TypeBox-схемы
└── modules/
    ├── auth/      routes.ts, schemas.ts, service.ts
    ├── products/  routes.ts, schemas.ts, service.ts, cache.ts
    ├── cart/      routes.ts, schemas.ts, service.ts
    ├── uploads/   routes.ts
    └── health/    routes.ts
```

### 3.1. Кто кого вызывает

```text
HTTP request
   │
   ▼
Fastify router
   │  находит маршрут по методу + URL
   ▼
Schema validation (TypeBox / Ajv)
   │  невалидно → 400 VALIDATION_ERROR (error handler)
   ▼
preHandler (authenticate / requireAdmin)
   │  нет токена/роли → 401/403
   ▼
Route handler (routes.ts)
   │  достаёт request.body/query/params/user
   ▼
Service (service.ts)
   ├── Prisma → PostgreSQL
   ├── cache → Redis / memory
   ├── bcrypt, JWT, tokens, mailer
   └── возвращает DTO
   ▼
Response schema serialization
   │  оставляет только описанные поля
   ▼
HTTP response (JSON + статус)
```

Если на любом шаге выброшено исключение, управление переходит в `setErrorHandler` (`lib/errors.ts`), который превращает его в единый JSON.

### 3.2. Почему маршруты и сервисы разделены

- **Маршрут** знает HTTP: путь, метод, схему, код ответа. Его легко читать как API-контракт.
- **Сервис** знает бизнес: «перед скидкой проверь активность промокода», «при удалении товара почисти корзины». Его можно вызвать из другого места и проще тестировать.
- **lib** знает инфраструктуру: как подключиться к Redis, как округлить деньги.

Если смешать всё в обработчике, получится «божественный файл», который сложно тестировать и невозможно переиспользовать.

## 4. Жизненный цикл запроса

### 4.1. `GET /api/products` — cache miss

```text
1. Fastify валидирует query: page, limit, search, category, min_price...
2. buildCatalogCacheKey(query)
   → normalizeProductQuery (trim, lowercase, defaults)
   → URLSearchParams → SHA-256
   → "products:list:v1:<hash>"
3. cache.get(key)
   → Redis GET
   → если null, проверить memory Map
4. Промах → listProducts(query)
   → buildWhere: deletedAt=null + фильтры
   → buildOrderBy: выбранная колонка + id для стабильности
   → prisma.$transaction([count, findMany])
5. cache.set(key, result, REDIS_TTL_SECONDS)
6. reply.header('X-Cache', 'MISS')
7. Response schema оставляет items + meta
8. JSON уходит клиенту
```

При повторном запросе шаги 4–5 пропускаются, заголовок `X-Cache: HIT`.

**Почему в транзакции `count` и `findMany`.** Чтобы `total_items` и страница были согласованы, если между запросами кто-то добавит товар.

### 4.2. `POST /api/auth/login`

```text
1. Валидация email/password по схеме.
2. loginUser:
   a. normalizeEmail → lowercase/trim.
   b. prisma.user.findUnique({ email }).
   c. Если пользователя нет — выполнить bcrypt.compare с фиктивным хэшем
      (чтобы время ответа было похоже на «неверный пароль»),
      затем 401 с общим текстом.
   d. bcrypt.compare(password, user.passwordHash).
   e. Неверно → 401 (тот же текст).
   f. issueTokenPair:
      - randomBytes(32) → refresh (opaque);
      - удалить просроченные/давно отозванные refresh-токены;
      - создать запись с SHA-256(refresh), expiresAt + 7 дней;
      - подписать access JWT { sub, email, role } на 15 минут.
3. Ответ 200: user + accessToken + refreshToken + expiresIn.
4. Response schema не пропускает passwordHash.
```

**Почему email и пароль дают один и тот же текст ошибки.** Чтобы нельзя было узнать, зарегистрирован ли email (account enumeration).

### 4.3. Запрос с истёкшим access-токеном

```text
Frontend: GET /api/cart + Bearer expired
   │
   ▼
authenticate → request.jwtVerify() → ошибка срока
   │
   ▼
error handler → 401 UNAUTHORIZED
   │
   ▼
client.js видит 401, есть refresh
   │
   ├── POST /api/auth/refresh { refreshToken }
   │      ├── hashToken(refresh) → поиск в БД
   │      ├── revoked/expired? → 401
   │      ├── транзакция: старый revokedAt=now, новый refresh
   │      └── новый access JWT
   │
   ├── tokenStorage.setTokens(...)
   └── повтор исходного GET /api/cart (retry=false)
```

Если refresh тоже истёк/отозван — токены очищаются, пользователь разлогинен.

### 4.4. `POST /api/products` — админ создаёт товар

```text
1. preHandler requireAdmin:
   authenticate → jwtVerify → request.user
   role !== 'admin' → 403 FORBIDDEN
2. Валидация body: title, description, price, images >= 1, stockQuantity...
3. createProduct:
   prisma.product.create(...)
4. invalidateProductCache:
   cache.deleteByPrefix('products:')
   → memory: удалить все ключи с префиксом
   → Redis: SCAN MATCH products:* COUNT 100 + DEL пачками
5. toProductDto → 201 + товар
```

**Почему инвалидация после записи, а не до.** Если запись упадёт, кэш останется валидным. Если удалить до и запись упадёт, получим лишний промах, но не устаревшие данные. Текущий порядок безопаснее.

### 4.5. `POST /api/cart/items`

```text
1. authenticate → userId.
2. Валидация productId (UUID) и quantity (1..99).
3. addCartItem:
   a. найти товар с deletedAt=null;
   b. нет → 404; stock<=0 → 409 OUT_OF_STOCK;
   c. quantity > stock → 409 INSUFFICIENT_STOCK;
   d. ensureCart: cart.upsert({ userId }) — корзина создаётся при первом обращении;
   e. найти существующую позицию по (cartId, productId);
   f. nextQuantity = min(99, existing + input);
   g. nextQuantity > stock → 409;
   h. cartItem.upsert → создать/обновить;
   i. вернуть getCart(userId) — всю корзину с totals.
4. 200 + CartResponse.
```

**Почему сервер пересчитывает итоги.** Клиент может быть изменён, цены могли обновиться, промокод мог истечь. Деньги считает только сервер.

### 4.6. Merge гостевой корзины после входа

```text
CartProvider видит isAuthenticated=true и guestItems.length>0
   │
   ▼
POST /api/cart/merge { items: [{productId, quantity}] }
   │
   ▼
mergeGuestCart:
   ├── unique productIds
   ├── параллельно: найти товары (deletedAt=null) и существующие позиции
   ├── для каждого item:
   │     нет товара / stock<=0 → пропустить
   │     quantity = min(99, stock, existing + item.quantity)
   │     upsert по (cartId, productId)
   ├── $transaction(operations)
   └── getCart
   │
   ▼
Клиент очищает guestItems и localStorage
   └── если был гостевой промокод — applyCartPromo (ошибку игнорируем)
```

Синхронизация выполняется один раз: `syncRef` хранит `userId` и `promise`, поэтому повторный рендер не запускает merge заново.

### 4.7. Сброс пароля

```text
1. GET /forgot-password (HTML от API)
2. POST /api/auth/forgot-password { email }
   ├── всегда 202 и одинаковый текст (нет enumeration)
   ├── если пользователь есть:
   │     randomBytes(32) → rawToken
   │     транзакция: погасить старые reset-токены, создать новый (SHA-256, 15 мин)
   │     ссылка APP_PUBLIC_URL/reset-password?token=...
   │     SMTP настроен → письмо; иначе console.info со ссылкой
   │     EXPOSE_RESET_TOKEN=true (только dev) → вернуть resetToken в JSON
3. GET /reset-password?token=... (HTML)
4. POST /api/auth/reset-password { token, password }
   ├── hashToken(token) → найти запись
   ├── used/expired → 401
   ├── bcrypt.hash нового пароля
   ├── транзакция:
   │     обновить passwordHash
   │     usedAt = now (одноразовость)
   │     отозвать все активные refresh-токены пользователя
   └── 200
```

**Почему отдельные HTML-страницы, а не React.** Ссылка должна открываться быстро и не зависеть от загрузки 300 КБ JS. Они отдаются с `Cache-Control: no-store`, чтобы токен не оседал в кэше.

## 5. Модель данных

```text
users 1 ──── 0..1 carts
  │              │ 1
  │              ▼
  │           cart_items * ──── 1 products
  │              │
  │              └── carts.promo_code_id * ──── 1 promo_codes
  │
  ├── refresh_tokens *
  └── password_reset_tokens *

products: id, title, ..., price Decimal, images String[],
          highlights Json, stock_quantity, deleted_at
carts:    id, user_id UNIQUE, promo_code_id
cart_items: id, cart_id, product_id, quantity,
            UNIQUE(cart_id, product_id)
promo_codes: id, code UNIQUE, discount_percentage, is_active, valid_until
```

### Почему такие связи

- **`users 1—1 carts`.** У пользователя одна активная корзина; `user_id` уникален.
- **`carts 1—* cart_items`.** Позиции принадлежат корзине; при удалении корзины каскадно удаляются.
- **`products 1—* cart_items` с `ON DELETE RESTRICT`.** Товар нельзя физически удалить, пока на него ссылаются; поэтому используется soft-delete.
- **`promo_codes 1—* carts` с `ON DELETE SET NULL`.** Если промокод удалить, корзина просто потеряет скидку.
- **`UNIQUE(cart_id, product_id)`.** Один товар — одна строка; количество хранится в `quantity`, а не дублируется позициями.
- **`refresh_tokens` и `password_reset_tokens`.** Отдельные таблицы, потому что у них разный жизненный цикл и разные правила отзыва.

Подробные поля — в `server/prisma/schema.prisma` и в разборе кода.

## 6. Кэш: границы и правила

### Что кэшируется

| Ключ | Что внутри | Когда инвалидируется |
| --- | --- | --- |
| `products:list:v1:<sha256>` | Страница каталога + meta | Любое изменение товара |
| `products:item:v1:<id>` | Карточка товара | Любое изменение товара |
| `products:related:v1:<id>:<limit>` | Похожие товары | Любое изменение товара |
| `products:categories:v1` | Категории и количества | Любое изменение товара |

### Почему один префикс

Изменение товара влияет на все четыре вида данных. Удалять `products:*` проще и надёжнее, чем пытаться вычислить, какие именно списки содержат этот товар. Каталог небольшой, поэтому «снести всё» дешевле, чем риск устаревших данных.

### Что **не** кэшируется

- Корзина и пользователь — персональные и часто меняются.
- Ответы auth — содержат токены.
- Результаты админских операций.

### Согласованность

Кэш — **eventually consistent**: после изменения товара до инвалидации (несколько миллисекунд) кто-то может получить старый ответ. TTL 90 секунд — верхняя граница устаревания, если инвалидация не сработала.

## 7. Ошибки: единый путь

```text
throw badRequest(...) / notFound(...) / conflict(...)
        │
        ▼
setErrorHandler
  ├── AppError → статус + { error: { code, message, details } }
  ├── validation → 400 VALIDATION_ERROR + список полей
  ├── 429 → RATE_LIMITED
  ├── 413 → PAYLOAD_TOO_LARGE
  ├── JWT-коды → 401 UNAUTHORIZED
  ├── Prisma P2002 → 409 CONFLICT
  ├── Prisma P2025 → 404 NOT_FOUND
  ├── Prisma P2003 → 409 FOREIGN_KEY_CONSTRAINT
  ├── прочие 4xx → как есть
  └── 500 → в production скрыть детали, в development показать message
```

Клиент в `client.js` превращает это в `ApiError` с `status`, `code`, `details`, а страницы показывают `message` и обрабатывают `code`.

## 8. Запуск и остановка

```text
server.ts start()
  ├── buildApp()
  │     ├── регистрация плагинов
  │     ├── registerRoutes()
  │     └── cache.connect()  (Redis или memory fallback)
  ├── prisma.$connect()      (нет БД → exit 1)
  ├── подписка на SIGINT/SIGTERM
  └── app.listen(host, port)

SIGTERM
  └── app.close()
        └── onClose: prisma.$disconnect(), cache.close()
```

В Docker entrypoint сначала выполняет `prisma migrate deploy`, затем (опционально) seed, затем `exec node dist/server.js`. `exec` важен: процесс Node становится PID 1 и получает сигналы остановки.

## 9. Почему выбрана такая архитектура

1. **Разделение обязанностей.** Страницы не знают о БД, сервисы не знают о HTTP, инфраструктура изолирована в `lib`.
2. **Один контракт — три применения.** Схемы TypeBox дают валидацию, типы и Swagger.
3. **Кэш не протекает в бизнес-логику.** Маршрут решает, что кэшировать; сервис просто возвращает данные.
4. **Безопасность на сервере.** Клиентские guard'ы — только UX; настоящие проверки в `preHandler`.
5. **Готовность к облаку.** Stateless API, env-конфиг, healthcheck, graceful shutdown, Docker.
6. **Понятность для учебного проекта.** Нет лишних абстракций вроде DI-контейнера, CQRS или микросервисов.

## 10. Компромиссы и ограничения

- **Offset-пагинация** может «съезжать» при частых вставках; для большого каталога лучше cursor.
- **Префиксная инвалидация** сбрасывает весь каталог, а не только затронутые запросы; для маленького каталога это ок.
- **In-memory fallback** не разделяется между инстансами; в production обязателен Redis.
- **Rate limit** хранится в памяти инстанса; при нескольких репликах лимит будет на каждую.
- **Поиск по `longDescription`** не имеет GIN-индекса, поэтому на больших данных может быть медленнее.
- **JWT в localStorage** уязвим при XSS; альтернатива — httpOnly cookies с CSRF-защитой, но она требует переделки клиента и CORS.
- **CSP отключён** ради Swagger UI; в проде без `/docs` его можно включить.
- **Нет checkout/платежей** — по условию варианта; кнопка оформления является заглушкой.
- **Frontend-тестов нет**; покрыты чистые функции бэкенда. Это стоит улучшить компонентными тестами.

## 11. Куда добавлять новую функцию

Пример: «избранное».

1. **БД:** модель `Favorite` в `schema.prisma`, миграция, при необходимости индекс.
2. **Сервис:** `modules/favorites/service.ts` — бизнес-правила.
3. **Маршруты:** `routes.ts` + TypeBox-схемы + `preHandler: authenticate`.
4. **Регистрация:** `server/src/routes.ts`.
5. **API-клиент:** `src/shared/api/favorites.js`.
6. **Состояние:** feature `src/features/favorites` с контекстом, если нужно в нескольких местах.
7. **UI:** страница/виджет/кнопка.
8. **Тесты:** чистые функции и ключевые сценарии.
9. **Документация:** README, docs, Swagger обновится автоматически из схем.
