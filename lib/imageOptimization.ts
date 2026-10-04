import { API_ORIGIN, FALLBACK_SITE_ORIGIN } from './config'

const STATIC_OPTIMIZABLE_HOSTS = new Set([
  'www.ghostrentals.com',
  'ghostrentals.com',
  'ghostrentals-media.s3.ap-south-1.amazonaws.com',
  'lh3.googleusercontent.com',
  'ui-avatars.com',
])

/** Preset `sizes` for common layout slots. */
export const IMAGE_SIZES = {
  hero: '100vw',
  card: '(max-width: 575px) 90vw, (max-width: 992px) 45vw, (max-width: 1280px) 33vw, 320px',
  cardThumb: '(max-width: 575px) 90vw, (max-width: 992px) 45vw, 280px',
  gallery: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px',
  // Product detail hero image: single column below 1200px (full container width,
  // not 50vw), two-column above it with a fixed 420px side card — matches
  // .layoutGrid / .container in productDetailPage.module.css so the browser
  // doesn't request an undersized source and upscale it (causes visible blur).
  productGallery: '(max-width: 767px) 100vw, (max-width: 1199px) calc(100vw - 64px), (max-width: 1745px) calc(100vw - 500px), 1245px',
  brand: '120px',
  avatar: '50px',
} as const

function apiHostname(): string | null {
  try {
    return new URL(API_ORIGIN).hostname
  } catch {
    return null
  }
}

function fallbackHostname(): string | null {
  try {
    return new URL(FALLBACK_SITE_ORIGIN).hostname
  } catch {
    return null
  }
}

/** Whether Next.js `<Image>` can optimize this source (non-SVG, allowed host). */
export function isOptimizableImageSrc(src: string): boolean {
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('data:')) return false
  if (/\.svg(\?|$)/i.test(trimmed)) return false

  if (trimmed.startsWith('/')) return true

  try {
    const { hostname } = new URL(trimmed)
    if (STATIC_OPTIMIZABLE_HOSTS.has(hostname)) return true
    if (hostname === apiHostname()) return true
    if (hostname === fallbackHostname()) return true
    return false
  } catch {
    return false
  }
}
