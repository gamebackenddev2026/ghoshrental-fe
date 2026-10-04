import { getBlogWithId, viewAllBlog } from './blog'
import { toBlogListItem, toBlogPost, unwrapBlogList, type BlogPost } from './blogAdapters'
import { safeApiCall } from './client'
import { loadCmsPage } from './cms'
import { toBlogPageCms, type BlogPageCms } from './cmsAdapters'
import type { RawBlog } from './types'
import { isMongoObjectId } from '@/lib/seo/blogPaths'

const PAGE_LIMIT = 500
const MAX_PAGES = 20

async function findRawBlogBySlug(slug: string): Promise<RawBlog | null> {
  const normalized = slug.trim()
  if (!normalized) return null

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await safeApiCall(
      `viewAllBlog(slug:${normalized},page:${page})`,
      () => viewAllBlog({ page, limit: PAGE_LIMIT, status: true }),
      null,
    )

    if (!res || res.code !== 200) return null

    const list = unwrapBlogList(res.result)
    const match = list.find((raw) => toBlogListItem(raw)?.slug === normalized)
    if (match) return match

    if (list.length < PAGE_LIMIT) break
  }

  return null
}

/** Resolve a blog post by slug or legacy Mongo id (for redirects). */
export async function loadBlogPost(identifier: string): Promise<BlogPost | null> {
  const decoded = decodeURIComponent(identifier).trim()
  if (!decoded) return null

  if (isMongoObjectId(decoded)) {
    const res = await safeApiCall(
      `getBlogWithId(${decoded})`,
      () => getBlogWithId(decoded),
      null,
    )
    return res && res.code === 200 ? toBlogPost(res.result) : null
  }

  const raw = await findRawBlogBySlug(decoded)
  return raw ? toBlogPost(raw) : null
}

/** Recent published posts for the home page “Latest From Our Blog” block. */
export async function loadRecentBlogs(limit = 3) {
  const res = await safeApiCall(
    `viewAllBlog(home,recent,limit:${limit})`,
    () => viewAllBlog({ page: 1, limit, status: true }),
    null,
  )

  if (!res || res.code !== 200) return []

  return unwrapBlogList(res.result)
    .map((raw) => toBlogListItem(raw))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, limit)
}

/** Published posts for listing pages and blog index schema. */
export async function loadPublishedBlogList(limit = 50) {
  const res = await safeApiCall(
    `viewAllBlog(list,limit:${limit})`,
    () => viewAllBlog({ page: 1, limit, status: true }),
    null,
  )

  if (!res || res.code !== 200) return []

  return unwrapBlogList(res.result)
    .map((raw) => toBlogListItem(raw))
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.slug))
}

export type BlogCmsPageData = {
  cms: BlogPageCms
}

/** Blog listing hero copy from `POST /api/cms/getCmsByPage` (`page: "blog"`). */
export async function loadBlogCmsPageData(): Promise<BlogCmsPageData> {
  const sections = await loadCmsPage('blog')
  return { cms: toBlogPageCms(sections) }
}
