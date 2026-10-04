'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './productSearch.module.css'

export type PriceDualRangeSliderProps = {
  ceil: number
  lo: number
  hi: number
  step: number
  onValuesChange: (lo: number, hi: number) => void
}

/**
 * Two-thumb price range without overlapping native <input type="range"> layers
 * (the max input was stacked above the min and swallowed all pointer events).
 */
export function PriceDualRangeSlider({ ceil, lo, hi, step, onValuesChange }: PriceDualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  const floor = 0
  const span = Math.max(ceil - floor, 1)
  const clampedLo = Math.min(Math.max(lo, floor), ceil)
  const clampedHi = Math.min(Math.max(hi, floor), ceil)
  const loV = Math.min(clampedLo, clampedHi)
  const hiV = Math.max(clampedLo, clampedHi)

  const pct = (v: number) => ((Math.min(Math.max(v, floor), ceil) - floor) / span) * 100

  const setFromClientX = useCallback(
    (clientX: number, which: 'min' | 'max') => {
      const el = trackRef.current
      if (!el || ceil <= 0) return
      const r = el.getBoundingClientRect()
      let t = (clientX - r.left) / r.width
      t = Math.max(0, Math.min(1, t))
      const raw = floor + t * span
      const snapped = Math.round(raw / step) * step
      const v = Math.max(floor, Math.min(ceil, snapped))
      if (which === 'min') {
        const nextMin = Math.min(v, hiV)
        onValuesChange(nextMin, hiV)
      } else {
        const nextMax = Math.max(v, loV)
        onValuesChange(loV, nextMax)
      }
    },
    [ceil, floor, onValuesChange, span, step, hiV, loV]
  )

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => setFromClientX(e.clientX, dragging)
    const up = () => setDragging(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, setFromClientX])

  if (ceil <= 0) return null

  const leftPct = pct(loV)
  const widthPct = Math.max(pct(hiV) - leftPct, 0)

  return (
    <div className={styles.rangeSliderWrap}>
      <div className={styles.rangeTrack} />
      <div
        className={styles.rangeSelected}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
      <div ref={trackRef} className={styles.pricePointerTrack}>
        <button
          type='button'
          aria-label='Minimum price'
          className={styles.pricePointerThumb}
          style={{ left: `${pct(loV)}%` }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setDragging('min')
          }}
        />
        <button
          type='button'
          aria-label='Maximum price'
          className={styles.pricePointerThumb}
          style={{ left: `${pct(hiV)}%` }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setDragging('max')
          }}
        />
      </div>
    </div>
  )
}
