'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Scroll window to top — mirrors Angular app.component / header NavigationEnd behavior. */
export function scrollToPageTop() {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

/**
 * Resets scroll position when the route changes (pathname or query).
 * Next.js client navigation does not always restore scroll to the top.
 */
export function ScrollToTop() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    scrollToPageTop()
  }, [pathname, searchParams])

  return null
}
