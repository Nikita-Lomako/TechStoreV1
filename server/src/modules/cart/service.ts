import { Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { computeCartTotals, roundMoney } from '../../lib/money.js'
import { prisma } from '../../lib/prisma.js'
import { toProductDto } from '../products/service.js'
import type {
  AddCartItemBody,
  ApplyPromoBody,
  CartResponse,
  MergeCartBody,
  UpdateCartItemBody,
} from './schemas.js'

const cartInclude = Prisma.validator<Prisma.CartInclude>()({
  promoCode: true,
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: true },
  },
})

type CartWithRelations = Prisma.CartGetPayload<{ include: typeof cartInclude }>

const ensureCart = (userId: string) =>
  prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: cartInclude,
  })

const isPromoUsable = (promo: CartWithRelations['promoCode']): boolean => {
  if (!promo || !promo.isActive) return false
  if (promo.validUntil && promo.validUntil <= new Date()) return false
  return true
}

async function loadCart(userId: string): Promise<CartWithRelations> {
  const cart = await ensureCart(userId)

  const deletedItems = cart.items.filter((item) => item.product.deletedAt !== null)
  if (deletedItems.length > 0) {
    await prisma.cartItem.deleteMany({
      where: { id: { in: deletedItems.map((item) => item.id) } },
    })
    cart.items = cart.items.filter((item) => item.product.deletedAt === null)
  }

  if (cart.promoCode && !isPromoUsable(cart.promoCode)) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    })
    cart.promoCode = null
  }

  return cart
}

function toCartResponse(cart: CartWithRelations): CartResponse {
  const discountPercentage = isPromoUsable(cart.promoCode)
    ? (cart.promoCode?.discountPercentage ?? 0)
    : 0

  const items = cart.items.map((item) => {
    const product = toProductDto(item.product)
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      lineTotal: roundMoney(product.price * item.quantity),
      product,
    }
  })

  const totals = computeCartTotals(
    items.map((item) => ({ price: item.product.price, quantity: item.quantity })),
    discountPercentage,
    env.TAX_RATE,
  )

  return {
    id: cart.id,
    items,
    promo: isPromoUsable(cart.promoCode) && cart.promoCode
      ? {
          code: cart.promoCode.code,
          discountPercentage: cart.promoCode.discountPercentage,
        }
      : null,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    totalQuantity: totals.totalQuantity,
    updatedAt: cart.updatedAt.toISOString(),
  }
}

export async function getCart(userId: string): Promise<CartResponse> {
  return toCartResponse(await loadCart(userId))
}

export async function addCartItem(
  userId: string,
  input: AddCartItemBody,
): Promise<CartResponse> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, deletedAt: null },
  })
  if (!product) throw notFound('Product not found')
  if (product.stockQuantity <= 0) {
    throw conflict('OUT_OF_STOCK', 'This product is currently out of stock')
  }
  if (input.quantity > product.stockQuantity) {
    throw conflict('INSUFFICIENT_STOCK', `Only ${product.stockQuantity} items are available`)
  }

  const cart = await ensureCart(userId)
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
  })

  const nextQuantity = Math.min(99, (existing?.quantity ?? 0) + input.quantity)
  if (nextQuantity > product.stockQuantity) {
    throw conflict(
      'INSUFFICIENT_STOCK',
      `Only ${product.stockQuantity} items are available`,
    )
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    create: { cartId: cart.id, productId: product.id, quantity: nextQuantity },
    update: { quantity: nextQuantity },
  })

  return getCart(userId)
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemBody,
): Promise<CartResponse> {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true },
  })
  if (!item) throw notFound('Cart item not found')

  if (input.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
    return getCart(userId)
  }

  if (item.product.deletedAt) throw notFound('Product not found')
  if (input.quantity > item.product.stockQuantity) {
    throw conflict(
      'INSUFFICIENT_STOCK',
      `Only ${item.product.stockQuantity} items are available`,
    )
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: input.quantity },
  })

  return getCart(userId)
}

export async function removeCartItem(userId: string, itemId: string): Promise<CartResponse> {
  const result = await prisma.cartItem.deleteMany({
    where: { id: itemId, cart: { userId } },
  })
  if (result.count === 0) throw notFound('Cart item not found')
  return getCart(userId)
}

export async function clearCart(userId: string): Promise<CartResponse> {
  const cart = await ensureCart(userId)
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cart.update({ where: { id: cart.id }, data: { promoCodeId: null } }),
  ])
  return getCart(userId)
}

export async function applyPromoCode(
  userId: string,
  input: ApplyPromoBody,
): Promise<CartResponse> {
  const code = input.code.trim().toUpperCase()
  const promo = await prisma.promoCode.findUnique({ where: { code } })

  if (!isPromoUsable(promo)) {
    throw badRequest('INVALID_PROMO_CODE', 'Promo code is invalid or expired')
  }

  const cart = await ensureCart(userId)
  await prisma.cart.update({
    where: { id: cart.id },
    data: { promoCodeId: promo?.id ?? null },
  })

  return getCart(userId)
}

export async function removePromoCode(userId: string): Promise<CartResponse> {
  const cart = await ensureCart(userId)
  await prisma.cart.update({
    where: { id: cart.id },
    data: { promoCodeId: null },
  })
  return getCart(userId)
}

/**
 * Merges a guest (localStorage) cart into the authenticated cart after login.
 * Unknown or deleted products are skipped, quantities are capped by stock.
 */
export async function mergeGuestCart(
  userId: string,
  input: MergeCartBody,
): Promise<CartResponse> {
  if (input.items.length === 0) return getCart(userId)

  const cart = await ensureCart(userId)
  const productIds = [...new Set(input.items.map((item) => item.productId))]

  const [products, existingItems] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    }),
    prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: { in: productIds } },
    }),
  ])

  const productById = new Map(products.map((product) => [product.id, product]))
  const existingByProduct = new Map(
    existingItems.map((item) => [item.productId, item]),
  )

  const operations: Prisma.PrismaPromise<unknown>[] = []

  for (const item of input.items) {
    const product = productById.get(item.productId)
    if (!product || product.stockQuantity <= 0) continue

    const existing = existingByProduct.get(item.productId)
    const quantity = Math.min(
      99,
      product.stockQuantity,
      (existing?.quantity ?? 0) + item.quantity,
    )
    if (quantity <= 0) continue

    operations.push(
      prisma.cartItem.upsert({
        where: {
          cartId_productId: { cartId: cart.id, productId: product.id },
        },
        create: {
          cartId: cart.id,
          productId: product.id,
          quantity,
        },
        update: { quantity },
      }),
    )
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations)
  }

  return getCart(userId)
}
