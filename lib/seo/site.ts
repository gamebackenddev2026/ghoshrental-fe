export const SITE_NAME = 'Ghost Rentals'

export const DEFAULT_SITE_DESCRIPTION =
  'Rent luxury cars, yachts, and chauffeur services in Dubai with Ghost Rentals. Premium fleet, transparent pricing, and 24/7 support across the UAE.'

export const PRODUCTION_SITE_ORIGIN = 'https://www.ghostrentals.com'

const DEFAULT_OG_IMAGE_PATH = '/assets/home/services/luxury-car-rental-services-dubai.webp'

/** Public site origin for canonical URLs, sitemap, and JSON-LD. */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    PRODUCTION_SITE_ORIGIN

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '')
  }

  if (raw) {
    return `https://${raw.replace(/\/+$/, '')}`
  }

  return PRODUCTION_SITE_ORIGIN
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getSiteOrigin()}${normalized}`
}

export function defaultOgImageUrl(): string {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH)
}
