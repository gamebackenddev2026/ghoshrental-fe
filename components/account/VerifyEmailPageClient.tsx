'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { activeAccount } from '@/lib/api/auth'
import { persistAuthSession } from '@/lib/authSession'
import styles from '@/app/account/verify-email/[activeLink]/verify-email.module.css'

type Status = 'loading' | 'error'

export function VerifyEmailPageClient() {
  const params = useParams<{ activeLink: string }>()
  const activeLink = params?.activeLink ?? ''
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!activeLink) {
      setStatus('error')
      setErrorMessage('Invalid verification link.')
      return
    }

    let cancelled = false

    activeAccount({ activeLink })
      .then((response) => {
        if (cancelled) return
        if (response.code === 200) {
          const token = response.token ?? ((response.result as Record<string, unknown> | null)?.token as string | undefined)
          const customerData = (response.result as Record<string, unknown> | null) ?? {}

          if (token) {
            // Google/Apple accounts have no password to type in — log them in
            // directly instead of sending them to the password form.
            persistAuthSession(token, customerData as Record<string, unknown>)
            window.location.replace('/')
            return
          }
          window.location.replace('/auth/login?verified=true')
        } else {
          setStatus('error')
          setErrorMessage(response.message || 'Verification failed. The link may have expired.')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Unable to verify your email. Please try again.'
        setStatus('error')
        setErrorMessage(msg)
      })

    return () => {
      cancelled = true
    }
  }, [activeLink])

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {status === 'loading' && (
          <div className={styles.card}>
            <div className={styles.spinner} />
            <p className={styles.message}>Verifying your email address...</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.card}>
            <div className={styles.iconWrap}>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} className={styles.errorIcon} aria-hidden>
                <circle cx='12' cy='12' r='10' />
                <path d='m15 9-6 6M9 9l6 6' />
              </svg>
            </div>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <div className={styles.actions}>
              <Link href='/auth/register' className={styles.btn}>
                Register Again
              </Link>
              <Link href='/auth/login' className={styles.btnOutline}>
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
