'use client'

import { useState, type FormEvent } from 'react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { addContact, type ContactAddPayload } from '@/lib/api/home'
import type { ContactPageCms } from '@/lib/api/cmsAdapters'
import { useContactCms } from '@/lib/api/useCmsPage'
import { CmsRichText } from '@/components/shared/CmsRichText'
import { toAssetUrl } from '@/lib/config'
import styles from './contact.module.css'

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/ghost.rentals/?hl=en',
    icon: 'images/icons/instagram.svg'
  },
  {
    label: 'Youtube',
    href: 'https://www.youtube.com/@GhostRentalsDXB',
    icon: 'images/icons/youtube.svg'
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@ghostrentals',
    icon: 'images/icons/tiktok.svg'
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/Ghostrentalsdubai',
    icon: 'images/icons/facebook.svg'
  }
] as const

const PHONE_TEL = 'tel:+97180044678'

function phoneTelLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (!digits) return PHONE_TEL
  return digits.startsWith('+') ? `tel:${digits}` : `tel:+${digits.replace(/\D/g, '')}`
}

/** Angular `Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')` */
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i

/** From production https://www.ghostrentals.com/contact (Share → Embed) */
const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.400098298194!2d55.223214776052565!3d25.122160834734654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f6bb7c49961e7%3A0x4b3661e383f4d582!2sGhost%20Rentals!5e0!3m2!1sen!2sin!4v1748495097567!5m2!1sen!2sin'

type FieldKey = 'firstName' | 'lastName' | 'email' | 'phone' | 'message'

function IconMapPin() {
  return (
    <svg
      width={22}
      height={22}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M12 22s8-4.5 8-11.2A8 8 0 0 0 4 10.8C4 17.5 12 22 12 22Z' />
      <circle cx='12' cy='10' r='2.5' />
    </svg>
  )
}

function IconEnvelope() {
  return (
    <svg
      width={22}
      height={22}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <rect x='2.5' y='5' width={19} height={14} rx={1.5} />
      <path d='M2.5 7.5 12 13l9.5-5.5' />
    </svg>
  )
}

function IconHandset() {
  return (
    <svg
      width={22}
      height={22}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.3 1.8.6 2.7a2 2 0 0 1-.45 2.12L8.1 9.9a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.12-.45c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.72 2.1z' />
    </svg>
  )
}

/** Build E.164 for UAE from local digits-only input (same UX as before). */
function uaePhoneFromLocal(localPart: string): string | null {
  const digits = localPart.replace(/\D/g, '')
  if (!digits) return null
  return `+971${digits}`
}

function validateUaeE164(localPart: string): {
  e164: string | null
  valid: boolean
} {
  const e164 = uaePhoneFromLocal(localPart)
  if (!e164) return { e164: null, valid: false }
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed || !parsed.isValid()) return { e164, valid: false }
  return { e164: parsed.format('E.164'), valid: true }
}

export function ContactClient({ initialCms }: { initialCms?: ContactPageCms }) {
  const cms = useContactCms(initialCms)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [message, setMessage] = useState('')

  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const showErr = (_key: FieldKey) => submitted

  const firstInvalid = showErr('firstName') && firstName.trim() === '' ? 'Name is required' : null
  const lastInvalid = showErr('lastName') && lastName.trim() === '' ? 'Last Name is required' : null

  const emailInvalid = showErr('email')
    ? email.trim() === ''
      ? 'Email is required'
      : !EMAIL_RE.test(email)
        ? 'Invalid Email'
        : null
    : null

  const phoneParse = validateUaeE164(phoneLocal)
  const phoneInvalid = showErr('phone')
    ? phoneLocal.replace(/\D/g, '').length === 0
      ? 'Phone Number is required'
      : !phoneParse.valid
        ? 'Invalid Phone Number'
        : null
    : null

  const messageInvalid = showErr('message') && message.trim() === '' ? 'Message is required' : null

  const formIsValid = firstName.trim() !== '' && lastName.trim() !== '' && EMAIL_RE.test(email) && phoneParse.valid && message.trim() !== ''

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    if (!formIsValid) {
      return
    }

    const payload: ContactAddPayload = {
      name: firstName.trim(),
      lastname: lastName.trim(),
      email: email.trim(),
      phone: phoneParse.e164 ?? '',
      message: message.trim()
    }

    setSubmitting(true)
    try {
      const res = await addContact(payload)
      if (res.code === 200) {
        setSuccessMsg(typeof res.message === 'string' && res.message ? res.message : 'Message sent. We will get back to you soon.')
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhoneLocal('')
        setMessage('')
        setSubmitted(false)
      } else if (res.code === 400) {
        setErrorMsg(typeof res.message === 'string' && res.message ? res.message : 'Could not send your message. Please try again.')
      } else {
        setErrorMsg(typeof res.message === 'string' && res.message ? res.message : 'Something went wrong.')
      }
    } catch {
      setErrorMsg('Network error. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.hero}>
          <h1 data-aos="fade-up" className={styles.heroTitle}>{cms.hero.title}</h1>
          <CmsRichText data-aos="fade-up" data-aos-delay="100" as="p" value={cms.hero.subtitle} className={styles.subtitle} />
        </div>

        <div className={styles.grid}>
          <form data-aos="fade-up" data-aos-delay="150" className={styles.form} onSubmit={onSubmit} noValidate>
            {successMsg && (
              <p className={`${styles.messageBanner} ${styles.success}`} role='status'>
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className={`${styles.messageBanner} ${styles.danger}`} role='alert'>
                {errorMsg}
              </p>
            )}

            <div className={styles.row2}>
              <div>
                <div className={styles.insetField}>
                  <label className={styles.insetLabel} htmlFor='contact-first'>
                    First Name
                  </label>
                  <input
                    id='contact-first'
                    className={styles.insetInput}
                    name='firstName'
                    type='text'
                    autoComplete='given-name'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                {firstInvalid && <p className={styles.error}>{firstInvalid}</p>}
              </div>
              <div>
                <div className={styles.insetField}>
                  <label className={styles.insetLabel} htmlFor='contact-last'>
                    Last Name
                  </label>
                  <input
                    id='contact-last'
                    className={styles.insetInput}
                    name='lastName'
                    type='text'
                    autoComplete='family-name'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                {lastInvalid && <p className={styles.error}>{lastInvalid}</p>}
              </div>
            </div>

            <div className={styles.row2}>
              <div>
                <div className={styles.insetField}>
                  <label className={styles.insetLabel} htmlFor='contact-email'>
                    Email
                  </label>
                  <input
                    id='contact-email'
                    className={styles.insetInput}
                    name='email'
                    type='email'
                    autoComplete='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {emailInvalid && <p className={styles.error}>{emailInvalid}</p>}
              </div>
              <div>
                <div className={styles.insetField}>
                  <span className={styles.insetLabel}>Phone</span>
                  <div className={styles.phoneRow}>
                    <div className={styles.phoneCountry} aria-hidden='true'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toAssetUrl('flags/ae.svg')} alt='' className={styles.flag} width={20} height={14} />
                      <span className={styles.dialCode}>+971</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toAssetUrl('images/icons/down-arrow.svg')} alt='' className={styles.phoneChevron} width={10} height={10} />
                    </div>
                    <input
                      className={styles.phoneInput}
                      name='phone'
                      type='tel'
                      inputMode='numeric'
                      autoComplete='tel-national'
                      placeholder='800 44678'
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      aria-label='Phone number (without country code)'
                    />
                  </div>
                </div>
                {phoneInvalid && <p className={styles.error}>{phoneInvalid}</p>}
              </div>
            </div>

            <div>
              <div className={`${styles.insetField} ${styles.insetTextarea}`}>
                <label className={styles.insetLabel} htmlFor='contact-message'>
                  Message
                </label>
                <textarea
                  id='contact-message'
                  className={styles.insetTextareaField}
                  name='message'
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              {messageInvalid && <p className={styles.error}>{messageInvalid}</p>}
            </div>

            <button type='submit' className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>

          <aside data-aos="fade-up" data-aos-delay="200" className={styles.sideCard}>
            <h2 className={styles.cardTitle}>{cms.details.title}</h2>
            <CmsRichText as="p" value={cms.details.subtitle} className={styles.sideLead} />

            <div className={styles.detailRow}>
              <span className={styles.detailIcon} aria-hidden>
                <IconMapPin />
              </span>
              <div>
                <p className={styles.detailLabel}>Address</p>
                <CmsRichText as="p" value={cms.details.address} className={styles.detailValue} />
              </div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon} aria-hidden>
                <IconEnvelope />
              </span>
              <div>
                <p className={styles.detailLabel}>Email</p>
                <a className={styles.detailValue} href={`mailto:${cms.details.email}`}>
                  {cms.details.email}
                </a>
              </div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon} aria-hidden>
                <IconHandset />
              </span>
              <div>
                <p className={styles.detailLabel}>Phone</p>
                <a className={styles.detailValue} href={phoneTelLink(cms.details.phone)}>
                  {cms.details.phone}
                </a>
              </div>
            </div>

            <div className={styles.followBlock}>
              <p className={styles.followLabel}>Follow Us</p>
              <div className={styles.socialRowIconsOnly}>
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className={styles.socialIconOnly}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={s.label}
                    aria-label={s.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toAssetUrl(s.icon)} alt='' width={28} height={28} />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div data-aos="fade-up" className={styles.mapSection}>
          <div className={styles.mapFrame}>
            <iframe
              title='Ghost Rentals on Google Maps'
              src={MAP_EMBED_SRC}
              loading='lazy'
              allowFullScreen
              referrerPolicy='no-referrer-when-downgrade'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
