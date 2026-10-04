import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProductListClient } from '@/components/product/ProductListClient'
import { FaqCms } from '@/components/shared/FaqCms'
import listStyles from '@/components/product/productListPage.module.css'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { fetchCmsPageSeo } from '@/lib/seo/pageMeta'
import { loadFaqPageData } from '@/lib/api/faqPage'

/**
 * /product/list — Angular `ListComponent` without `car_type` param: all cars,
 * banner page `product`.
 */

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Explore Our Car Collection'
const DEFAULT_DESC = 'Browse Ghost Rentals luxury cars in Dubai by category. Same experience as the Angular product list.'

export async function generateMetadata(): Promise<Metadata> {
  const cms = (await fetchCmsPageSeo('product/list')) ?? (await fetchCmsPageSeo('product'))

  return buildPageMetadata({
    title: cms?.meta_title || DEFAULT_TITLE,
    description: cms?.meta_description || DEFAULT_DESC,
    path: '/product/list',
    keywords: cms?.meta_keywords
  })
}

function ListFallback() {
  return (
    <div className={listStyles.page} style={{ minHeight: '50vh' }}>
      <div className={listStyles.loadWrap} style={{ paddingTop: '6rem' }}>
        <div className={listStyles.spinner} aria-hidden />
        <div>Loading&hellip;</div>
      </div>
    </div>
  )
}

export default async function ProductListIndexPage() {
  // CMS page slug for Our Fleet / Listing (admin panel): `listing`
  const { faq } = await loadFaqPageData('listing')
  return (
    <>
      <Suspense fallback={<ListFallback />}>
        <ProductListClient urlKey='' />
      </Suspense>
      {/* Keep as client component so API call is visible in Network. */}
      <FaqCms page='listing' initial={faq} />
    </>
  )
}
