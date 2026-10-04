import { loadCmsPage } from './cms'
import { toContactPageCms, type ContactPageCms } from './cmsAdapters'

export type ContactPageData = {
  cms: ContactPageCms
}

export async function loadContactPageData(): Promise<ContactPageData> {
  const sections = await loadCmsPage('contact-us')
  return { cms: toContactPageCms(sections) }
}
