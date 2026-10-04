'use client'

import { useEffect, useMemo, useState } from 'react'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { resolveAssetWithProductionFallback } from '@/lib/googleReviewMedia'

type AssetImageWithFallbackProps = {
  path: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'eager' | 'lazy'
  title?: string
  sizes?: string
}

export function AssetImageWithFallback({
  path,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  title,
  sizes,
}: AssetImageWithFallbackProps) {
  const urls = useMemo(() => resolveAssetWithProductionFallback(path), [path])
  const [src, setSrc] = useState(urls.primary)

  useEffect(() => {
    setSrc(urls.primary)
  }, [urls.primary])

  return (
    <OptimizedImage
      src={src}
      fallbackSrc={urls.fallback}
      alt={alt}
      title={title}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      priority={loading === 'eager'}
      loading={loading}
    />
  )
}
