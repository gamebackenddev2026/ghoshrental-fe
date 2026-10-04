'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getWishlist, type WishlistItem } from '@/lib/api/auth'
import { removeWishlistItem } from '@/lib/api/product'
import { resolveVehicleMediaUrl, VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { toAssetUrl } from '@/lib/config'
import { vehicleProductPath } from '@/lib/api/adapters'
import { AccountSidebar, getInitials } from '@/components/account/AccountSidebar'
import styles from './wishlist.module.css'

const WA_CAR_MESSAGE = `Hello Ghost Rentals! I'm interested in booking a car. Could you please help me with:\n - Is this car available for my dates?\n - Free UAE delivery service.\n - Chauffeur services if needed.\n\nI'm looking to Elevate my Drive with your Executive fleet! Thank you!`
const WA_YACHT_MESSAGE = `Hello Ghost Rentals! I'm interested in booking a yacht. Could you please help me with:\n - Is this yacht available for my dates?\n - Catering and crew services if needed.\n\nI'm looking to Elevate my Experience with your Luxury yacht charter! Thank you!`
const WA_CAR_HREF = `https://wa.me/97180044678?text=${encodeURIComponent(WA_CAR_MESSAGE)}`
const WA_YACHT_HREF = `https://wa.me/97180044678?text=${encodeURIComponent(WA_YACHT_MESSAGE)}`
const BROWSE_CARS_HREF = '/product/search?type=Car'

type StoredCustomer = {
  firstname?: string
  lastname?: string
  email?: string
  account_type?: string
}

function first<T>(arr: T[] | undefined): T | undefined {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined
}

/** Handles fields that may be a scalar OR an array depending on which API endpoint returned them. */
function firstOrScalar(val: (string | number)[] | string | number | undefined | null): string | number | undefined {
  if (val == null) return undefined
  if (Array.isArray(val)) {
    for (const v of val) {
      if (v != null && v !== '') return v
    }
    return undefined
  }
  return val
}

/** Like `first` but skips null/0 values — useful for rate arrays where backend may send [null]. */
function firstNum(arr: (number | null | undefined)[] | undefined): number | undefined {
  if (!Array.isArray(arr)) return undefined
  for (const v of arr) {
    if (v != null && v > 0) return v
  }
  return undefined
}

function resolveImageSrc(item: WishlistItem): string {
  for (const list of [item.image_data, item.media_data]) {
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      const resolved = resolveVehicleMediaUrl(entry)
      if (resolved) return resolved
    }
  }
  return ''
}

function resolveRate(item: WishlistItem): { rate: string; unit: string; rawRate: number | undefined } {
  const vType = String(first(item.vehicle_type) ?? '').toLowerCase()
  const isYacht = vType === 'yacht' || vType === 'boat' || vType === 'yachts'
  const vd = item.vehicle_data?.[0]

  if (isYacht) {
    const hourly =
      (vd?.hourlyRate as number | null | undefined) ??
      firstNum(item.hourlyRate) ??
      firstNum(item.regularRateHourly) ??
      firstNum(item.hourly_rate)
    if (hourly) return { rate: `AED ${hourly.toLocaleString()}`, unit: '/hr', rawRate: hourly }
    const daily = firstNum(item.dailyRate) ?? firstNum(item.regularRateDaily)
    if (daily) return { rate: `AED ${daily.toLocaleString()}`, unit: '/day', rawRate: daily }
    return { rate: '', unit: '', rawRate: undefined }
  }

  const daily = firstNum(item.dailyRate)
  if (!daily) return { rate: '', unit: '', rawRate: undefined }
  return { rate: `AED ${daily.toLocaleString()}`, unit: '/day', rawRate: daily }
}

function resolveHref(item: WishlistItem): string {
  const urlKey = first(item.vehicle_url_key) ?? ''
  if (!urlKey) return BROWSE_CARS_HREF
  return vehicleProductPath(urlKey)
}

export function WishlistPageClient() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [customer, setCustomer] = useState<StoredCustomer>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userToken = localStorage.getItem('ghostrentals-web-token') ?? ''
    if (!userToken) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      return
    }
    setToken(userToken)
    try {
      const raw = localStorage.getItem('customer')
      if (raw) setCustomer(JSON.parse(raw) as StoredCustomer)
    } catch {
      /* keep empty */
    }

    const fetchWishlist = async () => {
      try {
        const response = await getWishlist(userToken)
        // Backend returns `result` as the array directly
        const list = Array.isArray(response.result) ? response.result : []
        setItems(list)
      } catch {
        setError('Unable to load wishlist. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchWishlist()
  }, [])

  const handleRemove = async (item: WishlistItem) => {
    // API expects the vehicle_id (not the wishlist entry _id)
    const id = item.vehicle_id ?? item._id ?? ''
    if (!id || !token) return
    setRemovingId(id)
    try {
      await removeWishlistItem({ id, token })
      setItems((prev) => prev.filter((w) => (w.vehicle_id ?? w._id) !== id))
    } catch {
      // silently ignore — item stays in list
    } finally {
      setRemovingId(null)
    }
  }

  const initials = getInitials(customer.firstname ?? '', customer.lastname ?? '')
  const displayName = [customer.firstname, customer.lastname].filter(Boolean).join(' ') || 'Guest'

  const onSignOut = () => {
    localStorage.removeItem('ghostrentals-web-token')
    localStorage.removeItem('customer')
    localStorage.removeItem('guest')
    window.dispatchEvent(new Event('storage'))
    window.location.href = '/'
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <AccountSidebar initials={initials} displayName={displayName} email={customer.email} activePage='wishlist' accountType={customer.account_type} onSignOut={onSignOut} />

        {/* ── Main content ── */}
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>Wishlist</h1>
              {!isLoading && !error ? (
                <p className={styles.subtitle}>
                  {items.length === 0 ? 'No saved vehicles yet' : `${items.length} saved vehicle${items.length === 1 ? '' : 's'}`}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className={styles.errorBanner}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                <circle cx='12' cy='12' r='10' />
                <line x1='12' y1='8' x2='12' y2='12' />
                <line x1='12' y1='16' x2='12.01' y2='16' />
              </svg>
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Loading your wishlist…</p>
            </div>
          ) : !error && items.length === 0 ? (
            <div className={styles.emptyWrap}>
              <div className={styles.emptyIcon}>
                <svg width='52' height='52' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' aria-hidden>
                  <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
                </svg>
              </div>
              <p className={styles.emptyTitle}>Your wishlist is empty</p>
              <p className={styles.emptyText}>Save vehicles you love and find them here anytime.</p>
              <Link href={BROWSE_CARS_HREF} className={styles.browseLink}>
                Browse Cars
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                  <line x1='5' y1='12' x2='19' y2='12' />
                  <polyline points='12 5 19 12 12 19' />
                </svg>
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((item) => {
                const vehicleId = item.vehicle_id ?? item._id ?? ''
                const imageSrc = resolveImageSrc(item)
                const name = first(item.vehicle_name) ?? 'Vehicle'
                const vType = String(first(item.vehicle_type) ?? '').toLowerCase()
                const isYacht = vType === 'yacht' || vType === 'boat' || vType === 'yachts'
                const { rate, unit, rawRate } = resolveRate(item)
                const href = resolveHref(item)
                const waHref = isYacht ? WA_YACHT_HREF : WA_CAR_HREF
                const isRemoving = removingId === vehicleId

                // car-specific specs
                const transmission = first(item.transmission)
                const fuelType = first(item.fuelType)
                const mileage = firstNum(item.mileage as (number | null)[] | undefined)
                const seats = first(item.seating_capacity)
                const oldRateCar = firstNum(item.regularRateDaily)
                const showOldCar = oldRateCar != null && rawRate != null && oldRateCar > rawRate

                // yacht-specific specs — live in vehicle_data[0], fall back to top-level
                const vd = item.vehicle_data?.[0]
                const yachtYear = vd?.year ?? firstOrScalar(item.year)
                const yachtLength = vd?.length ?? firstOrScalar(item.length)
                const guestCapacity = vd?.guest_capacity ?? firstOrScalar(item.guest_capacity)
                const oldRateYacht = vd?.regularRateHourly != null ? vd.regularRateHourly : firstNum(item.regularRateHourly)
                const showOldYacht = oldRateYacht != null && rawRate != null && oldRateYacht > rawRate

                return (
                  <article key={item._id ?? vehicleId} className={styles.card}>
                    {/* Image — exact .thumbnailWrap */}
                    <div className={styles.imageWrap}>
                      <Link href={href} className={styles.imageLink}>
                        {imageSrc ? (
                          <OptimizedImage
                            src={imageSrc}
                            fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                            alt={name}
                            className={styles.image}
                            fill
                            sizes={IMAGE_SIZES.cardThumb}
                            loading='lazy'
                          />
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <OptimizedImage
                              src={VEHICLE_PLACEHOLDER_SRC}
                              alt=''
                              className={styles.imagePlaceholderLogo}
                              width={120}
                              height={48}
                              loading='lazy'
                            />
                          </div>
                        )}
                      </Link>
                      <button
                        type='button'
                        className={styles.removeBtn}
                        onClick={() => handleRemove(item)}
                        disabled={isRemoving}
                        aria-label='Remove from wishlist'
                      >
                        {isRemoving ? (
                          <svg
                            width='13'
                            height='13'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            aria-hidden
                            style={{ animation: 'spin 0.75s linear infinite' }}
                          >
                            <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                          </svg>
                        ) : (
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' aria-hidden>
                            <line x1='18' y1='6' x2='6' y2='18' />
                            <line x1='6' y1='6' x2='18' y2='18' />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Body — exact .cardBody structure */}
                    <div className={styles.cardBody}>
                      <div>
                        <Link href={href} className={styles.carNameLink}>
                          <h4 className={styles.carName}>{name}</h4>
                        </Link>
                        {isYacht ? null : transmission ? <h5 className={styles.carType}>{transmission}</h5> : null}
                      </div>

                      {/* Specs — yacht: year/length/guests; car: fuel/mileage/seats */}
                      <div className={styles.carMeta}>
                        {isYacht ? (
                          <>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/year2.svg')} alt='Year' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{yachtYear ?? '—'}</h6>
                            </div>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/length.svg')} alt='Length' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{yachtLength ?? '—'}</h6>
                            </div>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/guests.svg')} alt='Guests' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{guestCapacity != null ? `${guestCapacity} Guests` : '—'}</h6>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/petrol2.svg')} alt='Fuel' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{fuelType ?? '—'}</h6>
                            </div>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/mileage2.svg')} alt='Mileage' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{mileage != null ? `${mileage} km/day` : '—'}</h6>
                            </div>
                            <div className={styles.metaChip}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/seat2.png')} alt='Seats' className={styles.metaIcon} />
                              <h6 className={styles.metaLabel}>{seats != null ? `${seats} Pax` : '—'}</h6>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer — exact .cardFooter structure */}
                    <div className={styles.cardFooter}>
                      <div className={styles.priceBlock}>
                        {isYacht ? (
                          showOldYacht ? (
                            <span className={styles.oldPrice}>AED {oldRateYacht!.toLocaleString()}/hr</span>
                          ) : null
                        ) : showOldCar ? (
                          <span className={styles.oldPrice}>AED {oldRateCar!.toLocaleString()}/day</span>
                        ) : null}
                        <div className={styles.priceMain}>
                          <h6 className={styles.price}>{rate || '—'}</h6>
                          {unit ? <span className={styles.priceUnit}>{unit}</span> : null}
                        </div>
                      </div>
                      <div className={styles.actions}>
                        <a href='tel:+97180044678' className={styles.actionBtn} data-variant='call' aria-label='Call'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={toAssetUrl('images/icons/call-action.svg')} alt='Call' />
                        </a>
                        <a
                          href={waHref}
                          target='_blank'
                          rel='noreferrer'
                          className={styles.actionBtn}
                          data-variant='whatsapp'
                          aria-label='WhatsApp'
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='WhatsApp' />
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </section>
  )
}
