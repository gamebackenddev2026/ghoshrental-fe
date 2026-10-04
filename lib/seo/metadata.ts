import type { Metadata } from 'next'
import { DEFAULT_SITE_DESCRIPTION, SITE_NAME, absoluteUrl, defaultOgImageUrl } from './site'

export type PageSeoInput = {
  title: string
  description?: string
  path?: string
  keywords?: string
  image?: string
  noIndex?: boolean
  ogType?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
}

function resolveMetadataTitle(title: string): Metadata['title'] {
  const trimmed = title.trim()
  if (trimmed.includes(`| ${SITE_NAME}`)) {
    return { absolute: trimmed }
  }
  return trimmed
}

const DEFAULT_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
}

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const description = input.description?.trim() || DEFAULT_SITE_DESCRIPTION
  const canonical = input.path ? absoluteUrl(input.path) : undefined
  const image = input.image?.trim() ? absoluteUrl(input.image) : defaultOgImageUrl()
  const title = resolveMetadataTitle(input.title)

  return {
    title,
    description,
    keywords: input.keywords,
    alternates: canonical ? { canonical } : undefined,
    authors: input.authors?.length ? input.authors.map((name) => ({ name })) : undefined,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'Travel',
    openGraph: {
      title: input.title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_AE',
      type: input.ogType ?? 'website',
      images: [{ url: image, alt: input.title || SITE_NAME }],
      ...(input.ogType === 'article'
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime,
            authors: input.authors,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      images: [image],
    },
    robots: input.noIndex ? { index: false, follow: false } : DEFAULT_ROBOTS,
  }
}
