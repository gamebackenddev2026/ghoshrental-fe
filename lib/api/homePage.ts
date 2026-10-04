import { safeApiCall } from './client'
import {
  getAllBanner,
  getAllGoogleReviews,
  getAllLocations,
  getAllVehicles,
  getBrands,
  getCarTypes,
  getFilteredVehicles,
  getPartners,
  getPromotionalCodes,
  getSpecialAddons
} from './home'
import { getAllCategory } from './category'
import {
  getSocialPosts,
  toInstagramProfileStats,
  toYoutubeChannelStats,
  type InstagramProfileStats,
  type YoutubeChannelStats
} from './social'
import { toSocialPosts, type SocialPostItem } from './socialAdapters'
import { enrichSocialPostsWithThumbnails } from './socialThumbnails'
import {
  toBrandItem,
  toCarItem,
  vehicleHasCardMedia,
  toCarType,
  toFeatureItem,
  toGoogleReview,
  toHomeBanner,
  toLocation,
  toPartnerItem,
  partnerSequenceNumber,
  toYachtItem,
  type ActivePromo,
  pickActivePromo,
  type FeatureItem,
  type HeroBanner,
  type LocationItem
} from './adapters'
import {
  brands as fallbackBrands,
  features as fallbackFeatures,
  googleReviews as fallbackGoogleReviews,
  ourCarCollections as fallbackCars,
  ourPartners as fallbackPartners,
  ourYachtsCollections as fallbackYachts,
  trendingRentalCars as fallbackTrending,
  type BrandItem,
  type CarItem,
  type CarType,
  type GoogleReview,
  type PartnerItem,
  type YachtItem
} from '@/components/home/mockData'

export type HomePageData = {
  banner: HeroBanner | null
  carCollection: CarItem[]
  yachtCollection: YachtItem[]
  trendingCars: CarItem[]
  carTypes: CarType[]
  brands: BrandItem[]
  trendingBrands: BrandItem[]
  locations: LocationItem[]
  features: FeatureItem[]
  googleReviews: GoogleReview[]
  partners: PartnerItem[]
  socialPosts: SocialPostItem[]
  youtubeChannelStats: YoutubeChannelStats | null
  instagramProfileStats: InstagramProfileStats | null
  promo: ActivePromo | null
  categoriesCount: number
  allVehiclesCount: number
  sources: {
    banner: 'api' | 'fallback'
    vehicles: 'api' | 'fallback'
    yachts: 'api' | 'fallback'
    carTypes: 'api' | 'fallback'
    brands: 'api' | 'fallback'
    features: 'api' | 'fallback'
    locations: 'api' | 'fallback'
    reviews: 'api' | 'fallback'
    partners: 'api' | 'fallback'
    socialPosts: 'api' | 'fallback'
  }
}

const CARS_PAYLOAD = {
  limit: 100,
  page: 1,
  availabilityStatus: 'available',
  vehicle_type: 'Car',
  home_vehicle: true
} as const

const YACHTS_PAYLOAD = {
  limit: 100,
  page: 1,
  availabilityStatus: 'available',
  vehicle_type: 'Yachts',
  home_vehicle: true
} as const

/**
 * Mirrors HomeComponent.ngOnInit() from the Angular app:
 * fires every home-page API call in parallel, then reshapes the responses
 * into the UI types used by the Next.js components. Every call is wrapped
 * in safeApiCall so one upstream failure never blanks the page.
 */
export async function loadHomePageData(authToken?: string): Promise<HomePageData> {
  const [
    bannerRes,
    carsRes,
    yachtsRes,
    carTypesRes,
    brandsRes,
    allVehiclesRes,
    locationsRes,
    featuresRes,
    reviewsRes,
    partnersRes,
    promoRes,
    categoriesRes,
    youtubeSocialRes,
    instagramSocialRes
  ] = await Promise.all([
    safeApiCall('getAllBanner', () => getAllBanner({}), null),
    safeApiCall('getFilteredVehicles(Car)', () => getFilteredVehicles(CARS_PAYLOAD, authToken), null),
    safeApiCall('getFilteredVehicles(Yachts)', () => getFilteredVehicles(YACHTS_PAYLOAD, authToken), null),
    safeApiCall('getCarTypes', () => getCarTypes({}), null),
    safeApiCall('getBrands', () => getBrands({}), null),
    safeApiCall('getAllVehicles', () => getAllVehicles({}), null),
    safeApiCall('getAllLocations', () => getAllLocations({}), null),
    safeApiCall('getSpecialAddons', () => getSpecialAddons({}), null),
    safeApiCall('getAllGoogleReviews', () => getAllGoogleReviews({}), null),
    safeApiCall('getPartners', () => getPartners({}), null),
    safeApiCall('getPromotionalCodes', () => getPromotionalCodes({}), null),
    safeApiCall('getAllCategory', () => getAllCategory({}), null),
    safeApiCall('getSocialPosts(youtube)', () => getSocialPosts({ type: 'youtube' }), null),
    safeApiCall('getSocialPosts(instagram)', () => getSocialPosts({ type: 'instagram' }), null)
  ])

  // ── Banner ──
  const banner = bannerRes && bannerRes.code === 200 && Array.isArray(bannerRes.result) ? toHomeBanner(bannerRes.result) : null

  // ── Cars + trending (same shaping as yachts — trust API payload, map all rows) ──
  const carsApiOk = carsRes != null && carsRes.code === 200 && Array.isArray(carsRes.result)
  let carCollection: CarItem[] = []
  let trendingCars: CarItem[] = []
  if (carsApiOk) {
    const raws = carsRes.result
    carCollection = raws.map(toCarItem).filter((c) => c.name && vehicleHasCardMedia(c))
    trendingCars = raws
      .filter((v) => v && v.featured_vehicle)
      .slice(0, 6)
      .map(toCarItem)
      .filter((c) => c.name && vehicleHasCardMedia(c))
    if (!trendingCars.length) {
      trendingCars = carCollection.slice(0, 6)
    }
  }

  // ── Yachts ──
  const yachtsApiOk = yachtsRes != null && yachtsRes.code === 200 && Array.isArray(yachtsRes.result)
  let yachtCollection: YachtItem[] = []
  if (yachtsApiOk) {
    yachtCollection = yachtsRes.result.map(toYachtItem).filter((y) => y.name && vehicleHasCardMedia(y))
  }

  // ── Car types ──
  let carTypes: CarType[] = []
  if (carTypesRes && carTypesRes.code === 200 && Array.isArray(carTypesRes.result)) {
    carTypes = carTypesRes.result.map(toCarType).filter((c): c is CarType => c !== null)
  }

  // ── Brands (Angular filters: type === 'Car' && image.length > 0) ──
  let brands: BrandItem[] = []
  let trendingBrands: BrandItem[] = []
  if (brandsRes && brandsRes.code === 200 && Array.isArray(brandsRes.result)) {
    const raws = brandsRes.result
    brands = raws
      .filter((b) => b && b.type === 'Car')
      .map(toBrandItem)
      .filter((b): b is BrandItem => b !== null)
    trendingBrands = raws
      .filter((b) => b && b.istopbrand === true)
      .map(toBrandItem)
      .filter((b): b is BrandItem => b !== null)
  }

  // ── Locations ──
  let locations: LocationItem[] = []
  if (locationsRes && locationsRes.code === 200 && Array.isArray(locationsRes.result)) {
    locations = locationsRes.result.map(toLocation).filter((l) => l.name)
  }

  // ── Features (Angular: filter vehicle_type === 'Car') ──
  //
  // NOTE — "Experience The Difference" parity:
  // In the Angular dist build, the four feature cards under "Experience The
  // Difference" are a HARDCODED list of static asset icons (home.component.ts
  // lines 137–162, rendered as `<img [src]="imageURL + '/' + feature.image">`
  // where imageURL = environment.url + '/assets'). The /additional/getAllAdditional
  // endpoint is used elsewhere (addons/extras) and its rows don't carry image
  // URLs. We therefore require `f.image` here so empty API rows can't replace
  // the static icons — if they all lack images (the current upstream behavior),
  // `features` ends up empty and HomePageClient falls back to the mockData list
  // which mirrors Angular's hardcoded array 1:1.
  let features: FeatureItem[] = []
  if (featuresRes && featuresRes.code === 200 && Array.isArray(featuresRes.result)) {
    features = featuresRes.result
      .filter((f) => f && f.vehicle_type === 'Car')
      .map(toFeatureItem)
      .filter((f) => f.title && f.image)
  }

  // ── Google reviews ──
  let googleReviews: GoogleReview[] = []
  if (reviewsRes && reviewsRes.code === 200 && Array.isArray(reviewsRes.result)) {
    googleReviews = reviewsRes.result.map(toGoogleReview).filter((r) => r.text)
  }

  // ── Partners (sorted by sequence_number) ──
  const partnersApiOk = partnersRes != null && partnersRes.code === 200 && Array.isArray(partnersRes.result)
  let partners: PartnerItem[] = []
  if (partnersApiOk) {
    partners = partnersRes.result
      .slice()
      .sort((a, b) => partnerSequenceNumber(a) - partnerSequenceNumber(b))
      .map(toPartnerItem)
      .filter((p): p is PartnerItem => p !== null)
  }

  // ── Social posts (YouTube channel feed + admin Instagram) ──
  const youtubeSocialOk = youtubeSocialRes != null && youtubeSocialRes.code === 200 && Array.isArray(youtubeSocialRes.result)
  const instagramSocialOk =
    instagramSocialRes != null && instagramSocialRes.code === 200 && Array.isArray(instagramSocialRes.result)
  const socialPostsApiOk = youtubeSocialOk || instagramSocialOk
  const socialPostsRaw = toSocialPosts([
    ...(youtubeSocialOk ? youtubeSocialRes.result : []),
    ...(instagramSocialOk ? instagramSocialRes.result : [])
  ])
  const socialPosts = await enrichSocialPostsWithThumbnails(socialPostsRaw)
  const youtubeChannelStats = toYoutubeChannelStats(youtubeSocialRes)
  const instagramProfileStats = toInstagramProfileStats(instagramSocialRes)

  // ── Promo popup ──
  const promo = promoRes && promoRes.code === 200 && Array.isArray(promoRes.result) ? pickActivePromo(promoRes.result) : null

  // ── Counts for diagnostics ──
  const categoriesCount =
    categoriesRes && categoriesRes.code === 200 && Array.isArray(categoriesRes.result) ? categoriesRes.result.length : 0
  const allVehiclesCount =
    allVehiclesRes && allVehiclesRes.code === 200 && Array.isArray(allVehiclesRes.result) ? allVehiclesRes.result.length : 0

  return {
    banner,
    carCollection: carsApiOk && carCollection.length ? carCollection : fallbackCars,
    yachtCollection: yachtsApiOk ? yachtCollection : fallbackYachts,
    trendingCars: carsApiOk && trendingCars.length ? trendingCars : fallbackTrending,
    carTypes,
    brands: brands.length ? brands : fallbackBrands,
    trendingBrands: trendingBrands.length ? trendingBrands : fallbackBrands.slice(0, 6),
    locations,
    features: features.length
      ? features
      : fallbackFeatures.map((f) => ({
          image: f.image,
          alt: f.alt,
          title: f.title,
          description: f.description
        })),
    googleReviews: googleReviews.length ? googleReviews : fallbackGoogleReviews,
    partners: partnersApiOk && partners.length ? partners : fallbackPartners,
    socialPosts,
    youtubeChannelStats,
    instagramProfileStats,
    promo,
    categoriesCount,
    allVehiclesCount,
    sources: {
      banner: banner ? 'api' : 'fallback',
      vehicles: carsApiOk ? 'api' : 'fallback',
      yachts: yachtsApiOk ? 'api' : 'fallback',
      carTypes: carTypes.length ? 'api' : 'fallback',
      brands: brands.length ? 'api' : 'fallback',
      features: features.length ? 'api' : 'fallback',
      locations: locations.length ? 'api' : 'fallback',
      reviews: googleReviews.length ? 'api' : 'fallback',
      partners: partnersApiOk && partners.length ? 'api' : 'fallback',
      socialPosts: socialPostsApiOk && socialPosts.length ? 'api' : 'fallback'
    }
  }
}
