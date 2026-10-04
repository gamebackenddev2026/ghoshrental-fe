import { API_ORIGIN } from '@/lib/config'
import { isAbsoluteMediaUrl, resolveCardImageSrc } from '@/lib/mediaUrl'
import type { RawRecord, RawSocialPost } from './types'

export type SocialPlatform = 'instagram' | 'youtube'

export type SocialPostItem = {
  id: string
  platform: SocialPlatform
  href: string
  src: string
  videoSrc?: string
  isVideo?: boolean
  alt: string
}

const INSTAGRAM_GRID_LIMIT = 4
const YOUTUBE_RAIL_LIMIT = 4

function firstString(source: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function firstNumber(source: RawRecord, keys: string[]): number {
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

function isActivePost(raw: RawSocialPost): boolean {
  if (raw.isDeleted === true || raw.is_deleted === true) return false
  if (raw.is_active === false || raw.isActive === false) return false
  const status = raw.status
  if (status === false || status === 0 || status === '0') return false
  if (typeof status === 'string' && ['inactive', 'disabled', 'false'].includes(status.toLowerCase())) {
    return false
  }
  return true
}

function isSocialPermalink(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host.includes('instagram.com') || host.includes('facebook.com') || host.includes('youtu')
  } catch {
    return false
  }
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const path = parsed.pathname

    if (host === 'youtu.be') {
      const id = path.split('/').filter(Boolean)[0] ?? ''
      return /^[\w-]{11}$/.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const watchId = parsed.searchParams.get('v')
      if (watchId && /^[\w-]{11}$/.test(watchId)) return watchId

      const segments = path.split('/').filter(Boolean)
      if ((segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live') && segments[1]) {
        const id = segments[1]
        return /^[\w-]{11}$/.test(id) ? id : null
      }
    }
  } catch {
    return null
  }
  return null
}

function resolvePlatform(raw: RawSocialPost, href: string): SocialPlatform | null {
  const platform = firstString(raw, ['platform', 'social_platform', 'type', 'channel']).toLowerCase()
  if (platform.includes('youtube') || platform === 'yt') return 'youtube'
  if (platform.includes('instagram') || platform === 'ig') return 'instagram'

  try {
    const host = new URL(href).hostname.toLowerCase()
    if (host.includes('youtu')) return 'youtube'
    if (host.includes('instagram.com')) return 'instagram'
  } catch {
    return null
  }
  return null
}

function resolveSocialImageUrl(raw: RawSocialPost): string {
  const imageField = raw.image
  const imageFromObject =
    imageField && typeof imageField === 'object'
      ? firstString(imageField as RawRecord, ['s3_url', 'src_url', 'url', 'src'])
      : typeof imageField === 'string'
        ? imageField.trim()
        : ''

  const candidates = [
    firstString(raw, ['image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl', 'thumbnail']),
    firstString(raw, ['media_url', 'mediaUrl', 's3_url', 's3Url', 'src_url', 'srcUrl']),
    firstString(raw, ['photo', 'media']),
    imageFromObject,
    firstString(raw, ['src'])
  ]
    .filter(Boolean)
    .filter((candidate) => !isSocialPermalink(candidate))

  for (const candidate of candidates) {
    const resolved = resolveCardImageSrc(candidate)
    if (resolved) return resolved
    if (isAbsoluteMediaUrl(candidate)) return candidate
    const relative = candidate.replace(/^\/+/, '')
    if (!relative) continue
    const viaApi = `${API_ORIGIN}/public/media/${relative}`
    if (resolveCardImageSrc(viaApi)) return viaApi
  }

  return ''
}

function resolveYoutubeHref(raw: RawSocialPost): string {
  const direct = firstString(raw, [
    'post_url',
    'postUrl',
    'permalink',
    'youtube_url',
    'youtubeUrl',
    'url',
    'link',
    'href',
    'embedUrl',
    'embed_url'
  ])
  if (direct) return direct

  const videoId = firstString(raw, ['videoId', 'video_id'])
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''
}

function resolveSocialHref(raw: RawSocialPost): string {
  const platformHint = firstString(raw, ['platform', 'social_platform', 'type', 'channel']).toLowerCase()
  if (platformHint.includes('youtube') || platformHint === 'yt') {
    return resolveYoutubeHref(raw)
  }

  return (
    firstString(raw, [
      'post_url',
      'postUrl',
      'permalink',
      'instagram_url',
      'instagramUrl',
      'youtube_url',
      'youtubeUrl',
      'url',
      'link',
      'href'
    ]) || resolveYoutubeHref(raw)
  )
}

function socialPostId(raw: RawSocialPost, href: string, index: number): string {
  return (
    firstString(raw, ['_id', 'id', 'post_id', 'postId', 'videoId', 'video_id']) ||
    href ||
    `social-post-${index}`
  )
}

export function unwrapSocialPosts(result: unknown): RawSocialPost[] {
  if (Array.isArray(result)) return result as RawSocialPost[]
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>
    for (const key of ['posts', 'socialPosts', 'social_posts', 'data', 'items']) {
      const nested = record[key]
      if (Array.isArray(nested)) return nested as RawSocialPost[]
    }
  }
  return []
}

export function toSocialPostItem(raw: RawSocialPost, index: number): SocialPostItem | null {
  if (!isActivePost(raw)) return null

  const href = resolveSocialHref(raw)
  if (!href) return null

  const platform = resolvePlatform(raw, href)
  if (!platform) return null

  if (platform === 'youtube' && !extractYoutubeVideoId(href)) return null

  const src =
    platform === 'youtube'
      ? (() => {
          const id = extractYoutubeVideoId(href)
          return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
        })()
      : resolveSocialImageUrl(raw)

  const alt =
    firstString(raw, ['alt', 'alt_text', 'altText', 'title', 'caption', 'name', 'description']) ||
    (platform === 'youtube' ? 'Ghost Rentals on YouTube' : 'Ghost Rentals on Instagram')

  return {
    id: socialPostId(raw, href, index),
    platform,
    href,
    src,
    isVideo: platform === 'instagram' ? /\/reel\//i.test(href) : undefined,
    alt
  }
}

function sortSocialPosts(result: unknown): SocialPostItem[] {
  return unwrapSocialPosts(result)
    .map((raw, index) => ({
      item: toSocialPostItem(raw, index),
      order: firstNumber(raw, ['sequence_number', 'sequenceNumber', 'sort_order', 'sortOrder', 'order'])
    }))
    .filter((entry): entry is { item: SocialPostItem; order: number } => entry.item !== null)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.item)
}

/** Instagram + YouTube posts from the social API (capped per platform). */
export function toSocialPosts(result: unknown): SocialPostItem[] {
  const posts = sortSocialPosts(result)
  const youtube = posts.filter((post) => post.platform === 'youtube').slice(0, YOUTUBE_RAIL_LIMIT)
  const instagram = posts.filter((post) => post.platform === 'instagram').slice(0, INSTAGRAM_GRID_LIMIT)
  return [...youtube, ...instagram]
}

export { INSTAGRAM_GRID_LIMIT, YOUTUBE_RAIL_LIMIT }
