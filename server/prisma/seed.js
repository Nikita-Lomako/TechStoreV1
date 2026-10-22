import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { products, promoCodes, users } from './seed-data.js'

const prisma = new PrismaClient()
const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)

async function seedUsers() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, rounds)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        role: user.role,
        cart: { create: {} },
      },
    })
    console.log(`[seed] user ${user.email} (${user.role})`)
  }
}

async function seedProducts() {
  for (const product of products) {
    const data = {
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      longDescription: product.longDescription,
      price: product.price,
      rating: product.rating,
      category: product.category,
      images: product.images,
      reviewCount: product.reviewCount,
      highlights: product.highlights,
      specifications: product.specifications,
      freeShipping: product.freeShipping,
      stockQuantity: product.stockQuantity,
      deletedAt: null,
    }

    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: {
        id: product.id,
        ...data,
        createdAt: product.createdAt,
      },
    })
  }
  console.log(`[seed] ${products.length} products`)
}

async function seedPromoCodes() {
  for (const promo of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {
        discountPercentage: promo.discountPercentage,
        isActive: promo.isActive,
      },
      create: promo,
    })
    console.log(`[seed] promo ${promo.code} (-${promo.discountPercentage}%)`)
  }
}

async function main() {
  await seedUsers()
  await seedProducts()
  await seedPromoCodes()

  console.log('\n[seed] done')
  console.log('[seed] admin:    admin@techstore.local / Admin123!')
  console.log('[seed] customer: customer@techstore.local / Customer123!')
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
