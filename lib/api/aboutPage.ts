import { safeApiCall } from './client'
import { loadPageAndSharedCms } from './cms'
import { toAboutPageCms, type AboutPageCms } from './cmsAdapters'
import { getAllBanner, getBrands } from './home'
import { toBannerForPage, toBrandItem } from './adapters'
import type { HeroBanner } from './adapters'
import type { BrandItem } from '@/components/home/mockData'

export type AboutPageData = {
  cms: AboutPageCms
  initialHeroBanner: HeroBanner | null
  brands: BrandItem[]
}

/**
 * Loads About page data: one CMS call (`getCmsByPage`) for all section copy,
 * plus banner media and brand logos from their existing APIs.
 */
export async function loadAboutPageData(): Promise<AboutPageData> {
  const [{ pageSections, sharedSections }, bannerRes, brandsRes] = await Promise.all([
    loadPageAndSharedCms('about-us'),
    safeApiCall('getAllBanner(about)', () => getAllBanner({}), null),
    safeApiCall('getBrands', () => getBrands({}), null)
  ])

  const cms = toAboutPageCms(pageSections, sharedSections)

  const initialHeroBanner: HeroBanner | null =
    bannerRes && bannerRes.code === 200 && Array.isArray(bannerRes.result) ? toBannerForPage(bannerRes.result, 'about') : null

  const brands: BrandItem[] =
    brandsRes && brandsRes.code === 200 && Array.isArray(brandsRes.result)
      ? brandsRes.result
          .filter((b) => b && b.type === 'Car')
          .map(toBrandItem)
          .filter((b): b is BrandItem => b !== null)
      : []

  return { cms, initialHeroBanner, brands }
}
