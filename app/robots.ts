import type { MetadataRoute } from 'next'
import { absoluteUrl, getSiteOrigin } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account/',
          '/auth/',
          '/api/',
          '/assets/images/favicon/manifest.json',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteOrigin,
  }
}
