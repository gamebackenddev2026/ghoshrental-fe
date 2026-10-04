'use client'

import { useEffect, useState } from 'react'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'

type CardSlideImageProps = {
  src: string
  alt: string
  title: string
  className: string
  priority?: boolean
  onSettled?: () => void
}

/** Vehicle card slide — Next.js Image with production CDN / placeholder fallbacks. */
export function CardSlideImage({ src, alt, title, className, priority, onSettled }: CardSlideImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  return (
    <OptimizedImage
      src={currentSrc}
      fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
      alt={alt}
      title={title}
      className={className}
      fill
      sizes={IMAGE_SIZES.cardThumb}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={onSettled}
      onError={() => {
        if (currentSrc !== VEHICLE_PLACEHOLDER_SRC) {
          setCurrentSrc(VEHICLE_PLACEHOLDER_SRC)
          return
        }
        onSettled?.()
      }}
    />
  )
}
