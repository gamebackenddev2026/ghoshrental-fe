'use client'

import { Faq, type FaqContent } from '@/components/home/HomeSections'
import { useFaqCms } from '@/lib/api/useCmsPage'
import type { FaqCmsContent } from '@/lib/api/cmsAdapters'

export function FaqCms({
  page,
  initial,
  className,
}: {
  page: string
  initial?: FaqCmsContent
  className?: string
}) {
  const cms = useFaqCms(page, initial)

  const content: FaqContent = {
    title: cms.title,
    subtitle: cms.subtitle,
    buttonText: cms.buttonText,
    items: cms.items,
  }

  return <Faq className={className} content={content} />
}

