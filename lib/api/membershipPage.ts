import { loadPageAndSharedCms } from './cms'
import { toFaqCmsContent, type FaqCmsContent } from './cmsAdapters'

/**
 * Loads CMS FAQ for /membership.
 * Banner, packages and loyalty settings are fetched client-side (MembershipClient)
 * so they appear in the browser network tab.
 */
export async function loadMembershipPageData(): Promise<{ faq: FaqCmsContent }> {
  // Membership is not in the FAQ section's multi-page `page` list; reuse listing/home FAQ.
  const { pageSections } = await loadPageAndSharedCms('membership')
  if (pageSections.length) {
    return { faq: toFaqCmsContent(pageSections, []) }
  }

  const { pageSections: listingSections } = await loadPageAndSharedCms('listing')
  return { faq: toFaqCmsContent(listingSections, []) }
}
