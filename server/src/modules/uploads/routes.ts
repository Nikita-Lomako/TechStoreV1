import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { env } from '../../config/env.js'
import { AppError, badRequest, serviceUnavailable } from '../../lib/errors.js'
import { ErrorResponseSchema } from '../../lib/schemas.js'
import { requireAdmin } from '../../plugins/auth.js'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

const UploadResponseSchema = Type.Object({
  url: Type.String(),
  path: Type.String(),
  contentType: Type.String(),
  size: Type.Integer(),
})

export const uploadRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/api/uploads',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'Upload a product image to Supabase Storage (admin only)',
        description:
          'Send the image as multipart/form-data with the field name "file". Returns a public URL that can be used in product.images.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: UploadResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          413: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw serviceUnavailable(
          'STORAGE_NOT_CONFIGURED',
          'Supabase Storage is not configured on this server',
        )
      }

      const part = await request.file({
        limits: {
          files: 1,
          fileSize: env.UPLOAD_MAX_BYTES,
        },
      })

      if (!part) throw badRequest('A multipart file field named "file" is required')

      const extension = MIME_EXTENSIONS[part.mimetype]
      if (!extension) {
        throw badRequest(
          'Unsupported image type. Allowed: JPEG, PNG, WebP, AVIF, GIF',
        )
      }

      const buffer = await part.toBuffer()
      if (buffer.byteLength === 0) throw badRequest('Uploaded file is empty')

      const objectPath = `products/${Date.now()}-${randomUUID()}.${extension}`
      const baseUrl = env.SUPABASE_URL.replace(/\/$/, '')
      const uploadUrl = `${baseUrl}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}/${objectPath}`

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': part.mimetype,
          'x-upsert': 'true',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        body: new Uint8Array(buffer),
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        request.log.error(
          { status: response.status, details },
          'Supabase Storage upload failed',
        )
        throw new AppError(
          502,
          'STORAGE_UPLOAD_FAILED',
          'Could not upload the image to Supabase Storage',
        )
      }

      const publicUrl = `${baseUrl}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${objectPath}`

      return reply.code(201).send({
        url: publicUrl,
        path: objectPath,
        contentType: part.mimetype,
        size: buffer.byteLength,
      })
    },
  )
}
