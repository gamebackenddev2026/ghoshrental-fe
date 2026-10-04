import { resolvePublicMediaUrl, type PublicMediaFolder } from './mediaUrl'

// export const FALLBACK_SITE_ORIGIN = 'http://localhost:5014'
export const FALLBACK_SITE_ORIGIN = 'https://www.ghostrentals.com'

/** `development` | `production` — set via `APP_ENV` in `.env` / hosting env. */
export const APP_ENV = process.env.APP_ENV?.trim() || 'production'
export const IS_DEVELOPMENT = APP_ENV === 'development'

/**
 * Accept either form for NEXT_PUBLIC_API_BASE_URL and reduce to a bare origin
 * (no trailing slash, no trailing `/api`):
 *   https://www.ghostrentals.com/api/  →  https://www.ghostrentals.com
 *   https://www.ghostrentals.com/      →  https://www.ghostrentals.com
 *   https://www.ghostrentals.com       →  https://www.ghostrentals.com
 *
 * This matters because every endpoint in `lib/api/*.ts` already begins with
 * `/api/...` (matching Angular's DataService paths), so we must not duplicate
 * the `/api` segment.
 */
export function normalizeApiOrigin(raw: string | undefined | null): string {
  if (!raw) return FALLBACK_SITE_ORIGIN
  let origin = raw.trim().replace(/\/+$/, '')
  if (origin.toLowerCase().endsWith('/api')) {
    origin = origin.slice(0, -'/api'.length)
  }
  return origin || FALLBACK_SITE_ORIGIN
}

/**
 * The normalized upstream origin (e.g. `http://localhost:5014` or `https://www.ghostrentals.com`).
 * `lib/api/client.ts` calls `${API_ORIGIN}/api/...` from both server and browser.
 * `/public/*` media URLs still use same-origin rewrites in next.config.ts.
 */
export const API_ORIGIN = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_BASE_URL)

/** Alias for route handlers; same as {@link API_ORIGIN}. */
export const API_BASE_URL = API_ORIGIN

/**
 * Passport Google OAuth starts on the API origin (browser navigates here; expect 302 to Google).
 * Callback is configured on the backend (e.g. `…/api/auth/google/callback`), not on Next.js.
 */
export function getGoogleOAuthStartUrl(): string {
  return `${API_ORIGIN}/api/auth/google`
}

/**
 * Passport Apple OAuth starts on the API origin (browser navigates here; expect 302 to Apple).
 * Callback is configured on the backend (e.g. `…/api/auth/apple/callback`), not on Next.js.
 */
export function getAppleOAuthStartUrl(): string {
  return `${API_ORIGIN}/api/auth/apple`
}

/**
 * Before redirecting to {@link getGoogleOAuthStartUrl}, the client stores the desired post-login
 * path; `/auth/google/success` reads this after the API redirects back with token query params.
 */
export const POST_OAUTH_RETURN_SESSION_KEY = 'ghostrentals-post-oauth-return'

/**
 * When a brand-new Google/Apple signup is redirected to the mandatory
 * Individual/Business onboarding step, the original post-login destination
 * (normally read from {@link POST_OAUTH_RETURN_SESSION_KEY}) is stashed here
 * so the onboarding page can forward the user afterward.
 */
export const POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY = 'ghostrentals-post-oauth-onboarding-next'

export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '/assets'

export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? FALLBACK_SITE_ORIGIN

export function toAssetUrl(path: string): string {
  return `${ASSET_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export function toMediaUrl(path: string): string {
  return `${MEDIA_BASE_URL}/${path.replace(/^\/+/, '')}`
}

/** Local default hero clip (`public/assets/banner/ghost-rental-banner.mp4`). */
export const DEFAULT_LOCAL_BANNER_VIDEO = 'banner/ghost-rental-banner.mp4'

/** Remote fallback when local / CMS video fails. */
export const REMOTE_BANNER_VIDEO_FILENAME = 'ghost-rental-banner-20251112140820.mp4'

/** Preload + default hero src (local). */
export const HOME_HERO_BANNER_VIDEO = toAssetUrl(DEFAULT_LOCAL_BANNER_VIDEO)

/** @deprecated Use {@link defaultLocalBannerVideoUrl} */
export const HOME_HERO_BANNER_VIDEO_FALLBACK = HOME_HERO_BANNER_VIDEO

/** Fallback stills when CMS serves a home hero image (not used as video poster). */
export const HOME_HERO_POSTER_DESKTOP = 'loader-video/luxury-car-and-yacht-services.webp'
export const HOME_HERO_POSTER_MOBILE = 'loader-video/rent-car-yacht-services-in-dubai.webp'

export function defaultLocalBannerVideoUrl(): string {
  return toAssetUrl(DEFAULT_LOCAL_BANNER_VIDEO)
}

/**
 * Absolute banner media URL on the configured API origin.
 * Matches Angular home: `${baseUrl}/public/banner/${media_data[0].src}`.
 */
export function bannerCmsMediaUrl(filename: string): string {
  const file = filename.replace(/^\/+/, '')
  return `${API_ORIGIN}/public/banner/${file}`
}

/** Blog featured image — `${API_ORIGIN}/public/blog/${filename}`. */
export function blogCmsMediaUrl(filename: string): string {
  const file = filename.replace(/^\/+/, '')
  return `${API_ORIGIN}/public/blog/${file}`
}

/** CMS banner media via same-origin rewrite → configured API origin `/public/banner/*`. */
export function remoteCmsBannerUrl(filename: string): string {
  return bannerCmsMediaUrl(filename)
}

export function remoteBannerFallbackVideoUrl(): string {
  return remoteCmsBannerUrl(REMOTE_BANNER_VIDEO_FILENAME)
}

export function homeBannerVideoUrl(filename: string): string {
  return remoteCmsBannerUrl(filename)
}

export type CmsBannerLike = {
  file_type?: string
  src?: string
  media_url?: string
} | null

/**
 * Hero video from CMS banner API only (`getAllBanner` → `media_url`).
 * No local `/assets/banner/*` or hardcoded production fallbacks.
 */
export function resolveCmsBannerVideoSources(banner: CmsBannerLike): {
  primaryVideo: string
  fallbackVideo: string
} {
  const mediaUrl = banner?.media_url?.trim() ?? ''
  const isVideo =
    String(banner?.file_type ?? '').toLowerCase() === 'video' || (/\.(mp4|webm|ogg)(\?|$)/i.test(mediaUrl) && mediaUrl.length > 0)

  const apiVideo = isVideo && mediaUrl ? mediaUrl : ''

  return {
    primaryVideo: apiVideo,
    fallbackVideo: ''
  }
}

/** CMS banner images/videos — same-origin `/public/banner/*` (rewritten to API origin). */
export function bannerPublicUrl(filename: string): string {
  return `/public/banner/${filename.replace(/^\/+/, '')}`
}

/**
 * Vehicle / brand / cartype images.
 * Vehicle media resolves to S3; brand/cartype still use `/public/*` rewrite when needed.
 */
export type { PublicMediaFolder } from './mediaUrl'

export function publicMediaUrl(folder: PublicMediaFolder, filename: string): string {
  return resolvePublicMediaUrl(folder, filename)
}
