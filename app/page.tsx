import type { Metadata } from 'next'
import { HomeContentPreload } from '@/components/home/HomeContentPreload'
import { HeroVideoPreload } from '@/components/home/HeroVideoPreload'
import { HomePageClient } from '@/components/home/HomePageClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { toCarType, toHomeBanner, pickActivePromo } from '@/lib/api/adapters'
import { safeApiCall } from '@/lib/api/client'
import { getAllBanner, getCarTypes, getPromotionalCodes } from '@/lib/api/home'
import type { CarType } from '@/components/home/mockData'
import { loadHomeCmsPageData } from '@/lib/api/homeCmsPage'
import { faqPageJsonLd, webPageJsonLd } from '@/lib/seo/jsonLd'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Ghost Rentals Dubai — Luxury Car and Yacht Rental Services'
const DEFAULT_DESC =
  'Rent luxury cars and yachts in Dubai with Ghost Rentals. Rolls-Royce, Lamborghini, Bentley, luxury yachts and chauffeur services with 24/7 support.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('home', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/',
  })
}

export default async function Home() {
  const [{ cms }, bannerRes, carTypesRes, promoRes] = await Promise.all([
    loadHomeCmsPageData(),
    safeApiCall('getAllBanner(home)', () => getAllBanner({}), null),
    safeApiCall('getCarTypes(home)', () => getCarTypes({}), null),
    safeApiCall('getPromotionalCodes(home)', () => getPromotionalCodes({}), null)
  ])

  const initialBanner = bannerRes?.code === 200 && Array.isArray(bannerRes.result) ? toHomeBanner(bannerRes.result) : null
  const initialCarTypes: CarType[] =
    carTypesRes?.code === 200 && Array.isArray(carTypesRes.result)
      ? carTypesRes.result.map(toCarType).filter((c): c is CarType => c !== null)
      : []
  const initialPromo = promoRes?.code === 200 && Array.isArray(promoRes.result) ? pickActivePromo(promoRes.result) : null
  const heroVideoUrl = initialBanner?.file_type === 'video' ? initialBanner.media_url : ''
  const faqItems = cms.faq.items

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            name: DEFAULT_TITLE,
            description: DEFAULT_DESC,
            path: '/',
          }),
          faqPageJsonLd(faqItems),
        ]}
      />
      {heroVideoUrl ? <HeroVideoPreload href={heroVideoUrl} /> : null}
      <HomeContentPreload />
      <HomePageClient initialBanner={initialBanner} initialCarTypes={initialCarTypes} initialPromo={initialPromo} initialCms={cms} />
    </>
  )
}
