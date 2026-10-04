'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { getAllBodyTypes, getAllModels, getBrands, getFilteredVehicles } from '@/lib/api/home'
import type { ApiResponse } from '@/lib/api/client'
import type { RawBrand, RawVehicle } from '@/lib/api/types'
import { toAssetUrl } from '@/lib/config'
import { VEHICLE_PLACEHOLDER_SRC } from '@/lib/mediaUrl'
import { toCarItem, cardSlideImages, vehicleProductPath } from '@/lib/api/adapters'
import { useCardImageSlideshow } from '@/hooks/useCardImageSlideshow'
import { CardSlideImage } from '@/components/shared/CardSlideImage'
import { WishlistHeart } from '@/components/shared/WishlistHeart'
import { CurrencySymbol } from '@/components/shared/CurrencySymbol'
import { FormattedPrice } from '@/components/shared/FormattedPrice'
import { useCurrencyService } from '@/lib/currency-service'
import { LEASE_TO_OWN_DEFAULT_TITLE } from '@/lib/seo/pageTitles'
import styles from './leaseToOwnPage.module.css'
import ps from '../search/productSearch.module.css'
import home from '../home/homeSections.module.css'
import { ResultsPagination } from '../search/ResultsPagination'

type RawBodyType = { _id?: string; name?: string; type?: string; vehicle_type?: string }
type RawModel = { _id?: string; name?: string; brandId?: string; brand_id?: string; brand?: string }
type BrandWithBody = RawBrand & { bodytype_data?: Array<{ _id?: string; name?: string }> }

const PAGE_SIZE = 12
const SLIDER_STEP = 10

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'L-H', label: 'Price: Low to High' },
  { value: 'H-L', label: 'Price: High to Low' }
] as const

const DEFAULT_MONTHS = 12
const MONTHLY_PROFIT_PCT = 4

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '')) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : 0
}

function computeLeaseAED(vehicle: RawVehicle) {
  const vehiclePrice = toNumber(vehicle.purchase_price)
  const insuranceFee = toNumber(vehicle.insurence_price)
  const baseTotal = vehiclePrice + insuranceFee
  const taxAmount = (baseTotal * MONTHLY_PROFIT_PCT) / 100
  const grandTotal = baseTotal + taxAmount * DEFAULT_MONTHS
  const downPayment = grandTotal * 0.25
  const monthlyInstallment = 0.075 * grandTotal
  return { grandTotal, downPayment, monthlyInstallment }
}

function isCarBody(b: RawBodyType) {
  if (b.vehicle_type === 'Yachts' || b.type === 'Yachts') return false
  return !b.vehicle_type || b.vehicle_type === 'Car' || b.type === 'Car'
}

type RangeSliderProps = {
  floor: number
  ceil: number
  step: number
  minVal: number
  maxVal: number
  onChange: (min: number, max: number) => void
  formatLabel?: (v: number) => ReactNode
}

function LeaseRangeSlider({ floor, ceil, step, minVal, maxVal, onChange, formatLabel }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  const span = Math.max(ceil - floor, 1)
  const pct = (v: number) => ((Math.min(Math.max(v, floor), ceil) - floor) / span) * 100
  const lo = Math.min(minVal, maxVal)
  const hi = Math.max(minVal, maxVal)

  const setFromClientX = useCallback(
    (clientX: number, which: 'min' | 'max') => {
      const el = trackRef.current
      if (!el || ceil <= floor) return
      const r = el.getBoundingClientRect()
      let t = (clientX - r.left) / r.width
      t = Math.max(0, Math.min(1, t))
      const raw = floor + t * span
      const snapped = Math.round(raw / step) * step
      const v = Math.max(floor, Math.min(ceil, snapped))
      if (which === 'min') {
        const nextMin = Math.min(v, hi)
        onChange(nextMin, hi)
      } else {
        const nextMax = Math.max(v, lo)
        onChange(lo, nextMax)
      }
    },
    [ceil, floor, onChange, step, span, hi, lo]
  )

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      setFromClientX(e.clientX, dragging)
    }
    const up = () => setDragging(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging, setFromClientX])

  if (ceil <= floor) return null

  const leftPct = pct(lo)
  const widthPct = Math.max(pct(hi) - leftPct, 0)

  return (
    <div className={styles.rangeSlider}>
      <div ref={trackRef} className={styles.rangeTrack}>
        <div className={styles.rangeRail} />
        <div className={styles.rangeFill} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
        <span className={`${styles.rangeThumbLabel} ${styles.rangeThumbLabelMin}`}>{formatLabel ? formatLabel(lo) : Math.round(lo)}</span>
        <button
          type='button'
          aria-label='Minimum monthly payment'
          className={styles.rangeThumb}
          style={{ left: `${leftPct}%` }}
          onPointerDown={(e) => {
            e.preventDefault()
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setDragging('min')
          }}
        />
        <span className={`${styles.rangeThumbLabel} ${styles.rangeThumbLabelMax}`}>{formatLabel ? formatLabel(hi) : Math.round(hi)}</span>
        <button
          type='button'
          aria-label='Maximum monthly payment'
          className={styles.rangeThumb}
          style={{ left: `${pct(hi)}%` }}
          onPointerDown={(e) => {
            e.preventDefault()
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setDragging('max')
          }}
        />
      </div>
    </div>
  )
}

/** Thumbnail — same hover slideshow as home `CarCard`; loads one image at a time (faster grid). */
function LeaseCardThumbnail({
  vehicle,
  detailHref,
  title,
  imagePriority = false
}: {
  vehicle: RawVehicle
  detailHref: string
  title: string
  imagePriority?: boolean
}) {
  const car = useMemo(() => toCarItem(vehicle), [vehicle])
  const images = useMemo(() => {
    const resolved = cardSlideImages(car)
    return resolved.length ? resolved : [{ src: VEHICLE_PLACEHOLDER_SRC, alt: title }]
  }, [car, title])

  const { activeIdx, hasMultiple, slidesActive, startSlide, stopSlide, goToPrev, goToNext } = useCardImageSlideshow(images)

  return (
    <div className={home.thumbnailWrap} onMouseEnter={startSlide} onMouseLeave={stopSlide}>
      <WishlistHeart itemKey={vehicle._id ?? car.id} initialWishlist={Boolean(car.is_wishlist)} />
      <Link href={detailHref} className={home.thumbnailLink} aria-label={title}>
        {images.length === 0 ? (
          <div className={styles.thumbPlaceholder} aria-hidden />
        ) : (
          images.map((img, i) => {
            if (i > 0 && !slidesActive) return null
            return (
              <CardSlideImage
                key={`${img.src}-${i}`}
                src={img.src}
                alt={img.alt}
                title={title}
                className={i === activeIdx ? home.slideActive : home.slideHidden}
                priority={i === 0 && imagePriority}
              />
            )
          })
        )}
      </Link>
      {hasMultiple ? (
        <>
          <button
            type='button'
            className={`${home.slideArrow} ${home.slideArrowPrev}`}
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
            className={`${home.slideArrow} ${home.slideArrowNext}`}
            aria-label='Next image'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToNext()
            }}
          >
            &#8250;
          </button>
          <div className={home.slideDots}>
            {images.map((_, i) => (
              <span key={i} className={i === activeIdx ? home.slideDotActive : home.slideDot} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function LeaseToOwnClient({
  pageTitle = LEASE_TO_OWN_DEFAULT_TITLE,
}: {
  pageTitle?: string
}) {
  const { currency, convertFromAED, convertToAED } = useCurrencyService()

  const [brands, setBrands] = useState<RawBrand[]>([])
  const [models, setModels] = useState<RawModel[]>([])
  const [bodyTypes, setBodyTypes] = useState<RawBodyType[]>([])

  const [originalVehicles, setOriginalVehicles] = useState<RawVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [bodyTypeId, setBodyTypeId] = useState('')
  const [vipNumberPlate, setVipNumberPlate] = useState('')
  const [sort, setSort] = useState('')

  const [sliderFloor, setSliderFloor] = useState(0)
  const [sliderCeil, setSliderCeil] = useState(0)
  const [minPay, setMinPay] = useState(0)
  const [maxPay, setMaxPay] = useState(0)
  const [minInput, setMinInput] = useState('0')
  const [maxInput, setMaxInput] = useState('0')

  const [page, setPage] = useState(1)

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [sliderVisible, setSliderVisible] = useState(false)

  const minPayRef = useRef(0)
  const maxPayRef = useRef(0)

  useEffect(() => {
    minPayRef.current = minPay
    maxPayRef.current = maxPay
  }, [minPay, maxPay])

  const selectedBrandId = brandId

  const selectedBrand = useMemo(
    () => brands.find((x) => String(x?._id ?? '').trim() === brandId) as BrandWithBody | undefined,
    [brandId, brands]
  )

  const filteredModels = useMemo(() => {
    if (!selectedBrandId) return models
    return models.filter((m) => String(m.brandId ?? m.brand_id ?? m.brand ?? '').trim() === selectedBrandId)
  }, [models, selectedBrandId])

  const bodyTypeOptions = useMemo(() => {
    const fromBrand = selectedBrand?.bodytype_data
    if (brandId && Array.isArray(fromBrand) && fromBrand.length > 0) {
      return fromBrand.filter((x) => x?._id)
    }
    return bodyTypes.filter((b) => isCarBody(b)).filter((b) => Boolean(b?._id))
  }, [brandId, selectedBrand, bodyTypes])

  useEffect(() => {
    const load = async () => {
      try {
        const [brandRes, modelRes, bodyRes] = await Promise.all([getBrands({}), getAllModels({}), getAllBodyTypes({})])
        setBrands(
          brandRes.code === 200 && Array.isArray(brandRes.result) ? (brandRes.result as RawBrand[]).filter((b) => b?.type === 'Car') : []
        )
        setModels(modelRes.code === 200 && Array.isArray(modelRes.result) ? (modelRes.result as RawModel[]) : [])
        setBodyTypes(
          bodyRes.code === 200 && Array.isArray(bodyRes.result) ? (bodyRes.result as RawBodyType[]).filter((b) => isCarBody(b)) : []
        )
      } catch {
        setBrands([])
        setModels([])
        setBodyTypes([])
      }
    }
    void load()
  }, [])

  // Fetches the FULL lease vehicle list with no filter params.
  // All filtering (brand, model, body, VIP, price, sort) is done client-side
  // in leaseRows so the Search button never triggers a re-fetch or a loading flash.
  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const payload = {
        limit: 2000,
        page: 1,
        availabilityStatus: 'available',
        vehicle_type: 'Car' as const,
        car_type: [] as string[],
        bodyTypeId: [] as string[],
        brandId: [] as string[],
        modelId: [] as string[],
        rental_type: '',
        price_type: '',
        startDate: null,
        endDate: null,
        sort: '',
        isvipNumberPlate: '',
        lease_available: true,
        isChauffeured: null as null,
        locationIds: [] as string[],
        topsearch: [] as string[],
        category: [] as string[]
      }

      const res = (await getFilteredVehicles(payload)) as ApiResponse<RawVehicle[]> & { count?: number }
      if (res.code === 200 && Array.isArray(res.result)) {
        // Trust API `lease_available` filter — show every row in the response.
        const list = res.result.filter((v): v is RawVehicle => v != null && typeof v === 'object')
        setOriginalVehicles(list)

        const paysAED = list.map((v) => computeLeaseAED(v).monthlyInstallment).filter((n) => Number.isFinite(n) && n > 0)
        if (!paysAED.length) {
          setSliderFloor(0)
          setSliderCeil(0)
          setMinPay(0)
          setMaxPay(0)
          setMinInput('0')
          setMaxInput('0')
        } else {
          const floorAED = Math.floor(Math.min(...paysAED) / 100) * 100
          const ceilAED = Math.ceil(Math.max(...paysAED) / 100) * 100
          const floor = convertFromAED(floorAED)
          const ceil = convertFromAED(ceilAED)
          setSliderFloor(floor)
          setSliderCeil(ceil)
          setMinPay(floor)
          setMaxPay(ceil)
          setMinInput(String(Math.round(floor)))
          setMaxInput(String(Math.round(ceil)))
        }
      } else {
        setOriginalVehicles([])
        setSliderFloor(0)
        setSliderCeil(0)
        setMinPay(0)
        setMaxPay(0)
        setMinInput('0')
        setMaxInput('0')
      }
    } catch {
      setOriginalVehicles([])
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertFromAED])

  /* eslint-disable react-hooks/set-state-in-effect -- Angular parity: deferred slider, API refetch on deps, viewport breakpoint */
  useEffect(() => {
    const t = window.setTimeout(() => setSliderVisible(true), 200)
    return () => window.clearTimeout(t)
  }, [])

  // Initial fetch only — currency changes must not refetch (preserves filter state).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchVehicles()
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const closeAnyPopover = useCallback(() => {
    setOpenDropdown(null)
  }, [])

  useEffect(() => {
    if (!openDropdown) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest(`[data-dropdown="${openDropdown}"]`)) return
      closeAnyPopover()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [openDropdown, closeAnyPopover])

  const leaseRows = useMemo(() => {
    let list = originalVehicles.map((v) => {
      const leaseAED = computeLeaseAED(v)
      return {
        v,
        leaseAED,
        monthlyPayAED: leaseAED.monthlyInstallment,
        monthlyPay: convertFromAED(leaseAED.monthlyInstallment),
        dp: convertFromAED(leaseAED.downPayment)
      }
    })

    // All filters applied client-side — no re-fetch needed
    if (selectedBrandId) {
      list = list.filter((row) => String((row.v as Record<string, unknown>).brandId ?? '') === selectedBrandId)
    }
    if (modelId) {
      list = list.filter((row) => String((row.v as Record<string, unknown>).modelId ?? '') === modelId)
    }
    if (bodyTypeId) {
      list = list.filter((row) => String((row.v as Record<string, unknown>).bodyTypeId ?? '') === bodyTypeId)
    }
    if (vipNumberPlate === 'true') list = list.filter((row) => row.v.isvipNumberPlate === true)
    if (vipNumberPlate === 'false') list = list.filter((row) => row.v.isvipNumberPlate !== true)

    // Price filter in AED (stable when display currency / rates load) — matches Angular `maxPrice || Infinity`.
    const minAED = convertToAED(minPay)
    const maxAED = maxPay > 0 ? convertToAED(maxPay) : Number.POSITIVE_INFINITY
    list = list.filter((row) => row.monthlyPayAED >= minAED && row.monthlyPayAED <= maxAED)

    if (sort === 'L-H') list.sort((a, b) => a.monthlyPay - b.monthlyPay)
    if (sort === 'H-L') list.sort((a, b) => b.monthlyPay - a.monthlyPay)

    return list
  }, [originalVehicles, selectedBrandId, modelId, bodyTypeId, vipNumberPlate, minPay, maxPay, sort, convertFromAED, convertToAED])

  const totalPages = Math.max(1, Math.ceil(leaseRows.length / PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  const pageRows = leaseRows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)

  const applyMinPrice = useCallback(() => {
    const floor = sliderFloor
    const ceil = sliderCeil
    let val = Number(minInput)
    if (Number.isNaN(val)) return
    val = Math.max(floor, Math.min(val, maxPay))
    val = Math.min(val, ceil)
    setMinPay(val)
    setMinInput(String(Math.round(val)))
  }, [minInput, maxPay, sliderFloor, sliderCeil])

  const applyMaxPrice = useCallback(() => {
    const floor = sliderFloor
    const ceil = sliderCeil
    let val = Number(maxInput)
    if (Number.isNaN(val)) return
    val = Math.min(ceil, Math.max(val, minPay))
    val = Math.max(val, floor)
    setMaxPay(val)
    setMaxInput(String(Math.round(val)))
  }, [maxInput, minPay, sliderFloor, sliderCeil])

  const filteredBrandOptions = useMemo(() => brands.filter((b) => b.type === 'Car'), [brands])

  const selectedBrandName = selectedBrand?.name ? String(selectedBrand.name) : ''
  const selectedModelName = useMemo(() => {
    const m = models.find((x) => String(x._id) === modelId)
    return m?.name ? String(m.name) : ''
  }, [models, modelId])
  const selectedBodyTypeName = useMemo(() => {
    const bt = bodyTypeOptions.find((x) => String(x._id) === bodyTypeId)
    return bt?.name ? String(bt.name) : ''
  }, [bodyTypeOptions, bodyTypeId])

  const monthlySummaryLabel = useMemo(() => {
    if (sliderCeil <= sliderFloor) return 'Any payment'
    if (minPay <= sliderFloor && maxPay >= sliderCeil) return 'Any payment'
    return (
      <>
        <FormattedPrice amount={minPay} currencyCode={currency} /> – <FormattedPrice amount={maxPay} currencyCode={currency} />
      </>
    )
  }, [sliderCeil, sliderFloor, minPay, maxPay, currency])

  const selectedSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Default'

  const clearCurrentFilter = useCallback(() => {
    if (!openDropdown) return
    switch (openDropdown) {
      case 'brand':
        setBrandId('')
        setModelId('')
        setBodyTypeId('')
        break
      case 'model':
        setModelId('')
        setBodyTypeId('')
        break
      case 'bodyType':
        setBodyTypeId('')
        break
      case 'vipPlate':
        setVipNumberPlate('')
        break
      case 'monthly':
        setMinPay(sliderFloor)
        setMaxPay(sliderCeil)
        setMinInput(String(Math.round(sliderFloor)))
        setMaxInput(String(Math.round(sliderCeil)))
        break
      default:
        break
    }
    setPage(1)
  }, [openDropdown, sliderFloor, sliderCeil])

  const toggleMobileFilter = useCallback(() => {
    setMobileFilterOpen((open) => {
      if (open) closeAnyPopover()
      return !open
    })
  }, [closeAnyPopover])

  const resetFilters = useCallback(() => {
    closeAnyPopover()
    setBrandId('')
    setModelId('')
    setBodyTypeId('')
    setVipNumberPlate('')
    setSort('')
    setPage(1)
    setMinPay(sliderFloor)
    setMaxPay(sliderCeil)
    setMinInput(String(Math.round(sliderFloor)))
    setMaxInput(String(Math.round(sliderCeil)))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [closeAnyPopover, sliderFloor, sliderCeil])

  const phoneHref = 'tel:+97180044678'
  const whatsappHref = `https://wa.me/97180044678?text=${encodeURIComponent("Hello Ghost Rentals! I'm interested in booking a car. Could you please help me with:\n - Is this car available for my dates?\n - Free UAE delivery service.\n - Chauffeur services if needed.\n\nI'm looking to Elevate my Drive with your Executive fleet! Thank you!")}`

  return (
    <main className={styles.page}>
      <section className={styles.searchContainer}>
        <h1 className={ps.pageTitle} data-aos="fade-up">
          {pageTitle}
        </h1>
        <div className={ps.row}>
          <aside data-aos='fade-up' className={ps.filterSection}>
            <div className={`${ps.filterContainer} ${mobileFilterOpen ? ps.filterContainerOpen : ''}`.trim()}>
              <div
                className={ps.filterTopBar}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 991px)').matches) {
                    toggleMobileFilter()
                  }
                }}
              >
                <div className={ps.filterHeaderLeft}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toAssetUrl('images/icons/filter.svg')} alt='' className={ps.filterIcon} />
                  <span className={ps.filterTitle}>Filter</span>
                </div>
                <div className={ps.filterHeaderRight}>
                  <button
                    type='button'
                    className={ps.filterToggleBtn}
                    aria-label={mobileFilterOpen ? 'Collapse filters' : 'Expand filters'}
                    aria-expanded={mobileFilterOpen}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMobileFilter()
                    }}
                  >
                    {mobileFilterOpen ? <Minus size={18} strokeWidth={2.25} /> : <Plus size={18} strokeWidth={2.25} />}
                  </button>
                </div>
              </div>

              <div className={`${ps.filterCollapsible} ${mobileFilterOpen ? ps.filterCollapsibleOpen : ''}`.trim()}>
                <div className={`${ps.filterToolbar} ${styles.leaseFilterToolbar}`}>
                  <div className={`${ps.filterPillsRow} ${styles.leaseFilterPillsRow}`}>
                    <div className={ps.filterField} data-dropdown='brand'>
                      <div
                        className={ps.pillTrigger}
                        data-open={openDropdown === 'brand'}
                        role='button'
                        tabIndex={0}
                        onClick={() => {
                          if (openDropdown === 'brand') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('brand')
                        }}
                      >
                        <span className={ps.pillLabel}>Car Brand</span>
                        <span className={ps.pillValue} data-muted={!brandId}>
                          {selectedBrandName || 'Any brand'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={ps.downArrow}
                          data-rotated={openDropdown === 'brand'}
                        />
                      </div>
                      {openDropdown === 'brand' && (
                        <div className={ps.filterPopover}>
                          <p className={ps.popoverKicker}>Car brand</p>
                          <ul className={ps.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={ps.popoverRow}
                              data-active={!brandId}
                              onClick={() => {
                                setBrandId('')
                                setModelId('')
                                setBodyTypeId('')
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={ps.popoverRowLabel}>Any brand</span>
                              <span className={ps.radioMark} data-on={!brandId ? 'true' : undefined} aria-hidden />
                            </li>
                            {filteredBrandOptions.map((b) => (
                              <li
                                key={String(b._id)}
                                role='button'
                                tabIndex={0}
                                className={ps.popoverRow}
                                data-active={brandId === String(b._id)}
                                onClick={() => {
                                  setBrandId(String(b._id ?? ''))
                                  setModelId('')
                                  setBodyTypeId('')
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={ps.popoverRowLabel}>{String(b.name ?? '')}</span>
                                <span className={ps.radioMark} data-on={brandId === String(b._id) ? 'true' : undefined} aria-hidden />
                              </li>
                            ))}
                          </ul>
                          <div className={ps.popoverFooter}>
                            <button type='button' className={ps.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={ps.filterField} data-dropdown='model' data-disabled={!brandId}>
                      <div
                        className={ps.pillTrigger}
                        data-open={openDropdown === 'model'}
                        role='button'
                        tabIndex={brandId ? 0 : -1}
                        aria-disabled={!brandId}
                        onClick={() => {
                          if (!brandId) return
                          if (openDropdown === 'model') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('model')
                        }}
                      >
                        <span className={ps.pillLabel}>Car Model</span>
                        <span className={ps.pillValue} data-muted={!brandId || !modelId}>
                          {!brandId ? 'Any model' : selectedModelName || 'Any model'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={ps.downArrow}
                          data-rotated={openDropdown === 'model'}
                        />
                      </div>
                      {openDropdown === 'model' && brandId ? (
                        <div className={ps.filterPopover}>
                          <p className={ps.popoverKicker}>Car model</p>
                          <ul className={ps.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={ps.popoverRow}
                              data-active={!modelId}
                              onClick={() => {
                                setModelId('')
                                setBodyTypeId('')
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={ps.popoverRowLabel}>Any model</span>
                              <span className={ps.radioMark} data-on={!modelId ? 'true' : undefined} aria-hidden />
                            </li>
                            {filteredModels
                              .filter((m) => Boolean(m?._id))
                              .map((m) => (
                                <li
                                  key={String(m._id)}
                                  role='button'
                                  tabIndex={0}
                                  className={ps.popoverRow}
                                  data-active={modelId === String(m._id)}
                                  onClick={() => {
                                    setModelId(String(m._id ?? ''))
                                    setBodyTypeId('')
                                    setPage(1)
                                    closeAnyPopover()
                                  }}
                                >
                                  <span className={ps.popoverRowLabel}>{String(m.name ?? '')}</span>
                                  <span className={ps.radioMark} data-on={modelId === String(m._id) ? 'true' : undefined} aria-hidden />
                                </li>
                              ))}
                          </ul>
                          <div className={ps.popoverFooter}>
                            <button type='button' className={ps.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={ps.filterField} data-dropdown='bodyType'>
                      <div
                        className={ps.pillTrigger}
                        data-open={openDropdown === 'bodyType'}
                        role='button'
                        tabIndex={0}
                        onClick={() => {
                          if (openDropdown === 'bodyType') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('bodyType')
                        }}
                      >
                        <span className={ps.pillLabel}>Body Type</span>
                        <span className={ps.pillValue} data-muted={!bodyTypeId}>
                          {selectedBodyTypeName || 'Any type'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={ps.downArrow}
                          data-rotated={openDropdown === 'bodyType'}
                        />
                      </div>
                      {openDropdown === 'bodyType' && (
                        <div className={ps.filterPopover}>
                          <p className={ps.popoverKicker}>Body type</p>
                          <ul className={ps.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={ps.popoverRow}
                              data-active={!bodyTypeId}
                              onClick={() => {
                                setBodyTypeId('')
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={ps.popoverRowLabel}>Any type</span>
                              <span className={ps.radioMark} data-on={!bodyTypeId ? 'true' : undefined} aria-hidden />
                            </li>
                            {bodyTypeOptions.length === 0 ? (
                              <li className={ps.popoverRowMuted}>No body types</li>
                            ) : (
                              bodyTypeOptions.map((bt) => {
                                const id = String(bt._id ?? '')
                                return (
                                  <li
                                    key={id || String(bt.name)}
                                    role='button'
                                    tabIndex={0}
                                    className={ps.popoverRow}
                                    data-active={bodyTypeId === id}
                                    onClick={() => {
                                      setBodyTypeId(id)
                                      setPage(1)
                                      closeAnyPopover()
                                    }}
                                  >
                                    <span className={ps.popoverRowLabel}>{String(bt.name ?? '')}</span>
                                    <span className={ps.radioMark} data-on={bodyTypeId === id ? 'true' : undefined} aria-hidden />
                                  </li>
                                )
                              })
                            )}
                          </ul>
                          <div className={ps.popoverFooter}>
                            <button type='button' className={ps.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={ps.filterField} data-dropdown='vipPlate'>
                      <div
                        className={ps.pillTrigger}
                        data-open={openDropdown === 'vipPlate'}
                        role='button'
                        tabIndex={0}
                        onClick={() => {
                          if (openDropdown === 'vipPlate') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('vipPlate')
                        }}
                      >
                        <span className={ps.pillLabel}>Special Plate</span>
                        <span className={ps.pillValue} data-muted={!vipNumberPlate}>
                          {vipNumberPlate === 'true' ? 'Yes' : vipNumberPlate === 'false' ? 'No' : 'Any plate'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={ps.downArrow}
                          data-rotated={openDropdown === 'vipPlate'}
                        />
                      </div>
                      {openDropdown === 'vipPlate' && (
                        <div className={ps.filterPopover}>
                          <p className={ps.popoverKicker}>Special plate</p>
                          <ul className={ps.popoverList}>
                            {[
                              { value: '', label: 'Any plate' },
                              { value: 'true', label: 'Yes' },
                              { value: 'false', label: 'No' }
                            ].map((opt) => (
                              <li
                                key={opt.value || 'any'}
                                role='button'
                                tabIndex={0}
                                className={ps.popoverRow}
                                data-active={vipNumberPlate === opt.value}
                                onClick={() => {
                                  setVipNumberPlate(opt.value)
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={ps.popoverRowLabel}>{opt.label}</span>
                                <span className={ps.radioMark} data-on={vipNumberPlate === opt.value ? 'true' : undefined} aria-hidden />
                              </li>
                            ))}
                          </ul>
                          <div className={ps.popoverFooter}>
                            <button type='button' className={ps.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={ps.filterField} data-dropdown='monthly'>
                      <div
                        className={ps.pillTrigger}
                        data-open={openDropdown === 'monthly'}
                        role='button'
                        tabIndex={0}
                        onClick={() => {
                          if (openDropdown === 'monthly') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('monthly')
                        }}
                      >
                        <span className={ps.pillLabel}>Monthly payment</span>
                        <span className={ps.pillValue} data-muted={monthlySummaryLabel === 'Any payment'}>
                          {monthlySummaryLabel}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={ps.downArrow}
                          data-rotated={openDropdown === 'monthly'}
                        />
                      </div>
                      {openDropdown === 'monthly' && (
                        <div className={ps.filterPopoverWide}>
                          <p className={ps.popoverKicker}>Monthly installment range</p>
                          <div className={ps.pricePopoverInputs}>
                            <div className={ps.pricePopoverField}>
                              <span className={ps.pricePopoverFieldLabel}>Min</span>
                              <div className={ps.pricePopoverInputWrap}>
                                <input
                                  type='number'
                                  inputMode='decimal'
                                  className={ps.pricePopoverInput}
                                  value={minInput}
                                  onChange={(e) => setMinInput(e.target.value)}
                                  onBlur={() => {
                                    applyMinPrice()
                                    setPage(1)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      applyMinPrice()
                                      setPage(1)
                                    }
                                  }}
                                />
                                <span className={ps.pricePopoverSuffix}>
                                  <CurrencySymbol code={currency} />
                                </span>
                              </div>
                            </div>
                            <div className={ps.pricePopoverField}>
                              <span className={ps.pricePopoverFieldLabel}>Max</span>
                              <div className={ps.pricePopoverInputWrap}>
                                <input
                                  type='number'
                                  inputMode='decimal'
                                  className={ps.pricePopoverInput}
                                  value={maxInput}
                                  onChange={(e) => setMaxInput(e.target.value)}
                                  onBlur={() => {
                                    applyMaxPrice()
                                    setPage(1)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      applyMaxPrice()
                                      setPage(1)
                                    }
                                  }}
                                />
                                <span className={ps.pricePopoverSuffix}>
                                  <CurrencySymbol code={currency} />
                                </span>
                              </div>
                            </div>
                          </div>
                          {sliderVisible && sliderCeil > sliderFloor ? (
                            <div className={styles.monthlySliderInPopover}>
                              <LeaseRangeSlider
                                floor={sliderFloor}
                                ceil={sliderCeil}
                                step={SLIDER_STEP}
                                minVal={minPay}
                                maxVal={maxPay}
                                formatLabel={(v) => <FormattedPrice amount={v} currencyCode={currency} />}
                                onChange={(a, b) => {
                                  const lo = Math.min(a, b)
                                  const hi = Math.max(a, b)
                                  setMinPay(lo)
                                  setMaxPay(hi)
                                  setMinInput(String(Math.round(lo)))
                                  setMaxInput(String(Math.round(hi)))
                                  setPage(1)
                                }}
                              />
                            </div>
                          ) : null}
                          <div className={ps.popoverFooter}>
                            <button type='button' className={ps.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type='button'
                      className={ps.filterSearchBtn}
                      onClick={resetFilters}
                      aria-label='Reset all filters'
                      data-text='Reset'
                    >
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section data-aos='fade-up' data-aos-delay='100' className={ps.resultsSection}>
            <header className={ps.resultsHeader}>
              {loading ? null : leaseRows.length > 0 ? (
                <h3 className={ps.resultsCount}>
                  <span>Showing</span> {(activePage - 1) * PAGE_SIZE + 1} <span>to</span>{' '}
                  {Math.min(activePage * PAGE_SIZE, leaseRows.length)} <span>of</span> {leaseRows.length} <span>Vehicles</span>
                </h3>
              ) : (
                <h3 className={ps.resultsCountEmpty}>Arriving Soon</h3>
              )}

              {!loading && leaseRows.length > 0 ? (
                <div className={ps.resultsHeaderRight}>
                  <div className={ps.sortWrap} data-dropdown='sort'>
                    <div
                      className={ps.sortToggle}
                      role='button'
                      tabIndex={0}
                      onClick={() => {
                        setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
                        }
                      }}
                    >
                      <span>{sort ? selectedSortLabel : 'Sort by'}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toAssetUrl('images/icons/down-arrow.svg')}
                        alt='Expand'
                        className={ps.sortArrow}
                        data-rotated={openDropdown === 'sort'}
                      />
                    </div>
                    {openDropdown === 'sort' && (
                      <ul className={ps.sortMenu} role='listbox' aria-label='Sort options'>
                        {SORT_OPTIONS.filter((o) => o.value).map((o) => (
                          <li
                            key={o.value}
                            className={ps.sortItem}
                            data-active={sort === o.value}
                            onClick={() => {
                              setSort(o.value)
                              setOpenDropdown(null)
                              setPage(1)
                            }}
                          >
                            {o.label}
                          </li>
                        ))}
                        <li
                          className={ps.sortItem}
                          onClick={() => {
                            setSort('')
                            setOpenDropdown(null)
                            setPage(1)
                          }}
                        >
                          Reset
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </header>

            {loading ? (
              <div className={ps.loading}>
                <div className={ps.loadingSpinner} />
                <div>Loading cars…</div>
              </div>
            ) : null}
            {!loading && loadFailed ? <div className={styles.state}>Failed to load vehicles.</div> : null}

            {!loading && !loadFailed ? (
              <div className={styles.products}>
                {pageRows.map(({ v, monthlyPay, dp }, cardIndex) => {
                  const key = String(v._id ?? v.url_key ?? '')
                  const title = String(v.name ?? '')
                  const transmission = String(v.transmission ?? '').trim()
                  const fuel = String(v.fuelType ?? v.fuel_type ?? '').trim()
                  const year = String(v.year ?? '').trim()
                  const seats = String(v.seating_capacity ?? '').trim()
                  const vip = Boolean((v as { isvipNumberPlate?: boolean }).isvipNumberPlate)
                  const detailHref = vehicleProductPath(v.url_key, 'lease')

                  return (
                    <div key={key} className={styles.productCol}>
                      <article className={`${home.carCard} ${home.carCardList}`}>
                        <LeaseCardThumbnail vehicle={v} detailHref={detailHref} title={title} imagePriority={cardIndex < 4} />

                        <div className={home.cardBody}>
                          <Link href={detailHref} className={styles.leaseCardLink}>
                            <div className={home.carInfo}>
                              <div>
                                <h4 className={home.carName}>{title}</h4>
                                <h5 className={home.transmission}>{transmission || '—'}</h5>
                              </div>
                              {vip ? <span className={home.specialTag}>Special Plate</span> : null}
                            </div>
                          </Link>
                          <Link href={detailHref} className={styles.leaseCardLink}>
                            <div className={home.specs}>
                              <div className={home.specItem}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={toAssetUrl('images/icons/petrol2.svg')} alt='' />
                                <h6>{fuel || 'N/A'}</h6>
                              </div>
                              <div className={home.specItem}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={toAssetUrl('images/icons/year2.svg')} alt='' />
                                <h6>{year || 'N/A'}</h6>
                              </div>
                              <div className={home.specItem}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={toAssetUrl('images/icons/seat2.png')} alt='' />
                                <h6>{(seats || 'N/A') + ' Pax'}</h6>
                              </div>
                            </div>
                          </Link>
                          <div className={styles.leaseFeatureList}>
                            <div className={styles.leaseFeatureItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/tick.svg')} alt='' className={styles.leaseFeatureTick} />
                              <span className={styles.leaseFeatureText}>GCC spec vehicle</span>
                            </div>
                            <div className={styles.leaseFeatureItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/tick.svg')} alt='' className={styles.leaseFeatureTick} />
                              <span className={styles.leaseFeatureText}>Insurance included</span>
                            </div>
                          </div>
                        </div>

                        <div className={home.cardFooter}>
                          <div className={home.priceBlock}>
                            <span className={styles.leaseEyebrow}>Monthly installment</span>
                            <div className={home.priceMain}>
                              <h6 className={home.newPrice}>
                                <FormattedPrice amount={monthlyPay} currencyCode={currency} />
                              </h6>
                            </div>
                            <span className={styles.leaseDp}>
                              <span className={styles.leaseDpLabel}>DP</span>
                              <span className={styles.leaseDpAmount}>
                                <FormattedPrice amount={dp} currencyCode={currency} />
                              </span>
                            </span>
                          </div>
                          <div className={home.actions}>
                            <a href={phoneHref} className={home.actionBtn} data-variant='call' aria-label='Call'>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/call-action.svg')} alt='Call' />
                            </a>
                            <a
                              href={whatsappHref}
                              target='_blank'
                              rel='noreferrer'
                              className={home.actionBtn}
                              data-variant='whatsapp'
                              aria-label='WhatsApp'
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='WhatsApp' />
                            </a>
                          </div>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {totalPages > 1 ? <ResultsPagination totalPages={totalPages} activePage={activePage} onPageChange={setPage} /> : null}
          </section>
        </div>
      </section>
    </main>
  )
}
