'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Faq } from '@/components/home/HomeSections'
import homeSectionStyles from '@/components/home/homeSections.module.css'
import { FormattedPrice } from '@/components/shared/FormattedPrice'
import type { FaqCmsContent } from '@/lib/api/cmsAdapters'
import { toBannerForPage, type HeroBanner } from '@/lib/api/adapters'
import { getAllBanner } from '@/lib/api/home'
import { resolveCmsBannerVideoSources, toAssetUrl } from '@/lib/config'
import { CmsBannerVideo } from '@/components/shared/CmsBannerVideo'
import { formatPriceFromAED, useCurrencyService } from '@/lib/currency-service'
import { getClientAuthToken } from '@/lib/authToken'
import { ApiError } from '@/lib/api/client'
import {
  getLoyaltySettings,
  getPublicMembershipPackages,
  subscribeMembership,
  toLoyaltySettings,
  toMembershipPlans,
  type LoyaltySettings,
  type MembershipBillingInterval,
  type MembershipPlan
} from '@/lib/api/membership'
import styles from './membershipPage.module.css'

type BillingCycle = MembershipBillingInterval

const MEMBERSHIP_PRICE_FRACTION_DIGITS = 2

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

function stripBillingFromPlanTitle(title: string): string {
  // Backend plan names sometimes include billing interval (e.g. "Gold Monthly").
  // Requirement: remove Monthly/Yearly only from the card title.
  return title.replace(/\s*(monthly|yearly)\s*$/i, '').trim()
}

function bannerSource(banner: HeroBanner | null): {
  isVideo: boolean
  imageSrc: string
  primaryVideo: string
  fallbackVideo: string
} | null {
  if (!banner?.media_url) return null
  const isVideo = String(banner.file_type).toLowerCase() === 'video'
  const { primaryVideo, fallbackVideo } = resolveCmsBannerVideoSources(banner)
  return {
    isVideo,
    imageSrc: banner.media_url,
    primaryVideo,
    fallbackVideo
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      width={18}
      height={18}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.4}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  )
}

export function MembershipClient({ faq }: { faq: FaqCmsContent }) {
  const hydrated = useHydrated()
  const { currency } = useCurrencyService()
  const priceCurrencyCode = hydrated ? undefined : ('AED' as const)
  const formatMembershipPrice = useCallback(
    (amount: number) => formatPriceFromAED(amount, currency, MEMBERSHIP_PRICE_FRACTION_DIGITS),
    [currency]
  )

  const fallbackHeroImg = toAssetUrl('home/about-us-ghost-rentals-dubai.webp')
  const heroPoster = toAssetUrl('loader-video/luxury-car-and-yacht-services.webp')

  const [heroBanner, setHeroBanner] = useState<HeroBanner | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [settings, setSettings] = useState<LoyaltySettings>(() => toLoyaltySettings(null))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const media = useMemo(() => bannerSource(heroBanner), [heroBanner])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [bannerRes, packagesRes, settingsRes] = await Promise.all([
          getAllBanner({}),
          getPublicMembershipPackages(),
          getLoyaltySettings()
        ])
        if (cancelled) return
        setHeroBanner(bannerRes.code === 200 && Array.isArray(bannerRes.result) ? toBannerForPage(bannerRes.result, 'membership') : null)
        setPlans(packagesRes.code === 200 ? toMembershipPlans(packagesRes.result) : [])
        setSettings(toLoyaltySettings(settingsRes.code === 200 ? settingsRes.result : null))
      } catch {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const { pointValueAed, spendPerPointAed, referralReferrerPoints, referralRefereePoints } = settings

  const availableCycles = useMemo(() => {
    const cycles = new Set<BillingCycle>()
    plans.forEach((plan) => cycles.add(plan.billingInterval))
    return (['monthly', 'yearly'] as BillingCycle[]).filter((cycle) => cycles.has(cycle))
  }, [plans])

  // Falls back gracefully before plans finish loading / when a cycle is missing.
  const effectiveBilling: BillingCycle = availableCycles.includes(billing)
    ? billing
    : availableCycles.includes('monthly')
      ? 'monthly'
      : (availableCycles[0] ?? billing)

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.billingInterval === effectiveBilling).sort((a, b) => a.priceAed - b.priceAed),
    [plans, effectiveBilling]
  )

  /** Monthly price per tier — used to compute annual savings on yearly cards. */
  const monthlyByTier = useMemo(() => {
    const map = new Map<string, number>()
    plans.forEach((plan) => {
      if (plan.billingInterval === 'monthly') map.set(plan.tier, plan.priceAed)
    })
    return map
  }, [plans])

  const featuredIndex = visiblePlans.length >= 3 ? 1 : -1

  const maxBonusPercent = useMemo(() => plans.reduce((max, plan) => Math.max(max, plan.bonusPointsPercent), 0), [plans])
  const maxSignupPoints = useMemo(() => plans.reduce((max, plan) => Math.max(max, plan.signupPoints), 0), [plans])

  /**
   * Direct checkout via MamoPay:
   * 1. POST /api/membership/subscribe → backend creates payment link
   * 2. Redirect customer to payment_url
   * 3. Backend confirms via POST /api/membership/webhooks/mamopay
   */
  const handleSubscribe = async (plan: MembershipPlan) => {
    setCheckoutError(null)
    const token = getClientAuthToken()
    if (!token) {
      window.location.assign(`/auth/login?returnUrl=${encodeURIComponent('/membership')}`)
      return
    }

    // Legacy-parity backends resolve the customer from the body, not the
    // Bearer header — pass the stored customer id along with the JWT.
    let customerId: string | undefined
    try {
      const storedCustomer = JSON.parse(localStorage.getItem('customer') ?? '{}') as { _id?: string }
      customerId = storedCustomer._id || undefined
    } catch {
      customerId = undefined
    }

    setPendingPlanId(plan.id)
    try {
      const res = await subscribeMembership(plan.id, token, customerId)
      if (res.code === 200 && res.result?.payment_url) {
        window.location.assign(res.result.payment_url)
        return
      }
      setCheckoutError(res.message || 'Unable to start checkout. Please try again.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign(`/auth/login?returnUrl=${encodeURIComponent('/membership')}`)
        return
      }
      const message =
        error instanceof ApiError && error.message ? error.message : 'Something went wrong while starting checkout. Please try again.'
      setCheckoutError(message)
    } finally {
      setPendingPlanId(null)
    }
  }

  const hasPlans = visiblePlans.length > 0

  const pointHighlights = useMemo(
    () => [
      {
        title: '1 point =',
        titlePrice: pointValueAed,
        description: 'Redeem accumulated points against any rental — every point carries real value.'
      },
      {
        title: 'Earn as you spend',
        description:
          maxBonusPercent > 0
            ? `Non-members earn 1 point for every ${formatMembershipPrice(spendPerPointAed)} spent. Members earn up to ${maxBonusPercent}% more.`
            : `Non-members earn 1 point for every ${formatMembershipPrice(spendPerPointAed)} spent. Members earn even more.`
      },
      {
        title: 'Instant welcome points',
        description:
          maxSignupPoints > 0
            ? `Members receive up to ${maxSignupPoints.toLocaleString('en-AE')} points the moment they join — before their first rental.`
            : 'Members receive welcome points the moment they join — before their first rental.'
      }
    ],
    [pointValueAed, spendPerPointAed, maxBonusPercent, maxSignupPoints, formatMembershipPrice]
  )

  const showReferralRewards = referralReferrerPoints > 0 || referralRefereePoints > 0

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label='Membership plans'>
        <div className={styles.heroInner}>
          {media ? (
            media.isVideo ? (
              <CmsBannerVideo
                className={styles.heroMedia}
                primarySrc={media.primaryVideo}
                fallbackSrc={media.fallbackVideo}
                poster={heroPoster}
                ariaLabel='Ghost Rentals membership banner video'
                preload='auto'
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.heroMedia}
                src={media.imageSrc}
                alt={heroBanner?.alt || 'Ghost Rentals membership Dubai'}
                loading='eager'
                fetchPriority='high'
                decoding='async'
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackHeroImg) e.currentTarget.src = fallbackHeroImg
                }}
              />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.heroMedia}
              src={fallbackHeroImg}
              alt='Ghost Rentals membership Dubai'
              loading='eager'
              fetchPriority='high'
              decoding='async'
            />
          )}

          <div className={styles.heroOverlay} aria-hidden />

          <div className={styles.heroContent}>
            <h1 data-aos='fade-up' className={styles.heroTitle}>
              Luxury Car Rental Membership Plans in Dubai
            </h1>
            <p data-aos='fade-up' data-aos-delay='100' className={styles.heroSub}>
              Join the Ghost Rentals loyalty program and turn every journey into rewards. Enjoy exclusive discounts, complimentary services
              and points on every transaction — with automatic, secure checkout.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.points} aria-label='How points work'>
        <div className={styles.sectionInner}>
          <h2 data-aos='fade-up' className={`${styles.sectionTitle} performa-light`}>
            How the points system works
          </h2>
          <p data-aos='fade-up' className={`${styles.sectionSub} redhat-regular`}>
            Non-members earn 1 point for every{' '}
            <FormattedPrice
              amount={spendPerPointAed}
              fromAED
              currencyCode={priceCurrencyCode}
              fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
            />{' '}
            spent, and each point is worth{' '}
            <FormattedPrice
              amount={pointValueAed}
              fromAED
              currencyCode={priceCurrencyCode}
              fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
            />
            . Members earn significantly more on every single transaction.
          </p>
          <div className={styles.pointsGrid}>
            {pointHighlights.map((item) => (
              <div key={item.title} data-aos='fade-up' className={styles.pointCard}>
                <h3 className={`${styles.pointCardTitle} redhat-semibold`}>
                  {item.titlePrice != null ? (
                    <>
                      {item.title}{' '}
                      <FormattedPrice
                        amount={item.titlePrice}
                        fromAED
                        currencyCode={priceCurrencyCode}
                        fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
                      />
                    </>
                  ) : (
                    item.title
                  )}
                </h3>
                <p className={`${styles.pointCardText} redhat-regular`}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.plans} aria-label='Membership packages'>
        <div className={styles.sectionInner}>
          <h2 data-aos='fade-up' className={`${styles.sectionTitle} performa-light`}>
            Choose your membership
          </h2>
          <p data-aos='fade-up' className={`${styles.sectionSub} redhat-regular`}>
            Every tier is built to make your drive more rewarding. Upgrade, downgrade or cancel anytime.
          </p>

          {availableCycles.length > 1 ? (
            <div data-aos='fade-up' className={styles.billingToggle} role='tablist' aria-label='Billing cycle'>
              {availableCycles.map((cycle) => (
                <button
                  key={cycle}
                  type='button'
                  role='tab'
                  aria-selected={effectiveBilling === cycle}
                  className={`${styles.billingOption} ${effectiveBilling === cycle ? styles.billingActive : ''}`}
                  onClick={() => setBilling(cycle)}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  {cycle === 'yearly' ? <span className={styles.billingBadge}>Best value</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          {checkoutError ? (
            <p className={styles.checkoutError} role='alert'>
              {checkoutError}
            </p>
          ) : null}

          {loading ? (
            <p className={styles.emptyState}>Loading membership plans…</p>
          ) : loadError ? (
            <p className={styles.emptyState}>
              We couldn&apos;t load the membership plans right now. Please refresh the page and try again.
            </p>
          ) : hasPlans ? (
            <div className={styles.planGrid}>
              {visiblePlans.map((plan, index) => {
                const featured = index === featuredIndex
                const perMonth = effectiveBilling === 'yearly' ? plan.priceAed / 12 : plan.priceAed
                const monthlyCounterpart = monthlyByTier.get(plan.tier)
                const annualSaving = effectiveBilling === 'yearly' && monthlyCounterpart ? monthlyCounterpart * 12 - plan.priceAed : 0
                const cardClass = `${styles.planCard} ${featured ? styles.planCardFeatured : ''}`
                const isPending = pendingPlanId === plan.id
                const anyPending = pendingPlanId !== null
                return (
                  <article key={plan.id} data-aos='fade-up' className={cardClass}>
                    {featured ? <span className={styles.planBadge}>Most Popular</span> : null}
                    <div className={styles.planHeader}>
                      <h3 className={`${styles.planName} performa-light`}>{stripBillingFromPlanTitle(plan.name)}</h3>
                      {plan.description ? <p className={`${styles.planTagline} redhat-regular`}>{stripHtml(plan.description)}</p> : null}
                    </div>

                    <div className={styles.planPrice}>
                      <span className={`${styles.planAmount} performa-light`}>
                        <FormattedPrice
                          amount={plan.priceAed}
                          fromAED
                          currencyCode={priceCurrencyCode}
                          fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
                        />
                      </span>
                      <span className={styles.planPeriod}>/{effectiveBilling === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    <p className={styles.planPerMonth}>
                      {effectiveBilling === 'yearly' ? (
                        <>
                          ≈{' '}
                          <FormattedPrice
                            amount={perMonth}
                            fromAED
                            currencyCode={priceCurrencyCode}
                            fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
                          />
                          /month billed annually
                          {annualSaving > 0 ? (
                            <>
                              {' '}
                              · save{' '}
                              <FormattedPrice
                                amount={annualSaving}
                                fromAED
                                currencyCode={priceCurrencyCode}
                                fractionDigits={MEMBERSHIP_PRICE_FRACTION_DIGITS}
                              />
                            </>
                          ) : null}
                        </>
                      ) : (
                        'Billed monthly'
                      )}
                    </p>

                    {plan.signupPoints > 0 ? (
                      <div className={styles.planPoints}>
                        <span className={styles.planPointsValue}>{plan.signupPoints.toLocaleString('en-AE')}</span>
                        <span className={styles.planPointsLabel}>instant points on joining</span>
                      </div>
                    ) : null}

                    <ul className={styles.featureList}>
                      {plan.features.map((feature) => (
                        <li key={feature} className={styles.featureItem}>
                          <CheckIcon className={styles.featureIcon} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type='button'
                      onClick={() => void handleSubscribe(plan)}
                      disabled={anyPending}
                      className={featured ? styles.planCtaFeatured : styles.planCta}
                    >
                      {isPending ? 'Redirecting to payment…' : `Subscribe to ${stripBillingFromPlanTitle(plan.name)}`}
                    </button>
                    <p className={styles.planNote}>Pay securely online</p>
                  </article>
                )
              })}
            </div>
          ) : (
            <p data-aos='fade-up' className={styles.emptyState}>
              Membership plans are being finalised. Please check back soon or contact us to register your interest.
            </p>
          )}
        </div>
      </section>

      {showReferralRewards ? (
        <section className={styles.referral} aria-label='Referral rewards'>
          <div className={styles.sectionInner}>
            <h2 data-aos='fade-up' className={`${styles.sectionTitle} performa-light`}>
              Refer friends, earn points
            </h2>
            <p data-aos='fade-up' className={`${styles.sectionSub} redhat-regular`}>
              Share your unique referral code. You and your friends both earn loyalty points when they create an account.
            </p>
            <div className={styles.referralGrid}>
              <div data-aos='fade-up' className={styles.pointCard}>
                <h3 className={`${styles.pointCardTitle} redhat-semibold`}>{referralReferrerPoints.toLocaleString('en-AE')} points</h3>
                <p className={`${styles.pointCardText} redhat-regular`}>
                  For you — credited when a friend signs up with your code and completes their first qualifying step.
                </p>
              </div>
              <div data-aos='fade-up' className={styles.pointCard}>
                <h3 className={`${styles.pointCardTitle} redhat-semibold`}>{referralRefereePoints.toLocaleString('en-AE')} points</h3>
                <p className={`${styles.pointCardText} redhat-regular`}>
                  For your friend — applied when they register with your referral code.
                </p>
              </div>
            </div>
            <div data-aos='fade-up' className={styles.referralActions}>
              <Link href='/auth/register' className={styles.referralCta}>
                Create an account
              </Link>
              <Link href='/account/referral' className={styles.referralSecondary}>
                View my referral code
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <Faq
        className={homeSectionStyles.faqSectionTightTop}
        content={{
          title: faq.title,
          subtitle: faq.subtitle,
          buttonText: faq.buttonText,
          items: faq.items
        }}
      />
    </div>
  )
}
