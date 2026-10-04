'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { BlogListItem } from '@/lib/api/blogAdapters'
import { refreshAos, useAosProps } from '@/components/shared/AosProvider'
import homeStyles from '@/components/home/homeSections.module.css'
import { BlogCard } from './BlogCard'
import styles from './blog.module.css'

type RecentBlogSectionProps = {
  /** API rows to render — section is omitted entirely when empty. */
  blogs: BlogListItem[]
}

/** Home “Latest From Our Blog” — only mount when `blogs.length > 0`. */
export function RecentBlogSection({ blogs }: RecentBlogSectionProps) {
  const aosHero = useAosProps()
  const aosLink = useAosProps(150)

  useEffect(() => {
    if (blogs.length > 0) {
      refreshAos()
    }
  }, [blogs])

  if (!blogs.length) return null

  return (
    <section className={styles.page} style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
      <div className={styles.inner}>
        <div {...aosHero} className={styles.hero}>
          <h2 className={styles.heroTitle}>Latest From Our Blog</h2>
          <p className={styles.heroSub}>Stories, guides, and updates from Ghost Rentals.</p>
        </div>
        <div className={styles.grid}>
          {blogs.map((blog, index) => (
            <BlogCard key={blog.id} blog={blog} aosDelay={index * 120} />
          ))}
        </div>
        <div {...aosLink} className={styles.viewAllRow}>
          <Link href='/blog' className={`${homeStyles.viewAllBtn} ${styles.blogViewAllBtn}`}>
            <span>View All</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
