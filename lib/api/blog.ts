import { apiPost } from './client'
import type { RawBlog, RawBlogCategory, RawBlogListResult, RawBlogTag } from './types'

export type ViewAllBlogPayload = {
  page?: number
  limit?: number
  /** Legacy key */
  categoryId?: string
  /** Legacy key */
  tagId?: string
  /** Numeric category id — e.g. "3" */
  blog_category?: string
  /** Category mongo id or numeric id */
  category_id?: string
  /** Category slug — e.g. "guides" */
  category?: string
  /** Tag mongo ids */
  tag?: string[]
  /** Tag slugs / names */
  tag_list?: string[]
  /** Tag display names */
  tags?: string[]
  search?: string
  status?: boolean
}

export const viewAllBlog = (payload: ViewAllBlogPayload = {}, token?: string) =>
  apiPost<RawBlogListResult | RawBlog[]>('/api/blog/viewallBlog', payload, { token })

export const getBlogWithId = (id: string, token?: string) => apiPost<RawBlog>('/api/blog/getBlogWithId', { id }, { token })

export const getAllBlogCategory = (payload: unknown = {}, token?: string) =>
  apiPost<RawBlogCategory[]>('/api/blog/getAllBlogCategory', payload, { token })

export const getAllBlogTag = (payload: unknown = {}) => apiPost<RawBlogTag[]>('/api/blog/getAllBlogTag', payload)

export const addBlog = (payload: unknown, token: string) => apiPost<unknown>('/api/blog/addBlog', payload, { token })

export const editBlogData = (payload: unknown, id: string, token: string) =>
  apiPost<unknown>(`/api/blog/editBlogdata?id=${encodeURIComponent(id)}`, payload, { token })

export const deleteBlog = (payload: unknown, token: string) => apiPost<unknown>('/api/blog/deleteblog', payload, { token })

export const getBlogPresignedUploadUrl = (payload: unknown, token: string) =>
  apiPost<unknown>('/api/blog/presignedUploadUrl', payload, { token })
