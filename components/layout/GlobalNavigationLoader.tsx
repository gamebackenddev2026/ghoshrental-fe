'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toAssetUrl } from '@/lib/config'
import { isIntroValid } from '@/lib/introSession'
import { scrollToPageTop } from '@/components/layout/ScrollToTop'
import styles from '../home/siteIntro.module.css'

const LOADER_LOGO = 'loader-video/loader-logo.png'
const MIN_VISIBLE_MS = 350
const LOADER_FADE_MS = 500

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function GlobalNavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Two independent flags — one for page load/refresh, one for navigation clicks
  const [initialLoading, setInitialLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)
  const [renderLoader, setRenderLoader] = useState(true)
  const [fadingOut, setFadingOut] = useState(false)

  const shownAtRef = useRef<number>(0)
  const navTimerRef = useRef<number | null>(null)
  const fadeTimerRef = useRef<number | null>(null)
  const currentUrlRef = useRef<string>('')

  // Auto-hide the initial splash MIN_VISIBLE_MS after mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInitialLoading(false)
      currentUrlRef.current = `${window.location.pathname}${window.location.search}`
    }, MIN_VISIBLE_MS)

    return () => window.clearTimeout(timer)
  }, [])

  // Keep the loader mounted long enough for opacity/visibility transition to play.
  useEffect(() => {
    const isVisible = initialLoading || navigating

    if (isVisible) {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      setRenderLoader(true)
      setFadingOut(false)
      return
    }

    setFadingOut(true)
    fadeTimerRef.current = window.setTimeout(() => {
      setRenderLoader(false)
      setFadingOut(false)
      fadeTimerRef.current = null
    }, LOADER_FADE_MS)

    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
    }
  }, [initialLoading, navigating])

  // Hide the navigation splash once the route change is committed
  useEffect(() => {
    const nextUrl = `${pathname ?? ''}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`

    if (!navigating) {
      currentUrlRef.current = nextUrl
      return
    }

    const elapsed = Date.now() - shownAtRef.current
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed)

    if (navTimerRef.current !== null) window.clearTimeout(navTimerRef.current)
    navTimerRef.current = window.setTimeout(() => {
      setNavigating(false)
      currentUrlRef.current = nextUrl
      navTimerRef.current = null
    }, delay)

    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current)
        navTimerRef.current = null
      }
    }
  }, [pathname, searchParams, navigating])

  // Show navigation splash on internal link clicks
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedEvent(event) || event.button !== 0) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      if (anchor.hasAttribute('data-intro-logo') && !isIntroValid()) return

      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      let next: URL
      try {
        next = new URL(anchor.href, window.location.origin)
      } catch {
        return
      }

      if (next.origin !== window.location.origin) return

      const nextUrl = `${next.pathname}${next.search}`
      const currentUrl = currentUrlRef.current || `${window.location.pathname}${window.location.search}`
      if (nextUrl === currentUrl) {
        if (!next.hash) scrollToPageTop()
        return
      }

      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current)
        navTimerRef.current = null
      }

      shownAtRef.current = Date.now()
      setNavigating(true)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  if (!renderLoader) return null

  return (
    <div className={`${styles.loader} ${fadingOut ? styles.loaderFadeOut : ''}`} role='presentation' aria-hidden>
      <div className={styles.loaderContent}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={toAssetUrl(LOADER_LOGO)} alt='' width={80} height={80} decoding='async' loading='eager' />
      </div>
    </div>
  )
}
