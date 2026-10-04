'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './header.module.css'
import { useIntroVideo } from '@/components/intro/IntroVideoProvider'
import { clearAuthSession } from '@/lib/authSession'
import { AUTH_CHANGED_EVENT, getClientAuthToken } from '@/lib/authToken'
import type { MyMembershipStatus } from '@/lib/api/membership'
import {
  MEMBERSHIP_CHANGED_EVENT,
  clearStoredMembership,
  readStoredMembership,
  refreshMembershipStatus
} from '@/lib/membershipStatus'
import { toAssetUrl } from '@/lib/config'
import { vehicleProductPath } from '@/lib/api/adapters'
import { getAllCategory } from '@/lib/api/category'
import { getAllLocations, getBrands, getCarTypes, getFilteredVehicles } from '@/lib/api/home'
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency'
import { ensureRatesFresh, getSelectedCurrency, getSelectedCurrencyServerSnapshot, setSelectedCurrency, subscribeSelectedCurrency } from '@/lib/currency-service'
import { carTypes as fallbackFleetBodyTypes, topCategories as fallbackFleetCategories } from '@/components/home/mockData'
import { currentGoogleTranslateLang, forceGoogleTranslateLanguage } from '@/components/i18n/GoogleTranslateWidget'

const WA_MESSAGE = `Hello Ghost Rentals! I'm interested in booking a car. Could you please help me with:\n - Is this car available for my dates?\n - Free UAE delivery service.\n - Chauffeur services if needed.\n\nI'm looking to Elevate my Drive with your Executive fleet! Thank you!`
const WA_HREF = `https://wa.me/97180044678?text=${encodeURIComponent(WA_MESSAGE)}`

type NavLinkItem = { kind: 'link'; label: string; href: string }
type NavFleetItem = { kind: 'fleet'; label: string }
type NavItem = NavLinkItem | NavFleetItem

const NAV_ITEMS: NavItem[] = [
  { kind: 'link', label: 'Home', href: '/' },
  { kind: 'link', label: 'About Us', href: '/about' },
  { kind: 'link', label: 'Our Services', href: '/services' },
  { kind: 'link', label: 'Lease to Own', href: '/product/lease' },
  { kind: 'fleet', label: 'Our Fleet' },
  { kind: 'link', label: 'Membership', href: '/membership' },
  { kind: 'link', label: 'Blog', href: '/blog' }
]

type FleetCategory = {
  _id?: string
  name?: string
  url_key?: string
}

type FleetBodyType = {
  _id?: string
  name?: string
  url_key?: string
  title?: string
}

type FleetLocation = {
  _id?: string
  name?: string
  url_key?: string
}

type FleetBrand = {
  _id?: string
  name?: string
  url_key?: string
  istopbrand?: boolean
}

type FleetVehicle = {
  _id?: string
  name?: string
  url_key?: string
  model?: string
  brand?: string
}

const FLEET_PERIOD_LINKS = [
  { key: 'hourlyrental_cars', label: 'Hourly Rental' },
  { key: 'dailyrental_cars', label: 'Daily Rental' },
  { key: 'weeklyrental_cars', label: 'Weekly Rental' },
  { key: 'leasing_cars', label: 'Monthly Rental' }
]

/** Shown in Our Fleet menu while categories / body types API is slow or empty. Mirrors home mockData. */
const STATIC_FLEET_CATEGORIES: FleetCategory[] = fallbackFleetCategories.map((c) => ({
  name: c.name,
  url_key: c.url_key
}))

const STATIC_FLEET_BODY_TYPES: FleetBodyType[] = fallbackFleetBodyTypes.map((b) => ({
  name: b.name,
  url_key: b.url_key,
  title: b.title
}))

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      width={20}
      height={20}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <circle cx='11' cy='11' r='8' />
      <path d='m21 21-4.3-4.3' />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      width={22}
      height={22}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' aria-hidden>
      <path d='M5 16 3 6l5 4 4-6 4 6 5-4-2 10H5Zm0 2h14v2H5v-2Z' />
    </svg>
  )
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      width={12}
      height={12}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='m6 9 6 6 6-6' />
    </svg>
  )
}

/**
 * Routes that use the hero-overlay variant of the header — transparent
 * background with extra top padding (70px/50px). Mirrors Angular's
 * `largePaddingRoutes` in src/app/shared/header/header.component.ts.
 * Every other route keeps the default solid dark nav so content like the
 * /product/search filter sidebar isn't obscured by an invisible bar.
 */
const LARGE_PADDING_ROUTES = ['/', '/about', '/services', '/product/list', '/membership']

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + '/')
}

function toBrandQueryValue(brand: FleetBrand): string {
  const raw = (brand.url_key ?? '').trim()
  if (raw) return raw
  return (brand.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function Header({ initialLangCode = 'EN' }: { initialLangCode?: string }) {
  const { handleLogoClick, introAlreadySeen } = useIntroVideo()
  const pathname = usePathname() || '/'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const currency = useSyncExternalStore(
    subscribeSelectedCurrency,
    getSelectedCurrency,
    getSelectedCurrencyServerSnapshot
  )
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [langCode] = useState(initialLangCode)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [isFleetOpen, setIsFleetOpen] = useState(false)
  const [fleetCategories, setFleetCategories] = useState<FleetCategory[]>([])
  const [fleetBodyTypes, setFleetBodyTypes] = useState<FleetBodyType[]>([])
  const [fleetLocations, setFleetLocations] = useState<FleetLocation[]>([])
  const [fleetBrands, setFleetBrands] = useState<FleetBrand[]>([])
  const [carSearchPool, setCarSearchPool] = useState<FleetVehicle[]>([])
  const [yachtSearchPool, setYachtSearchPool] = useState<FleetVehicle[]>([])
  const [mobileFleetOpen, setMobileFleetOpen] = useState(false)
  const [mobileCurrencyOpen, setMobileCurrencyOpen] = useState(false)
  const [mobileLangOpen, setMobileLangOpen] = useState(false)
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false)
  const [mobileFleetSubOpen, setMobileFleetSubOpen] = useState<'categories' | 'bodyTypes' | 'periods' | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [membership, setMembership] = useState<MyMembershipStatus | null>(null)
  const fleetRef = useRef<HTMLLIElement | null>(null)
  const currencyRef = useRef<HTMLLIElement | null>(null)
  const searchRef = useRef<HTMLLIElement | null>(null)
  const langRef = useRef<HTMLLIElement | null>(null)

  const LANGS: Array<{ code: string; value: string; label: string }> = useMemo(
    () => [
      { code: 'EN', value: 'en', label: 'English' },
      { code: 'AR', value: 'ar', label: 'Arabic (RTL)' },
      { code: 'RU', value: 'ru', label: 'Russian' },
      { code: 'ZH', value: 'zh-CN', label: 'Chinese' },
      { code: 'FR', value: 'fr', label: 'French' }
    ],
    []
  )

  const hasLargePaddingRoute = useMemo(() => LARGE_PADDING_ROUTES.some((r) => matchesRoute(pathname, r)), [pathname])
  const showLargePadding = hasLargePaddingRoute && !isScrolled
  const onHero = showLargePadding && !isScrolled
  const headerClass = [
    styles.nav,
    showLargePadding ? styles.largePadding : '',
    isScrolled ? styles.scrolled : '',
    onHero ? styles.onHero : ''
  ]
    .filter(Boolean)
    .join(' ')

  const currentCurrency = useMemo(
    () => SUPPORTED_CURRENCIES.find((entry) => entry.code === currency) ?? SUPPORTED_CURRENCIES[0],
    [currency]
  )
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredLocations = useMemo(() => {
    if (!normalizedQuery) return []
    return fleetLocations.filter((item) => (item.name ?? '').toLowerCase().includes(normalizedQuery)).slice(0, 8)
  }, [fleetLocations, normalizedQuery])
  const filteredCars = useMemo(() => {
    if (!normalizedQuery) return []
    return carSearchPool
      .filter((item) => `${item.name ?? ''} ${item.brand ?? ''} ${item.model ?? ''}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 8)
  }, [carSearchPool, normalizedQuery])
  const filteredYachts = useMemo(() => {
    if (!normalizedQuery) return []
    return yachtSearchPool
      .filter((item) => `${item.name ?? ''} ${item.brand ?? ''} ${item.model ?? ''}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 8)
  }, [normalizedQuery, yachtSearchPool])
  const trendingBrands = useMemo(() => fleetBrands.filter((item) => item.istopbrand).slice(0, 12), [fleetBrands])
  const showSearchEmptyState = normalizedQuery && filteredLocations.length === 0 && filteredCars.length === 0 && filteredYachts.length === 0

  const fleetCategoriesDisplay = useMemo(() => (fleetCategories.length > 0 ? fleetCategories : STATIC_FLEET_CATEGORIES), [fleetCategories])
  const fleetBodyTypesDisplay = useMemo(() => (fleetBodyTypes.length > 0 ? fleetBodyTypes : STATIC_FLEET_BODY_TYPES), [fleetBodyTypes])
  const navigateToSearch = (value: string, mode: 'category' | 'location' | 'brand' | 'topsearch') => {
    const params = new URLSearchParams()
    if (mode === 'category') {
      params.set('category', value)
      params.set('type', 'Car')
    } else if (mode === 'location') {
      params.set('location', value)
    } else if (mode === 'brand') {
      params.set('type', 'Car')
      params.set('brand', value)
    } else {
      params.set('topsearch', value)
    }
    window.location.assign(`/product/search?${params.toString()}`)
  }

  const onCurrencyChange = (code: SupportedCurrency['code']) => {
    setIsCurrencyOpen(false)
    if (typeof window !== 'undefined') {
      setSelectedCurrency(code)
      window.location.reload()
    }
  }

  const syncAuthState = () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('ghostrentals-web-token')
    setIsAuthenticated(Boolean(token))
    if (token) {
      try {
        const raw = localStorage.getItem('customer')
        const customer = raw ? JSON.parse(raw) : null
        const name = (
          customer?.firstname ??
          customer?.firstName ??
          customer?.first_name ??
          customer?.name ??
          customer?.username ??
          ''
        ).trim()
        setCustomerName(name)
      } catch {
        setCustomerName('')
      }
    } else {
      setCustomerName('')
    }
  }

  const handleLogout = () => {
    if (typeof window === 'undefined') return
    clearAuthSession()
    clearStoredMembership()
    setIsAuthenticated(false)
    setCustomerName('')
    setMembership(null)
    window.location.assign('/')
  }

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    const onResize = () => {
      if (window.innerWidth >= 1200) setIsMenuOpen(false)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    void ensureRatesFresh()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncAuthState()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    const onStorage = () => syncAuthState()
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUTH_CHANGED_EVENT, onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AUTH_CHANGED_EVENT, onStorage)
    }
  }, [])

  // Membership badge — read the shared cache, then refresh in the background.
  useEffect(() => {
    const syncMembership = () => {
      if (!getClientAuthToken()) {
        setMembership(null)
        return
      }
      setMembership(readStoredMembership())
    }

    syncMembership()

    const token = getClientAuthToken()
    if (token) {
      void refreshMembershipStatus(token).then((status) => {
        if (status) setMembership(status)
      })
    }

    window.addEventListener(MEMBERSHIP_CHANGED_EVENT, syncMembership)
    window.addEventListener(AUTH_CHANGED_EVENT, syncMembership)
    window.addEventListener('storage', syncMembership)
    return () => {
      window.removeEventListener(MEMBERSHIP_CHANGED_EVENT, syncMembership)
      window.removeEventListener(AUTH_CHANGED_EVENT, syncMembership)
      window.removeEventListener('storage', syncMembership)
    }
  }, [isAuthenticated])

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  useEffect(() => {
    let cancelled = false

    const loadFleet = async () => {
      try {
        const [categoryRes, bodyTypesRes, locationRes, brandRes, carsRes, yachtsRes] = await Promise.all([
          getAllCategory({}),
          getCarTypes({}),
          getAllLocations({}),
          getBrands({}),
          getFilteredVehicles({ limit: 100, page: 1, availabilityStatus: 'available', vehicle_type: 'Car', home_vehicle: true }),
          getFilteredVehicles({ limit: 100, page: 1, availabilityStatus: 'available', vehicle_type: 'Yachts', home_vehicle: true })
        ])

        if (cancelled) return

        setFleetCategories(categoryRes.code === 200 && Array.isArray(categoryRes.result) ? (categoryRes.result as FleetCategory[]) : [])
        setFleetBodyTypes(bodyTypesRes.code === 200 && Array.isArray(bodyTypesRes.result) ? (bodyTypesRes.result as FleetBodyType[]) : [])
        setFleetLocations(locationRes.code === 200 && Array.isArray(locationRes.result) ? (locationRes.result as FleetLocation[]) : [])
        setFleetBrands(brandRes.code === 200 && Array.isArray(brandRes.result) ? (brandRes.result as FleetBrand[]) : [])
        setCarSearchPool(carsRes.code === 200 && Array.isArray(carsRes.result) ? (carsRes.result as FleetVehicle[]) : [])
        setYachtSearchPool(yachtsRes.code === 200 && Array.isArray(yachtsRes.result) ? (yachtsRes.result as FleetVehicle[]) : [])
      } catch {
        if (cancelled) return
        setFleetCategories([])
        setFleetBodyTypes([])
        setFleetLocations([])
        setFleetBrands([])
        setCarSearchPool([])
        setYachtSearchPool([])
      }
    }

    void loadFleet()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (!fleetRef.current?.contains(target)) setIsFleetOpen(false)
      if (!currencyRef.current?.contains(target)) setIsCurrencyOpen(false)
      if (!searchRef.current?.contains(target)) setShowSearchDropdown(false)
      if (!langRef.current?.contains(target)) setIsLangOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const closeMobileMenu = () => {
    setIsMenuOpen(false)
    setMobileFleetOpen(false)
    setMobileCurrencyOpen(false)
    setMobileLangOpen(false)
    setMobileAccountOpen(false)
    setMobileFleetSubOpen(null)
  }

  return (
    <nav className={headerClass}>
      <div className={styles.container}>
        <Link
          href='/'
          className={styles.logoLink}
          {...(!introAlreadySeen ? { 'data-intro-logo': 'true' } : {})}
          onClick={introAlreadySeen ? undefined : handleLogoClick}
        >
          <img
            src={
              logoError
                ? toAssetUrl('images/logo/footer_logo.svg')
                : showLargePadding || isScrolled
                  ? toAssetUrl('images/logo/ghotrentals-black-logo.png')
                  : toAssetUrl('images/logo/ghostrentals-logo.png')
            }
            alt='Ghost Rentals Dubai'
            className={styles.navLogo}
            onError={() => setLogoError(true)}
          />
        </Link>

        <div className={styles.mobileHeaderActions}>
          <a href={WA_HREF} target='_blank' rel='noreferrer' className={styles.mobileHeaderBook}>
            <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='' aria-hidden='true' />
            <span>Book Now</span>
          </a>
          <button
            type='button'
            className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}
            aria-label='Toggle navigation'
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            <span className={styles.hamburgerBox}>
              <span className={styles.hamburgerInner} />
            </span>
          </button>
        </div>

        <div className={styles.desktopWrap}>
          <ul className={styles.navLeft}>
            {NAV_ITEMS.map((item) =>
              item.kind === 'link' ? (
                <li key={item.href}>
                  <Link href={item.href} className={`${styles.navLink} ${matchesRoute(pathname, item.href) ? styles.active : ''}`}>
                    {item.label}
                  </Link>
                </li>
              ) : (
                <li
                  key='fleet'
                  ref={fleetRef}
                  className={styles.fleetDropdown}
                  onMouseEnter={() => setIsFleetOpen(true)}
                  onMouseLeave={() => setIsFleetOpen(false)}
                >
                  <Link className={styles.navLink} href='/product/search'>
                    {item.label}
                  </Link>
                  <div className={`${styles.fleetDropdownPanel} ${isFleetOpen ? styles.open : ''}`}>
                    <div className={styles.fleetColumn}>
                      <h3 className={styles.fleetColumnTitle}>Categories</h3>
                      <ul className={styles.fleetList}>
                        {fleetCategoriesDisplay
                          .filter((fleetItem) => Boolean(fleetItem.url_key))
                          .map((fleetItem) => (
                            <li key={`fleet-cat-${fleetItem._id ?? fleetItem.url_key ?? fleetItem.name}`}>
                              <a href={`/product/search?category=${encodeURIComponent(fleetItem.url_key ?? '')}&type=Car`}>{fleetItem.name}</a>
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className={styles.fleetColumn}>
                      <h3 className={styles.fleetColumnTitle}>Body Types</h3>
                      <ul className={styles.fleetList}>
                        {fleetBodyTypesDisplay
                          .filter((fleetItem) => Boolean(fleetItem.url_key))
                          .map((bodyType) => (
                            <li key={`fleet-body-${bodyType._id ?? bodyType.url_key ?? bodyType.name}`}>
                              <a
                                href={`/product/list/${encodeURIComponent(bodyType.url_key ?? '')}`}
                                className={styles.fleetCap}
                                title={bodyType.title || bodyType.name || ''}
                              >
                                {bodyType.name}
                              </a>
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className={styles.fleetColumn}>
                      <h3 className={styles.fleetColumnTitle}>Rentals by Period</h3>
                      <ul className={styles.fleetList}>
                        {FLEET_PERIOD_LINKS.map((period) => (
                          <li key={period.key}>
                            <a href={`/product/search?topsearch=${encodeURIComponent(period.key)}`} className={styles.fleetCap}>
                              {period.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>

          <ul className={styles.navRight}>
            <li
              ref={searchRef}
              className={styles.searchDropdown}
              onMouseEnter={() => setShowSearchDropdown(true)}
              onMouseLeave={() => setShowSearchDropdown(false)}
            >
              <div className={styles.searchBarWrapper}>
                <input
                  type='search'
                  placeholder='Search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                  className={styles.searchBarInput}
                  aria-label='Search'
                />
                <SearchIcon className={styles.searchBarIcon} />
              </div>
              <div className={`${styles.searchDropdownPanel} ${showSearchDropdown ? styles.open : ''}`}>
                <div className={styles.searchContainer}>
                  <div className={styles.slider}>
                    <input
                      type='search'
                      value={searchQuery}
                      placeholder='Find Luxury Cars and Yachts in Dubai'
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={styles.searchInput}
                    />
                  </div>
                  {normalizedQuery ? (
                    <div className={styles.searchResults}>
                      {filteredLocations.length > 0 ? (
                        <div className={styles.searchSection}>
                          <h4 className={styles.searchSectionTitle}>Locations</h4>
                          <div className={styles.searchItems}>
                            {filteredLocations.map((location) => (
                              <button
                                key={`search-location-${location._id ?? location.url_key ?? location.name}`}
                                type='button'
                                className={styles.searchItemButton}
                                onClick={() => navigateToSearch(location.url_key ?? '', 'location')}
                              >
                                {location.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {filteredCars.length > 0 ? (
                        <div className={styles.searchSection}>
                          <h4 className={styles.searchSectionTitle}>Cars</h4>
                          <div className={styles.searchItems}>
                            {filteredCars.map((car) => (
                              <a
                                key={`search-car-${car._id ?? car.url_key ?? car.name}`}
                                className={styles.searchItemButton}
                                href={vehicleProductPath(car.url_key)}
                              >
                                {car.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {filteredYachts.length > 0 ? (
                        <div className={styles.searchSection}>
                          <h4 className={styles.searchSectionTitle}>Yachts</h4>
                          <div className={styles.searchItems}>
                            {filteredYachts.map((yacht) => (
                              <a
                                key={`search-yacht-${yacht._id ?? yacht.url_key ?? yacht.name}`}
                                className={styles.searchItemButton}
                                href={vehicleProductPath(yacht.url_key)}
                              >
                                {yacht.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {showSearchEmptyState ? (
                        <p className={styles.searchEmpty}>
                          No results found for &ldquo;<span>{searchQuery}</span>&rdquo;
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.searchResults}>
                      <div className={styles.searchSection}>
                        <p className={styles.searchSectionTitle}>Top Searches</p>
                        <div className={styles.chipScroll}>
                          {fleetCategoriesDisplay.slice(0, 12).map((category) => (
                            <button
                              key={`chip-category-${category._id ?? category.url_key ?? category.name}`}
                              type='button'
                              className={styles.chip}
                              onClick={() => navigateToSearch(category.url_key ?? '', 'category')}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.searchSection}>
                        <p className={styles.searchSectionTitle}>Trending Brands</p>
                        <div className={styles.chipScroll}>
                          {trendingBrands.map((brand) => {
                            const brandQuery = toBrandQueryValue(brand)
                            return (
                              <button
                                key={`chip-brand-${brand._id ?? brand.url_key ?? brand.name}`}
                                type='button'
                                className={styles.chip}
                                onClick={() => {
                                  if (!brandQuery) return
                                  navigateToSearch(brandQuery, 'brand')
                                }}
                              >
                                {brand.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
            <li ref={langRef} className={styles.langDropdown}>
              <button
                type='button'
                className={styles.langCurrent}
                onClick={() => setIsLangOpen((prev) => !prev)}
                aria-expanded={isLangOpen}
                aria-label='Language'
              >
                {langCode}
                <ChevronDown className={`${styles.currencyChevron} ${isLangOpen ? styles.rotate : ''}`} />
              </button>
              <div className={`${styles.langMenu} ${isLangOpen ? styles.langMenuOpen : ''}`}>
                {LANGS.map((item) => (
                  <button
                    key={item.value}
                    type='button'
                    className={`${styles.langOption} ${item.code === langCode ? styles.langActive : ''}`}
                    onClick={() => {
                      setIsLangOpen(false)
                      const active = currentGoogleTranslateLang() || 'en'
                      if (item.value === active) return
                      forceGoogleTranslateLanguage(item.value)
                    }}
                    title={item.label}
                  >
                    <span>{item.code}</span>
                  </button>
                ))}
              </div>
            </li>
            <li ref={currencyRef} className={styles.currencyDropdown}>
              <button
                type='button'
                className={styles.currencyCurrent}
                onClick={() => setIsCurrencyOpen((prev) => !prev)}
                aria-expanded={isCurrencyOpen}
              >
                {currentCurrency.code}
                <ChevronDown className={`${styles.currencyChevron} ${isCurrencyOpen ? styles.rotate : ''}`} />
              </button>
              <div className={`${styles.currencyMenu} ${isCurrencyOpen ? styles.currencyMenuOpen : ''}`}>
                {SUPPORTED_CURRENCIES.map((item) => (
                  <button
                    key={item.code}
                    type='button'
                    className={`${styles.currencyOption} ${item.code === currency ? styles.currencyActive : ''}`}
                    onClick={() => onCurrencyChange(item.code)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.flag} alt='' width={20} height={16} className={styles.mflagimg} />
                    <span>{item.code}</span>
                  </button>
                ))}
              </div>
            </li>
            <li className={styles.userDropdown}>
              <button type='button' className={styles.iconButton} aria-label='Account'>
                {isAuthenticated && customerName ? (
                  <span className={styles.avatarWrap}>
                    <span className={styles.avatarBadge}>{customerName.charAt(0).toUpperCase()}</span>
                    {membership?.isMember ? (
                      <span className={styles.memberBadge} title={membership.planName ? `${membership.planName} member` : 'Member'}>
                        <CrownIcon className={styles.memberBadgeIcon} />
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <UserIcon className={styles.headerIcon} />
                )}
              </button>
              <div className={`${styles.userMenu} ${!isAuthenticated ? styles.userMenuGuest : ''}`}>
                {isAuthenticated ? (
                  <>
                    <div className={styles.userMenuHeader}>
                      <span className={styles.userMenuAvatar}>{customerName ? customerName.charAt(0).toUpperCase() : '?'}</span>
                      <div>
                        <p className={styles.userMenuName}>{customerName || 'Account'}</p>
                        {membership?.isMember ? (
                          <p className={styles.userMenuMembership}>
                            <CrownIcon className={styles.userMenuMembershipIcon} />
                            {membership.planName || membership.tier || 'Member'}
                            {membership.points > 0 ? ` · ${membership.points.toLocaleString('en-AE')} pts` : ''}
                            {membership.pointsAedValue > 0
                              ? ` · AED ${membership.pointsAedValue.toLocaleString('en-AE')}`
                              : ''}
                          </p>
                        ) : (
                          <p className={styles.userMenuSub}>Manage your account</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.userMenuDivider} />
                    <Link href='/account/edit-profile' className={styles.userMenuItem}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.8}
                        className={styles.userMenuIcon}
                        aria-hidden
                      >
                        <path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' />
                        <circle cx='12' cy='7' r='4' />
                      </svg>
                      Profile
                    </Link>
                    <Link href='/account/wishlist' className={styles.userMenuItem}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.8}
                        className={styles.userMenuIcon}
                        aria-hidden
                      >
                        <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
                      </svg>
                      Wishlist
                    </Link>
                    <div className={styles.userMenuDivider} />
                    <button type='button' className={styles.userMenuButton} onClick={handleLogout}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.8}
                        className={styles.userMenuIcon}
                        aria-hidden
                      >
                        <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
                        <polyline points='16 17 21 12 16 7' />
                        <line x1='21' y1='12' x2='9' y2='12' />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href='/auth/login' className={styles.userMenuItem}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.8}
                        className={styles.userMenuIcon}
                        aria-hidden
                      >
                        <path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' />
                        <polyline points='10 17 15 12 10 7' />
                        <line x1='15' y1='12' x2='3' y2='12' />
                      </svg>
                      Login
                    </Link>
                    <Link href='/auth/register' className={styles.userMenuItem}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.8}
                        className={styles.userMenuIcon}
                        aria-hidden
                      >
                        <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                        <circle cx='9' cy='7' r='4' />
                        <line x1='19' y1='8' x2='19' y2='14' />
                        <line x1='22' y1='11' x2='16' y2='11' />
                      </svg>
                      Register
                    </Link>
                  </>
                )}
              </div>
            </li>
            <li>
              <a href={WA_HREF} target='_blank' rel='noreferrer' className={styles.bookNowBtn}>
                <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='WhatsApp' />
                <span>Book Now</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.open : ''}`} onClick={closeMobileMenu}>
        <div className={styles.mobilePanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.mobileHeader}>
            <Link
              href='/'
              className={styles.mobileLogoLink}
              {...(!introAlreadySeen ? { 'data-intro-logo': 'true' } : {})}
              onClick={
                introAlreadySeen
                  ? () => closeMobileMenu()
                  : (event) => {
                      handleLogoClick(event)
                      closeMobileMenu()
                    }
              }
            >
              <img src={toAssetUrl('images/logo/ghotrentals-black-logo.png')} alt='Ghost Rentals Dubai' className={styles.mobileLogo} />
            </Link>
            <button type='button' className={styles.mobileClose} onClick={() => setIsMenuOpen(false)} aria-label='Close menu'>
              <span className={styles.mobileCloseBox}>
                <span className={styles.mobileCloseInner} />
              </span>
            </button>
          </div>

          <div className={styles.mobileBody}>
            <ul className={styles.mobileNav}>
              {NAV_ITEMS.map((item) =>
                item.kind === 'link' ? (
                  <li key={`mobile-${item.href}`}>
                    <Link href={item.href} onClick={closeMobileMenu}>
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key='mobile-fleet' className={styles.mobileDropdownItem}>
                    <div className={styles.mobileDropdownTrigger}>
                      <Link href='/product/search' onClick={closeMobileMenu}>
                        {item.label}
                      </Link>
                      <button
                        type='button'
                        className={styles.mobileDropdownToggle}
                        onClick={() =>
                          setMobileFleetOpen((prev) => {
                            const next = !prev
                            if (!next) setMobileFleetSubOpen(null)
                            return next
                          })
                        }
                        aria-expanded={mobileFleetOpen}
                        aria-label='Toggle Our Fleet submenu'
                      >
                        <ChevronDown className={`${styles.mobileChevron} ${mobileFleetOpen ? styles.rotate : ''}`} />
                      </button>
                    </div>

                    <div className={`${styles.mobileFleetPanel} ${mobileFleetOpen ? styles.open : ''}`}>
                      <div className={styles.mobileFleetSubGroup}>
                        <button
                          type='button'
                          className={styles.mobileFleetSubTrigger}
                          onClick={() => setMobileFleetSubOpen((prev) => (prev === 'categories' ? null : 'categories'))}
                          aria-expanded={mobileFleetSubOpen === 'categories'}
                        >
                          <span>Categories</span>
                          <ChevronDown className={`${styles.mobileChevron} ${mobileFleetSubOpen === 'categories' ? styles.rotate : ''}`} />
                        </button>
                        <ul className={`${styles.mobileFleetSubList} ${mobileFleetSubOpen === 'categories' ? styles.open : ''}`}>
                          {fleetCategoriesDisplay
                            .filter((fleetItem) => Boolean(fleetItem.url_key))
                            .map((fleetItem) => (
                              <li key={`m-fleet-cat-${fleetItem._id ?? fleetItem.url_key ?? fleetItem.name}`}>
                                <a
                                  href={`/product/search?category=${encodeURIComponent(fleetItem.url_key ?? '')}&type=Car`}
                                  onClick={closeMobileMenu}
                                >
                                  {fleetItem.name}
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>

                      <div className={styles.mobileFleetSubGroup}>
                        <button
                          type='button'
                          className={styles.mobileFleetSubTrigger}
                          onClick={() => setMobileFleetSubOpen((prev) => (prev === 'bodyTypes' ? null : 'bodyTypes'))}
                          aria-expanded={mobileFleetSubOpen === 'bodyTypes'}
                        >
                          <span>Body Types</span>
                          <ChevronDown className={`${styles.mobileChevron} ${mobileFleetSubOpen === 'bodyTypes' ? styles.rotate : ''}`} />
                        </button>
                        <ul className={`${styles.mobileFleetSubList} ${mobileFleetSubOpen === 'bodyTypes' ? styles.open : ''}`}>
                          {fleetBodyTypesDisplay
                            .filter((fleetItem) => Boolean(fleetItem.url_key))
                            .map((fleetItem) => (
                              <li key={`m-fleet-body-${fleetItem._id ?? fleetItem.url_key ?? fleetItem.name}`}>
                                <a href={`/product/list/${encodeURIComponent(fleetItem.url_key ?? '')}`} onClick={closeMobileMenu}>
                                  {fleetItem.name}
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>

                      <div className={styles.mobileFleetSubGroup}>
                        <button
                          type='button'
                          className={styles.mobileFleetSubTrigger}
                          onClick={() => setMobileFleetSubOpen((prev) => (prev === 'periods' ? null : 'periods'))}
                          aria-expanded={mobileFleetSubOpen === 'periods'}
                        >
                          <span>Rentals by Period</span>
                          <ChevronDown className={`${styles.mobileChevron} ${mobileFleetSubOpen === 'periods' ? styles.rotate : ''}`} />
                        </button>
                        <ul className={`${styles.mobileFleetSubList} ${mobileFleetSubOpen === 'periods' ? styles.open : ''}`}>
                          {FLEET_PERIOD_LINKS.map((period) => (
                            <li key={`m-fleet-period-${period.key}`}>
                              <a href={`/product/search?topsearch=${encodeURIComponent(period.key)}`} onClick={closeMobileMenu}>
                                {period.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                )
              )}
              <li className={styles.mobileDropdownItem}>
                <div className={styles.mobileDropdownTrigger}>
                  <span>{currentCurrency.code}</span>
                  <button
                    type='button'
                    className={styles.mobileDropdownToggle}
                    onClick={() => setMobileCurrencyOpen((prev) => !prev)}
                    aria-expanded={mobileCurrencyOpen}
                    aria-label='Toggle currency options'
                  >
                    <ChevronDown className={`${styles.mobileChevron} ${mobileCurrencyOpen ? styles.rotate : ''}`} />
                  </button>
                </div>
                <ul className={`${styles.mobileDropdownPanel} ${mobileCurrencyOpen ? styles.open : ''}`}>
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <li key={`m-currency-${item.code}`}>
                      <button
                        type='button'
                        className={`${styles.mobileCurrencyOption} ${item.code === currency ? styles.currencyActive : ''}`}
                        onClick={() => onCurrencyChange(item.code)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.flag} alt='' width={20} height={16} className={styles.mflagimg} />
                        <span>{item.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              <li className={styles.mobileDropdownItem}>
                <div className={styles.mobileDropdownTrigger}>
                  <span>{langCode}</span>
                  <button
                    type='button'
                    className={styles.mobileDropdownToggle}
                    onClick={() => setMobileLangOpen((prev) => !prev)}
                    aria-expanded={mobileLangOpen}
                    aria-label='Toggle language options'
                  >
                    <ChevronDown className={`${styles.mobileChevron} ${mobileLangOpen ? styles.rotate : ''}`} />
                  </button>
                </div>
                <ul className={`${styles.mobileDropdownPanel} ${mobileLangOpen ? styles.open : ''}`}>
                  {LANGS.map((item) => (
                    <li key={`m-lang-${item.value}`}>
                      <button
                        type='button'
                        className={`${styles.mobileLangOption} ${item.code === langCode ? styles.langActive : ''}`}
                        onClick={() => {
                          setIsMenuOpen(false)
                          setMobileLangOpen(false)
                          const active = currentGoogleTranslateLang() || 'en'
                          if (item.value === active) return
                          forceGoogleTranslateLanguage(item.value)
                        }}
                      >
                        <span>{item.code}</span>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              <li className={styles.mobileDropdownItem}>
                <div className={styles.mobileDropdownTrigger}>
                  <span>Account</span>
                  <button
                    type='button'
                    className={styles.mobileDropdownToggle}
                    onClick={() => setMobileAccountOpen((prev) => !prev)}
                    aria-expanded={mobileAccountOpen}
                    aria-label='Toggle account menu'
                  >
                    <ChevronDown className={`${styles.mobileChevron} ${mobileAccountOpen ? styles.rotate : ''}`} />
                  </button>
                </div>
                <ul className={`${styles.mobileDropdownPanel} ${mobileAccountOpen ? styles.open : ''}`}>
                  {isAuthenticated ? (
                    <>
                      <li>
                        <Link href='/account/edit-profile' onClick={closeMobileMenu}>
                          Profile
                        </Link>
                      </li>
                      <li>
                        <Link href='/account/wishlist' onClick={closeMobileMenu}>
                          Wishlist
                        </Link>
                      </li>
                      <li>
                        <button type='button' className={styles.mobileAccountAction} onClick={handleLogout}>
                          Logout
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link href='/auth/login' onClick={closeMobileMenu}>
                          Login
                        </Link>
                      </li>
                      <li>
                        <Link href='/auth/register' onClick={closeMobileMenu}>
                          Register
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </li>
            </ul>

            <a href={WA_HREF} target='_blank' rel='noreferrer' className={styles.mobileBook}>
              <img src={toAssetUrl('images/icons/whatsapp-call-inactive.svg')} alt='' aria-hidden='true' />
              <span>Book Now</span>
            </a>
          </div>

          <p className={styles.mobileFooter}>2026, All Rights Reserved Ghost Rentals</p>
        </div>
      </div>
    </nav>
  )
}
