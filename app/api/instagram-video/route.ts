import { NextResponse } from 'next/server'
import { fetchInstagramVideoResponse, isInstagramPostUrl } from '@/lib/api/instagramThumbnail'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Streams an Instagram reel/post MP4 through our origin so the browser can
 * autoplay/loop it (Instagram CDN blocks direct hotlinking).
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')?.trim() ?? ''
  if (!url || !isInstagramPostUrl(url)) {
    return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 })
  }

  const range = request.headers.get('range')
  const upstream = await fetchInstagramVideoResponse(url, range)
  if (!upstream) {
    return NextResponse.json({ error: 'Video unavailable' }, { status: 404 })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') || 'video/mp4'
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes')

  const contentLength = upstream.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) headers.set('Content-Range', contentRange)

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers
  })
}
