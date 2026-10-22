import type { FastifyReply, FastifyRequest } from 'fastify'
import { forbidden, unauthorized } from '../lib/errors.js'

export type AuthUser = {
  sub: string
  email: string
  role: 'customer' | 'admin'
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    throw unauthorized('A valid Bearer token is required')
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(request, reply)
  if (request.user.role !== 'admin') {
    throw forbidden('This action requires the admin role')
  }
}
