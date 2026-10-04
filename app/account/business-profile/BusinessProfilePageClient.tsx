'use client'

import { FormEvent, useEffect, useState } from 'react'
import { getFrontCustomerData, upgradeToBusinessAccount } from '@/lib/api/auth'
import { uploadCustomerDocument } from '@/lib/upload/customerDocument'
import { getCompanyNameValidationError } from '@/lib/auth/validation'
import { AccountSidebar, getInitials } from '@/components/account/AccountSidebar'
import editProfileStyles from '../edit-profile/edit-profile.module.css'
import styles from './business-profile.module.css'

type AccountType = 'b2b' | 'b2c'
type VerificationStatus = 'pending' | 'approved' | 'rejected' | undefined

type StoredCustomer = {
  _id?: string
  firstname?: string
  lastname?: string
  email?: string
  account_type?: AccountType
  verification_status?: VerificationStatus
  company_name?: string
  discount_percent?: number | string
}

export function BusinessProfilePageClient() {
  const [token, setToken] = useState('')
  const [customer, setCustomer] = useState<StoredCustomer>({})
  const [isLoading, setIsLoading] = useState(true)

  const [companyName, setCompanyName] = useState('')
  const [companyDocument, setCompanyDocument] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    setCustomer(parsedCustomer)
    setCompanyName(parsedCustomer.company_name ?? '')

    const hydrate = async () => {
      if (!id) {
        setIsLoading(false)
        return
      }
      try {
        const response = await getFrontCustomerData({ customer_id: id }, userToken)
        const result = response.result ?? {}
        const merged: StoredCustomer = {
          ...parsedCustomer,
          account_type: (result.account_type as AccountType) ?? parsedCustomer.account_type,
          verification_status: (result.verification_status as VerificationStatus) ?? parsedCustomer.verification_status,
          company_name: (result.company_name as string) ?? parsedCustomer.company_name,
          discount_percent: (result.discount_percent as number) ?? parsedCustomer.discount_percent
        }
        setCustomer(merged)
        setCompanyName(merged.company_name ?? '')
        localStorage.setItem('customer', JSON.stringify({ ...parsedCustomer, ...merged }))
      } catch {
        // Keep localStorage fallback data if fetch fails.
      } finally {
        setIsLoading(false)
      }
    }

    void hydrate()
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    const companyNameError = getCompanyNameValidationError(companyName)
    if (companyNameError) {
      setError(companyNameError)
      return
    }
    if (!companyDocument) {
      setError('Please upload a company document (trade license, registration, or VAT certificate).')
      return
    }

    try {
      setIsSubmitting(true)
      const uploaded = await uploadCustomerDocument(companyDocument, 'trade_license')
      const response = await upgradeToBusinessAccount(
        {
          company_name: companyName.trim(),
          documents: [{ type: uploaded.type, file_name: uploaded.file_name }]
        },
        token
      )

      if (response.code === 200) {
        const updated: StoredCustomer = {
          ...customer,
          account_type: 'b2b',
          verification_status: 'pending',
          company_name: companyName.trim(),
          discount_percent: response.discount_percent
        }
        setCustomer(updated)
        localStorage.setItem('customer', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
        setMessage(response.message || 'Business upgrade submitted for review.')
        return
      }
      setError(response.message || 'Unable to submit business upgrade.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit business upgrade.')
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
  const displayName = [customer.firstname, customer.lastname].filter(Boolean).join(' ') || 'Guest'
  const showForm = isLoading || customer.account_type !== 'b2b' || customer.verification_status === 'rejected'

  return (
    <section className={editProfileStyles.section}>
      <div className={editProfileStyles.container}>
        <AccountSidebar
          initials={initials}
          displayName={displayName}
          email={customer.email}
          activePage='business-profile'
          accountType={customer.account_type}
          onSignOut={onSignOut}
        />

        <main className={editProfileStyles.content}>
          <div className={editProfileStyles.pageHeader}>
            <div>
              <h1 className={editProfileStyles.title}>Business Account</h1>
              <p className={editProfileStyles.subtitle}>Upgrade to a Business account for preferential pricing</p>
            </div>
          </div>

          <div className={editProfileStyles.card}>
            <div className={editProfileStyles.cardHeader}>
              <p className={editProfileStyles.cardTitle}>{customer.account_type === 'b2b' ? 'Business Details' : 'Upgrade to Business'}</p>
            </div>
            <div className={editProfileStyles.cardBody}>
              {message ? <p className={editProfileStyles.success}>{message}</p> : null}
              {error ? <p className={editProfileStyles.error}>{error}</p> : null}

              {isLoading ? (
                <p>Loading...</p>
              ) : customer.account_type === 'b2b' && customer.verification_status === 'approved' ? (
                <div className={styles.statusCard}>
                  <span className={`${styles.badge} ${styles.badgeApproved}`}>Verified Business</span>
                  <p>
                    <strong>{customer.company_name}</strong> is an active Business account.
                  </p>
                  <p className={styles.statusHint}>You&apos;re receiving 20% preferential pricing on all bookings.</p>
                </div>
              ) : customer.account_type === 'b2b' && customer.verification_status === 'pending' ? (
                <div className={styles.statusCard}>
                  <span className={`${styles.badge} ${styles.badgePending}`}>Pending Verification</span>
                  <p>
                    We&apos;re reviewing the documents for <strong>{customer.company_name}</strong>.
                  </p>
                  <p className={styles.statusHint}>You&apos;ll be notified by email once your Business account is approved.</p>
                </div>
              ) : null}

              {!isLoading && customer.account_type === 'b2b' && customer.verification_status === 'rejected' ? (
                <div className={styles.statusCard}>
                  <span className={`${styles.badge} ${styles.badgeRejected}`}>Verification Rejected</span>
                  <p>Your previous Business upgrade request wasn&apos;t approved. You can resubmit below.</p>
                </div>
              ) : null}

              {showForm && !isLoading ? (
                <form onSubmit={onSubmit}>
                  <div className={editProfileStyles.fieldGroup}>
                    <label htmlFor='company-name' className={editProfileStyles.label}>
                      Company Name <span className={editProfileStyles.required}>*</span>
                    </label>
                    <input
                      id='company-name'
                      className={editProfileStyles.input}
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder='Enter company name'
                    />
                  </div>

                  <div className={editProfileStyles.fieldGroup}>
                    <label htmlFor='company-document' className={editProfileStyles.label}>
                      Company Document <span className={editProfileStyles.required}>*</span>
                    </label>
                    <div className={styles.fileRow}>
                      <label htmlFor='company-document' className={styles.fileBtn}>
                        {companyDocument ? 'Change file' : 'Upload file'}
                      </label>
                      <span className={styles.fileName}>
                        {companyDocument ? companyDocument.name : 'Trade license, company registration, or VAT certificate'}
                      </span>
                      <input
                        id='company-document'
                        type='file'
                        className={styles.fileInputHidden}
                        accept='.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        onChange={(event) => setCompanyDocument(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <div className={editProfileStyles.formFooter}>
                    <button type='submit' className={editProfileStyles.submit} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
