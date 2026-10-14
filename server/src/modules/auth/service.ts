import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { User } from '@prisma/client'
import { env } from '../../config/env.js'
import { conflict, unauthorized } from '../../lib/errors.js'
import { sendPasswordResetEmail } from '../../lib/mailer.js'
import { prisma } from '../../lib/prisma.js'
import { createOpaqueToken, hashToken } from '../../lib/tokens.js'
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
} from './schemas.js'

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const serializeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
})

const signAccessToken = (app: FastifyInstance, user: User): string =>
  app.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: env.JWT_EXPIRES_IN },
  )

type TokenPair = {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

async function issueTokenPair(app: FastifyInstance, user: User): Promise<TokenPair> {
  const refreshToken = createOpaqueToken()
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
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
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ])

  return {
    accessToken: signAccessToken(app, user),
    refreshToken,
    expiresIn: env.JWT_EXPIRES_IN,
  }
}

const authResponse = (user: User, tokens: TokenPair) => ({
  user: serializeUser(user),
  ...tokens,
})

export async function registerUser(app: FastifyInstance, body: RegisterBody) {
  const email = normalizeEmail(body.email)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw conflict('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists')
  }

  const passwordHash = await bcrypt.hash(body.password, env.BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'customer',
      cart: { create: {} },
    },
  })

  const tokens = await issueTokenPair(app, user)
  return authResponse(user, tokens)
}

export async function loginUser(app: FastifyInstance, body: LoginBody) {
  const email = normalizeEmail(body.email)
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    // Keep the timing closer to the "wrong password" branch.
    await bcrypt.compare(body.password, '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7W1z5Qh1oE9g9fB8m1j3k5l7n9p1q3r')
    throw unauthorized('Invalid email or password')
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash)
  if (!valid) {
    throw unauthorized('Invalid email or password')
  }

  const tokens = await issueTokenPair(app, user)
  return authResponse(user, tokens)
}

export async function refreshSession(app: FastifyInstance, refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  })

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw unauthorized('Refresh token is invalid or expired')
  }

  const nextToken = createOpaqueToken()
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
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

export async function logoutSession(refreshToken?: string): Promise<void> {
  if (!refreshToken) return
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw unauthorized('The account no longer exists')
  return serializeUser(user)
}

export async function requestPasswordReset(body: ForgotPasswordBody) {
  const email = normalizeEmail(body.email)
  const user = await prisma.user.findUnique({ where: { email } })
  const genericMessage =
    'If an account with this email exists, a password reset link has been sent.'

  let resetToken: string | undefined

  if (user) {
    const rawToken = createOpaqueToken()
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1_000)

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt,
        },
      }),
    ])

    const baseUrl = env.APP_PUBLIC_URL.replace(/\/$/, '')
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
      })
    } catch (error) {
      // Do not reveal delivery problems to the client, but keep them in logs.
      console.error('[auth] Failed to send password reset email:', error)
    }

    if (env.EXPOSE_RESET_TOKEN) {
      resetToken = rawToken
    }
  }

  return {
    message: genericMessage,
    ...(resetToken ? { resetToken } : {}),
  }
}

export async function resetPassword(body: ResetPasswordBody) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(body.token) },
    include: { user: true },
  })

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw unauthorized('Password reset link is invalid or has expired')
  }

  const passwordHash = await bcrypt.hash(body.password, env.BCRYPT_ROUNDS)
  const now = new Date()

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ])

  return { message: 'Password has been updated. You can sign in with the new password.' }
}
