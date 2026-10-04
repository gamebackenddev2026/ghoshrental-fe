import { loadCmsPage } from './cms'
import {
  DEFAULT_PRIVACY_CMS,
  DEFAULT_TERMS_CMS,
  toLegalPageCms,
  type LegalPageCms,
} from './cmsAdapters'

export type LegalPageData = {
  cms: LegalPageCms
}

export async function loadPrivacyPageData(): Promise<LegalPageData> {
  const sections = await loadCmsPage('privacy-policy')
  return { cms: toLegalPageCms(sections, DEFAULT_PRIVACY_CMS) }
}

export async function loadTermsPageData(): Promise<LegalPageData> {
  const sections = await loadCmsPage('terms-and-conditions')
  return { cms: toLegalPageCms(sections, DEFAULT_TERMS_CMS) }
}
