'use client'

import { useCallback, useEffect, useRef } from 'react'

type CmsBannerVideoProps = {
  primarySrc: string
  fallbackSrc?: string
  poster?: string
  className?: string
  ariaLabel: string
  preload?: 'auto' | 'metadata' | 'none'
  fetchPriority?: 'high' | 'low' | 'auto'
}

/** Mirrors Angular home `tryPlayVideo()` — muted autoplay can need a delayed play(). */
function tryPlayVideo(el: HTMLVideoElement | null) {
  if (!el || typeof el.play !== 'function') return
  void el.play().catch(() => undefined)
}

export function CmsBannerVideo({
  primarySrc,
  fallbackSrc = '',
  poster,
  className,
  ariaLabel,
  preload = 'auto',
  fetchPriority,
}: CmsBannerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const schedulePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    tryPlayVideo(el)
    window.setTimeout(() => tryPlayVideo(el), 300)
    window.setTimeout(() => tryPlayVideo(el), 800)
  }, [])

  useEffect(() => {
    schedulePlay()
  }, [primarySrc, schedulePlay])

  if (!primarySrc) return null

  return (
    <video
      ref={videoRef}
      className={className}
      src={primarySrc}
      {...(poster ? { poster } : {})}
      muted
      autoPlay
      loop
      playsInline
      preload={preload}
      {...(fetchPriority ? { fetchPriority } : {})}
      aria-label={ariaLabel}
      data-fallback-src={fallbackSrc}
      onLoadedData={schedulePlay}
      onCanPlay={schedulePlay}
      onError={(event) => {
        const el = event.currentTarget
        const fallback = el.getAttribute('data-fallback-src')
        if (fallback && el.src !== fallback) {
          el.src = fallback
          schedulePlay()
        }
      }}
    />
  )
}
