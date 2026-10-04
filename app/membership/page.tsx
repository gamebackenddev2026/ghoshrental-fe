import type { Metadata } from 'next'
import { MembershipClient } from '@/components/membership/MembershipClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadMembershipPageData } from '@/lib/api/membershipPage'
import { breadcrumbJsonLd, faqPageJsonLd, webPageJsonLd } from '@/lib/seo/jsonLd'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Luxury Car Rental Membership Plans in Dubai | Ghost Rentals Loyalty'
const DEFAULT_DESC =
  'Join the Ghost Rentals loyalty program in Dubai. Choose your membership for exclusive rental discounts, free services, extra mileage and points on every transaction.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('membership', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/membership'
  })
}

export default async function MembershipPage() {
  const { faq } = await loadMembershipPageData()

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Membership', path: '/membership' }
          ]),
          webPageJsonLd({
            name: 'Luxury Car Rental Membership Plans in Dubai',
            description: DEFAULT_DESC,
            path: '/membership'
          }),
          faqPageJsonLd(faq.items)
        ]}
      />
      <MembershipClient faq={faq} />
    </>
  )
}
