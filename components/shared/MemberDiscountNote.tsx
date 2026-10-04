'use client'

import { buildMemberDiscountLabel, formatDiscountPercent } from '@/lib/customerDiscount'
import styles from './memberDiscountNote.module.css'

export function MemberDiscountNote({
  percent,
  className,
  compact = false,
}: {
  percent: number
  className?: string
  compact?: boolean
}) {
  const label = compact
    ? `${formatDiscountPercent(percent)}% off`
    : buildMemberDiscountLabel(percent)

  return (
    <p className={[styles.note, compact ? styles.noteCompact : '', className].filter(Boolean).join(' ')} role='status'>
      {label}
    </p>
  )
}
