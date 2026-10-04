import type { MetadataRoute } from 'next'
import { normalizeVehicleUrlKeyForHref } from '@/lib/api/adapters'
import { unwrapBlogList, toBlogListItem } from '@/lib/api/blogAdapters'
import { viewAllBlog } from '@/lib/api/blog'
import { safeApiCall } from '@/lib/api/client'
import { getAllVehicles, getCarTypes } from '@/lib/api/home'
import type { RawVehicle } from '@/lib/api/types'
import { absoluteUrl } from './site'

type ChangeFrequency = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{
  path: string
  changeFrequency: ChangeFrequency
  priority: number
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/product/search', changeFrequency: 'daily', priority: 0.9 },
  { path: '/product/list', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/product/lease', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/membership', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 }
]

function vehicleUrlKey(raw: RawVehicle): string {
  const key = String(raw.url_key ?? '').trim()
  return normalizeVehicleUrlKeyForHref(key) || key
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

async function fetchBlogEntries(): Promise<MetadataRoute.Sitemap> {
  const res = await safeApiCall('sitemap:viewAllBlog', () => viewAllBlog({ page: 1, limit: 500, status: true }), null)

  if (!res || res.code !== 200) return []

  return unwrapBlogList(res.result)
    .map((raw) => toBlogListItem(raw))
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.slug))
    .map((item) => ({
      url: absoluteUrl(`/blog/${encodeURIComponent(item.slug)}`),
      lastModified: parseDate(item.publishedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6
    }))
}

async function fetchVehicleEntries(): Promise<MetadataRoute.Sitemap> {
  const res = await safeApiCall('sitemap:getAllVehicles', () => getAllVehicles({ limit: 500, page: 1 }), null)

  if (!res || res.code !== 200 || !Array.isArray(res.result)) return []

  const entries: MetadataRoute.Sitemap = []

  for (const raw of res.result) {
    const urlKey = vehicleUrlKey(raw)
    if (!urlKey) continue

    const lastModified = parseDate(raw.updated_at ?? raw.created_at)

    entries.push({
      url: absoluteUrl(`/product/${encodeURIComponent(urlKey)}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7
    })

    if (raw.lease_available === true) {
      entries.push({
        url: absoluteUrl(`/product/lease/${encodeURIComponent(urlKey)}`),
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.65
      })
    }
  }

  return entries
}

async function fetchCarTypeListEntries(): Promise<MetadataRoute.Sitemap> {
  const res = await safeApiCall('sitemap:getCarTypes', () => getCarTypes({}), null)
  if (!res || res.code !== 200 || !Array.isArray(res.result)) return []

  return res.result
    .map((raw) => {
      const urlKey = String(raw.url_key ?? '').trim()
      if (!urlKey) return null
      return {
        url: absoluteUrl(`/product/list/${encodeURIComponent(urlKey)}`),
        changeFrequency: 'weekly' as const,
        priority: 0.6
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
}

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }))

  const [blogEntries, vehicleEntries, carTypeEntries] = await Promise.all([
    fetchBlogEntries(),
    fetchVehicleEntries(),
    fetchCarTypeListEntries()
  ])

  const seen = new Set<string>()
  const merged = [...staticEntries, ...blogEntries, ...vehicleEntries, ...carTypeEntries]

  return merged.filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
