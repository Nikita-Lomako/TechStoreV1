# 06. Деплой: пошаговая инструкция

> **Статус.** В этом проекте облачный деплой уже выполнен: API работает на Render, PostgreSQL и Storage — в Supabase, кэш — в Upstash Redis, фронтенд — на GitHub Pages. Ниже — воспроизводимая инструкция. Названия кнопок в панелях провайдеров могут меняться — ориентируйтесь на смысл, а не на точный текст.

Цель деплоя:

```text
GitHub Pages (статика React)
        │  HTTPS + VITE_API_URL
        ▼
Render (Docker-контейнер Fastify)
        ├── Supabase PostgreSQL (данные)
        ├── Upstash Redis (кэш каталога)
        ├── Supabase Storage (картинки товаров)
        └── SMTP (письма сброса пароля, опционально)
```

Текущие адреса проекта:

- фронтенд: <https://nikita-lomako.github.io/TechStoreV1/>;
- API: <https://techstore-api-nl.onrender.com>;
- Swagger: <https://techstore-api-nl.onrender.com/docs>.

---

## 0. Что понадобится

| Что | Зачем |
| --- | --- |
| Аккаунт GitHub | Репозиторий, GitHub Pages, деплой в Render |
| Аккаунт Supabase | PostgreSQL + Storage |
| Аккаунт Upstash (или другой Redis) | Кэш каталога в облаке |
| Аккаунт Render | Запуск Docker-контейнера API |
| Docker Desktop | Локальная проверка |
| Node.js 22+ (лучше 24) | Сборка фронтенда и локальный API |
| Git | Пуш кода |
| SMTP-аккаунт (опционально) | Реальные письма сброса пароля |

Проверьте локально:

```bash
docker --version
docker compose version
node --version
npm --version
git --version
```

---

## 1. Сначала проверьте всё локально

Не деплойте то, что не работает локально. Это сэкономит время.

### 1.1. Запуск полного стека

В корне репозитория:

```bash
cp .env.example .env
# при необходимости откройте .env и задайте JWT_SECRET
docker compose up --build
```

В PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up --build
```

Проверьте:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Health: <http://localhost:3000/health/live>
- Каталог: `curl -i "http://localhost:3000/api/products?limit=2"`
- Вход: `admin@techstore.local` / `Admin123!`
- Корзина: войдите как `customer@techstore.local` / `Customer123!`

Остановить:

```bash
docker compose down
```

Удалить и данные:

```bash
docker compose down -v
```

### 1.2. Проверка кода

```bash
# backend
cd server
npm install
npm test
npm run typecheck
npm run build

# frontend
cd ..
npm install
npm run lint
npm run build
```

Если что-то падает — исправьте до деплоя. На Render отладка медленнее.

---

## 2. Supabase: база данных

### 2.1. Создание проекта

1. Войдите в <https://supabase.com>.
2. **New project**.
3. Выберите организацию, имя проекта (например, `techstore`), регион ближе к вашему API (например, Frankfurt) и надёжный пароль БД. Сохраните пароль в менеджере паролей.
4. Дождитесь инициализации проекта.

### 2.2. Строки подключения

Откройте **Project Settings → Database → Connection string**. Supabase показывает несколько вариантов. Вам нужны два:

| Переменная | Что брать | Зачем |
| --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler**, порт `6543`, с `pgbouncer=true` | Постоянные запросы приложения |
| `DIRECT_URL` | **Direct connection** или **Session pooler**, порт `5432` | Миграции Prisma |

Пример (подставьте свои значения из панели):

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Почему так:

- **Pooler** переиспользует соединения. Prisma в контейнере не должна открывать десятки прямых подключений и исчерпывать лимит Supabase.
- **`connection_limit=1`** рекомендован для transaction pooler: одна транзакция — одно соединение.
- **`DIRECT_URL`** нужен Prisma CLI для миграций, потому что DDL через transaction pooler может вести себя иначе.
- **`sslmode=require`** включает TLS. Если провайдер уже включает SSL по умолчанию, параметр не помешает.

> Если в вашей панели Supabase другие имена хостов (например, `aws-1-...`), просто скопируйте строки как есть. Главное — порт `6543` для приложения и `5432` для миграций.

### 2.3. Расширение `pg_trgm`

Миграция содержит:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Supabase обычно разрешает это. Если миграция упадёт с ошибкой прав:

1. Откройте **Database → Extensions**.
2. Найдите `pg_trgm` и включите её вручную.
3. Повторите `prisma migrate deploy`.

### 2.4. Применение миграций

Вариант A — с локальной машины (рекомендуется для первого раза):

```bash
cd server
cp .env.example .env
# заполните DATABASE_URL и DIRECT_URL из Supabase
npx prisma migrate deploy
npm run db:seed
```

В PowerShell:

```powershell
cd server
Copy-Item .env.example .env
notepad .env
npx prisma migrate deploy
npm run db:seed
```

Вариант B — доверить контейнеру: entrypoint выполнит `prisma migrate deploy` при старте, если `RUN_MIGRATIONS=true`. Для этого `DIRECT_URL` **обязательно** должна быть задана в окружении Render: Prisma читает её до запуска `env.ts`.

### 2.5. Seed

Seed создаёт:

- 12 товаров;
- `admin@techstore.local` / `Admin123!`;
- `customer@techstore.local` / `Customer123!`;
- промокоды `SAVE10` и `WELCOME5`.

```bash
cd server
npm run db:seed
```

Повторный запуск безопасен: используется `upsert`. Но он **перезаписывает** пароли demo-аккаунтов и поля товаров. В продакшене после первого запуска ставьте `RUN_SEED=false`.

> Смените пароль администратора после первого входа. В проекте нет отдельной админки пользователей; проще всего воспользоваться сбросом пароля (нужен SMTP) или обновить хэш через скрипт/Prisma Studio.

---

## 3. Supabase: Storage для картинок

1. Откройте **Storage**.
2. **New bucket**.
3. Имя: `product-images` (или своё, тогда измените `SUPABASE_STORAGE_BUCKET`).
4. Включите **Public bucket**, потому что API возвращает публичные URL и фронтенд показывает их напрямую.
5. Сохраните.

Доступы:

- `SUPABASE_URL` — **Project URL** из **Project Settings → API** (например, `https://<ref>.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` — **service_role** ключ оттуда же.

**Service-role key обходит RLS и даёт полный доступ.** Он используется только сервером (`server/src/modules/uploads/routes.ts`). Никогда не добавляйте его в `VITE_*` и не отправляйте в браузер.

Проверка после деплоя: войдите админом, откройте `/admin/products`, загрузите изображение. Если Storage не настроен, API вернёт `503 STORAGE_NOT_CONFIGURED`; если ключ неверный — `502 STORAGE_UPLOAD_FAILED`.

---

## 4. Redis в облаке (Upstash или аналог)

Локально Redis поднимается в Compose, но на Render отдельного контейнера нет. Нужен managed Redis.

### 4.1. Upstash

1. Войдите в <https://upstash.com>.
2. **Create Database**.
3. Выберите регион рядом с Render (например, Frankfurt / eu-central).
4. Тип: Regional, TLS включён.
5. Скопируйте **Redis URL** вида:

```env
REDIS_URL=rediss://default:<password>@<host>:6379
```

Обратите внимание на `rediss://` — это TLS. `ioredis` поддерживает такой URL.

### 4.2. Настройки

- Для кэша подходит политика вытеснения `allkeys-lru`.
- TTL задаёт приложение (`REDIS_TTL_SECONDS=90`), поэтому записи и так исчезают.
- Не храните в этом Redis ничего, кроме кэша: при вытеснении данные пропадут.

### 4.3. Проверка

После деплоя API в логах должно быть:

```text
[cache] Redis connection established
```

Если видите `[cache] Redis unavailable, using in-memory fallback`, проверьте URL, TLS и доступ из Render.

---

## 5. Render: API

> Проверенная конфигурация этого проекта: сервис `techstore-api-nl`, ветка `master`, Root Directory `server`, Dockerfile Path `Dockerfile`, health check `/health/live`. Render сам задаёт `PORT` (обычно `10000`), поэтому **не добавляйте `PORT` в Environment**.

### 5.1. Подготовка репозитория

Render деплоит из GitHub. Убедитесь, что код запушен в ветку, которую вы хотите деплоить (обычно `master` или `main`):

```bash
git status
git push origin master
```

> Если репозиторий приватный, Render попросит доступ к GitHub.

### 5.2. Создание Web Service

1. Войдите в <https://dashboard.render.com>.
2. **New → Web Service**.
3. Подключите GitHub и выберите репозиторий.
4. **Language**: `Docker`.
5. **Branch**: `master` (или ваша ветка).
6. **Root Directory**: `server`.
   - Это важно: Dockerfile копирует `package.json`, `prisma`, `src` относительно `server/`.
7. **Dockerfile Path**: `Dockerfile` (относительно Root Directory).
8. **Build Command** и **Start Command**: оставьте пустыми — сборка и запуск описаны в Dockerfile и entrypoint.
9. **Health Check Path**: `/health/live`.
10. **Instance Type**: Free для демо; учитывайте холодные старты.
11. Нажмите **Create Web Service**.

Render запустит первый deploy. Если в логах видно `Cloning`, `Checking out`, а затем шаги Docker — настройки сборки верные.

### 5.3. Переменные окружения

Добавьте в Render → **Environment** (значения — свои):

#### Обязательные

```env
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=true
LOG_LEVEL=info

DATABASE_URL=postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://...:5432/postgres?sslmode=require

REDIS_URL=rediss://default:...@...:6379
REDIS_TTL_SECONDS=90

JWT_SECRET=<случайная строка 32+ символа>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=7
BCRYPT_ROUNDS=12
PASSWORD_RESET_TTL_MINUTES=15
EXPOSE_RESET_TOKEN=false

CORS_ORIGINS=https://<user>.github.io
PUBLIC_API_URL=https://<service>.onrender.com
APP_PUBLIC_URL=https://<service>.onrender.com
FRONTEND_URL=https://<user>.github.io/<repo>/

TAX_RATE=0.08
RATE_LIMIT_MAX=200
SWAGGER_ENABLED=true

RUN_MIGRATIONS=true
RUN_SEED=false
```

`PORT` здесь нет намеренно: Render инжектирует его сам, приложение читает `process.env.PORT`.

#### Для загрузки картинок

```env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_STORAGE_BUCKET=product-images
UPLOAD_MAX_BYTES=5242880
```

`SUPABASE_URL` — базовый адрес проекта без `/rest/v1/`.

#### Для писем (опционально, но рекомендуется)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<user>
SMTP_PASS=<password>
MAIL_FROM=TechStore <no-reply@example.com>
```

Для порта `465` обычно `SMTP_SECURE=true`; для `587` — `false` (STARTTLS).

#### Пояснения к URL

- `PUBLIC_API_URL` — адрес API, который Swagger показывает как сервер.
- `APP_PUBLIC_URL` — адрес API, из которого строится ссылка сброса пароля. Обычно совпадает с `PUBLIC_API_URL`.
- `FRONTEND_URL` — куда вернуть пользователя со страницы сброса. Это адрес GitHub Pages (можно с путём репозитория).
- `CORS_ORIGINS` — **origin** фронтенда, без пути и без слэша на конце: `https://user.github.io`. Если у вас custom domain — укажите его.

### 5.4. Генерация `JWT_SECRET`

Bash / Git Bash:

```bash
openssl rand -base64 48
```

PowerShell (.NET RNG):

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Не используйте значение из `.env.example` и не коммитьте секрет.

### 5.5. Первый деплой и seed

Два подхода:

**A. Seed уже выполнен локально** (в Supabase). Тогда `RUN_SEED=false` сразу.

**B. Хотите, чтобы контейнер сам засеял БД.** Поставьте `RUN_SEED=true` на первый деплой. После успешного старта и проверки переключите на `false` и перезапустите сервис. Иначе каждый рестарт будет перезаписывать demo-данные.

`RUN_MIGRATIONS=true` оставляйте включённым: entrypoint применяет только новые миграции, это безопасно и удобно.

### 5.6. Что должно быть в логах

Успешный старт выглядит примерно так:

```text
[entrypoint] applying database migrations...
[entrypoint] starting API on 0.0.0.0:10000
[cache] Redis connection established
Server listening at http://0.0.0.0:10000
```

Если видите `Invalid environment configuration` — проверьте env. Если `P1001` — БД недоступна. Если health check не проходит — проверьте `HOST=0.0.0.0` и что `PORT` не переопределён вручную.

### 5.7. Проверка API

```bash
curl https://<service>.onrender.com/health/live
curl https://<service>.onrender.com/health
curl -i "https://<service>.onrender.com/api/products?limit=2"
```

Ожидаемо:

- `/health/live` → `{"status":"ok",...}`;
- `/health` → `database: up`, `cache: redis`;
- каталог → 12 товаров (если seed был), `X-Cache: MISS`, затем `HIT`.

Swagger: `https://<service>.onrender.com/docs`.

Для текущего деплоя проекта: `https://techstore-api-nl.onrender.com`.

---

## 6. GitHub Pages: фронтенд

### 6.1. Настройка

В корне репозитория:

```bash
npm install
```

Соберите и опубликуйте с адресом API. Удобно хранить его в локальном `.env.production.local` (файл в `.gitignore`):

```env
VITE_API_URL=https://<service>.onrender.com
```

Либо задайте переменную только на одну сборку.

Bash:

```bash
VITE_API_URL=https://<service>.onrender.com npm run deploy
```

PowerShell:

```powershell
$env:VITE_API_URL="https://<service>.onrender.com"
npm run deploy
```

`VITE_API_URL` встраивается в JS-бандл во время сборки. После смены API нужно снова выполнить `npm run deploy`.

Что делает `npm run deploy`:

1. `predeploy` → `npm run build` (Vite создаёт `dist/`);
2. `copy404` копирует `dist/index.html` в `dist/404.html`;
3. `gh-pages -d dist` публикует содержимое в ветку `gh-pages`.

### 6.2. Включение Pages

1. GitHub → репозиторий → **Settings → Pages**.
2. Source: **Deploy from a branch**.
3. Branch: `gh-pages`, folder `/ (root)`.
4. Сохраните.

> Если настройка уже применена, кнопка **Save** может быть неактивна, а страница показывает «Your GitHub Pages site is currently being built from the gh-pages branch». Это нормально: Pages уже включён, идёт сборка.

Через минуту сайт будет доступен по адресу:

```text
https://<user>.github.io/<repo>/
```

Для репозитория `TechStoreV1` это `https://nikita-lomako.github.io/TechStoreV1/`.

### 6.3. Почему используется HashRouter

GitHub Pages не умеет отдавать `index.html` на любой путь. Поэтому маршруты выглядят так:

```text
https://user.github.io/TechStoreV1/#/cart
https://user.github.io/TechStoreV1/#/product/<id>
```

Сервер получает только `/TechStoreV1/`, а всё после `#` разбирает React Router. `base: './'` в `vite.config.js` обеспечивает загрузку JS/CSS из подпапки.

### 6.4. CORS

После публикации добавьте origin Pages в `CORS_ORIGINS` на Render:

```env
CORS_ORIGINS=https://<user>.github.io
```

Если у вас project page, путь **не** добавляется: origin — это только схема + домен. После изменения Environment Render перезапустит сервис автоматически.

### 6.5. Проверка

1. Откройте сайт.
2. Каталог должен загрузиться с API.
3. Войдите как customer.
4. Добавьте товар в корзину, обновите страницу — корзина сохранилась.
5. Войдите как admin — появится ссылка на админку.
6. Загрузите картинку (если Supabase настроен).
7. Проверьте сброс пароля (если SMTP настроен).

Если сайт пустой:

- откройте DevTools → Console/Network;
- проверьте, что `VITE_API_URL` был задан **при сборке**;
- проверьте CORS;
- проверьте, что API отвечает `/health/live`.

---

## 7. Проверка после деплоя

### 7.1. API

```bash
# liveness
curl -i https://<service>.onrender.com/health/live

# readiness (БД)
curl -i https://<service>.onrender.com/health

# каталог и кэш
curl -i "https://<service>.onrender.com/api/products?limit=2"
# повторите — ожидается X-Cache: HIT

# Swagger JSON
curl -s https://<service>.onrender.com/docs/json
```

### 7.2. Вход и корзина

```bash
curl -s -X POST https://<service>.onrender.com/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"customer@techstore.local\",\"password\":\"Customer123!\"}"
```

Скопируйте `accessToken` из ответа и вызовите:

```bash
curl -s https://<service>.onrender.com/api/cart -H "Authorization: Bearer <accessToken>"
```

PowerShell (если curl неудобен):

```powershell
$body = @{ email = "customer@techstore.local"; password = "Customer123!" } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri "https://<service>.onrender.com/api/auth/login" -ContentType "application/json" -Body $body
$response.accessToken
```

### 7.3. CORS preflight

```bash
curl -i -X OPTIONS "https://<service>.onrender.com/api/products" -H "Origin: https://<user>.github.io" -H "Access-Control-Request-Method: GET"
```

Должны быть `Access-Control-Allow-Origin: https://<user>.github.io` и разрешённые методы.

### 7.4. Админка

1. Войдите `admin@techstore.local`.
2. Откройте `#/admin/products`.
3. Создайте тестовый товар с тремя URL картинок.
4. Проверьте, что он появился в каталоге.
5. Измените цену — каталог должен обновиться (кэш инвалидирован).
6. Удалите товар — он исчезнет из каталога и корзин.

### 7.5. Сброс пароля

1. Откройте `https://<service>.onrender.com/forgot-password`.
2. Введите email существующего пользователя.
3. Если SMTP настроен — проверьте почту; если нет — ссылка будет в логах Render.
4. Перейдите по ссылке, задайте новый пароль.
5. Войдите с новым паролем. Старые сессии должны перестать работать.

---

## 8. Эксплуатация

### 8.1. Логи

- Render: **Service → Logs**.
- Локально: `docker compose logs -f app`.
- Подробный разбор — в `05-LOGGING.md`.

### 8.2. Обновление кода

1. Внесите изменения.
2. Прогоните тесты и сборку локально.
3. Запушьте в GitHub.
4. Render пересоберёт образ автоматически (если включён auto-deploy) или нажмите **Redeploy**.
5. Entrypoint применит новые миграции.
6. Для фронтенда повторите `npm run deploy` с актуальным `VITE_API_URL`.

### 8.3. Миграции

- Локально: `npx prisma migrate dev --name <name>`.
- В облаке: `npx prisma migrate deploy` (или entrypoint).
- Никогда не используйте `prisma db push` в продакшене: он не оставляет истории и может потерять данные.
- Перед рискованной миграцией сделайте бэкап.

### 8.4. Бэкапы

Supabase делает резервные копии в зависимости от тарифа. Дополнительно можно снять дамп:

```bash
pg_dump "$DIRECT_URL" --no-owner --no-privileges -Fc -f techstore-backup.dump
```

Восстановление:

```bash
pg_restore --clean --no-owner -d "$DIRECT_URL" techstore-backup.dump
```

Храните дампы вне репозитория и не коммитьте их.

### 8.5. Ротация секретов

Если `JWT_SECRET` утёк:

1. Сгенерируйте новый.
2. Обновите env в Render.
3. Перезапустите сервис.
4. Все старые access-токены станут невалидными; пользователи переавторизуются через refresh. Refresh-токены в БД не зависят от JWT-секрета, но новый access будет подписан уже новым секретом.

Если утёк `SUPABASE_SERVICE_ROLE_KEY`:

1. Отзовите/перегенерируйте ключ в Supabase.
2. Обновите env.
3. Проверьте логи на подозрительные загрузки.

Если утёк пароль БД:

1. Смените пароль в Supabase.
2. Обновите `DATABASE_URL` и `DIRECT_URL`.
3. Перезапустите API.

### 8.6. Откат

**Код API:** в Render выберите предыдущий деплой/коммит и сделайте redeploy.

**Frontend:** пересоберите предыдущий коммит и снова `npm run deploy`.

**БД:** миграции Prisma — forward-only. Если новая миграция уже применена и несовместима со старым кодом:

- восстановите дамп;
- или напишите обратную миграцию вручную;
- или выпустите исправляющий релиз.

Просто «откатить код» без учёта схемы может быть недостаточно.

---

## 9. Troubleshooting

| Симптом | Вероятная причина | Что делать |
| --- | --- | --- |
| Render build fails: `COPY ... not found` | Неверный Root Directory | Root Directory = `server`, Dockerfile Path = `Dockerfile` |
| Render deploy падает сразу после `Checking out` | Неверный Dockerfile Path | Проверьте Root Directory и Dockerfile Path в Settings → Build & Deploy |
| `P1001: Can't reach database server` | Неверный `DATABASE_URL`, pooler/SSL | Скопируйте строку заново, проверьте `sslmode` |
| `P1012: Environment variable not found: DIRECT_URL` | Prisma CLI не видит `DIRECT_URL` | Добавьте `DIRECT_URL` в Environment на Render |
| `P3009` failed migration | Прерванная миграция | Разберитесь в `_prisma_migrations`, не удаляйте таблицу вслепую |
| Health check failed | Порт/хост | Не задавайте `PORT` вручную, оставьте `HOST=0.0.0.0` |
| `[cache] Redis unavailable` | Неверный `REDIS_URL`/TLS | Для Upstash — `rediss://`; проверьте регион |
| CORS error | Домен не в allowlist | Добавьте точный origin, перезапустите API |
| Сайт пустой | `VITE_API_URL` не задан при сборке | Пересоберите с переменной |
| 404 при обновлении страницы | Ожидается для BrowserRouter | Здесь HashRouter; проверьте, что используется он |
| Картинки не грузятся | Bucket не public / неверный ключ | Проверьте Storage и `SUPABASE_*` |
| `503 STORAGE_NOT_CONFIGURED` | Пустые `SUPABASE_URL`/key | Заполните env |
| `502 STORAGE_UPLOAD_FAILED` | Ошибка Supabase | Смотрите `details` в логах |
| Письмо не приходит | SMTP не настроен | Ссылка в логах; настройте SMTP |
| `429 Too many requests` | Rate limit | Подождите или измените `RATE_LIMIT_MAX` |
| `413 Payload Too Large` | Файл > 5 МБ | Уменьшите файл или `UPLOAD_MAX_BYTES` |
| Страница сброса 404 | Неверный `APP_PUBLIC_URL` | Укажите URL Render |
| Seed перезаписал данные | `RUN_SEED=true` | Поставьте `false` |
| Долгий первый запрос | Холодный старт free tier | Это нормально для бесплатных тарифов |

---

## 10. Альтернатива: один VPS с Docker Compose

Если не хотите PaaS, можно поднять весь стек на VPS:

1. Создайте VPS (Ubuntu 22.04/24.04), откройте порты 80/443.
2. Установите Docker и Compose.
3. Клонируйте репозиторий.
4. Создайте `.env` с production-значениями.
5. Запустите:

```bash
docker compose up -d --build
```

6. Поставьте reverse proxy (Caddy проще всего):

```text
api.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

7. Caddy автоматически получит TLS-сертификат.
8. Настройте firewall: наружу только 80/443, PostgreSQL и Redis не публикуйте.
9. Настройте бэкапы volume и мониторинг.

Для учебного проекта это дешевле, но требует администрирования сервера. Render проще для демонстрации.

---

## 11. Ограничения бесплатных тарифов

Тарифы меняются, проверяйте актуальные условия. Типичные ограничения:

- **Supabase free:** проект может «засыпать» после простоя; ограниченный объём БД и Storage; бэкапы ограничены.
- **Upstash free:** лимит команд и памяти; при превышении возможны ошибки.
- **Render free/starter:** ограничение инстансов, холодные старты, лимит часов.
- **GitHub Pages:** только статика, лимит размера, публичный репозиторий (для free-аккаунта).

Для демонстрации этого достаточно. Для реального магазина нужны платные тарифы, мониторинг и бэкапы.

---

## 12. Финальный чек-лист

### Код и секреты

- [ ] Репозиторий запушен, ветка выбрана.
- [ ] `.env` не в Git.
- [ ] `JWT_SECRET` случайный, 32+ символа.
- [ ] `EXPOSE_RESET_TOKEN=false`.
- [ ] `RUN_SEED=false` после первого запуска.
- [ ] Service-role key только в env сервера.

### База

- [ ] Supabase проект создан.
- [ ] `pg_trgm` включён.
- [ ] Миграции применены.
- [ ] Seed выполнен (если нужен демо-каталог).
- [ ] `DIRECT_URL` задан для миграций.

### API

- [ ] Render собирает образ с Root Directory `server` и Dockerfile Path `Dockerfile`.
- [ ] `PORT` не задан вручную, health `/health/live`.
- [ ] `/health` показывает `database: up`.
- [ ] Redis подключён (`cache: redis`).
- [ ] Swagger открывается.
- [ ] Логин работает.
- [ ] Админка и загрузка картинок работают.
- [ ] CORS настроен на домен фронтенда.

### Frontend

- [ ] `VITE_API_URL` указывает на Render при сборке.
- [ ] `npm run deploy` прошёл.
- [ ] Pages настроен на ветку `gh-pages`.
- [ ] Каталог, вход, корзина, админка работают на публичном URL.
- [ ] Прямые hash-ссылки открываются.

### Безопасность и эксплуатация

- [ ] HTTPS включён.
- [ ] Пароль demo-админа изменён.
- [ ] SMTP настроен или ссылка в логах осознанно принята.
- [ ] Бэкап БД снят.
- [ ] Логи проверяются.
- [ ] Есть план отката.


