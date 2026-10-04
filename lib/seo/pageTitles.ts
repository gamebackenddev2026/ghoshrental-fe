export const LEASE_TO_OWN_DEFAULT_TITLE = 'Lease to Own Cars in Dubai'

/** Visible H1 and `<title>` on `/product/search` — same for all fleet tabs. */
export const FLEET_PAGE_H1 = 'Rent a Car & Yacht in Dubai'

export function getLeaseToOwnPageTitle(cmsMetaTitle?: string | null): string {
  const cms = cmsMetaTitle?.trim()
  return cms || LEASE_TO_OWN_DEFAULT_TITLE
}

/** Matches visible H1 on `/product/search` for every tab variant. */
export function getFleetSearchPageTitle(): string {
  return FLEET_PAGE_H1
}

export const BLOG_LIST_DEFAULT_TITLE = 'Ghost Rentals Blog'

export const BLOG_LIST_DEFAULT_DESC = 'Read luxury car rental guides, yacht charter tips, and Dubai travel insights from Ghost Rentals.'

export function getBlogListPageTitle(cmsMetaTitle?: string | null): string {
  const cms = cmsMetaTitle?.trim()
  return cms || BLOG_LIST_DEFAULT_TITLE
}
