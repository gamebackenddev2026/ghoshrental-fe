'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CarCard, YachtCard } from '@/components/home/HomeSections'
import { FaqSection } from '@/components/home/FaqSection'
import { toAssetUrl } from '@/lib/config'
import {
  featureImageDisplaySrc,
  resolveFeatureMediaUrl,
  resolveVehicleMediaUrl,
  vehicleImageDisplaySrc,
  vehicleImageWithFallback,
  VEHICLE_PLACEHOLDER_SRC
} from '@/lib/mediaUrl'
import type { RawMedia } from '@/lib/api/types'
import { addNewWishlist, addProductInquiry, removeWishlistItem } from '@/lib/api/product'
import type { ProductDetailModel, ProductGoogleReviews, ProductLocationModel, ProductMode } from '@/lib/api/productAdapters'
import { AssetImageWithFallback } from '@/components/shared/AssetImageWithFallback'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { getProductPrimaryImageSrc, toCarItemFromProductDetail, toYachtItemFromProductDetail } from '@/lib/api/productAdapters'
import { vehicleProductPath } from '@/lib/api/adapters'
import { showWishlistToast, WISHLIST_LOGIN_MESSAGE } from '@/lib/wishlist-toast'
import { useWishlist } from '@/lib/wishlist-context'
import { CurrencySymbol } from '@/components/shared/CurrencySymbol'
import { FormattedPrice } from '@/components/shared/FormattedPrice'
import { MemberDiscountNote } from '@/components/shared/MemberDiscountNote'
import { StrikePriceWrap } from '@/components/shared/StrikePriceWrap'
import { hasMemberPriceDrop } from '@/lib/customerDiscount'
import { useMemberDiscountPercent } from '@/lib/useMemberDiscountPercent'
import { convertFromAED, formatPriceAmount, getCurrencyConfig, useCurrencyService } from '@/lib/currency-service'
import styles from './productDetailPage.module.css'

type InquiryFormState = {
  name: string
  email: string
  phone: string
  message: string
}

type ProductDetailPageProps = {
  mode: ProductMode
  product: ProductDetailModel | null
  related: ProductDetailModel[]
  reviews: ProductGoogleReviews
  location: ProductLocationModel
}

const PHONE_NUMBER = '97180044678'
const MONTHLY_PROFIT_PERCENT = 4
const GALLERY_AUTO_PLAY_MS = 3000

const productMediaUrl = (src: string) => vehicleImageWithFallback(src)
const productMediaFromRaw = (media: RawMedia | null | undefined, fallback = vehicleImageWithFallback('')) => {
  return vehicleImageDisplaySrc(resolveVehicleMediaUrl(media)) ?? fallback
}
const featureMediaFromRaw = (media: RawMedia | null | undefined): string | undefined => {
  return featureImageDisplaySrc(resolveFeatureMediaUrl(media))
}

function prefetchProductImage(src: string) {
  if (typeof window === 'undefined' || !src) return
  const img = new window.Image()
  img.decoding = 'async'
  img.src = productMediaUrl(src)
}

function PriceCardAmount({ amountAed, strikeAed, currency }: { amountAed: number; strikeAed?: number; currency: string }) {
  const code = currency as 'AED' | 'EUR' | 'GBP' | 'USD'
  const config = getCurrencyConfig(code)
  const display = formatPriceAmount(convertFromAED(amountAed, code))
  const hasDiscount = typeof strikeAed === 'number' && strikeAed > amountAed
  return (
    <div className={styles.priceCardAmount}>
      <span className={styles.priceCardCurrency}>
        {code === 'AED' ? (
          <CurrencySymbol code='AED' className={styles.priceCardAedSymbol} style={{ verticalAlign: '0.06em' }} />
        ) : (
          config.symbol
        )}
      </span>
      <span className={styles.priceCardValue}>{display}</span>
      {hasDiscount ? (
        <span className={styles.priceCardStrike}>
          <StrikePriceWrap>
            <FormattedPrice amount={strikeAed} fromAED strikethrough />
          </StrikePriceWrap>
        </span>
      ) : null}
    </div>
  )
}

const CAR_PRICE_META: Record<string, string> = {
  'Per day': '· 24 hours',
  'Per week': '· 7 days',
  'Per month': '· 30 days'
}

function mapWishlistForCustomer(item: ProductDetailModel, customerId: string | null): ProductDetailModel {
  if (!customerId) return { ...item, is_wishlist: false }
  const active = item.wishlist_data.some((entry) => entry.customer_id === customerId)
  return { ...item, is_wishlist: active }
}

function normalizeFeatureName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function formatDescriptionWithLists(raw: string): string {
  if (!raw?.trim()) return ''
  const cleanedRaw = raw
    .replace(/&amp;#160;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
  // Keep backend-provided HTML intact (e.g. span/br markup) and only
  // transform plain text descriptions into semantic lists.
  if (/<[^>]+>/.test(cleanedRaw)) return cleanedRaw

  const normalized = cleanedRaw.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n').map((line) => line.trim())
  const out: string[] = []
  let i = 0

  const isMetaLine = (line: string) => /^(Body Type|Color|Category)\s*:/i.test(line)
  const isFeatureStop = (line: string) => /^Why Rent/i.test(line) || /^Read More$/i.test(line) || /^Read less$/i.test(line)

  while (i < lines.length) {
    const line = lines[i]
    if (!line) {
      i += 1
      continue
    }

    if (isMetaLine(line)) {
      const items: string[] = []
      while (i < lines.length && isMetaLine(lines[i])) {
        items.push(lines[i])
        i += 1
      }
      out.push(`<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^Key Features\s*:?\s*$/i.test(line)) {
      out.push(`<p>${escapeHtml(line)}</p>`)
      i += 1
      const featureItems: string[] = []
      while (i < lines.length) {
        const next = lines[i]
        if (!next) {
          i += 1
          continue
        }
        if (isFeatureStop(next)) break
        featureItems.push(next.replace(/^[•\-]\s*/, ''))
        i += 1
      }
      if (featureItems.length) {
        out.push(`<ul>${featureItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
      }
      continue
    }

    out.push(`<p>${escapeHtml(line)}</p>`)
    i += 1
  }

  return out.join('')
}

const YACHT_ADDONS_ORDER = [
  'Chef & Live BBQ',
  'Decoration',
  'Jetskis And More Water Sports',
  'Pick And Drop, To And From Yacht',
  'Percussionist',
  'Champagne & Beverages',
  'DJ',
  'Photo & Video Team',
  'Corporate Event Planning'
].map(normalizeFeatureName)

const CAR_FEATURE_GROUP_ORDER = ['Interior', 'Safety', 'Comfort & Convenience', 'Exterior']
function getCarFeatureRank(groupTitle: string, featureName: string): number {
  const value = normalizeFeatureName(featureName)

  if (groupTitle === 'Interior') {
    if (value.includes('air') && value.includes('condition')) return 0
    if (value.includes('odometer')) return 1
    if (value.includes('leather') && value.includes('seat')) return 2
    return Number.MAX_SAFE_INTEGER
  }

  if (groupTitle === 'Safety') {
    if (value === 'abs' || value.includes(' abs')) return 0
    if (value.includes('driver') && (value.includes('air bag') || value.includes('airbag'))) return 1
    if (value.includes('lane') && value.includes('assist')) return 2
    return Number.MAX_SAFE_INTEGER
  }

  if (groupTitle === 'Comfort & Convenience') {
    if (value.includes('power') && value.includes('steering')) return 0
    if (value.includes('apple') && (value.includes('car play') || value.includes('carplay'))) return 1
    return Number.MAX_SAFE_INTEGER
  }

  return Number.MAX_SAFE_INTEGER
}

export function ProductDetailPage({ mode, product: initialProduct, related: initialRelated, reviews, location }: ProductDetailPageProps) {
  const router = useRouter()
  const { ids, isWishlisted, add, remove } = useWishlist()
  const { currency, formatPriceFromAED, convertPricesInText } = useCurrencyService()

  // Reset scroll position to top whenever this page mounts (navigation from list page)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const [product, setProduct] = useState<ProductDetailModel | null>(initialProduct)
  const [relatedProducts, setRelatedProducts] = useState<ProductDetailModel[]>(initialRelated)
  const [currentIndex, setCurrentIndex] = useState(0)
  const thumbRailRef = useRef<HTMLDivElement>(null)
  const thumbScrollRaf = useRef<number | null>(null)

  const stopThumbScroll = () => {
    if (thumbScrollRaf.current !== null) {
      cancelAnimationFrame(thumbScrollRaf.current)
      thumbScrollRaf.current = null
    }
  }

  const onThumbRailMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rail = thumbRailRef.current
    if (!rail) return
    const { left, width } = rail.getBoundingClientRect()
    const x = e.clientX - left
    const edgeZone = width * 0.2
    const speed = 3

    stopThumbScroll()

    if (x > width - edgeZone) {
      const scroll = () => {
        if (rail) rail.scrollLeft += speed
        thumbScrollRaf.current = requestAnimationFrame(scroll)
      }
      thumbScrollRaf.current = requestAnimationFrame(scroll)
    } else if (x < edgeZone) {
      const scroll = () => {
        if (rail) rail.scrollLeft -= speed
        thumbScrollRaf.current = requestAnimationFrame(scroll)
      }
      thumbScrollRaf.current = requestAnimationFrame(scroll)
    }
  }
  const [galleryPaused, setGalleryPaused] = useState(false)
  const [isGalleryAllOpen, setIsGalleryAllOpen] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState('')
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [selectedMonths, setSelectedMonths] = useState(12)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [token, setToken] = useState('')
  const [inquiryForm, setInquiryForm] = useState<InquiryFormState>({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [showFullDescription, setShowFullDescription] = useState(false)
  const stickyCardRef = useRef<HTMLDivElement | null>(null)
  const stickyContainerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!product) return
    if (mode === 'lease') {
      setSelectedDuration(`${selectedMonths} Months`)
      return
    }
    if (product.vehicle_type === 'Yachts') {
      setSelectedDuration('Per hour')
      setSelectedPrice(product.hourlyRate || product.dailyRate)
    } else {
      setSelectedDuration('Per day')
      setSelectedPrice(product.dailyRate)
    }
  }, [mode, product, selectedMonths])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userToken = localStorage.getItem('ghostrentals-web-token') ?? ''
    const customerRaw = localStorage.getItem('customer') ?? localStorage.getItem('guest')
    const customerId = customerRaw ? (JSON.parse(customerRaw)?._id ?? null) : null
    setToken(userToken)
    if (initialProduct) {
      setProduct(mapWishlistForCustomer(initialProduct, customerId))
    }
    setRelatedProducts(initialRelated.map((item) => mapWishlistForCustomer(item, customerId)))
  }, [initialProduct, initialRelated])

  useEffect(() => {
    if (ids === null) return
    setProduct((prev) => (prev ? { ...prev, is_wishlist: isWishlisted(prev.id) } : prev))
    setRelatedProducts((prev) => prev.map((entry) => ({ ...entry, is_wishlist: isWishlisted(entry.id) })))
  }, [ids, isWishlisted])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const STICKY_TOP = 150
    const STICKY_MIN_WIDTH = 1200

    const resetSticky = (card: HTMLDivElement, container: HTMLElement) => {
      card.classList.remove(styles.stuck, styles.bottomReached)
      card.style.width = ''
      card.style.left = ''
      container.style.minHeight = ''
    }

    const pinFixed = (card: HTMLDivElement, container: HTMLElement) => {
      const rect = container.getBoundingClientRect()
      card.style.width = `${rect.width}px`
      card.style.left = `${rect.left}px`
      container.style.minHeight = `${card.offsetHeight}px`
    }

    const checkSticky = () => {
      const card = stickyCardRef.current
      const container = stickyContainerRef.current
      if (!card || !container) return

      if (window.innerWidth < STICKY_MIN_WIDTH) {
        resetSticky(card, container)
        return
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const containerRect = container.getBoundingClientRect()
      const containerTop = containerRect.top + scrollTop
      const containerBottom = containerRect.bottom + scrollTop
      const startSticky = containerTop - STICKY_TOP
      const stopSticky = containerBottom - card.offsetHeight - STICKY_TOP - 20

      if (scrollTop > startSticky && scrollTop < stopSticky) {
        card.classList.add(styles.stuck)
        card.classList.remove(styles.bottomReached)
        pinFixed(card, container)
      } else if (scrollTop >= stopSticky) {
        card.classList.remove(styles.stuck)
        card.classList.add(styles.bottomReached)
        card.style.width = ''
        card.style.left = ''
        container.style.minHeight = `${card.offsetHeight}px`
      } else {
        resetSticky(card, container)
      }
    }

    const scheduleCheck = () => {
      requestAnimationFrame(checkSticky)
    }

    scheduleCheck()
    const delayedCheck = window.setTimeout(checkSticky, 150)
    window.addEventListener('scroll', checkSticky, { passive: true })
    window.addEventListener('resize', checkSticky)
    window.addEventListener('load', checkSticky)

    const card = stickyCardRef.current
    const resizeObserver = card && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => scheduleCheck()) : null
    if (card && resizeObserver) resizeObserver.observe(card)

    return () => {
      window.clearTimeout(delayedCheck)
      window.removeEventListener('scroll', checkSticky)
      window.removeEventListener('resize', checkSticky)
      window.removeEventListener('load', checkSticky)
      resizeObserver?.disconnect()
    }
  }, [product?.id, mode, relatedProducts.length, selectedMonths])

  const leasePricing = useMemo(() => {
    if (!product || mode !== 'lease') {
      return {
        totalPrice: 0,
        downPayment: 0,
        monthlyInstallment: 0
      }
    }
    const baseTotal = product.purchase_price + product.insurence_price
    const taxAmount = (baseTotal * MONTHLY_PROFIT_PERCENT) / 100
    const grandTotal = baseTotal + taxAmount * selectedMonths
    const downPayment = grandTotal * 0.25
    const monthlyInstallment =
      selectedMonths === 6 ? 0.15 * grandTotal : selectedMonths === 12 ? 0.075 * grandTotal : (grandTotal - downPayment) / selectedMonths
    return {
      totalPrice: grandTotal,
      downPayment,
      monthlyInstallment
    }
  }, [mode, product, selectedMonths])

  const gallery = product?.gallery ?? []
  const activeImage = gallery[currentIndex] ?? gallery[0]
  const sideThumbnailSrc = useMemo(() => {
    if (!product) return vehicleImageWithFallback('')
    const fromMediaData = vehicleImageDisplaySrc(resolveVehicleMediaUrl(product.media_data[0]))
    if (fromMediaData) return productMediaUrl(fromMediaData)
    const primary = getProductPrimaryImageSrc(product)
    return primary ? productMediaUrl(primary) : vehicleImageWithFallback('')
  }, [product])

  useEffect(() => {
    setCurrentIndex(0)
  }, [product?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (gallery.length <= 1 || galleryPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % gallery.length)
    }, GALLERY_AUTO_PLAY_MS)

    return () => window.clearInterval(timer)
  }, [gallery.length, galleryPaused, product?.id])

  useEffect(() => {
    if (gallery.length <= 1) return
    const next = gallery[(currentIndex + 1) % gallery.length]
    const prev = gallery[(currentIndex - 1 + gallery.length) % gallery.length]
    if (next?.src) prefetchProductImage(next.src)
    if (prev?.src) prefetchProductImage(prev.src)
  }, [currentIndex, gallery])

  useEffect(() => {
    if (!isGalleryAllOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsGalleryAllOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isGalleryAllOpen])

  const openGalleryAll = () => {
    setGalleryPaused(true)
    setIsGalleryAllOpen(true)
  }

  const closeGalleryAll = () => {
    setIsGalleryAllOpen(false)
    setGalleryPaused(false)
  }

  const selectGalleryImage = (index: number) => {
    setCurrentIndex(index)
    closeGalleryAll()
  }

  const hasShortDescription = useMemo(() => {
    const plain = (product?.short_description ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim()
    return plain.length > 0
  }, [product?.short_description])
  const convertedDescription = useMemo(
    () => formatDescriptionWithLists(convertPricesInText(product?.description || '')),
    [convertPricesInText, product?.description]
  )
  const convertedShortDescription = useMemo(
    () => convertPricesInText(product?.short_description || ''),
    [convertPricesInText, product?.short_description]
  )
  const yachtPricingEntries = useMemo(() => {
    if (!product || product.vehicle_type !== 'Yachts') return []
    return [
      { label: 'Per hour', price: product.hourlyRate, strike: product.regularRateHourly },
      { label: 'Half day', price: product.halfdayRate, strike: product.regularRateHalfDay },
      { label: 'Per day', price: product.dailyRate, strike: product.regularRateDaily }
    ].filter((entry) => entry.price > 0)
  }, [product])

  const memberDiscountPercent = useMemberDiscountPercent()
  const activeMemberDiscount = useMemo(() => {
    if (!product || !token || !memberDiscountPercent) return null
    const ratePairs = [
      [product.regularRateDaily, product.dailyRate],
      [product.regularRateWeekly, product.weeklyRate],
      [product.regularRateMonthly, product.monthlyRate],
      [product.regularRateHourly, product.hourlyRate],
      [product.regularRateHalfDay, product.halfdayRate]
    ] as const
    const hasDrop = ratePairs.some(([regular, current]) => hasMemberPriceDrop(regular, current))
    return hasDrop ? memberDiscountPercent : null
  }, [memberDiscountPercent, product, token])
  const yachtMoreInfoItems = useMemo(() => {
    if (!product || product.vehicle_type !== 'Yachts') return []
    return ['Crew included', 'Minimum 2 hours', 'Safety equipment']
  }, [product])

  const itemIsWishlisted = (item: ProductDetailModel) => (ids !== null ? isWishlisted(item.id) : item.is_wishlist)

  const toggleWishlist = async (item: ProductDetailModel, isPrimary: boolean, event?: MouseEvent) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!token) {
      showWishlistToast(WISHLIST_LOGIN_MESSAGE)
      if (event?.currentTarget instanceof HTMLElement) {
        event.currentTarget.blur()
      }
      return
    }

    const currentlyWishlisted = itemIsWishlisted(item)
    const nextActive = !currentlyWishlisted

    if (nextActive) add(item.id)
    else remove(item.id)

    const updateList = (items: ProductDetailModel[]) =>
      items.map((entry) => (entry.id === item.id ? { ...entry, is_wishlist: nextActive } : entry))

    if (isPrimary) setProduct((prev) => (prev ? { ...prev, is_wishlist: nextActive } : prev))
    else setRelatedProducts((prev) => updateList(prev))

    try {
      if (currentlyWishlisted) {
        await removeWishlistItem({ id: item.id, token })
      } else {
        await addNewWishlist({
          id: item.id,
          token,
          color: item.colour_id[0],
          size: item.size[0]?._id,
          price: item.sale_price || selectedPrice || undefined
        })
      }
    } catch {
      if (nextActive) remove(item.id)
      else add(item.id)
      if (isPrimary) setProduct((prev) => (prev ? { ...prev, is_wishlist: currentlyWishlisted } : prev))
      else
        setRelatedProducts((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_wishlist: currentlyWishlisted } : entry)))
    }
  }

  const openWhatsapp = (item: ProductDetailModel) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}${vehicleProductPath(item.url_key, mode)}`

    const message =
      mode === 'lease'
        ? `Hello Ghost Rentals!\n\nI'm interested in booking ${item.name}.\n\nLease Duration: ${selectedMonths} months\nMonthly Price: ${formatPriceFromAED(leasePricing.monthlyInstallment)}/month\nDown Payment: ${formatPriceFromAED(leasePricing.downPayment)}\nTotal Price: ${formatPriceFromAED(leasePricing.totalPrice)}\n\nClick here : ${link}\n\nCould you please help me with:\n- Is this ${item.vehicle_type} available for my dates?\n- Free UAE delivery service.\n- Chauffeur services if needed.\n\nThank you!`
        : `Hello Ghost Rentals!\n\nI'm interested in booking ${item.name}${selectedPrice ? ` for ${formatPriceFromAED(selectedPrice)}/${selectedDuration}` : ''}.\n\nClick here : ${link}\n\nCould you please help me with:\n- Is this ${item.vehicle_type} available for my dates?\n- Free UAE delivery service.\n- Chauffeur services if needed.\n\nThank you!`

    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product) return
    setSubmitMessage('')
    setSubmitError('')
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.phone) {
      setSubmitError('Please fill all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await addProductInquiry({
        ...inquiryForm,
        day: selectedDuration,
        price: mode === 'lease' ? leasePricing.monthlyInstallment : selectedPrice,
        currency,
        product: product.name
      })
      if (response.code === 200) {
        setSubmitMessage((response.message as string) || 'Inquiry submitted successfully.')
        setInquiryForm({ name: '', email: '', phone: '', message: '' })
        setTimeout(() => setIsModalOpen(false), 1200)
      } else {
        setSubmitError((response.message as string) || 'Unable to submit inquiry.')
      }
    } catch {
      setSubmitError('Unable to submit inquiry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRelatedCardNavigate = (href: string, event?: MouseEvent<HTMLElement>) => {
    const target = event?.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) return
    router.push(href)
  }

  if (!product) {
    return (
      <main className={styles.notFoundWrap}>
        <h1>Product not found</h1>
        <Link href='/' className={styles.backHome}>
          Back to Home
        </Link>
      </main>
    )
  }

  const overviewItems =
    product.vehicle_type === 'Yachts'
      ? [
          { icon: 'ship', label: 'Ship', value: product.bodyTypeName },
          { icon: 'length', label: 'Length', value: product.length },
          { icon: 'fuel', label: 'Fuel Type', value: product.fuelType },
          {
            icon: 'year2',
            label: 'Year',
            value: product.year ? new Date(product.year).getFullYear().toString() : ''
          },
          {
            icon: 'captain',
            label: 'Crew Included',
            value: product.crew_included ? 'Yes' : 'No'
          },
          { icon: 'guests', label: 'Guest Capacity', value: product.guest_capacity }
        ]
      : [
          { icon: 'body', label: 'Body Type', value: product.bodyTypeName },
          {
            icon: 'year2',
            label: 'Year',
            value: product.year ? new Date(product.year).getFullYear().toString() : ''
          },
          { icon: 'door', label: 'Doors', value: product.door_count },
          { icon: 'transmission', label: 'Transmission', value: product.transmission },
          { icon: 'engine', label: 'Engine Size', value: product.engine_size },
          { icon: 'fuel', label: 'Fuel Type', value: product.fuelType },
          { icon: 'color', label: 'Color', value: product.color },
          { icon: 'drive', label: 'Drive Type', value: product.drive_type }
        ]

  const listHref = product.carTypeUrlKey && product.vehicle_type === 'Car' ? `/product/list/${product.carTypeUrlKey}` : null
  const orderedYachtAddons =
    product.vehicle_type === 'Yachts'
      ? [...product.feature_data].sort((a, b) => {
          const aIdx = YACHT_ADDONS_ORDER.indexOf(normalizeFeatureName(a.name))
          const bIdx = YACHT_ADDONS_ORDER.indexOf(normalizeFeatureName(b.name))
          const safeA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx
          const safeB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx
          return safeA - safeB
        })
      : product.feature_data
  const carFeatureGroups = [
    { title: 'Interior', items: product.interior },
    { title: 'Exterior', items: product.exterior },
    { title: 'Safety', items: product.safety },
    { title: 'Comfort & Convenience', items: product.comfort }
  ]
    .map((group) => {
      if (product.vehicle_type !== 'Car') return group
      const sortedItems = [...group.items].sort((a, b) => {
        const aRank = getCarFeatureRank(group.title, a.name)
        const bRank = getCarFeatureRank(group.title, b.name)
        return aRank - bRank
      })
      return { ...group, items: sortedItems }
    })
    .sort((a, b) => {
      if (product.vehicle_type !== 'Car') return 0
      const aIdx = CAR_FEATURE_GROUP_ORDER.indexOf(a.title)
      const bIdx = CAR_FEATURE_GROUP_ORDER.indexOf(b.title)
      const safeA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx
      const safeB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx
      return safeA - safeB
    })

  return (
    <>
      <section className={styles.productDetail}>
        <div className={styles.container}>
          <div className={`${styles.productHeader} `} data-aos='fade-up'>
            <h1 className={styles.bodyTypeLine}>
              {listHref && mode === 'rent' ? (
                <Link href={listHref} className={styles.bodyTypeLink}>
                  {product.bodyTypeName} <span>car for Rent</span>
                </Link>
              ) : (
                <>
                  {product.bodyTypeName} {mode === 'lease' ? 'for Lease' : 'for Rent'}
                </>
              )}
            </h1>
            <h2 className={styles.titleLine}>
              {mode === 'lease' ? 'Lease' : 'Rent'} {product.name} in Dubai
            </h2>
          </div>

          <div className={styles.layoutGrid}>
            <div className={styles.mainCol}>
              <div className={`${styles.gallerySection} `} data-aos='fade-up'>
                <div
                  className={styles.galleryStack}
                  onMouseEnter={() => setGalleryPaused(true)}
                  onMouseLeave={() => setGalleryPaused(false)}
                  onFocusCapture={() => setGalleryPaused(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setGalleryPaused(false)
                    }
                  }}
                >
                  <div className={styles.mainImageWrap}>
                    <div className={styles.mainImageStage}>
                      <button
                        className={`${styles.wishlistIcon} ${itemIsWishlisted(product) ? styles.heartActive : ''}`}
                        onClick={(event) => void toggleWishlist(product, true, event)}
                        aria-label='Toggle wishlist'
                        aria-pressed={itemIsWishlisted(product)}
                      >
                        <span className={styles.heartStack}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/heart_icon/heart_inactive.svg')}
                            alt=''
                            className={styles.heartBase}
                            draggable={false}
                            aria-hidden
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/heart_icon/heart_active.svg')}
                            alt=''
                            className={styles.heartFill}
                            draggable={false}
                            aria-hidden
                          />
                        </span>
                      </button>

                      <OptimizedImage
                        key={activeImage?.src ?? 'placeholder'}
                        src={activeImage ? productMediaUrl(activeImage.src) : vehicleImageWithFallback('')}
                        fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                        alt={activeImage?.alt || product.name}
                        title={activeImage?.title || product.name}
                        className={styles.mainImage}
                        fill
                        sizes={IMAGE_SIZES.productGallery}
                        priority
                        loading='eager'
                      />
                      {gallery.length > 1 && (
                        <>
                          <button
                            type='button'
                            className={styles.prevBtn}
                            onClick={() => setCurrentIndex((index) => (index - 1 + gallery.length) % gallery.length)}
                            aria-label='Previous image'
                          >
                            &#8249;
                          </button>
                          <button
                            type='button'
                            className={styles.nextBtn}
                            onClick={() => setCurrentIndex((index) => (index + 1) % gallery.length)}
                            aria-label='Next image'
                          >
                            &#8250;
                          </button>
                        </>
                      )}
                    </div>
                    {gallery.length > 1 && (
                      <div className={styles.galleryThumbSection}>
                        <button
                          type='button'
                          className={styles.viewAllPhotosBtn}
                          onClick={openGalleryAll}
                          aria-label={`View all ${gallery.length} photos`}
                        >
                          View All ({gallery.length})
                        </button>
                        <div
                          ref={thumbRailRef}
                          className={styles.thumbRail}
                          role='tablist'
                          aria-label='Vehicle gallery thumbnails'
                          onMouseMove={onThumbRailMouseMove}
                          onMouseLeave={stopThumbScroll}
                        >
                          {gallery.map((image, index) => (
                            <button
                              key={`thumb-${image.src}-${index}`}
                              type='button'
                              role='tab'
                              aria-selected={index === currentIndex}
                              className={`${styles.thumbItem} ${index === currentIndex ? styles.thumbActive : ''}`}
                              onClick={() => setCurrentIndex(index)}
                              onMouseEnter={() => prefetchProductImage(image.src)}
                              onFocus={() => prefetchProductImage(image.src)}
                              aria-label={`View image ${index + 1} of ${gallery.length}`}
                            >
                              <span className={styles.thumbImgWrap}>
                                <OptimizedImage
                                  src={productMediaUrl(image.src)}
                                  fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                                  alt={image.alt}
                                  fill
                                  sizes='96px'
                                  loading='lazy'
                                />
                                <span className={styles.thumbOverlay} aria-hidden='true' />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {mode === 'rent' ? (
                <section className={`${styles.pricingSection} `} data-aos='fade-up'>
                  <div className={styles.pricingPanel}>
                    {activeMemberDiscount ? (
                      <MemberDiscountNote percent={activeMemberDiscount} className={styles.memberDiscountNote} />
                    ) : null}
                    <div className={styles.priceCardsRow}>
                      {product.vehicle_type === 'Yachts'
                        ? yachtPricingEntries.map((entry) => (
                            <button
                              key={entry.label}
                              type='button'
                              className={`${styles.priceCard} ${selectedDuration === entry.label ? styles.priceCardActive : ''}`}
                              onClick={() => {
                                setSelectedDuration(entry.label)
                                setSelectedPrice(entry.price)
                              }}
                            >
                              <div className={styles.priceCardTop}>
                                <span className={styles.priceCardLabel}>{entry.label}</span>
                              </div>
                              <PriceCardAmount amountAed={entry.price} strikeAed={entry.strike} currency={currency} />
                            </button>
                          ))
                        : [
                            {
                              label: 'Per day',
                              price: product.dailyRate,
                              strike: product.regularRateDaily,
                              km: `${product.mileage} km/day`
                            },
                            {
                              label: 'Per week',
                              price: product.weeklyRate,
                              strike: product.regularRateWeekly,
                              km: `${product.weeklyMileage} km/week`
                            },
                            {
                              label: 'Per month',
                              price: product.monthlyRate,
                              strike: product.regularRateMonthly,
                              km: `${product.monthlyMileage} km/month`
                            }
                          ].map((entry) => (
                            <button
                              key={entry.label}
                              type='button'
                              className={`${styles.priceCard} ${selectedDuration === entry.label ? styles.priceCardActive : ''}`}
                              onClick={() => {
                                setSelectedDuration(entry.label)
                                setSelectedPrice(entry.price)
                              }}
                            >
                              <div className={styles.priceCardTop}>
                                <span className={styles.priceCardLabel}>{entry.label}</span>
                                <span className={styles.priceCardMeta}>{CAR_PRICE_META[entry.label]}</span>
                              </div>
                              <PriceCardAmount amountAed={entry.price} currency={currency} />
                              {entry.strike > entry.price ? (
                                <p className={styles.priceCardKm}>
                                  <span className={styles.oldPrice}>
                                    <StrikePriceWrap>
                                      <FormattedPrice amount={entry.strike} fromAED strikethrough />
                                    </StrikePriceWrap>
                                  </span>
                                </p>
                              ) : null}
                              <p className={styles.priceCardKm}>• {entry.km}</p>
                            </button>
                          ))}

                      <div className={styles.moreInfoBar}>
                        <h5 className={styles.moreInfoTitle}>More information</h5>
                        <ul className={styles.moreInfoList}>
                          {(product.vehicle_type === 'Yachts'
                            ? yachtMoreInfoItems
                            : [
                                `Extra: ${formatPriceFromAED(product.mileageCost || 15)} per km`,
                                'GCC spec vehicle',
                                'Insurance included',
                                'Monthly rent available'
                              ]
                          ).map((item) => (
                            <li key={item} className={styles.moreInfoItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/tick.svg')} alt='' className={styles.moreInfoTick} aria-hidden='true' />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className={`${styles.overviewSection} `} data-aos='fade-up'>
                <h3 className={styles.sectionHeading}>{product.vehicle_type === 'Yachts' ? 'Yacht Overview' : 'Car Overview'}</h3>
                <div className={styles.overviewPanel}>
                  <div className={styles.overviewGrid}>
                    {overviewItems
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label} className={styles.overviewRow}>
                          <div className={styles.overviewIconBox}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={toAssetUrl(`images/icons/${item.icon}.svg`)}
                              alt={item.label}
                              className={styles.overviewIcon}
                              title='ghost-rental-overview-icon'
                            />
                          </div>
                          <div className={styles.overviewText}>
                            <h4>{item.label}</h4>
                            <p>{item.value}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>

              <section className={`${styles.featuresSection} `} data-aos='fade-up'>
                <h3 className={styles.sectionHeading}>Features</h3>
                <div className={styles.featureGroups}>
                  {carFeatureGroups
                    .filter((group) => group.items.length > 0)
                    .map((group) => (
                      <div key={group.title} className={styles.featureCard}>
                        <h4>{group.title}</h4>
                        <ul className={styles.featureList}>
                          {group.items.map((item, index) => {
                            const featureIconSrc = featureMediaFromRaw(item.imageData)
                            return (
                              <li key={`${item.name}-${index}`} className={styles.featureItem}>
                                {featureIconSrc ? (
                                  <OptimizedImage
                                    src={featureIconSrc}
                                    alt={item.imageData?.alt || item.name}
                                    title={item.imageData?.name || item.name}
                                    className={styles.featureIcon}
                                    width={40}
                                    height={40}
                                    sizes={IMAGE_SIZES.brand}
                                    loading='lazy'
                                  />
                                ) : null}
                                <span>{item.name}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  {product.vehicle_type === 'Yachts' && product.feature_data.length > 0 ? (
                    <div className={`${styles.featureCard} ${styles.addonsCard}`}>
                      <h4>Add-ons</h4>
                      <ul className={styles.addonsList}>
                        {orderedYachtAddons.map((item, index) => {
                          const featureIconSrc = featureMediaFromRaw(item.imageData)
                          return (
                            <li key={`addon-${item.name}-${index}`} className={styles.featureItem}>
                              {featureIconSrc ? (
                                <OptimizedImage
                                  src={featureIconSrc}
                                  alt={item.imageData?.alt || item.name}
                                  title={item.imageData?.name || item.name}
                                  className={styles.featureIcon}
                                  width={40}
                                  height={40}
                                  sizes={IMAGE_SIZES.brand}
                                  loading='lazy'
                                />
                              ) : null}
                              <span>{item.name}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>

              {mode === 'rent' ? (
                <section className={`${styles.infoSectionWrap} `} data-aos='fade-up'>
                  <h3 className={styles.sectionHeading}>Description</h3>
                  <div className={`${styles.infoSection} ${styles.descriptionPanel}`}>
                    <div className={styles.descriptionWrapper}>
                      <div className={styles.descriptionText} dangerouslySetInnerHTML={{ __html: convertedDescription }} />
                      {hasShortDescription ? (
                        <div
                          className={`${styles.descriptionExtra} ${
                            showFullDescription ? styles.descriptionExpanded : styles.descriptionCollapsed
                          }`}
                          dangerouslySetInnerHTML={{ __html: convertedShortDescription }}
                        />
                      ) : null}
                    </div>
                    {hasShortDescription ? (
                      <button type='button' className={styles.readMoreBtn} onClick={() => setShowFullDescription((prev) => !prev)}>
                        {showFullDescription ? 'Read less' : 'Read More'}
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className={`${styles.locationSection} `} data-aos='fade-up'>
                <div className={styles.locationHeaderRow}>
                  <p className={styles.locationHeading}>Location</p>
                </div>
                <div className={styles.locationBodyRow}>
                  <div className={styles.locationCard}>
                    <div className={styles.locationInner}>
                      <p className={styles.locationAddress}>
                        {location.addressLine1}
                        <br />
                        {location.addressLine2}
                        <br />
                        {location.addressLine3}
                      </p>
                      <div className={styles.locationMapWrap}>
                        <iframe
                          src={location.mapEmbedUrl}
                          width='100%'
                          height='450'
                          className={styles.locationMapFrame}
                          allowFullScreen
                          loading='lazy'
                          referrerPolicy='no-referrer-when-downgrade'
                          title='ghost-rental-location'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className={styles.sideCol} ref={stickyContainerRef}>
              <div className={styles.stickyCardWrap} ref={stickyCardRef}>
                <div className={styles.sideCard}>
                  <div className={styles.sideImageWrap}>
                    <OptimizedImage
                      src={sideThumbnailSrc}
                      fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                      alt={product.media_data[0]?.alt || activeImage?.alt || product.name}
                      className={styles.sideImage}
                      fill
                      sizes='320px'
                      loading='lazy'
                    />
                  </div>
                  <h3 className={styles.sideTitle}>{product.name}</h3>

                  {mode === 'lease' ? (
                    <>
                      <div className={styles.monthToggle}>
                        <button onClick={() => setSelectedMonths(6)} className={selectedMonths === 6 ? styles.toggleActive : ''}>
                          6
                        </button>
                        <button onClick={() => setSelectedMonths(12)} className={selectedMonths === 12 ? styles.toggleActive : ''}>
                          12
                        </button>
                      </div>
                      <p className={styles.metric}>
                        Down Payment{' '}
                        <strong>
                          <FormattedPrice amount={leasePricing.downPayment} fromAED />
                        </strong>
                      </p>
                      <p className={styles.metric}>
                        Monthly Price{' '}
                        <strong>
                          <FormattedPrice amount={leasePricing.monthlyInstallment} fromAED />
                        </strong>
                      </p>
                    </>
                  ) : null}

                  <div className={styles.ctaStack}>
                    <button onClick={() => setIsModalOpen(true)} className={styles.ctaQuickBtn}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toAssetUrl('images/icons/product-detail-email-icon.svg')}
                        alt=''
                        className={styles.ctaIcon}
                        aria-hidden='true'
                      />
                      <span>Quick Inquiry</span>
                    </button>
                    <div className={styles.ctaRow}>
                      <a href={`tel:+${PHONE_NUMBER}`} className={styles.ctaCallBtn}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={toAssetUrl('images/icons/call-action.svg')} alt='' className={styles.ctaIcon} aria-hidden='true' />
                        <span>Call</span>
                      </a>
                      <button onClick={() => openWhatsapp(product)} className={styles.ctaWhatsappBtn}>
                        <span className={styles.whatsappIconWrap}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')}
                            alt=''
                            className={styles.whatsappIconDefault}
                            aria-hidden='true'
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/whatsapp-call-active.svg')}
                            alt=''
                            className={styles.whatsappIconHover}
                            aria-hidden='true'
                          />
                        </span>
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                  <hr className={styles.sideDivider} />
                  <p className={styles.sideDisclaimer}>
                    By booking, you agree to our terms and conditions. All rentals include comprehensive insurance.
                  </p>
                </div>

                <div className={`${styles.sideCard} ${styles.googleCard}`}>
                  <h4 className={styles.googleCardTitle}>
                    <AssetImageWithFallback path='home/google-review-image.png' alt='Google Reviews' className={styles.googleReviewBadge} />
                    <span>Reviews</span>
                  </h4>
                  <div className={styles.googleRatingRow}>
                    <strong className={styles.googleRatingNumber}>{reviews.google_rating.toFixed(1)}</strong>
                    <span className={styles.googleStars}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`star-${index}`} src={toAssetUrl('images/icons/star-iconcolor.svg')} alt='' aria-hidden='true' />
                      ))}
                    </span>
                    <strong className={styles.googleRatingCount}>({reviews.user_ratings_total})</strong>
                  </div>
                  <a
                    href={reviews.google_url || 'https://maps.google.com'}
                    target='_blank'
                    rel='noreferrer'
                    className={styles.googleViewMore}
                  >
                    View More
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className={`${styles.relatedSection} `} data-aos='fade-up'>
          <div className={styles.container}>
            <h3>
              Related {product.bodyTypeName} {mode === 'lease' ? 'for Lease' : 'for Rent'}
            </h3>
            <div className={styles.relatedGrid}>
              {relatedProducts.map((car) => {
                const productHref = vehicleProductPath(car.url_key, mode)

                if (mode !== 'lease') {
                  return (
                    <div key={car.id} className={styles.relatedCardCell}>
                      {car.vehicle_type === 'Yachts' ? (
                        <YachtCard yacht={toYachtItemFromProductDetail(car)} productHref={productHref} />
                      ) : (
                        <CarCard car={toCarItemFromProductDetail(car)} productHref={productHref} />
                      )}
                    </div>
                  )
                }

                return (
                  <article
                    key={car.id}
                    className={styles.relatedCard}
                    role='link'
                    tabIndex={0}
                    onClick={(event) => handleRelatedCardNavigate(productHref, event)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      router.push(productHref)
                    }}
                  >
                    <div className={styles.relatedImageWrap}>
                      <button
                        className={`${styles.relatedWishlist} ${itemIsWishlisted(car) ? styles.heartActive : ''}`}
                        onClick={(event) => void toggleWishlist(car, false, event)}
                        aria-label='Toggle wishlist'
                        aria-pressed={itemIsWishlisted(car)}
                      >
                        <span className={styles.heartStack}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/heart_icon/heart_inactive.svg')}
                            alt=''
                            className={styles.heartBase}
                            draggable={false}
                            aria-hidden
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/heart_icon/heart_active.svg')}
                            alt=''
                            className={styles.heartFill}
                            draggable={false}
                            aria-hidden
                          />
                        </span>
                      </button>
                      <Link href={productHref} className={styles.relatedImageLink}>
                        <OptimizedImage
                          className={styles.relatedImage}
                          src={productMediaUrl(getProductPrimaryImageSrc(car))}
                          fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                          alt={car.gallery[0]?.alt || car.media_data[0]?.alt || car.name}
                          fill
                          sizes={IMAGE_SIZES.cardThumb}
                          loading='lazy'
                        />
                      </Link>
                    </div>
                    <div className={styles.relatedBody}>
                      <div className={styles.relatedInfo}>
                        <div>
                          <h4>{car.name}</h4>
                          <p>{car.vehicle_type === 'Yachts' ? car.bodyTypeName : car.transmission}</p>
                        </div>
                        {car.isvipNumberPlate ? <span className={styles.relatedSpecialTag}>Special Plate</span> : null}
                      </div>

                      <div className={styles.relatedSpecs}>
                        {car.vehicle_type === 'Yachts' ? (
                          <>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/year2.svg')} alt='Year' />
                              <h6>{car.year || 'N/A'}</h6>
                            </div>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/length.svg')} alt='Length' />
                              <h6>{car.length || 'N/A'}</h6>
                            </div>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/guests.svg')} alt='Guests' />
                              <h6>{car.guest_capacity || 'N/A'} Guests</h6>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/petrol2.svg')} alt='Fuel type' />
                              <h6>{car.fuelType || 'N/A'}</h6>
                            </div>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/mileage2.svg')} alt='Mileage' />
                              <h6>{Math.round(car.mileage || 0)} km/day</h6>
                            </div>
                            <div className={styles.relatedSpecItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={toAssetUrl('images/icons/seat2.png')} alt='Seats' />
                              <h6>{car.seating_capacity || 'N/A'} Pax</h6>
                            </div>
                          </>
                        )}
                      </div>

                      <div className={styles.relatedFooter}>
                        <div className={styles.relatedPriceBlock}>
                          <span className={styles.relatedOldPrice}>
                            <StrikePriceWrap>
                              <FormattedPrice amount={car.purchase_price * 0.15 || car.dailyRate} fromAED strikethrough />{' '}
                              <span className={styles.relatedOldPriceSuffix}>/month</span>
                            </StrikePriceWrap>
                          </span>
                          <div className={styles.relatedPriceMain}>
                            <h6 className={styles.relatedNewPrice}>
                              <FormattedPrice amount={car.purchase_price * 0.075 || car.dailyRate} fromAED />
                            </h6>
                            <span className={styles.relatedPricePeriod}>/month</span>
                          </div>
                        </div>
                        <div className={styles.relatedActions}>
                          <a
                            href={`tel:+${PHONE_NUMBER}`}
                            className={styles.relatedActionBtn}
                            data-variant='call'
                            aria-label='Call'
                            onClick={(event) => event.stopPropagation()}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={toAssetUrl('images/icons/call-action.svg')} alt='' />
                          </a>
                          <button
                            type='button'
                            className={styles.relatedActionBtn}
                            data-variant='whatsapp'
                            aria-label='WhatsApp'
                            onClick={(event) => {
                              event.stopPropagation()
                              openWhatsapp(car)
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='' />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {isGalleryAllOpen ? (
        <div className={styles.galleryAllOverlay} onClick={closeGalleryAll} role='presentation'>
          <div
            className={styles.galleryAllPanel}
            onClick={(event) => event.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label={`All photos of ${product.name}`}
          >
            <div className={styles.galleryAllHeader}>
              <h3 className={styles.galleryAllTitle}>
                All Photos <span className={styles.galleryAllCount}>({gallery.length})</span>
              </h3>
              <button type='button' className={styles.galleryAllClose} onClick={closeGalleryAll} aria-label='Close gallery'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toAssetUrl('images/icons/white-close.svg')} alt='' width={12} height={12} />
              </button>
            </div>
            <div className={styles.galleryAllGrid}>
              {gallery.map((image, index) => (
                <div
                  key={`all-${image.src}-${index}`}
                  role='button'
                  tabIndex={0}
                  className={`${styles.galleryAllItem} ${index === currentIndex ? styles.galleryAllItemActive : ''}`}
                  onClick={() => selectGalleryImage(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectGalleryImage(index)
                    }
                  }}
                  aria-label={`View photo ${index + 1} of ${gallery.length}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                >
                  <OptimizedImage
                    className={styles.galleryAllImg}
                    src={productMediaUrl(image.src)}
                    fallbackSrc={VEHICLE_PLACEHOLDER_SRC}
                    alt={image.alt || product.name}
                    width={1200}
                    height={800}
                    sizes='(max-width: 768px) 50vw, 480px'
                    loading='lazy'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <h3>Quick Inquiry</h3>
            <form onSubmit={submitInquiry} className={styles.form}>
              <input
                type='text'
                placeholder='Name'
                value={inquiryForm.name}
                onChange={(event) => setInquiryForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                type='email'
                placeholder='Email'
                value={inquiryForm.email}
                onChange={(event) => setInquiryForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                type='tel'
                placeholder='Phone'
                value={inquiryForm.phone}
                onChange={(event) => setInquiryForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <textarea
                rows={4}
                placeholder='Message'
                value={inquiryForm.message}
                onChange={(event) => setInquiryForm((prev) => ({ ...prev, message: event.target.value }))}
              />
              {submitError ? <p className={styles.error}>{submitError}</p> : null}
              {submitMessage ? <p className={styles.success}>{submitMessage}</p> : null}
              <button type='submit' className={styles.blackBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <FaqSection />
    </>
  )
}
