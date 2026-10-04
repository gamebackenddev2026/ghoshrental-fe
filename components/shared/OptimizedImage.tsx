'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { isOptimizableImageSrc } from '@/lib/imageOptimization'

type OptimizedImageProps = {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  loading?: 'eager' | 'lazy'
  title?: string
  onLoad?: () => void
  onError?: () => void
}

/** Next.js Image with plain `<img>` fallback for SVG / unlisted hosts. */
export function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  loading,
  title,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [useNative, setUseNative] = useState(() => !isOptimizableImageSrc(src))

  useEffect(() => {
    setCurrentSrc(src)
    setUseNative(!isOptimizableImageSrc(src))
  }, [src])

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      const next = fallbackSrc
      setCurrentSrc(next)
      setUseNative(!isOptimizableImageSrc(next))
      return
    }
    if (!useNative && isOptimizableImageSrc(currentSrc)) {
      setUseNative(true)
      return
    }
    onError?.()
  }

  const nativeLoading = priority ? 'eager' : loading ?? 'lazy'
  const useNextImage = !useNative && isOptimizableImageSrc(currentSrc) && (fill || (width != null && height != null))

  if (!useNextImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={currentSrc}
        alt={alt}
        title={title}
        className={className}
        width={width}
        height={height}
        loading={nativeLoading}
        decoding='async'
        fetchPriority={priority ? 'high' : undefined}
        onLoad={onLoad}
        onError={handleError}
      />
    )
  }

  if (fill) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        title={title}
        fill
        className={className}
        sizes={sizes ?? '100vw'}
        priority={priority}
        onLoad={onLoad}
        onError={handleError}
      />
    )
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      title={title}
      className={className}
      width={width!}
      height={height!}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      onLoad={onLoad}
      onError={handleError}
    />
  )
}
