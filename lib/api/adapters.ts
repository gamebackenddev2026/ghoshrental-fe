import type {
  RawBanner,
  RawBrand,
  RawCarType,
  RawFeature,
  RawGoogleReview,
  RawLocation,
  RawMedia,
  RawMediaRef,
  RawPartner,
  RawPromoPopup,
  RawRecord,
  RawVehicle
} from './types'
import { resolveVehicleRatePair } from './customerPricing'
import type { BrandItem, CarItem, CarType, GoogleReview, PartnerItem, YachtItem } from '@/components/home/mockData'
import { resolveReviewerPhotoUrl } from '@/lib/googleReviewMedia'
import {
  resolveCardImageSrc,
  resolveVehicleMediaUrl,
  resolveBannerMediaUrl,
  resolveBrandMediaUrl,
  resolvePartnerMediaUrl,
  resolvePromoMediaUrl
} from '@/lib/mediaUrl'

function firstString(source: RawRecord, keys: string[]): string {
  if (source == null || typeof source !== 'object') return ''
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }
  return ''
}

function firstNumber(source: RawRecord, keys: string[]): number {
  if (source == null || typeof source !== 'object') return 0
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function firstBool(source: RawRecord, keys: string[]): boolean {
  if (source == null || typeof source !== 'object') return false
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return false
}

/**
 * Ghost Rentals APIs return `image` / `media_data` as an array of media
 * reference objects shaped like:
 *   { _id, src: "file.ext", alt, file_type, ... }
 * Angular's templates read `image[0].src` directly. This helper mirrors
 * that while staying defensive against servers that might return a plain
 * filename string or a single object instead of an array.
 */
function firstMedia(value: RawMediaRef[] | RawMediaRef | undefined): RawMedia | null {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry) continue
      if (typeof entry === 'string') return { src: entry }
      if (typeof entry === 'object') return entry
    }
    return null
  }
  if (typeof value === 'string') return { src: value }
  if (typeof value === 'object') return value
  return null
}

/** Slug for `/product/[url_key]` and API lookup: runs of spaces/underscores become single hyphens. */
export function normalizeVehicleUrlKeyForHref(key: string): string {
  if (typeof key !== 'string' || !key.trim()) return ''
  return key
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Case/separator-insensitive form for matching admin url_keys.
 * e.g. `NISSAN-X-TERRA-SUV` ≡ `NISSAN_X-TERRA_SUV` ≡ `NISSAN X TERRA SUV`
 */
export function canonicalizeVehicleUrlKey(key: string): string {
  if (typeof key !== 'string' || !key.trim()) return ''
  let decoded = key.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // keep raw
  }
  return decoded.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Build lookup candidates for `getVehicleWithURLKey`.
 * Admin keys are often mixed (`NISSAN_X-TERRA_SUV`) while public URLs use hyphens.
 */
export function vehicleProductUrlKeyCandidates(urlKey: string): string[] {
  let decoded = urlKey
  try {
    decoded = decodeURIComponent(urlKey)
  } catch {
    decoded = urlKey
  }
  const t = decoded.trim()
  const out: string[] = []
  const add = (s: string) => {
    const v = s.trim()
    if (v && !out.includes(v)) out.push(v)
  }

  add(t)

  const hyphenSlug = normalizeVehicleUrlKeyForHref(t)
  add(hyphenSlug)

  const parts = hyphenSlug.split('-').filter(Boolean)
  if (parts.length > 1 && parts.length <= 8) {
    const joins = parts.length - 1
    const limit = 1 << joins
    for (let mask = 0; mask < limit; mask++) {
      let joined = parts[0]
      for (let i = 0; i < joins; i++) {
        joined += ((mask & (1 << i)) !== 0 ? '_' : '-') + parts[i + 1]
      }
      add(joined)
    }
  }

  add(parts.join(' '))
  add(parts.join('_'))
  add(hyphenSlug.replace(/-/g, ''))

  // Prefer original casing from the URL; also try common admin casing.
  for (const base of [hyphenSlug, parts.join('_'), t]) {
    add(base.toLowerCase())
    add(base.toUpperCase())
  }

  // Each candidate is a sequential API call on miss — keep the list bounded.
  return out.slice(0, 24)
}

export function vehicleProductPath(urlKey: string | undefined | null, mode: 'rent' | 'lease' = 'rent'): string {
  const raw = String(urlKey ?? '').trim()
  const slug = normalizeVehicleUrlKeyForHref(raw) || raw
  const base = mode === 'lease' ? '/product/lease' : '/product'
  return `${base}/${encodeURIComponent(slug)}`
}

function firstImageFilename(value: RawMediaRef[] | RawMediaRef | undefined): string {
  const media = firstMedia(value)
  if (!media) return ''
  if (media.src) return media.src
  if (media.file_name) return media.file_name
  return ''
}

// ────────────────────── Vehicles → Car/Yacht cards ──────────────────────

type VehicleCardImage = { src: string; alt: string }

function mapVehicleImage(media: RawMedia, altFallback: string): VehicleCardImage | null {
  const src = resolveVehicleMediaUrl(media)
  if (!src) return null
  return { src, alt: firstString(media, ['alt']) || altFallback }
}

export function buildVehicleCardMedia(raw: RawVehicle, altSuffix: string): Pick<CarItem, 'media_src' | 'media_alt' | 'media_images'> {
  const name = firstString(raw, ['name'])
  const altFallback = `${name} ${altSuffix}`.trim()
  const mediaArr = Array.isArray(raw.media_data) ? raw.media_data : []
  const galleryArr = Array.isArray(raw.gallery_image) ? raw.gallery_image : []
  const thumbnailMedia = mediaArr[0]

  let thumbnail: VehicleCardImage | null = thumbnailMedia ? mapVehicleImage(thumbnailMedia, altFallback) : null
  if (!thumbnail) {
    const topLevel = resolveVehicleMediaUrl(firstString(raw, ['media_url', 'image_url', 'image']))
    if (topLevel) thumbnail = { src: topLevel, alt: altFallback }
  }

  const imagePool = galleryArr.length ? galleryArr : mediaArr
  const gallery = [...imagePool]
    .sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0))
    .map((m) => mapVehicleImage(m, altFallback))
    .filter((m): m is VehicleCardImage => m !== null)

  const merged = thumbnail ? [thumbnail, ...gallery.filter((g) => g.src !== thumbnail!.src)] : gallery

  const primary = merged[0]
  return {
    media_src: primary?.src ?? '',
    media_alt: primary?.alt ?? altFallback,
    media_images: merged.length ? merged : undefined
  }
}

/** Resolved URLs for card hover slideshow (`media_images` or fallback `media_src`). */
export function cardSlideImages(item: {
  name: string
  media_images?: Array<{ src: string; alt?: string }>
  media_src?: string
  media_alt?: string
}): Array<{ src: string; alt: string }> {
  const raw = item.media_images?.length
    ? item.media_images
    : item.media_src
      ? [{ src: item.media_src, alt: item.media_alt || item.name }]
      : []

  return raw
    .map((img) => {
      const src = resolveCardImageSrc(img.src)
      return src ? { src, alt: img.alt || item.name } : null
    })
    .filter((img): img is { src: string; alt: string } => img !== null)
}

export function vehicleHasCardMedia(item: { media_src?: string; media_images?: Array<{ src?: string }> }): boolean {
  if (item.media_src?.trim()) return true
  return Boolean(item.media_images?.some((m) => m.src?.trim()))
}

export function toCarItem(raw: RawVehicle): CarItem {
  const rawKey = firstString(raw, ['url_key'])
  const slug = normalizeVehicleUrlKeyForHref(rawKey) || rawKey
  const carName = firstString(raw, ['name'])
  const media = buildVehicleCardMedia(raw, 'rental Dubai')
  const daily = resolveVehicleRatePair(raw, 'dailyRate')

  return {
    id: firstString(raw, ['_id', 'id']) || slug || carName,
    name: carName,
    url_key: slug,
    ...media,
    transmission: firstString(raw, ['transmission']),
    fuelType: firstString(raw, ['fuelType', 'fuel_type']),
    mileage: firstString(raw, ['mileage']),
    seating_capacity: firstNumber(raw, ['seating_capacity', 'seatingCapacity']),
    regularRateDaily: daily.original,
    dailyRate: daily.current,
    isvipNumberPlate: firstBool(raw, ['isvipNumberPlate', 'is_vip_number_plate']),
    is_wishlist: firstBool(raw, ['is_wishlist', 'isWishlist'])
  }
}

export function toYachtItem(raw: RawVehicle): YachtItem {
  const rawKey = firstString(raw, ['url_key'])
  const slug = normalizeVehicleUrlKeyForHref(rawKey) || rawKey
  const yachtName = firstString(raw, ['name'])
  const media = buildVehicleCardMedia(raw, 'yacht rental Dubai')
  const hourly = resolveVehicleRatePair(raw, 'hourlyRate')

  return {
    id: firstString(raw, ['_id', 'id']) || slug || yachtName,
    name: yachtName,
    url_key: slug,
    ...media,
    bodyType: firstString(raw, ['bodyType', 'body_type']),
    year: firstString(raw, ['year']),
    length: firstString(raw, ['length']),
    guest_capacity: firstNumber(raw, ['guest_capacity', 'guestCapacity']),
    regularRateHourly: hourly.original,
    hourlyRate: hourly.current,
    isvipNumberPlate: firstBool(raw, ['isvipNumberPlate']),
    is_wishlist: firstBool(raw, ['is_wishlist', 'isWishlist'])
  }
}

// ────────────────────── Brand → BrandItem ──────────────────────

/** Mongo ObjectId shape — never usable as a public slug. */
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i

function brandSlugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function toBrandItem(raw: RawBrand): BrandItem | null {
  const media = firstMedia(raw.image)
  const image = media ? resolveBrandMediaUrl(media) : ''
  if (!image) return null
  const name = firstString(raw, ['name'])
  const rawUrlKey = firstString(raw, ['url_key'])
  const url_key = rawUrlKey && !OBJECT_ID_RE.test(rawUrlKey) ? rawUrlKey : brandSlugFromName(name)
  return {
    name,
    url_key,
    image
  }
}

// ────────────────────── Partner → PartnerItem ──────────────────────

function isActivePartner(raw: RawPartner): boolean {
  if (raw.isDeleted === true || raw.is_deleted === true) return false
  const status = raw.status
  if (status === false) return false
  if (typeof status === 'string' && status.toLowerCase() === 'inactive') return false
  if (raw.is_active === false) return false
  return true
}

function partnerStableId(raw: RawPartner, name: string): string {
  const urlKey = firstString(raw, ['url_key', 'slug'])
  if (urlKey) return urlKey.toLowerCase().replace(/\s+/g, '')
  const id = firstString(raw, ['_id'])
  if (id) return id
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolvePartnerLogo(raw: RawPartner): string {
  const imageUrl = firstString(raw, ['image_url'])
  if (imageUrl) {
    const resolved = resolvePartnerMediaUrl(imageUrl)
    if (resolved) return resolved
  }

  if (typeof raw.logo === 'string' && raw.logo.trim()) {
    const resolved = resolvePartnerMediaUrl(raw.logo)
    if (resolved) return resolved
  }

  const media = firstMedia(raw.image ?? (typeof raw.logo !== 'string' ? raw.logo : undefined) ?? raw.partner_image ?? raw.media)
  if (!media) return ''
  const resolved = resolvePartnerMediaUrl(media)
  if (resolved) return resolved
  return resolveBrandMediaUrl(media)
}

/** Maps `/api/partner/getPartners` rows into home “Our Partners” cards. */
export function toPartnerItem(raw: RawPartner): PartnerItem | null {
  if (!isActivePartner(raw)) return null
  const name = firstString(raw, ['name', 'partner_name'])
  if (!name) return null
  const offerTag = firstString(raw, ['offer_tag', 'offerTag', 'heading', 'tagline', 'tag', 'subtitle', 'offer'])
  const description = firstString(raw, ['description', 'short_description', 'short_desc'])
  if (!offerTag && !description) return null
  return {
    id: partnerStableId(raw, name),
    name,
    offerTag: offerTag || name,
    description: description || '',
    logo: resolvePartnerLogo(raw) || undefined
  }
}

export function partnerSequenceNumber(raw: RawPartner): number {
  return firstNumber(raw, ['sequence_number', 'sequenceNumber'])
}

// ────────────────────── Cartype → CarType ──────────────────────

export function toCarType(raw: RawCarType): CarType | null {
  const media = firstMedia(raw.image)
  const image = (media ? resolveVehicleMediaUrl(media) : '') || media?.src?.trim() || media?.file_name?.trim() || ''
  if (!image) return null
  const name = firstString(raw, ['name'])
  return {
    name,
    url_key: firstString(raw, ['url_key']),
    title: firstString(raw, ['title']) || `${name} Rentals in Dubai`,
    image,
    alt: (media?.alt && media.alt.trim()) || firstString(raw, ['alt']) || `${name} rental Dubai`
  }
}

// ────────────────────── Banner → hero media ──────────────────────

export type HeroBanner = {
  page: string
  file_type: string
  /** CMS filename from API (`media_data[0].src`). */
  src: string
  /** Playable URL — absolute S3/CDN from API (`s3_url` / `src_url` / `url`). */
  media_url: string
  alt: string
}

/** First playable media row from `media_data[0]` or populated `image` object. */
function bannerPrimaryMedia(row: RawBanner): RawMedia | undefined {
  const fromArray = Array.isArray(row.media_data) ? row.media_data[0] : undefined
  if (fromArray && typeof fromArray === 'object') return fromArray

  const image = row.image
  if (image != null && typeof image === 'object' && !Array.isArray(image)) {
    return image as RawMedia
  }
  return undefined
}

function rowToHeroBanner(row: RawBanner, pageKey: string): HeroBanner | null {
  const media = bannerPrimaryMedia(row)
  if (!media) return null
  const media_url = resolveBannerMediaUrl(media)
  if (!media_url) return null
  const src = firstString(media, ['src'])
  return {
    page: pageKey,
    file_type: firstString(media, ['file_type']),
    src,
    media_url,
    alt: firstString(media, ['alt'])
  }
}

/** Banner media for a given CMS `page` value (e.g. `home`, `services`). */
export function toBannerForPage(banners: RawBanner[], pageName: string): HeroBanner | null {
  const key = pageName.toLowerCase()
  const row = banners.find((b) => b != null && typeof b === 'object' && firstString(b as RawRecord, ['page']).toLowerCase() === key)
  if (!row) return null
  return rowToHeroBanner(row, key)
}

/** CMS row `name` = home_banner (primary home hero source). */
export function toBannerByName(banners: RawBanner[], bannerName: string): HeroBanner | null {
  const key = bannerName.toLowerCase()
  const row = banners.find((b) => b != null && typeof b === 'object' && firstString(b as RawRecord, ['name']).toLowerCase() === key)
  if (!row) return null
  const pageKey = firstString(row as RawRecord, ['page']).toLowerCase() || key
  return rowToHeroBanner(row, pageKey)
}

/** Home hero — `name: home_banner` first, then `page: home`. */
export function toHomeBanner(banners: RawBanner[]): HeroBanner | null {
  return toBannerByName(banners, 'home_banner') ?? toBannerForPage(banners, 'home')
}

/**
 * Picks a CMS list banner for `/product/list/[url_key]`, matching Angular
 * `list.component.ts` (status + `page` === car type name, then `url_key`).
 * List view uses the first *image* only (Angular template has no list video).
 */
function listFirstImageMedia(b: RawBanner): RawMedia | null {
  const media = bannerPrimaryMedia(b)
  if (!media) return null
  const ft = firstString(media, ['file_type']).toLowerCase()
  if (ft === 'video') return null
  if (!resolveBannerMediaUrl(media)) return null
  return media
}

export function selectListPageBanner(result: unknown, carTypeName: string, urlKey: string): RawBanner | null {
  if (!Array.isArray(result) || result.length === 0) return null
  const banners = result as RawBanner[]

  const tryMatch = (pageKey: string): RawBanner | null => {
    const key = pageKey.trim().toLowerCase()
    if (!key) return null
    for (const b of banners) {
      if (!firstBool(b, ['status'])) continue
      if (firstString(b, ['page']).trim().toLowerCase() !== key) continue
      if (listFirstImageMedia(b)) return b
    }
    return null
  }

  if (carTypeName) {
    const byName = tryMatch(carTypeName)
    if (byName) return byName
  }
  return tryMatch(urlKey)
}

// ────────────────────── Google reviews ──────────────────────

export function toGoogleReview(raw: RawGoogleReview): GoogleReview {
  const author_name = firstString(raw, ['author_name'])
  return {
    author_name,
    profile_photo_url: resolveReviewerPhotoUrl(author_name, firstString(raw, ['profile_photo_url'])),
    rating: firstNumber(raw, ['rating']) || 5,
    relative_time_description: firstString(raw, ['relative_time_description']),
    text: firstString(raw, ['text']),
    author_url: firstString(raw, ['author_url'])
  }
}

// ────────────────────── Features (special addons) ──────────────────────

export type FeatureItem = {
  image: string
  alt: string
  title: string
  description: string
}

export function toFeatureItem(raw: RawFeature): FeatureItem {
  return {
    image: firstImageFilename(raw.image),
    alt: firstString(raw, ['alt']),
    title: firstString(raw, ['title', 'name']),
    description: firstString(raw, ['description'])
  }
}

// ────────────────────── Locations ──────────────────────

export type LocationItem = { name: string; url_key: string }
export function toLocation(raw: RawLocation): LocationItem {
  return {
    name: firstString(raw, ['name']),
    url_key: firstString(raw, ['url_key'])
  }
}

// ────────────────────── Promo popup (pick the one in-window) ──────────────────────

export type ActivePromo = {
  id: string
  discount: number
  title: string
  subtitle: string
  description: string
  image: string
  buttonText: string
}

export function pickActivePromo(raws: RawPromoPopup[], now: Date = new Date()): ActivePromo | null {
  for (const raw of raws) {
    if (!firstBool(raw, ['status'])) continue
    if (firstBool(raw, ['already_dismissed'])) continue
    const from = raw.schedule?.from ? new Date(raw.schedule.from) : null
    const to = raw.schedule?.to ? new Date(raw.schedule.to) : null
    if (!from || !to) continue
    if (now < from || now > to) continue
    const discount = firstNumber(raw, ['discount'])
    const media = firstMedia(raw.media_data) ?? firstMedia(raw.image)
    const image = resolvePromoMediaUrl(media)
    return {
      id: firstString(raw, ['_id', 'id']),
      discount,
      title: firstString(raw, ['title', 'name']),
      subtitle: firstString(raw, ['short_desc']),
      description: firstString(raw, ['description']),
      image,
      buttonText: `Unlock Your Offer`
    }
  }
  return null
}
