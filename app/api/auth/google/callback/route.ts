import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL, FALLBACK_SITE_ORIGIN, IS_DEVELOPMENT } from '@/lib/config'

function getRedirectOrigin(request: NextRequest): string {
  if (IS_DEVELOPMENT) {
    return request.nextUrl.origin
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (!configured) return FALLBACK_SITE_ORIGIN

  return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const siteOrigin = getRedirectOrigin(request)

  if (error || !code) {
    return NextResponse.redirect(new URL('/auth/login?error=google_cancelled', siteOrigin))
  }

  try {
    const exchangeRes = await fetch(`${API_BASE_URL}/api/auth/google/code-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    if (!exchangeRes.ok) {
      console.error('[google/callback] Backend exchange failed:', exchangeRes.status)
      return NextResponse.redirect(new URL('/auth/login?error=google_token', siteOrigin))
    }

    const data = (await exchangeRes.json()) as { code: number; token?: string; result?: unknown; message?: string }

    if (data.code === 200 && data.token) {
      const token = encodeURIComponent(data.token)
      const customer = encodeURIComponent(JSON.stringify(data.result ?? {}))
      return NextResponse.redirect(new URL(`/auth/google/success?token=${token}&customer=${customer}`, siteOrigin))
    }

    console.error('[google/callback] Backend auth failed:', data.message)
    return NextResponse.redirect(new URL('/auth/login?error=google_auth_failed', siteOrigin))
  } catch (err) {
    console.error('[google/callback] Unexpected error:', err)
    return NextResponse.redirect(new URL('/auth/login?error=google_error', siteOrigin))
  }
}
