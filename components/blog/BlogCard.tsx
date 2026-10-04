import Link from 'next/link'
import { formatBlogAuthorName, type BlogListItem } from '@/lib/api/blogAdapters'
import { useAosProps } from '@/components/shared/AosProvider'
import { blogPostPath } from '@/lib/seo/blogPaths'
import { VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
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

export function BlogCard({ blog, aosDelay = 0 }: { blog: BlogListItem; aosDelay?: number }) {
  const imageSrc = blog.imageSrc || VEHICLE_PLACEHOLDER_SRC
  const aos = useAosProps(aosDelay)
  const authorLabel = formatBlogAuthorName(blog.authorName)
  const formattedDate = formatDate(blog.publishedAt)

  const href = blogPostPath(blog.slug)

  return (
    <Link {...aos} href={href} className={styles.card}>
      <div className={styles.cardMedia}>
        <OptimizedImage
          className={styles.cardImage}
          src={imageSrc}
          fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
          alt={blog.title}
          fill
          sizes={IMAGE_SIZES.card}
          loading='lazy'
        />
      </div>
      <div className={styles.cardBody}>
        {formattedDate || blog.tags.length > 0 ? (
          <div className={styles.cardMetaRow}>
            {formattedDate ? <p className={styles.cardDate}>{formattedDate}</p> : null}
            {blog.tags.length > 0 ? (
              <div className={styles.cardTagList}>
                {blog.tags.map((tag) => (
                  <span key={tag} className={styles.cardTag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <h2 className={styles.cardTitle}>{blog.title}</h2>
        {blog.excerpt ? <p className={styles.cardExcerpt}>{blog.excerpt}</p> : null}
        <span className={styles.cardLink}>Read more</span>
      </div>
    </Link>
  )
}
