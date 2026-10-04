import { fetchInstagramMedia, isInstagramPostUrl } from './instagramThumbnail'
import type { SocialPostItem } from './socialAdapters'

type InstagramMediaResponse = {
  thumbnail?: string | null
  videoUrl?: string | null
  isVideo?: boolean
}

async function resolveInstagramMedia(postUrl: string): Promise<InstagramMediaResponse | null> {
  if (typeof window === 'undefined') {
    return fetchInstagramMedia(postUrl)
  }

  try {
    const params = new URLSearchParams({ url: postUrl })
    const response = await fetch(`/api/instagram-thumbnail?${params.toString()}`)
    if (!response.ok) return null
    return (await response.json()) as InstagramMediaResponse
  } catch {
    return null
  }
}

/** Fill missing Instagram thumbnails and reel video metadata. */
export async function enrichSocialPostsWithThumbnails(posts: SocialPostItem[]): Promise<SocialPostItem[]> {
  if (!posts.length) return posts

  return Promise.all(
    posts.map(async (post) => {
      if (!isInstagramPostUrl(post.href) || (post.src && post.videoSrc && post.isVideo)) return post

      const media = await resolveInstagramMedia(post.href)
      if (!media) return post

      const thumbnail = typeof media.thumbnail === 'string' ? media.thumbnail.trim() : ''
      const videoUrl = typeof media.videoUrl === 'string' ? media.videoUrl.trim() : ''
      const isVideo = Boolean(media.isVideo || videoUrl)

      return {
        ...post,
        src: post.src || thumbnail,
        videoSrc: post.videoSrc || videoUrl || undefined,
        isVideo: post.isVideo || isVideo
      }
    })
  )
}
