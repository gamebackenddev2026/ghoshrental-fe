'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getAllBlogCategory, viewAllBlog } from '@/lib/api/blog'
import { toBlogCategory, toBlogListItem, unwrapBlogList, type BlogCategory, type BlogListItem } from '@/lib/api/blogAdapters'
import type { BlogPageCms } from '@/lib/api/cmsAdapters'
import { useBlogCms } from '@/lib/api/useCmsPage'
import { buildViewAllBlogFilter, filterBlogListClientSide } from '@/lib/api/blogFilters'
import { refreshAos, useAosProps } from '@/components/shared/AosProvider'
import { BlogCard } from './BlogCard'
import { CmsRichText } from '@/components/shared/CmsRichText'
import styles from './blog.module.css'

const PAGE_SIZE = 12

type BlogListClientProps = {
  initialCms?: BlogPageCms
  pageTitle?: string
  pageDescription?: string
}

export function BlogListClient({
  initialCms,
  pageTitle: pageTitleProp,
  pageDescription: pageDescriptionProp
}: BlogListClientProps) {
  const cms = useBlogCms(initialCms)
  const pageTitle = pageTitleProp ?? cms.hero.title
  const pageDescription = pageDescriptionProp ?? cms.hero.subtitle
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const categoryFromUrl = searchParams.get('category') ?? ''

  const [blogs, setBlogs] = useState<BlogListItem[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = useMemo(() => categories.find((item) => item.id === selectedCategory) ?? null, [categories, selectedCategory])

  const updateUrl = useCallback(
    (category: string) => {
      const query = category ? `?category=${encodeURIComponent(category)}` : ''
      router.replace(`${pathname}${query}`, { scroll: false })
    },
    [pathname, router]
  )

  useEffect(() => {
    setSelectedCategory(categoryFromUrl)
  }, [categoryFromUrl])

  useEffect(() => {
    let cancelled = false

    const loadCategories = async () => {
      try {
        const categoryRes = await getAllBlogCategory({}).catch(() => null)
        if (cancelled) return

        if (categoryRes?.code === 200 && Array.isArray(categoryRes.result)) {
          setCategories(categoryRes.result.map(toBlogCategory).filter((item): item is BlogCategory => Boolean(item)))
        }
      } catch {
        // Category filters are optional.
      }
    }

    void loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadBlogs = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = buildViewAllBlogFilter({
          page: 1,
          limit: PAGE_SIZE,
          status: true,
          category: activeCategory
        })

        const res = await viewAllBlog(payload)

        if (cancelled) return

        if (res.code === 200) {
          let next = unwrapBlogList(res.result)
            .map(toBlogListItem)
            .filter((item): item is BlogListItem => Boolean(item))

          if (activeCategory) {
            next = filterBlogListClientSide(next, activeCategory)
          }

          setBlogs(next)
          return
        }

        setBlogs([])
        setError(res.message || 'Unable to load blog posts right now.')
      } catch {
        if (cancelled) return
        setBlogs([])
        setError('Blog posts are not available yet. Please check back soon.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBlogs()
    return () => {
      cancelled = true
    }
  }, [activeCategory])

  const activeLabel = useMemo(() => {
    if (activeCategory) return activeCategory.name
    return 'All posts'
  }, [activeCategory])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    updateUrl(categoryId)
  }

  const aosHero = useAosProps()
  const aosFilters = useAosProps(100)

  useEffect(() => {
    if (!loading && blogs.length > 0) {
      refreshAos()
    }
  }, [loading, blogs])

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div {...aosHero} className={styles.hero}>
          <h1 className={styles.heroTitle}>{pageTitle}</h1>
          <CmsRichText as="p" value={pageDescription} className={styles.heroSub} />
        </div>

        {categories.length > 0 ? (
          <div {...aosFilters} className={styles.filterGroup}>
            <div className={styles.toolbar}>
              <button type='button' className={styles.filterBtn} data-active={!selectedCategory} onClick={() => handleCategoryChange('')}>
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type='button'
                  className={styles.filterBtn}
                  data-active={selectedCategory === category.id}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          {loading ? <p className={styles.loading}>Loading {activeLabel.toLowerCase()}…</p> : null}
          {!loading && error ? <p className={styles.error}>{error}</p> : null}
          {!loading && !error && blogs.length === 0 ? <p className={styles.empty}>No blog posts found.</p> : null}
          {!loading && !error && blogs.length > 0 ? (
            <div className={styles.grid}>
              {blogs.map((blog, index) => (
                <BlogCard key={blog.id} blog={blog} aosDelay={index * 120} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
