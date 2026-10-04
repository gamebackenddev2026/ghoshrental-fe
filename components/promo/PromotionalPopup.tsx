'use client'

import Link from 'next/link'
import type { ActivePromo } from '@/lib/api/adapters'
import styles from './promotionalPopup.module.css'

type PromotionalPopupProps = {
  promo: ActivePromo
  ctaHref: string
  onClose: () => void
}

export function PromotionalPopup({ promo, ctaHref, onClose }: PromotionalPopupProps) {
  return (
    <div className={styles.popup} role='dialog' aria-modal='true' aria-labelledby='promoTitle'>
      <div className={styles.header}>
        <div className={styles.overlay} aria-hidden='true' />
        {promo.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.bgImage}
            src={promo.image}
            alt=''
            width={500}
            height={280}
            loading='lazy'
            fetchPriority='low'
            decoding='async'
            role='presentation'
            aria-hidden='true'
          />
        ) : null}
        <button type='button' className={styles.closeButton} aria-label='Close promotional popup' onClick={onClose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src='/assets/images/icons/white-close.svg'
            alt=''
            width={16}
            height={16}
            loading='lazy'
            decoding='async'
            role='presentation'
            aria-hidden='true'
          />
        </button>
        <div className={styles.content}>
          <div className={styles.tagRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.tagIcon}
              src='/assets/images/icons/tag.svg'
              alt=''
              width={16}
              height={16}
              loading='lazy'
              decoding='async'
              role='presentation'
              aria-hidden='true'
            />
            <h2 id='promoTitle' className={`${styles.title} size14 redhat-semibold white-color`}>
              {promo.title}
            </h2>
          </div>
          {promo.subtitle ? <p className={`${styles.subtitle} size18 redhat-semibold white-color`}>{promo.subtitle}</p> : null}
          {/* <p className={`${styles.offerText} size28 redhat-semibold white-color capitalize`}>{promo.discount}% Off Your First Drive</p> */}
        </div>
      </div>
      <div className={styles.popupBody}>
        {promo.description ? (
          <div
            className={`${styles.description} size14 redhat-regular black-color`}
            dangerouslySetInnerHTML={{ __html: promo.description }}
          />
        ) : null}
        <Link href={ctaHref} className={`black-button size18 redhat-bold text-capitalize ${styles.cta}`} onClick={onClose}>
          <span aria-hidden='true'>{promo.buttonText}</span>
        </Link>
      </div>
    </div>
  )
}
