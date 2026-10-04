import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BlogListClient } from '@/components/blog/BlogListClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadBlogCmsPageData, loadPublishedBlogList } from '@/lib/api/blogPage'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { fetchCmsPageSeo } from '@/lib/seo/pageMeta'
import { BLOG_LIST_DEFAULT_DESC, getBlogListPageTitle } from '@/lib/seo/pageTitles'
import { blogListingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCmsPageSeo('blog')

  return buildPageMetadata({
    title: getBlogListPageTitle(cms?.meta_title),
    description: cms?.meta_description || BLOG_LIST_DEFAULT_DESC,
    path: '/blog',
    keywords: cms?.meta_keywords
  })
}

export default async function BlogPage() {
  const [{ cms }, cmsSeo, posts] = await Promise.all([
    loadBlogCmsPageData(),
    fetchCmsPageSeo('blog'),
    loadPublishedBlogList(50)
  ])

  const pageTitle = getBlogListPageTitle(cmsSeo?.meta_title || cms.hero.title)
  const pageDescription = cmsSeo?.meta_description || cms.hero.subtitle || BLOG_LIST_DEFAULT_DESC

  return (
    <>
      <JsonLd
        data={[
          blogListingJsonLd(posts, pageTitle),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' }
          ])
        ]}
      />
      <Suspense fallback={null}>
        <BlogListClient initialCms={cms} pageTitle={pageTitle} pageDescription={pageDescription} />
      </Suspense>
    </>
  )
}
