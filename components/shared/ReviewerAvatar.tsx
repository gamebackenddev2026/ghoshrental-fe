'use client'

import { useEffect, useMemo, useState } from 'react'
import { uiAvatarUrl } from '@/lib/googleReviewMedia'

type ReviewerAvatarProps = {
  name: string
  src?: string
  className?: string
  width?: number
  height?: number
}

export function ReviewerAvatar({
  name,
  src,
  className,
  width = 50,
  height = 50,
}: ReviewerAvatarProps) {
  const fallback = useMemo(() => uiAvatarUrl(name), [name])
  const [imgSrc, setImgSrc] = useState(() => src?.trim() || fallback)

  useEffect(() => {
    setImgSrc(src?.trim() || fallback)
  }, [src, fallback])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={name}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (imgSrc !== fallback) setImgSrc(fallback)
      }}
    />
  )
}
