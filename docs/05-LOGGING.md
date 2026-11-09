# 05. Логи и диагностика

Логи — это единственный способ понять, что произошло на сервере, если пользователь говорит «не работает». В этом проекте логи структурированные: в development они красивые и цветные, в production — JSON-строки, которые удобно собирать и искать.

---

## 1. Куда пишутся логи

Приложение пишет в **stdout/stderr**. Дальше их забирает среда:

- локально — терминал, где запущен `npm run dev`;
- Docker Compose — `docker compose logs`;
- Render — раздел Logs сервиса;
- CI/мониторинг — любая система, которая читает stdout.

**Почему не файлы.** В контейнере файловая система временная; платформа сама решает, где хранить и сколько держать логи. Это принцип 12-factor.

---

## 2. Два формата

### Development

В `server/src/app.ts`:

```ts
if (isDevelopment) {
  return {
    level: env.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname', colorize: true },
    },
  }
}
```

Примерно так выглядит строка:

```text
14:32:07 INFO: incoming request {"reqId":"req-1","req":{"method":"GET","url":"/api/products?page=1","hostname":"localhost:3000","remoteAddress":"127.0.0.1"}}
14:32:07 INFO: request completed {"reqId":"req-1","res":{"statusCode":200},"responseTime":12.4}
```

### Production

`NODE_ENV=production` → обычный JSON:

```json
{"level":30,"time":1761135127000,"pid":1,"hostname":"abc123","reqId":"req-1","req":{"method":"GET","url":"/api/products?page=1"},"msg":"incoming request"}
{"level":30,"time":1761135127012,"pid":1,"hostname":"abc123","reqId":"req-1","res":{"statusCode":200},"responseTime":12.4,"msg":"request completed"}
```

**Почему JSON.** Его можно фильтровать по `level`, `reqId`, `res.statusCode`, `responseTime` в любой log-системе. Человеку он читается хуже, но машине — лучше.

> В production-образе нет `pino-pretty` (он dev-зависимость). Поэтому Docker Compose принудительно ставит `NODE_ENV=production`. Если запустить production-образ с `NODE_ENV=development`, транспорт может не найтись.

---

## 3. Уровни логов

| Уровень | Число | Когда использовать | Пример |
| --- | --- | --- | --- |
| `fatal` | 60 | Процесс не может продолжать | Не удалось подключиться к БД при старте |
| `error` | 50 | Операция провалилась, нужен разбор | 500, ошибка Storage |
| `warn` | 40 | Что-то подозрительное, но сервис работает | Redis недоступен, fallback |
| `info` | 30 | Нормальные события | Старт, запрос завершён |
| `debug` | 20 | Детали для разработки | Кэш-ключи, промежуточные значения |
| `trace` | 10 | Очень подробно | Редко нужен |
| `silent` | — | Полностью выключить | Спецсценарии |

Управление: `LOG_LEVEL=info` в env. В production обычно `info`; для разбора инцидента временно `debug`, но помните про объём и чувствительность данных.

---

## 4. Что логирует Fastify автоматически

На каждый HTTP-запрос:

1. **incoming request** — метод, URL, IP, `reqId`.
2. **request completed** — статус, время ответа, `reqId`.

Поля:

- `reqId` — уникальный id запроса в рамках процесса. По нему удобно связать начало и конец.
- `req.method`, `req.url` — что вызвали.
- `req.remoteAddress` — IP клиента (с учётом `trustProxy`).
- `res.statusCode` — результат.
- `responseTime` — миллисекунды.

**Чего нет:** тела запроса, заголовка `Authorization`, пароля, ответа. Это сделано намеренно.

**Важно:** `reqId` есть в логах, но не отдаётся клиенту отдельным заголовком. Если пользователь сообщил время и URL, ищите по ним.

В тестах (`NODE_ENV=test`) логи отключены, чтобы вывод Vitest был чистым.

---

## 5. Что логирует приложение

### 5.1. Старт

```text
[entrypoint] applying database migrations...
[entrypoint] seeding demo data...
[entrypoint] starting API on 0.0.0.0:3000
{"level":30,...,"msg":"Cache backend: redis"}
{"level":30,...,"msg":"Server listening at http://0.0.0.0:3000"}
```

- `Cache backend: redis` — Redis подключён.
- `Cache backend: memory (development)` — Redis недоступен, работает fallback.
- `Server listening` — HTTP-сервер готов.

### 5.2. Кэш

`lib/cache.ts` пишет через `console.warn/info`, поэтому строки начинаются с `[cache]`:

```text
[cache] Redis connection established
[cache] Redis unavailable, using in-memory fallback: connect ECONNREFUSED 127.0.0.1:6379
```

Это не pino-структура, а простой текст. Так сделано, потому что `CacheStore` не имеет доступа к Fastify logger.

### 5.3. Почта

```text
[mail] SMTP is not configured. Password reset link for user@example.com: http://localhost:3000/reset-password?token=...
```

**Чувствительно:** ссылка содержит reset-токен. Это допустимо только локально. В продакшене настройте SMTP; иначе любой, кто видит логи, может сменить пароль.

### 5.4. Seed

```text
[seed] user admin@techstore.local (admin)
[seed] 12 products
[seed] promo SAVE10 (-10%)
[seed] done
```

Повторный seed идемпотентен: `upsert` обновляет существующие записи.

### 5.5. Ошибки Storage

```json
{"level":50,"status":400,"details":"...","msg":"Supabase Storage upload failed"}
```

`details` — ответ Supabase. Может содержать описание проблемы (неверный bucket, права), но не service-role key.

### 5.6. Необработанные ошибки

```json
{"level":50,"err":{"type":"Error","message":"...","stack":"..."},"msg":"Unhandled request error"}
```

Клиенту при этом уходит `500 INTERNAL_SERVER_ERROR` без стека (в production).

### 5.7. Prisma

`lib/prisma.ts`:

```ts
new PrismaClient({ log: isDevelopment ? ['warn', 'error'] : ['error'] })
```

- SQL-запросы **не логируются** по умолчанию.
- В development видны предупреждения и ошибки Prisma.
- В production — только ошибки.

**Почему не логировать каждый SQL.** Это шум, объём и потенциальные персональные данные в параметрах. Для отладки можно временно добавить `'query'`, но не оставляйте это в продакшене.

### 5.8. Health

`GET /health/live` не логирует ничего особенного, кроме стандартного request completed. `GET /health` проверяет БД:

```json
{"status":"ok","database":"up","cache":"redis","uptime":123.45}
```

Если БД недоступна:

```json
{"status":"degraded","database":"down","cache":"redis","uptime":123.45}
```

HTTP-статус будет `503`.

> `cache` здесь — это `cache.backend` (`redis` или `memory`), а не результат ping в момент запроса. То есть health показывает, какой backend выбран, а не проверяет Redis сетью каждый раз.

---

## 6. Как читать логи: практические сценарии

### Сценарий 1. Пользователь получил 500

1. Найдите в логах `request completed` с `statusCode: 500` и запомните `reqId`.
2. Найдите строку `Unhandled request error` с тем же `reqId`.
3. Посмотрите `err.stack` — файл и строка.
4. Проверьте, не является ли это ошибкой БД/Redis/Storage.

### Сценарий 2. Каталог «тормозит»

1. Смотрите `responseTime` в `request completed`.
2. Проверьте заголовки ответа: `X-Cache: HIT` или `MISS`.
3. Если всегда `MISS` — Redis не подключён или ключ всё время разный.
4. Проверьте `Cache backend` при старте и `[cache]`-строки.
5. Если `HIT`, но медленно — проблема в сети/клиенте, не в БД.

### Сценарий 3. После входа корзина пустая

1. В логах найдите `POST /api/cart/merge` и его статус.
2. `200` — merge прошёл; смотрите ответ (в БД через Prisma Studio).
3. `401` — истёк токен; клиент должен обновить его.
4. `404` — товар удалён.
5. `409` — превышен остаток.
6. На клиенте проверьте localStorage: `tech-store-cart` должен очиститься после merge.

### Сценарий 4. CORS-ошибка в браузере

В консоли браузера:

```text
Access to fetch at 'https://api...' from origin 'https://site...' has been blocked by CORS policy
```

1. Проверьте `CORS_ORIGINS` на сервере.
2. Убедитесь, что домен указан **точно** (со схемой, без слэша на конце).
3. Перезапустите API после изменения env.
4. Проверьте preflight:

```bash
curl -i -X OPTIONS "https://api.example.com/api/products" \
  -H "Origin: https://site.example.com" \
  -H "Access-Control-Request-Method: GET"
```

Должны быть `Access-Control-Allow-Origin` и `Access-Control-Allow-Methods`.

### Сценарий 5. Redis недоступен

```text
[cache] Redis unavailable, using in-memory fallback: connect ECONNREFUSED 127.0.0.1:6379
```

- Локально: `docker compose up -d redis`, проверьте `docker exec techstore-redis-1 redis-cli ping` → `PONG`.
- В облаке: проверьте `REDIS_URL` (для Upstash — `rediss://` с TLS), доступность из Render.
- API продолжит работать на memory fallback, но кэш будет у каждого инстанса свой.

### Сценарий 6. Не применяются миграции

```text
[entrypoint] applying database migrations...
Error: P1001: Can't reach database server at ...
```

- Проверьте `DATABASE_URL`/`DIRECT_URL`.
- В Supabase используйте pooler для приложения и direct для миграций.
- Проверьте, что IP Render не заблокирован (Supabase обычно не блокирует).
- `P3009` — неудачная миграция в истории; нужно разобраться вручную, не удаляя таблицу `_prisma_migrations`.

### Сценарий 7. Не стартует из-за env

```text
Invalid environment configuration:
  - JWT_SECRET: JWT_SECRET must contain at least 16 characters
```

Исправьте переменную и перезапустите. Это fail-fast: лучше не стартовать, чем работать с небезопасным секретом.

### Сценарий 8. Порт занят

```text
Failed to start HTTP server ... EADDRINUSE
```

- Локально: остановите другой процесс или смените `PORT`.
- В Docker: проверьте, не занят ли `3000` на хосте.

---

## 7. Команды для просмотра логов

### Docker Compose

```bash
# все сервисы
docker compose logs -f

# только API, последние 200 строк
docker compose logs -f --tail=200 app

# только PostgreSQL
docker compose logs -f postgres

# только Redis
docker compose logs -f redis

# с временными метками
docker compose logs -f -t app
```

### Конкретный контейнер

```bash
docker logs -f techstore-app-1
docker logs --tail 100 techstore-postgres-1
```

### Render

В dashboard: **Service → Logs**. Обычно есть фильтр по времени и поиск. Логи — это stdout контейнера, то есть те же JSON-строки.

### Локальный API без Docker

```bash
cd server
LOG_LEVEL=debug npm run dev
```

В PowerShell:

```powershell
$env:LOG_LEVEL="debug"; npm run dev
```

---

## 8. Что в логах **не** видно

| Данные | Видно? | Почему |
| --- | --- | --- |
| Тело запроса | Нет | Pino не логирует body по умолчанию |
| Заголовок `Authorization` | Нет | Не логируется |
| Пароль | Нет | Не логируется |
| Access/refresh токены | Нет | Не логируются |
| Reset-токен | **Да, в dev без SMTP** | Ссылка пишется в `[mail]` |
| SQL-запросы | Нет (по умолчанию) | Prisma log = warn/error |
| Ответы API | Нет | Не логируются |
| Redis-команды | Нет | ioredis не настроен на debug |
| IP клиента | Да | `req.remoteAddress` |
| Время ответа | Да | `responseTime` |

Если нужно временно увидеть SQL, измените `lib/prisma.ts`:

```ts
new PrismaClient({ log: ['query', 'warn', 'error'] })
```

Не коммитьте это в production-ветку: в параметрах могут быть email и другие данные.

---

## 9. Уровни и объём

- `info` — норма. Один запрос = две строки.
- `debug` — включайте точечно; на нагрузке объём резко растёт.
- `error` — обязательно мониторьте. В идеале — алерт на рост 5xx.
- В Render/Docker ротация логов зависит от платформы; проверьте лимиты тарифа.

---

## 10. Как добавить полезный лог

Правила:

1. Логируйте **событие**, а не каждую строку.
2. Не логируйте секреты и персональные данные.
3. Используйте `request.log` внутри обработчиков, чтобы был `reqId`.
4. Для ошибок передавайте объект: `request.log.error({ err: error }, 'message')`.
5. Не заменяйте обработку ошибок логированием: ошибка должна ещё и вернуть корректный статус.

Пример:

```ts
request.log.warn(
  { userId: request.user.sub, productId: request.params.id },
  'Product disappeared between cart read and update',
)
```

---

## 11. Быстрая шпаргалка

| Симптом | Первая команда | Что смотреть |
| --- | --- | --- |
| API не отвечает | `docker compose ps` | контейнер `app` healthy? |
| 500 | `docker compose logs --tail=200 app` | `Unhandled request error`, stack |
| 401 после 15 минут | логи `POST /api/auth/refresh` | 200 или 401? |
| 429 | логи `request completed` | статус 429, какой маршрут |
| Каталог старый | `curl -i .../api/products` | `X-Cache` |
| Redis не работает | `docker exec ... redis-cli ping` | `PONG` |
| БД не работает | `docker compose logs postgres` | `database system is ready` |
| Миграции | `docker compose logs app` | `prisma migrate deploy` |
| Storage | логи `Supabase Storage upload failed` | `status`, `details` |
| Письмо не пришло | `[mail]` в логах | SMTP не настроен? |

---

## 12. Приватность логов

Логи — тоже данные. Нельзя:

- логировать пароли и токены;
- логировать полные номера карт/паспортов;
- хранить логи вечно;
- давать к ним доступ всем.

В проекте есть одно чувствительное место — ссылка сброса пароля в логе при отсутствии SMTP. Это осознанное упрощение для локальной разработки. В продакшене:

1. настройте SMTP;
2. не включайте `EXPOSE_RESET_TOKEN`;
3. ограничьте доступ к логам;
4. настройте срок хранения.
