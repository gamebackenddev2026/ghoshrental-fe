'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toAssetUrl } from '@/lib/config'
import { setIntroPlayed } from '@/lib/introSession'
import styles from '../home/siteIntro.module.css'

const DESKTOP_VIDEO = 'loader-video/ghost-rental-desktop-video.mp4'
const MOBILE_VIDEO = 'loader-video/ghost-rental-mobile-video.mp4'
const POSTER_DESKTOP = 'loader-video/luxury-car-and-yacht-services.webp'
const POSTER_MOBILE = 'loader-video/rent-car-yacht-services-in-dubai.webp'
const AUTO_PLAY_DELAY_MS = 5000
const FADE_OUT_MS = 1000

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.innerWidth >= 992
}

function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 992 : true))

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 992px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}

function getActiveVideo(desktop: HTMLVideoElement | null, mobile: HTMLVideoElement | null) {
  return isDesktopViewport() ? desktop : mobile
}

function playWhenReady(video: HTMLVideoElement): Promise<void> {
  video.muted = true
  video.playsInline = true

  const startPlayback = () =>
    video.play().catch(() => {
      /* Retry once when the browser has enough buffered data */
      return new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay)
          void video.play().then(resolve).catch(reject)
        }
        video.addEventListener('canplay', onCanPlay)
      })
    })

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return startPlayback()
  }

  return new Promise<void>((resolve, reject) => {
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady)
      void startPlayback().then(resolve).catch(reject)
    }
    video.addEventListener('loadeddata', onReady)
  })
}

type IntroVideoOverlayProps = {
  onFinished: () => void
}

export function IntroVideoOverlay({ onFinished }: IntroVideoOverlayProps) {
  const isDesktop = useIsDesktopLayout()
  const desktopRef = useRef<HTMLVideoElement>(null)
  const mobileRef = useRef<HTMLVideoElement>(null)
  const playRetryRef = useRef(0)

  const [introVisible, setIntroVisible] = useState(true)
  const [thumbnailVisible, setThumbnailVisible] = useState(true)
  const [videoStarted, setVideoStarted] = useState(false)

  const hasUserInteractedRef = useRef(false)
  const videoStartedRef = useRef(false)
  const autoPlayTimerRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)

  const posterDesktop = toAssetUrl(POSTER_DESKTOP)
  const posterMobile = toAssetUrl(POSTER_MOBILE)
  const desktopSrc = toAssetUrl(DESKTOP_VIDEO)
  const mobileSrc = toAssetUrl(MOBILE_VIDEO)

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current !== null) {
      window.clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
  }, [])

  const finishIntro = useCallback(() => {
    setIntroPlayed()
    setIntroVisible(false)
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current)
    }
    finishTimerRef.current = window.setTimeout(() => {
      onFinished()
      finishTimerRef.current = null
    }, FADE_OUT_MS)
  }, [onFinished])

  /* Nudge the active video to buffer as soon as the overlay mounts */
  useEffect(() => {
    const video = isDesktop ? desktopRef.current : mobileRef.current
    if (!video || video.readyState > 0) return
    video.load()
  }, [isDesktop, desktopSrc, mobileSrc])

  const attemptPlayVideo = useCallback(() => {
    const tryPlay = () => {
      const video = getActiveVideo(desktopRef.current, mobileRef.current)
      if (!video) {
        if (playRetryRef.current < 8) {
          playRetryRef.current += 1
          requestAnimationFrame(tryPlay)
        } else {
          finishIntro()
        }
        return
      }
      playRetryRef.current = 0
      void playWhenReady(video).catch(() => finishIntro())
    }
    tryPlay()
  }, [finishIntro])

  const playVideo = useCallback(() => {
    if (videoStartedRef.current) return
    videoStartedRef.current = true
    hasUserInteractedRef.current = true
    setVideoStarted(true)
    setThumbnailVisible(false)
    clearAutoPlayTimer()
    attemptPlayVideo()
  }, [attemptPlayVideo, clearAutoPlayTimer])

  useEffect(() => {
    autoPlayTimerRef.current = window.setTimeout(() => {
      if (!hasUserInteractedRef.current && !videoStartedRef.current) {
        playVideo()
      }
    }, AUTO_PLAY_DELAY_MS)

    return () => {
      clearAutoPlayTimer()
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current)
      }
    }
  }, [clearAutoPlayTimer, playVideo])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'enter' || key === 'return') {
        event.preventDefault()
        clearAutoPlayTimer()
        playVideo()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [clearAutoPlayTimer, playVideo])

  return (
    <div
      id='intro-overlay'
      className={`${styles.intro} ${!introVisible ? styles.introFadeOut : ''}`}
      role='dialog'
      aria-label='Ghost Rentals intro'
    >
      {thumbnailVisible && !videoStarted && (
        <button type='button' className={styles.posterWrap} onClick={playVideo} aria-label='Play intro video'>
          <picture>
            <source media='(min-width: 992px)' srcSet={posterDesktop} type='image/webp' />
            <source media='(max-width: 991px)' srcSet={posterMobile} type='image/webp' />
            <img src={posterDesktop} alt='Ghost Rentals luxury car and yacht services' className={styles.poster} loading='eager' />
          </picture>
        </button>
      )}

      <video
        ref={desktopRef}
        className={`${styles.video} ${styles.desktopOnly}`}
        src={desktopSrc}
        muted
        playsInline
        preload={isDesktop ? 'auto' : 'none'}
        poster={posterDesktop}
        onEnded={finishIntro}
      />
      <video
        ref={mobileRef}
        className={`${styles.video} ${styles.mobileOnly}`}
        src={mobileSrc}
        muted
        playsInline
        preload={isDesktop ? 'none' : 'auto'}
        poster={posterMobile}
        onEnded={finishIntro}
      />

      <footer className={`${styles.introFooter} ${videoStarted ? styles.introFooterFadeOut : ''}`} aria-hidden={videoStarted}>
        <p className={styles.introFooterLead}>BOOK YOUR LUXURY EXPERIENCE TODAY</p>
        <br />
        <p className={styles.introFooterServices}>RENT CARS | CHARTER YACHTS | HIRE CHAUFFEUR</p>
        <p>LUXURY CONCIERGE SERVICES</p>
      </footer>
    </div>
  )
}
