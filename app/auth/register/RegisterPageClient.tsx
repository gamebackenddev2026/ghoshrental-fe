'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getCustomerRegistrationMeta, registerCustomer } from '@/lib/api/auth'
import { getPasswordValidationError } from '@/lib/auth/password'
import {
  getCompanyAddressValidationError,
  getCompanyNameValidationError,
  getCompanyWebsiteValidationError,
  getContactPersonValidationError,
  getCountryValidationError,
  getEmailValidationError,
  getNameValidationError,
  getPhoneValidationError,
  getTradeLicenseNumberValidationError,
  getVatNumberValidationError
} from '@/lib/auth/validation'
import { useSocialLogin } from '@/lib/useSocialLogin'
import { uploadCustomerDocument } from '@/lib/upload/customerDocument'
import { toAssetUrl } from '@/lib/config'
import { normalizeReferralCode, storePendingReferralCode } from '@/lib/referral'
import styles from './register.module.css'

const DEFAULT_PROMO_TEXT = 'Unlock preferential pricing after registration'

type RegisterStep = 1 | 2
type AccountType = 'b2c' | 'b2b'

type FormErrors = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  country?: string
  password?: string
  confirmPassword?: string
  companyName?: string
  tradeLicenseNumber?: string
  vatNumber?: string
  companyWebsite?: string
  companyAddress?: string
  contactPerson?: string
  contactPhone?: string
  driversLicense?: string
  tradeLicenseDoc?: string
  agree?: string
}

type SuccessState = { kind: 'b2b-pending'; email: string } | { kind: 'verify-email'; email: string }

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox='0 0 24 24' aria-hidden>
        <path d='M2.2 3.6a.9.9 0 1 1 1.3-1.2l16.5 17.8a.9.9 0 1 1-1.3 1.2l-3.1-3.4a11.9 11.9 0 0 1-3.6.6c-4.7 0-8.4-2.8-10.5-6.7a1 1 0 0 1 0-.9A12.6 12.6 0 0 1 7.2 6L2.2 3.6Zm8.4 9a2.7 2.7 0 0 0 3 2.9L10.5 12a2.7 2.7 0 0 0 .1.6Zm1.4-8.2c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9a12.5 12.5 0 0 1-5.4 5.1l-1.4-1.5a10.8 10.8 0 0 0 4.9-4.1c-1.8-3-4.9-5.3-8.6-5.3-1 0-2 .2-3 .5L7.7 5.3a12 12 0 0 1 4.3-.8Zm-.3 3.1a4.4 4.4 0 0 1 4.4 4.3c0 .8-.2 1.5-.6 2.1L10 7.9c.6-.2 1.1-.4 1.7-.4Z' />
      </svg>
    )
  }
  return (
    <svg viewBox='0 0 24 24' aria-hidden>
      <path d='M12 5c4.7 0 8.4 2.8 10.5 6.7.2.3.2.7 0 .9-2.1 3.9-5.8 6.7-10.5 6.7S3.6 16.5 1.5 12.6a1 1 0 0 1 0-.9C3.6 7.8 7.3 5 12 5Zm0 1.8c-3.7 0-6.8 2.2-8.6 5.2 1.8 3 4.9 5.2 8.6 5.2s6.8-2.2 8.6-5.2c-1.8-3-4.9-5.2-8.6-5.2Zm0 2.2a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Zm0 1.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z' />
    </svg>
  )
}

export function FileField({
  id,
  label,
  file,
  error,
  onChange
}: {
  id: string
  label: string
  file: File | null
  error?: string
  onChange: (file: File | null) => void
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.fileRow}>
        <label htmlFor={id} className={styles.fileBtn}>
          {file ? 'Change' : 'Upload'}
        </label>
        <span className={styles.fileName}>{file ? file.name : 'JPG, PNG, PDF, or DOC'}</span>
        <input
          id={id}
          type='file'
          className={styles.fileInputHidden}
          accept='.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </div>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
}

export function RegisterPageClient() {
  const searchParams = useSearchParams()
  const initialReferralCode = normalizeReferralCode(
    searchParams.get('referral_code') || searchParams.get('ref') || searchParams.get('referral') || ''
  )
  const [step, setStep] = useState<RegisterStep>(1)
  const [accountType, setAccountType] = useState<AccountType>('b2c')
  const [promoText, setPromoText] = useState(DEFAULT_PROMO_TEXT)
  const [success, setSuccess] = useState<SuccessState | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [referralCode, setReferralCode] = useState(initialReferralCode)

  const [driversLicense, setDriversLicense] = useState<File | null>(null)
  const [passport, setPassport] = useState<File | null>(null)
  const [emiratesId, setEmiratesId] = useState<File | null>(null)
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<File | null>(null)
  const [companyRegistrationDoc, setCompanyRegistrationDoc] = useState<File | null>(null)
  const [vatCertificateDoc, setVatCertificateDoc] = useState<File | null>(null)

  const [step1Touched, setStep1Touched] = useState(false)
  const [step2Touched, setStep2Touched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const { handleGoogleLogin, handleAppleLogin, socialLoading, appleReady, socialError } = useSocialLogin('/')

  useEffect(() => {
    void getCustomerRegistrationMeta()
      .then((res) => {
        const text = res.result?.registration_promo_text?.trim()
        if (text) setPromoText(text)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    storePendingReferralCode(referralCode)
  }, [referralCode])

  const startGoogleLogin = () => {
    storePendingReferralCode(referralCode)
    handleGoogleLogin()
  }

  const startAppleLogin = () => {
    storePendingReferralCode(referralCode)
    handleAppleLogin()
  }

  const step1Errors: FormErrors = useMemo(() => {
    const next: FormErrors = {}

    const firstNameError = getNameValidationError(firstName, 'First name')
    if (firstNameError) next.firstName = firstNameError
    const lastNameError = getNameValidationError(lastName, 'Last name')
    if (lastNameError) next.lastName = lastNameError
    const emailError = getEmailValidationError(email)
    if (emailError) next.email = emailError
    const phoneError = getPhoneValidationError(phone, 'Phone number')
    if (phoneError) next.phone = phoneError
    const countryError = getCountryValidationError(country)
    if (countryError) next.country = countryError

    const passwordError = getPasswordValidationError(password)
    if (passwordError) next.password = passwordError
    if (!confirmPassword) next.confirmPassword = 'Confirm password is required'
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match'

    if (accountType === 'b2b') {
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
      const contactPersonError = getContactPersonValidationError(contactPerson)
      if (contactPersonError) next.contactPerson = contactPersonError
      const contactPhoneError = getPhoneValidationError(contactPhone, 'Contact phone')
      if (contactPhoneError) next.contactPhone = contactPhoneError
    }

    return next
  }, [
    accountType,
    companyAddress,
    companyName,
    companyWebsite,
    confirmPassword,
    contactPerson,
    contactPhone,
    country,
    email,
    firstName,
    lastName,
    password,
    phone,
    tradeLicenseNumber,
    vatNumber
  ])

  const step1Valid = useMemo(() => Object.keys(step1Errors).length === 0, [step1Errors])

  const errors: FormErrors = useMemo(() => {
    const next: FormErrors = {}

    if (step === 1 && step1Touched) {
      Object.assign(next, step1Errors)
    }

    if (step === 2 && step2Touched) {
      if (accountType === 'b2c' && !driversLicense) next.driversLicense = "Driver's license is required"
      if (accountType === 'b2b' && !tradeLicenseDoc) next.tradeLicenseDoc = 'Trade license document is required'
      if (!agree) next.agree = 'Please accept the terms and privacy policy'
    }

    return next
  }, [accountType, agree, driversLicense, step, step1Errors, step1Touched, step2Touched, tradeLicenseDoc])

  const handleAccountTypeChange = (next: AccountType) => {
    setAccountType(next)
    setDriversLicense(null)
    setPassport(null)
    setEmiratesId(null)
    setTradeLicenseDoc(null)
    setCompanyRegistrationDoc(null)
    setVatCertificateDoc(null)
    setServerError('')
  }

  const documentsStepValid = accountType === 'b2c' ? Boolean(driversLicense) : Boolean(tradeLicenseDoc)

  const goToDocuments = () => {
    setStep1Touched(true)
    setServerError('')
    if (!step1Valid) return
    setStep(2)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStep2Touched(true)
    setServerError('')

    if (!step1Valid || !documentsStepValid || !agree) return

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    try {
      setIsSubmitting(true)

      const documents: Array<{ type: string; file_name: string }> = []

      if (accountType === 'b2c') {
        if (driversLicense) {
          const uploaded = await uploadCustomerDocument(driversLicense, 'drivers_license')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
        if (passport) {
          const uploaded = await uploadCustomerDocument(passport, 'passport')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
        if (emiratesId) {
          const uploaded = await uploadCustomerDocument(emiratesId, 'emirates_id')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
      } else {
        if (tradeLicenseDoc) {
          const uploaded = await uploadCustomerDocument(tradeLicenseDoc, 'trade_license')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
        if (companyRegistrationDoc) {
          const uploaded = await uploadCustomerDocument(companyRegistrationDoc, 'company_registration')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
        if (vatCertificateDoc) {
          const uploaded = await uploadCustomerDocument(vatCertificateDoc, 'vat_certificate')
          documents.push({ type: uploaded.type, file_name: uploaded.file_name })
        }
      }

      const normalizedReferral = normalizeReferralCode(referralCode)

      const response = await registerCustomer({
        username: `${trimmedFirstName} ${trimmedLastName}`,
        firstname: trimmedFirstName,
        lastname: trimmedLastName,
        email: trimmedEmail,
        password,
        confirmPassword,
        account_type: accountType,
        phone: trimmedPhone,
        country: country.trim(),
        company_name: accountType === 'b2b' ? companyName.trim() : undefined,
        trade_license_number: accountType === 'b2b' ? tradeLicenseNumber.trim() : undefined,
        vat_number: accountType === 'b2b' ? vatNumber.trim() : undefined,
        company_website: accountType === 'b2b' ? companyWebsite.trim() : undefined,
        company_address: accountType === 'b2b' ? companyAddress.trim() : undefined,
        contact_person: accountType === 'b2b' ? contactPerson.trim() : undefined,
        contact_phone: accountType === 'b2b' ? contactPhone.trim() : undefined,
        documents,
        ...(normalizedReferral ? { referral_code: normalizedReferral } : {})
      })

      if (response.code >= 200 && response.code < 300) {
        storePendingReferralCode('')
        if (accountType === 'b2b') {
          setSuccess({ kind: 'b2b-pending', email: trimmedEmail })
          return
        }

        setSuccess({ kind: 'verify-email', email: trimmedEmail })
        return
      }

      setServerError(response.message || 'Unable to create account. Please try again.')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success?.kind === 'b2b-pending') {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.headingWrap}>
            <h1 className={styles.heading}>Welcome To Ghost Rentals</h1>
            <p className={styles.subheading}>One last step to finish setting up your account.</p>
          </div>
          <div className={styles.formBlock}>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <h2 className={styles.heading} style={{ fontSize: '1.5rem' }}>
                Registration Received
              </h2>
              <p className={styles.subheading}>
                We&apos;ll verify your business documents and activate your account shortly. You&apos;ll be notified by email at{' '}
                <strong>{success.email}</strong> once approved, and you&apos;ll be able to sign in from there.
              </p>
              <div className={styles.stepActions} style={{ marginTop: '1.25rem' }}>
                <Link href='/' className={styles.submit}>
                  Continue
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (success?.kind === 'verify-email') {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.headingWrap}>
            <h1 className={styles.heading}>Check Your Email</h1>
            <p className={styles.subheading}>
              We sent a verification link to <strong>{success.email}</strong>.
            </p>
          </div>
          <div className={styles.formBlock} style={{ textAlign: 'center', padding: '2rem' }}>
            <Link href='/auth/login' className={styles.registerLink}>
              Already verified? Sign In
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headingWrap}>
          <h1 className={styles.heading}>Create Account</h1>
          <p className={styles.subheading}>{promoText}</p>
        </div>

        <div className={styles.formBlock}>
          <div className={styles.progress}>
            <span className={step === 1 ? styles.progressActive : styles.progressDone}>Details</span>
            <span className={styles.progressLine} />
            <span className={step === 2 ? styles.progressActive : ''}>Documents</span>
          </div>

          {serverError ? <p className={styles.errorBanner}>{serverError}</p> : null}
          {socialError ? <p className={styles.errorBanner}>{socialError}</p> : null}

          {step === 1 ? (
            <div>
              <fieldset className={styles.accountToggle}>
                <legend className={styles.srOnly}>Account type</legend>
                <label className={`${styles.toggleOption} ${accountType === 'b2c' ? styles.toggleActive : ''}`}>
                  <input
                    type='radio'
                    name='account-type'
                    value='b2c'
                    checked={accountType === 'b2c'}
                    onChange={() => handleAccountTypeChange('b2c')}
                  />
                  <span>Individual</span>
                  {/* <small>2.5% off</small> */}
                </label>
                <label className={`${styles.toggleOption} ${accountType === 'b2b' ? styles.toggleActive : ''}`}>
                  <input
                    type='radio'
                    name='account-type'
                    value='b2b'
                    checked={accountType === 'b2b'}
                    onChange={() => handleAccountTypeChange('b2b')}
                  />
                  <span>Business</span>
                  {/* <small>20% off</small> */}
                </label>
              </fieldset>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-firstname' className={styles.label}>
                    First Name
                  </label>
                  <input
                    id='register-firstname'
                    className={styles.input}
                    placeholder='First name'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete='given-name'
                  />
                  {errors.firstName ? <p className={styles.fieldError}>{errors.firstName}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-lastname' className={styles.label}>
                    Last Name
                  </label>
                  <input
                    id='register-lastname'
                    className={styles.input}
                    placeholder='Last name'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete='family-name'
                  />
                  {errors.lastName ? <p className={styles.fieldError}>{errors.lastName}</p> : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor='register-email' className={styles.label}>
                  Email
                </label>
                <input
                  id='register-email'
                  type='email'
                  className={styles.input}
                  placeholder='you@email.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete='email'
                />
                {errors.email ? <p className={styles.fieldError}>{errors.email}</p> : null}
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-phone' className={styles.label}>
                    Phone
                  </label>
                  <input
                    id='register-phone'
                    type='tel'
                    className={styles.input}
                    placeholder='+971 ...'
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete='tel'
                  />
                  {errors.phone ? <p className={styles.fieldError}>{errors.phone}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-country' className={styles.label}>
                    Country
                  </label>
                  <input
                    id='register-country'
                    className={styles.input}
                    placeholder='e.g. UAE'
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    autoComplete='country-name'
                  />
                  {errors.country ? <p className={styles.fieldError}>{errors.country}</p> : null}
                </div>
              </div>

              {accountType === 'b2b' ? (
                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-company' className={styles.label}>
                      Company
                    </label>
                    <input
                      id='register-company'
                      className={styles.input}
                      placeholder='Company name'
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    {errors.companyName ? <p className={styles.fieldError}>{errors.companyName}</p> : null}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-trade-license' className={styles.label}>
                      Trade License Number
                    </label>
                    <input
                      id='register-trade-license'
                      className={styles.input}
                      placeholder='License number'
                      value={tradeLicenseNumber}
                      onChange={(e) => setTradeLicenseNumber(e.target.value)}
                    />
                    {errors.tradeLicenseNumber ? <p className={styles.fieldError}>{errors.tradeLicenseNumber}</p> : null}
                  </div>
                </div>
              ) : null}

              {accountType === 'b2b' ? (
                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-vat-number' className={styles.label}>
                      VAT Number
                    </label>
                    <input
                      id='register-vat-number'
                      className={styles.input}
                      placeholder='15-digit TRN'
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                    />
                    {errors.vatNumber ? <p className={styles.fieldError}>{errors.vatNumber}</p> : null}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-company-website' className={styles.label}>
                      Company Website (optional)
                    </label>
                    <input
                      id='register-company-website'
                      className={styles.input}
                      placeholder='https://...'
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                    />
                    {errors.companyWebsite ? <p className={styles.fieldError}>{errors.companyWebsite}</p> : null}
                  </div>
                </div>
              ) : null}

              {accountType === 'b2b' ? (
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-company-address' className={styles.label}>
                    Company Address
                  </label>
                  <input
                    id='register-company-address'
                    className={styles.input}
                    placeholder='Company address'
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                  {errors.companyAddress ? <p className={styles.fieldError}>{errors.companyAddress}</p> : null}
                </div>
              ) : null}

              {accountType === 'b2b' ? (
                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-contact-person' className={styles.label}>
                      Contact Person
                    </label>
                    <input
                      id='register-contact-person'
                      className={styles.input}
                      placeholder='Contact person'
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                    {errors.contactPerson ? <p className={styles.fieldError}>{errors.contactPerson}</p> : null}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor='register-contact-phone' className={styles.label}>
                      Contact Phone
                    </label>
                    <input
                      id='register-contact-phone'
                      type='tel'
                      className={styles.input}
                      placeholder='+971 ...'
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                    {errors.contactPhone ? <p className={styles.fieldError}>{errors.contactPhone}</p> : null}
                  </div>
                </div>
              ) : null}

              <div className={styles.fieldGroup}>
                <label htmlFor='register-referral' className={styles.label}>
                  Referral Code (optional)
                </label>
                <input
                  id='register-referral'
                  className={styles.input}
                  placeholder='e.g. AB12CD34'
                  value={referralCode}
                  onChange={(e) => setReferralCode(normalizeReferralCode(e.target.value))}
                  autoComplete='off'
                  spellCheck={false}
                />
              </div>

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-password' className={styles.label}>
                    Password
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id='register-password'
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder='Password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete='new-password'
                    />
                    <button
                      type='button'
                      className={styles.eyeButton}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon hidden={showPassword} />
                    </button>
                  </div>
                  {errors.password ? <p className={styles.fieldError}>{errors.password}</p> : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor='register-confirm' className={styles.label}>
                    Confirm
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id='register-confirm'
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder='Confirm password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete='new-password'
                    />
                    <button
                      type='button'
                      className={styles.eyeButton}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      <EyeIcon hidden={showConfirmPassword} />
                    </button>
                  </div>
                  {errors.confirmPassword ? <p className={styles.fieldError}>{errors.confirmPassword}</p> : null}
                </div>
              </div>

              <button type='button' className={styles.submit} onClick={goToDocuments}>
                Next
              </button>

              {accountType === 'b2c' ? (
                <div className={styles.socialWrapper}>
                  <p className={styles.socialDivider}>
                    <span>OR</span>
                  </p>
                  <div className={styles.socialButtons}>
                    <button type='button' className={styles.socialButton} onClick={startGoogleLogin} disabled={socialLoading !== null}>
                      <img src={toAssetUrl('images/icons/google.svg')} alt='' aria-hidden='true' />
                      <span>{socialLoading === 'google' ? '...' : 'Google'}</span>
                    </button>
                    <button
                      type='button'
                      className={`${styles.socialButton} ${styles.appleButton}`}
                      onClick={startAppleLogin}
                      disabled={socialLoading !== null || !appleReady}
                    >
                      <img src={toAssetUrl('images/icons/apple-icons.svg')} alt='' aria-hidden='true' />
                      <span>{socialLoading === 'apple' ? '...' : 'Apple'}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {accountType === 'b2c' ? (
                <>
                  <p className={styles.docHint}>Upload your driver&apos;s license (required). Passport and Emirates ID are optional.</p>
                  <FileField
                    id='register-drivers-license'
                    label="Driver's License"
                    file={driversLicense}
                    error={errors.driversLicense}
                    onChange={setDriversLicense}
                  />
                  <FileField id='register-passport' label='Passport (optional)' file={passport} onChange={setPassport} />
                  <FileField id='register-emirates-id' label='Emirates ID (optional)' file={emiratesId} onChange={setEmiratesId} />
                </>
              ) : (
                <>
                  <p className={styles.docHint}>
                    Upload your Trade License (required). Company Registration Certificate and VAT Certificate are optional.
                  </p>
                  <FileField
                    id='register-trade-license-doc'
                    label='Trade License'
                    file={tradeLicenseDoc}
                    error={errors.tradeLicenseDoc}
                    onChange={setTradeLicenseDoc}
                  />
                  <FileField
                    id='register-company-registration-doc'
                    label='Company Registration Certificate (optional)'
                    file={companyRegistrationDoc}
                    onChange={setCompanyRegistrationDoc}
                  />
                  <FileField
                    id='register-vat-certificate-doc'
                    label='VAT Certificate (optional)'
                    file={vatCertificateDoc}
                    onChange={setVatCertificateDoc}
                  />
                </>
              )}

              <div className={styles.termsRow}>
                <label className={styles.terms}>
                  <input type='checkbox' checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>
                    I agree to the{' '}
                    <Link href='/terms' className={styles.inlineLink}>
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href='/privacy' className={styles.inlineLink}>
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agree ? <p className={styles.fieldError}>{errors.agree}</p> : null}
              </div>

              <div className={styles.stepActions}>
                <button type='button' className={styles.backBtn} onClick={() => setStep(1)} disabled={isSubmitting}>
                  Back
                </button>
                <button type='submit' className={styles.submit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className={styles.registerText}>
            Already have an account?{' '}
            <Link href='/auth/login' className={styles.registerLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
