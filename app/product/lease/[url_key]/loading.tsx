'use client'

import { useEffect } from 'react'
import styles from './loading.module.css'

export default function LeaseDetailLoading() {
  // Scroll to top the instant the loading skeleton mounts
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])
  return (
    <div className={styles.wrap}>
      <div className={styles.container}>
        {/* Left column — gallery + info */}
        <div className={styles.left}>
          <div className={`${styles.block} ${styles.gallery}`} />
          <div className={`${styles.block} ${styles.titleRow}`} />
          <div className={`${styles.block} ${styles.subtitle}`} />
          <div className={styles.chips}>
            <div className={`${styles.block} ${styles.chip}`} />
            <div className={`${styles.block} ${styles.chip}`} />
            <div className={`${styles.block} ${styles.chip}`} />
          </div>
          <div className={`${styles.block} ${styles.desc}`} />
          <div className={`${styles.block} ${styles.descShort}`} />
        </div>

        {/* Right column — pricing card */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={`${styles.block} ${styles.priceLine}`} />
            <div className={`${styles.block} ${styles.priceLineSm}`} />
            <div className={`${styles.block} ${styles.btn}`} />
            <div className={`${styles.block} ${styles.btn}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
