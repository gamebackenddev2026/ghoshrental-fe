const INSTAGRAM_HOST_RE = /(^|\.)instagram\.com$/i

const OG_IMAGE_PATTERNS = [
  /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*property=["']og:image["']/i
]

const CDN_IMAGE_PATTERN = /https:\/\/scontent[^"'\\s&]+cdninstagram\.com\/v\/[^"'\\s&]+/g
const EMBEDDED_MEDIA_IMAGE_PATTERN = /class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i
const VIDEO_URL_PATTERNS = [
  /video_url\\":\\"(https:[^"]+)"/,
  /"video_url":"(https:[^"]+)"/,
  /contentUrl":"(https:[^"]+\.mp4[^"]*)"/,
  /(https:\\\/\\\/scontent[^"\\]+?\.mp4[^"\\]*)/,
  /(https:\/\/scontent[^"\\s]+?\.mp4[^"\\s]*)/
]

const DESKTOP_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1'
}

const MOBILE_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1'
}

export type InstagramMedia = {
  thumbnail: string | null
  videoUrl: string | null
  isVideo: boolean
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function unescapeInstagramJsonUrl(raw: string): string {
  let value = decodeHtmlEntities(raw)
  value = value.replace(/\\u0026/g, '&').replace(/\\u0025/g, '%')
  while (value.includes('\\/')) {
    value = value.replace(/\\\//g, '/')
  }
  return value
}

export function isInstagramPostUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return INSTAGRAM_HOST_RE.test(host)
  } catch {
    return false
  }
}

export function extractOgImageFromHtml(html: string): string | null {
  for (const pattern of OG_IMAGE_PATTERNS) {
    const match = html.match(pattern)
    const raw = match?.[1]?.trim()
    if (raw) return decodeHtmlEntities(raw)
  }
  return null
}

function normalizeCdnUrl(raw: string): string {
  return decodeHtmlEntities(raw.split(/\s/)[0] ?? raw)
}

function isPostMediaUrl(url: string): boolean {
  const normalized = url.toLowerCase()
  if (normalized.includes('profile_pic') || normalized.includes('s100x100')) return false
  return normalized.includes('cdninstagram.com/v/')
}

export function extractCdnImageFromHtml(html: string): string | null {
  const matches = html.match(CDN_IMAGE_PATTERN) ?? []
  const candidates = matches.map(normalizeCdnUrl).filter(isPostMediaUrl)
  if (!candidates.length) return null

  const preferred = candidates.find((url) => /\/v\/t51\.82787|\/v\/t51\.2885/.test(url))
  return preferred ?? candidates[0]
}

export function extractEmbeddedMediaImageFromHtml(html: string): string | null {
  const match = html.match(EMBEDDED_MEDIA_IMAGE_PATTERN)
  const raw = match?.[1]?.trim()
  return raw ? decodeHtmlEntities(raw) : null
}

export function extractVideoUrlFromHtml(html: string): string | null {
  for (const pattern of VIDEO_URL_PATTERNS) {
    const match = html.match(pattern)
    const raw = match?.[1]?.trim()
    if (raw) return unescapeInstagramJsonUrl(raw)
  }
  return null
}

function isVideoHtml(html: string): boolean {
  return /GraphVideo|data-media-type="GraphVideo"|"is_video":true|video_url|\/reel\//i.test(html)
}

function toInstagramEmbedUrl(postUrl: string): string {
  try {
    const parsed = new URL(postUrl)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const reelIdx = parts.findIndex((part) => part === 'reel' || part === 'p' || part === 'tv')
    if (reelIdx >= 0 && parts[reelIdx + 1]) {
      const kind = parts[reelIdx] === 'p' ? 'p' : parts[reelIdx] === 'tv' ? 'tv' : 'reel'
      return `https://www.instagram.com/${kind}/${parts[reelIdx + 1]}/embed/`
    }
  } catch {
    /* fall through */
  }
  const normalized = postUrl.split('?')[0]?.replace(/\/+$/, '') ?? postUrl
  return `${normalized}/embed/`
}

type HtmlFetchResult = {
  html: string | null
  cookie: string
}

async function fetchInstagramHtml(url: string, headers: Record<string, string>): Promise<HtmlFetchResult> {
  try {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      cache: 'no-store'
    })
    if (!response.ok) return { html: null, cookie: '' }
    const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    const cookie = setCookies.map((entry) => entry.split(';')[0] ?? '').filter(Boolean).join('; ')
    return { html: await response.text(), cookie }
  } catch {
    return { html: null, cookie: '' }
  }
}

/** Resolve Instagram preview media from public page metadata. */
export async function fetchInstagramMedia(postUrl: string): Promise<InstagramMedia> {
  if (!isInstagramPostUrl(postUrl)) {
    return { thumbnail: null, videoUrl: null, isVideo: false }
  }

  const embedUrl = toInstagramEmbedUrl(postUrl)
  const isReelPath = /\/reel\//i.test(postUrl) || /\/reel\//i.test(embedUrl)

  const [mobileEmbed, desktopEmbed, postPage] = await Promise.all([
    fetchInstagramHtml(embedUrl, MOBILE_HEADERS),
    fetchInstagramHtml(embedUrl, DESKTOP_HEADERS),
    fetchInstagramHtml(postUrl, DESKTOP_HEADERS)
  ])

  const htmlCandidates = [mobileEmbed.html, desktopEmbed.html, postPage.html].filter(Boolean) as string[]

  const thumbnail =
    (mobileEmbed.html ? extractEmbeddedMediaImageFromHtml(mobileEmbed.html) : null) ??
    (desktopEmbed.html ? extractEmbeddedMediaImageFromHtml(desktopEmbed.html) : null) ??
    (postPage.html ? extractOgImageFromHtml(postPage.html) : null) ??
    (postPage.html ? extractCdnImageFromHtml(postPage.html) : null) ??
    (mobileEmbed.html ? extractOgImageFromHtml(mobileEmbed.html) : null) ??
    (desktopEmbed.html ? extractOgImageFromHtml(desktopEmbed.html) : null) ??
    (mobileEmbed.html ? extractCdnImageFromHtml(mobileEmbed.html) : null) ??
    (desktopEmbed.html ? extractCdnImageFromHtml(desktopEmbed.html) : null)

  let videoUrl: string | null = null
  for (const html of htmlCandidates) {
    videoUrl = extractVideoUrlFromHtml(html)
    if (videoUrl) break
  }

  const isVideo =
    isReelPath ||
    Boolean(videoUrl) ||
    htmlCandidates.some((html) => isVideoHtml(html))

  return { thumbnail, videoUrl, isVideo }
}

/** Fetch the reel MP4 bytes using a fresh embed session (cookie + signed URL). */
export async function fetchInstagramVideoResponse(postUrl: string, rangeHeader?: string | null): Promise<Response | null> {
  if (!isInstagramPostUrl(postUrl)) return null

  const embedUrl = toInstagramEmbedUrl(postUrl)
  const { html, cookie } = await fetchInstagramHtml(embedUrl, MOBILE_HEADERS)
  if (!html) return null

  const videoUrl = extractVideoUrlFromHtml(html)
  if (!videoUrl) return null

  try {
    const headers: Record<string, string> = {
      ...MOBILE_HEADERS,
      Accept: '*/*',
      Referer: 'https://www.instagram.com/',
      Origin: 'https://www.instagram.com',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site'
    }
    if (cookie) headers.Cookie = cookie
    if (rangeHeader) headers.Range = rangeHeader

    const response = await fetch(videoUrl, {
      headers,
      redirect: 'follow',
      cache: 'no-store'
    })
    if (!response.ok && response.status !== 206) return null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/plain') || contentType.includes('text/html')) return null
    return response
  } catch {
    return null
  }
}

/** Back-compat helper for thumbnail-only callers. */
export async function fetchInstagramThumbnail(postUrl: string): Promise<string | null> {
  const media = await fetchInstagramMedia(postUrl)
  return media.thumbnail
}
