'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { changePassword } from '@/lib/api/auth'
import { AccountSidebar, getInitials } from '@/components/account/AccountSidebar'
import { getPasswordValidationError, PASSWORD_REQUIREMENTS_MESSAGE } from '@/lib/auth/password'
import styles from './change-password.module.css'

type StoredCustomer = {
  firstname?: string
  lastname?: string
  email?: string
  account_type?: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const EMPTY_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function PasswordEyeButton({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type='button'
      className={styles.eyeButton}
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
        <svg viewBox='0 0 24 24' aria-hidden>
          <path d='M2.2 3.6a.9.9 0 1 1 1.3-1.2l16.5 17.8a.9.9 0 1 1-1.3 1.2l-3.1-3.4a11.9 11.9 0 0 1-3.6.6c-4.7 0-8.4-2.8-10.5-6.7a1 1 0 0 1 0-.9A12.6 12.6 0 0 1 7.2 6L2.2 3.6Zm8.4 9a2.7 2.7 0 0 0 3 2.9L10.5 12a2.7 2.7 0 0 0 .1.6Zm1.4-8.2c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9a12.5 12.5 0 0 1-5.4 5.1l-1.4-1.5a10.8 10.8 0 0 0 4.9-4.1c-1.8-3-4.9-5.3-8.6-5.3-1 0-2 .2-3 .5L7.7 5.3a12 12 0 0 1 4.3-.8Zm-.3 3.1a4.4 4.4 0 0 1 4.4 4.3c0 .8-.2 1.5-.6 2.1L10 7.9c.6-.2 1.1-.4 1.7-.4Z' />
        </svg>
      ) : (
        <svg viewBox='0 0 24 24' aria-hidden>
          <path d='M12 5c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9-2.1 3.9-5.8 6.7-10.5 6.7S3.6 16.5 1.5 12.6a1 1 0 0 1 0-.9C3.6 7.8 7.3 5 12 5Zm0 1.8c-3.7 0-6.8 2.2-8.6 5.2 1.8 3 4.9 5.2 8.6 5.2s6.8-2.2 8.6-5.2c-1.8-3-4.9-5.2-8.6-5.2Zm0 2.2a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Zm0 1.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z' />
        </svg>
      )}
    </button>
  )
}

export function ChangePasswordPageClient() {
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM)
  const [customer, setCustomer] = useState<StoredCustomer>({})
  const [token, setToken] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userToken = localStorage.getItem('ghostrentals-web-token') ?? ''
    const customerRaw = localStorage.getItem('customer')
    if (!userToken || !customerRaw) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      return
    }

    setToken(userToken)
    try {
      setCustomer(JSON.parse(customerRaw) as StoredCustomer)
    } catch {
      window.location.href = '/auth/login'
    }
  }, [])

  const currentPasswordError = useMemo(() => {
    if (!submitted) return ''
    if (!form.currentPassword.trim()) return 'Current password is required'
    return ''
  }, [form.currentPassword, submitted])

  const newPasswordError = useMemo(() => {
    if (!submitted) return ''
    return getPasswordValidationError(form.newPassword) ?? ''
  }, [form.newPassword, submitted])

  const confirmPasswordError = useMemo(() => {
    if (!submitted) return ''
    if (!form.confirmPassword.trim()) return 'Please confirm your new password'
    if (form.confirmPassword !== form.newPassword) return 'Passwords must match'
    return ''
  }, [form.confirmPassword, form.newPassword, submitted])

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.currentPassword.trim() &&
          form.newPassword.trim() &&
          form.confirmPassword.trim() &&
          token,
      ),
    [form.confirmPassword, form.currentPassword, form.newPassword, token],
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setMessage('')
    setError('')

    if (currentPasswordError || newPasswordError || confirmPasswordError || !canSubmit) return

    try {
      setIsSubmitting(true)
      const response = await changePassword(
        {
          current_password: form.currentPassword,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        },
        token,
      )
      if (response.code === 200) {
        setForm(EMPTY_FORM)
        setSubmitted(false)
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
        setMessage(response.message || 'Password changed successfully.')
        return
      }
      setError(response.message || 'Unable to change password.')
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Unable to change password.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSignOut = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('ghostrentals-web-token')
    localStorage.removeItem('customer')
    localStorage.removeItem('guest')
    window.dispatchEvent(new Event('storage'))
    window.location.href = '/'
  }

  const initials = getInitials(customer.firstname ?? '', customer.lastname ?? '')
  const displayName =
    [customer.firstname, customer.lastname].filter(Boolean).join(' ') || 'Guest'

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <AccountSidebar
          initials={initials}
          displayName={displayName}
          email={customer.email}
          activePage='change-password'
          accountType={customer.account_type}
          onSignOut={onSignOut}
        />

        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>Change Password</h1>
              <p className={styles.subtitle}>Update your account password</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Security</p>
            </div>
            <div className={styles.cardBody}>
              {message ? (
                <p className={styles.success}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className={styles.error}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  {error}
                </p>
              ) : null}

              <form onSubmit={onSubmit} noValidate>
                <div className={styles.fieldGroup}>
                  <label htmlFor='current-password' className={styles.label}>
                    Current Password <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id='current-password'
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={styles.input}
                      value={form.currentPassword}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                      placeholder='Enter your current password'
                      autoComplete='current-password'
                    />
                    <PasswordEyeButton
                      visible={showCurrentPassword}
                      onToggle={() => setShowCurrentPassword((current) => !current)}
                    />
                  </div>
                  {currentPasswordError ? (
                    <p className={styles.fieldError}>{currentPasswordError}</p>
                  ) : null}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor='new-password' className={styles.label}>
                    New Password <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id='new-password'
                      type={showNewPassword ? 'text' : 'password'}
                      className={styles.input}
                      value={form.newPassword}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                      placeholder='Enter your new password'
                      autoComplete='new-password'
                    />
                    <PasswordEyeButton
                      visible={showNewPassword}
                      onToggle={() => setShowNewPassword((current) => !current)}
                    />
                  </div>
                  {newPasswordError ? (
                    <p className={styles.fieldError}>{newPasswordError}</p>
                  ) : (
                    <p className={styles.hint}>{PASSWORD_REQUIREMENTS_MESSAGE}</p>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor='confirm-password' className={styles.label}>
                    Confirm New Password <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id='confirm-password'
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={styles.input}
                      value={form.confirmPassword}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder='Re-enter your new password'
                      autoComplete='new-password'
                    />
                    <PasswordEyeButton
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                    />
                  </div>
                  {confirmPasswordError ? (
                    <p className={styles.fieldError}>{confirmPasswordError}</p>
                  ) : null}
                </div>

                <div className={styles.formFooter}>
                  <button type='submit' className={styles.submit} disabled={isSubmitting || !canSubmit}>
                    {isSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
