/**
 * Loose raw types mirroring the payloads the Angular app consumes from
 * the live backend. We keep them permissive because the Angular source
 * itself reads fields as `any` and the backend has no published schema.
 */
export type RawRecord = Record<string, unknown>

export type RawMedia = {
  _id?: string
  src?: string
  file_name?: string
  file_type?: string
  format?: string
  alt?: string
  name?: string
  height?: string
  width?: string
  sequence_number?: number | null
  media_id?: string
  /** Full CDN / S3 URL from upstream (preferred for display). */
  url?: string
  src_url?: string
  s3_url?: string
}

export type RawMediaRef = RawMedia | string

export type RawVehicle = RawRecord & {
  _id?: string
  vehicle_id?: string
  name?: string
  url_key?: string
  vehicle_type?: string
  home_vehicle?: boolean
  featured_vehicle?: boolean
  transmission?: string
  fuel_type?: string
  fuelType?: string
  mileage?: string | number
  weeklyMileage?: string | number
  monthlyMileage?: string | number
  seating_capacity?: number | string
  daily_rate?: number | string
  dailyRate?: number | string
  regular_rate_daily?: number | string
  regularRateDaily?: number | string
  hourly_rate?: number | string
  hourlyRate?: number | string
  regular_rate_hourly?: number | string
  regularRateHourly?: number | string
  length?: string | number
  body_type?: string
  bodyType?: string
  bodytype_data?: Array<{ _id?: string; name?: string; url_key?: string }>
  cartype?: string
  guest_capacity?: number | string
  year?: string | number
  door_count?: number | string
  engine_size?: string
  color_data?: Array<{ _id?: string; name?: string }>
  drive_type?: string
  crew_included?: boolean
  mileageCost?: number | string
  description?: string
  short_description?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  gcc?: boolean
  weeklyRate?: number | string
  monthlyRate?: number | string
  halfdayRate?: number | string
  regularRateHalfDay?: number | string
  purchase_price?: number | string
  insurence_price?: number | string
  lease_available?: boolean
  related_vehicles?: Array<string | RawVehicle>
  /** Populated related vehicles from product detail aggregation. */
  related_vehicles_data?: RawVehicle[]
  /** Top-level hero/thumbnail URL (S3) when gallery uses populated URLs. */
  media_url?: string
  media_data?: RawMedia[]
  gallery_image?: RawMedia[]
  featureimagedata?: RawMedia[]
  /** Populated feature refs (`id` = catalog feature id, `_id` = vehicle-feature ref, `s3_url`). */
  featureIds?: Array<RawMedia & { id?: string; name?: string }>
  /** Top-level thumbnail URL when `media_data` uses S3. */
  image_url?: string
  image?: string | RawMedia | RawMedia[]
  feature_data?: Array<{
    _id?: string
    name?: string
    type?: string
    image?: Array<{ media_id?: string; _id?: string; feature_id?: string }>
    imageData?: RawMedia
  }>
  wishlist_data?: Array<{ customer_id?: string }>
  colour_id?: string[]
  size?: Array<{ _id?: string }>
  sale_price?: number | string
  brand_data?: Array<{ url_key?: string; name?: string }>
  isvipNumberPlate?: boolean
  is_wishlist?: boolean
  availabilityStatus?: string
  customer_pricing?: {
    account_type?: string
    discount_percent?: number
    rates?: Record<string, { original?: number; discounted?: number }>
  }
  original_dailyRate?: number | string
  original_daily_rate?: number | string
  original_weeklyRate?: number | string
  original_monthlyRate?: number | string
}

export type RawBrand = RawRecord & {
  _id?: string
  name?: string
  url_key?: string
  image?: RawMediaRef[] | RawMediaRef
  type?: string
  istopbrand?: boolean
}

export type RawCarType = RawRecord & {
  _id?: string
  name?: string
  url_key?: string
  title?: string
  alt?: string
  image?: RawMediaRef[] | RawMediaRef
}

export type RawBanner = RawRecord & {
  name?: string
  page?: string
  /** Media id string or populated media row (home_banner includes `s3_url`). */
  image?: RawMediaRef
  media_data?: RawMedia[]
  short_desc?: string
  description?: string
  status?: boolean
}

export type RawLocation = RawRecord & {
  _id?: string
  name?: string
  url_key?: string
}

export type RawConfig = RawRecord & {
  _id?: string
  key?: string
  name?: string
  title?: string
  slug?: string
  config_key?: string
  option?: string
  value?: unknown
  config_value?: unknown
}

export type RawFeature = RawRecord & {
  _id?: string
  name?: string
  type?: string
  image?: RawMediaRef[] | RawMediaRef
  alt?: string
  title?: string
  description?: string
  vehicle_type?: string
}

export type RawPartner = RawRecord & {
  _id?: string
  name?: string
  partner_name?: string
  url_key?: string
  slug?: string
  /** Short perk line (e.g. "OneClickDrive offers"). */
  heading?: string
  /** Short perk line (e.g. "20% off for ADCB"). */
  offer_tag?: string
  offerTag?: string
  tagline?: string
  tag?: string
  subtitle?: string
  description?: string
  short_description?: string
  short_desc?: string
  /** Full S3 URL from `/api/partner/getPartners`. */
  image_url?: string
  image?: RawMediaRef[] | RawMediaRef
  logo?: RawMediaRef[] | RawMediaRef | string
  partner_image?: RawMediaRef[] | RawMediaRef
  media?: RawMediaRef[] | RawMediaRef
  link?: string
  sequence_number?: number | null
  sequenceNumber?: number | null
  status?: boolean | string
  is_active?: boolean
  isDeleted?: boolean
  is_deleted?: boolean
}

export type RawGoogleReview = RawRecord & {
  author_name?: string
  profile_photo_url?: string
  rating?: number
  relative_time_description?: string
  text?: string
  author_url?: string
}

export type RawPromoPopup = RawRecord & {
  _id?: string
  discount?: number | string
  status?: boolean
  already_dismissed?: boolean
  schedule?: { from?: string; to?: string }
  title?: string
  name?: string
  short_desc?: string
  description?: string
  image?: RawMediaRef[] | RawMediaRef
  media_data?: RawMedia[]
}

export type RawPage = RawRecord & {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
}

export type RawBlogTag = RawRecord & {
  _id?: string
  id?: string
  name?: string
  slug?: string
  description?: string
  image?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
}

export type RawBlogCategory = RawRecord & {
  _id?: string
  id?: string
  /** Business category id used on blog posts — e.g. "1" */
  category_id?: string
  /** Same as category_id on some responses */
  category?: string
  count?: number
  name?: string
  slug?: string
  description?: string
  image?: string | RawMediaRef
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
}

export type RawBlog = RawRecord & {
  _id?: string
  id?: string
  title?: string
  name?: string
  slug?: string
  url_key?: string
  description?: string
  short_description?: string
  short_desc?: string
  content?: string
  body?: string
  image?: string | RawMediaRef | RawMedia
  featured_image?: string | RawMediaRef | RawMedia
  media_data?: RawMedia[]
  category?: string | RawBlogCategory
  categoryId?: string
  category_id?: string
  category_name?: string
  category_slug?: string
  category_data?: RawBlogCategory
  tags?: Array<string | RawBlogTag>
  tagIds?: string[]
  tag_data?: RawBlogTag[]
  tagsdata?: string[]
  author?: string
  author_name?: string
  image_url?: string
  s3_url?: string
  status?: boolean
  isPublished?: boolean
  publication_date?: string
  published_at?: string
  created_at?: string
  updated_at?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
}

export type RawBlogListResult = {
  data?: RawBlog[]
  blogs?: RawBlog[]
  result?: RawBlog[]
  total?: number
  totalCount?: number
  count?: number
  page?: number
  limit?: number
}

export type RawSocialPost = RawRecord & {
  _id?: string
  id?: string
  post_id?: string
  platform?: string
  social_platform?: string
  type?: string
  channel?: string
  videoId?: string
  video_id?: string
  post_url?: string
  postUrl?: string
  permalink?: string
  instagram_url?: string
  youtube_url?: string
  youtubeUrl?: string
  embedUrl?: string
  embed_url?: string
  url?: string
  link?: string
  href?: string
  image_url?: string
  imageUrl?: string
  thumbnail_url?: string
  thumbnail?: string
  media_url?: string
  s3_url?: string
  src_url?: string
  image?: string | RawMedia
  src?: string
  alt?: string
  alt_text?: string
  title?: string
  caption?: string
  name?: string
  description?: string
  channelTitle?: string
  publishedAt?: string
  sequence_number?: number | string
  sort_order?: number | string
  status?: boolean | number | string
  is_active?: boolean
  isActive?: boolean
  is_deleted?: boolean
  isDeleted?: boolean
}
