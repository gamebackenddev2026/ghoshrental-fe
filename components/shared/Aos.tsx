'use client'

import { useEffect, useState, type ElementType, type HTMLAttributes, type ReactNode } from 'react'
import { scheduleAosRefresh } from '@/lib/aos'

type AosProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  animation?: string
  delay?: number | string
  as?: ElementType
}

/** Applies `data-aos` only after mount so SSR and hydration markup stay identical. */
export function Aos({
  children,
  animation = 'fade-up',
  delay,
  className,
  as: Tag = 'div',
  ...rest
}: AosProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    scheduleAosRefresh()
  }, [mounted])

  const aosProps = mounted
    ? {
        'data-aos': animation,
        ...(delay !== undefined ? { 'data-aos-delay': String(delay) } : {}),
      }
    : {}

  return (
    <Tag className={className} {...aosProps} {...rest}>
      {children}
    </Tag>
  )
}
