import { blogCmsMediaUrl } from '@/lib/config'
import type { RawBlog, RawBlogCategory, RawBlogListResult, RawBlogTag } from './types'

export type BlogListItem = {
  id: string
  slug: string
  title: string
  excerpt: string
  imageSrc: string
  publishedAt: string
  updatedAt: string
  authorName: string
  categoryId?: string
  categorySlug?: string
  categoryName?: string
  tagIds: string[]
  tags: string[]
}

export function formatBlogAuthorName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  if (trimmed.toUpperCase() === 'ADMIN') return 'Ghost Rentals Admin'
  return trimmed
}

export type BlogPost = Omit<BlogListItem, 'tags'> & {
  content: string
  authorName: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  tags: Array<{ id: string; name: string; slug: string }>
}

export type BlogCategory = {
  id: string
  name: string
  slug: string
}

export type BlogTag = {
  id: string
  name: string
  slug: string
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/** Prepare CMS/editor HTML for dangerouslySetInnerHTML. */
export function normalizeBlogHtml(raw: string): string {
  if (!raw?.trim()) return ''

  let html = raw
    .replace(/\r\n/g, '\n')
    .replace(/&amp;#160;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()

  if (/&lt;\/?[a-z][\s\S]*&gt;/i.test(html)) {
    html = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
  }

  return html
}

function resolveBlogImage(raw: RawBlog): string {
  const rootUrl = pickString(raw.image_url, raw.s3_url)
  if (rootUrl && /^https?:\/\//i.test(rootUrl)) return rootUrl

  const image = raw.image ?? raw.featured_image
  if (typeof image === 'string' && image.trim()) {
    const trimmed = image.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return blogCmsMediaUrl(trimmed)
  }
  if (image && typeof image === 'object') {
    for (const candidate of [
      's3_url' in image ? image.s3_url : undefined,
      'src_url' in image ? image.src_url : undefined,
      'url' in image ? image.url : undefined,
      'src' in image ? image.src : undefined
    ]) {
      const trimmed = typeof candidate === 'string' ? candidate.trim() : ''
      if (!trimmed) continue
      if (/^https?:\/\//i.test(trimmed)) return trimmed
      return blogCmsMediaUrl(trimmed)
    }
  }
  const media = raw.media_data?.[0]
  if (media?.s3_url?.trim()) return media.s3_url.trim()
  if (media?.src?.trim()) {
    const src = media.src.trim()
    return /^https?:\/\//i.test(src) ? src : blogCmsMediaUrl(src)
  }
  return ''
}

function categoryFields(raw: RawBlog): {
  categoryId?: string
  categorySlug?: string
  categoryName?: string
} {
  let categoryId = pickString(raw.category_id, raw.categoryId)
  let categorySlug = pickString(raw.category_slug)
  let categoryName = pickString(raw.category_name)

  if (!categoryId && typeof raw.category === 'string') {
    const value = raw.category.trim()
    if (value) categoryId = value
  } else if (raw.category && typeof raw.category === 'object') {
    categoryId = pickString(raw.category_id, raw.category.id, raw.category._id) || categoryId
    categorySlug = pickString(raw.category.slug) || categorySlug
    categoryName = pickString(raw.category.name) || categoryName
  }

  if (raw.category_data) {
    categoryId = pickString(raw.category_data.category_id, raw.category_data.category, raw.category_data.id) || categoryId
    categorySlug = pickString(raw.category_data.slug) || categorySlug
    categoryName = pickString(raw.category_data.name) || categoryName
  }

  if (categoryName && /^\d+$/.test(categoryName) && !raw.category_name) {
    categoryName = ''
  }

  return {
    categoryId: categoryId || undefined,
    categorySlug: categorySlug || undefined,
    categoryName: categoryName || undefined
  }
}

function listTagIds(raw: RawBlog): string[] {
  const fromData = (raw.tag_data ?? []).map((tag) => pickString(tag._id, tag.id)).filter(Boolean)
  if (fromData.length) return fromData

  return (raw.tagIds ?? []).map((id) => id.trim()).filter(Boolean)
}

function normalizeTags(raw: RawBlog): BlogPost['tags'] {
  const fromData = (raw.tag_data ?? []).map((tag) => toBlogTag(tag)).filter((tag): tag is BlogTag => Boolean(tag))
  if (fromData.length) return fromData

  const fromTagStrings = (raw.tagsdata ?? [])
    .map((name, index) => {
      const label = typeof name === 'string' ? name.trim() : ''
      if (!label) return null
      return { id: `tag-${index}`, name: label, slug: label }
    })
    .filter((tag): tag is BlogTag => Boolean(tag))
  if (fromTagStrings.length) return fromTagStrings

  return (raw.tags ?? [])
    .map((tag) => {
      if (typeof tag === 'string') {
        return { id: tag, name: tag, slug: tag }
      }
      const mapped = toBlogTag(tag)
      return mapped ?? null
    })
    .filter((tag): tag is BlogTag => Boolean(tag))
}

export function toBlogTag(raw: RawBlogTag | null | undefined): BlogTag | null {
  if (!raw) return null
  const id = pickString(raw._id, raw.id)
  const name = pickString(raw.name, raw.slug)
  const slug = pickString(raw.slug, raw.name)
  if (!id || !name) return null
  return { id, name, slug: slug || id }
}

export function toBlogCategory(raw: RawBlogCategory | null | undefined): BlogCategory | null {
  if (!raw) return null
  // Prefer business category_id ("1") over Mongo _id for filtering blog posts.
  const id = pickString(raw.category_id, raw.category, raw.id)
  const name = pickString(raw.name)
  const slug = pickString(raw.slug, raw.name)

  if (!id || !name) return null

  return { id, name, slug: slug || id }
}

function listTagLabels(raw: RawBlog): string[] {
  const fromStrings = (raw.tagsdata ?? []).map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)
  if (fromStrings.length) return fromStrings

  return normalizeTags(raw).map((tag) => tag.name)
}

export function unwrapBlogList(result: RawBlogListResult | RawBlog[] | null | undefined): RawBlog[] {
  if (!result) return []
  if (Array.isArray(result)) return result
  if (Array.isArray(result.data)) return result.data
  if (Array.isArray(result.blogs)) return result.blogs
  if (Array.isArray(result.result)) return result.result
  return []
}

export function toBlogListItem(raw: RawBlog): BlogListItem | null {
  const id = pickString(raw._id, raw.id)
  const title = pickString(raw.title, raw.meta_title, raw.name)
  const slug = pickString(raw.slug, raw.url_key, id)
  if (!id || !title) return null

  const excerpt = pickString(raw.short_description, raw.short_desc, raw.description, raw.meta_description)

  const publishedAt = pickString(raw.publication_date, raw.published_at, raw.created_at, raw.updated_at)
  const updatedAt = pickString(raw.updated_at, raw.publication_date, raw.published_at, raw.created_at)
  const authorName = pickString(raw.author_name, raw.author)
  const category = categoryFields(raw)

  return {
    id,
    slug,
    title,
    excerpt,
    imageSrc: resolveBlogImage(raw),
    publishedAt,
    updatedAt,
    authorName,
    categoryId: category.categoryId,
    categorySlug: category.categorySlug,
    categoryName: category.categoryName,
    tagIds: listTagIds(raw),
    tags: listTagLabels(raw)
  }
}

export function toBlogPost(raw: RawBlog | null | undefined): BlogPost | null {
  if (!raw) return null
  const listItem = toBlogListItem(raw)
  if (!listItem) return null

  const content = normalizeBlogHtml(pickString(raw.content, raw.body, raw.description))
  const metaTitle = pickString(raw.meta_title, listItem.title)
  const metaDescription = pickString(raw.meta_description, listItem.excerpt)
  const metaKeywords = pickString(raw.meta_keywords)

  const authorName = pickString(raw.author_name, raw.author)

  return {
    ...listItem,
    content,
    authorName,
    metaTitle,
    metaDescription,
    metaKeywords,
    tags: normalizeTags(raw)
  }
}
