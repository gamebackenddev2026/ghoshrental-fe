'use client'

import { useEffect, useMemo, useState } from 'react'
import { HeroSearchPanel } from './HeroSearchPanel'
import styles from './hero.module.css'
import { CmsBannerVideo } from '@/components/shared/CmsBannerVideo'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { HOME_HERO_POSTER_DESKTOP, HOME_HERO_POSTER_MOBILE, toAssetUrl } from '@/lib/config'

export type HeroBannerProp = {
  file_type: string
  src: string
  media_url?: string
  alt: string
  name?: string
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}

export function Hero({ banner }: { banner?: HeroBannerProp | null } = {}) {
  const isMobile = useMobileLayout()
  const heroPoster = isMobile
    ? toAssetUrl(HOME_HERO_POSTER_MOBILE)
    : toAssetUrl(HOME_HERO_POSTER_DESKTOP)

  const heroAlt = banner?.alt || 'Ghost Rentals Hero'
  const heroTitle = banner?.name || heroAlt

  const isImage = String(banner?.file_type ?? '').toLowerCase() === 'image' && !!banner?.media_url
  const imageSrc = isImage ? banner!.media_url! : null

  const videoSrc = useMemo(() => {
    if (!banner?.media_url) return ''
    const isVideo =
      String(banner.file_type ?? '').toLowerCase() === 'video' ||
      /\.(mp4|webm|ogg)(\?|$)/i.test(banner.media_url)
    if (!isVideo) return ''
    return banner.media_url.trim()
  }, [banner])

  return (
    <section className={`${styles.home} ${styles.bannerPadding}`}>
      <div className={styles.homeContainer}>
        <h1 className={styles.hiddenSeo}>Ghost Rentals Dubai</h1>
        <h2 className={styles.hiddenSeo}>Luxury Car and Yacht Rental Services</h2>
        <div className={styles.overlay} />

        {isImage && imageSrc ? (
          <OptimizedImage
            src={imageSrc}
            fallbackSrc={heroPoster}
            alt={heroAlt}
            title={heroTitle}
            className={`${styles.heroMedia} ${styles.border20}`}
            width={1920}
            height={1080}
            sizes={IMAGE_SIZES.hero}
            priority
            loading='eager'
          />
        ) : videoSrc ? (
          <CmsBannerVideo
            className={`${styles.heroMedia} ${styles.heroVideo} ${styles.border20} ${styles.csvideo}`}
            primarySrc={videoSrc}
            ariaLabel={heroAlt}
            preload='auto'
            fetchPriority='high'
          />
        ) : null}

        <div className={styles.searchWrapper}>
          <HeroSearchPanel />
        </div>
      </div>
    </section>
  )
}
