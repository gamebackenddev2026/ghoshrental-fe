/** Canonical path for a blog post — always slug-based for SEO. */
export function blogPostPath(slug: string): string {
  const normalized = slug.trim()
  return `/blog/${encodeURIComponent(normalized)}`
}

export function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim())
}
