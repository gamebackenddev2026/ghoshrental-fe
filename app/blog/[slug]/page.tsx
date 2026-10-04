import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { BlogDetailClient } from '@/components/blog/BlogDetailClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadBlogPost } from '@/lib/api/blogPage'
import { formatBlogAuthorName } from '@/lib/api/blogAdapters'
import { blogPostPath } from '@/lib/seo/blogPaths'
import { blogPostJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>
}

function buildBlogPostMetadata(post: NonNullable<Awaited<ReturnType<typeof loadBlogPost>>>) {
  const path = blogPostPath(post.slug)
  const author = formatBlogAuthorName(post.authorName)

  return buildPageMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    path,
    keywords: post.metaKeywords,
    image: post.imageSrc,
    ogType: 'article',
    publishedTime: post.publishedAt || undefined,
    modifiedTime: post.updatedAt || post.publishedAt || undefined,
    authors: author ? [author] : undefined
  })
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const post = await loadBlogPost(decoded)

  if (post) {
    return buildBlogPostMetadata(post)
  }

  return buildPageMetadata({
    title: 'Blog Post Not Found',
    description: 'The requested blog article is not available.',
    path: blogPostPath(decoded),
    noIndex: true
  })
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const post = await loadBlogPost(decoded)

  if (post && decoded !== post.slug) {
    permanentRedirect(blogPostPath(post.slug))
  }

  const canonicalPath = post ? blogPostPath(post.slug) : blogPostPath(decoded)

  return (
    <>
      {post ? (
        <JsonLd
          data={[
            blogPostJsonLd(post),
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: post.title, path: canonicalPath }
            ])
          ]}
        />
      ) : null}
      <BlogDetailClient initialPost={post} blogId={post?.id} />
    </>
  )
}
