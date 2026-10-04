'use client'

import { FormEvent, useMemo, useState } from 'react'
import { forgotCustomerPasswordLink } from '@/lib/api/auth'
import styles from './forgot-password.module.css'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const emailError = useMemo(() => {
    if (!submitted) return ''
    if (!email.trim()) return 'Please enter email address'
    if (!isValidEmail(email.trim())) return 'Please enter a valid email address'
    return ''
  }, [email, submitted])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setServerError('')
    setSuccessMessage('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) return

    try {
      setIsSubmitting(true)
      const response = await forgotCustomerPasswordLink({ email: trimmedEmail })
      if (response.code === 200) {
        setSuccessMessage('Check your email for reset link.')
        return
      }
      setServerError(response.message || 'Unable to send reset link. Please try again.')
    } catch {
      setServerError('Unable to send reset link. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headingWrap}>
          <p className={styles.title}>Enter your email to request a password</p>
        </div>

        <div className={styles.formBlock}>
          {successMessage ? <p className={styles.bannerSuccess}>{successMessage}</p> : null}
          {serverError ? <p className={styles.bannerError}>{serverError}</p> : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor='forgot-email' className={styles.label}>Email</label>
              <input
                id='forgot-email'
                type='email'
                className={styles.input}
                placeholder='Your Email Address'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {emailError ? <p className={styles.fieldError}>{emailError}</p> : null}
            </div>

            <button
              type='submit'
              className={styles.submit}
              disabled={isSubmitting}
              data-text='Send Link'
            >
              <span>{isSubmitting ? 'Sending...' : 'Send Link'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
