import { safeApiCall } from './client'
import { loadPageAndSharedCms } from './cms'
import { toServicesPageCms, type ServicesPageCms } from './cmsAdapters'
import { getAllBanner } from './home'
import { toBannerForPage, type HeroBanner } from './adapters'

export type ServicesPageData = {
  cms: ServicesPageCms
  initialHeroBanner: HeroBanner | null
}

export async function loadServicesPageData(): Promise<ServicesPageData> {
  const [{ pageSections, sharedSections }, bannerRes] = await Promise.all([
    loadPageAndSharedCms('services'),
    safeApiCall('getAllBanner(services)', () => getAllBanner({}), null),
  ])

  const cms = toServicesPageCms(pageSections, sharedSections)

  const initialHeroBanner: HeroBanner | null =
    bannerRes && bannerRes.code === 200 && Array.isArray(bannerRes.result)
      ? toBannerForPage(bannerRes.result, 'services')
      : null

  return { cms, initialHeroBanner }
}
