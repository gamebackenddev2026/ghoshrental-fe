import path from 'node:path'
import type { NextConfig } from 'next'
import { FALLBACK_SITE_ORIGIN } from './lib/config'

/**
 * Rewrites mirror Angular's proxy.conf.json so the browser can call
 *   /api/*     → {UPSTREAM_ORIGIN}/api/*
 *   /public/*  → {UPSTREAM_ORIGIN}/public/*
 * without hitting CORS. Server components bypass rewrites because they
 * already call `${API_ORIGIN}/api/...` directly via lib/api/client.ts.
 *
 * NEXT_PUBLIC_API_BASE_URL is read from .env.local and accepts either
 * — the trailing `/api` (and any trailing slash) is stripped here so the
 * destinations never contain a duplicated `/api` segment.
 */
function normalizeOrigin(raw: string | undefined): string {
  if (!raw) return FALLBACK_SITE_ORIGIN
  let origin = raw.trim().replace(/\/+$/, '')
  if (origin.toLowerCase().endsWith('/api')) {
    origin = origin.slice(0, -'/api'.length)
  }
  return origin || FALLBACK_SITE_ORIGIN
}

const UPSTREAM_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_API_BASE_URL)

/** Short marketing URLs — parity with legacy Angular LocationComponent redirects */
const SHORT_LINK_REDIRECTS: { source: string; destination: string }[] = [
  { source: '/Location', destination: 'https://maps.app.goo.gl/2AxX5kQzyzKzHCc26' },
  { source: '/Review', destination: 'https://g.page/r/CYLV9IPjYTZLEBM/review' },
  { source: '/Facebook', destination: 'https://www.facebook.com/Ghostrentalsdubai' },
  { source: '/Instagram', destination: 'https://www.instagram.com/ghost.rentals/?hl=en' },
  { source: '/Tiktok', destination: 'https://www.tiktok.com/@ghostrentals' },
  { source: '/Linkedin', destination: 'https://ae.linkedin.com/company/ghostrentals' },
  { source: '/YouTube', destination: 'https://www.youtube.com/@GhostRentalsDXB?app=desktop' },
  { source: '/ViewYachts', destination: '/product/search?type=Yachts' },
  { source: '/ViewCars', destination: '/product/search?type=Car' },
  // Stale URLs Google Search Console still crawls from the pre-migration Angular build.
  { source: '/assets/images/favicon/favicon.ico', destination: '/favicon.ico' },
  { source: '/contact.html', destination: '/contact' },
  { source: '/blog.html', destination: '/blog' },
  // Old category URL keys replaced by SEO-friendly slugs.
  { source: '/product/list/coupe', destination: '/product/list/rent-coupe-cars-dubai' }
]

/** LAN / device IPs for dev (HMR WebSocket). Add yours if it changes. */
const allowedDevOrigins = [
  '192.168.11.13',
  '192.168.11.38',
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [])
]

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    root: path.resolve(__dirname)
  },
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    dangerouslyAllowLocalIP: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.ghostrentals.com'
      },
      {
        protocol: 'https',
        hostname: 'ghostrentals.com'
      },
      {
        protocol: 'https',
        hostname: 'ghostrentals-media.s3.ap-south-1.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com'
      },
      ...(function remotePatternsFromApiOrigin() {
        try {
          const { protocol, hostname, port } = new URL(UPSTREAM_ORIGIN)
          if (hostname && hostname !== 'www.ghostrentals.com' && hostname !== 'ghostrentals.com') {
            return [
              {
                protocol: protocol.replace(':', '') as 'http' | 'https',
                hostname,
                ...(port ? { port } : {})
              }
            ]
          }
        } catch {
          /* ignore */
        }
        return []
      })()
    ]
  },
  async redirects() {
    return [
      // Short links first so an apex-host hit (e.g. ghostrentals.com/Location) resolves
      // straight to its final destination in one hop instead of bouncing through www first.
      ...SHORT_LINK_REDIRECTS.map(({ source, destination }) => ({
        source,
        destination,
        permanent: true
      })),
      // Apex domain must not serve content directly — Google was indexing/crawling
      // ghostrentals.com and www.ghostrentals.com as separate duplicate hosts.
      // /api and /public are excluded so direct server-to-server calls (webhooks, the
      // mobile app, etc.) against the apex host keep working instead of getting a 308.
      {
        source: '/:path((?!api|public).*)',
        has: [{ type: 'host', value: 'ghostrentals.com' }],
        destination: 'https://www.ghostrentals.com/:path',
        permanent: true
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${UPSTREAM_ORIGIN}/api/:path*`
      },
      {
        source: '/public/:path*',
        destination: `${UPSTREAM_ORIGIN}/public/:path*`
      }
    ]
  }
}

export default nextConfig
