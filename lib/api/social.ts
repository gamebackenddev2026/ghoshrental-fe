import { apiGet, type ApiResponse } from './client'
import type { RawSocialPost } from './types'

export type SocialPostQueryType = 'youtube' | 'instagram'

export type YoutubeChannelStats = {
  subscriberCount: number | null
  hiddenSubscriberCount: boolean
  videoCount: number | null
  viewCount: number | null
}

export type InstagramProfileStats = {
  followerCount: number | null
}

export type SocialPostsApiResponse = ApiResponse<RawSocialPost[]> & {
  status?: string
  subscriberCount?: number | null
  hiddenSubscriberCount?: boolean
  videoCount?: number | null
  viewCount?: number | null
  followerCount?: number | null
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Parse channel stats from `GET …/getSocialPosts?type=youtube` (top-level fields). */
export function toYoutubeChannelStats(res: SocialPostsApiResponse | null | undefined): YoutubeChannelStats | null {
  if (!res || res.code !== 200) return null

  const hidden =
    res.hiddenSubscriberCount === true ||
    (res as { hidden_subscriber_count?: boolean }).hidden_subscriber_count === true

  const subscriberCount = toNullableNumber(
    res.subscriberCount ?? (res as { subscriber_count?: unknown }).subscriber_count
  )
  const videoCount = toNullableNumber(res.videoCount ?? (res as { video_count?: unknown }).video_count)
  const viewCount = toNullableNumber(res.viewCount ?? (res as { view_count?: unknown }).view_count)

  if (subscriberCount == null && videoCount == null && viewCount == null && !hidden) {
    return null
  }

  return {
    subscriberCount,
    hiddenSubscriberCount: hidden,
    videoCount,
    viewCount
  }
}

/** Parse IG follower count from `GET …/getSocialPosts?type=instagram` (or combined). */
export function toInstagramProfileStats(res: SocialPostsApiResponse | null | undefined): InstagramProfileStats | null {
  if (!res || res.code !== 200) return null

  const followerCount = toNullableNumber(
    res.followerCount ?? (res as { follower_count?: unknown }).follower_count
  )
  if (followerCount == null) return null

  return { followerCount }
}

/** Compact count for UI (e.g. 12345 → "12.3K"). */
export function formatCompactCount(value: number): string {
  const abs = Math.abs(value)
  if (abs < 1000) return String(Math.round(value))

  const format = (n: number, suffix: string) => {
    const rounded = n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '')
    return `${rounded}${suffix}`
  }

  if (abs < 1_000_000) return format(value / 1000, 'K')
  if (abs < 1_000_000_000) return format(value / 1_000_000, 'M')
  return format(value / 1_000_000_000, 'B')
}

export function formatSubscriberLabel(stats: YoutubeChannelStats | null | undefined): string | null {
  if (!stats || stats.hiddenSubscriberCount) return null
  if (stats.subscriberCount == null) return null
  return `${formatCompactCount(stats.subscriberCount)} subscribers`
}

export function formatFollowerLabel(stats: InstagramProfileStats | null | undefined): string | null {
  if (!stats || stats.followerCount == null) return null
  return `${formatCompactCount(stats.followerCount)} followers`
}

/** Admin-curated Instagram / live YouTube posts for the homepage social section. */
export const getSocialPosts = (params?: { type?: SocialPostQueryType }) => {
  const query = params?.type ? `?type=${encodeURIComponent(params.type)}` : ''
  return apiGet<RawSocialPost[]>(`/api/socialPost/getSocialPosts${query}`) as Promise<SocialPostsApiResponse>
}
