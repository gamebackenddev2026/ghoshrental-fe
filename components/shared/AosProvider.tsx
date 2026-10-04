'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { AOS_INIT_OPTIONS, markAosInitialized, scheduleAosRefresh } from '@/lib/aos'

const AosReadyContext = createContext(false)

export function useAosReady() {
  return useContext(AosReadyContext)
}

/** Use instead of hard-coded data-aos to avoid SSR hydration mismatches. */
export function useAosProps(delay?: number) {
  const ready = useAosReady()

  if (!ready) return {}

  return {
    'data-aos': 'fade-up',
    'data-aos-duration': '2200',
    'data-aos-easing': 'ease-out-cubic',
    ...(delay != null ? { 'data-aos-delay': String(delay) } : {})
  } as const
}

/** Re-scan DOM after async content (e.g. blog cards) mounts. */
export function refreshAos() {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => {
    AOS.refresh()
  })
}

export function AosProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        AOS.init({
          ...AOS_INIT_OPTIONS,
          disable: reducedMotion
        })
        markAosInitialized()
        scheduleAosRefresh()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [ready])

  useEffect(() => {
    if (!ready) return
    scheduleAosRefresh()
  }, [pathname, ready])

  useEffect(() => {
    if (!ready) return

    const timer = window.setTimeout(() => {
      AOS.refreshHard()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [pathname, ready])

  return <AosReadyContext.Provider value={ready}>{children}</AosReadyContext.Provider>
}
