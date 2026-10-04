import type { RawMedia } from './api/types'

/** Mirrors {@link API_ORIGIN} without importing `config` (avoids circular deps). */
function apiOriginForMedia(): string {
  let raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://www.ghostrentals.com').trim()
  raw = raw.replace(/\/+$/, '')
  if (raw.toLowerCase().endsWith('/api')) {
    raw = raw.slice(0, -'/api'.length)
  }
  return raw || 'https://www.ghostrentals.com'
}

/** Fallback when the API provides no usable vehicle image URL. */
export const VEHICLE_PLACEHOLDER_SRC = '/assets/images/logo/ghostrentals-logo.png'

export function isAbsoluteMediaUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/** Reject broken CDN paths (missing image extension). Spaces in S3 keys are allowed. */
export function isUsableVehicleImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!isAbsoluteMediaUrl(trimmed)) return false
  try {
    const file = decodeURIComponent(new URL(trimmed).pathname.split('/').pop() ?? '')
    if (!file) return false
    return /\.(webp|jpe?g|png|gif|avif)(\?.*)?$/i.test(file)
  } catch {
    return false
  }
}

/** Banner image/video URL from API (`s3_url`, `src_url`, `url`, or absolute `src`). */
export function isUsableBannerMediaUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!isAbsoluteMediaUrl(trimmed)) return false
  try {
    const file = decodeURIComponent(new URL(trimmed).pathname.split('/').pop() ?? '')
    if (!file || /\s/.test(file)) return false
    return /\.(webp|jpe?g|png|gif|avif|mp4|webm|ogg)(\?.*)?$/i.test(file)
  } catch {
    return false
  }
}

export function resolveBannerMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (isUsableBannerMediaUrl(trimmed)) return trimmed
    return resolveRelativeBannerMediaFilename(trimmed)
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    if (isUsableBannerMediaUrl(trimmed)) return trimmed
    if (!isAbsoluteMediaUrl(trimmed)) {
      const resolved = resolveRelativeBannerMediaFilename(trimmed)
      if (resolved) return resolved
    }
  }
  return ''
}

/** Banner uploads on Ghost Rentals S3 (`s3_url` from the banner API). */
export const BANNER_S3_IMAGE_BASE = 'https://ghostrentals-media.s3.ap-south-1.amazonaws.com/banner/'

function resolveRelativeBannerMediaFilename(filename: string): string {
  const file = filename.trim().replace(/^\/+/, '')
  if (!file) return ''
  if (!/\.(webp|jpe?g|png|gif|avif|mp4|webm|ogg)(\?.*)?$/i.test(file)) return ''

  const s3 = `${BANNER_S3_IMAGE_BASE}${file}`
  if (isUsableBannerMediaUrl(s3)) return s3

  const viaPublic = `${apiOriginForMedia()}/public/banner/${file}`
  return isUsableBannerMediaUrl(viaPublic) ? viaPublic : ''
}

/** Angular: `${baseUrl}/promopopup/${filename}` when the API only returns `src`. */
function resolveRelativePromoMediaFilename(filename: string): string {
  const file = filename.trim().replace(/^\/+/, '')
  if (!file) return ''
  if (!/\.(webp|jpe?g|png|gif|avif)(\?.*)?$/i.test(file)) return ''
  return `${apiOriginForMedia()}/promopopup/${file}`
}

/** Promo popup header image from API (`s3_url` / `src_url` / `url`) or legacy `/promopopup/*` path. */
export function resolvePromoMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (isUsableVehicleImageUrl(trimmed)) return trimmed
    return resolveRelativePromoMediaFilename(trimmed)
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    if (isUsableVehicleImageUrl(trimmed)) return trimmed
    if (!isAbsoluteMediaUrl(trimmed)) {
      const resolved = resolveRelativePromoMediaFilename(trimmed)
      if (resolved) return resolved
    }
  }
  return ''
}

/** Angular: `${baseUrl}/feature/${filename}` when the API only returns `src`. */
function resolveRelativeFeatureMediaFilename(filename: string): string {
  const file = filename.trim().replace(/^\/+/, '')
  if (!file) return ''
  if (!/\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i.test(file)) return ''
  const absolute = `${apiOriginForMedia()}/feature/${file}`
  return isUsableFeatureMediaUrl(absolute) ? absolute : ''
}

/** Feature icon URL from API (`s3_url` / `src_url` / `url`) — includes SVG. */
export function isUsableFeatureMediaUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!isAbsoluteMediaUrl(trimmed)) return false
  try {
    const file = decodeURIComponent(new URL(trimmed).pathname.split('/').pop() ?? '')
    if (!file || /\s/.test(file)) return false
    return /\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i.test(file)
  } catch {
    return false
  }
}

export function resolveFeatureMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (isUsableFeatureMediaUrl(trimmed)) return trimmed
    return resolveRelativeFeatureMediaFilename(trimmed)
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    if (isUsableFeatureMediaUrl(trimmed)) return trimmed
    if (!isAbsoluteMediaUrl(trimmed)) {
      const resolved = resolveRelativeFeatureMediaFilename(trimmed)
      if (resolved) return resolved
    }
  }
  return ''
}

/** Non-empty absolute feature icon URL for `<img src>`. */
export function featureImageDisplaySrc(src: string | undefined | null): string | undefined {
  const trimmed = src?.trim()
  if (!trimmed || !isUsableFeatureMediaUrl(trimmed)) return undefined
  return trimmed
}

/** Vehicle thumbnail / gallery URL from API fields (`s3_url`, `src_url`, `url`, absolute `src`). */
export function resolveVehicleMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    return isUsableVehicleImageUrl(trimmed) ? trimmed : ''
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (trimmed && isUsableVehicleImageUrl(trimmed)) return trimmed
  }
  return ''
}

/** First usable gallery / media URL, or the shared placeholder. */
export function vehicleImageWithFallback(src: string | undefined | null): string {
  const resolved = vehicleImageDisplaySrc(src)
  if (resolved) return resolved
  const trimmed = src?.trim()
  if (trimmed && isAbsoluteMediaUrl(trimmed)) return trimmed
  return VEHICLE_PLACEHOLDER_SRC
}

/** Brand / cartype logo URLs accept SVG (S3 usually serves `.svg`). */
export function isUsableBrandMediaUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!isAbsoluteMediaUrl(trimmed)) return false
  try {
    const file = decodeURIComponent(new URL(trimmed).pathname.split('/').pop() ?? '')
    if (!file) return false
    return /\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i.test(file)
  } catch {
    return false
  }
}

/** Brand / cartype logo URL from API fields (`s3_url`, `src_url`, `url`, or absolute `src`). */
export function resolveBrandMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    return isUsableBrandMediaUrl(trimmed) ? trimmed : ''
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    if (isUsableBrandMediaUrl(trimmed)) return trimmed
  }

  return ''
}

/** Partner logos uploaded to Ghost Rentals S3 (`image_url` or legacy `logo` filename). */
export const PARTNER_S3_IMAGE_BASE = 'https://ghostrentals-media.s3.ap-south-1.amazonaws.com/partner/'

/** Partner logo from `image_url`, S3 key/filename, or nested media refs. */
export function resolvePartnerMediaUrl(input: RawMedia | string | null | undefined): string {
  if (input == null) return ''

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return ''
    if (isUsableVehicleImageUrl(trimmed)) return trimmed
    if (isAbsoluteMediaUrl(trimmed)) return trimmed
    const file = trimmed.replace(/^\/+/, '')
    return file ? `${PARTNER_S3_IMAGE_BASE}${file}` : ''
  }

  for (const candidate of [input.s3_url, input.src_url, input.url, input.src]) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    if (isUsableVehicleImageUrl(trimmed)) return trimmed
    if (isAbsoluteMediaUrl(trimmed)) return trimmed
    const file = trimmed.replace(/^\/+/, '')
    if (file) return `${PARTNER_S3_IMAGE_BASE}${file}`
  }
  return ''
}

/** Non-empty absolute brand logo URL for `<img src>`. */
export function brandImageDisplaySrc(src: string | undefined | null): string | undefined {
  const trimmed = src?.trim()
  if (!trimmed || !isUsableBrandMediaUrl(trimmed)) return undefined
  return trimmed
}

/** Non-empty absolute URL for `<img src>`, or `undefined` when the API did not provide one. */
export function vehicleImageDisplaySrc(src: string | undefined | null): string | undefined {
  const trimmed = src?.trim()
  if (!trimmed || !isUsableVehicleImageUrl(trimmed)) return undefined
  return trimmed
}

/** Card / listing image — S3 URLs, absolute paths, or legacy `/public/media/` filenames. */
export function resolveCardImageSrc(src: string | undefined | null): string | undefined {
  const resolved = vehicleImageDisplaySrc(src)
  if (resolved) return resolved

  const fromRelative = resolveVehicleMediaUrl(src)
  if (fromRelative) return fromRelative

  const trimmed = src?.trim()
  return trimmed && isAbsoluteMediaUrl(trimmed) ? trimmed : undefined
}

export function isS3VehicleMediaUrl(url: string): boolean {
  const trimmed = url.trim()
  return /\.amazonaws\.com\//i.test(trimmed) || trimmed.includes('ghostrentals-media')
}

export function isLegacyPublicMediaUrl(url: string): boolean {
  return /\/public\/media\//i.test(url.trim())
}

export type PublicMediaFolder = 'media' | 'brand' | 'cartype' | 'feature'

/**
 * Resolve CMS / vehicle media for `<img src>`.
 * Vehicle `media` + `feature`: absolute URLs from the API; legacy feature filenames via API origin `/feature/*`.
 * Brand/cartype: absolute API URLs preferred; legacy `/public/*` for mock filenames.
 */
export function resolvePublicMediaUrl(folder: PublicMediaFolder, value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (isAbsoluteMediaUrl(trimmed)) return trimmed

  if (folder === 'media' || folder === 'feature') return ''

  const file = trimmed.replace(/^\/+/, '')
  return `/public/${folder}/${file}`
}
