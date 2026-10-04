import type { ViewAllBlogPayload } from './blog'
import type { BlogCategory, BlogListItem } from './blogAdapters'

/** Build viewallBlog payload using flexible category keys (blog_category, category_id, category). */
export function buildViewAllBlogFilter(options: {
  page?: number
  limit?: number
  status?: boolean
  category?: BlogCategory | null
}): ViewAllBlogPayload {
  const payload: ViewAllBlogPayload = {
    page: options.page ?? 1,
    limit: options.limit ?? 12,
    status: options.status ?? true,
  }

  if (options.category) {
    const { id, slug, name } = options.category

    payload.blog_category = id
    payload.category_id = id
    payload.categoryId = id

    if (slug && slug !== id) {
      payload.category = slug
    } else if (name && !/^\d+$/.test(name)) {
      payload.category = name.toLowerCase().replace(/\s+/g, '-')
    }
  }

  return payload
}

function blogMatchesCategory(blog: BlogListItem, category: BlogCategory): boolean {
  const blogValues = [blog.categoryId, blog.categorySlug, blog.categoryName]
    .filter(Boolean)
    .map((value) => value!.toLowerCase())

  const filterValues = [category.id, category.slug, category.name]
    .filter(Boolean)
    .map((value) => value.toLowerCase())

  return blogValues.some((value) => filterValues.includes(value))
}

/** Client-side safety net when the API returns an unfiltered list. */
export function filterBlogListClientSide(
  blogs: BlogListItem[],
  category: BlogCategory | null | undefined,
): BlogListItem[] {
  if (!category) return blogs
  return blogs.filter((blog) => blogMatchesCategory(blog, category))
}
