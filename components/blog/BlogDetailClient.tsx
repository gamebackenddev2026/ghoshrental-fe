'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBlogWithId } from '@/lib/api/blog'
import { formatBlogAuthorName, normalizeBlogHtml, toBlogPost, type BlogPost } from '@/lib/api/blogAdapters'
import { toAssetUrl } from '@/lib/config'
import { VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { useAosProps } from '@/components/shared/AosProvider'
import styles from './blog.module.css'

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function BlogDetailClient({
  blogId,
  initialPost = null,
}: {
  blogId?: string
  initialPost?: BlogPost | null
}) {
  const resolvedId =
    blogId ||
    (initialPost as unknown as { _id?: string; id?: string } | null)?.id ||
    ''

  const [post, setPost] = useState<BlogPost | null>(initialPost)
  const [loading, setLoading] = useState(!initialPost)
  const [error, setError] = useState('')
  const aosArticle = useAosProps()

  useEffect(() => {
    let cancelled = false

    const loadPost = async () => {
      if (!resolvedId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')

      try {
        const res = await getBlogWithId(resolvedId)

        if (cancelled) return

        if (res.code === 200 && res.result) {
          const loaded = toBlogPost(res.result)
          if (loaded) {
            setPost(loaded)
            return
          }
        }

        setPost(null)
        setError(res.message || 'This blog post could not be found.')
      } catch {
        if (cancelled) return
        setPost(null)
        setError('This blog post is not available right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPost()
    return () => {
      cancelled = true
    }
  }, [resolvedId])

  if (loading) {
    return (
      <div className={`${styles.page} ${styles.detailPage}`}>
        <div className={styles.detailShell}>
          <p className={styles.loading}>Loading article…</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className={`${styles.page} ${styles.detailPage}`}>
        <div className={styles.detailShell}>
          <Link href='/blog' className={styles.backLink}>
            ← Back to blog
          </Link>
          <p className={styles.error}>{error || 'This blog post could not be found.'}</p>
        </div>
      </div>
    )
  }

  const imageSrc = post.imageSrc || VEHICLE_PLACEHOLDER_SRC
  const authorLabel = formatBlogAuthorName(post.authorName)
  const formattedDate = formatDate(post.publishedAt)
  const tagLabels = post.tags.map((tag) => tag.name)

  return (
    <article className={`${styles.page} ${styles.detailPage}`}>
      <div className={styles.detailShell}>
        <Link href='/blog' className={styles.backLink}>
          ← Back to blog
        </Link>

        <div {...aosArticle} className={styles.detailArticle}>
          <header className={styles.detailHeader}>
            <h1 className={styles.detailTitle}>{post.title}</h1>

            {formattedDate || tagLabels.length > 0 ? (
              <div className={styles.detailMetaRow}>
                {formattedDate ? (
                  <time className={styles.detailDate} dateTime={post.publishedAt}>
                    {formattedDate}
                  </time>
                ) : null}

                {tagLabels.length > 0 ? (
                  <div className={styles.detailMetaTags}>
                    {tagLabels.map((tag) => (
                      <span key={tag} className={styles.detailTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </header>

          <div className={styles.detailImageWrap}>
            <OptimizedImage
              className={styles.detailImage}
              src={imageSrc}
              fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
              alt={post.title}
              fill
              sizes={IMAGE_SIZES.gallery}
              priority
              loading='eager'
            />
          </div>

          <div
            className={styles.detailContent}
            dangerouslySetInnerHTML={{
              __html: post.content || normalizeBlogHtml(post.excerpt)
            }}
          />

          {authorLabel ? <p className={styles.detailAuthorFooter}>By {authorLabel}</p> : null}
        </div>
      </div>
    </article>
  )
}
