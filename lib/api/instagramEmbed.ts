const INSTAGRAM_SHORTCODE_RE = /(?:\/p\/|\/reel\/|\/tv\/)([A-Za-z0-9_-]+)/i

export function isInstagramReelHref(href: string): boolean {
  return /\/reel\//i.test(href)
}

export function instagramShortcode(href: string): string | null {
  const match = href.match(INSTAGRAM_SHORTCODE_RE)
  return match?.[1] ?? null
}

/** Clean Instagram embed URL for in-page playback fallback. */
export function toInstagramEmbedSrc(href: string, options?: { asReel?: boolean }): string {
  const code = instagramShortcode(href)
  if (!code) {
    const normalized = href.split('?')[0]?.replace(/\/+$/, '') ?? href
    return `${normalized}/embed/`
  }
  if (options?.asReel || isInstagramReelHref(href)) {
    return `https://www.instagram.com/reel/${code}/embed/`
  }
  return `https://www.instagram.com/p/${code}/embed/`
}

/** Same-origin proxied MP4 for muted autoplay + loop. */
export function toProxiedInstagramVideoSrc(href: string): string {
  return `/api/instagram-video?url=${encodeURIComponent(href)}`
}
