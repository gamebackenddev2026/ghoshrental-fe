import { FALLBACK_SITE_ORIGIN, toAssetUrl } from '@/lib/config'

/** Initials avatar when Google profile photos are missing or blocked. */
export function uiAvatarUrl(authorName: string): string {
  const name = authorName.trim() || 'Guest'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d1d1d&color=e4c98a&bold=true`
}

/** Prefer API photo URL; fall back to generated avatar when absent. */
export function resolveReviewerPhotoUrl(authorName: string, profilePhotoUrl?: string): string {
  const url = profilePhotoUrl?.trim() ?? ''
  if (/^https?:\/\//i.test(url)) return url
  return uiAvatarUrl(authorName)
}

/** Local `/assets/*` with production fallback (matches live ghostrentals.com). */
export function resolveAssetWithProductionFallback(relativePath: string): {
  primary: string
  fallback: string
} {
  const clean = relativePath.replace(/^\/+/, '')
  return {
    primary: toAssetUrl(clean),
    fallback: `${FALLBACK_SITE_ORIGIN}/assets/${clean}`,
  }
}
