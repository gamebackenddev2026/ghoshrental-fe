'use client'

import { useEffect, useRef, useState } from 'react'
import { getCmsByPage } from './cms'
import type { RawCmsSection } from './cms'
import { activeSections } from './cmsUtils'
import {
  DEFAULT_ABOUT_CMS,
  DEFAULT_BLOG_CMS,
  DEFAULT_CONTACT_CMS,
  DEFAULT_HOME_CMS,
  DEFAULT_PRIVACY_CMS,
  DEFAULT_SERVICES_CMS,
  DEFAULT_TERMS_CMS,
  toAboutPageCms,
  toBlogPageCms,
  toContactPageCms,
  toFaqCmsContent,
  toHomePageCms,
  toLegalPageCms,
  toServicesPageCms,
  type AboutPageCms,
  type BlogPageCms,
  type ContactPageCms,
  type FaqCmsContent,
  type HomePageCms,
  type LegalPageCms,
  type ServicesPageCms
} from './cmsAdapters'

async function fetchPageCms(page: string): Promise<{
  pageSections: RawCmsSection[]
  ok: boolean
}> {
  const pageRes = await getCmsByPage({ page })

  return {
    pageSections: pageRes.code === 200 && Array.isArray(pageRes.result) ? activeSections(pageRes.result) : [],
    ok: pageRes.code === 200
  }
}

function useCmsPage<T>(
  page: string,
  map: (pageSections: RawCmsSection[], sharedSections: RawCmsSection[]) => T,
  fallback: T,
  initial?: T
): T {
  const [cms, setCms] = useState<T>(initial ?? fallback)
  const hadInitialRef = useRef(initial !== undefined)

  useEffect(() => {
    let cancelled = false

    void fetchPageCms(page)
      .then(({ pageSections, ok }) => {
        if (cancelled) return
        // Keep SSR-hydrated CMS when the client refresh fails or returns nothing.
        if (hadInitialRef.current && (!ok || pageSections.length === 0)) return
        if (!ok || pageSections.length === 0) return
        setCms(map(pageSections, []))
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[cms] getCmsByPage(${page}) failed`, error)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return cms
}

export function useAboutCms(initial?: AboutPageCms): AboutPageCms {
  return useCmsPage('about-us', toAboutPageCms, DEFAULT_ABOUT_CMS, initial)
}

export function useServicesCms(initial?: ServicesPageCms): ServicesPageCms {
  return useCmsPage('services', toServicesPageCms, DEFAULT_SERVICES_CMS, initial)
}

export function useContactCms(initial?: ContactPageCms): ContactPageCms {
  return useCmsPage('contact-us', (pageSections) => toContactPageCms(pageSections), DEFAULT_CONTACT_CMS, initial)
}

export function useHomeCms(initial?: HomePageCms): HomePageCms {
  return useCmsPage('home', toHomePageCms, DEFAULT_HOME_CMS, initial)
}

export function useBlogCms(initial?: BlogPageCms): BlogPageCms {
  return useCmsPage('blog', (pageSections) => toBlogPageCms(pageSections), DEFAULT_BLOG_CMS, initial)
}

export function useFaqCms(page: string, initial?: FaqCmsContent): FaqCmsContent {
  return useCmsPage(
    page,
    (pageSections, sharedSections) => toFaqCmsContent(pageSections, sharedSections),
    DEFAULT_HOME_CMS.faq,
    initial
  )
}

export function usePrivacyCms(initial?: LegalPageCms): LegalPageCms {
  return useCmsPage(
    'privacy-policy',
    (pageSections) => toLegalPageCms(pageSections, DEFAULT_PRIVACY_CMS),
    DEFAULT_PRIVACY_CMS,
    initial
  )
}

export function useTermsCms(initial?: LegalPageCms): LegalPageCms {
  return useCmsPage(
    'terms-and-conditions',
    (pageSections) => toLegalPageCms(pageSections, DEFAULT_TERMS_CMS),
    DEFAULT_TERMS_CMS,
    initial
  )
}

export function useLegalCms(
  page: 'privacy-policy' | 'terms-and-conditions',
  initial?: LegalPageCms
): LegalPageCms {
  const fallback = page === 'privacy-policy' ? DEFAULT_PRIVACY_CMS : DEFAULT_TERMS_CMS
  return useCmsPage(page, (pageSections) => toLegalPageCms(pageSections, fallback), fallback, initial)
}
