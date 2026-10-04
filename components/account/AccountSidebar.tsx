'use client'

import Link from 'next/link'
import styles from './account-sidebar.module.css'

export function getInitials(first: string, last: string): string {
  const a = first.trim().charAt(0).toUpperCase()
  const b = last.trim().charAt(0).toUpperCase()
  return a || b ? `${a}${b}` : '?'
}

type Props = {
  initials: string
  displayName: string
  email?: string
  activePage: 'profile' | 'wishlist' | 'change-password' | 'business-profile' | 'referral'
  accountType?: string
  onSignOut: () => void
}

export function AccountSidebar({ initials, displayName, email, activePage, accountType, onSignOut }: Props) {
  const isB2B = accountType === 'b2b'
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarProfile}>
        <div className={styles.avatarCircle} aria-hidden>
          {initials}
        </div>
        <p className={styles.sidebarName}>{displayName}</p>
        {email ? <p className={styles.sidebarEmail}>{email}</p> : null}
      </div>

      <nav className={styles.sideNav}>
        <Link href='/account/edit-profile' className={`${styles.sideItem} ${activePage === 'profile' ? styles.active : ''}`}>
          <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
            <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
            <circle cx='12' cy='7' r='4' />
          </svg>
          My Profile
        </Link>

        <div className={styles.sideNavDivider} />

        <Link href='/account/wishlist' className={`${styles.sideItem} ${activePage === 'wishlist' ? styles.active : ''}`}>
          <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
            <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
          </svg>
          Wishlist
        </Link>

        <div className={styles.sideNavDivider} />

        <Link href='/account/referral' className={`${styles.sideItem} ${activePage === 'referral' ? styles.active : ''}`}>
          <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
            <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
            <circle cx='9' cy='7' r='4' />
            <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
            <path d='M16 3.13a4 4 0 0 1 0 7.75' />
          </svg>
          Referrals
        </Link>

        {isB2B ? (
          <>
            <div className={styles.sideNavDivider} />
            <Link
              href='/account/business-profile'
              className={`${styles.sideItem} ${activePage === 'business-profile' ? styles.active : ''}`}
            >
              <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                <path d='M3 21h18' />
                <path d='M5 21V7l7-4 7 4v14' />
                <path d='M9 21v-6h6v6' />
              </svg>
              Business Account
            </Link>
          </>
        ) : null}

        <div className={styles.sideNavDivider} />

        <Link href='/account/change-password' className={`${styles.sideItem} ${activePage === 'change-password' ? styles.active : ''}`}>
          <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
            <path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          Change Password
        </Link>

        <div className={styles.sideNavDivider} />

        <button type='button' className={styles.sideItemButton} onClick={onSignOut}>
          <svg className={styles.sideNavIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
            <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
            <polyline points='16 17 21 12 16 7' />
            <line x1='21' y1='12' x2='9' y2='12' />
          </svg>
          Sign Out
        </button>
      </nav>
    </aside>
  )
}
