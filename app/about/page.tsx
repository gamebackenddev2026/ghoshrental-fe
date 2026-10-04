import type { Metadata } from 'next'
import { AboutClient } from '@/components/about/AboutClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadAboutPageData } from '@/lib/api/aboutPage'
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'About Ghost Rentals-best Luxury Car and Yacht Rentals Dubai'
const DEFAULT_DESC =
  'Ghost Rentals delivers luxury cars, yachts, and chauffeur services in Dubai and across the UAE — reliability, discretion, and personalized service.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('about', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/about',
  })
}

export default async function AboutPage() {
  const { cms, initialHeroBanner, brands } = await loadAboutPageData()

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About Us', path: '/about' },
        ])}
      />
      <AboutClient initialCms={cms} initialHeroBanner={initialHeroBanner} brands={brands} />
    </>
  )
}
