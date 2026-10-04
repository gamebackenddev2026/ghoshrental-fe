import type { ProductDetailModel, ProductMode } from '@/lib/api/productAdapters'
import { SITE_NAME } from './site'

export function productSeoTitle(product: ProductDetailModel, mode: ProductMode): string {
  if (mode === 'lease') {
    return `Lease ${product.name} in Dubai`
  }

  if (product.meta_title?.trim()) return product.meta_title.trim()

  return `${product.name} - Luxury Rental | ${SITE_NAME}`
}

export function productSeoDescription(product: ProductDetailModel, mode: ProductMode): string {
  if (mode === 'lease') {
    return `Lease a ${product.name} in Dubai with ${SITE_NAME}. Flexible monthly lease-to-own plans, no large down payment.`
  }

  if (product.meta_description?.trim()) return product.meta_description.trim()

  if (product.short_description?.trim()) return product.short_description.trim()

  return `Book ${product.name} rental in Dubai with ${SITE_NAME}.`
}
