'use client'

import { LegalPage } from '@/components/legal/LegalPage'
import type { LegalPageCms } from '@/lib/legal/types'
import { useLegalCms } from '@/lib/api/useCmsPage'

type LegalPageClientProps = {
  initialCms: LegalPageCms
  page: 'privacy-policy' | 'terms-and-conditions'
}

function LegalTitle({ cms }: { cms: LegalPageCms }) {
  if (cms.subtitle) {
    return (
      <>
        {cms.title}
        <br />
        {cms.subtitle}
      </>
    )
  }

  return <>{cms.title}</>
}

export function LegalPageClient({ initialCms, page }: LegalPageClientProps) {
  const cms = useLegalCms(page, initialCms)

  return <LegalPage title={<LegalTitle cms={cms} />} blocks={cms.blocks} />
}
