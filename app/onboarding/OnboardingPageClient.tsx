'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { completeB2CRegistration, upgradeToBusinessAccount } from '@/lib/api/auth'
import { applyReferralCode, ensureReferralCode } from '@/lib/api/referral'
import { uploadCustomerDocument } from '@/lib/upload/customerDocument'
import { persistAuthSession } from '@/lib/authSession'
import { POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY } from '@/lib/config'
import { takePendingReferralCode } from '@/lib/referral'
import {
  getCompanyAddressValidationError,
  getCompanyNameValidationError,
  getCompanyWebsiteValidationError,
  getContactPersonValidationError,
  getCountryValidationError,
  getNameValidationError,
  getPhoneValidationError,
  getTradeLicenseNumberValidationError,
  getVatNumberValidationError
} from '@/lib/auth/validation'
import { FileField } from '../auth/register/RegisterPageClient'
import styles from '../auth/register/register.module.css'

type Phase = 'chooser' | 'b2c-info' | 'b2c-docs' | 'b2b-info' | 'b2b-docs' | 'b2b-pending'

type StoredCustomer = {
  _id?: string
  firstname?: string
  lastname?: string
  email?: string
}

type B2cFormErrors = {
  firstName?: string
  lastName?: string
  phone?: string
  country?: string
}

type B2bFormErrors = {
  companyName?: string
  tradeLicenseNumber?: string
  vatNumber?: string
  companyWebsite?: string
  companyAddress?: string
  companyCountry?: string
  contactPerson?: string
  contactPhone?: string
}

export function OnboardingPageClient() {
  const [token, setToken] = useState('')
  const [next, setNext] = useState('/')
  const [phase, setPhase] = useState<Phase>('chooser')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [b2cInfoTouched, setB2cInfoTouched] = useState(false)
  const [b2bInfoTouched, setB2bInfoTouched] = useState(false)

  // B2C fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [driversLicense, setDriversLicense] = useState<File | null>(null)
  const [passport, setPassport] = useState<File | null>(null)
  const [emiratesId, setEmiratesId] = useState<File | null>(null)

  // B2B fields
  const [companyName, setCompanyName] = useState('')
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<File | null>(null)
  const [companyRegistrationDoc, setCompanyRegistrationDoc] = useState<File | null>(null)
  const [vatCertificateDoc, setVatCertificateDoc] = useState<File | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userToken = localStorage.getItem('ghostrentals-web-token') ?? ''
    const customerRaw = localStorage.getItem('customer')
    if (!userToken || !customerRaw) {
      window.location.href = '/auth/login'
      return
    }

    let parsedCustomer: StoredCustomer = {}
    try {
      parsedCustomer = JSON.parse(customerRaw) as StoredCustomer
    } catch {
      window.location.href = '/auth/login'
      return
    }

    setToken(userToken)
    setNext(sessionStorage.getItem(POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY) || '/')
    setFirstName(parsedCustomer.firstname ?? '')
    setLastName(parsedCustomer.lastname ?? '')
  }, [])

  const b2cInfoErrors: B2cFormErrors = useMemo(() => {
    const next: B2cFormErrors = {}
    const firstNameError = getNameValidationError(firstName, 'First name')
    if (firstNameError) next.firstName = firstNameError
    const lastNameError = getNameValidationError(lastName, 'Last name')
    if (lastNameError) next.lastName = lastNameError
    const phoneError = getPhoneValidationError(phone, 'Phone number')
    if (phoneError) next.phone = phoneError
    const countryError = getCountryValidationError(country)
    if (countryError) next.country = countryError
    return next
  }, [country, firstName, lastName, phone])

  const b2cInfoValid = Object.keys(b2cInfoErrors).length === 0

  const b2bInfoErrors: B2bFormErrors = useMemo(() => {
    const next: B2bFormErrors = {}
    const companyNameError = getCompanyNameValidationError(companyName)
    if (companyNameError) next.companyName = companyNameError
    const tradeLicenseError = getTradeLicenseNumberValidationError(tradeLicenseNumber)
    if (tradeLicenseError) next.tradeLicenseNumber = tradeLicenseError
    const vatNumberError = getVatNumberValidationError(vatNumber)
    if (vatNumberError) next.vatNumber = vatNumberError
    const companyWebsiteError = getCompanyWebsiteValidationError(companyWebsite)
    if (companyWebsiteError) next.companyWebsite = companyWebsiteError
    const companyAddressError = getCompanyAddressValidationError(companyAddress)
    if (companyAddressError) next.companyAddress = companyAddressError
    const companyCountryError = getCountryValidationError(companyCountry)
    if (companyCountryError) next.companyCountry = companyCountryError
    const contactPersonError = getContactPersonValidationError(contactPerson)
    if (contactPersonError) next.contactPerson = contactPersonError
    const contactPhoneError = getPhoneValidationError(contactPhone, 'Contact phone')
    if (contactPhoneError) next.contactPhone = contactPhoneError
    return next
  }, [companyAddress, companyCountry, companyName, companyWebsite, contactPerson, contactPhone, tradeLicenseNumber, vatNumber])

  const b2bInfoValid = Object.keys(b2bInfoErrors).length === 0

  const goToNext = () => {
    sessionStorage.removeItem(POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY)
    window.location.href = next
  }

  /** Apply pending referral (OAuth signup fallback) and ensure the user has a shareable code. */
  const finalizeReferral = async (userToken: string) => {
    const pendingCode = takePendingReferralCode()
    if (pendingCode) {
      try {
        await applyReferralCode(pendingCode, userToken)
      } catch {
        // Invalid / already-applied codes must not block onboarding.
      }
    }
    try {
      await ensureReferralCode(userToken)
    } catch {
      // Code generation can happen later from the account referral page.
    }
  }

  const submitB2C = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!b2cInfoValid) {
      setB2cInfoTouched(true)
      setPhase('b2c-info')
      return
    }
    if (!driversLicense) {
      setError("Driver's license is required.")
      return
    }

    try {
      setIsSubmitting(true)
      const documents: Array<{ type: string; file_name: string }> = []

      const license = await uploadCustomerDocument(driversLicense, 'drivers_license')
      documents.push({ type: license.type, file_name: license.file_name })

      if (passport) {
        const uploaded = await uploadCustomerDocument(passport, 'passport')
        documents.push({ type: uploaded.type, file_name: uploaded.file_name })
      }
      if (emiratesId) {
        const uploaded = await uploadCustomerDocument(emiratesId, 'emirates_id')
        documents.push({ type: uploaded.type, file_name: uploaded.file_name })
      }

      const response = await completeB2CRegistration(
        {
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          mobile: phone.trim(),
          country: country.trim(),
          documents
        },
        token
      )

      if (response.code === 200) {
        persistAuthSession(token, (response.result ?? {}) as Record<string, unknown>)
        await finalizeReferral(token)
        goToNext()
        return
      }
      setError(response.message || 'Unable to complete registration.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete registration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitB2B = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!b2bInfoValid) {
      setB2bInfoTouched(true)
      setPhase('b2b-info')
      return
    }
    if (!tradeLicenseDoc) {
      setError('Trade license document is required.')
      return
    }

    try {
      setIsSubmitting(true)
      const documents: Array<{ type: string; file_name: string }> = []

      const license = await uploadCustomerDocument(tradeLicenseDoc, 'trade_license')
      documents.push({ type: license.type, file_name: license.file_name })

      if (companyRegistrationDoc) {
        const uploaded = await uploadCustomerDocument(companyRegistrationDoc, 'company_registration')
        documents.push({ type: uploaded.type, file_name: uploaded.file_name })
      }
      if (vatCertificateDoc) {
        const uploaded = await uploadCustomerDocument(vatCertificateDoc, 'vat_certificate')
        documents.push({ type: uploaded.type, file_name: uploaded.file_name })
      }

      const response = await upgradeToBusinessAccount(
        {
          company_name: companyName.trim(),
          country: companyCountry.trim(),
          trade_license_number: tradeLicenseNumber.trim(),
          vat_number: vatNumber.trim(),
          company_website: companyWebsite.trim(),
          company_address: companyAddress.trim(),
          contact_person: contactPerson.trim(),
          contact_phone: contactPhone.trim(),
          documents
        },
        token
      )

      if (response.code === 200) {
        const customerRaw = localStorage.getItem('customer')
        let parsedCustomer: StoredCustomer = {}
        try {
          parsedCustomer = customerRaw ? (JSON.parse(customerRaw) as StoredCustomer) : {}
        } catch {
          parsedCustomer = {}
        }
        localStorage.setItem('customer', JSON.stringify({ ...parsedCustomer, ...response.result }))
        window.dispatchEvent(new Event('storage'))
        await finalizeReferral(token)
        setPhase('b2b-pending')
        return
      }
      setError(response.message || 'Unable to submit business application.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit business application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headingWrap}>
          <h1 className={styles.heading}>Welcome to Ghost Rentals</h1>
          <p className={styles.subheading}>One last step to finish setting up your account.</p>
        </div>

        <div className={styles.formBlock}>
          {error ? <p className={styles.errorBanner}>{error}</p> : null}

          {phase === 'chooser' ? (
            <fieldset className={styles.accountToggle}>
              <legend className={styles.srOnly}>Account type</legend>
              <label className={styles.toggleOption} onClick={() => setPhase('b2c-info')}>
                <span>Individual</span>
                {/* <small>2.5% off</small> */}
              </label>
              <label className={styles.toggleOption} onClick={() => setPhase('b2b-info')}>
                <span>Business</span>
                {/* <small>20% off</small> */}
              </label>
            </fieldset>
          ) : null}

          {phase === 'b2c-info' ? (
            <div>
              <div className={styles.progress}>
                <span className={styles.progressActive}>Details</span>
                <span className={styles.progressLine} />
                <span>Documents</span>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-firstname' className={styles.label}>
                    First Name
                  </label>
                  <input id='ob-firstname' className={styles.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  {b2cInfoTouched && b2cInfoErrors.firstName ? <p className={styles.fieldError}>{b2cInfoErrors.firstName}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-lastname' className={styles.label}>
                    Last Name
                  </label>
                  <input id='ob-lastname' className={styles.input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  {b2cInfoTouched && b2cInfoErrors.lastName ? <p className={styles.fieldError}>{b2cInfoErrors.lastName}</p> : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor='ob-phone' className={styles.label}>
                  Phone
                </label>
                <input
                  id='ob-phone'
                  type='tel'
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='+971 ...'
                />
                {b2cInfoTouched && b2cInfoErrors.phone ? <p className={styles.fieldError}>{b2cInfoErrors.phone}</p> : null}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor='ob-country' className={styles.label}>
                  Country
                </label>
                <input
                  id='ob-country'
                  className={styles.input}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder='e.g. UAE'
                />
                {b2cInfoTouched && b2cInfoErrors.country ? <p className={styles.fieldError}>{b2cInfoErrors.country}</p> : null}
              </div>

              <div className={styles.stepActions}>
                <button
                  type='button'
                  className={styles.submit}
                  onClick={() => {
                    setB2cInfoTouched(true)
                    if (b2cInfoValid) setPhase('b2c-docs')
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'b2c-docs' ? (
            <form onSubmit={submitB2C} noValidate>
              <div className={styles.progress}>
                <span className={styles.progressDone}>Details</span>
                <span className={styles.progressLine} />
                <span className={styles.progressActive}>Documents</span>
              </div>

              <p className={styles.docHint}>Upload your driver&apos;s license (required). Passport and Emirates ID are optional.</p>

              <FileField id='ob-drivers-license' label="Driver's License" file={driversLicense} onChange={setDriversLicense} />
              <FileField id='ob-passport' label='Passport (optional)' file={passport} onChange={setPassport} />
              <FileField id='ob-emirates-id' label='Emirates ID (optional)' file={emiratesId} onChange={setEmiratesId} />

              <div className={styles.stepActions}>
                <button type='button' className={styles.backBtn} onClick={() => setPhase('b2c-info')} disabled={isSubmitting}>
                  Back
                </button>
                <button type='submit' className={styles.submit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Finish'}
                </button>
              </div>
            </form>
          ) : null}

          {phase === 'b2b-info' ? (
            <div>
              <div className={styles.progress}>
                <span className={styles.progressActive}>Business Info</span>
                <span className={styles.progressLine} />
                <span>Documents</span>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-company-name' className={styles.label}>
                    Company Name
                  </label>
                  <input
                    id='ob-company-name'
                    className={styles.input}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  {b2bInfoTouched && b2bInfoErrors.companyName ? <p className={styles.fieldError}>{b2bInfoErrors.companyName}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-trade-license-number' className={styles.label}>
                    Trade License Number
                  </label>
                  <input
                    id='ob-trade-license-number'
                    className={styles.input}
                    value={tradeLicenseNumber}
                    onChange={(e) => setTradeLicenseNumber(e.target.value)}
                  />
                  {b2bInfoTouched && b2bInfoErrors.tradeLicenseNumber ? (
                    <p className={styles.fieldError}>{b2bInfoErrors.tradeLicenseNumber}</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-vat-number' className={styles.label}>
                    VAT Number
                  </label>
                  <input
                    id='ob-vat-number'
                    className={styles.input}
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder='15-digit TRN'
                  />
                  {b2bInfoTouched && b2bInfoErrors.vatNumber ? <p className={styles.fieldError}>{b2bInfoErrors.vatNumber}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-company-website' className={styles.label}>
                    Company Website (optional)
                  </label>
                  <input
                    id='ob-company-website'
                    className={styles.input}
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder='https://...'
                  />
                  {b2bInfoTouched && b2bInfoErrors.companyWebsite ? (
                    <p className={styles.fieldError}>{b2bInfoErrors.companyWebsite}</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor='ob-company-address' className={styles.label}>
                  Company Address
                </label>
                <input
                  id='ob-company-address'
                  className={styles.input}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
                {b2bInfoTouched && b2bInfoErrors.companyAddress ? (
                  <p className={styles.fieldError}>{b2bInfoErrors.companyAddress}</p>
                ) : null}
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-company-country' className={styles.label}>
                    Country
                  </label>
                  <input
                    id='ob-company-country'
                    className={styles.input}
                    value={companyCountry}
                    onChange={(e) => setCompanyCountry(e.target.value)}
                    placeholder='e.g. UAE'
                  />
                  {b2bInfoTouched && b2bInfoErrors.companyCountry ? (
                    <p className={styles.fieldError}>{b2bInfoErrors.companyCountry}</p>
                  ) : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='ob-contact-person' className={styles.label}>
                    Contact Person
                  </label>
                  <input
                    id='ob-contact-person'
                    className={styles.input}
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                  {b2bInfoTouched && b2bInfoErrors.contactPerson ? (
                    <p className={styles.fieldError}>{b2bInfoErrors.contactPerson}</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor='ob-contact-phone' className={styles.label}>
                  Contact Phone
                </label>
                <input
                  id='ob-contact-phone'
                  type='tel'
                  className={styles.input}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder='+971 ...'
                />
                {b2bInfoTouched && b2bInfoErrors.contactPhone ? <p className={styles.fieldError}>{b2bInfoErrors.contactPhone}</p> : null}
              </div>

              <div className={styles.stepActions}>
                <button
                  type='button'
                  className={styles.submit}
                  onClick={() => {
                    setB2bInfoTouched(true)
                    if (b2bInfoValid) setPhase('b2b-docs')
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'b2b-docs' ? (
            <form onSubmit={submitB2B} noValidate>
              <div className={styles.progress}>
                <span className={styles.progressDone}>Business Info</span>
                <span className={styles.progressLine} />
                <span className={styles.progressActive}>Documents</span>
              </div>

              <p className={styles.docHint}>
                Upload your Trade License (required). Company Registration Certificate and VAT Certificate are optional.
              </p>

              <FileField id='ob-trade-license-doc' label='Trade License' file={tradeLicenseDoc} onChange={setTradeLicenseDoc} />
              <FileField
                id='ob-company-registration-doc'
                label='Company Registration Certificate (optional)'
                file={companyRegistrationDoc}
                onChange={setCompanyRegistrationDoc}
              />
              <FileField
                id='ob-vat-certificate-doc'
                label='VAT Certificate (optional)'
                file={vatCertificateDoc}
                onChange={setVatCertificateDoc}
              />

              <div className={styles.stepActions}>
                <button type='button' className={styles.backBtn} onClick={() => setPhase('b2b-info')} disabled={isSubmitting}>
                  Back
                </button>
                <button type='submit' className={styles.submit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          ) : null}

          {phase === 'b2b-pending' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <h2 className={styles.heading} style={{ fontSize: '1.5rem' }}>
                Registration Received
              </h2>
              <p className={styles.subheading}>
                We&apos;ll verify your business documents and activate your account shortly. You&apos;ll be notified by email once approved.
              </p>
              <div className={styles.stepActions} style={{ marginTop: '1.25rem' }}>
                <button type='button' className={styles.submit} onClick={goToNext}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
