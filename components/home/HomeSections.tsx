'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { CmsRichText } from '@/components/shared/CmsRichText'
import { CmsImage } from '@/components/shared/CmsImage'
import { splitCmsHeadingLines } from '@/lib/cms/htmlContent'
import { displayFeatureIconSrc } from '@/lib/cms/cmsMedia'
import { Autoplay, Navigation } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper/types'
import styles from './homeSections.module.css'
import { publicMediaUrl, toAssetUrl } from '@/lib/config'
import { brandImageDisplaySrc, vehicleImageDisplaySrc, VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'
import { CardSlideImage } from '@/components/shared/CardSlideImage'
import { cardSlideImages, vehicleProductPath } from '@/lib/api/adapters'
import { AssetImageWithFallback } from '@/components/shared/AssetImageWithFallback'
import { ReviewerAvatar } from '@/components/shared/ReviewerAvatar'
import {
  brands as fallbackBrands,
  faqs,
  features as fallbackFeatures,
  googleReviews as fallbackGoogleReviews,
  googleSummary,
  trendingRentalCars as fallbackTrending,
  ourPartners as fallbackPartners,
  type BrandItem,
  type CarItem,
  type CarType,
  type GoogleReview,
  type PartnerItem,
  type YachtItem
} from './mockData'
import { FormattedPrice } from '@/components/shared/FormattedPrice'
import { MemberDiscountNote } from '@/components/shared/MemberDiscountNote'
import { StrikePriceWrap } from '@/components/shared/StrikePriceWrap'
import { hasMemberPriceDrop } from '@/lib/customerDiscount'
import { useMemberDiscountPercent } from '@/lib/useMemberDiscountPercent'
import { useCardImageSlideshow } from '@/hooks/useCardImageSlideshow'
import { WishlistHeart } from '@/components/shared/WishlistHeart'
import { extractYoutubeVideoId, INSTAGRAM_GRID_LIMIT, type SocialPostItem } from '@/lib/api/socialAdapters'
import {
  formatFollowerLabel,
  formatSubscriberLabel,
  type InstagramProfileStats,
  type YoutubeChannelStats
} from '@/lib/api/social'
import { isInstagramReelHref, toInstagramEmbedSrc } from '@/lib/api/instagramEmbed'

const WA_PHONE = '97180044678'
const WA_MESSAGE = `Hello Ghost Rentals! I'm interested in booking a car. Could you please help me with:\n - Is this car available for my dates?\n - Free UAE delivery service.\n - Chauffeur services if needed.\n\nI'm looking to Elevate my Drive with your Executive fleet! Thank you!`
const WA_HREF = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(WA_MESSAGE)}`

type FeatureLike = {
  image: string
  alt: string
  title: string
  description: string
}

import 'swiper/css'
import 'swiper/css/navigation'

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

/** Matches `.viewAllMobile` breakpoint — cars use one full slider row on small screens only. */
const CAR_HOME_SINGLE_ROW_MQ = '(max-width: 991px)'

function useCarHomeSingleRowMobile() {
  const [matches, setMatches] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(CAR_HOME_SINGLE_ROW_MQ)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return matches
}

// Vehicle images: absolute URLs from API (`s3_url` / `src_url` / `url` on media objects).
const NO_VEHICLE_IMAGE = VEHICLE_PLACEHOLDER_SRC
const brandUrl = (src: string) => brandImageDisplaySrc(src) ?? publicMediaUrl('brand', src)
const carTypeUrl = (src: string) => vehicleImageDisplaySrc(src) ?? publicMediaUrl('cartype', src)

function cardDisplayImages(item: {
  media_images?: Array<{ src: string; alt?: string }>
  media_src?: string
  media_alt?: string
  name: string
}): Array<{ src: string; alt: string }> {
  const images = cardSlideImages(item)
  return images.length ? images : [{ src: NO_VEHICLE_IMAGE, alt: item.name }]
}

function VehicleCardThumbnail({
  images,
  href,
  title,
  wrapClassName,
  wishlist,
  onFirstImageLoad
}: {
  images: Array<{ src: string; alt: string }>
  href: string
  title: string
  wrapClassName?: string
  wishlist: ReactNode
  onFirstImageLoad?: () => void
}) {
  const { activeIdx, hasMultiple, slidesActive, startSlide, stopSlide, goToPrev, goToNext } = useCardImageSlideshow(images)

  return (
    <div className={[styles.thumbnailWrap, wrapClassName].filter(Boolean).join(' ')} onMouseEnter={startSlide} onMouseLeave={stopSlide}>
      {wishlist}
      <Link className={styles.thumbnailLink} href={href}>
        {images.map((img, i) => {
          if (i > 0 && !slidesActive) return null
          return (
            <CardSlideImage
              key={`${img.src}-${i}`}
              src={img.src}
              alt={img.alt}
              title={title}
              className={i === activeIdx ? styles.slideActive : styles.slideHidden}
              priority={i === 0}
              onSettled={i === 0 ? onFirstImageLoad : undefined}
            />
          )
        })}
      </Link>
      {hasMultiple ? (
        <>
          <button
            type='button'
            className={`${styles.slideArrow} ${styles.slideArrowPrev}`}
            aria-label='Previous image'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToPrev()
            }}
          >
            &#8249;
          </button>
          <button
            type='button'
            className={`${styles.slideArrow} ${styles.slideArrowNext}`}
            aria-label='Next image'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToNext()
            }}
          >
            &#8250;
          </button>
          <div className={styles.slideDots}>
            {images.map((_, i) => (
              <span key={i} className={i === activeIdx ? styles.slideDotActive : styles.slideDot} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

const COLLECTION_BREAKPOINTS = {
  0: { slidesPerView: 1, spaceBetween: 10 },
  430: { slidesPerView: 1, spaceBetween: 10 },
  575: { slidesPerView: 1, spaceBetween: 15 },
  768: { slidesPerView: 2.5, spaceBetween: 20 },
  992: { slidesPerView: 3.5, spaceBetween: 15 },
  1281: { slidesPerView: 4.5, spaceBetween: 20 },
  1400: { slidesPerView: 4.5, spaceBetween: 20 },
  1921: { slidesPerView: 5.5, spaceBetween: 20 }
} as const

function ArrowLeftIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M19 12H5' />
      <path d='m12 19-7-7 7-7' />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M5 12h14' />
      <path d='m12 5 7 7-7 7' />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <line x1='12' y1='5' x2='12' y2='19' />
      <line x1='5' y1='12' x2='19' y2='12' />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <line x1='5' y1='12' x2='19' y2='12' />
    </svg>
  )
}

function CollectionCarousel({
  items,
  renderItem,
  onViewAll,
  showMobileViewAll = true,
  wrapClassName,
  breakpoints = COLLECTION_BREAKPOINTS,
  /**
   * `loop` duplicates slides at the edges — on dark trending cards a thin sliver
   * of the clone can show on the left. `rewind` wraps without duplicated DOM.
   */
  rewind: rewindProp
}: {
  items: ReadonlyArray<{ id: string }>
  renderItem: (item: { id: string }, index: number) => ReactNode
  onViewAll: string
  /** When false, hide duplicate “View All” (e.g. second stacked car row). */
  showMobileViewAll?: boolean
  wrapClassName?: string
  breakpoints?: typeof COLLECTION_BREAKPOINTS
  rewind?: boolean
}) {
  const swiperRef = useRef<SwiperInstance | null>(null)
  const rewind = rewindProp ?? items.length < 6

  useEffect(() => {
    const swiper = swiperRef.current
    if (!swiper) return
    swiper.update()
    if (items.length > 1) {
      swiper.slideTo(0, 0)
    }
  }, [items])

  return (
    <div className={[styles.collectionSliderWrap, wrapClassName].filter(Boolean).join(' ')}>
      <Swiper
        onSwiper={(s) => (swiperRef.current = s)}
        modules={[Navigation, Autoplay]}
        loop={!rewind}
        rewind={rewind}
        roundLengths
        speed={800}
        slidesPerView='auto'
        centeredSlides={false}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        breakpoints={breakpoints}
        className={styles.collectionSwiper}
      >
        {items.map((item, index) => (
          <SwiperSlide key={item.id} className={styles.collectionSlide}>
            {renderItem(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>

      <div className={styles.collectionActions}>
        <div className={styles.navGroup}>
          <button type='button' className={styles.navBtn} aria-label='Previous' onClick={() => swiperRef.current?.slidePrev()}>
            <ArrowLeftIcon />
          </button>
          <button type='button' className={styles.navBtn} aria-label='Next' onClick={() => swiperRef.current?.slideNext()}>
            <ArrowRightIcon />
          </button>
        </div>
        {showMobileViewAll ? (
          <Link href={onViewAll} className={styles.viewAllMobile}>
            <span>View All</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function CollectionCardsLoader({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.collectionLoader} aria-busy='true' aria-label='Loading vehicles'>
      <div className={styles.collectionLoaderTrack}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.collectionLoaderCard}>
            <div className={`${styles.collectionLoaderThumb} ${styles.collectionLoaderShimmer}`} />
            <div className={styles.collectionLoaderBody}>
              <div className={`${styles.collectionLoaderLine} ${styles.collectionLoaderShimmer}`} />
              <div className={`${styles.collectionLoaderLine} ${styles.collectionLoaderLineSm} ${styles.collectionLoaderShimmer}`} />
              <div className={styles.collectionLoaderSpecs}>
                <div className={`${styles.collectionLoaderPill} ${styles.collectionLoaderShimmer}`} />
                <div className={`${styles.collectionLoaderPill} ${styles.collectionLoaderShimmer}`} />
                <div className={`${styles.collectionLoaderPill} ${styles.collectionLoaderShimmer}`} />
              </div>
            </div>
            <div className={`${styles.collectionLoaderFooter} ${styles.collectionLoaderShimmer}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Car Collection ---------- */
export function CarCollection({ items }: { items?: CarItem[] } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const isLoading = items === undefined
  const data = items ?? []
  const mobileSingleRow = useCarHomeSingleRowMobile()
  const mid = Math.ceil(data.length / 2)
  const carsRow1 = data.slice(0, mid)
  const carsRow2 = data.slice(mid)

  const renderCar = (item: { id: string }) => <CarCard car={item as CarItem} />
  const renderCarRow2 = (item: { id: string }) => <CarCard car={item as CarItem} />
  // Only switch to 2-row layout once the media query has actually resolved
  // (mobileSingleRow === null means not yet measured — keep single row to avoid flash)
  const twoRowDesktop = !isLoading && mobileSingleRow === false && carsRow2.length > 0

  return (
    <section ref={sectionRef} className={styles.collection}>
      <div className={styles.collectionInner}>
        <div className={styles.collectionHead}>
          <h3 data-aos='fade-up' className={`${styles.collectionTitle}`}>
            Our Luxury Cars For Rent
          </h3>
          <Link href='/product/search?type=Car' className={styles.viewAllBtn}>
            <span>View All</span>
          </Link>
        </div>

        {isLoading ? (
          <CollectionCardsLoader count={6} />
        ) : twoRowDesktop ? (
          <div data-aos='fade-up' className={`${styles.collectionCarRows}`}>
            <CollectionCarousel items={carsRow1} renderItem={renderCar} onViewAll='/product/search?type=Car' />
            <CollectionCarousel
              items={carsRow2}
              renderItem={renderCarRow2}
              onViewAll='/product/search?type=Car'
              showMobileViewAll={false}
              wrapClassName={styles.collectionCarRowFollow}
            />
          </div>
        ) : (
          <div data-aos='fade-up'>
            <CollectionCarousel items={data} renderItem={renderCar} onViewAll='/product/search?type=Car' />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * @param variant "list" — product list / search results: outlined pill CTAs
 *   (Angular `.action-btn` / `.whatsapp-btn` on list.component + search).
 */
export function CarCard({
  car,
  variant = 'default',
  productHref,
  onMediaLoad
}: {
  car: CarItem
  variant?: 'default' | 'list'
  productHref?: string
  /** Fired when the hero image finishes loading or errors (for list-page readiness). */
  onMediaLoad?: () => void
}) {
  const hydrated = useHydrated()
  const router = useRouter()
  const memberDiscountPercent = useMemberDiscountPercent()
  const href = productHref ?? vehicleProductPath(car.url_key)
  const showMemberDiscount = memberDiscountPercent && hasMemberPriceDrop(car.regularRateDaily, car.dailyRate)

  const images = useMemo(() => cardDisplayImages(car), [car])

  return (
    <article
      className={[styles.carCard, variant === 'list' ? styles.carCardList : ''].filter(Boolean).join(' ')}
      role='link'
      tabIndex={0}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest("a, button, input, textarea, select, [role='button']")) return
        router.push(href)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        router.push(href)
      }}
    >
      <VehicleCardThumbnail
        images={images}
        href={href}
        title={car.name}
        onFirstImageLoad={onMediaLoad}
        wishlist={<WishlistHeart itemKey={car.id} initialWishlist={Boolean(car.is_wishlist)} />}
      />
      <div className={styles.cardBody}>
        <div className={styles.carInfo}>
          <div className={styles.carInfoContent}>
            <h4 className={styles.carName}>{car.name}</h4>
            <h5 className={styles.transmission}>{car.transmission}</h5>
          </div>
          {car.isvipNumberPlate && <span className={styles.specialTag}>Special Plate</span>}
        </div>

        <div className={styles.specs}>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/petrol2.svg')} alt='Fuel type' />
            <h6>{car.fuelType}</h6>
          </div>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/mileage2.svg')} alt='Mileage' />
            <h6>{car.mileage} km/day</h6>
          </div>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/seat2.png')} alt='Seats' />
            <h6>{car.seating_capacity} Pax</h6>
          </div>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.priceBlock}>
          {showMemberDiscount ? <MemberDiscountNote percent={memberDiscountPercent} compact className={styles.cardDiscountNote} /> : null}
          {hasMemberPriceDrop(car.regularRateDaily, car.dailyRate) ? (
            <span className={styles.oldPrice}>
              <StrikePriceWrap>
                <FormattedPrice amount={car.regularRateDaily} fromAED strikethrough currencyCode={hydrated ? undefined : 'AED'} /> /day
              </StrikePriceWrap>
            </span>
          ) : null}
          <div className={styles.priceMain}>
            <h6 className={styles.newPrice}>
              <FormattedPrice amount={car.dailyRate} fromAED currencyCode={hydrated ? undefined : 'AED'} />
            </h6>
            <span className={styles.pricePeriod}>/day</span>
          </div>
        </div>
        <div className={styles.actions}>
          <a href='tel:+97180044678' className={styles.actionBtn} data-variant='call' aria-label='Call'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/call-action.svg')} alt='Call' />
          </a>
          <a href={WA_HREF} target='_blank' rel='noreferrer' className={styles.actionBtn} data-variant='whatsapp' aria-label='WhatsApp'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='WhatsApp' />
          </a>
        </div>
      </div>
    </article>
  )
}

/* ---------- Yacht Collection ---------- */
export function YachtCollection({ items }: { items?: YachtItem[] } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const isLoading = items === undefined
  const data = items ?? []

  const renderYacht = (item: { id: string }) => <YachtCard yacht={item as YachtItem} />

  return (
    <section ref={sectionRef} className={`${styles.collection} ${styles.yachtPadding}`}>
      <div className={styles.collectionInner}>
        <div className={styles.collectionHead}>
          <h3 data-aos='fade-up' className={`${styles.collectionTitle}`}>
            Our Luxury Yacht Charter
          </h3>
          <Link href='/product/search?type=Yachts' className={styles.viewAllBtn}>
            <span>View All</span>
          </Link>
        </div>

        {isLoading ? (
          <CollectionCardsLoader count={4} />
        ) : (
          <div data-aos='fade-up'>
            <CollectionCarousel items={data} renderItem={renderYacht} onViewAll='/product/search?type=Yachts' />
          </div>
        )}
      </div>
    </section>
  )
}

export function YachtCard({ yacht, productHref }: { yacht: YachtItem; productHref?: string }) {
  const hydrated = useHydrated()
  const router = useRouter()
  const memberDiscountPercent = useMemberDiscountPercent()
  const href = productHref ?? vehicleProductPath(yacht.url_key)
  const showMemberDiscount = memberDiscountPercent && hasMemberPriceDrop(yacht.regularRateHourly, yacht.hourlyRate)

  const images = useMemo(() => cardDisplayImages(yacht), [yacht])

  return (
    <article
      className={styles.carCard}
      role='link'
      tabIndex={0}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest("a, button, input, textarea, select, [role='button']")) return
        router.push(href)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        router.push(href)
      }}
    >
      <VehicleCardThumbnail
        images={images}
        href={href}
        title={yacht.name}
        wishlist={<WishlistHeart itemKey={yacht.id} initialWishlist={Boolean(yacht.is_wishlist)} />}
      />
      <div className={styles.cardBody}>
        <div className={styles.carInfo}>
          <div>
            <h4 className={styles.carName}>{yacht.name}</h4>
            <h5 className={styles.transmission}>{yacht.bodyType}</h5>
          </div>
        </div>

        <div className={styles.specs}>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/year2.svg')} alt='Year' />
            <h6>{yacht.year}</h6>
          </div>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/length.svg')} alt='Length' />
            <h6>{yacht.length}</h6>
          </div>
          <div className={styles.specItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/guests.svg')} alt='Guests' />
            <h6>{yacht.guest_capacity} Guests</h6>
          </div>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.priceBlock}>
          {showMemberDiscount ? <MemberDiscountNote percent={memberDiscountPercent} compact className={styles.cardDiscountNote} /> : null}
          {hasMemberPriceDrop(yacht.regularRateHourly, yacht.hourlyRate) ? (
            <span className={styles.oldPrice}>
              <StrikePriceWrap>
                <FormattedPrice amount={yacht.regularRateHourly} fromAED strikethrough currencyCode={hydrated ? undefined : 'AED'} /> /hr
              </StrikePriceWrap>
            </span>
          ) : null}
          <div className={styles.priceMain}>
            <h6 className={styles.newPrice}>
              <FormattedPrice amount={yacht.hourlyRate} fromAED currencyCode={hydrated ? undefined : 'AED'} />
            </h6>
            <span className={styles.pricePeriod}>/hr</span>
          </div>
        </div>
        <div className={styles.actions}>
          <a href='tel:+97180044678' className={styles.actionBtn} data-variant='call' aria-label='Call'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/call-action.svg')} alt='Call' />
          </a>
          <a href={WA_HREF} target='_blank' rel='noreferrer' className={styles.actionBtn} data-variant='whatsapp' aria-label='WhatsApp'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='WhatsApp' />
          </a>
        </div>
      </div>
    </article>
  )
}

const DEFAULT_CAR_TYPES_HEADING = 'Explore Our Luxury Car Rentals in Dubai - Choose Your Car Type'

function carTypeHoverSpanClass(name: string): string {
  const short = name.trim().length <= 6
  return short ? `${styles.hoverSpan} ${styles.hoverSpanShort}` : `${styles.hoverSpan} ${styles.hoverSpanLong}`
}

/* ---------- Car Types ---------- */
export function CarTypes({
  items,
  heading,
  activeUrlKey
}: {
  items?: CarType[]
  /** Default: home hero copy. Product list uses "Explore by car type". */
  heading?: string
  /** Highlights the current category on /product/list/[url_key]. */
  activeUrlKey?: string | null
} = {}) {
  const data = items ?? []
  const title = heading ?? 'Explore Our Luxury Car Rentals in Dubai - Choose Your Car Type'
  if (!data.length) return null
  return (
    <section className={styles.carTypesSection}>
      <h3 data-aos='fade-up' className={styles.carTypesHeading}>
        {title}
      </h3>

      {/* Desktop (xl and up): inline flex row */}
      <div data-aos='fade-up' data-aos-delay='100' className={styles.carTypesContainerDesktop}>
        <div className={styles.carTypesRow}>
          {data.map((type) => {
            const isActive = Boolean(activeUrlKey && type.url_key === activeUrlKey)
            return (
              <div key={`desk-${type.url_key}`} className={`${styles.carTypeCell} ${isActive ? styles.carTypeCellActive : ''}`.trim()}>
                <Link
                  href={`/product/list/${encodeURIComponent(type.url_key ?? '')}`}
                  title={type.title}
                  className={isActive ? `${styles.hoverA} ${styles.hoverAActive}` : styles.hoverA}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={carTypeHoverSpanClass(type.name)} aria-hidden>
                    {type.name}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={carTypeUrl(type.image)} alt={type.alt} title={type.title} className={styles.categoryImage} loading='eager' />
                  <p className={styles.typeMargin}>{type.name}</p>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tablet/Mobile: grid layout */}
      <div data-aos='fade-up' data-aos-delay='100' className={styles.carTypesContainerMobile}>
        <div className={styles.carTypesGridMobile}>
          {data.map((type) => {
            const isActive = Boolean(activeUrlKey && type.url_key === activeUrlKey)
            return (
              <div key={`mob-${type.url_key}`} className={`${styles.carTypeCell} ${isActive ? styles.carTypeCellActive : ''}`.trim()}>
                <Link
                  href={`/product/list/${encodeURIComponent(type.url_key ?? '')}`}
                  title={type.title}
                  className={isActive ? `${styles.hoverA} ${styles.hoverAActive}` : styles.hoverA}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={carTypeHoverSpanClass(type.name)} aria-hidden>
                    {type.name}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={carTypeUrl(type.image)} alt={type.alt} title={type.title} className={styles.categoryImage} loading='eager' />
                  <p className={styles.typeMargin}>{type.name}</p>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Brands ---------- */
export function BrandsMarquee({ items, title = 'Rent Your Favorite Brand' }: { items?: BrandItem[]; title?: string | null } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const data = items && items.length ? items : fallbackBrands

  const brandHref = (brand: BrandItem) => {
    const key = brand.url_key ? String(brand.url_key).trim() : ''
    return key ? `/product/search?type=Car&brand=${encodeURIComponent(key)}` : '/product/search?type=Car'
  }
  return (
    <section ref={sectionRef} className={styles.brandsSection}>
      {title ? (
        <div className={styles.containerFluid}>
          <h2 data-aos='fade-up' className={`${styles.brandsTitle}`}>
            {title}
          </h2>
        </div>
      ) : null}
      <div data-aos='fade-up' className={`${styles.marqueeContainer}`}>
        <div className={styles.marqueeTrack}>
          <div className={styles.marqueeContent}>
            {data.map((brand) => (
              <Link href={brandHref(brand)} className={styles.brandItem} key={`a-${brand.url_key}`} aria-label={brand.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandUrl(brand.image)}
                  alt={brand.name}
                  title={brand.name}
                  className={styles.brandLogo}
                  loading='eager'
                  decoding='async'
                />
              </Link>
            ))}
          </div>
          <div className={styles.marqueeContent}>
            {data.map((brand) => (
              <Link href={brandHref(brand)} className={styles.brandItem} key={`b-${brand.url_key}`} aria-label={brand.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandUrl(brand.image)}
                  alt={brand.name}
                  title={brand.name}
                  className={styles.brandLogo}
                  loading='eager'
                  decoding='async'
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Services ---------- */
export type HomeServicesContent = {
  label?: string
  title?: string
  description?: string
  buttonText?: string
  heroImage?: string
  cards?: Array<{
    href: string
    image: string
    alt: string
    title: string
    description: string
    buttonText?: string
  }>
}

export function Services({ content }: { content?: HomeServicesContent } = {}) {
  const serviceCards = content?.cards ?? [
    {
      href: '/services#car-service',
      image: 'home/services/rent-luxury-cars-in-dubai-from-ghost-rentals.webp',
      alt: 'Luxury Car Rental Services',
      title: 'Luxury Car Rental Services',
      description:
        'Find the best Luxury Car Rentals in Dubai with Ghost Rentals. Choose Rolls-Royce, Lamborghini & Range Rover with free UAE delivery.',
      buttonText: 'know more'
    },
    {
      href: '/services#yacht-service',
      image: 'home/services/yacht-rentals-in-dubai-from-ghost-rentals.webp',
      alt: 'Luxury Yacht Rental Services',
      title: 'Luxury Yacht Rental Services',
      description:
        'Sail by Dubai\u2019s famous landmarks with our crewed and catered Luxury Yacht charter services for any occasion, with a Professional crew.',
      buttonText: 'know more'
    },
    {
      href: '/services#chauffeur-service',
      image: 'home/services/chauffeur-services-in-dubai-from-ghost-rentals.webp',
      alt: 'Luxury Chauffeur Services',
      title: 'Luxury Chauffeur Services',
      description:
        'At Ghost Rentals, we excel at Luxury travel. Our top-notch Luxury Chauffeur services in Dubai provide unparalleled elegance for every trip.',
      buttonText: 'know more'
    }
  ]

  const label = content?.label ?? 'Our Rental Services'
  const title = content?.title ?? 'That Redefines Luxury Travel'
  const description =
    content?.description ??
    'We specialize in Luxury Car hire & Yacht rental across the UAE, creating complete Luxury experiences with personalized attention beyond simple rentals.'
  const buttonText = content?.buttonText ?? 'View All'
  const heroImage = content?.heroImage ?? toAssetUrl('home/services/luxury-car-rental-services-dubai.webp')

  return (
    <section className={styles.services}>
      <div className={styles.serviceHero}>
        <CmsImage
          className={styles.serviceHeroImage}
          src={heroImage}
          fallbackAsset='home/services/luxury-car-rental-services-dubai.webp'
          alt='Our Rental Services'
          loading='eager'
          fetchPriority='high'
          decoding='async'
        />

        <div className={styles.serviceHeroContent}>
          <div className={styles.serviceHeroInner}>
            <h3 data-aos='fade-up' className={`${styles.serviceHeroLabel}`}>
              {label}
            </h3>
            <h2 data-aos='fade-up' className={`${styles.serviceHeroHeading}`}>
              {title}
            </h2>
            <CmsRichText data-aos='fade-up' as='p' value={description} className={`${styles.serviceHeroText}`} />
            <Link data-aos='fade-up' href='/services' className={`${styles.whiteButton}`} data-text={buttonText}>
              <span>{buttonText}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.servicesCardsWrap}>
        <div className={styles.servicesGrid}>
          {serviceCards.map((card, index) => (
            <Link data-aos='fade-up' key={card.href} href={card.href} className={`${styles.serviceCard}`}>
              <div className={styles.serviceCardImageWrap}>
                <CmsImage
                  src={card.image}
                  fallbackAsset={
                    [
                      'home/services/rent-luxury-cars-in-dubai-from-ghost-rentals.webp',
                      'home/services/yacht-rentals-in-dubai-from-ghost-rentals.webp',
                      'home/services/chauffeur-services-in-dubai-from-ghost-rentals.webp'
                    ][index] ?? 'home/services/rent-luxury-cars-in-dubai-from-ghost-rentals.webp'
                  }
                  alt={card.alt}
                  loading='lazy'
                />
              </div>
              <div className={styles.serviceCardBody}>
                <h4 className={styles.serviceCardTitle}>{card.title}</h4>
                <CmsRichText as='p' value={card.description} className={styles.serviceCardText} />
                <span className={styles.knowMore}>{card.buttonText?.trim() || 'know more'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- VIP Number Plate ---------- */
export type VipNumberPlateContent = {
  title?: string
  subtitle?: string
  description?: string
  buttonText?: string
  image?: string
}

export function VipNumberPlate({
  className,
  content
}: {
  className?: string
  content?: VipNumberPlateContent
} = {}) {
  const title = content?.title ?? 'Drive Like a VIP'
  const subtitle = content?.subtitle ?? 'Rent Cars with VIP Number Plates'
  const description =
    content?.description ??
    'Rent Cars with VIP number plates in Dubai, unique Luxury symbols that turn any drive into a statement. These highly demanded plates are more than just numbers they are status symbols and conversation starters that demand respect and attention anywhere you go.'
  const buttonText = content?.buttonText ?? 'Rent a VIP Car'
  const image = content?.image ?? toAssetUrl('vip/rent-luxury-cars-from-ghost-rentals-dubai.webp')

  return (
    <section className={[styles.vipNumberPlate, className].filter(Boolean).join(' ')}>
      <div className={styles.vipGrid}>
        <div className={styles.vipText}>
          <h2 data-aos='fade-up' data-aos-delay='100' className={`${styles.vipHeading}`}>
            {title}
          </h2>
          <h3 data-aos='fade-up' data-aos-delay='200' className={`${styles.vipSubheading}`}>
            {subtitle}
          </h3>
          <CmsRichText data-aos='fade-up' data-aos-delay='300' as='p' value={description} className={`${styles.vipDescription}`} />
          <Link
            data-aos='fade-up'
            data-aos-delay='400'
            href='/product/search?vip=true'
            className={`${styles.blackButton}`}
            data-text={buttonText}
          >
            <span>{buttonText}</span>
          </Link>
        </div>

        <div data-aos='fade-up' data-aos-delay='0' className={`${styles.vipImageWrap}`}>
          <CmsImage
            src={image}
            fallbackAsset='vip/rent-luxury-cars-from-ghost-rentals-dubai.webp'
            alt='G wagon VIP number plate Mercedes luxury rental Dubai'
            title='G Wagon VIP Number Plate Mercedes Dubai Rental'
            className={styles.vipImage}
            loading='lazy'
          />
        </div>
      </div>
    </section>
  )
}

/* ---------- Our Partners ---------- */
const PARTNER_BREAKPOINTS = {
  0: { slidesPerView: 1, spaceBetween: 16 },
  575: { slidesPerView: 2, spaceBetween: 18 },
  768: { slidesPerView: 2, spaceBetween: 20 },
  992: { slidesPerView: 4, spaceBetween: 20 }
} as const

const PARTNER_LOGO_CLASS: Partial<Record<PartnerItem['id'], string>> = {
  oneclickdrive: styles.partnerLogoOneclickdrive,
  dubizzle: styles.partnerLogoDubizzle,
  renty: styles.partnerLogoRenty,
  esaad: styles.partnerLogoEsaad,
  fazaa: styles.partnerLogoFazaa,
  hayak: styles.partnerLogoHayak,
  adcb: styles.partnerLogoAdcb,
  tabby: styles.partnerLogoTabby
}

function partnerLogoSrc(logo: string): string {
  const trimmed = logo.trim()
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  return toAssetUrl(trimmed)
}

function partnerOfferLabel(offerTag: string): string {
  const lines = splitCmsHeadingLines(offerTag)
  return lines.join(' ').trim() || offerTag
}

function PartnerCard({ partner }: { partner: PartnerItem }) {
  const [logoError, setLogoError] = useState(false)
  const showLogo = Boolean(partner.logo) && !logoError
  const logoClass = PARTNER_LOGO_CLASS[partner.id]

  return (
    <article className={styles.partnerCard}>
      <div className={styles.partnerCardHeader}>
        <div className={styles.partnerLogoWrap}>
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerLogoSrc(partner.logo!)}
              alt={partner.name}
              title={partner.name}
              className={[styles.partnerLogo, logoClass].filter(Boolean).join(' ')}
              loading='lazy'
              decoding='async'
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className={styles.partnerLogoFallback}>{partner.name}</span>
          )}
        </div>
        <p className={styles.partnerPlatformName}>{partner.name}</p>
      </div>

      <div className={styles.partnerCardBody}>
        <div className={styles.partnerOfferRow}>
          <p className={styles.partnerOfferLine}>
            <span className={styles.partnerOfferAccent} aria-hidden='true' />
            <span className={styles.partnerOfferText} title={partnerOfferLabel(partner.offerTag)}>
              {partnerOfferLabel(partner.offerTag)}
            </span>
          </p>
        </div>
        <CmsRichText as='p' value={partner.description} className={styles.partnerDescription} />
      </div>
    </article>
  )
}

export function OurPartners({ items }: { items?: PartnerItem[] } = {}) {
  const swiperRef = useRef<SwiperInstance | null>(null)
  const data = items?.length ? items : fallbackPartners

  return (
    <section className={styles.partnersSection}>
      <div data-aos='fade-up' className={styles.partnersContainer}>
        <h2 className={`${styles.partnersTitle}`}>Our Partners</h2>

        <div className={`${styles.partnersSliderWrap}`}>
          <Swiper
            onSwiper={(s) => (swiperRef.current = s)}
            modules={[Navigation, Autoplay]}
            loop={data.length > 4}
            slidesPerView={4}
            spaceBetween={20}
            autoplay={{
              delay: 4500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }}
            breakpoints={PARTNER_BREAKPOINTS}
            className={styles.partnersSwiper}
          >
            {data.map((partner) => (
              <SwiperSlide key={partner.id} className={styles.partnerSlide}>
                <PartnerCard partner={partner} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className={styles.partnersNav}>
            <button
              type='button'
              className={styles.partnerNavBtn}
              aria-label='Previous partner'
              onClick={() => swiperRef.current?.slidePrev()}
            >
              <ArrowLeftIcon />
            </button>
            <button type='button' className={styles.partnerNavBtn} aria-label='Next partner' onClick={() => swiperRef.current?.slideNext()}>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- About Us + Experience The Difference ---------- */
export type HomeAboutContent = {
  label?: string
  title?: string
  description?: string
  buttonText?: string
  image?: string
}

export function AboutUs({
  features: featureItems,
  className,
  aboutContent,
  featuresTitle
}: {
  features?: FeatureLike[]
  className?: string
  aboutContent?: HomeAboutContent
  featuresTitle?: string
} = {}) {
  const data = featureItems?.length ? featureItems : fallbackFeatures

  const aboutLabel = aboutContent?.label ?? 'About Ghost Rentals'
  const aboutTitle = aboutContent?.title ?? 'Pure Luxury.\nPure Perfection.'
  const aboutTitleLines = splitCmsHeadingLines(aboutTitle)
  const aboutText =
    aboutContent?.description ??
    'At Ghost Rentals, we turn Luxury Car hire and Yacht Rentals into customized experiences that we design with family-level love. We provide the UAE\u2019s safest and fastest rental services through real attention to detail, creating stunning relationships with every customer.'
  const aboutButton = aboutContent?.buttonText ?? 'know more'
  const aboutImage = aboutContent?.image ?? toAssetUrl('home/about-us-ghost-rentals-dubai.webp')
  const experienceTitle = featuresTitle ?? 'Experience The Difference'

  return (
    <section className={[styles.aboutSection, className].filter(Boolean).join(' ')}>
      <div className={styles.aboutMedia}>
        <CmsImage
          className={styles.aboutImage}
          src={aboutImage}
          fallbackAsset='home/about-us-ghost-rentals-dubai.webp'
          alt='Luxury car and yacht rental'
          title='Luxury car and yacht rental'
          loading='eager'
          fetchPriority='high'
          decoding='async'
        />

        <div className={styles.aboutContent}>
          <div className={styles.aboutInner}>
            <h3 data-aos='fade-up' className={`${styles.aboutLabel}`}>
              {aboutLabel}
            </h3>
            <h2 data-aos='fade-up' className={`${styles.aboutTitle} ${styles.aboutTitleWidth}`}>
              {aboutTitleLines.map((line, index) => (
                <span key={`${line}-${index}`} className={styles.aboutTitleLine}>
                  {line}
                </span>
              ))}
            </h2>
            <CmsRichText data-aos='fade-up' as='p' value={aboutText} className={`${styles.aboutText}`} />
            <Link data-aos='fade-up' href='/about' className={`${styles.whiteButton}`} data-text={aboutButton}>
              <span>{aboutButton}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.experienceBlock}>
        <h3 data-aos='fade-up' className={`${styles.experienceTitle}`}>
          {experienceTitle}
        </h3>

        <div className={styles.featuresGrid}>
          {data.map((feature, index) => {
            const featureIconFallback =
              [
                'images/icons/hire-luxury-cars-from-ghost-rentals-dubai.webp',
                'images/icons/trusted-car-rental-services-from-ghost-rentals.webp',
                'images/icons/247-black.svg',
                'images/icons/map-black.svg'
              ][index] ?? feature.image

            return (
              <div data-aos='fade-up' key={feature.title} className={`${styles.featureCard}`}>
                <CmsImage
                  src={displayFeatureIconSrc(feature.image, featureIconFallback, 'dark')}
                  fallbackAsset={featureIconFallback}
                  alt={feature.alt}
                  title={feature.title}
                  className={styles.featureIcon}
                  loading='lazy'
                />
                <h4 className={styles.featureTitle}>{feature.title}</h4>
                <CmsRichText as='p' value={feature.description} className={styles.featureText} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Trending carousel card (dark rail — not white CarCard) ---------- */
function TrendingCarouselCard({ car }: { car: CarItem }) {
  const hydrated = useHydrated()
  const router = useRouter()
  const memberDiscountPercent = useMemberDiscountPercent()
  const href = vehicleProductPath(car.url_key)
  const showMemberDiscount = memberDiscountPercent && hasMemberPriceDrop(car.regularRateDaily, car.dailyRate)

  const images = useMemo(() => cardDisplayImages(car), [car])

  return (
    <article
      className={styles.trendingRailCard}
      role='link'
      tabIndex={0}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest("a, button, input, textarea, select, [role='button']")) return
        router.push(href)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        router.push(href)
      }}
    >
      <VehicleCardThumbnail
        images={images}
        href={href}
        title={car.name}
        wrapClassName={styles.trendingRailThumb}
        wishlist={<WishlistHeart itemKey={car.id} initialWishlist={Boolean(car.is_wishlist)} />}
      />

      <div className={styles.trendingRailBody}>
        <div className={styles.trendingRailMeta}>
          <p className={styles.trendingRailEyebrow}>Trending now</p>
          <h4 className={styles.trendingRailTitle}>{car.name}</h4>
          <p className={styles.trendingRailSub}>{car.transmission}</p>
        </div>
        {car.isvipNumberPlate ? <span className={styles.trendingRailBadge}>Special plate</span> : null}
      </div>

      <div className={styles.trendingRailFooter}>
        <Link href={href} className={styles.trendingRailPriceBlock}>
          {showMemberDiscount ? (
            <MemberDiscountNote percent={memberDiscountPercent} compact className={styles.trendingDiscountNote} />
          ) : null}
          {hasMemberPriceDrop(car.regularRateDaily, car.dailyRate) ? (
            <StrikePriceWrap className={styles.trendingRailStrike}>
              <FormattedPrice amount={car.regularRateDaily} fromAED strikethrough currencyCode={hydrated ? undefined : 'AED'} />{' '}
              <span className={styles.trendingRailStrikeSuffix}>/ day</span>
            </StrikePriceWrap>
          ) : null}
          <div className={styles.trendingRailPriceRow}>
            <span className={styles.trendingRailPrice}>
              <FormattedPrice amount={car.dailyRate} fromAED currencyCode={hydrated ? undefined : 'AED'} />
            </span>
            <span className={styles.trendingRailPer}>/ day</span>
          </div>
        </Link>
        <div className={styles.trendingRailActions}>
          <a href='tel:+97180044678' className={`${styles.trendingRailBtn} ${styles.trendingRailBtnCall}`} aria-label='Call'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/call-action.svg')} alt='' />
          </a>
          <a
            href={WA_HREF}
            target='_blank'
            rel='noreferrer'
            className={`${styles.trendingRailBtn} ${styles.trendingRailBtnWa}`}
            aria-label='WhatsApp'
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='' />
          </a>
        </div>
      </div>
    </article>
  )
}

/* ---------- Trending cars (Swiper row + dark rail cards) ---------- */
export function TrendingCars({ items }: { items?: CarItem[] } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const data = items && items.length ? items : fallbackTrending

  const renderCar = (item: { id: string }) => <TrendingCarouselCard car={item as CarItem} />

  return (
    <section ref={sectionRef} className={styles.trendingSection}>
      <div className={styles.trendingCollectionGutter}>
        <div className={styles.collectionInner}>
          <div className={styles.trendingSectionHead}>
            <div className={styles.trendingHeadTitles}>
              <h3 data-aos='fade-up' className={`${styles.collectionTitle}`}>
                Trending Rental Cars in Dubai
              </h3>
              <p data-aos='fade-up' className={`${styles.trendingSectionSubtitle}`}>
                rent our popular cars
              </p>
            </div>
          </div>

          <div data-aos='fade-up'>
            <CollectionCarousel
              items={data}
              renderItem={renderCar}
              onViewAll='/product/search?type=Car'
              wrapClassName={styles.trendingCarouselWrap}
              showMobileViewAll={false}
            />
          </div>

          <div className={styles.trendingViewAllRow}>
            <Link href='/product/search?type=Car' className={`${styles.viewAllBtn} ${styles.trendingViewAllBelow}`}>
              <span>View All</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Google Reviews ---------- */
const REVIEW_BREAKPOINTS = {
  0: { slidesPerView: 1, spaceBetween: 10 },
  430: { slidesPerView: 1, spaceBetween: 10 },
  575: { slidesPerView: 1, spaceBetween: 15 },
  768: { slidesPerView: 1.5, spaceBetween: 20 },
  992: { slidesPerView: 2.5, spaceBetween: 15 },
  1281: { slidesPerView: 3.5, spaceBetween: 20 },
  1400: { slidesPerView: 3.5, spaceBetween: 20 },
  1921: { slidesPerView: 3.5, spaceBetween: 20 }
} as const

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className={styles.ratingStars}>
      {Array.from({ length: safeRating }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={toAssetUrl('images/icons/star-iconcolor.svg')} alt='star' title='star icon' className={styles.starIcon} />
      ))}
    </span>
  )
}

export function GoogleReviews({ reviews }: { reviews?: GoogleReview[] } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const swiperRef = useRef<SwiperInstance | null>(null)
  const data = reviews && reviews.length ? reviews : fallbackGoogleReviews

  return (
    <section ref={sectionRef} className={styles.googleReviews}>
      <div className={styles.reviewsContainer}>
        <h3 data-aos='fade-up' className={`${styles.googleReviewsTitle}`}>
          <AssetImageWithFallback
            className={styles.reviewIcon}
            path='home/google-review-image.png'
            alt='google-review-icon'
            width={188}
            height={64}
            loading='lazy'
          />
          <span>Reviews</span>
        </h3>

        <div data-aos='fade-up' className={`${styles.reviewsSummary}`}>
          <p className={styles.ratingLine}>
            <strong className={styles.ratingNumber}>{googleSummary.rating.toFixed(1)}</strong>
            <Stars rating={5} />
            <strong className={styles.googleGrey}>({googleSummary.totalReviews})</strong>
          </p>
          <p className={styles.viewMoreLine}>
            <a className={styles.viewMoreLink} href={googleSummary.mapUrl} target='_blank' rel='noreferrer'>
              <strong>View More</strong>
            </a>
          </p>
        </div>

        <div data-aos='fade-up' className={`${styles.reviewsSliderWrap}`}>
          <Swiper
            onSwiper={(s) => (swiperRef.current = s)}
            modules={[Navigation, Autoplay]}
            loop
            autoHeight
            slidesPerView={1}
            spaceBetween={5}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }}
            breakpoints={REVIEW_BREAKPOINTS}
            className={styles.reviewsSwiper}
          >
            {data.map((review) => (
              <SwiperSlide key={review.author_name} className={styles.reviewSlide}>
                <a href={review.author_url} target='_blank' rel='noreferrer' className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAuthor}>
                      <ReviewerAvatar
                        name={review.author_name}
                        src={review.profile_photo_url}
                        className={styles.profileImg}
                        width={50}
                        height={50}
                      />
                      <div>
                        <p className={styles.authorName}>{review.author_name}</p>
                        <span className={styles.reviewTime}>{review.relative_time_description}</span>
                      </div>
                    </div>
                    <AssetImageWithFallback
                      className={styles.gphoto}
                      path='home/google_icon.png'
                      alt='Google'
                      title='google photo'
                      width={18}
                      loading='lazy'
                    />
                  </div>

                  <div className={styles.reviewStars}>
                    <Stars rating={review.rating} />
                  </div>

                  <div className={styles.reviewBody}>
                    <p className={styles.reviewText}>{review.text}</p>
                  </div>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className={styles.reviewsNav}>
            <button
              type='button'
              className={styles.reviewNavBtn}
              aria-label='Previous review'
              onClick={() => swiperRef.current?.slidePrev()}
            >
              <ArrowLeftIcon />
            </button>
            <button type='button' className={styles.reviewNavBtn} aria-label='Next review' onClick={() => swiperRef.current?.slideNext()}>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Follow Our Journey (YouTube + Instagram) ---------- */
const SOCIAL_YOUTUBE_HREF = 'https://www.youtube.com/@GhostRentalsDXB'
const SOCIAL_INSTAGRAM_HREF = 'https://www.instagram.com/ghost.rentals/?hl=en'

type YoutubeShowcaseVideo = {
  id: string
  title: string
  href: string
}

function youtubeVideosFromPosts(posts: SocialPostItem[] | undefined): YoutubeShowcaseVideo[] {
  return (posts ?? [])
    .filter((post) => post.platform === 'youtube')
    .map((post) => {
      const id = extractYoutubeVideoId(post.href)
      if (!id) return null
      return {
        id,
        title: post.alt?.trim() && post.alt !== 'Ghost Rentals on YouTube' ? post.alt : 'Ghost Rentals',
        href: post.href
      } satisfies YoutubeShowcaseVideo
    })
    .filter((video): video is YoutubeShowcaseVideo => video !== null)
}

function youtubeEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    rel: '0',
    playsinline: '1',
    modestbranding: '1'
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

function YoutubePlayGlyph({ size = 68 }: { size?: number }) {
  return (
    <svg viewBox='0 0 68 48' width={size} height={Math.round((size * 48) / 68)} focusable='false' aria-hidden='true'>
      <path
        d='M66.52 7.74a8 8 0 0 0-5.64-5.66C55.66 1 34 1 34 1S12.34 1 7.12 2.08A8 8 0 0 0 1.48 7.74 83.34 83.34 0 0 0 0 24a83.34 83.34 0 0 0 1.48 16.26 8 8 0 0 0 5.64 5.66C12.34 47 34 47 34 47s21.66 0 26.88-1.08a8 8 0 0 0 5.64-5.66A83.34 83.34 0 0 0 68 24a83.34 83.34 0 0 0-1.48-16.26z'
        fill='#1d1d1d'
        fillOpacity='0.85'
      />
      <path d='M45 24 27 14v20' fill='#fff' />
    </svg>
  )
}

function YoutubeBrandIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox='0 0 24 24' width={size} height={size} focusable='false' aria-hidden='true'>
      <path
        fill='#FF0000'
        d='M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8z'
      />
      <path fill='#fff' d='M9.75 15.5v-7l6 3.5-6 3.5z' />
    </svg>
  )
}

function InstagramBrandIcon({ size = 22 }: { size?: number }) {
  const gradId = 'igBrandGradSocial'
  return (
    <svg viewBox='0 0 24 24' width={size} height={size} focusable='false' aria-hidden='true'>
      <defs>
        <radialGradient id={gradId} cx='30%' cy='107%' r='150%'>
          <stop offset='0%' stopColor='#fdf497' />
          <stop offset='5%' stopColor='#fdf497' />
          <stop offset='45%' stopColor='#fd5949' />
          <stop offset='60%' stopColor='#d6249f' />
          <stop offset='90%' stopColor='#285AEB' />
        </radialGradient>
      </defs>
      <path fill={`url(#${gradId})`} d='M7.5 3.5h9A4 4 0 0 1 20.5 7.5v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z' />
      <circle cx='12' cy='12' r='3.6' fill='none' stroke='#fff' strokeWidth='1.6' />
      <circle cx='17.2' cy='6.8' r='1.05' fill='#fff' />
    </svg>
  )
}

function InstagramGridCell({ post }: { post: SocialPostItem }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const playAsReel = Boolean(post.isVideo || post.videoSrc || isInstagramReelHref(post.href))
  const embedSrc = playAsReel ? toInstagramEmbedSrc(post.href) : ''

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { threshold: 0.15, rootMargin: '200px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={styles.socialInstagramLink}>
      {post.src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.src}
          alt={post.alt}
          className={styles.socialInstagramMedia}
          width={360}
          height={640}
          loading='lazy'
          decoding='async'
        />
      ) : (
        <span className={styles.socialInstagramPlaceholder} aria-hidden='true'>
          <InstagramBrandIcon size={28} />
        </span>
      )}

      {playAsReel && inView ? (
        <div className={styles.socialInstagramEmbedShell}>
          <iframe
            key={`${post.id}-${inView ? 'on' : 'off'}`}
            className={styles.socialInstagramEmbed}
            src={embedSrc}
            title={post.alt}
            loading='eager'
            allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
            referrerPolicy='strict-origin-when-cross-origin'
          />
        </div>
      ) : null}
    </div>
  )
}

export function FollowOurJourney({
  socialPosts,
  youtubeChannelStats,
  instagramProfileStats
}: {
  socialPosts?: SocialPostItem[]
  youtubeChannelStats?: YoutubeChannelStats | null
  instagramProfileStats?: InstagramProfileStats | null
} = {}) {
  const youtubeVideos = useMemo(() => youtubeVideosFromPosts(socialPosts), [socialPosts])
  const subscriberLabel = formatSubscriberLabel(youtubeChannelStats)
  const followerLabel = formatFollowerLabel(instagramProfileStats)
  const [activeId, setActiveId] = useState(youtubeVideos[0]?.id ?? '')
  const [youtubeInView, setYoutubeInView] = useState(false)
  const youtubeFrameRef = useRef<HTMLDivElement>(null)
  const [mediaById, setMediaById] = useState<Record<string, { src?: string; videoSrc?: string; isVideo?: boolean }>>({})
  const fetchedMediaIdsRef = useRef<Set<string>>(new Set())

  const instagramPosts = useMemo(
    () =>
      (socialPosts ?? [])
        .filter((post) => post.platform === 'instagram')
        .slice(0, INSTAGRAM_GRID_LIMIT)
        .map((post) => ({
          ...post,
          src: post.src || mediaById[post.id]?.src || '',
          videoSrc: post.videoSrc || mediaById[post.id]?.videoSrc,
          isVideo: post.isVideo || mediaById[post.id]?.isVideo || isInstagramReelHref(post.href)
        })),
    [socialPosts, mediaById]
  )

  const activeVideo = youtubeVideos.find((v) => v.id === activeId) ?? youtubeVideos[0]
  const posterSrc = activeVideo ? `https://i.ytimg.com/vi/${activeVideo.id}/hqdefault.jpg` : ''
  const embedSrc = activeVideo ? youtubeEmbedSrc(activeVideo.id) : ''

  useEffect(() => {
    if (!youtubeVideos.some((video) => video.id === activeId)) {
      setActiveId(youtubeVideos[0]?.id ?? '')
    }
  }, [youtubeVideos, activeId])

  useEffect(() => {
    if (!activeVideo) return

    const node = youtubeFrameRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setYoutubeInView(entry.isIntersecting)
      },
      { threshold: 0.25, rootMargin: '120px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [activeVideo?.id])

  useEffect(() => {
    const pending = (socialPosts ?? []).filter(
      (post) => post.platform === 'instagram' && (!post.src || !post.isVideo) && !fetchedMediaIdsRef.current.has(post.id)
    )
    if (!pending.length) return

    pending.forEach((post) => fetchedMediaIdsRef.current.add(post.id))

    let cancelled = false

    const hydrateMedia = async () => {
      const results = await Promise.all(
        pending.map(async (post) => {
          try {
            const params = new URLSearchParams({ url: post.href })
            const response = await fetch(`/api/instagram-thumbnail?${params.toString()}`)
            if (!response.ok) return null
            const data = (await response.json()) as {
              thumbnail?: string
              videoUrl?: string
              isVideo?: boolean
            }
            const src = typeof data.thumbnail === 'string' ? data.thumbnail.trim() : ''
            const videoSrc = typeof data.videoUrl === 'string' ? data.videoUrl.trim() : ''
            const isVideo = Boolean(data.isVideo || videoSrc || isInstagramReelHref(post.href))
            if (!src && !videoSrc && !isVideo) return null
            return [post.id, { src: src || undefined, videoSrc: videoSrc || undefined, isVideo }] as const
          } catch {
            return null
          }
        })
      )

      if (cancelled) return

      const next: Record<string, { src?: string; videoSrc?: string; isVideo?: boolean }> = {}
      for (const entry of results) {
        if (entry) next[entry[0]] = entry[1]
      }
      if (Object.keys(next).length) {
        setMediaById((current) => ({ ...current, ...next }))
      }
    }

    void hydrateMedia()

    return () => {
      cancelled = true
    }
  }, [socialPosts])

  return (
    <section className={styles.socialShowcase} aria-labelledby='follow-our-journey-title'>
      <div className={styles.socialShowcaseInner}>
        <header data-aos='fade-up' className={styles.socialShowcaseHeader}>
          <p className={styles.socialShowcaseEyebrow}>Follow Our Journey</p>
          <h2 id='follow-our-journey-title' className={styles.socialShowcaseTitle}>
            Follow Our Journey
          </h2>
          <p className={styles.socialShowcaseSubtitle}>
            Explore our world of luxury rentals through YouTube and Instagram. Exclusive cars. Iconic destinations. Unforgettable
            experiences.
          </p>
        </header>

        <div className={styles.socialShowcaseColumns}>
          <div className={styles.socialYoutubeLabel}>
            <span className={styles.socialChannelIconWrap}>
              <YoutubeBrandIcon />
            </span>
            <div className={styles.socialYoutubeLabelCopy}>
              <span className={styles.socialSectionLabelText}>YouTube</span>
              {subscriberLabel ? <span className={styles.socialSubscriberCount}>{subscriberLabel}</span> : null}
            </div>
          </div>

          <div className={styles.socialInstagramHead}>
            <div className={styles.socialSectionLabel}>
              <span className={styles.socialChannelIconWrap}>
                <InstagramBrandIcon />
              </span>
              <div className={styles.socialInstagramLabelCopy}>
                <span className={styles.socialChannelName}>@ghost.rentals</span>
                {followerLabel ? <span className={styles.socialSubscriberCount}>{followerLabel}</span> : null}
              </div>
            </div>
            <a href={SOCIAL_INSTAGRAM_HREF} target='_blank' rel='noreferrer' className={styles.socialOutlineBtnCompact}>
              Follow
            </a>
          </div>

          <div className={styles.socialYoutubeMedia}>
            {activeVideo ? (
              <div ref={youtubeFrameRef} className={styles.socialYoutubeFrame}>
                {youtubeInView ? (
                  <iframe
                    key={activeVideo.id}
                    className={styles.socialYoutubeEmbed}
                    src={embedSrc}
                    title={activeVideo.title}
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    allowFullScreen
                    referrerPolicy='strict-origin-when-cross-origin'
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={posterSrc} alt='' className={styles.socialYoutubePosterImg} loading='lazy' />
                )}
              </div>
            ) : null}

            {youtubeVideos.length > 1 ? (
              <ul className={styles.socialYoutubeRail} role='list'>
                {youtubeVideos.map((video) => {
                  const selected = video.id === activeId
                  const thumb = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`
                  return (
                    <li key={video.id} className={styles.socialYoutubeRailItem}>
                      <button
                        type='button'
                        className={`${styles.socialYoutubeThumbBtn} ${selected ? styles.socialYoutubeThumbBtnActive : ''}`}
                        onClick={() => setActiveId(video.id)}
                        aria-pressed={selected}
                        aria-label={`Play ${video.title}`}
                      >
                        <span className={styles.socialYoutubeThumbMedia}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb} alt='' className={styles.socialYoutubeThumbImg} loading='lazy' />
                          <span className={styles.socialYoutubeThumbPlay}>
                            <YoutubePlayGlyph size={36} />
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          <ul className={styles.socialInstagramGrid}>
            {instagramPosts.map((post) => (
              <li key={post.id} className={styles.socialInstagramCell}>
                <InstagramGridCell post={post} />
              </li>
            ))}
          </ul>

          <a href={SOCIAL_YOUTUBE_HREF} target='_blank' rel='noreferrer' className={styles.socialOutlineBtn}>
            <YoutubeBrandIcon size={18} />
            <span>Subscribe to Our Channel</span>
          </a>
        </div>
      </div>
    </section>
  )
}

/* ---------- FAQ ---------- */
export type FaqContent = {
  title?: string
  subtitle?: string
  buttonText?: string
  items?: Array<{ question: string; answer: string }>
}

export function Faq({
  className,
  content
}: {
  className?: string
  content?: FaqContent
} = {}) {
  const [expandedIndex, setExpandedIndex] = useState<number>(-1)
  const sectionRef = useRef<HTMLElement>(null)

  const title = content?.title ?? 'Frequently Asked Questions'
  const subtitle = content?.subtitle ?? "Got questions? We've got answers to help you navigate your rental experience!"
  const buttonText = content?.buttonText ?? 'Help Center'
  const faqItems = content?.items?.length ? content.items : faqs

  const toggle = (index: number) => {
    setExpandedIndex((current) => (current === index ? -1 : index))
  }

  return (
    <section ref={sectionRef} className={[styles.faqSection, className].filter(Boolean).join(' ')} id='faq'>
      <div className={styles.faqHeader}>
        <h3 data-aos='fade-up' className={`${styles.faqTitle}`}>
          {title}
        </h3>
        <CmsRichText data-aos='fade-up' as='p' value={subtitle} className={`${styles.faqSubtitle}`} />
        <Link data-aos='fade-up' href='/contact' className={`${styles.blackButton}`} data-text={buttonText}>
          <span>{buttonText}</span>
        </Link>
      </div>

      <div className={styles.containerFluid}>
        <div data-aos='fade-up' className={`${styles.faqList}`}>
          {faqItems.map((faq, index) => {
            const isOpen = expandedIndex === index
            const itemClass = `${styles.faqItem} ${isOpen ? styles.expanded : ''}`
            return (
              <div key={faq.question} className={itemClass}>
                <button type='button' className={styles.faqQuestion} onClick={() => toggle(index)} aria-expanded={isOpen}>
                  <h4>{faq.question}</h4>
                  <span className={styles.faqToggle}>{isOpen ? <MinusIcon /> : <PlusIcon />}</span>
                </button>
                <div className={styles.faqAnswer}>
                  <CmsRichText as='p' value={faq.answer} className={styles.faqAnswerHtml} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer — Angular footer.component.html / .scss parity ---------- */
const FOOTER = {
  COMPANY: 'company',
  HOME: 'Home',
  ABOUT_US: 'about us',
  SERVICES: 'Services',
  LEASING: 'Lease to own',
  MEMBERSHIP: 'Membership',
  OUR_CARS: 'Our cars',
  OUR_YACHTS: 'our yachts',
  BLOG: 'Blog',
  SUPPORT: 'Support',
  PRIVACY: 'privacy policy',
  TERMS: 'terms & conditions',
  CONTACT_US: 'contact us',
  CONNECT_WITH_US: 'Connect With Us',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'Youtube',
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook',
  WE_ACCEPT: 'We Accept',
  ALL_RIGHTS: '© 2026, All Rights Reserved Ghost Rentals',
  DESIGN_DEVELOP: 'Design and Developed With',
  BY: 'By',
  PIXTAR: 'Pixtar'
} as const

const FOOTER_SOCIAL = [
  {
    key: 'instagram' as const,
    label: FOOTER.INSTAGRAM,
    href: 'https://www.instagram.com/ghost.rentals/?hl=en',
    icon: 'images/icons/instagram.svg',
    title: 'Follow Ghost Rentals on Instagram',
    alt: 'Ghost Rental Instagram Account',
    youtubeClass: false
  },
  {
    key: 'youtube' as const,
    label: FOOTER.YOUTUBE,
    href: 'https://www.youtube.com/@GhostRentalsDXB',
    icon: 'images/icons/youtube.svg',
    title: 'Subscribe to Ghost Rentals YouTube Channel',
    alt: 'Ghost Rental YouTube Account',
    youtubeClass: true
  },
  {
    key: 'tiktok' as const,
    label: FOOTER.TIKTOK,
    href: 'https://www.tiktok.com/@ghostrentals',
    icon: 'images/icons/tiktok.svg',
    title: 'Follow Ghost Rentals on TikTok',
    alt: 'Ghost Rental TikTok Account',
    youtubeClass: false
  },
  {
    key: 'facebook' as const,
    label: FOOTER.FACEBOOK,
    href: 'https://www.facebook.com/Ghostrentalsdubai',
    icon: 'images/icons/facebook.svg',
    title: 'Follow Ghost Rentals on Facebook',
    alt: 'Ghost Rental Facebook Account',
    youtubeClass: false
  }
]

const FOOTER_PAYMENTS = [
  { name: 'Mastercard', src: 'images/icons/payment/mastercard.svg' },
  { name: 'Bitcoin', src: 'images/icons/payment/bitcoin.svg' },
  { name: 'Paypal', src: 'images/icons/payment/paypal.svg' },
  { name: 'Tabby', src: 'images/icons/payment/tabby.svg' },
  { name: 'Visa', src: 'images/icons/payment/visa.svg' },
  { name: 'American Express', src: 'images/icons/payment/ae.svg' },
  { name: 'Apple Pay', src: 'images/icons/payment/applepay.svg' },
  { name: 'Google Pay', src: 'images/icons/payment/googlepay.svg' },
  { name: 'Samsung Pay', src: 'images/icons/payment/samsungpay.svg' }
]

function footerLinkClass(active: boolean) {
  return [styles.footerNavLink, active ? styles.footerNavLinkActive : ''].filter(Boolean).join(' ')
}

export function Footer() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const activeHome = mounted && pathname === '/'
  const activeAbout = mounted && pathname === '/about'
  const activeServices = mounted && pathname === '/services'
  const activeBlog = mounted && pathname.startsWith('/blog')
  const activeLease = mounted && pathname === '/product/lease'
  const activeMembership = mounted && pathname === '/membership'
  const activeCars = mounted && pathname === '/product/search' && typeParam === 'Car'
  const activeYachts = mounted && pathname === '/product/search' && typeParam === 'Yachts'
  const activePrivacy = mounted && pathname === '/privacy'
  const activeTerms = mounted && pathname === '/terms'
  const activeContact = mounted && pathname === '/contact'

  const [heartActive, setHeartActive] = useState(false)

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTopRow}>
          <div className={styles.footerLogoCol}>
            <div className={styles.footerLogoWrap}>
              <Link href='/'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toAssetUrl('images/logo/footer_logo.svg')}
                  alt='Ghost Rentals- Luxury Vehicle Rentals Dubai'
                  title='Ghost Rentals- Rent luxury car in Dubai'
                  className={styles.footerLogo}
                  loading='lazy'
                  width={264}
                  height={80}
                />
              </Link>
            </div>
          </div>

          <div className={styles.footerLinksCol}>
            <div className={styles.footerGap}>
              <div className={styles.footerGapCol}>
                <h3 className={styles.footerHeading}>{FOOTER.COMPANY}</h3>
                <ul className={styles.footerMenuList}>
                  <li>
                    <Link href='/' className={footerLinkClass(activeHome)}>
                      {FOOTER.HOME}
                    </Link>
                  </li>
                  <li>
                    <Link href='/about' className={footerLinkClass(activeAbout)}>
                      {FOOTER.ABOUT_US}
                    </Link>
                  </li>
                  <li>
                    <Link href='/services' className={footerLinkClass(activeServices)}>
                      {FOOTER.SERVICES}
                    </Link>
                  </li>
                  <li>
                    <Link href='/blog' className={footerLinkClass(activeBlog)}>
                      {FOOTER.BLOG}
                    </Link>
                  </li>
                  <li>
                    <Link href='/product/lease' className={footerLinkClass(activeLease)}>
                      {FOOTER.LEASING}
                    </Link>
                  </li>
                  <li>
                    <Link href='/membership' className={footerLinkClass(activeMembership)}>
                      {FOOTER.MEMBERSHIP}
                    </Link>
                  </li>
                  <li>
                    <Link href='/product/search?type=Car' className={footerLinkClass(activeCars)}>
                      {FOOTER.OUR_CARS}
                    </Link>
                  </li>
                  <li>
                    <Link href='/product/search?type=Yachts' className={footerLinkClass(activeYachts)}>
                      {FOOTER.OUR_YACHTS}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className={styles.footerGapCol}>
                <h3 className={styles.footerHeading}>{FOOTER.SUPPORT}</h3>
                <ul className={`${styles.footerMenuList} ${styles.footerSupportLinks}`}>
                  <li>
                    <Link href='/privacy' className={footerLinkClass(activePrivacy)}>
                      {FOOTER.PRIVACY}
                    </Link>
                  </li>
                  <li>
                    <Link href='/terms' className={footerLinkClass(activeTerms)}>
                      {FOOTER.TERMS}
                    </Link>
                  </li>
                  <li>
                    <Link href='/contact' className={footerLinkClass(activeContact)}>
                      {FOOTER.CONTACT_US}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className={`${styles.footerConnectDesktop} ${styles.footerGapCol}`}>
                <h3 className={`${styles.footerHeading} ${styles.footerConnectHeading}`}>{FOOTER.CONNECT_WITH_US}</h3>
                <ul className={styles.footerSocialListDesktop}>
                  {FOOTER_SOCIAL.map((s) => (
                    <li key={s.key}>
                      <a href={s.href} target='_blank' rel='noreferrer' className={styles.footerSocialRow}>
                        <div className={styles.footerSocialIconDiv}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl(s.icon)}
                            alt={s.alt}
                            title={s.title}
                            className={`${styles.footerSocialIcon} ${s.youtubeClass ? styles.footerSocialIconYoutube : ''} ${s.key === 'tiktok' ? styles.footerSocialIconTiktok : ''}`}
                            loading='eager'
                            width={17}
                            height={17}
                          />
                        </div>
                        <span className={styles.footerSocialLabel}>{s.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${styles.footerPayments} ${styles.footerGapCol}`}>
                <h3 className={styles.footerHeading}>{FOOTER.WE_ACCEPT}</h3>
                <ul className={styles.footerPaymentGrid}>
                  {FOOTER_PAYMENTS.map((payment) => (
                    <li key={payment.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toAssetUrl(payment.src)} alt={payment.name} title={payment.name} loading='lazy' />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.footerConnectMobile}>
              <h3 className={styles.footerHeading}>{FOOTER.CONNECT_WITH_US}</h3>
              <ul className={styles.footerSocialListMobile}>
                {FOOTER_SOCIAL.map((s) => (
                  <li key={s.key}>
                    <a href={s.href} target='_blank' rel='noreferrer' className={styles.footerSocialRow} aria-label={s.label}>
                      <div className={styles.footerSocialIconDiv}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl(s.icon)}
                          alt=''
                          title={s.title}
                          className={`${styles.footerSocialIcon} ${s.youtubeClass ? styles.footerSocialIconYoutube : ''} ${s.key === 'tiktok' ? styles.footerSocialIconTiktok : ''}`}
                          loading='eager'
                          width={17}
                          height={17}
                        />
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.footerCopyrightWrap}>
          <p className={styles.footerCopyrightLeft}>{FOOTER.ALL_RIGHTS}</p>
        </div>
      </div>
    </footer>
  )
}
