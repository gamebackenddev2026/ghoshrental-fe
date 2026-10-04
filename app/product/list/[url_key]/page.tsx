import type { Metadata } from 'next'
import { FaqCms } from '@/components/shared/FaqCms'
import { JsonLd } from '@/components/seo/JsonLd'
import homeSectionStyles from '@/components/home/homeSections.module.css'
import { ProductListClient } from '@/components/product/ProductListClient'
import { loadFaqPageData } from '@/lib/api/faqPage'
import { breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo/jsonLd'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

type Params = Promise<{ url_key: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const resolved = await params
  const label = resolved.url_key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())

  return buildPageMetadata({
    title: `${label} Car Rental in Dubai`,
    description: 'Browse Ghost Rentals luxury car collection by car type in Dubai with live availability and pricing.',
    path: `/product/list/${encodeURIComponent(resolved.url_key)}`
  })
}

export default async function ProductListPage({ params }: { params: Params }) {
  const resolved = await params
  const { faq } = await loadFaqPageData('listing')
  const label = resolved.url_key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  const path = `/product/list/${encodeURIComponent(resolved.url_key)}`

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Our Fleet', path: '/product/list' },
            { name: `${label} Rentals`, path },
          ]),
          faqPageJsonLd(faq.items),
        ]}
      />
      <ProductListClient urlKey={resolved.url_key} />
      <FaqCms page='listing' initial={faq} className={homeSectionStyles.faqSectionProductList} />
    </>
  )
}
