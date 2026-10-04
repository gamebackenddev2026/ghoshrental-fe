import { apiPost, safeApiCall } from './client'
import { activeSections } from './cmsUtils'

export { cmsBySection, activeSections, pickSection, pickSharedSection, pickSectionLoose, pickSharedSectionLoose, sectionKey } from './cmsUtils'

/**
 * Legacy shared CMS page slug. The admin now attaches shared sections
 * (`features`, `vip`, `faq`) to each page via a multi-value `page` field
 * (e.g. `"about-us,home,services"`), so `getCmsByPage({ page: "global" })`
 * returns `[]` and must not be called.
 */
export const SHARED_CMS_PAGE = 'global'

import type { RawMedia } from './types'

/** CMS section row returned by `/api/cms/*` read endpoints. */
export type RawCmsSection = {
  _id?: string
  page?: string
  section_key?: string
  sectionKey?: string
  sort_order?: number
  type?: string
  heading?: string
  sub_heading?: string
  description?: string
  button_text?: string
  image?: string | RawMedia
  image_url?: string
  media_data?: RawMedia[]
  status?: boolean | number | string
  isDeleted?: boolean
  is_deleted?: boolean
  items?: RawCmsItem[]
}

export type RawCmsItem = {
  sort_order?: number
  type?: string
  heading?: string
  sub_heading?: string
  description?: string
  button_text?: string
  image?: string | RawMedia
  image_url?: string
  media_data?: RawMedia[]
}

/** All CMS sections for a page — preferred for page loads. */
export const getCmsByPage = (payload: { page: string }) => apiPost<RawCmsSection[]>('/api/cms/getCmsByPage', payload)

/** Single section when you know page + section_key. */
export const getCmsBySectionKey = (payload: { page: string; section_key: string }) =>
  apiPost<RawCmsSection>('/api/cms/getCmsBySectionKey', payload)

/** Lookup by page + heading/type label. */
export const getCmsByType = (payload: { page: string; type: string }) => apiPost<RawCmsSection>('/api/cms/getCmsByType', payload)

/** Lookup when you already have the Mongo _id. */
export const getCmsById = (payload: { id: string }) => apiPost<RawCmsSection>('/api/cms/getCmsById', payload)

/** Load all active sections for a CMS page slug. */
export async function loadCmsPage(page: string): Promise<RawCmsSection[]> {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[cms] server getCmsByPage(${page})`)
  }

  const res = await safeApiCall(`getCmsByPage(${page})`, () => getCmsByPage({ page }), null)

  if (!res || res.code !== 200 || !Array.isArray(res.result)) return []
  return activeSections(res.result)
}

/**
 * Load CMS sections for a page.
 *
 * Shared blocks (features / vip / faq) arrive in the same response because the
 * backend stores them with multi-page `page` values like `"about-us,home"`.
 * The legacy `global` page is empty — do not fetch it.
 */
export async function loadPageAndSharedCms(page: string): Promise<{
  pageSections: RawCmsSection[]
  sharedSections: RawCmsSection[]
}> {
  const pageSections = await loadCmsPage(page)
  return { pageSections, sharedSections: [] }
}
