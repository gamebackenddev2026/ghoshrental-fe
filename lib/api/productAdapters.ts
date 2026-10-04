import type { CarItem, YachtItem } from '@/components/home/mockData'
import type { RawCarType, RawConfig, RawFeature, RawGoogleReview, RawMedia, RawMediaRef, RawVehicle } from './types'
import { normalizeVehicleUrlKeyForHref, toGoogleReview } from './adapters'
import { resolveVehicleRatePair } from './customerPricing'
import { buildVehicleCardMedia } from '@/lib/api/adapters'
import {
  isAbsoluteMediaUrl,
  isUsableVehicleImageUrl,
  resolveCardImageSrc,
  resolveFeatureMediaUrl,
  resolveVehicleMediaUrl,
} from '@/lib/mediaUrl'

export type ProductMode = 'rent' | 'lease'

export type ProductFeature = {
  name: string
  type: string
  imageData: RawMedia | null
}

export type ProductImage = {
  src: string
  alt: string
  title: string
  sequence: number
}

export type ProductDetailModel = {
  id: string
  name: string
  url_key: string
  vehicle_type: string
  bodyTypeName: string
  carTypeUrlKey: string
  transmission: string
  fuelType: string
  mileage: number
  weeklyMileage: number
  monthlyMileage: number
  seating_capacity: number
  year: string
  door_count: string
  engine_size: string
  color: string
  drive_type: string
  length: string
  crew_included: boolean
  guest_capacity: string
  description: string
  short_description: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  gcc: boolean
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
  hourlyRate: number
  halfdayRate: number
  regularRateDaily: number
  regularRateWeekly: number
  regularRateMonthly: number
  regularRateHourly: number
  regularRateHalfDay: number
  mileageCost: number
  purchase_price: number
  insurence_price: number
  related_vehicles: string[]
  isvipNumberPlate: boolean
  is_wishlist: boolean
  wishlist_data: Array<{ customer_id?: string }>
  colour_id: string[]
  size: Array<{ _id?: string }>
  sale_price: number
  media_data: RawMedia[]
  gallery: ProductImage[]
  feature_data: ProductFeature[]
  interior: ProductFeature[]
  exterior: ProductFeature[]
  safety: ProductFeature[]
  comfort: ProductFeature[]
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return false
}

export type RelatedVehicleIdPayload = { vehicle_id: string }

/** Backend `getvehiclewithIDs` expects `{ vehicle_id }[]`, not plain id strings. */
export function toRelatedVehicleIdPayload(related: unknown): RelatedVehicleIdPayload[] {
  if (!Array.isArray(related)) return []
  return related
    .map((item) => {
      if (typeof item === 'string') {
        const id = item.trim()
        return id ? { vehicle_id: id } : null
      }
      if (item && typeof item === 'object') {
        const row = item as RawVehicle
        const id = asString(row.vehicle_id).trim() || asString(row._id).trim()
        return id ? { vehicle_id: id } : null
      }
      return null
    })
    .filter((item): item is RelatedVehicleIdPayload => item !== null)
}

function extractRelatedVehicleIds(related: unknown): string[] {
  return toRelatedVehicleIdPayload(related).map((item) => item.vehicle_id)
}

function sanitizeGalleryImages(gallery: unknown): RawMedia[] {
  if (!Array.isArray(gallery)) return []
  return gallery.filter((entry) => Boolean(resolveVehicleMediaUrl(entry as RawMedia)))
}

function embeddedMediaPayload(row: RawVehicle): Pick<RawVehicle, 'media_url' | 'gallery_image'> {
  const gallery = sanitizeGalleryImages(row.gallery_image)
  const mediaUrl = asString(row.media_url).trim()
  return {
    media_url: mediaUrl && (isUsableVehicleImageUrl(mediaUrl) || isAbsoluteMediaUrl(mediaUrl)) ? mediaUrl : undefined,
    gallery_image: gallery
  }
}

function findEmbeddedMediaForVehicle(
  vehicle: RawVehicle,
  mediaById: Map<string, Pick<RawVehicle, 'media_url' | 'gallery_image'>>
): Pick<RawVehicle, 'media_url' | 'gallery_image'> | undefined {
  for (const key of [asString(vehicle._id).trim(), asString(vehicle.vehicle_id).trim()]) {
    if (!key) continue
    const hit = mediaById.get(key)
    if (hit) return hit
  }
  return undefined
}

/**
 * Product detail embeds S3 URLs on each `related_vehicles[]` ref; the ID lookup
 * often returns legacy `/api/public/media/` paths. Merge embedded media by vehicle id.
 */
export function enrichRelatedVehiclesWithEmbeddedMedia(vehicles: RawVehicle[], embeddedRefs: unknown): RawVehicle[] {
  if (!Array.isArray(embeddedRefs) || !embeddedRefs.length) return vehicles

  const mediaById = new Map<string, Pick<RawVehicle, 'media_url' | 'gallery_image'>>()

  for (const item of embeddedRefs) {
    if (!item || typeof item !== 'object') continue
    const row = item as RawVehicle
    const payload = embeddedMediaPayload(row)
    const hasMedia = Boolean(asString(payload.media_url).trim()) || (payload.gallery_image?.length ?? 0) > 0
    if (!hasMedia) continue

    for (const key of [asString(row.vehicle_id).trim(), asString(row._id).trim()]) {
      if (key) mediaById.set(key, payload)
    }
  }

  if (!mediaById.size) return vehicles

  return vehicles.map((vehicle) => {
    const embedded = findEmbeddedMediaForVehicle(vehicle, mediaById)
    if (!embedded) return vehicle

    const embeddedMediaUrl = asString(embedded.media_url).trim()
    const vehicleMediaUrl = asString(vehicle.media_url).trim()

    return {
      ...vehicle,
      media_url: embeddedMediaUrl
        ? embeddedMediaUrl
        : isUsableVehicleImageUrl(vehicleMediaUrl)
          ? vehicleMediaUrl
          : vehicle.media_url,
      gallery_image: embedded.gallery_image?.length ? embedded.gallery_image : sanitizeGalleryImages(vehicle.gallery_image)
    }
  })
}

/** Populated related rows already on the product response (fallback when ID lookup is empty). */
export function extractPopulatedRelatedVehicles(raw: RawVehicle | null | undefined): RawVehicle[] {
  if (!raw) return []

  const fromLookup = raw.related_vehicles_data
  if (Array.isArray(fromLookup) && fromLookup.length) {
    return fromLookup.filter((item): item is RawVehicle => typeof item === 'object' && item !== null && Boolean(asString(item.name)))
  }

  const related = raw.related_vehicles
  if (!Array.isArray(related)) return []

  return related.filter(
    (item): item is RawVehicle => typeof item === 'object' && item !== null && Boolean(asString(item.name) && asString(item.url_key))
  )
}

function mapGallery(raw: RawVehicle): ProductImage[] {
  const gallery = sanitizeGalleryImages(raw.gallery_image)
  const sorted = [...gallery].sort((a, b) => {
    const aResolved = resolveVehicleMediaUrl(a) ? 0 : 1
    const bResolved = resolveVehicleMediaUrl(b) ? 0 : 1
    if (aResolved !== bResolved) return aResolved - bResolved
    return (a.sequence_number ?? 0) - (b.sequence_number ?? 0)
  })

  const mapped = sorted
    .map((item) => {
      const src = resolveVehicleMediaUrl(item)
      if (!src) return null
      return {
        src,
        alt: item.alt || raw.name || 'Vehicle image',
        title: item.name || raw.name || 'Vehicle image',
        sequence: item.sequence_number ?? 0
      }
    })
    .filter((item): item is ProductImage => item !== null)

  // `media_url` is the vehicle's card thumbnail (backend always derives it from
  // image_data[0], the small thumbnail-role crop) — it must never outrank the
  // real gallery photos as the detail-page hero, or the hero renders blurry
  // when upscaled. Only fall back to it when no gallery image exists.
  if (mapped.length) return mapped

  const topLevelMedia = asString(raw.media_url).trim()
  if (topLevelMedia && (isUsableVehicleImageUrl(topLevelMedia) || isAbsoluteMediaUrl(topLevelMedia))) {
    return [
      {
        src: topLevelMedia,
        alt: raw.name || 'Vehicle image',
        title: raw.name || 'Vehicle image',
        sequence: -1
      }
    ]
  }

  const fallback = Array.isArray(raw.media_data) ? raw.media_data[0] : null
  const fallbackSrc = resolveVehicleMediaUrl(fallback)
  if (!fallbackSrc) return []
  return [
    {
      src: fallbackSrc,
      alt: fallback?.alt || raw.name || 'Vehicle image',
      title: fallback?.name || raw.name || 'Vehicle image',
      sequence: 0
    }
  ]
}

function normalizeFeatureLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type RawFeatureRow = NonNullable<RawVehicle['feature_data']>[number]

function firstFeatureMedia(value: RawMediaRef[] | RawMediaRef | undefined): RawMedia | null {
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

function mapFeatures(raw: RawVehicle, featureCatalog?: RawFeature[]): ProductFeature[] {
  const catalogById = new Map<string, RawFeature>()
  for (const item of featureCatalog ?? []) {
    const id = asString(item._id).trim()
    if (id) catalogById.set(id, item)
  }

  const mediaById = new Map<string, RawMedia>()
  for (const media of raw.featureimagedata ?? []) {
    if (media?._id) mediaById.set(media._id, media)
  }

  const iconByRefId = new Map<string, RawMedia>()
  const iconByName = new Map<string, RawMedia>()
  for (const item of raw.featureIds ?? []) {
    if (!item || typeof item !== 'object') continue
    const row = item as RawMedia & { id?: string; name?: string }
    const junctionId = asString(row._id).trim()
    const catalogId = asString(row.id).trim()
    if (junctionId) iconByRefId.set(junctionId, row)
    if (catalogId) iconByRefId.set(catalogId, row)
    const nameKey = normalizeFeatureLookupKey(asString(row.name))
    if (nameKey) iconByName.set(nameKey, row)
  }

  const resolveFeatureImageData = (
    featureRecordId: string,
    nameKey: string,
    feature: RawFeatureRow,
    catalogEntry?: RawFeature | null
  ): RawMedia | null => {
    let imageData = (featureRecordId && iconByRefId.get(featureRecordId)) || (nameKey && iconByName.get(nameKey)) || null

    if (!imageData || !resolveFeatureMediaUrl(imageData)) {
      const imageRef = feature.image?.[0]
      const mediaId = asString(imageRef?.media_id).trim() || asString(imageRef?._id).trim() || asString(imageRef?.feature_id).trim()
      const fromMedia = mediaId ? (mediaById.get(mediaId) ?? null) : null
      const iconFromApi = (featureRecordId && iconByRefId.get(featureRecordId)) || (nameKey && iconByName.get(nameKey)) || null
      if (iconFromApi?.s3_url) {
        imageData = { ...fromMedia, ...iconFromApi }
      } else if (fromMedia) {
        imageData = imageData ? { ...fromMedia, ...imageData } : fromMedia
      } else if (catalogEntry) {
        const catalogMedia = firstFeatureMedia(catalogEntry.image)
        if (catalogMedia) imageData = catalogMedia
      }
    }

    if (!imageData && feature.imageData && typeof feature.imageData === 'object') {
      imageData = feature.imageData
    }

    return imageData
  }

  const featureDataRows = raw.feature_data ?? []
  if (featureDataRows.length) {
    return featureDataRows.map((feature) => {
      const featureRecordId = asString(feature._id).trim()
      const nameKey = normalizeFeatureLookupKey(asString(feature.name))
      const catalogEntry = featureRecordId ? catalogById.get(featureRecordId) : undefined
      return {
        name: asString(feature.name) || asString(catalogEntry?.name),
        type: asString(feature.type) || asString(catalogEntry?.type),
        imageData: resolveFeatureImageData(featureRecordId, nameKey, feature, catalogEntry)
      }
    })
  }

  const built: ProductFeature[] = []
  for (const item of raw.featureIds ?? []) {
    if (!item || typeof item !== 'object') continue
    const row = item as RawMedia & { id?: string; name?: string }
    const catalogId = asString(row.id).trim() || asString(row._id).trim()
    const catalogEntry = catalogId ? catalogById.get(catalogId) : undefined
    const name = asString(row.name) || asString(catalogEntry?.name)
    if (!name) continue

    const nameKey = normalizeFeatureLookupKey(name)
    const imageData =
      (catalogId && iconByRefId.get(catalogId)) ||
      (asString(row._id).trim() && iconByRefId.get(asString(row._id).trim())) ||
      (nameKey && iconByName.get(nameKey)) ||
      firstFeatureMedia(catalogEntry?.image)

    built.push({
      name,
      type: asString(catalogEntry?.type),
      imageData: imageData && typeof imageData === 'object' ? imageData : null
    })
  }

  return built
}

function findCarTypeUrlKey(carTypes: RawCarType[] | undefined, bodyTypeId: string): string {
  if (!carTypes?.length || !bodyTypeId) return ''
  const matched = carTypes.find((type) => type._id === bodyTypeId)
  return matched?.url_key ?? ''
}

export function toProductDetailModel(
  raw: RawVehicle,
  carTypes: RawCarType[] | undefined,
  featureCatalog?: RawFeature[]
): ProductDetailModel {
  const features = mapFeatures(raw, featureCatalog)
  const bodyTypeName = raw.bodytype_data?.[0]?.name ?? ''
  const daily = resolveVehicleRatePair(raw, 'dailyRate')
  const weekly = resolveVehicleRatePair(raw, 'weeklyRate')
  const monthly = resolveVehicleRatePair(raw, 'monthlyRate')
  const hourly = resolveVehicleRatePair(raw, 'hourlyRate')
  const halfday = resolveVehicleRatePair(raw, 'halfdayRate')

  const rawUrlKey = asString(raw.url_key)
  return {
    id: asString(raw._id),
    name: asString(raw.name),
    url_key: normalizeVehicleUrlKeyForHref(rawUrlKey) || rawUrlKey,
    vehicle_type: asString(raw.vehicle_type) || 'Car',
    bodyTypeName,
    carTypeUrlKey: findCarTypeUrlKey(carTypes, asString(raw.cartype)),
    transmission: asString(raw.transmission),
    fuelType: asString(raw.fuelType ?? raw.fuel_type),
    mileage: asNumber(raw.mileage),
    weeklyMileage: asNumber(raw.weeklyMileage) || Math.round(asNumber(raw.mileage) * 6),
    monthlyMileage: asNumber(raw.monthlyMileage) || Math.round(asNumber(raw.mileage) * 21),
    seating_capacity: asNumber(raw.seating_capacity),
    year: asString(raw.year),
    door_count: asString(raw.door_count),
    engine_size: asString(raw.engine_size),
    color: asString(raw.color_data?.[0]?.name),
    drive_type: asString(raw.drive_type),
    length: asString(raw.length),
    crew_included: asBool(raw.crew_included),
    guest_capacity: asString(raw.guest_capacity),
    description: asString(raw.description),
    short_description: asString(raw.short_description),
    meta_title: asString(raw.meta_title),
    meta_description: asString(raw.meta_description),
    meta_keywords: asString(raw.meta_keywords),
    gcc: asBool(raw.gcc),
    dailyRate: daily.current,
    weeklyRate: weekly.current,
    monthlyRate: monthly.current,
    hourlyRate: hourly.current,
    halfdayRate: halfday.current,
    regularRateDaily: daily.original,
    regularRateWeekly: weekly.original,
    regularRateMonthly: monthly.original,
    regularRateHourly: hourly.original,
    regularRateHalfDay: halfday.original,
    mileageCost: asNumber(raw.mileageCost),
    purchase_price: asNumber(raw.purchase_price),
    insurence_price: asNumber(raw.insurence_price),
    related_vehicles: extractRelatedVehicleIds(raw.related_vehicles),
    isvipNumberPlate: asBool(raw.isvipNumberPlate),
    is_wishlist: asBool(raw.is_wishlist),
    wishlist_data: Array.isArray(raw.wishlist_data) ? raw.wishlist_data : [],
    colour_id: Array.isArray(raw.colour_id) ? raw.colour_id : [],
    size: Array.isArray(raw.size) ? raw.size : [],
    sale_price: asNumber(raw.sale_price),
    media_data: Array.isArray(raw.media_data) ? raw.media_data : [],
    gallery: mapGallery(raw),
    feature_data: features,
    interior: features.filter((feature) => feature.type === 'Interior'),
    exterior: features.filter((feature) => feature.type === 'Exterior'),
    safety: features.filter((feature) => feature.type === 'Safety'),
    comfort: features.filter((feature) => feature.type === 'Comfort & Convenience')
  }
}

export type ProductGoogleReviews = {
  google_rating: number
  user_ratings_total: number
  google_url: string
  reviews: ReturnType<typeof toGoogleReview>[]
}

export type ProductLocationModel = {
  addressLine1: string
  addressLine2: string
  addressLine3: string
  mapEmbedUrl: string
}

const DEFAULT_PRODUCT_LOCATION: ProductLocationModel = {
  addressLine1: 'MK Ghanim, Warehouse - No. 40',
  addressLine2: '3rd, Al Quoz Industrial Area 3',
  addressLine3: 'Dubai - UAE',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.4000982981856!2d55.22321477595085!3d25.122160834734917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f6bb7c49961e7%3A0x4b3661e383f4d582!2sGhost%20Rentals!5e0!3m2!1sen!2sin!4v1750942590319!5m2!1sen!2sin'
}

function readConfigMap(raw: unknown): Record<string, string> {
  const map: Record<string, string> = {}
  const items: RawConfig[] = Array.isArray(raw) ? (raw as RawConfig[]) : typeof raw === 'object' && raw ? [raw as RawConfig] : []

  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    for (const [key, value] of Object.entries(item)) {
      if ((typeof value === 'string' && value.trim()) || (typeof value === 'number' && Number.isFinite(value))) {
        map[key.toLowerCase()] = String(value).trim()
      }
    }

    const resolvedKey = asString(item.key ?? item.config_key ?? item.slug ?? item.name ?? item.title ?? item.option).toLowerCase()

    const resolvedValue = asString(item.value ?? item.config_value)
    if (resolvedKey && resolvedValue) {
      map[resolvedKey] = resolvedValue
    }
  }

  return map
}

function readFirstConfigValue(map: Record<string, string>, candidates: string[]): string {
  for (const key of candidates) {
    const value = map[key.toLowerCase()]
    if (value) return value
  }
  return ''
}

export function toProductLocationModel(rawConfig: unknown): ProductLocationModel {
  const configMap = readConfigMap(rawConfig)

  const addressLine1 =
    readFirstConfigValue(configMap, [
      'product.address_1',
      'product_address_1',
      'address_1',
      'address1',
      'location_address_1',
      'contact_address_1',
      'contact_address_line_1'
    ]) || DEFAULT_PRODUCT_LOCATION.addressLine1

  const addressLine2 =
    readFirstConfigValue(configMap, [
      'product.address_2',
      'product_address_2',
      'address_2',
      'address2',
      'location_address_2',
      'contact_address_2',
      'contact_address_line_2'
    ]) || DEFAULT_PRODUCT_LOCATION.addressLine2

  const addressLine3 =
    readFirstConfigValue(configMap, [
      'product.address_3',
      'product_address_3',
      'address_3',
      'address3',
      'location_address_3',
      'contact_address_3',
      'contact_address_line_3',
      'address_country_line'
    ]) || DEFAULT_PRODUCT_LOCATION.addressLine3

  const mapEmbedUrl =
    readFirstConfigValue(configMap, [
      'product.map_embed_url',
      'product_map_embed_url',
      'map_embed_url',
      'location_map_embed_url',
      'google_map_embed',
      'google_maps_embed_url',
      'google_map_iframe'
    ]) || DEFAULT_PRODUCT_LOCATION.mapEmbedUrl

  return {
    addressLine1,
    addressLine2,
    addressLine3,
    mapEmbedUrl
  }
}

export function toProductGoogleReviews(raw: {
  google_rating?: number
  user_ratings_total?: number
  google_url?: string
  result?: RawGoogleReview[]
}): ProductGoogleReviews {
  const items = Array.isArray(raw.result) ? raw.result : []
  return {
    google_rating: asNumber(raw.google_rating) || 5,
    user_ratings_total: asNumber(raw.user_ratings_total),
    google_url: asString(raw.google_url),
    reviews: items.map(toGoogleReview)
  }
}

function productDetailToRawVehicle(product: ProductDetailModel): RawVehicle {
  const heroSrc = resolveCardImageSrc(product.gallery[0]?.src)
  const galleryItems = product.gallery
    .slice(heroSrc ? 1 : 0)
    .map((image) => ({
      s3_url: image.src,
      alt: image.alt,
      name: image.title,
      sequence_number: image.sequence ?? 0,
    }))

  const s3MediaData = product.media_data.filter((entry) => Boolean(asString(entry.s3_url).trim()))

  return {
    _id: product.id,
    name: product.name,
    url_key: product.url_key,
    media_url: heroSrc,
    image_url: heroSrc,
    media_data: s3MediaData.length ? s3MediaData : undefined,
    gallery_image: galleryItems,
    transmission: product.transmission,
    fuelType: product.fuelType,
    mileage: product.mileage,
    seating_capacity: String(product.seating_capacity),
    regularRateDaily: product.regularRateDaily,
    dailyRate: product.dailyRate,
    isvipNumberPlate: product.isvipNumberPlate,
    is_wishlist: product.is_wishlist,
  }
}

/** Primary card/thumbnail URL — first usable gallery or media URL from API. */
export function getProductPrimaryImageSrc(product: ProductDetailModel): string {
  return buildVehicleCardMedia(productDetailToRawVehicle(product), 'rental Dubai').media_src
}

export function toCarItemFromProductDetail(product: ProductDetailModel): CarItem {
  const media = buildVehicleCardMedia(productDetailToRawVehicle(product), 'rental Dubai')

  return {
    id: product.id,
    name: product.name,
    url_key: product.url_key,
    media_src: media.media_src,
    media_alt: media.media_alt,
    media_images: media.media_images,
    transmission: product.transmission,
    fuelType: product.fuelType,
    mileage: String(Math.round(product.mileage || 0)),
    seating_capacity: product.seating_capacity,
    regularRateDaily: product.regularRateDaily || product.dailyRate,
    dailyRate: product.dailyRate,
    isvipNumberPlate: product.isvipNumberPlate,
    is_wishlist: product.is_wishlist
  }
}

export function toYachtItemFromProductDetail(product: ProductDetailModel): YachtItem {
  const media = buildVehicleCardMedia(productDetailToRawVehicle(product), 'rental Dubai')

  return {
    id: product.id,
    name: product.name,
    url_key: product.url_key,
    media_src: media.media_src,
    media_alt: media.media_alt,
    media_images: media.media_images,
    bodyType: product.bodyTypeName,
    year: product.year,
    length: product.length,
    guest_capacity: asNumber(product.guest_capacity),
    regularRateHourly: product.regularRateHourly || product.hourlyRate,
    hourlyRate: product.hourlyRate,
    isvipNumberPlate: product.isvipNumberPlate,
    is_wishlist: product.is_wishlist
  }
}
