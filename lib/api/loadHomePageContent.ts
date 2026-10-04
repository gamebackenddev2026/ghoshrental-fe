import { loadRecentBlogs } from './blogPage'
import { loadHomePageData, type HomePageData } from './homePage'
import type { BlogListItem } from './blogAdapters'
import { getServerAuthToken } from '@/lib/serverAuth'

export type HomePageContent = {
  home: HomePageData
  blogs: BlogListItem[]
}

/** Home API fan-out plus recent blog posts — single readiness signal for the home page. */
export async function loadHomePageContent(blogLimit = 3): Promise<HomePageContent> {
  const authToken = await getServerAuthToken()
  const [home, blogs] = await Promise.all([loadHomePageData(authToken), loadRecentBlogs(blogLimit)])
  return { home, blogs }
}
