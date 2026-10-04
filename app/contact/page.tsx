import type { Metadata } from 'next'
import { ContactClient } from '@/components/contact/ContactClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadContactPageData } from '@/lib/api/contactPage'
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Contact Ghost Rentals for Car, Yacht and Chauffeur services in Dubai'
const DEFAULT_DESC =
  'Get in touch with Ghost Rentals Dubai — luxury car rental, yacht charter, and chauffeur services. Showroom in Al Quoz, Dubai.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('contact', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/contact',
  })
}

export default async function ContactPage() {
  const { cms } = await loadContactPageData()
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact Us', path: '/contact' },
        ])}
      />
      <ContactClient initialCms={cms} />
    </>
  )
}
