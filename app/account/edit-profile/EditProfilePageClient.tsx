'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { editProfileData, getFrontCustomerData } from '@/lib/api/auth'
import type { MyMembershipStatus } from '@/lib/api/membership'
import { MEMBERSHIP_CHANGED_EVENT, readStoredMembership, refreshMembershipStatus } from '@/lib/membershipStatus'
import { AccountSidebar, getInitials } from '@/components/account/AccountSidebar'
import styles from './edit-profile.module.css'

type StoredCustomer = {
  _id?: string
  firstname?: string
  lastname?: string
  email?: string
  phone?: string
  phone_number?: string
  dob?: string
  birthDate?: string
  nationality?: string
  address?: string
  account_type?: string
}

type ProfileForm = {
  firstname: string
  lastname: string
  email: string
  dob: string
  phone: string
  nationality: string
  address: string
}

const EMPTY_FORM: ProfileForm = {
  firstname: '',
  lastname: '',
  email: '',
  dob: '',
  phone: '',
  nationality: '',
  address: '',
}

function normalizeDate(value: string | undefined): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function formatRenewalDate(value: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatAed(amount: number): string {
  return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function billingLabel(interval: string): string {
  if (interval === 'yearly') return 'Yearly'
  if (interval === 'monthly') return 'Monthly'
  return ''
}


export function EditProfilePageClient() {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [customerId, setCustomerId] = useState('')
  const [accountType, setAccountType] = useState('')
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [membership, setMembership] = useState<MyMembershipStatus | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userToken = localStorage.getItem('ghostrentals-web-token') ?? ''
    const customerRaw = localStorage.getItem('customer')
    if (!userToken || !customerRaw) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      return
    }

    let parsedCustomer: StoredCustomer = {}
    try {
      parsedCustomer = JSON.parse(customerRaw) as StoredCustomer
    } catch {
      window.location.href = '/auth/login'
      return
    }

    const id = parsedCustomer._id ?? ''
    setToken(userToken)
    setCustomerId(id)
    setAccountType(parsedCustomer.account_type ?? '')
    setForm({
      firstname: parsedCustomer.firstname ?? '',
      lastname: parsedCustomer.lastname ?? '',
      email: parsedCustomer.email ?? '',
      dob: normalizeDate(parsedCustomer.birthDate ?? parsedCustomer.dob),
      phone: parsedCustomer.phone ?? parsedCustomer.phone_number ?? '',
      nationality: parsedCustomer.nationality ?? '',
      address: parsedCustomer.address ?? '',
    })

    const hydrateProfile = async () => {
      if (!id) {
        setIsLoading(false)
        return
      }
      try {
        const response = await getFrontCustomerData({ customer_id: id }, userToken)
        const result = response.result ?? {}
        setForm({
          firstname: String(result.firstname ?? parsedCustomer.firstname ?? ''),
          lastname: String(result.lastname ?? parsedCustomer.lastname ?? ''),
          email: String(result.email ?? parsedCustomer.email ?? ''),
          dob: normalizeDate(String(result.birthDate ?? result.dob ?? result.dateofbirth ?? parsedCustomer.birthDate ?? parsedCustomer.dob ?? '')),
          phone: String(result.phone ?? result.phone_number ?? result.mobile ?? parsedCustomer.phone ?? parsedCustomer.phone_number ?? ''),
          nationality: String(result.nationality ?? parsedCustomer.nationality ?? ''),
          address: String(result.address ?? parsedCustomer.address ?? ''),
        })
        if (result.account_type) setAccountType(String(result.account_type))
      } catch {
        // Keep localStorage fallback data if fetch fails.
      } finally {
        setIsLoading(false)
      }
    }

    void hydrateProfile()

    // Membership & points card — force a fresh fetch so we pick up the latest
    // my-auth shape (plan name, points balance, AED value).
    setMembership(readStoredMembership())
    void refreshMembershipStatus(userToken, { force: true }).then((status) => {
      if (status) setMembership(status)
    })
    const onMembershipChanged = () => setMembership(readStoredMembership())
    window.addEventListener(MEMBERSHIP_CHANGED_EVENT, onMembershipChanged)
    return () => window.removeEventListener(MEMBERSHIP_CHANGED_EVENT, onMembershipChanged)
  }, [])

  const canSubmit = useMemo(
    () => Boolean(form.firstname.trim() && form.lastname.trim() && form.email.trim() && token),
    [form.email, form.firstname, form.lastname, token],
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!canSubmit) {
      setError('Please fill first name, last name, and email.')
      return
    }
    if (!customerId) {
      setError('Unable to identify your account. Please sign out and sign in again.')
      return
    }
    try {
      setIsSubmitting(true)
      const response = await editProfileData(
        {
          customer_id: customerId,
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          dateofbirth: form.dob || undefined,
          mobile: form.phone.trim() || undefined,
          nationality: form.nationality.trim() || undefined,
          address: form.address.trim() || undefined,
        },
        token,
      )
      if (response.code === 200) {
        const existingRaw = localStorage.getItem('customer')
        let existingCustomer: Record<string, unknown> = {}
        try {
          existingCustomer = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {}
        } catch {
          existingCustomer = {}
        }
        const updatedCustomer = {
          ...existingCustomer,
          _id: customerId,
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          mobile: form.phone.trim(),
          nationality: form.nationality.trim(),
          address: form.address.trim(),
          birthDate: form.dob,
          dob: form.dob,
        }
        localStorage.setItem('customer', JSON.stringify(updatedCustomer))
        window.dispatchEvent(new Event('storage'))
        setMessage(response.message || 'Profile updated successfully.')
        return
      }
      setError(response.message || 'Unable to update profile.')
    } catch {
      setError('Unable to update profile.')
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

  const initials = getInitials(form.firstname, form.lastname)
  const displayName = [form.firstname, form.lastname].filter(Boolean).join(' ') || 'Guest'

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <AccountSidebar
          initials={initials}
          displayName={displayName}
          email={form.email}
          activePage='profile'
          accountType={accountType}
          onSignOut={onSignOut}
        />

        {/* ── Main content ── */}
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>My Profile</h1>
              <p className={styles.subtitle}>Manage your personal information</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Membership &amp; Points</p>
            </div>
            <div className={styles.cardBody}>
              {/* Same structure with or without an active subscription:
                  plan line on top, horizontal stats row below. */}
              <div className={styles.membershipRow}>
                <div className={styles.membershipPlan}>
                  {membership?.isMember ? (
                    <>
                      <span className={styles.membershipBadge}>
                        <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden>
                          <path d='M5 16 3 6l5 4 4-6 4 6 5-4-2 10H5Zm0 2h14v2H5v-2Z' />
                        </svg>
                        {membership.planName || membership.tier || 'Member'}
                      </span>
                      <p className={styles.membershipMeta}>
                        {[
                          billingLabel(membership.billingInterval),
                          membership.rentalDiscountPercent > 0 ? `${membership.rentalDiscountPercent}% off rentals` : '',
                          formatRenewalDate(membership.renewsAt) ? `Renews ${formatRenewalDate(membership.renewsAt)}` : ''
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Active membership'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={styles.membershipMeta}>
                        {membership && membership.points > 0
                          ? 'You have loyalty points but no active membership yet.'
                          : 'You are not subscribed to a membership plan yet.'}
                      </p>
                      <Link href='/membership' className={styles.membershipCta}>
                        Explore membership plans
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.membershipStats}>
                <div className={styles.membershipStat}>
                  <p className={styles.membershipPointsValue}>{(membership?.points ?? 0).toLocaleString('en-AE')}</p>
                  <p className={styles.membershipPointsLabel}>points balance</p>
                </div>
                <div className={styles.membershipStat}>
                  <p className={styles.membershipPointsValue}>{formatAed(membership?.pointsAedValue ?? 0)}</p>
                  <p className={styles.membershipPointsLabel}>points value</p>
                </div>
                {membership?.isMember && membership.rentalDiscountPercent > 0 ? (
                  <div className={styles.membershipStat}>
                    <p className={styles.membershipPointsValue}>{membership.rentalDiscountPercent}%</p>
                    <p className={styles.membershipPointsLabel}>rental discount</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Personal Information</p>
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

              {/* Avatar row */}
              <div className={styles.profileImageRow}>
                <div className={styles.profileThumb} aria-hidden>{initials}</div>
                <div className={styles.uploadHint}>
                  <p>Profile Photo</p>
                  <span>Avatar is based on your name initials</span>
                </div>
              </div>

              <form onSubmit={onSubmit}>
                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='firstname' className={styles.label}>
                      First Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      id='firstname'
                      className={styles.input}
                      value={form.firstname}
                      onChange={(event) => setForm((prev) => ({ ...prev, firstname: event.target.value }))}
                      disabled={isLoading}
                      placeholder='Enter first name'
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='lastname' className={styles.label}>
                      Last Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      id='lastname'
                      className={styles.input}
                      value={form.lastname}
                      onChange={(event) => setForm((prev) => ({ ...prev, lastname: event.target.value }))}
                      disabled={isLoading}
                      placeholder='Enter last name'
                    />
                  </div>
                </div>

                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='email' className={styles.label}>
                      Email <span className={styles.required}>*</span>
                    </label>
                    <input
                      id='email'
                      type='email'
                      className={styles.input}
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      disabled={isLoading}
                      placeholder='Enter email'
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='dob' className={styles.label}>Date of Birth</label>
                    <input
                      id='dob'
                      type='date'
                      className={styles.input}
                      value={form.dob}
                      onChange={(event) => setForm((prev) => ({ ...prev, dob: event.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='phone' className={styles.label}>Phone Number</label>
                    <input
                      id='phone'
                      className={styles.input}
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      disabled={isLoading}
                      placeholder='+971'
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='nationality' className={styles.label}>Nationality</label>
                    <input
                      id='nationality'
                      className={styles.input}
                      value={form.nationality}
                      onChange={(event) => setForm((prev) => ({ ...prev, nationality: event.target.value }))}
                      disabled={isLoading}
                      placeholder='e.g. Indian'
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor='address' className={styles.label}>Address</label>
                  <textarea
                    id='address'
                    className={styles.textarea}
                    value={form.address}
                    onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                    disabled={isLoading}
                    placeholder='Enter your address'
                  />
                </div>

                <div className={styles.formFooter}>
                  <button type='submit' className={styles.submit} disabled={isSubmitting || !canSubmit || isLoading}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
