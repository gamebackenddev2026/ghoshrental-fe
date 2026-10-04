import { apiPost } from './client'
import type { RawBanner, RawBrand, RawCarType, RawFeature, RawGoogleReview, RawLocation, RawPartner, RawPromoPopup, RawVehicle } from './types'

/**
 * 1:1 port of Angular's DataService. Each function matches the endpoint and
 * payload shape used by src/app/providers/data/data.service.ts so the Next.js
 * app talks to the exact same APIs the Angular dist bundle does.
 */

// ────────────────────── Banner ──────────────────────
export const getAllBanner = (payload: unknown = {}) => apiPost<RawBanner[]>('/api/banner/getAllBanner', payload)

export const getAllShopBy = (payload: unknown = {}) => apiPost<unknown[]>('/api/shopby/getAllShopby', payload)

// ────────────────────── Shipping ──────────────────────
export const getShippingMethods = (payload: unknown, token?: string) =>
  apiPost<unknown[]>('/api/shipping/getfrontShipping', payload, { token })

export const getShippingMethodsByType = (payload: unknown, token?: string) =>
  apiPost<unknown[]>('/api/shipping/getShippingbytype', payload, { token })

// ────────────────────── Config ──────────────────────
export const getTaxData = (payload: unknown = {}) => apiPost<unknown>('/api/config/getTax', payload)

export const getAllConfig = (payload: unknown = {}) => apiPost<unknown>('/api/config/getAllConfig', payload)

// ────────────────────── Events ──────────────────────
export const getAllEvents = (payload: unknown = {}) => apiPost<unknown[]>('/api/event/getfrontevent', payload)

export const getEventsByURLKey = (payload: unknown) => apiPost<unknown>('/api/event/geteventapply', payload)

// ────────────────────── Colours & Sizes ──────────────────────
export const getAllColours = (payload: unknown = {}) => apiPost<unknown[]>('/api/colour/getfrontColour', payload)

export const getAllSizes = (payload: unknown = {}) => apiPost<unknown[]>('/api/size/getfrontSize', payload)

// ────────────────────── Email subscribe ──────────────────────
export const addEmailSubscribe = (payload: unknown) => apiPost<unknown>('/api/user/addEmailSubscribe', payload)

// ────────────────────── Wallet ──────────────────────
export const getWalletTransactions = (payload: unknown, token?: string) =>
  apiPost<unknown[]>('/api/wallet/getwallettransaction', payload, { token })

// ────────────────────── Promocode ──────────────────────
export const getAllPromocode = (payload: unknown = {}) => apiPost<unknown[]>('/api/promocode/getfrontpromocode', payload)

export const getPromocodeApply = (payload: unknown) => apiPost<unknown>('/api/promocode/getpromocodeapply', payload)

// ────────────────────── Car types ──────────────────────
export const getCarTypes = (payload: unknown = {}) => apiPost<RawCarType[]>('/api/cartype/getAllCartype', payload)

export const getCarTypeByURL = (payload: unknown) => apiPost<RawCarType>('/api/cartype/getCartypeWithURLKey', payload)

// ────────────────────── Brands ──────────────────────
export const getBrands = (payload: unknown = {}) => apiPost<RawBrand[]>('/api/brand/getAllBrand', payload)

// ────────────────────── Testimonials ──────────────────────
export const getTestimonials = (payload: unknown = {}) => apiPost<unknown[]>('/api/home/getlltestimonials', payload)

// ────────────────────── Vehicles ──────────────────────
export const getFilteredVehicles = (payload: unknown = {}, token?: string) =>
  apiPost<RawVehicle[]>('/api/vehicle/getfilteredvehicle', payload, { token })

export const getVehiclesWithIDs = (payload: unknown, token?: string) =>
  apiPost<RawVehicle[]>('/api/vehicle/getvehiclewithIDs', payload, { token })

export const getAllVehicles = (payload: unknown = {}, token?: string) =>
  apiPost<RawVehicle[]>('/api/vehicle/getAllVehicle', payload, { token })

export const getSingleVehicleByUrlKey = (payload: { url_key: string }, token?: string) =>
  apiPost<RawVehicle>('/api/vehicle/getVehicleWithURLKey', payload, { token })

// ────────────────────── Models / BodyTypes / Locations / Features ──────────────────────
export const getAllModels = (payload: unknown = {}) => apiPost<unknown[]>('/api/model/getAllModel', payload)

export const getAllBodyTypes = (payload: unknown = {}) => apiPost<unknown[]>('/api/bodytype/getAllBodytype', payload)

export const getAllLocations = (payload: unknown = {}) => apiPost<RawLocation[]>('/api/location/getAllLocation', payload)

export const getAllFeatures = (payload: unknown = {}) => apiPost<RawFeature[]>('/api/feature/getAllFeature', payload)

export const getSpecialAddons = (payload: unknown = {}) => apiPost<RawFeature[]>('/api/additional/getAllAdditional', payload)

// ────────────────────── Home misc ──────────────────────
export const sendWhatsappMessage = (payload: unknown) => apiPost<unknown>('/api/home/sendwhatsappmsg', payload)

export const getDownloadLink = (payload: unknown) => apiPost<unknown>('/api/home/download', payload)

// ────────────────────── Subscriber ──────────────────────
export const addSubscriber = (payload: unknown) => apiPost<unknown>('/api/subscriber/addsubscriber', payload)

export const checkIsSubscribed = (payload: unknown) => apiPost<unknown>('/api/subscriber/isSubscribed', payload)

export const unSubscribe = (payload: unknown) => apiPost<unknown>('/api/subscriber/unsubscribe', payload)

// ────────────────────── Popups & reviews ──────────────────────
export const getPromotionalCodes = (payload: Record<string, unknown> = {}, token?: string) => {
  const body = token ? { ...payload, token } : payload
  return apiPost<RawPromoPopup[]>('/api/promopopup/getfrontpopup', body, { token })
}

export const dismissPromoPopup = (promoId: string, token: string) =>
  apiPost<{ status?: string }>(
    '/api/promopopup/dismiss',
    { promo_id: promoId, token },
    { token }
  )

export const getAllGoogleReviews = (payload: unknown = {}) => apiPost<RawGoogleReview[]>('/api/googlereview/getAllGooglereview', payload)

export const getPartners = (payload: unknown = {}) => apiPost<RawPartner[]>('/api/partner/getPartners', payload)

/** Body shape aligned with Angular `HomeComponent` contact form → `contactadd`. */
export type ContactAddPayload = {
  name: string
  lastname: string
  email: string
  phone: string
  message: string
  /** Product / lease enquiry only — omit on /contact */
  day?: string
  price?: number | string
  currency?: string
  product?: string
}

/** General contact / enquiry — matches Angular's ContactService.addContact →
 *  POST /api/home/contactadd (used by new-detail, lease, home, etc.). */
export const addContact = (payload: ContactAddPayload) =>
  apiPost<unknown>('/api/home/contactadd', payload)
