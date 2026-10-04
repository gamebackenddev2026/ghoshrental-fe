import { loadCmsPage } from './cms'
import { toLeasePageCms, type LeasePageCms } from './cmsAdapters'

export type LeaseCmsPageData = {
  cms: LeasePageCms
}

/** Lease-to-Own hero copy from `POST /api/cms/getCmsByPage` (`page: "lease"`). */
export async function loadLeaseCmsPageData(): Promise<LeaseCmsPageData> {
  const sections = await loadCmsPage('lease')
  return { cms: toLeasePageCms(sections) }
}
