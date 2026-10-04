import { safeApiCall, type ApiResponse } from './client'
import { getAllConfig, getAllFeatures, getAllVehicles } from './home'
import { getProductByUrlKey, getProductCarTypes, getProductReviews, getRelatedVehicles } from './product'
import { canonicalizeVehicleUrlKey, vehicleProductUrlKeyCandidates } from './adapters'
import {
  enrichRelatedVehiclesWithEmbeddedMedia,
  extractPopulatedRelatedVehicles,
  toProductDetailModel,
  toProductGoogleReviews,
  toRelatedVehicleIdPayload,
  type ProductDetailModel,
  type ProductGoogleReviews,
  type ProductLocationModel,
  type ProductMode,
  toProductLocationModel
} from './productAdapters'
import type { RawCarType, RawFeature, RawVehicle } from './types'

export type ProductPageData = {
  mode: ProductMode
  product: ProductDetailModel | null
  related: ProductDetailModel[]
  reviews: ProductGoogleReviews
  location: ProductLocationModel
}

const EMPTY_REVIEWS: ProductGoogleReviews = {
  google_rating: 5,
  user_ratings_total: 0,
  google_url: '',
  reviews: []
}

async function getProductByCanonicalUrlKey(urlKey: string, token?: string): Promise<ApiResponse<RawVehicle[]> | null> {
  const target = canonicalizeVehicleUrlKey(urlKey)
  if (!target) return null

  const listRes = await safeApiCall('getAllVehicle(canonicalUrlKey)', () => getAllVehicles({}), null)
  if (!listRes || listRes.code !== 200 || !Array.isArray(listRes.result)) return null

  const match = listRes.result.find((vehicle) => canonicalizeVehicleUrlKey(String(vehicle.url_key ?? '')) === target)
  const matchedKey = typeof match?.url_key === 'string' ? match.url_key.trim() : ''
  if (!matchedKey) return null

  const res = await safeApiCall(
    `getProductByUrlKey(canonical:${matchedKey})`,
    () => getProductByUrlKey({ url_key: matchedKey }, token),
    null
  )
  if (res && res.code === 200 && Array.isArray(res.result) && res.result.length > 0) {
    return res
  }

  // List payload is enough to render when the exact-key endpoint still misses.
  return { code: 200, result: [match as RawVehicle] }
}

async function getProductByUrlKeyWithFallbacks(urlKey: string, token?: string): Promise<ApiResponse<RawVehicle[]> | null> {
  for (const key of vehicleProductUrlKeyCandidates(urlKey)) {
    const res = await safeApiCall(`getProductByUrlKey(${key})`, () => getProductByUrlKey({ url_key: key }, token), null)
    if (res && res.code === 200 && Array.isArray(res.result) && res.result.length > 0) {
      return res
    }
  }

  return getProductByCanonicalUrlKey(urlKey, token)
}

export async function loadProductPageData(url_key: string, mode: ProductMode, authToken?: string): Promise<ProductPageData> {
  const [productRes, carTypesRes, reviewsRes, configRes, featuresCatalogRes] = await Promise.all([
    getProductByUrlKeyWithFallbacks(url_key, authToken),
    safeApiCall('getProductCarTypes', () => getProductCarTypes({}), null),
    safeApiCall('getProductReviews', () => getProductReviews({}), null),
    safeApiCall('getAllConfig', () => getAllConfig({}), null),
    safeApiCall('getAllFeatures', () => getAllFeatures({}), null)
  ])

  const rawProduct = productRes && productRes.code === 200 && Array.isArray(productRes.result) ? (productRes.result[0] ?? null) : null

  const carTypes = carTypesRes && carTypesRes.code === 200 && Array.isArray(carTypesRes.result) ? (carTypesRes.result as RawCarType[]) : []

  const featureCatalog =
    featuresCatalogRes && featuresCatalogRes.code === 200 && Array.isArray(featuresCatalogRes.result)
      ? (featuresCatalogRes.result as RawFeature[])
      : []

  const product = rawProduct ? toProductDetailModel(rawProduct, carTypes, featureCatalog) : null
  const productReviews =
    reviewsRes && reviewsRes.code === 200
      ? toProductGoogleReviews({
          result: Array.isArray(reviewsRes.result) ? reviewsRes.result : [],
          google_rating: (reviewsRes as { google_rating?: number }).google_rating ?? 5,
          user_ratings_total: (reviewsRes as { user_ratings_total?: number }).user_ratings_total ?? 0,
          google_url: (reviewsRes as { google_url?: string }).google_url ?? ''
        })
      : EMPTY_REVIEWS
  const location = toProductLocationModel(configRes && configRes.code === 200 ? configRes.result : null)

  const relatedPayload = toRelatedVehicleIdPayload(rawProduct?.related_vehicles)
  if (!product || !relatedPayload.length) {
    return { mode, product, related: [], reviews: productReviews, location }
  }

  const relatedRes = await safeApiCall(
    'getRelatedVehicles',
    () =>
      getRelatedVehicles(
        {
          limit: 10,
          page: 1,
          vehicle_Ids: relatedPayload
        },
        authToken
      ),
    null
  )

  let relatedRaw = relatedRes && relatedRes.code === 200 && Array.isArray(relatedRes.result) ? (relatedRes.result as RawVehicle[]) : []

  if (!relatedRaw.length) {
    relatedRaw = extractPopulatedRelatedVehicles(rawProduct)
  }

  relatedRaw = enrichRelatedVehiclesWithEmbeddedMedia(relatedRaw, rawProduct?.related_vehicles)

  const filtered = mode === 'lease' ? relatedRaw.filter((vehicle) => vehicle.lease_available === true) : relatedRaw

  const related = filtered.slice(0, 4).map((vehicle) => toProductDetailModel(vehicle, carTypes, featureCatalog))

  return { mode, product, related, reviews: productReviews, location }
}
