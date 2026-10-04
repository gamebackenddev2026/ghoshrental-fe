'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AccountSidebar, getInitials } from '@/components/account/AccountSidebar'
import {
  applyReferralCode,
  ensureReferralCode,
  getMyReferral,
  type MyReferralResult
} from '@/lib/api/referral'
import { getLoyaltySettings, toLoyaltySettings } from '@/lib/api/membership'
import { normalizeReferralCode } from '@/lib/referral'
import styles from './referral.module.css'

type StoredCustomer = {
  firstname?: string
  lastname?: string
  email?: string
  account_type?: string
}

function emptyReferral(): MyReferralResult {
  return {
    referral_code: null,
    referred_by_customer_id: null,
    rewards: {},
    stats: {
      total_referrals: 0,
      rewarded: 0,
      pending: 0,
      points_earned: 0
    },
    referrals: []
  }
}

export function ReferralPageClient() {
  const [token, setToken] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<MyReferralResult>(emptyReferral)
  const [referrerPoints, setReferrerPoints] = useState(0)
  const [refereePoints, setRefereePoints] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [applyCode, setApplyCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const loadReferral = async (userToken: string) => {
    let next = emptyReferral()

    try {
      const ensured = await ensureReferralCode(userToken)
      if (ensured.code === 200 && ensured.result?.referral_code) {
        next = { ...next, referral_code: ensured.result.referral_code }
      }
    } catch {
      // Fall through to my-auth
    }

    try {
      const res = await getMyReferral(userToken)
      if (res.code === 200 && res.result) {
        next = {
          ...next,
          ...res.result,
          referral_code: res.result.referral_code || next.referral_code
        }
      }
    } catch {
      // Keep ensure-code result if my-auth fails
    }

    setData(next)
  }

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

    setToken(userToken)
    setFirstname(parsedCustomer.firstname ?? '')
    setLastname(parsedCustomer.lastname ?? '')
    setEmail(parsedCustomer.email ?? '')
    setAccountType(parsedCustomer.account_type ?? '')

    const hydrate = async () => {
      try {
        const settingsRes = await getLoyaltySettings()
        const settings = toLoyaltySettings(settingsRes.code === 200 ? settingsRes.result : null)
        setReferrerPoints(settings.referralReferrerPoints)
        setRefereePoints(settings.referralRefereePoints)
        await loadReferral(userToken)
      } catch {
        setError('Unable to load your referral details right now.')
      } finally {
        setIsLoading(false)
      }
    }

    void hydrate()
  }, [])

  const referralCode = data.referral_code?.trim() || ''
  const stats = data.stats ?? {}
  const rewards = data.rewards ?? {}
  const canApply = !data.referred_by_customer_id

  const shareUrl = useMemo(() => {
    if (!referralCode || typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/register?ref=${encodeURIComponent(referralCode)}`
  }, [referralCode])

  const displayReferrerPoints = rewards.referrer_points ?? referrerPoints
  const displayRefereePoints = rewards.referee_points ?? refereePoints

  const onCopyCode = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Unable to copy referral code.')
    }
  }

  const onCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('Invite link copied.')
      window.setTimeout(() => setMessage(''), 2500)
    } catch {
      setError('Unable to copy invite link.')
    }
  }

  const onApply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const code = normalizeReferralCode(applyCode)
    if (!code) {
      setError('Enter a referral code to apply.')
      return
    }
    try {
      setIsApplying(true)
      const res = await applyReferralCode(code, token)
      if (res.code === 200) {
        setMessage(res.message || 'Referral code applied successfully.')
        setApplyCode('')
        await loadReferral(token)
        return
      }
      setError(res.message || 'Unable to apply referral code.')
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Unable to apply referral code.')
    } finally {
      setIsApplying(false)
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

  const initials = getInitials(firstname, lastname)
  const displayName = [firstname, lastname].filter(Boolean).join(' ') || 'Guest'

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <AccountSidebar
          initials={initials}
          displayName={displayName}
          email={email}
          activePage='referral'
          accountType={accountType}
          onSignOut={onSignOut}
        />

        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>Referrals</h1>
              <p className={styles.subtitle}>Share your code and earn loyalty points when friends join.</p>
            </div>
          </div>

          {message ? <p className={styles.success}>{message}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Your referral code</h2>
            </div>
            <div className={styles.cardBody}>
              {isLoading ? (
                <p className={styles.muted}>Loading your referral details…</p>
              ) : (
                <>
                  <div className={styles.codeRow}>
                    <code className={styles.code}>{referralCode || '—'}</code>
                    <button type='button' className={styles.secondaryBtn} onClick={onCopyCode} disabled={!referralCode}>
                      {copied ? 'Copied' : 'Copy code'}
                    </button>
                    <button type='button' className={styles.primaryBtn} onClick={onCopyLink} disabled={!shareUrl}>
                      Copy invite link
                    </button>
                  </div>
                  {(displayReferrerPoints > 0 || displayRefereePoints > 0) && (
                    <p className={styles.rewardHint}>
                      You earn {displayReferrerPoints.toLocaleString('en-AE')} points per successful referral
                      {displayRefereePoints > 0
                        ? ` — friends get ${displayRefereePoints.toLocaleString('en-AE')} points when they sign up with your code.`
                        : '.'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{(stats.total_referrals ?? 0).toLocaleString('en-AE')}</p>
              <p className={styles.statLabel}>Total referrals</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{(stats.points_earned ?? 0).toLocaleString('en-AE')}</p>
              <p className={styles.statLabel}>Points earned</p>
            </div>
          </div>

          {canApply ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Have a referral code?</h2>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.muted}>
                  Apply a friend&apos;s code once
                  {displayRefereePoints > 0
                    ? ` to claim ${displayRefereePoints.toLocaleString('en-AE')} bonus points.`
                    : '.'}
                </p>
                <form className={styles.applyForm} onSubmit={onApply}>
                  <input
                    className={styles.input}
                    value={applyCode}
                    onChange={(e) => setApplyCode(normalizeReferralCode(e.target.value))}
                    placeholder='Enter referral code'
                    autoComplete='off'
                    spellCheck={false}
                  />
                  <button type='submit' className={styles.primaryBtn} disabled={isApplying || !applyCode.trim()}>
                    {isApplying ? 'Applying…' : 'Apply code'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Your referral bonus</h2>
              </div>
              <div className={styles.cardBody}>
                {displayRefereePoints > 0 ? (
                  <>
                    <p className={styles.bonusValue}>{displayRefereePoints.toLocaleString('en-AE')} points</p>
                    <p className={styles.muted}>
                      Credited to your account for signing up with a friend&apos;s referral code.
                    </p>
                  </>
                ) : (
                  <p className={styles.muted}>A referral code is already linked to your account.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
