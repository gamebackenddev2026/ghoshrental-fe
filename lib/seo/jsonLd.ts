import type { BlogListItem, BlogPost } from '@/lib/api/blogAdapters'
import type { ProductDetailModel } from '@/lib/api/productAdapters'
import { vehicleProductPath } from '@/lib/api/adapters'
import { blogPostPath } from './blogPaths'
import { absoluteUrl, defaultOgImageUrl, getSiteOrigin, SITE_NAME } from './site'

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: getSiteOrigin(),
    logo: defaultOgImageUrl(),
    sameAs: [
      'https://www.facebook.com/Ghostrentalsdubai',
      'https://www.instagram.com/ghost.rentals/',
      'https://www.tiktok.com/@ghostrentals',
      'https://ae.linkedin.com/company/ghostrentals',
      'https://www.youtube.com/@GhostRentalsDXB'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+971-800-44678',
      contactType: 'customer service',
      areaServed: 'AE',
      availableLanguage: ['English', 'Arabic']
    }
  }
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteOrigin(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/product/search')}?type=Car&topsearch={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: SITE_NAME,
    url: getSiteOrigin(),
    image: defaultOgImageUrl(),
    telephone: '+971-800-44678',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dubai',
      addressCountry: 'AE'
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Arab Emirates'
    }
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  }
}

function plainTextForSchema(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>) {
  const entries = items
    .filter((item) => item.question.trim() && item.answer.trim())
    .map((item) => ({
      '@type': 'Question',
      name: plainTextForSchema(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: plainTextForSchema(item.answer),
      },
    }))

  if (!entries.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries,
  }
}

export function webPageJsonLd(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: 'en-AE',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: getSiteOrigin(),
    },
  }
}

export function blogListingJsonLd(posts: BlogListItem[], pageTitle?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: pageTitle?.trim() || 'Ghost Rentals Blog',
    description: 'Luxury car rental guides, yacht charter tips, and Dubai travel insights from Ghost Rentals.',
    url: absoluteUrl('/blog'),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: defaultOgImageUrl()
      }
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || undefined,
      url: absoluteUrl(blogPostPath(post.slug)),
      datePublished: post.publishedAt || undefined,
      dateModified: post.updatedAt || post.publishedAt || undefined,
      image: post.imageSrc ? absoluteUrl(post.imageSrc) : undefined,
      author: {
        '@type': 'Person',
        name: post.authorName?.trim() || SITE_NAME
      }
    }))
  }
}

export function blogPostJsonLd(post: BlogPost) {
  const path = blogPostPath(post.slug)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: post.imageSrc ? [absoluteUrl(post.imageSrc)] : [defaultOgImageUrl()],
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: {
      '@type': 'Person',
      name: post.authorName || SITE_NAME
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: defaultOgImageUrl()
      }
    },
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
    inLanguage: 'en-AE',
    articleSection: post.categoryName || undefined,
    keywords: post.metaKeywords || undefined
  }
}

export function vehicleProductJsonLd(product: ProductDetailModel, mode: 'rent' | 'lease') {
  const path = vehicleProductPath(product.url_key, mode)
  const image = product.gallery[0]?.src || product.media_data[0]?.s3_url || product.media_data[0]?.src || defaultOgImageUrl()

  const price = product.dailyRate || product.sale_price || undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.meta_description || product.short_description || product.description,
    image: [image.startsWith('http') ? image : absoluteUrl(image)],
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME
    },
    offers: price
      ? {
          '@type': 'Offer',
          url: absoluteUrl(path),
          priceCurrency: 'AED',
          price,
          availability: 'https://schema.org/InStock'
        }
      : undefined
  }
}
