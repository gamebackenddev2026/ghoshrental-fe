'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { consumeQueuedDiscountToast } from '@/lib/customerDiscount'
import { subscribeWishlistToast, WISHLIST_LOGIN_MESSAGE } from '@/lib/wishlist-toast'
import styles from './wishlistToast.module.css'

export function WishlistToast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const [loginHref, setLoginHref] = useState('/auth/login')

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined

    const showToast = (nextMessage: string) => {
      setMessage(nextMessage)
      if (nextMessage === WISHLIST_LOGIN_MESSAGE && typeof window !== 'undefined') {
        const returnUrl = `${window.location.pathname}${window.location.search}`
        setLoginHref(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      }
      setVisible(true)
      if (dismissTimer) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(() => setVisible(false), 3500)
    }

    const queuedDiscount = consumeQueuedDiscountToast()
    if (queuedDiscount) {
      setTimeout(() => showToast(queuedDiscount), 400)
    }

    const unsubscribe = subscribeWishlistToast(showToast)

    return () => {
      unsubscribe()
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [])

  const showLoginLink = message === WISHLIST_LOGIN_MESSAGE

  return (
    <div
      className={`${styles.toast} ${visible ? styles.toastVisible : ''}`}
      role='status'
      aria-live='polite'
      aria-hidden={!visible}
    >
      <p className={styles.copy}>
        <span>{message}</span>
        {showLoginLink ? (
          <>
            {' '}
            <Link href={loginHref} className={styles.loginLink}>
              Sign in
            </Link>
          </>
        ) : null}
      </p>
    </div>
  )
}
