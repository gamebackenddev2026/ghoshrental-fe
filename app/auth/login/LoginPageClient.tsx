'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginCustomer } from '@/lib/api/auth'
import { persistAuthSession } from '@/lib/authSession'
import { useSocialLogin } from '@/lib/useSocialLogin'
import { toAssetUrl } from '@/lib/config'
import styles from './login.module.css'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function resolveReturnUrl(rawReturnUrl: string | null): string {
  if (!rawReturnUrl) return '/'
  let decoded = rawReturnUrl
  try { decoded = decodeURIComponent(rawReturnUrl) } catch { decoded = rawReturnUrl }
  if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
  return '/'
}

type FormErrors = { email?: string; password?: string }

export function LoginPageClient() {
  const searchParams = useSearchParams()
  const returnUrl = useMemo(() => resolveReturnUrl(searchParams.get('returnUrl')), [searchParams])
  const passwordResetSuccess = searchParams.get('reset') === 'success'
  const emailVerified = searchParams.get('verified') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

  const { handleGoogleLogin, handleAppleLogin, socialLoading, appleReady, socialError } = useSocialLogin(returnUrl)

  const errors: FormErrors = useMemo(() => {
    if (!submitted) return {}
    const nextErrors: FormErrors = {}
    const trimmedEmail = email.trim()
    if (!trimmedEmail) nextErrors.email = 'Please enter email address'
    else if (!isValidEmail(trimmedEmail)) nextErrors.email = 'Please enter a valid email address'
    if (!password) nextErrors.password = 'Please enter password'
    return nextErrors
  }, [email, password, submitted])

  const hasErrors = Boolean(errors.email || errors.password)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setServerError('')
    setSuccessMessage('')
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password || !isValidEmail(trimmedEmail)) return
    try {
      setIsSubmitting(true)
      const response = await loginCustomer({ username: trimmedEmail, password })
      if (response.code === 200 && response.token) {
        persistAuthSession(response.token, (response.result ?? {}) as Record<string, unknown>)
        window.location.href = returnUrl || '/'
        return
      }
      setServerError(response.message || 'Unable to sign in. Please try again.')
    } catch {
      setServerError('Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headingWrap}>
          <h1 className={styles.heading}>Your Experience Awaits</h1>
          <p className={styles.subheading}>Sign in to access your bookings and exclusive services.</p>
        </div>

        <div className={styles.formBlock}>
          {emailVerified ? (
            <p className={styles.success}>Your email is verified. Sign in here to continue.</p>
          ) : null}
          {passwordResetSuccess ? (
            <p className={styles.success}>Password changed successfully. Please sign in.</p>
          ) : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
          {serverError ? <p className={styles.errorBanner}>{serverError}</p> : null}
          {socialError ? <p className={styles.errorBanner}>{socialError}</p> : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor='login-email' className={styles.label}>Email</label>
              <input
                id='login-email'
                type='email'
                className={styles.input}
                placeholder='Enter your email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete={rememberMe ? 'email' : 'off'}
              />
              {errors.email ? <p className={styles.fieldError}>{errors.email}</p> : null}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor='login-password' className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  id='login-password'
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={rememberMe ? 'current-password' : 'off'}
                />
                <button
                  type='button'
                  className={styles.eyeButton}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox='0 0 24 24' aria-hidden>
                      <path d='M2.2 3.6a.9.9 0 1 1 1.3-1.2l16.5 17.8a.9.9 0 1 1-1.3 1.2l-3.1-3.4a11.9 11.9 0 0 1-3.6.6c-4.7 0-8.4-2.8-10.5-6.7a1 1 0 0 1 0-.9A12.6 12.6 0 0 1 7.2 6L2.2 3.6Zm8.4 9a2.7 2.7 0 0 0 3 2.9L10.5 12a2.7 2.7 0 0 0 .1.6Zm1.4-8.2c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9a12.5 12.5 0 0 1-5.4 5.1l-1.4-1.5a10.8 10.8 0 0 0 4.9-4.1c-1.8-3-4.9-5.3-8.6-5.3-1 0-2 .2-3 .5L7.7 5.3a12 12 0 0 1 4.3-.8Zm-.3 3.1a4.4 4.4 0 0 1 4.4 4.3c0 .8-.2 1.5-.6 2.1L10 7.9c.6-.2 1.1-.4 1.7-.4Z' />
                    </svg>
                  ) : (
                    <svg viewBox='0 0 24 24' aria-hidden>
                      <path d='M12 5c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9-2.1 3.9-5.8 6.7-10.5 6.7S3.6 16.5 1.5 12.6a1 1 0 0 1 0-.9C3.6 7.8 7.3 5 12 5Zm0 1.8c-3.7 0-6.8 2.2-8.6 5.2 1.8 3 4.9 5.2 8.6 5.2s6.8-2.2 8.6-5.2c-1.8-3-4.9-5.2-8.6-5.2Zm0 2.2a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Zm0 1.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z' />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password ? <p className={styles.fieldError}>{errors.password}</p> : null}
            </div>

            <div className={styles.actionsRow}>
              <label className={styles.remember}>
                <input type='checkbox' checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Remember me</span>
              </label>
              <Link href='/account/forgot-password' className={styles.forgot}>Forgot your password?</Link>
            </div>

            <button type='submit' className={styles.submit} disabled={isSubmitting || hasErrors} data-text='Sign In?'>
              <span>{isSubmitting ? 'Signing In...' : 'Sign In?'}</span>
            </button>
          </form>

          <div className={styles.socialWrapper}>
            <p className={styles.socialDivider}><span>OR CONTINUE WITH</span></p>

            <div className={styles.socialButtons}>
              <button
                type='button'
                className={styles.socialButton}
                onClick={handleGoogleLogin}
                disabled={socialLoading !== null}
              >
                <img src={toAssetUrl('images/icons/google.svg')} alt='' aria-hidden='true' />
                <span>{socialLoading === 'google' ? 'Redirecting...' : 'Google'}</span>
              </button>

              <button
                type='button'
                className={`${styles.socialButton} ${styles.appleButton}`}
                onClick={handleAppleLogin}
                disabled={socialLoading !== null || !appleReady}
              >
                <img src={toAssetUrl('images/icons/apple-icons.svg')} alt='' aria-hidden='true' />
                <span>{socialLoading === 'apple' ? 'Redirecting...' : 'Apple'}</span>
              </button>
            </div>

            <p className={styles.registerText}>
              Don&apos;t have an account?{' '}
              <Link href='/auth/register' className={styles.registerLink}>Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
