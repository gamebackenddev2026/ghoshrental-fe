import type { Metadata } from 'next'
import { LeaseToOwnClient } from '@/components/lease/LeaseToOwnClient'
import { loadLeaseCmsPageData } from '@/lib/api/leaseCmsPage'
import { fetchCmsPageSeo } from '@/lib/seo/pageMeta'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getLeaseToOwnPageTitle } from '@/lib/seo/pageTitles'
import { FaqCms } from '@/components/shared/FaqCms'
import { loadFaqPageData } from '@/lib/api/faqPage'

export const dynamic = 'force-dynamic'

const DEFAULT_DESC = 'Browse lease to own cars in Dubai with Ghost Rentals. Filter by brand, price, and availability.'

export async function generateMetadata(): Promise<Metadata> {
  const cms = (await fetchCmsPageSeo('product/lease')) ?? (await fetchCmsPageSeo('lease'))

  return buildPageMetadata({
    title: getLeaseToOwnPageTitle(cms?.meta_title),
    description: cms?.meta_description || DEFAULT_DESC,
    path: '/product/lease',
    keywords: cms?.meta_keywords
  })
}

export default async function LeaseToOwnIndexPage() {
  const [{ cms }, cmsSeo] = await Promise.all([loadLeaseCmsPageData(), fetchCmsPageSeo('product/lease').then(async (seo) => seo ?? fetchCmsPageSeo('lease'))])
  const pageTitle = getLeaseToOwnPageTitle(cmsSeo?.meta_title || cms.hero.title)

  // CMS page slug for Lease-to-Own (admin panel): `lease`
  const { faq } = await loadFaqPageData('lease')
  return (
    <>
      <LeaseToOwnClient pageTitle={pageTitle} />
      <FaqCms page='lease' initial={faq} />
    </>
  )
}
