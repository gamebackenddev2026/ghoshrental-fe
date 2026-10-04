import { loadPageAndSharedCms } from './cms'
import { toHomePageCms, type HomePageCms } from './cmsAdapters'

export type HomeCmsPageData = {
  cms: HomePageCms
}

export async function loadHomeCmsPageData(): Promise<HomeCmsPageData> {
  const { pageSections, sharedSections } = await loadPageAndSharedCms('home')
  return { cms: toHomePageCms(pageSections, sharedSections) }
}
