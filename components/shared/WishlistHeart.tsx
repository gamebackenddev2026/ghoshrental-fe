'use client'

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { addNewWishlist, removeWishlistItem } from '@/lib/api/product'
import { AUTH_CHANGED_EVENT, AUTH_TOKEN_KEY } from '@/lib/authToken'
import { useWishlist } from '@/lib/wishlist-context'
import { toAssetUrl } from '@/lib/config'
import { showWishlistToast, WISHLIST_LOGIN_MESSAGE } from '@/lib/wishlist-toast'
import styles from '@/components/home/homeSections.module.css'

export function WishlistHeart({
  className,
  iconClassName,
  itemKey,
  initialWishlist = false,
}: {
  className?: string
  iconClassName?: string
  /** Vehicle id (`_id`) — when it changes, re-sync `initialWishlist` from the list */
  itemKey?: string
  initialWishlist?: boolean
}) {
  const { ids, isWishlisted, add, remove } = useWishlist()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const fillSrc = toAssetUrl('images/heart_icon/heart_active.svg')
  const lineSrc = toAssetUrl('images/heart_icon/heart_inactive.svg')

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)))
    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth)
    }
  }, [])

  const active = itemKey
    ? ids !== null
      ? isWishlisted(itemKey)
      : isLoggedIn && initialWishlist
    : false

  const handleToggle = async (event: MouseEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!itemKey || isUpdating) return

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      showWishlistToast(WISHLIST_LOGIN_MESSAGE)
      event.currentTarget.blur()
      return
    }

    const nextActive = !active
    if (nextActive) add(itemKey)
    else remove(itemKey)
    setIsUpdating(true)

    try {
      if (nextActive) {
        await addNewWishlist({ id: itemKey, token })
      } else {
        await removeWishlistItem({ id: itemKey, token })
      }
    } catch {
      if (nextActive) remove(itemKey)
      else add(itemKey)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <a
      className={[
        styles.heartBox,
        className,
        styles.wishlistIcon,
        isLoggedIn && active ? styles.heartActive : styles.heartInactive,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={isLoggedIn && active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isLoggedIn && active}
      aria-busy={isUpdating}
      role='button'
      tabIndex={0}
      onClick={(e) => void handleToggle(e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          void handleToggle(e)
        }
      }}
    >
      <span className={[styles.heartStack, iconClassName].filter(Boolean).join(' ')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lineSrc} alt='' className={styles.heartBase} draggable={false} aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fillSrc} alt='' className={styles.heartFill} draggable={false} aria-hidden />
      </span>
    </a>
  )
}
