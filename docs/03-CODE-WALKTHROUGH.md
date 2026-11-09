# 03. Разбор кода по строкам

Здесь объясняются ключевые файлы. Это не пересказ всего репозитория, а разбор мест, которые чаще всего спрашивают: конфигурация, запуск, авторизация, каталог, кэш, корзина, фронтенд-клиент и Docker.

Обозначения:

- `// 1)` — пояснение к строке или блоку ниже.
- «Почему» — причина решения, а не просто описание синтаксиса.

---

## 1. `server/src/config/env.ts` — конфигурация

```ts
// 1)
const booleanFromString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
    })

// 2)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // ...
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must contain at least 16 characters'),
  REDIS_TTL_SECONDS: z.coerce.number().int().min(5).max(86_400).default(90),
  // ...
})

// 3)
const parsed = envSchema.safeParse(process.env)

// 4)
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n')
  console.error(`Invalid environment configuration:\n${issues}`)
  process.exit(1)
}

// 5)
export const env = parsed.data

// 6)
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = env.DATABASE_URL
}
```

1. Env-переменные всегда строки. `booleanFromString` превращает `"true"`, `"1"`, `"yes"`, `"on"` в `true`, а пустое значение — в значение по умолчанию. Это нужно, потому что Docker Compose передаёт всё строками.
2. Zod-схема — единый контракт конфигурации. `z.coerce.number()` приводит строку `"3000"` к числу. Ограничения (`min`, `max`, `enum`) не дают запуститься с абсурдными значениями.
3. `safeParse` не бросает исключение, а возвращает результат. Так можно красиво напечатать **все** ошибки сразу, а не первую.
4. Fail-fast: если конфиг неверен, процесс завершается с кодом 1. В контейнере это видно в логах, и оркестратор не отправит трафик в сломанный сервис.
5. Экспортируется уже провалидированный объект. Дальше по коду нет `process.env` — типы и значения гарантированы.
6. Prisma CLI читает `DIRECT_URL` отдельно. Если она не задана (локальная разработка), подставляем `DATABASE_URL`, чтобы не дублировать строку.

**Почему не читать `process.env` в каждом файле.** Тогда невозможно гарантировать, что переменная есть, и ошибка вылезет в случайном месте. Валидация на старте — дешевле.

---

## 2. `server/src/app.ts` — сборка Fastify

```ts
// 1)
const app = Fastify({
  logger: buildLogger(),
  trustProxy: env.TRUST_PROXY,
  bodyLimit: 1_048_576,
  disableRequestLogging: env.NODE_ENV === 'test',
}).withTypeProvider<TypeBoxTypeProvider>()

// 2)
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Cache', 'X-Cache-TTL'],
  credentials: false,
  maxAge: 86_400,
})

// 3)
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
})

// 4)
await app.register(rateLimit, {
  global: true,
  max: env.RATE_LIMIT_MAX,
  timeWindow: '1 minute',
  errorResponseBuilder: () =>
    errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.'),
})

// 5)
await app.register(jwt, { secret: env.JWT_SECRET })

// 6)
registerErrorHandler(app)

// 7)
app.addHook('onClose', async () => {
  await prisma.$disconnect()
  await cache.close()
})

// 8)
await app.register(registerRoutes)
await cache.connect()
```

1. `bodyLimit` — 1 МБ на JSON-тело. Это защита от гигантских payload. Файлы идут отдельным маршрутом с лимитом 5 МБ.
2. `origin` — функция, а не массив, чтобы поддержать wildcard-поддомены (`*.example.com`). `!origin` разрешает curl и server-to-server запросы: у них нет браузерного origin. `credentials: false` — куки не используются, значит и CSRF-риск от кросс-доменных куки отсутствует.
3. Helmet выставляет защитные заголовки. CSP отключён, потому что Swagger UI использует inline-скрипты; для `/docs` отдельно включён `staticCSP: true`. `crossOriginResourcePolicy: cross-origin` разрешает отдавать ресурсы разным origin.
4. Глобальный rate limit. Отдельные маршруты auth переопределяют его через `config.rateLimit`.
5. JWT-плагин получает секрет. Все вызовы `app.jwt.sign`/`request.jwtVerify` используют его.
6. Обработчик ошибок регистрируется **до** маршрутов, чтобы ловить всё.
7. При закрытии приложения закрываются соединения. Это graceful shutdown.
8. Сначала маршруты, потом подключение кэша. Если Redis недоступен, `cache.connect()` не бросает исключение, а включает memory fallback — API всё равно стартует.

---

## 3. `server/src/server.ts` — запуск

```ts
async function start(): Promise<void> {
  const app = await buildApp()          // 1

  try {
    await prisma.$connect()             // 2
  } catch (error) {
    app.log.error({ err: error }, 'Could not connect to PostgreSQL')
    process.exit(1)                     // 3
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down')  // 4
    try {
      await app.close()                 // 5
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ host: env.HOST, port: env.PORT })  // 6
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start HTTP server')
    process.exit(1)
  }
}
```

1. `buildApp` собирает приложение, но ещё не слушает порт.
2. Явная проверка БД до старта HTTP. Если база недоступна, нет смысла принимать запросы.
3. Ненулевой код завершения — сигнал оркестратору, что запуск провалился.
4. Лог содержит сигнал (`SIGTERM` при деплое, `SIGINT` при Ctrl+C).
5. `app.close()` запускает хук `onClose`, который закрывает Prisma и Redis.
6. Только теперь сервер начинает принимать трафик.

**Почему `void shutdown(...)`.** Обработчик сигнала не должен возвращать Promise; `void` явно показывает, что мы запускаем асинхронную операцию и не ждём её в синхронном callback.

---

## 4. `server/src/lib/errors.ts` — ошибки

```ts
// 1)
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

// 2)
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details)

export const notFound = (message = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', message)

// 3)
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send(errorResponse(error.code, error.message, error.details))
      return
    }

    // 4)
    if (error.validation) {
      reply.status(400).send(
        errorResponse('VALIDATION_ERROR', 'Request validation failed',
          error.validation.map((item) => ({
            path: item.instancePath || item.params?.missingProperty || 'request',
            message: item.message,
          })),
        ),
      )
      return
    }

    // 5)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { /* 409 CONFLICT */ }
      if (error.code === 'P2025') { /* 404 NOT_FOUND */ }
      if (error.code === 'P2003') { /* 409 FOREIGN_KEY_CONSTRAINT */ }
    }

    // 6)
    request.log.error({ err: error }, 'Unhandled request error')
    reply.status(500).send(
      errorResponse('INTERNAL_SERVER_ERROR',
        isProduction ? 'Internal server error' : error.message),
    )
  })
}
```

1. Свой класс ошибки несёт HTTP-статус и машинный `code`. Это позволяет сервису не знать про `reply`.
2. Хелперы делают код короче и единообразнее: `throw notFound('Product not found')` вместо конструктора с числами.
3. Глобальный обработчик — единственное место, где формируется JSON ошибки.
4. Fastify/Ajv помечает ошибки валидации полем `validation`. Мы отдаём путь и сообщение по каждому полю — удобно для форм.
5. Prisma-коды переводятся в понятные HTTP-статусы. Например, `P2002` — нарушение уникальности (email уже существует).
6. Неизвестная ошибка логируется целиком, но клиенту в production отдаётся общая фраза. Это не даёт утечь внутренним деталям (именам таблиц, путям, SQL).

---

## 5. `server/src/modules/auth/service.ts` — регистрация и вход

### 5.1. Регистрация

```ts
export async function registerUser(app: FastifyInstance, body: RegisterBody) {
  const email = normalizeEmail(body.email)                 // 1
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw conflict('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists') // 2
  }

  const passwordHash = await bcrypt.hash(body.password, env.BCRYPT_ROUNDS) // 3
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'customer',                                    // 4
      cart: { create: {} },                                // 5
    },
  })

  const tokens = await issueTokenPair(app, user)           // 6
  return authResponse(user, tokens)
}
```

1. Email нормализуется: `trim().toLowerCase()`. Иначе `User@Mail.com` и `user@mail.com` будут разными аккаунтами.
2. Проверка до создания. Уникальный индекс в БД всё равно защитит от гонки, но здесь мы даём понятную ошибку.
3. Пароль хэшируется с солью и 12 раундами. В БД попадает только хэш.
4. Роль всегда `customer`: регистрация не позволяет стать админом. Админ создаётся seed-скриптом.
5. Вложенное создание корзины: у пользователя сразу есть корзина, не нужно обрабатывать «корзины нет».
6. Сразу выдаём токены, чтобы после регистрации не заставлять входить повторно.

### 5.2. Вход

```ts
export async function loginUser(app: FastifyInstance, body: LoginBody) {
  const email = normalizeEmail(body.email)
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    // 1)
    await bcrypt.compare(body.password, '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7W1z5Qh1oE9g9fB8m1j3k5l7n9p1q3r')
    throw unauthorized('Invalid email or password')
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash) // 2
  if (!valid) {
    throw unauthorized('Invalid email or password')                      // 3
  }

  const tokens = await issueTokenPair(app, user)                         // 4
  return authResponse(user, tokens)
}
```

1. Если пользователя нет, всё равно выполняем bcrypt-сравнение с фиктивным хэшем. Это выравнивает время ответа: иначе по скорости можно было бы определить, существует ли email.
2. `bcrypt.compare` извлекает соль из хэша и проверяет пароль.
3. Одинаковый текст для «нет пользователя» и «неверный пароль» — защита от enumeration.
4. При успехе создаётся пара токенов.

### 5.3. Выдача пары токенов

```ts
async function issueTokenPair(app: FastifyInstance, user: User): Promise<TokenPair> {
  const refreshToken = createOpaqueToken()                         // 1
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000  // 2

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({                               // 3
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000) } },
        ],
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),                        // 4
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ])

  return {
    accessToken: signAccessToken(app, user),                       // 5
    refreshToken,                                                  // 6
    expiresIn: env.JWT_EXPIRES_IN,
  }
}
```

1. Refresh — 32 случайных байта в base64url. Это opaque-токен: в нём нет данных, только случайность.
2. TTL в миллисекундах, потому что `Date` работает с миллисекундами.
3. Заодно чистим старые записи, чтобы таблица не росла бесконечно. Отозванные старше 7 дней уже не нужны.
4. В БД — только SHA-256. Если база утечёт, сырой токен не восстановить.
5. Access — JWT с `sub` (id пользователя), email и ролью.
6. Сырой refresh возвращается клиенту **один раз**; сервер его больше не хранит.

### 5.4. Ротация refresh

```ts
export async function refreshSession(app: FastifyInstance, refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },   // 1
    include: { user: true },
  })

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) { // 2
    throw unauthorized('Refresh token is invalid or expired')
  }

  const nextToken = createOpaqueToken()
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },                // 3
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hashToken(nextToken),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ])

  return authResponse(stored.user, {
    accessToken: signAccessToken(app, stored.user),
    refreshToken: nextToken,
    expiresIn: env.JWT_EXPIRES_IN,
  })
}
```

1. Ищем по хэшу, а не по сырому токену: в БД сырых токенов нет.
2. Три причины отказа: запись не найдена, уже отозвана, истекла.
3. Ротация: старый токен гасится, новый создаётся в той же транзакции. Если клиент потеряет ответ, ему придётся войти заново — это безопаснее, чем разрешать повторное использование.

### 5.5. Сброс пароля

```ts
export async function resetPassword(body: ResetPasswordBody) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(body.token) },       // 1
    include: { user: true },
  })

  if (!record || record.usedAt || record.expiresAt <= new Date()) { // 2
    throw unauthorized('Password reset link is invalid or has expired')
  }

  const passwordHash = await bcrypt.hash(body.password, env.BCRYPT_ROUNDS)
  const now = new Date()

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }), // 3
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }), // 4
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },                        // 5
    }),
  ])

  return { message: 'Password has been updated. You can sign in with the new password.' }
}
```

1. Токен проверяется по хэшу.
2. Одноразовость (`usedAt`) и срок (`expiresAt`) проверяются до любых изменений.
3. Новый пароль хэшируется.
4. Токен помечается использованным в той же транзакции.
5. Все активные сессии отзываются: если пароль сменили из-за взлома, старые refresh-токены перестают работать.

---

## 6. `server/src/plugins/auth.ts` — проверка доступа

```ts
export type AuthUser = {
  sub: string
  email: string
  role: 'customer' | 'admin'
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()          // 1
  } catch {
    throw unauthorized('A valid Bearer token is required')  // 2
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(request, reply)   // 3
  if (request.user.role !== 'admin') { // 4
    throw forbidden('This action requires the admin role')
  }
}
```

1. `jwtVerify` читает `Authorization: Bearer`, проверяет подпись и срок, кладёт payload в `request.user`.
2. Любая ошибка JWT превращается в единый 401, без деталей (истёк/неверная подпись/нет заголовка).
3. `requireAdmin` сначала требует валидный токен.
4. Затем проверяет роль. Это **серверная** защита; клиентский guard — только удобство.

---

## 7. `server/src/modules/products/cache.ts` — ключи кэша

```ts
export const PRODUCTS_CACHE_PREFIX = 'products:'

export function normalizeProductQuery(query: ProductQuery) {
  const page = query.page ?? 1
  const limit = query.limit ?? 12
  const sortBy = query.sort_by ?? 'created_at'
  const order = query.order ?? (sortBy === 'created_at' ? 'desc' : 'asc') // 1

  return {
    page,
    limit,
    search: query.search?.trim().toLowerCase() || '',   // 2
    category: query.category?.trim().toLowerCase() || '',
    minPrice: query.min_price ?? null,
    maxPrice: query.max_price ?? null,
    minRating: query.min_rating ?? null,
    sortBy,
    order,
  }
}

export function buildCatalogCacheKey(query: ProductQuery): string {
  const normalized = normalizeProductQuery(query)
  const params = new URLSearchParams({                  // 3
    page: String(normalized.page),
    limit: String(normalized.limit),
    search: normalized.search,
    category: normalized.category,
    min_price: normalized.minPrice === null ? '' : String(normalized.minPrice),
    max_price: normalized.maxPrice === null ? '' : String(normalized.maxPrice),
    min_rating: normalized.minRating === null ? '' : String(normalized.minRating),
    sort_by: normalized.sortBy,
    order: normalized.order,
  })
  const digest = createHash('sha256').update(params.toString()).digest('hex') // 4
  return `${PRODUCTS_CACHE_PREFIX}list:v1:${digest}`
}
```

1. Для сортировки по дате логично сначала новые (`desc`), для цены/названия — по возрастанию. Значение по умолчанию зависит от поля.
2. Приведение к нижнему регистру и trim устраняет дубликаты ключей.
3. `URLSearchParams` гарантирует стабильный порядок и кодирование.
4. SHA-256 даёт короткий ключ фиксированной длины. Префикс `products:` нужен для групповой инвалидации, `v1` — чтобы при изменении формата ключей старые записи не конфликтовали.

---

## 8. `server/src/modules/products/routes.ts` — cache-aside

```ts
app.get('/api/products', { schema: { /* ... */ } }, async (request, reply) => {
  const cacheKey = buildCatalogCacheKey(request.query)          // 1
  const cached = await cache.get<ProductListResponse>(cacheKey) // 2
  if (cached) {
    reply.header('X-Cache', 'HIT')                              // 3
    return cached
  }

  const result = await listProducts(request.query)              // 4
  await cache.set(cacheKey, result, env.REDIS_TTL_SECONDS)      // 5

  reply.header('X-Cache', 'MISS')                               // 6
  reply.header('X-Cache-TTL', String(env.REDIS_TTL_SECONDS))
  return result
})
```

1. Ключ строится из нормализованных query-параметров.
2. `cache.get` сначала смотрит Redis, затем memory fallback.
3. Заголовок помогает проверить кэш через `curl -i`.
4. Промах: идём в БД.
5. Кладём результат на 90 секунд.
6. `MISS` сообщает, что ответ свежий из БД.

**Почему `if (cached)` безопасно.** Пустой массив — truthy в JavaScript, поэтому кэшированный пустой каталог тоже вернётся корректно. `null` означает промах.

---

## 9. `server/src/modules/products/service.ts` — запросы

### 9.1. `buildWhere`

```ts
function buildWhere(query: NormalizedProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { deletedAt: null }   // 1

  if (query.search) {
    where.OR = [                                                // 2
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { longDescription: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' } // 3
  }

  if (query.minPrice !== null || query.maxPrice !== null) {
    where.price = {
      ...(query.minPrice !== null ? { gte: query.minPrice } : {}),   // 4
      ...(query.maxPrice !== null ? { lte: query.maxPrice } : {}),
    }
  }

  if (query.minRating !== null) {
    where.rating = { gte: query.minRating }
  }

  return where
}
```

1. Soft-delete: удалённые товары не попадают ни в один запрос каталога.
2. `OR` по трём полям. `mode: 'insensitive'` превращает `contains` в `ILIKE`, а GIN/trgm-индексы ускоряют поиск.
3. Категория сравнивается без учёта регистра.
4. Операторы добавляются только если параметр задан. Иначе `undefined` мог бы сломать фильтр.

### 9.2. `listProducts`

```ts
export async function listProducts(query: ProductQuery): Promise<ProductListResponse> {
  const normalized = normalizeProductQuery(query)

  if (normalized.minPrice !== null && normalized.maxPrice !== null &&
      normalized.minPrice > normalized.maxPrice) {
    throw badRequest('min_price cannot be greater than max_price') // 1
  }

  const where = buildWhere(normalized)
  const orderBy = buildOrderBy(normalized)
  const skip = (normalized.page - 1) * normalized.limit              // 2

  const [totalItems, products] = await prisma.$transaction([         // 3
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip, take: normalized.limit }),
  ])

  return {
    items: products.map(toProductDto),
    meta: {
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / normalized.limit),         // 4
      current_page: normalized.page,
      limit: normalized.limit,
    },
  }
}
```

1. Некорректный диапазон — 400, а не пустой результат. Пользователь должен понимать ошибку.
2. Offset-пагинация.
3. `count` и `findMany` в одной транзакции — согласованные `total` и страница.
4. `Math.ceil` даёт количество страниц; при `total=12, limit=12` будет 1.

### 9.3. Удаление

```ts
export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } }) // 1
  if (!existing) throw notFound('Product not found')

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { productId: id } }),                          // 2
    prisma.product.update({ where: { id }, data: { deletedAt: new Date() } }),         // 3
  ])

  await invalidateProductCache()                                                       // 4
}
```

1. Повторное удаление уже удалённого товара даёт 404.
2. Сначала убираем позиции из всех корзин, иначе пользователи увидят недоступный товар.
3. Товар не удаляется физически: FK `ON DELETE RESTRICT` и исторические ссылки сохраняются.
4. Сбрасываем кэш каталога.

---

## 10. `server/src/lib/money.ts` — деньги

```ts
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100   // 1

export function computeCartTotals(lines, discountPercentage, taxRate) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + roundMoney(line.price * line.quantity), 0), // 2
  )
  const safePercentage = Math.min(100, Math.max(0, discountPercentage || 0))       // 3
  const discount = roundMoney(subtotal * (safePercentage / 100))                   // 4
  const taxable = roundMoney(subtotal - discount)                                  // 5
  const tax = roundMoney(taxable * taxRate)                                        // 6
  const total = roundMoney(taxable + tax)
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)

  return { subtotal, discount, tax, total, totalQuantity }
}
```

1. `Number.EPSILON` компенсирует двоичную погрешность вроде `1.005 * 100 = 100.49999...`.
2. Сначала округляем каждую строку, потом сумму — так итог совпадает с тем, что видит пользователь.
3. Защита от некорректной скидки: не меньше 0 и не больше 100.
4. Скидка считается от подытога.
5. Налог — от суммы **после** скидки.
6. Итог = taxable + tax.

**Почему не float без округления.** `0.1 + 0.2 !== 0.3`; в деньгах это недопустимо.

---

## 11. `server/src/modules/cart/service.ts` — корзина

### 11.1. `ensureCart` и `loadCart`

```ts
const ensureCart = (userId: string) =>
  prisma.cart.upsert({
    where: { userId },        // 1
    update: {},               // 2
    create: { userId },       // 3
    include: cartInclude,
  })

async function loadCart(userId: string): Promise<CartWithRelations> {
  const cart = await ensureCart(userId)

  const deletedItems = cart.items.filter((item) => item.product.deletedAt !== null) // 4
  if (deletedItems.length > 0) {
    await prisma.cartItem.deleteMany({ where: { id: { in: deletedItems.map((i) => i.id) } } })
    cart.items = cart.items.filter((item) => item.product.deletedAt === null)
  }

  if (cart.promoCode && !isPromoUsable(cart.promoCode)) {   // 5
    await prisma.cart.update({ where: { id: cart.id }, data: { promoCodeId: null } })
    cart.promoCode = null
  }

  return cart
}
```

1. `user_id` уникален, поэтому `upsert` либо находит корзину, либо создаёт.
2. При наличии ничего не меняем.
3. При создании достаточно `userId`.
4. Ленивая уборка: если товар стал soft-deleted, позиция удаляется при следующем чтении корзины.
5. Истёкший/отключённый промокод снимается автоматически.

### 11.2. `addCartItem`

```ts
const product = await prisma.product.findFirst({ where: { id: input.productId, deletedAt: null } })
if (!product) throw notFound('Product not found')                 // 1
if (product.stockQuantity <= 0) throw conflict('OUT_OF_STOCK', ...) // 2
if (input.quantity > product.stockQuantity) throw conflict('INSUFFICIENT_STOCK', ...) // 3

const cart = await ensureCart(userId)
const existing = await prisma.cartItem.findUnique({
  where: { cartId_productId: { cartId: cart.id, productId: product.id } }, // 4
})

const nextQuantity = Math.min(99, (existing?.quantity ?? 0) + input.quantity) // 5
if (nextQuantity > product.stockQuantity) throw conflict('INSUFFICIENT_STOCK', ...)

await prisma.cartItem.upsert({
  where: { cartId_productId: { cartId: cart.id, productId: product.id } },
  create: { cartId: cart.id, productId: product.id, quantity: nextQuantity },
  update: { quantity: nextQuantity },
})

return getCart(userId)
```

1. Проверяем существование и soft-delete.
2. Нельзя добавить то, чего нет на складе.
3. Нельзя превысить остаток.
4. Составной уникальный ключ — `cartId_productId`.
5. Суммируем с уже лежащим в корзине и ограничиваем 99.

### 11.3. Merge

```ts
const productIds = [...new Set(input.items.map((item) => item.productId))] // 1

const [products, existingItems] = await Promise.all([                       // 2
  prisma.product.findMany({ where: { id: { in: productIds }, deletedAt: null } }),
  prisma.cartItem.findMany({ where: { cartId: cart.id, productId: { in: productIds } } }),
])

const productById = new Map(products.map((p) => [p.id, p]))                 // 3
const existingByProduct = new Map(existingItems.map((i) => [i.productId, i]))

for (const item of input.items) {
  const product = productById.get(item.productId)
  if (!product || product.stockQuantity <= 0) continue                      // 4

  const existing = existingByProduct.get(item.productId)
  const quantity = Math.min(99, product.stockQuantity, (existing?.quantity ?? 0) + item.quantity)
  if (quantity <= 0) continue

  operations.push(prisma.cartItem.upsert({ /* ... */ }))                    // 5
}

if (operations.length > 0) await prisma.$transaction(operations)           // 6
```

1. Дубликаты productId схлопываются, чтобы не делать лишние операции.
2. Два запроса параллельно — быстрее, чем последовательно.
3. Map даёт O(1) доступ по id.
4. Неизвестные/удалённые/отсутствующие товары пропускаются.
5. Операции складываются в массив.
6. Все upsert выполняются одной транзакцией.

**Почему не доверять quantities с клиента.** Сервер ограничивает их остатком и 99, иначе можно было бы «накрутить» корзину.

---

## 12. `server/src/modules/uploads/routes.ts` — загрузка

```ts
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw serviceUnavailable('STORAGE_NOT_CONFIGURED', ...)    // 1
}

const part = await request.file({ limits: { files: 1, fileSize: env.UPLOAD_MAX_BYTES } }) // 2
if (!part) throw badRequest('A multipart file field named "file" is required')

const extension = MIME_EXTENSIONS[part.mimetype]              // 3
if (!extension) throw badRequest('Unsupported image type...')

const buffer = await part.toBuffer()                          // 4
if (buffer.byteLength === 0) throw badRequest('Uploaded file is empty')

const objectPath = `products/${Date.now()}-${randomUUID()}.${extension}` // 5
const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`

const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, // 6
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': part.mimetype,
    'x-upsert': 'true',
    'cache-control': 'public, max-age=31536000, immutable',
  },
  body: new Uint8Array(buffer),
})

if (!response.ok) { request.log.error(...); throw new AppError(502, 'STORAGE_UPLOAD_FAILED', ...) } // 7
const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
```

1. Без Supabase админка работает, но загрузка честно отвечает 503.
2. Ограничение на один файл и размер.
3. MIME проверяется по белому списку, расширение берётся из него, а не из имени файла — нельзя загрузить `.html` под видом картинки.
4. Файл читается в память (до 5 МБ) и отправляется как байты.
5. Уникальное имя: время + UUID. Оригинальное имя не используется — меньше риска path traversal и коллизий.
6. Service-role key используется **только на сервере**. Браузер его не видит.
7. Ошибка Storage логируется и превращается в 502: проблема на стороне внешнего сервиса.

---

## 13. `src/shared/api/client.js` — HTTP-клиент

```js
const configuredUrl = import.meta.env.VITE_API_URL?.trim()
export const API_BASE_URL = (configuredUrl || 'http://localhost:3000').replace(/\/+$/, '') // 1

const ACCESS_TOKEN_KEY = 'techstore.auth.access'
const REFRESH_TOKEN_KEY = 'techstore.auth.refresh'
export const SESSION_EXPIRED_EVENT = 'techstore:session-expired'

const readStorage = (key) => {
  try { return localStorage.getItem(key) } catch { return null } // 2
}
```

1. Адрес API берётся из build-time переменной; слэш на конце убирается, чтобы не было `//api`.
2. Приватный режим может запрещать localStorage; приложение не должно падать.

### 13.1. Refresh с «замком»

```js
let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise            // 1

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) throw new ApiError('Session expired', { status: 401, code: 'NO_REFRESH_TOKEN' })

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, { /* ... */ })
    const data = await parseBody(response)

    if (!response.ok) {
      tokenStorage.clear()                             // 2
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      throw new ApiError(...)
    }

    tokenStorage.setTokens(data)                       // 3
    return data
  })()

  try { return await refreshPromise }
  finally { refreshPromise = null }                    // 4
}
```

1. Если refresh уже идёт, возвращаем тот же Promise. Это предотвращает гонку и лишние запросы.
2. Неудача — сессия мертва: очищаем токены и уведомляем приложение.
3. Успех — сохраняем новую пару (refresh ротирован).
4. В любом случае сбрасываем «замок», чтобы следующая попытка могла начаться.

### 13.2. Основной запрос

```js
async function request(path, { method = 'GET', body, auth = true, headers, signal, retry = true } = {}) {
  const requestHeaders = new Headers(headers || {})
  let requestBody = body

  if (body instanceof FormData) {
    requestBody = body                                  // 1
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  if (auth) {
    const accessToken = tokenStorage.getAccess()
    if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`) // 2
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { /* ... */ })
  } catch (error) {
    if (error?.name === 'AbortError') throw error       // 3
    throw new ApiError('Не удалось подключиться к серверу...', { code: 'NETWORK_ERROR' })
  }

  if (response.status === 401 && auth && retry && tokenStorage.getRefresh()) { // 4
    try {
      await refreshAccessToken()
      return request(path, { method, body, auth, headers, signal, retry: false }) // 5
    } catch (error) {
      if (error?.name === 'AbortError') throw error
    }
  }

  const data = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(data?.error?.message || `...`, {
      status: response.status,
      code: data?.error?.code || 'REQUEST_FAILED',
      details: data?.error?.details,
    })
  }
  return data
}
```

1. `FormData` нельзя сериализовать в JSON и нельзя вручную ставить `Content-Type`: браузер сам добавит boundary.
2. Bearer-токен добавляется только для защищённых запросов.
3. Отмена — не ошибка сети, её нельзя показывать пользователю.
4. Повтор только один раз (`retry: false`), чтобы не зациклиться.
5. Исходный запрос повторяется с новым access-токеном.

---

## 14. `src/features/auth/model/AuthProvider.jsx` — сессия

```jsx
useEffect(() => {
  let cancelled = false

  const restoreSession = async () => {
    if (!tokenStorage.getAccess() && !tokenStorage.getRefresh()) {
      if (!cancelled) setInitializing(false)
      return                                    // 1
    }

    try {
      const currentUser = await fetchCurrentUser() // 2
      if (!cancelled) setUser(currentUser)
    } catch {
      tokenStorage.clear()                         // 3
      if (!cancelled) setUser(null)
    } finally {
      if (!cancelled) setInitializing(false)
    }
  }

  const handleSessionExpired = () => {
    tokenStorage.clear()
    setUser(null)
  }

  restoreSession()
  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)

  return () => {
    cancelled = true
    window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired) // 4
  }
}, [])
```

1. Нет токенов — сразу завершаем инициализацию, без запроса.
2. `/auth/me` проверяет токен и возвращает актуального пользователя (роль могла измениться).
3. Если токен невалиден, чистим хранилище.
4. Убираем подписку при размонтировании, чтобы не было утечек.

### Login/logout

```jsx
const applySession = useCallback((data) => {
  tokenStorage.setTokens(data)   // 1
  setUser(data.user)
  return data.user
}, [])

const login = useCallback(
  async (credentials) => applySession(await loginAccount(credentials)),
  [applySession],
)

const logout = useCallback(async () => {
  const refreshToken = tokenStorage.getRefresh()
  tokenStorage.clear()           // 2
  setUser(null)
  try {
    await logoutAccount(refreshToken) // 3
  } catch {
    // локальный выход уже выполнен
  }
}, [])
```

1. Один функция сохранения для login и register.
2. Сначала локальный выход: UI не должен ждать сеть.
3. Затем пытаемся отозвать refresh на сервере. Если не удалось — не критично.

---

## 15. `src/features/cart/model/CartProvider.jsx` — корзина

### 15.1. Гостевой режим

```jsx
const [guestItems, setGuestItems] = useState(() => loadCartState().items)   // 1
const [guestPromo, setGuestPromo] = useState(() => loadCartState().appliedPromo)

useEffect(() => {
  if (isAuthenticated) return                                                // 2
  saveCartState({ items: guestItems, appliedPromo: guestPromo })
}, [guestItems, guestPromo, isAuthenticated])
```

1. Ленивая инициализация: localStorage читается один раз при монтировании, а не на каждый рендер.
2. Для авторизованного пользователя localStorage не трогаем — источник истины сервер.

### 15.2. Загрузка товаров гостевой корзины

```jsx
useEffect(() => {
  if (isAuthenticated || guestItems.length === 0) {
    setGuestProducts({})
    return undefined                                   // 1
  }

  let cancelled = false
  setLoading(true)

  const productIds = [...new Set(guestItems.map((item) => item.productId))]
  Promise.allSettled(productIds.map(async (productId) => {
    if (productCache.has(productId)) return [productId, productCache.get(productId)] // 2
    const product = await fetchProduct(productId)
    productCache.set(productId, product)
    return [productId, product]
  })).then((results) => {
    if (cancelled) return                              // 3
    // ... собрать resolved, удалить 404-товары
  })

  return () => { cancelled = true }
}, [guestItems, isAuthenticated])
```

1. Авторизованному пользователю товары приходят вместе с серверной корзиной — отдельные запросы не нужны.
2. Простой кэш в модуле экономит запросы при повторных рендерах.
3. Флаг защищает от обновления состояния после размонтирования.

### 15.3. Синхронизация после входа

```jsx
if (syncRef.current.userId === user.id && syncRef.current.promise) {
  syncRef.current.promise.then((cart) => setServerCart(cart)).catch(() => {})
  return undefined                                     // 1
}

const promise = (async () => {
  setLoading(true)
  try {
    let cart
    if (guestItems.length > 0) {
      cart = await cartApi.mergeGuestCart(guestItems.map(...)) // 2
      setGuestItems([])
      saveCartState({ items: [], appliedPromo: null })
    } else {
      cart = await cartApi.fetchCart()
    }

    if (guestPromo) {
      try { cart = await cartApi.applyCartPromo(guestPromo) } catch {} // 3
      setGuestPromo(null)
    }

    setServerCart(cart)
    return cart
  } catch (syncError) { setError(...); throw syncError }
  finally { setLoading(false) }
})()

syncRef.current = { userId: user.id, promise }
promise.catch(() => {})                                // 4
```

1. Повторный рендер с тем же пользователем не запускает merge заново.
2. Гостевая корзина переносится на сервер.
3. Промокод применяется отдельно; если он больше не активен, просто игнорируем.
4. Предотвращаем unhandled rejection: ошибка уже сохранена в state.

### 15.4. Очередь мутаций

```jsx
const mutationQueue = useRef(Promise.resolve())

const enqueueMutation = useCallback((task) => {
  const run = mutationQueue.current.then(task, task) // 1
  mutationQueue.current = run.catch(() => {})        // 2
  return run
}, [])
```

1. Новая операция запускается после предыдущей, независимо от её успеха (`then(task, task)`).
2. Хвост очереди всегда «успешный», чтобы одна ошибка не заблокировала следующие запросы.

### 15.5. Итоги

```jsx
const totals = useMemo(() => {
  if (isAuthenticated && serverCart) {
    return serverCart                                // 1
  }

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0))
  const discount = guestPromo === VALID_PROMO_CODE
    ? roundMoney(subtotal * PROMO_DISCOUNT_RATE)
    : 0
  const taxable = roundMoney(subtotal - discount)
  const tax = roundMoney(taxable * CART_TAX_RATE)   // 2
  const total = roundMoney(taxable + tax)
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)

  return { subtotal, discount, tax, total, totalQuantity }
}, [isAuthenticated, serverCart, lines, guestPromo])
```

1. Для авторизованного пользователя доверяем серверу.
2. Для гостя считаем локально по тем же правилам: скидка до налога, налог 8%.

---

## 16. `src/pages/catalog-page/ui/CatalogPage.jsx` — загрузка каталога

```jsx
const debouncedSearch = useDebouncedValue(search.trim(), 350)   // 1
const debouncedPriceMin = useDebouncedValue(priceMin, 400)
const debouncedPriceMax = useDebouncedValue(priceMax, 400)

useEffect(() => {
  const controller = new AbortController()                      // 2
  let cancelled = false

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchProducts({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,                   // 3
        category: categoryFilter || undefined,
        min_price: debouncedPriceMin > 0 ? debouncedPriceMin : undefined,
        max_price: debouncedPriceMax < PRICE_MAX ? debouncedPriceMax : undefined,
        min_rating: minRating,
        sort_by: sort.sortBy,
        order: sort.order,
      }, { signal: controller.signal })

      if (cancelled) return
      setItems(data.items)
      setMeta(data.meta)
    } catch (loadError) {
      if (cancelled || loadError?.name === 'AbortError') return // 4
      setError(getApiErrorMessage(loadError))
      setItems([])
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  load()

  return () => {
    cancelled = true
    controller.abort()                                          // 5
  }
}, [page, debouncedSearch, debouncedPriceMin, debouncedPriceMax, minRating, sortBy, categoryFilter, reloadToken])
```

1. Debounce не даёт отправлять запрос на каждый символ.
2. AbortController отменяет устаревший запрос.
3. `undefined` означает «не передавать параметр»; `buildQuery` пропускает такие значения.
4. Отмена — не ошибка UI.
5. Cleanup выполняется при изменении зависимостей и размонтировании.

```jsx
useEffect(() => {
  setPage(1)
}, [filtersKey])   // 1
```

1. Новый набор фильтров всегда начинается с первой страницы. Иначе можно оказаться на странице 5 при двух результатах.

---

## 17. `src/app/providers/router/AppRoutes.jsx` — guard

```jsx
const RequireAuth = ({ adminOnly = false, children }) => {
  const { user, isAdmin, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <div className="app-route-status" role="status">Проверяем сессию…</div> // 1
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.login} state={{ from: location.pathname }} replace /> // 2
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={APP_ROUTES.catalog} replace /> // 3
  }

  return children
}
```

1. Пока сессия восстанавливается, нельзя редиректить: иначе пользователь с валидным токеном на секунду увидит логин.
2. Запоминаем, откуда пришли, чтобы вернуть после входа.
3. `replace` не оставляет лишнюю запись в истории браузера.

**Важно:** это UX-guard. Настоящая проверка — `requireAdmin` на API. Скрытие кнопки не защищает данные.

---

## 18. `server/Dockerfile` — сборка

```dockerfile
FROM node:24-bookworm-slim AS base          # 1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci                                   # 2

FROM deps AS build
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate                      # 3
COPY src ./src
RUN npm run build                            # 4

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev                        # 5

FROM base AS runtime
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma # 6
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node public ./public
COPY --chown=node:node docker-entrypoint.sh ./

USER node                                     # 7
EXPOSE 3000

HEALTHCHECK ... CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live')..." # 8
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
```

1. Один базовый образ, чтобы версии Node и системных пакетов совпадали.
2. `npm ci` ставит строго по lock-файлу, включая dev-зависимости для сборки.
3. Prisma Client генерируется до компиляции TypeScript: код импортирует сгенерированные типы.
4. `tsc` превращает `src` в `dist`.
5. В финальный образ идут только production-зависимости.
6. Копируем сгенерированный `.prisma` — без него клиент не найдёт движок.
7. Процесс работает от непривилегированного пользователя.
8. Healthcheck использует встроенный `fetch` Node 24, без curl.

### `docker-entrypoint.sh`

```sh
#!/bin/sh
set -e                                # 1

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] applying database migrations..."
  npx prisma migrate deploy           # 2
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] seeding demo data..."
  node prisma/seed.js                 # 3
fi

echo "[entrypoint] starting API on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec node dist/server.js              # 4
```

1. Любая ошибка останавливает запуск — лучше не стартовать со сломанной миграцией.
2. `migrate deploy` применяет только существующие миграции, не создаёт новые. Это правильная команда для продакшена.
3. Seed опционален; в продакшене обычно `false` после первого запуска.
4. `exec` заменяет shell процессом Node, чтобы сигналы Docker/Render доходили до приложения.

---

## 19. `server/prisma/schema.prisma` — ключевые поля

```prisma
model Product {
  id              String     @id @default(uuid()) @db.Uuid
  price           Decimal    @db.Decimal(10, 2)          // 1
  images          String[]                                // 2
  highlights      Json?                                   // 3
  stockQuantity   Int        @default(0) @map("stock_quantity")
  deletedAt       DateTime?  @map("deleted_at")           // 4

  @@index([price])
  @@index([rating])
  @@index([category])
  @@index([deletedAt])
  @@index([createdAt])
  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin)   // 5
  @@index([description(ops: raw("gin_trgm_ops"))], type: Gin)
  @@map("products")
}
```

1. `Decimal(10,2)` — точные деньги.
2. Массив URL картинок.
3. Гибкие характеристики.
4. Soft-delete.
5. GIN-индексы для `ILIKE`-поиска.

```prisma
model CartItem {
  id        String @id @default(uuid()) @db.Uuid
  cartId    String @map("cart_id") @db.Uuid
  productId String @map("product_id") @db.Uuid
  quantity  Int    @default(1)

  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([cartId, productId])   // 1
}
```

1. Один товар в корзине — одна строка. Это основа идемпотентного `upsert`.

---

## 20. Тесты — что и зачем

`server/tests/cache-key.test.ts`:

- одинаковые query-объекты дают одинаковый ключ;
- значения по умолчанию нормализуются;
- изменение фильтра меняет ключ;
- сортировка по дате по умолчанию `desc`, по цене — `asc`.

`server/tests/money.test.ts`:

- округление `10.005 → 10.01`;
- скидка применяется до налога;
- некорректная скидка зажимается в 0..100.

`server/tests/tokens.test.ts`:

- токены случайны и достаточной длины;
- хэш детерминирован и не равен сырому токену.

`server/tests/schemas.test.ts`:

- валидация ключевых схем (например, минимальное количество изображений).

**Почему именно эти тесты.** Это чистые функции без БД и сети: быстрые, стабильные и проверяют самые рискованные расчёты — деньги, ключи кэша и токены. Интеграционные тесты с БД были бы полезны, но требуют отдельного окружения.

---

## 21. Мини-упражнение: проследите путь данных

1. Откройте `src/pages/catalog-page/ui/CatalogPage.jsx`, найдите `fetchProducts`.
2. Перейдите в `src/shared/api/products.js` → `src/shared/api/client.js`.
3. Найдите `request`, затем на сервере `server/src/modules/products/routes.ts`.
4. Посмотрите `buildCatalogCacheKey`, затем `listProducts` и `buildWhere`.
5. Найдите `prisma.product.findMany` и представьте SQL: `SELECT ... WHERE deleted_at IS NULL ... LIMIT ... OFFSET ...`.
6. Вернитесь в `routes.ts`: `cache.set`, заголовки `X-Cache`.
7. В `CatalogPage` найдите `setItems(data.items)` и `setMeta(data.meta)`.

Если вы можете пройти этот путь без подсказок — вы понимаете основной поток проекта.
