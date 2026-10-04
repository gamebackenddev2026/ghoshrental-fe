'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ChevronRight, Search } from 'lucide-react'
import styles from './hero.module.css'
import { getBrands, getFilteredVehicles } from '@/lib/api/home'
import { getAllCategory } from '@/lib/api/category'
import { vehicleProductPath } from '@/lib/api/adapters'

/**
 * Mirrors Angular HomeComponent.goToVehiclePage (home.component.ts line 1131):
 *   goToVehiclePage(type) {
 *     const queryParams = { type };
 *     if (type === 'Chauffeur') { queryParams.type = 'Car'; queryParams.chauffeur = 'true'; }
 *     this.router.navigate(['/product/search'], { queryParams });
 *   }
 *
 *   Car      → /product/search?type=Car
 *   Yachts   → /product/search?type=Yachts
 *   Chauffeur→ /product/search?type=Car&chauffeur=true
 */
function buildVehicleSearchUrl(type: 'Car' | 'Yachts' | 'Chauffeur'): string {
  const params = new URLSearchParams()
  if (type === 'Chauffeur') {
    params.set('type', 'Car')
    params.set('chauffeur', 'true')
  } else {
    params.set('type', type)
  }
  return `/product/search?${params.toString()}`
}

type SearchCategory = {
  _id?: string
  name?: string
  url_key?: string
}

type SearchBrand = {
  _id?: string
  name?: string
  url_key?: string
  istopbrand?: boolean
}

type SearchVehicle = {
  _id?: string
  name?: string
  url_key?: string
  model?: string
  brand?: string
  body_type?: string
}

const HERO_SEARCH_PLACEHOLDER = 'Find Luxury Cars and Yachts in Dubai'

type VehicleTab = 'Car' | 'Yachts' | 'Chauffeur'
const VEHICLE_TABS: VehicleTab[] = ['Car', 'Yachts', 'Chauffeur']

function toBrandQueryValue(brand: SearchBrand): string {
  const raw = (brand.url_key ?? '').trim()
  if (raw) return raw
  return (brand.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function HeroSearchPanel() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<VehicleTab>('Car')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categories, setCategories] = useState<SearchCategory[]>([])
  const [brands, setBrands] = useState<SearchBrand[]>([])

  // Real vehicle + location pools — mirrors Angular's ourCarCollections,
  // ourYachtsCollections, locationData used by onSearchChange()
  const [carPool, setCarPool] = useState<SearchVehicle[]>([])
  const [yachtPool, setYachtPool] = useState<SearchVehicle[]>([])

  const handleVehicleTabClick = (tab: VehicleTab) => {
    setActiveTab(tab)
    router.push(buildVehicleSearchUrl(tab))
  }

  const navigateToSearch = (value: string, mode: 'category' | 'brand') => {
    const params = new URLSearchParams()
    if (mode === 'category') {
      params.set('type', 'Car')
      params.set('category', value)
    } else {
      params.set('type', 'Car')
      params.set('brand', value)
    }
    router.push(`/product/search?${params.toString()}`)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [categoryRes, brandsRes, carsRes, yachtsRes] = await Promise.all([
          getAllCategory({}),
          getBrands({}),
          getFilteredVehicles({ limit: 100, page: 1, availabilityStatus: 'available', vehicle_type: 'Car', home_vehicle: true }),
          getFilteredVehicles({ limit: 100, page: 1, availabilityStatus: 'available', vehicle_type: 'Yachts', home_vehicle: true })
        ])
        if (cancelled) return

        setCategories(categoryRes.code === 200 && Array.isArray(categoryRes.result) ? (categoryRes.result as SearchCategory[]) : [])
        setBrands(
          brandsRes.code === 200 && Array.isArray(brandsRes.result)
            ? (brandsRes.result as SearchBrand[]).filter((item) => item.istopbrand)
            : []
        )
        setCarPool(carsRes.code === 200 && Array.isArray(carsRes.result) ? (carsRes.result as SearchVehicle[]) : [])
        setYachtPool(yachtsRes.code === 200 && Array.isArray(yachtsRes.result) ? (yachtsRes.result as SearchVehicle[]) : [])
      } catch {
        if (cancelled) return
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const topSearches = useMemo(() => categories.filter((item) => Boolean(item.url_key)).slice(0, 5), [categories])
  const trendingBrands = useMemo(() => brands.slice(0, 5), [brands])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredCars = useMemo(() => {
    if (!normalizedQuery) return []
    return carPool
      .filter(
        (car) =>
          (car.name ?? '').toLowerCase().includes(normalizedQuery) ||
          (car.model ?? '').toLowerCase().includes(normalizedQuery) ||
          (car.brand ?? '').toLowerCase().includes(normalizedQuery) ||
          (car.body_type ?? '').toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 8)
  }, [carPool, normalizedQuery])

  const filteredYachts = useMemo(() => {
    if (!normalizedQuery) return []
    return yachtPool
      .filter(
        (yacht) => (yacht.name ?? '').toLowerCase().includes(normalizedQuery) || (yacht.model ?? '').toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 8)
  }, [yachtPool, normalizedQuery])

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push(`/product/search?name=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const tabLabel = (tab: VehicleTab) => (tab === 'Yachts' ? 'Yacht Rentals' : tab === 'Chauffeur' ? 'Chauffeur Services' : 'Car Rentals')

  const renderQuickLinkGrid = (
    items: Array<{ _id?: string; name?: string; url_key?: string }>,
    mode: 'category' | 'brand',
    onNavigate?: () => void
  ) => (
    <div className={styles.linkGrid}>
      {items.map((item) => (
        <button
          key={`hero-${mode}-${item._id ?? item.url_key ?? item.name}`}
          type='button'
          className={styles.suggestionLink}
          onClick={() => {
            if (mode === 'category' && item.url_key) {
              navigateToSearch(item.url_key, 'category')
              onNavigate?.()
            }
            if (mode === 'brand') {
              const query = toBrandQueryValue(item as SearchBrand)
              if (query) {
                navigateToSearch(query, 'brand')
                onNavigate?.()
              }
            }
          }}
        >
          <span>{item.name}</span>
          <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
        </button>
      ))}
    </div>
  )

  const renderSuggestionBody = (onNavigate?: () => void) =>
    searchQuery ? (
      <div className={styles.searchResults}>
        {[...filteredCars, ...filteredYachts].length > 0 ? (
          <div className={styles.searchItems}>
            {[...filteredCars, ...filteredYachts].map((vehicle) => (
              <button
                key={`hero-vehicle-${vehicle._id ?? vehicle.url_key ?? vehicle.name}`}
                type='button'
                className={styles.searchItemButton}
                onClick={() => {
                  onNavigate?.()
                  router.push(vehicleProductPath(vehicle.url_key))
                }}
              >
                {vehicle.name}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No results found for &quot;{searchQuery}&quot;</p>
        )}
      </div>
    ) : (
      <div className={styles.quickLists}>
        <div>
          <p className={styles.dropdownHeading}>Top Searches</p>
          {renderQuickLinkGrid(topSearches, 'category', onNavigate)}
        </div>
        <div className={styles.quickListSpacing}>
          <p className={styles.dropdownHeading}>Trending Brands</p>
          {renderQuickLinkGrid(trendingBrands, 'brand', onNavigate)}
        </div>
      </div>
    )

  const renderSearchField = (opts: { mobileTrigger?: boolean }) => (
    <div
      className={styles.searchInputRow}
      {...(opts.mobileTrigger ? { onClick: () => setMobileOpen(true), style: { cursor: 'pointer' } } : {})}
    >
      {opts.mobileTrigger ? (
        <span className={styles.inputPlaceholder}>{HERO_SEARCH_PLACEHOLDER}</span>
      ) : (
        <input
          type='search'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearchSubmit()
          }}
          className={styles.inputFocus}
          placeholder={HERO_SEARCH_PLACEHOLDER}
        />
      )}
      <Search className={styles.searchInputIcon} size={20} strokeWidth={2.25} aria-hidden />
    </div>
  )

  return (
    <>
      {/* Desktop: unified glass panel — tabs, search, suggestions */}
      <div className={`${styles.desktopOnly} ${styles.searchPanel}`}>
        <div className={styles.searchPanelUnified}>
          <div className={styles.tabsToolbar}>
            <div className={styles.tabsRowInline} role='tablist' aria-label='Rental type'>
              {VEHICLE_TABS.map((tab) => (
                <button
                  key={tab}
                  type='button'
                  role='tab'
                  aria-selected={activeTab === tab}
                  className={`${styles.tabBtnInline} ${activeTab === tab ? styles.tabBtnInlineActive : ''}`.trim()}
                  onClick={() => handleVehicleTabClick(tab)}
                >
                  {tabLabel(tab)}
                </button>
              ))}
            </div>
            <button type='button' className={styles.toolbarSearchBtn} onClick={handleSearchSubmit}>
              Search
            </button>
          </div>

          <div className={styles.searchInputGroup}>
            {renderSearchField({})}
            <div className={styles.suggestionBody}>{renderSuggestionBody()}</div>
          </div>
        </div>
      </div>

      <div className={`${styles.mobileOnly} ${styles.searchPanel}`}>
        <div className={styles.searchPanelUnified}>
          <div className={styles.tabsToolbar}>
            <div className={styles.tabsRowInline}>
              {VEHICLE_TABS.map((tab) => (
                <button
                  key={tab}
                  type='button'
                  role='tab'
                  aria-selected={activeTab === tab}
                  className={`${styles.tabBtnInline} ${activeTab === tab ? styles.tabBtnInlineActive : ''}`.trim()}
                  onClick={() => handleVehicleTabClick(tab)}
                >
                  {tabLabel(tab)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.mobileSearchTrigger} onClick={() => setMobileOpen(true)}>
            {renderSearchField({ mobileTrigger: true })}
          </div>
        </div>
      </div>

      {mobileOpen &&
        createPortal(
          <div className={styles.mobileSearchOverlay}>
            <button type='button' className={styles.mobileClose} onClick={() => setMobileOpen(false)}>
              Close
            </button>
            <div className={styles.mobileInner}>
              <div className={styles.searchInputRow}>
                <input
                  type='search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit()
                      setMobileOpen(false)
                    }
                  }}
                  className={styles.inputFocus}
                  placeholder={HERO_SEARCH_PLACEHOLDER}
                  autoFocus
                />
                <Search className={styles.searchInputIcon} size={20} strokeWidth={2.25} aria-hidden />
              </div>
              <button
                type='button'
                className={styles.toolbarSearchBtn}
                onClick={() => {
                  handleSearchSubmit()
                  setMobileOpen(false)
                }}
              >
                Search
              </button>
              <hr className={styles.mobileDivider} />
              {renderSuggestionBody(() => setMobileOpen(false))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
