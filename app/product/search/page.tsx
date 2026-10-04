import type { Metadata } from 'next'
import { ProductSearchClient } from '@/components/search/ProductSearchClient'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { fetchCmsPageSeo } from '@/lib/seo/pageMeta'
import { getFleetSearchPageTitle } from '@/lib/seo/pageTitles'
import { FaqCms } from '@/components/shared/FaqCms'
import { loadFaqPageData } from '@/lib/api/faqPage'

/**
 * /product/search — Angular parity port.
 *
 * Mirrors the Angular dist build's SearchComponent
 * (src/app/components/product/search/search.component.ts). The full filter +
 * grid UI lives in the <ProductSearchClient /> client component, which fetches
 * from the same backend endpoints Angular hits:
 *   POST /api/vehicle/getfilteredvehicle
 *   POST /api/brand/getAllBrand
 *   POST /api/bodytype/getAllBodytype
 *
 * After the search section + pagination, Angular’s dist renders
 * <app-testimonials> whose template (testimonials.component.html) includes
 * the same FAQ accordion as the home page — we render the shared <Faq />
 * here so the FAQ appears after results, then the global <Footer /> from
 * app/layout.tsx.
 *
 * Server-side we emit <title> (aligned with visible H1), description from CMS
 * with optional car / yacht / chauffeur description overrides, and a single
 * canonical URL for all fleet tab variants.
 */

export const dynamic = 'force-dynamic'

type SearchParamsPromise = Promise<{
  type?: string | string[]
  chauffeur?: string | string[]
  category?: string | string[]
}>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const DEFAULT_FLEET_DESC = "Browse Ghost Rentals' luxury car and yacht fleet in Dubai. Filter by brand, body type, price, and availability."

export async function generateMetadata({ searchParams }: { searchParams: SearchParamsPromise }): Promise<Metadata> {
  const sp = await searchParams
  const type = first(sp.type)
  const chauffeur = first(sp.chauffeur) === 'true'
  const cms = await fetchCmsPageSeo('product/search')

  let description = cms?.meta_description || DEFAULT_FLEET_DESC
  if (chauffeur) {
    description =
      cms?.meta_description || 'Book professional chauffeur services in Dubai with Ghost Rentals. Executive cars, hourly and daily hire.'
  } else if (type === 'Yachts') {
    description =
      cms?.meta_description ||
      'Explore our luxury yacht fleet in Dubai. Private yacht charter, hourly and daily rentals with Ghost Rentals.'
  }

  const hasQueryParams = !!(type || chauffeur || first(sp.category))

  return buildPageMetadata({
    title: getFleetSearchPageTitle(),
    description,
    path: '/product/search',
    keywords: cms?.meta_keywords,
    noIndex: hasQueryParams || undefined,
  })
}

export default async function ProductSearchPage() {
  // Our Fleet menu points to /product/search?type=Car (this page).
  // Use the same CMS page slug as Fleet/Listing: `listing`.
  const { faq } = await loadFaqPageData('listing')
  return (
    <>
      <ProductSearchClient />
      <FaqCms page='listing' initial={faq} />
    </>
  )
}
