import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { env } from '../../config/env.js'
import { ErrorResponseSchema, MessageResponseSchema, UserSchema } from '../../lib/schemas.js'
import { authenticate } from '../../plugins/auth.js'
import {
  AuthResponseSchema,
  ForgotPasswordBodySchema,
  ForgotPasswordResponseSchema,
  LoginBodySchema,
  LogoutBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
} from './schemas.js'
import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from './service.js'

const unauthorizedResponse = {
  401: ErrorResponseSchema,
  429: ErrorResponseSchema,
}

async function renderPage(fileName: string): Promise<string> {
  const raw = await readFile(path.join(process.cwd(), 'public', fileName), 'utf8')
  return raw.replaceAll('__FRONTEND_URL__', env.FRONTEND_URL)
}

export const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/api/auth/register',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Register a customer account',
        body: RegisterBodySchema,
        response: {
          201: AuthResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await registerUser(app, request.body)
      return reply.code(201).send(result)
    },
  )

  app.post(
    '/api/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Sign in and receive JWT access and refresh tokens',
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          ...unauthorizedResponse,
        },
      },
    },
    async (request) => loginUser(app, request.body),
  )

  app.post(
    '/api/auth/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Rotate a refresh token and issue a new access token',
        body: RefreshBodySchema,
        response: {
          200: AuthResponseSchema,
          ...unauthorizedResponse,
        },
      },
    },
    async (request) => refreshSession(app, request.body.refreshToken),
  )

  app.post(
    '/api/auth/logout',
    {
      config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        body: LogoutBodySchema,
        response: {
          204: Type.Null(),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await logoutSession(request.body.refreshToken)
      return reply.code(204).send(null)
    },
  )

  app.get(
    '/api/auth/me',
    {
      preHandler: authenticate,
      schema: {
        tags: ['Auth'],
        summary: 'Return the currently authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: UserSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => getCurrentUser(request.user.sub),
  )

  app.post(
    '/api/auth/forgot-password',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Send a short-lived password reset link',
        description:
          'Always returns 202 to avoid account enumeration. The reset link is valid for a limited time and can be used once.',
        body: ForgotPasswordBodySchema,
        response: {
          202: ForgotPasswordResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await requestPasswordReset(request.body)
      return reply.code(202).send(result)
    },
  )

  app.post(
    '/api/auth/reset-password',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Set a new password using a one-time reset token',
        body: ResetPasswordBodySchema,
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) => resetPassword(request.body),
  )

  // Minimal, dependency-free pages. They load much faster than the SPA bundle
  // and are intentionally served by the API origin so reset links stay short.
  app.get(
    '/forgot-password',
    { schema: { hide: true } },
    async (_request, reply) => {
      const html = await renderPage('forgot-password.html')
      return reply
        .type('text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .send(html)
    },
  )

  app.get(
    '/reset-password',
    { schema: { hide: true } },
    async (_request, reply) => {
      const html = await renderPage('reset-password.html')
      return reply
        .type('text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .send(html)
    },
  )
}
