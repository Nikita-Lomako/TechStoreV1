import 'dotenv/config'
import { z } from 'zod'

const booleanFromString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
    })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: booleanFromString(true),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  REDIS_TTL_SECONDS: z.coerce.number().int().min(5).max(86_400).default(90),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must contain at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(15),
  EXPOSE_RESET_TOKEN: booleanFromString(false),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:4173,https://nikita-lomako.github.io'),
  PUBLIC_API_URL: z.string().default('http://localhost:3000'),
  APP_PUBLIC_URL: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(10_000).default(200),
  SWAGGER_ENABLED: booleanFromString(true),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('product-images'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1024).max(20 * 1024 * 1024).default(5 * 1024 * 1024),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_SECURE: booleanFromString(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('TechStore <no-reply@techstore.local>'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n')
  console.error(`Invalid environment configuration:\n${issues}`)
  process.exit(1)
}

export const env = parsed.data

// Prisma CLI reads DIRECT_URL separately. Falling back to DATABASE_URL keeps
// local development working with a single connection string.
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = env.DATABASE_URL
}

export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
