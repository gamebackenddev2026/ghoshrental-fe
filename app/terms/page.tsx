import type { Metadata } from 'next'
import { LegalPageClient } from '@/components/legal/LegalPageClient'
import { loadTermsPageData } from '@/lib/api/legalPage'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Terms & Conditions | Ghost Rentals'
const DEFAULT_DESC = 'Read the Ghost Rentals terms and conditions for renting vehicles and services.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('terms-and-conditions', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/terms',
  })
}

export default async function TermsPage() {
  const { cms } = await loadTermsPageData()
  return <LegalPageClient initialCms={cms} page='terms-and-conditions' />
}
