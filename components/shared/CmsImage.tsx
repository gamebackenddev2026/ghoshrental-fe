'use client'

import { useEffect, useMemo, useState } from 'react'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { toAssetUrl } from '@/lib/config'

type CmsImageProps = {
  src: string
  fallbackAsset: string
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
  decoding?: 'async' | 'auto' | 'sync'
  title?: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
}

function normalizeImageSrc(src: string, fallbackAsset: string): string {
  const trimmed = src.trim()
  if (!trimmed) return toAssetUrl(fallbackAsset)
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed
  return toAssetUrl(trimmed)
}

/** CMS image with fallback to a bundled asset when the upload URL fails. */
export function CmsImage({
  src,
  fallbackAsset,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  title,
  width,
  height,
  fill,
  sizes,
}: CmsImageProps) {
  const fallbackSrc = toAssetUrl(fallbackAsset)
  const normalizedSrc = useMemo(() => normalizeImageSrc(src, fallbackAsset), [src, fallbackAsset])
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc || fallbackSrc)

  useEffect(() => {
    setCurrentSrc(normalizedSrc || fallbackSrc)
  }, [normalizedSrc, fallbackSrc])

  return (
    <OptimizedImage
      src={currentSrc}
      fallbackSrc={fallbackSrc}
      alt={alt}
      title={title}
      className={className}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      priority={fetchPriority === 'high' || loading === 'eager'}
      loading={loading}
    />
  )
}
