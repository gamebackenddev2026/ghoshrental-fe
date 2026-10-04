import { loadPageAndSharedCms } from './cms'
import { toFaqCmsContent, type FaqCmsContent } from './cmsAdapters'

export type FaqPageData = {
  faq: FaqCmsContent
}

export async function loadFaqPageData(page: string): Promise<FaqPageData> {
  const { pageSections, sharedSections } = await loadPageAndSharedCms(page)
  return { faq: toFaqCmsContent(pageSections, sharedSections) }
}

