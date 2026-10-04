import { apiPost } from "./client"
import type { RawCarType, RawGoogleReview, RawVehicle } from "./types"

export const getProductByUrlKey = (payload: { url_key: string }, token?: string) =>
  apiPost<RawVehicle[]>("/api/vehicle/getVehicleWithURLKey", payload, { token })

export const getRelatedVehicles = (
  payload: {
    limit: number
    page: number
    vehicle_Ids: Array<{ vehicle_id: string }>
  },
  token?: string,
) => apiPost<RawVehicle[]>("/api/vehicle/getvehiclewithIDs", payload, { token })

export const getProductCarTypes = (payload: unknown = {}) =>
  apiPost<RawCarType[]>("/api/cartype/getAllCartype", payload)

export const getProductReviews = (payload: unknown = {}) =>
  apiPost<RawGoogleReview[]>("/api/googlereview/getAllGooglereview", payload)

export const addNewWishlist = (payload: {
  id: string
  token: string
  color?: string
  size?: string
  price?: number | string
}) => apiPost<unknown>("/api/wishlist/addNewWishlist", payload)

export const removeWishlistItem = (payload: { id: string; token: string }) =>
  apiPost<unknown>("/api/wishlist/RemoveWishlistItem", payload)

export const addProductInquiry = (payload: {
  name: string
  email: string
  phone: string
  message?: string
  day?: string
  price?: number | null
  currency?: string
  product?: string
}) => apiPost<unknown>("/api/home/contactadd", payload)
