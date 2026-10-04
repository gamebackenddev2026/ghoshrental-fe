'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const SLIDE_INTERVAL_MS = 700
/** Matches `homeSections.module.css` desktop-only slideshow breakpoint. */
const DESKTOP_MAX_WIDTH = 1199

export type CardSlideImage = { src: string; alt: string }

/** Cycles card images on hover (desktop). */
export function useCardImageSlideshow(images: CardSlideImage[]) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [slidesActive, setSlidesActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images

  const stopSlide = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setSlidesActive(false)
    setActiveIdx(0)
  }, [])

  const startSlide = useCallback(() => {
    const slides = imagesRef.current
    if (slides.length <= 1) return
    if (typeof window !== 'undefined' && window.innerWidth <= DESKTOP_MAX_WIDTH) return
    if (intervalRef.current) return

    setSlidesActive(true)

    slides.forEach((img) => {
      const preload = new window.Image()
      preload.src = img.src
    })

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % imagesRef.current.length
      setActiveIdx(idx)
    }, SLIDE_INTERVAL_MS)
  }, [])

  const goToPrev = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActiveIdx((prev) => (prev - 1 + imagesRef.current.length) % imagesRef.current.length)
  }, [])

  const goToNext = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActiveIdx((prev) => (prev + 1) % imagesRef.current.length)
  }, [])

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    },
    []
  )

  return {
    activeIdx,
    hasMultiple: images.length > 1,
    slidesActive,
    startSlide,
    stopSlide,
    goToPrev,
    goToNext
  }
}
