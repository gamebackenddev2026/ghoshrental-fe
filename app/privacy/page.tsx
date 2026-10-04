import type { Metadata } from 'next'
import { LegalPageClient } from '@/components/legal/LegalPageClient'
import { loadPrivacyPageData } from '@/lib/api/legalPage'
import { buildCmsPageMetadata } from '@/lib/seo/pageMeta'

export const dynamic = 'force-dynamic'

const DEFAULT_TITLE = 'Privacy Policy | Ghost Rentals'
const DEFAULT_DESC = 'Learn how Ghost Rentals collects, uses, and protects your data.'

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata('privacy-policy', {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: '/privacy',
  })
}

export default async function PrivacyPage() {
  const { cms } = await loadPrivacyPageData()
  return <LegalPageClient initialCms={cms} page='privacy-policy' />
}
