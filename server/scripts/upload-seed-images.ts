/**
 * Uploads the demo product images to a public Supabase Storage bucket and
 * rewrites product.images to the returned public URLs.
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SUPABASE_STORAGE_BUCKET=product-images \
 *   npm run storage:seed
 */
import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'
import { products } from '../prisma/seed-data.js'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const authHeaders = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
}

async function ensureBucket(): Promise<void> {
  const bucket = env.SUPABASE_STORAGE_BUCKET
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
    headers: authHeaders,
  })

  if (response.ok) {
    console.log(`[storage] bucket "${bucket}" already exists`)
    return
  }

  if (response.status !== 404) {
    throw new Error(`Could not check bucket: ${response.status} ${await response.text()}`)
  }

  const create = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: env.UPLOAD_MAX_BYTES,
      allowed_mime_types: Object.keys(MIME_EXTENSIONS),
    }),
  })

  if (!create.ok) {
    throw new Error(`Could not create bucket: ${create.status} ${await create.text()}`)
  }

  console.log(`[storage] created public bucket "${bucket}"`)
}

async function uploadProductImage(productId: string, sourceUrl: string): Promise<string> {
  const bucket = env.SUPABASE_STORAGE_BUCKET
  const source = await fetch(sourceUrl)
  if (!source.ok) {
    throw new Error(`Could not download ${sourceUrl}: ${source.status}`)
  }

  const contentType = (source.headers.get('content-type') || 'image/jpeg').split(';')[0]!
  const extension = MIME_EXTENSIONS[contentType] ?? 'jpg'
  const objectPath = `seed/${productId}.${extension}`
  const body = new Uint8Array(await source.arrayBuffer())

  const upload = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body,
    },
  )

  if (!upload.ok) {
    throw new Error(`Upload failed: ${upload.status} ${await upload.text()}`)
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
}

async function main(): Promise<void> {
  await ensureBucket()

  for (const product of products) {
    const sourceUrl = product.images[0]
    if (!sourceUrl) continue

    try {
      const publicUrl = await uploadProductImage(product.id, sourceUrl)
      await prisma.product.update({
        where: { id: product.id },
        data: { images: [publicUrl, publicUrl, publicUrl] },
      })
      console.log(`[storage] ${product.title} -> ${publicUrl}`)
    } catch (error) {
      console.error(`[storage] failed for ${product.title}:`, error)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
