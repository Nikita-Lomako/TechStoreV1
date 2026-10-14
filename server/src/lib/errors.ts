import { Prisma } from '@prisma/client'
import type { FastifyError, FastifyInstance } from 'fastify'
import { isProduction } from '../config/env.js'

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

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details)

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'FORBIDDEN', message)

export const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message)

export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details)

export const serviceUnavailable = (code: string, message: string) =>
  new AppError(503, code, message)

export const errorResponse = (code: string, message: string, details?: unknown) => ({
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
})

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(errorResponse('ROUTE_NOT_FOUND', `Route ${request.method} ${request.url} not found`))
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send(errorResponse(error.code, error.message, error.details))
      return
    }

    if (error.validation) {
      reply
        .status(400)
        .send(
          errorResponse(
            'VALIDATION_ERROR',
            'Request validation failed',
            error.validation.map((item) => ({
              path: item.instancePath || item.params?.missingProperty || 'request',
              message: item.message,
            })),
          ),
        )
      return
    }

    if (error.statusCode === 429) {
      reply.status(429).send(errorResponse('RATE_LIMITED', error.message || 'Too many requests'))
      return
    }

    if (error.statusCode === 413) {
      reply.status(413).send(errorResponse('PAYLOAD_TOO_LARGE', 'Request payload is too large'))
      return
    }

    if (
      error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
      error.code === 'FST_JWT_BAD_REQUEST' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID'
    ) {
      reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Invalid or expired authentication token'))
      return
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        reply
          .status(409)
          .send(errorResponse('CONFLICT', 'A record with the same unique value already exists'))
        return
      }
      if (error.code === 'P2025') {
        reply.status(404).send(errorResponse('NOT_FOUND', 'Requested record was not found'))
        return
      }
      if (error.code === 'P2003') {
        reply
          .status(409)
          .send(errorResponse('FOREIGN_KEY_CONSTRAINT', 'Related record does not exist'))
        return
      }
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      reply
        .status(error.statusCode)
        .send(errorResponse(error.code ?? 'REQUEST_ERROR', error.message))
      return
    }

    request.log.error({ err: error }, 'Unhandled request error')
    reply
      .status(500)
      .send(
        errorResponse(
          'INTERNAL_SERVER_ERROR',
          isProduction ? 'Internal server error' : error.message,
        ),
      )
  })
}
