import type { ElementType, HTMLAttributes } from 'react'
import { isEffectivelyEmptyHtml, isHtmlContent, prepareCmsRichText } from '@/lib/cms/htmlContent'

type CmsRichTextProps = {
  value?: string | null
  as?: ElementType
} & HTMLAttributes<HTMLElement>

/** Renders CMS plain text or sanitized HTML from the admin editor. */
export function CmsRichText({ value, as: Tag = 'div', className, ...rest }: CmsRichTextProps) {
  if (!value?.trim()) return null

  const prepared = prepareCmsRichText(value)
  if (!prepared) return null

  const isHtml = isHtmlContent(prepared) && !isEffectivelyEmptyHtml(prepared)
  const Element = isHtml ? 'div' : Tag

  if (isHtml) {
    return (
      <Element
        className={className}
        {...rest}
        dangerouslySetInnerHTML={{ __html: prepared }}
      />
    )
  }

  return (
    <Element className={className} {...rest}>
      {prepared}
    </Element>
  )
}
