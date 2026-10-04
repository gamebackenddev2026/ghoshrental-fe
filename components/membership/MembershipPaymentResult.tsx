import Link from 'next/link'
import { toAssetUrl } from '@/lib/config'
import styles from './membershipPaymentResult.module.css'

const WA_PHONE = '97180044678'

function SuccessIcon() {
  return (
    <svg className={styles.icon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.2} aria-hidden>
      <circle cx='12' cy='12' r='10' />
      <path d='m8.5 12.5 2.5 2.5 4.5-5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function FailureIcon() {
  return (
    <svg className={styles.icon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.2} aria-hidden>
      <circle cx='12' cy='12' r='10' />
      <path d='m15 9-6 6M9 9l6 6' strokeLinecap='round' />
    </svg>
  )
}

function membershipSupportWhatsappHref(): string {
  const message =
    "Hello Ghost Rentals!\n\nI tried to complete a membership payment but it didn't go through. Could you please help me finish the signup?\n\nThank you!"
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`
}

export function MembershipPaymentSuccess({
  subscriptionId,
  message
}: {
  subscriptionId?: string
  message?: string
}) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <div className={`${styles.iconCircle} ${styles.iconCircleSuccess}`}>
            <SuccessIcon />
          </div>
        </div>
        <p className={styles.eyebrow}>Ghost Rentals Membership</p>
        <h1 className={styles.title}>Payment successful</h1>
        <p className={styles.message}>
          {message?.trim() ||
            'Welcome to the Ghost Rentals loyalty programme. Your membership is being activated — points and member benefits will appear on your account shortly.'}
        </p>
        {subscriptionId ? <p className={styles.detail}>Reference: {subscriptionId}</p> : null}
        <div className={styles.actions}>
          <Link href='/product/search?type=Car' className={styles.btnPrimary}>
            Browse cars
          </Link>
          <Link href='/membership' className={styles.btnSecondary}>
            View membership
          </Link>
        </div>
      </div>
    </main>
  )
}

export function MembershipPaymentFailure({ message }: { message?: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <div className={`${styles.iconCircle} ${styles.iconCircleFailure}`}>
            <FailureIcon />
          </div>
        </div>
        <p className={styles.eyebrow}>Ghost Rentals Membership</p>
        <h1 className={styles.title}>Payment unsuccessful</h1>
        <p className={styles.message}>
          {message?.trim() ||
            'Your payment was not completed. No charges were applied. You can try again, or reach us on WhatsApp and we will help you finish your membership.'}
        </p>
        <div className={styles.actions}>
          <Link href='/membership' className={styles.btnPrimary}>
            Try again
          </Link>
          <a href={membershipSupportWhatsappHref()} target='_blank' rel='noreferrer' className={styles.btnWhatsapp}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')}
              alt=''
              className={styles.btnWhatsappIcon}
              aria-hidden='true'
            />
            <span>WhatsApp support</span>
          </a>
        </div>
      </div>
    </main>
  )
}
