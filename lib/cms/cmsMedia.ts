import type { RawMedia } from '@/lib/api/types'
import { toAssetUrl } from '@/lib/config'
import { isAbsoluteMediaUrl, isUsableVehicleImageUrl, resolveBannerMediaUrl } from '@/lib/mediaUrl'

export type CmsImageSource = {
  image?: unknown
  image_url?: unknown
  media_data?: unknown
}

/** CMS uploads on Ghost Rentals S3 (`image_url` from the admin API). */
export const CMS_S3_IMAGE_BASE = 'https://ghostrentals-media.s3.ap-south-1.amazonaws.com/cms/'

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function isBrokenCmsMediaValue(value: string): boolean {
  const trimmed = value.trim()
  return !trimmed || trimmed === '[object Object]' || trimmed.includes('[object Object]')
}

function cmsFilenameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
  } catch {
    return ''
  }
}

function isUsableCmsImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!isAbsoluteMediaUrl(trimmed) || isBrokenCmsMediaValue(trimmed)) return false

  const file = cmsFilenameFromUrl(trimmed)
  if (!file) return false

  return /\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i.test(file)
}

function buildCmsS3Url(filename: string): string {
  const file = filename.replace(/^\/+/, '')
  if (!file || isBrokenCmsMediaValue(file)) return ''
  if (isAbsoluteMediaUrl(file)) return isUsableCmsImageUrl(file) ? file : ''
  return `${CMS_S3_IMAGE_BASE}${file}`
}

function resolveCmsImageUrl(imageUrl: unknown): string {
  const raw = pickString(imageUrl)
  if (!raw || isBrokenCmsMediaValue(raw)) return ''

  if (isUsableCmsImageUrl(raw)) return raw

  if (isAbsoluteMediaUrl(raw)) return ''

  return buildCmsS3Url(raw)
}

function firstMedia(value: unknown): RawMedia | null {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue
      return entry as RawMedia
    }
    return null
  }
  if (typeof value === 'object') return value as RawMedia
  return null
}

function resolveCmsImageObject(image: unknown): string {
  const media = firstMedia(image)
  if (!media) return ''

  for (const candidate of [media.s3_url, media.src_url, media.url, media.src]) {
    const value = pickString(candidate)
    if (!value || isBrokenCmsMediaValue(value)) continue

    if (isUsableCmsImageUrl(value)) return value

    if (isAbsoluteMediaUrl(value)) continue

    const built = buildCmsS3Url(value)
    if (built) return built
  }

  return ''
}

function resolveCmsImageString(image: unknown): string {
  const raw = pickString(image)
  if (!raw || isBrokenCmsMediaValue(raw)) return ''

  if (isUsableCmsImageUrl(raw)) return raw

  if (raw.startsWith('/assets/') || raw.startsWith('/public/')) return raw

  if (raw.includes('/') && !isAbsoluteMediaUrl(raw)) return toAssetUrl(raw)

  return buildCmsS3Url(raw)
}

/**
 * Resolve a CMS section/item image for `<img src>`.
 * Prefers `image_url` (S3), then `image` object/string, then `media_data`, else local asset fallback.
 */
export function resolveCmsImage(
  source: CmsImageSource | null | undefined,
  fallbackAssetPath: string,
): string {
  const fromImageUrl = resolveCmsImageUrl(source?.image_url)
  if (fromImageUrl) return fromImageUrl

  const fromImageObject = resolveCmsImageObject(source?.image)
  if (fromImageObject) return fromImageObject

  const media = firstMedia(source?.media_data)
  if (media) {
    const fromMedia = resolveBannerMediaUrl(media)
    if (fromMedia && isUsableCmsImageUrl(fromMedia)) return fromMedia

    const src = pickString(media.s3_url, media.src_url, media.url, media.src)
    const built = buildCmsS3Url(src)
    if (built) return built
  }

  const fromImageString = resolveCmsImageString(source?.image)
  if (fromImageString) return fromImageString

  return toAssetUrl(fallbackAssetPath)
}

function cmsImageReferenceHaystack(
  source: CmsImageSource | null | undefined,
  resolved: string,
  fallbackAssetPath: string,
): string {
  const imageString =
    typeof source?.image === 'string' ? source.image : pickString(source?.image_url)
  return [imageString, pickString(source?.image_url), resolved, fallbackAssetPath].join(' ').toLowerCase()
}

function isWhiteIconReference(value: string): boolean {
  return value.includes('-white.') || value.includes('_white.') || value.includes('/white.svg')
}

function isBlackIconReference(value: string): boolean {
  return value.includes('-black.') || value.includes('_black.') || value.includes('/black.svg')
}

function oppositeIconAssetPath(path: string): string {
  if (/-white\./i.test(path)) return path.replace(/-white\./gi, '-black.')
  if (/-black\./i.test(path)) return path.replace(/-black\./gi, '-white.')
  return path
}

/** Pick icon variant for light (about) or dark (home experience) section backgrounds. */
export function resolveFeatureIconForSurface(
  source: CmsImageSource | null | undefined,
  fallbackAssetPath: string,
  surface: 'light' | 'dark',
): string {
  const resolved = resolveCmsImage(source, fallbackAssetPath)
  return displayFeatureIconSrc(resolved, fallbackAssetPath, surface)
}

export function displayFeatureIconSrc(
  resolvedSrc: string,
  fallbackAssetPath: string,
  surface: 'light' | 'dark',
): string {
  const haystack = cmsImageReferenceHaystack(null, resolvedSrc, fallbackAssetPath)

  if (surface === 'light' && isWhiteIconReference(haystack)) {
    return toAssetUrl(fallbackAssetPath)
  }

  if (surface === 'dark' && isBlackIconReference(haystack)) {
    const whiteFallback = oppositeIconAssetPath(fallbackAssetPath)
    if (whiteFallback !== fallbackAssetPath) {
      return toAssetUrl(whiteFallback)
    }
  }

  return resolvedSrc
}
