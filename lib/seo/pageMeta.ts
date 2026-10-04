import type { Metadata } from 'next'
import { safeApiCall } from '@/lib/api/client'
import { getPageWithName } from '@/lib/api/page'
import type { RawPage } from '@/lib/api/types'
import { buildPageMetadata } from './metadata'

/** CMS SEO fields from `POST /api/home/getpagewithName`. */
export async function fetchCmsPageSeo(pageName: string): Promise<RawPage | null> {
  const res = await safeApiCall(
    `getPageWithName(${pageName})`,
    () => getPageWithName({ pageName }),
    null,
  )

  if (res && res.code === 200 && res.result) {
    return res.result as RawPage
  }

  return null
}

type CmsPageSeoDefaults = {
  title: string
  description: string
  path: string
  keywords?: string
  image?: string
}

/** Fetch CMS page SEO and build full metadata (canonical, OG, Twitter). */
export async function buildCmsPageMetadata(
  pageName: string,
  defaults: CmsPageSeoDefaults,
): Promise<Metadata> {
  const cms = await fetchCmsPageSeo(pageName)

  return buildPageMetadata({
    title: cms?.meta_title || defaults.title,
    description: cms?.meta_description || defaults.description,
    path: defaults.path,
    keywords: cms?.meta_keywords || defaults.keywords,
    image: defaults.image,
  })
}
