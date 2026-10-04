import { NextResponse } from 'next/server'
import { fetchInstagramMedia, isInstagramPostUrl } from '@/lib/api/instagramThumbnail'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')?.trim() ?? ''

  if (!url || !isInstagramPostUrl(url)) {
    return NextResponse.json({ thumbnail: null, videoUrl: null, isVideo: false }, { status: 400 })
  }

  const media = await fetchInstagramMedia(url)
  return NextResponse.json(media, {
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400'
    }
  })
}
