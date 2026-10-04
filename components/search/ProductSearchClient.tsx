'use client'

/**
 * /product/search — Angular parity port of src/app/components/product/search.
 *
 * Mirrors SearchComponent (search.component.ts) from the Angular dist build.
 * Calls the same backend endpoints that DataService exposes:
 *
 *   POST /api/vehicle/getfilteredvehicle   — results + counts
 *   POST /api/brand/getAllBrand            — car-brand dropdown
 *   POST /api/cartype/getAllCartype        — car-type dropdown
 *   POST /api/bodytype/getAllBodytype      — body-type dropdown
 *
 * Payload shape + filter keys come directly from searchVehicles() in
 * search.component.ts (see the `obj` literal around line 475). `price_type` is
 * set from vehicle type (`dailyRate` / `hourlyRate`) like Angular’s
 * `updatePriceSettings()` so the API applies min/max to the correct field.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getAllBodyTypes, getAllModels, getBrands, getFilteredVehicles } from '@/lib/api/home'
import { getClientAuthToken } from '@/lib/authToken'
import { toCarItem, toYachtItem } from '@/lib/api/adapters'
import type { ApiResponse } from '@/lib/api/client'
import type { RawBrand, RawVehicle } from '@/lib/api/types'
import { toAssetUrl } from '@/lib/config'
import { CarCard, YachtCard } from '@/components/home/HomeSections'
import type { CarItem, YachtItem } from '@/components/home/mockData'
import styles from './productSearch.module.css'
import { SearchDateRangePicker } from './SearchDateRangePicker'
import { PriceDualRangeSlider } from './PriceDualRangeSlider'
import { ResultsPagination } from './ResultsPagination'
import { CurrencySymbol } from '@/components/shared/CurrencySymbol'
import { FormattedPrice } from '@/components/shared/FormattedPrice'
import { useCurrencyService } from '@/lib/currency-service'
import { FLEET_PAGE_H1 } from '@/lib/seo/pageTitles'

type VehicleType = '' | 'Car' | 'Yachts'

const PAGE_SIZE = 12
const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'L-H', label: 'Price: Low to High' },
  { value: 'H-L', label: 'Price: High to Low' }
] as const

type RawBodyType = {
  _id?: string
  name?: string
  url_key?: string
  vehicle_type?: string
  /** Angular’s getAllBodytype rows use `type` mirroring `vehicleType` */
  type?: string
}

type RawModel = {
  _id?: string
  name?: string
  brandId?: string
  brand_id?: string
  brand?: string
}

type FilterState = {
  vehicleType: VehicleType
  brandId: string // Angular stores an id array; we hold the selected one and send [id]
  modelId: string
  bodyTypeId: string
  sort: string
  minPrice: number | ''
  maxPrice: number | ''
  chauffeur: boolean
  chauffeurCars: '' | 'true' | 'false'
  specialNumberPlate: '' | 'true' | 'false'
  category: string
  topsearch: string
  /** Client-side + display — Angular `selectedLength` for yachts */
  yachtLength: string
  /** `datetime-local` value `YYYY-MM-DDTHH:mm` — API `YYYY-MM-DDTHH:MM:00` */
  startDate: string
  endDate: string
}

const DEFAULT_PRICE_CEIL = 16000

function normalizeBrandValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isYachtBody(b: RawBodyType) {
  return b.vehicle_type === 'Yachts' || b.type === 'Yachts'
}
/** Car list: exclude yacht rows; include untyped / Car (Angular filterBodyTypesByVehicleType). */
function isCarBody(b: RawBodyType) {
  if (b.vehicle_type === 'Yachts' || b.type === 'Yachts') return false
  return !b.vehicle_type || b.vehicle_type === 'Car' || b.type === 'Car'
}

/** Mirrors SearchComponent.formatDateTime — `YYYY-MM-DDTHH:MM:00`. */
function toApiDateTimeInput(value: string): string | null {
  if (!value?.trim()) return null
  if (value.length === 16) return `${value}:00`
  if (value.length >= 19) return value.slice(0, 19)
  return null
}

/** Backend applies min/max against the field named by `price_type` (Angular `updatePriceSettings`).
 *  Returns '' when no vehicle type is selected, matching Angular's price_type: '' default. */
function apiPriceTypeForVehicle(vehicleType: VehicleType): string {
  if (vehicleType === 'Yachts') return 'hourlyRate'
  if (vehicleType === 'Car') return 'dailyRate'
  return ''
}

function pickVehicleNumeric(source: RawVehicle, keys: string[]): number {
  const raw = source as Record<string, unknown>
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

/** Same basis as list cards / API `price_type` so filters match rendered prices. */
function vehicleComparablePriceAED(v: RawVehicle, vehicleType: VehicleType): number {
  const isYachtRow = v.vehicle_type === 'Yachts'
  const hourly = vehicleType === 'Yachts' || isYachtRow
  if (hourly) {
    return pickVehicleNumeric(v, ['hourlyRate', 'hourly_rate', 'sale_price'])
  }
  return pickVehicleNumeric(v, ['dailyRate', 'daily_rate', 'sale_price'])
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function buildSearchPayload(filters: FilterState, page: number, minPriceAED: number, maxPriceAED: number) {
  return {
    limit: PAGE_SIZE,
    page,
    availabilityStatus: 'available',
    vehicle_type: filters.vehicleType,
    car_type: [] as string[],
    bodyTypeId: filters.bodyTypeId ? [filters.bodyTypeId] : [],
    brandId: filters.brandId ? [filters.brandId] : [],
    modelId: filters.modelId ? [filters.modelId] : [],
    rental_type: null,
    minPrice: minPriceAED,
    maxPrice: maxPriceAED,
    price_type: apiPriceTypeForVehicle(filters.vehicleType),
    startDate: toApiDateTimeInput(filters.startDate),
    endDate: toApiDateTimeInput(filters.endDate),
    sort: filters.sort || null,
    // Angular sends boolean false by default (not ''), matching selectSpecialNumber(value === 'true') behaviour
    isvipNumberPlate: filters.specialNumberPlate === 'true',
    isChauffeured: filters.chauffeurCars === '' ? (filters.chauffeur ? true : null) : filters.chauffeurCars === 'true',
    locationIds: [] as string[],
    topsearch: filters.topsearch ? [filters.topsearch] : [],
    category: filters.category ? [filters.category] : []
  }
}

export function ProductSearchClient() {
  const { currency, convertToAED, convertFromAED } = useCurrencyService()
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const resultsTopRef = useRef<HTMLElement | null>(null)
  const isFirstPageRenderRef = useRef(true)

  // ── Seed filter state from URL query string — mirrors Angular's
  // ActivatedRoute.queryParams subscribe in ngOnInit. The Car Rental / Yacht
  // Rental / Chauffeur buttons on the home banner land here with `type` and
  // optionally `chauffeur=true`, so we must honor those on first render.
  const isLeaseToOwnPage = pathname === '/product/lease'
  // When `type` is absent (e.g. /product/search from "Our fleet"), default to cars so the Cars tab is selected and the API matches.
  const initialTypeParam = (searchParams.get('type') ?? 'car').toLowerCase()
  const initialType: VehicleType =
    initialTypeParam === 'car' ? 'Car' : initialTypeParam === 'yacht' || initialTypeParam === 'yachts' ? 'Yachts' : ''
  const initialVip = searchParams.get('vip') === 'true'
  const initialChauffeur = searchParams.get('chauffeur') === 'true'
  const initialChauffeurCars = searchParams.get('isChauffeured')
  const initialSpecialNumberPlate = searchParams.get('isvipNumberPlate') ?? (initialVip ? 'true' : '')
  const initialModelId = searchParams.get('modelId') ?? ''
  const initialCategory = searchParams.get('category') ?? ''
  const initialTopsearch = searchParams.get('topsearch') ?? (isLeaseToOwnPage ? 'leasing_cars' : '')
  const [pendingBrandUrlKey, setPendingBrandUrlKey] = useState(() => searchParams.get('brand') ?? '')
  const [pendingModelUrlKey, setPendingModelUrlKey] = useState(() => searchParams.get('model') ?? '')

  const [filters, setFilters] = useState<FilterState>({
    vehicleType: initialType,
    brandId: '',
    modelId: initialModelId,
    bodyTypeId: '',
    sort: '',
    minPrice: '',
    maxPrice: '',
    chauffeur: initialChauffeur,
    chauffeurCars: initialChauffeurCars === 'true' || initialChauffeurCars === 'false' ? initialChauffeurCars : '',
    specialNumberPlate: initialSpecialNumberPlate === 'true' || initialSpecialNumberPlate === 'false' ? initialSpecialNumberPlate : '',
    category: initialCategory,
    topsearch: initialTopsearch,
    yachtLength: '',
    startDate: '',
    endDate: ''
  })
  const [page, setPage] = useState(1)

  const [brands, setBrands] = useState<RawBrand[]>([])
  const [models, setModels] = useState<RawModel[]>([])
  const [bodyTypes, setBodyTypes] = useState<RawBodyType[]>([])

  const [vehicles, setVehicles] = useState<RawVehicle[]>([])
  const [totalVehicles, setTotalVehicles] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  /** Only used while the price popover is open (min/max + slider) */
  const [popoverEdit, setPopoverEdit] = useState<Partial<FilterState> | null>(null)
  const openDropdownRef = useRef<string | null>(null)
  const popoverEditRef = useRef<Partial<FilterState> | null>(null)
  openDropdownRef.current = openDropdown
  popoverEditRef.current = popoverEdit
  const didApplyBrandFromUrlRef = useRef(false)
  const didApplyModelFromUrlRef = useRef(false)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const debouncedMinPrice = useDebouncedValue(filters.minPrice, 450)
  const debouncedMaxPrice = useDebouncedValue(filters.maxPrice, 450)

  const nonPriceKey = useMemo(
    () =>
      JSON.stringify({
        vehicleType: filters.vehicleType,
        brandId: filters.brandId,
        modelId: filters.modelId,
        bodyTypeId: filters.bodyTypeId,
        sort: filters.sort,
        chauffeur: filters.chauffeur,
        chauffeurCars: filters.chauffeurCars,
        specialNumberPlate: filters.specialNumberPlate,
        category: filters.category,
        topsearch: filters.topsearch,
        yachtLength: filters.yachtLength,
        startDate: filters.startDate,
        endDate: filters.endDate
      }),
    [
      filters.vehicleType,
      filters.brandId,
      filters.modelId,
      filters.bodyTypeId,
      filters.sort,
      filters.chauffeur,
      filters.chauffeurCars,
      filters.specialNumberPlate,
      filters.category,
      filters.topsearch,
      filters.yachtLength,
      filters.startDate,
      filters.endDate
    ]
  )

  // ── Load dropdown option lists once. Matches Angular's
  // getCarTypes/getBrands/getAllBodyTypes calls in ngOnInit.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const safe = async <T,>(p: Promise<ApiResponse<T>>, fallback: T) => {
        try {
          const res = await p
          return res.code === 200 && res.result ? res.result : fallback
        } catch {
          return fallback
        }
      }
      const [br, md, bt] = await Promise.all([
        safe(getBrands({}), [] as RawBrand[]),
        safe(getAllModels({}), [] as RawModel[]),
        safe(getAllBodyTypes({}), [] as RawBodyType[])
      ])
      if (cancelled) return
      setBrands(Array.isArray(br) ? br : [])
      setModels((Array.isArray(md) ? md : []) as RawModel[])
      setBodyTypes((Array.isArray(bt) ? bt : []) as RawBodyType[])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (didApplyBrandFromUrlRef.current) return
    if (!pendingBrandUrlKey) {
      didApplyBrandFromUrlRef.current = true
      return
    }
    if (brands.length === 0) return

    const wanted = normalizeBrandValue(pendingBrandUrlKey)
    const match = brands.find((brand) => {
      const byUrlKey = normalizeBrandValue(String(brand.url_key ?? ''))
      const byName = normalizeBrandValue(String(brand.name ?? ''))
      return wanted === byUrlKey || wanted === byName
    })
    didApplyBrandFromUrlRef.current = true
    if (match?._id) {
      setFilters((prev) => (prev.brandId ? prev : { ...prev, brandId: match._id ?? '' }))
    }
    setPendingBrandUrlKey('')
  }, [brands, pendingBrandUrlKey])

  useEffect(() => {
    if (didApplyModelFromUrlRef.current) return
    if (!pendingModelUrlKey) {
      didApplyModelFromUrlRef.current = true
      return
    }
    if (models.length === 0) return

    const wanted = normalizeBrandValue(pendingModelUrlKey)
    const match = models.find((model) => {
      const byId = normalizeBrandValue(String(model._id ?? ''))
      const byName = normalizeBrandValue(String(model.name ?? ''))
      return wanted === byId || wanted === byName
    })

    didApplyModelFromUrlRef.current = true
    if (match?._id) {
      setFilters((prev) => (prev.modelId ? prev : { ...prev, modelId: String(match._id ?? '') }))
    }
    setPendingModelUrlKey('')
  }, [models, pendingModelUrlKey])

  // ── Fetch results whenever filters or page change. Matches Angular's
  // searchVehicles() in search.component.ts — same payload, same endpoint.
  const inFlightRef = useRef<AbortController | null>(null)
  const executeSearch = useCallback(
    async (priceMode: 'debounced' | 'live', pageOverride?: number) => {
      inFlightRef.current?.abort()
      const ac = new AbortController()
      inFlightRef.current = ac

      const snapshot = filtersRef.current
      const minPriceField = priceMode === 'live' ? snapshot.minPrice : debouncedMinPrice
      const maxPriceField = priceMode === 'live' ? snapshot.maxPrice : debouncedMaxPrice
      const searchFilters: FilterState = {
        ...snapshot,
        minPrice: minPriceField,
        maxPrice: maxPriceField
      }

      const pageToUse = pageOverride ?? page

      setLoading(true)
      setLoadFailed(false)
      const minPriceAED = searchFilters.minPrice === '' ? 0 : Math.round(convertToAED(Number(searchFilters.minPrice) || 0))
      const maxPriceAED = searchFilters.maxPrice === '' ? 0 : Math.round(convertToAED(Number(searchFilters.maxPrice) || 0))
      try {
        const res = (await getFilteredVehicles(
          buildSearchPayload(searchFilters, pageToUse, minPriceAED, maxPriceAED),
          getClientAuthToken(),
        )) as ApiResponse<
          RawVehicle[]
        > & {
          count?: number
        }
        if (ac.signal.aborted) return
        if (res.code === 200 && Array.isArray(res.result)) {
          setVehicles(res.result)
          setTotalVehicles(typeof res.count === 'number' ? res.count : res.result.length)
        } else {
          setVehicles([])
          setTotalVehicles(0)
        }
      } catch {
        if (ac.signal.aborted) return
        setVehicles([])
        setTotalVehicles(0)
        setLoadFailed(true)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    },
    [convertToAED, debouncedMinPrice, debouncedMaxPrice, nonPriceKey, page]
  )

  const runSearch = useCallback(() => executeSearch('debounced'), [executeSearch])

  useEffect(() => {
    void runSearch()
    return () => inFlightRef.current?.abort()
  }, [runSearch])

  const selectedBrand = brands.find((b) => b._id === filters.brandId) ?? null
  const selectedBrandUrlKey = normalizeBrandValue(selectedBrand?.url_key || selectedBrand?.name || '')
  const selectedModel = models.find((m) => m._id === filters.modelId) ?? null
  const selectedModelUrlKey = normalizeBrandValue(selectedModel?.name || '')

  // ── Sync the filter state back to the URL so deep-links like
  // /product/search?type=Car&brand=rolls-royce survive refreshes —
  // Angular does this via router.navigate([...], { queryParams }).
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.vehicleType) params.set('type', filters.vehicleType)
    if (filters.chauffeur) params.set('chauffeur', 'true')
    const effectiveBrandUrlKey = selectedBrandUrlKey || pendingBrandUrlKey
    if (effectiveBrandUrlKey) params.set('brand', effectiveBrandUrlKey)
    const effectiveModelUrlKey = selectedModelUrlKey || pendingModelUrlKey
    if (effectiveModelUrlKey) params.set('model', effectiveModelUrlKey)
    if (filters.brandId) params.set('brandId', filters.brandId)
    if (filters.modelId) params.set('modelId', filters.modelId)
    if (filters.bodyTypeId) params.set('bodyTypeId', filters.bodyTypeId)
    if (filters.chauffeurCars) params.set('isChauffeured', filters.chauffeurCars)
    if (filters.specialNumberPlate) params.set('isvipNumberPlate', filters.specialNumberPlate)
    if (filters.specialNumberPlate === 'true') params.set('vip', 'true')
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.category) params.set('category', filters.category)
    if (filters.topsearch) params.set('topsearch', filters.topsearch)
    if (page > 1) params.set('page', String(page))

    const query = params.toString()
    const next = query ? `/product/search?${query}` : '/product/search'
    router.replace(next, { scroll: false })
  }, [filters, page, pendingBrandUrlKey, pendingModelUrlKey, router, selectedBrandUrlKey, selectedModelUrlKey])

  // ── UX: when changing pagination, return viewport to results top.
  useEffect(() => {
    if (isFirstPageRenderRef.current) {
      isFirstPageRenderRef.current = false
      return
    }
    if (typeof window === 'undefined') return

    const anchorTop = resultsTopRef.current?.getBoundingClientRect().top ?? 0
    const absoluteTop = window.scrollY + anchorTop
    const targetTop = Math.max(0, absoluteTop - 110)
    window.scrollTo({ top: targetTop, behavior: 'smooth' })
  }, [page])

  // ── Close popovers; flush price draft from ref so mousedown-outside sees latest values
  const closeAnyPopover = useCallback(() => {
    const key = openDropdownRef.current
    const edit = popoverEditRef.current
    if (key === 'price' && edit) {
      setFilters((prev) => ({
        ...prev,
        minPrice: edit.minPrice === undefined ? prev.minPrice : edit.minPrice,
        maxPrice: edit.maxPrice === undefined ? prev.maxPrice : edit.maxPrice
      }))
      setPage(1)
    }
    setOpenDropdown(null)
    setPopoverEdit(null)
  }, [])

  const applyVehicleTypeTab = useCallback(
    (t: 'Car' | 'Yachts') => {
      closeAnyPopover()
      setFilters((prev) => ({
        ...prev,
        vehicleType: t,
        brandId: '',
        modelId: '',
        bodyTypeId: '',
        chauffeurCars: '',
        specialNumberPlate: '',
        yachtLength: ''
      }))
      setPage(1)
    },
    [closeAnyPopover]
  )

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

  const carBodyTypeOptions = useMemo(() => bodyTypes.filter((b) => isCarBody(b)), [bodyTypes])
  const yachtBodyTypeOptions = useMemo(() => bodyTypes.filter((b) => isYachtBody(b)), [bodyTypes])

  const yachtLengthOptions = useMemo(() => {
    const raw = vehicles.map((v) => String((v as { length?: string | number }).length ?? '').trim()).filter(Boolean)
    return Array.from(new Set(raw)).sort((a, b) => {
      const an = parseInt(a, 10)
      const bn = parseInt(b, 10)
      return Number.isNaN(an) || Number.isNaN(bn) ? a.localeCompare(b) : an - bn
    })
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    let list = vehicles
    if (filters.vehicleType === 'Yachts' && filters.yachtLength) {
      list = list.filter((v) => String((v as { length?: string }).length ?? '').trim() === filters.yachtLength)
    }

    const minAED = filters.minPrice === '' ? null : Math.round(convertToAED(Number(filters.minPrice) || 0))
    const maxAED = filters.maxPrice === '' ? null : Math.round(convertToAED(Number(filters.maxPrice) || 0))
    if (minAED === null && maxAED === null) {
      return list
    }
    const lo = minAED ?? 0
    const hi = maxAED ?? Number.POSITIVE_INFINITY
    return list.filter((v) => {
      const p = vehicleComparablePriceAED(v, filters.vehicleType)
      return p >= lo && p <= hi
    })
  }, [vehicles, filters.vehicleType, filters.yachtLength, filters.minPrice, filters.maxPrice, convertToAED])

  const carItems = useMemo<CarItem[]>(
    () => (filters.vehicleType === 'Car' || filters.vehicleType === '' ? filteredVehicles.map(toCarItem) : []),
    [filteredVehicles, filters.vehicleType]
  )
  const yachtItems = useMemo<YachtItem[]>(
    () => (filters.vehicleType === 'Yachts' ? filteredVehicles.map(toYachtItem) : []),
    [filteredVehicles, filters.vehicleType]
  )

  const totalPages = Math.max(1, Math.ceil(totalVehicles / PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  /** Hide pager on page 1 when the grid is short (e.g. client price trim); still show on page 2+ for server paging. */
  const showPagination = totalPages > 1 && (filteredVehicles.length === PAGE_SIZE || page > 1)
  const showingFrom = totalVehicles > 0 ? (activePage - 1) * PAGE_SIZE + 1 : 0
  const showingTo = totalVehicles > 0 ? Math.min((activePage - 1) * PAGE_SIZE + filteredVehicles.length, totalVehicles) : 0

  const toggleMobileFilter = () => {
    setMobileFilterOpen((open) => {
      if (open) closeAnyPopover()
      return !open
    })
  }

  const resetFilters = () => {
    closeAnyPopover()
    setFilters({
      vehicleType: 'Car',
      brandId: '',
      modelId: '',
      bodyTypeId: '',
      sort: '',
      minPrice: '',
      maxPrice: '',
      chauffeur: false,
      chauffeurCars: '',
      specialNumberPlate: '',
      category: '',
      topsearch: '',
      yachtLength: '',
      startDate: '',
      endDate: ''
    })
    setPage(1)
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1) // Angular resets to page 1 on any filter change.
  }

  /** Clear the active filter section (committed immediately; popover stays open). */
  const clearCurrentFilter = useCallback(() => {
    if (!openDropdown) return
    switch (openDropdown) {
      case 'brand':
        setFilters((prev) => ({ ...prev, brandId: '', modelId: '', bodyTypeId: '' }))
        break
      case 'model':
        setFilters((prev) => ({ ...prev, modelId: '', bodyTypeId: '' }))
        break
      case 'bodyType':
        setFilters((prev) => ({ ...prev, bodyTypeId: '' }))
        break
      case 'vipPlate':
        setFilters((prev) => ({ ...prev, specialNumberPlate: '' }))
        break
      case 'chauffeurCars':
        setFilters((prev) => ({ ...prev, chauffeurCars: '', chauffeur: false }))
        break
      case 'yachtBody':
        setFilters((prev) => ({ ...prev, bodyTypeId: '', yachtLength: '' }))
        break
      case 'yachtLength':
        setFilters((prev) => ({ ...prev, yachtLength: '' }))
        break
      case 'price':
        setFilters((prev) => ({ ...prev, minPrice: '', maxPrice: '' }))
        setPopoverEdit({ minPrice: '', maxPrice: '' })
        break
      default:
        break
    }
    setPage(1)
  }, [openDropdown])

  const selectedBrandName = brands.find((b) => b._id === filters.brandId)?.name ?? ''

  // Angular's filterBrandsByVehicleType: show only brands matching the selected vehicle type.
  const filteredBrandOptions = useMemo(
    () => (filters.vehicleType ? brands.filter((b) => b.type === filters.vehicleType) : brands),
    [brands, filters.vehicleType]
  )

  // Angular's updateFilteredModels: return empty list when no brand selected.
  const filteredModelOptions = useMemo(() => {
    if (!filters.brandId) return []
    return models.filter((model) => {
      const modelBrandId = String(model.brandId ?? model.brand_id ?? model.brand ?? '')
      return modelBrandId === filters.brandId
    })
  }, [filters.brandId, models])
  const selectedModelName = models.find((m) => m._id === filters.modelId)?.name ?? ''
  const bodyListForType = filters.vehicleType === 'Yachts' ? yachtBodyTypeOptions : carBodyTypeOptions
  const selectedBodyTypeName = bodyListForType.find((b) => b._id === filters.bodyTypeId)?.name ?? ''
  const selectedSortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Default'

  const priceSliderCeil = useMemo(() => {
    const fallbackAed = filters.vehicleType === 'Yachts' ? 6000 : 20000
    let peak = convertFromAED(fallbackAed)
    for (const v of vehicles) {
      peak = Math.max(peak, vehicleComparablePriceAED(v, filters.vehicleType))
    }
    return Math.max(500, Math.ceil(peak / 100) * 100)
  }, [vehicles, filters.vehicleType, convertFromAED])

  const pricePresets = useMemo(() => {
    const isYacht = filters.vehicleType === 'Yachts'
    const aedRanges = isYacht
      ? [
          [0, 500],
          [500, 1500],
          [1500, 4000],
          [4000, 8000]
        ]
      : [
          [0, 1500],
          [1500, 3000],
          [3000, 6000],
          [6000, 12000],
          [12000, 25000]
        ]
    return aedRanges.map(([lo, hi]) => [Math.round(convertFromAED(lo)), Math.round(convertFromAED(hi))] as [number, number])
  }, [filters.vehicleType, convertFromAED])

  const priceDraft =
    openDropdown === 'price' && popoverEdit
      ? {
          min: popoverEdit.minPrice === undefined ? filters.minPrice : popoverEdit.minPrice,
          max: popoverEdit.maxPrice === undefined ? filters.maxPrice : popoverEdit.maxPrice
        }
      : { min: filters.minPrice, max: filters.maxPrice }

  const priceSummaryLabel = useMemo((): ReactNode => {
    if (filters.minPrice === '' && filters.maxPrice === '') return 'Any price'
    const lo = filters.minPrice === '' ? null : Number(filters.minPrice)
    const hi = filters.maxPrice === '' ? null : Number(filters.maxPrice)
    if (lo != null && hi != null) {
      return (
        <>
          <FormattedPrice amount={lo} currencyCode={currency} /> – <FormattedPrice amount={hi} currencyCode={currency} />
        </>
      )
    }
    if (lo != null) {
      return (
        <>
          <FormattedPrice amount={lo} currencyCode={currency} />+
        </>
      )
    }
    if (hi != null) {
      return (
        <>
          Up to <FormattedPrice amount={hi} currencyCode={currency} />
        </>
      )
    }
    return 'Any price'
  }, [filters.minPrice, filters.maxPrice, currency])

  return (
    <>
      <section className={styles.searchContainer}>
        <h1 className={styles.pageTitle} data-aos="fade-up">
          {FLEET_PAGE_H1}
        </h1>
        <div className={styles.row}>
          {/* ──────────── Filter sidebar ──────────── */}
          <aside data-aos="fade-up" className={styles.filterSection}>
            <div
              className={`${styles.filterContainer} ${mobileFilterOpen ? styles.filterContainerOpen : ''}`.trim()}
            >
              <div
                className={styles.filterTopBar}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 991px)').matches) {
                    toggleMobileFilter()
                  }
                }}
              >
                <div className={styles.filterHeaderLeft}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toAssetUrl('images/icons/filter.svg')} alt='' className={styles.filterIcon} />
                  <span className={styles.filterTitle}>Filter</span>
                </div>
                <div className={styles.filterHeaderRight}>
                  <button
                    type='button'
                    className={styles.filterToggleBtn}
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
              <div
                className={`${styles.filterCollapsible} ${mobileFilterOpen ? styles.filterCollapsibleOpen : ''}`.trim()}
              >
              <div className={styles.vehicleTypeTabs} role='tablist' aria-label='Browse by vehicle type'>
                <button
                  type='button'
                  role='tab'
                  aria-selected={filters.vehicleType === 'Car'}
                  className={styles.vehicleTypeTab}
                  data-active={filters.vehicleType === 'Car'}
                  onClick={() => applyVehicleTypeTab('Car')}
                >
                  Cars
                </button>
                <button
                  type='button'
                  role='tab'
                  aria-selected={filters.vehicleType === 'Yachts'}
                  className={styles.vehicleTypeTab}
                  data-active={filters.vehicleType === 'Yachts'}
                  onClick={() => applyVehicleTypeTab('Yachts')}
                >
                  Yachts
                </button>
              </div>
              <div className={styles.filterToolbar}>
                <div className={styles.filterPillsRow}>
                  {/* Brand — horizontal pill + popover (reference) */}
                  {filters.vehicleType === 'Car' && (
                    <div className={styles.filterField} data-dropdown='brand'>
                      <div
                        className={styles.pillTrigger}
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
                        <span className={styles.pillLabel}>Car Brand</span>
                        <span className={styles.pillValue} data-muted={!filters.brandId}>
                          {selectedBrandName || 'Any brand'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={styles.downArrow}
                          data-rotated={openDropdown === 'brand'}
                        />
                      </div>
                      {openDropdown === 'brand' && (
                        <div className={styles.filterPopover}>
                          <p className={styles.popoverKicker}>Car brand</p>
                          <ul className={styles.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={styles.popoverRow}
                              data-active={!filters.brandId}
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, brandId: '', modelId: '', bodyTypeId: '' }))
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={styles.popoverRowLabel}>Any brand</span>
                              <span className={styles.radioMark} data-on={!filters.brandId ? 'true' : undefined} aria-hidden />
                            </li>
                            {filteredBrandOptions.map((b) => (
                              <li
                                key={b._id}
                                role='button'
                                tabIndex={0}
                                className={styles.popoverRow}
                                data-active={filters.brandId === b._id}
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    brandId: b._id ?? '',
                                    modelId: '',
                                    bodyTypeId: ''
                                  }))
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={styles.popoverRowLabel}>{b.name}</span>
                                <span className={styles.radioMark} data-on={filters.brandId === b._id ? 'true' : undefined} aria-hidden />
                              </li>
                            ))}
                          </ul>
                          <div className={styles.popoverFooter}>
                            <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Car model — disabled until brand selected */}
                  {filters.vehicleType === 'Car' && (
                    <div className={styles.filterField} data-dropdown='model' data-disabled={!filters.brandId}>
                      <div
                        className={styles.pillTrigger}
                        data-open={openDropdown === 'model'}
                        role='button'
                        tabIndex={filters.brandId ? 0 : -1}
                        aria-disabled={!filters.brandId}
                        onClick={() => {
                          if (!filters.brandId) return
                          if (openDropdown === 'model') {
                            closeAnyPopover()
                            return
                          }
                          setOpenDropdown('model')
                        }}
                      >
                        <span className={styles.pillLabel}>Car Model</span>
                        <span className={styles.pillValue} data-muted={!filters.brandId || !filters.modelId}>
                          {!filters.brandId ? 'Any model' : selectedModelName || 'Any model'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={styles.downArrow}
                          data-rotated={openDropdown === 'model'}
                        />
                      </div>
                      {openDropdown === 'model' && filters.brandId && (
                        <div className={styles.filterPopover}>
                          <p className={styles.popoverKicker}>Car model</p>
                          <ul className={styles.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={styles.popoverRow}
                              data-active={!filters.modelId}
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, modelId: '', bodyTypeId: '' }))
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={styles.popoverRowLabel}>Any model</span>
                              <span className={styles.radioMark} data-on={!filters.modelId ? 'true' : undefined} aria-hidden />
                            </li>
                            {filteredModelOptions.map((model) => (
                              <li
                                key={model._id}
                                role='button'
                                tabIndex={0}
                                className={styles.popoverRow}
                                data-active={filters.modelId === model._id}
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    modelId: model._id ?? '',
                                    bodyTypeId: ''
                                  }))
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={styles.popoverRowLabel}>{model.name}</span>
                                <span
                                  className={styles.radioMark}
                                  data-on={filters.modelId === model._id ? 'true' : undefined}
                                  aria-hidden
                                />
                              </li>
                            ))}
                          </ul>
                          <div className={styles.popoverFooter}>
                            <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body type */}
                  {filters.vehicleType === 'Car' && (
                    <div className={styles.filterField} data-dropdown='bodyType'>
                      <div
                        className={styles.pillTrigger}
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
                        <span className={styles.pillLabel}>Body Type</span>
                        <span className={styles.pillValue} data-muted={!filters.bodyTypeId}>
                          {selectedBodyTypeName || 'Any type'}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={styles.downArrow}
                          data-rotated={openDropdown === 'bodyType'}
                        />
                      </div>
                      {openDropdown === 'bodyType' && (
                        <div className={styles.filterPopover}>
                          <p className={styles.popoverKicker}>Body type</p>
                          <ul className={styles.popoverList}>
                            <li
                              role='button'
                              tabIndex={0}
                              className={styles.popoverRow}
                              data-active={!filters.bodyTypeId}
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, bodyTypeId: '' }))
                                setPage(1)
                                closeAnyPopover()
                              }}
                            >
                              <span className={styles.popoverRowLabel}>Any type</span>
                              <span className={styles.radioMark} data-on={!filters.bodyTypeId ? 'true' : undefined} aria-hidden />
                            </li>
                            {carBodyTypeOptions.map((b) => (
                              <li
                                key={b._id}
                                role='button'
                                tabIndex={0}
                                className={styles.popoverRow}
                                data-active={filters.bodyTypeId === b._id}
                                onClick={() => {
                                  setFilters((prev) => ({ ...prev, bodyTypeId: b._id ?? '' }))
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={styles.popoverRowLabel}>{b.name}</span>
                                <span
                                  className={styles.radioMark}
                                  data-on={filters.bodyTypeId === b._id ? 'true' : undefined}
                                  aria-hidden
                                />
                              </li>
                            ))}
                          </ul>
                          <div className={styles.popoverFooter}>
                            <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special plate + chauffeur — pills + popovers */}
                  {filters.vehicleType === 'Car' && (
                    <>
                      <div className={styles.filterField} data-dropdown='vipPlate'>
                        <div
                          className={styles.pillTrigger}
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
                          <span className={styles.pillLabel}>Special Plate</span>
                          <span className={styles.pillValue} data-muted={!filters.specialNumberPlate}>
                            {filters.specialNumberPlate === 'true' ? 'Yes' : filters.specialNumberPlate === 'false' ? 'No' : 'Any plate'}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/down-arrow.svg')}
                            alt=''
                            className={styles.downArrow}
                            data-rotated={openDropdown === 'vipPlate'}
                          />
                        </div>
                        {openDropdown === 'vipPlate' && (
                          <div className={styles.filterPopover}>
                            <p className={styles.popoverKicker}>Special plate</p>
                            <ul className={styles.popoverList}>
                              {[
                                { value: '', label: 'Any plate' },
                                { value: 'true', label: 'Yes' },
                                { value: 'false', label: 'No' }
                              ].map((opt) => (
                                <li
                                  key={opt.value || 'any'}
                                  role='button'
                                  tabIndex={0}
                                  className={styles.popoverRow}
                                  data-active={filters.specialNumberPlate === opt.value}
                                  onClick={() => {
                                    setFilters((prev) => ({
                                      ...prev,
                                      specialNumberPlate: opt.value as FilterState['specialNumberPlate']
                                    }))
                                    setPage(1)
                                    closeAnyPopover()
                                  }}
                                >
                                  <span className={styles.popoverRowLabel}>{opt.label}</span>
                                  <span
                                    className={styles.radioMark}
                                    data-on={filters.specialNumberPlate === opt.value ? 'true' : undefined}
                                    aria-hidden
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className={styles.popoverFooter}>
                              <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.filterField} data-dropdown='chauffeurCars'>
                        <div
                          className={styles.pillTrigger}
                          data-open={openDropdown === 'chauffeurCars'}
                          role='button'
                          tabIndex={0}
                          onClick={() => {
                            if (openDropdown === 'chauffeurCars') {
                              closeAnyPopover()
                              return
                            }
                            setOpenDropdown('chauffeurCars')
                          }}
                        >
                          <span className={styles.pillLabel}>Chauffeur</span>
                          <span className={styles.pillValue} data-muted={!filters.chauffeurCars}>
                            {filters.chauffeurCars === 'true' ? 'Yes' : filters.chauffeurCars === 'false' ? 'No' : 'Any'}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/down-arrow.svg')}
                            alt=''
                            className={styles.downArrow}
                            data-rotated={openDropdown === 'chauffeurCars'}
                          />
                        </div>
                        {openDropdown === 'chauffeurCars' && (
                          <div className={styles.filterPopover}>
                            <p className={styles.popoverKicker}>Chauffeur</p>
                            <ul className={styles.popoverList}>
                              {[
                                { value: '', label: 'Any' },
                                { value: 'true', label: 'Yes' },
                                { value: 'false', label: 'No' }
                              ].map((opt) => (
                                <li
                                  key={opt.value || 'any'}
                                  role='button'
                                  tabIndex={0}
                                  className={styles.popoverRow}
                                  data-active={filters.chauffeurCars === opt.value}
                                  onClick={() => {
                                    setFilters((prev) => ({
                                      ...prev,
                                      chauffeurCars: opt.value as FilterState['chauffeurCars'],
                                      chauffeur: opt.value === 'true'
                                    }))
                                    setPage(1)
                                    closeAnyPopover()
                                  }}
                                >
                                  <span className={styles.popoverRowLabel}>{opt.label}</span>
                                  <span
                                    className={styles.radioMark}
                                    data-on={filters.chauffeurCars === opt.value ? 'true' : undefined}
                                    aria-hidden
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className={styles.popoverFooter}>
                              <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Price / rate — MIN–MAX + slider (reference) */}
                  {filters.vehicleType && (
                    <div className={styles.filterField} data-dropdown='price'>
                      <div
                        className={styles.pillTrigger}
                        data-open={openDropdown === 'price'}
                        role='button'
                        tabIndex={0}
                        onClick={() => {
                          if (openDropdown === 'price') {
                            closeAnyPopover()
                            return
                          }
                          setPopoverEdit({ minPrice: filters.minPrice, maxPrice: filters.maxPrice })
                          setOpenDropdown('price')
                        }}
                      >
                        <span className={styles.pillLabel}>{filters.vehicleType === 'Yachts' ? 'Hourly rate' : 'Daily rate'}</span>
                        <span className={styles.pillValue} data-muted={filters.minPrice === '' && filters.maxPrice === ''}>
                          {priceSummaryLabel}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl('images/icons/down-arrow.svg')}
                          alt=''
                          className={styles.downArrow}
                          data-rotated={openDropdown === 'price'}
                        />
                      </div>
                      {openDropdown === 'price' &&
                        (() => {
                          const ceil = priceSliderCeil
                          const rawLo = priceDraft.min === '' ? 0 : Number(priceDraft.min) || 0
                          const rawHi = priceDraft.max === '' ? ceil : Number(priceDraft.max) || ceil
                          const sliderLo = Math.max(0, Math.min(rawLo, rawHi, ceil))
                          const sliderHi = Math.max(0, Math.min(Math.max(rawLo, rawHi), ceil))
                          return (
                            <div className={styles.filterPopoverWide}>
                              <p className={styles.popoverKicker}>{filters.vehicleType === 'Yachts' ? 'Hourly rate' : 'Daily rate'}</p>
                              <div className={styles.pricePopoverInputs}>
                                <div className={styles.pricePopoverField}>
                                  <span className={styles.pricePopoverFieldLabel}>Min</span>
                                  <div className={styles.pricePopoverInputWrap}>
                                    <input
                                      type='number'
                                      inputMode='decimal'
                                      className={styles.pricePopoverInput}
                                      min={0}
                                      placeholder='0'
                                      value={priceDraft.min === '' ? '' : String(priceDraft.min)}
                                      onChange={(e) => {
                                        const t = e.target.value
                                        setPopoverEdit((prev) => ({
                                          ...(prev ?? {}),
                                          minPrice: t === '' ? '' : Math.max(0, Math.round(Number(t) || 0))
                                        }))
                                      }}
                                    />
                                    <span className={styles.pricePopoverSuffix}>
                                      <CurrencySymbol code={currency} />
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.pricePopoverField}>
                                  <span className={styles.pricePopoverFieldLabel}>Max</span>
                                  <div className={styles.pricePopoverInputWrap}>
                                    <input
                                      type='number'
                                      inputMode='decimal'
                                      className={styles.pricePopoverInput}
                                      min={0}
                                      placeholder={String(ceil)}
                                      value={priceDraft.max === '' ? '' : String(priceDraft.max)}
                                      onChange={(e) => {
                                        const t = e.target.value
                                        setPopoverEdit((prev) => ({
                                          ...(prev ?? {}),
                                          maxPrice: t === '' ? '' : Math.max(0, Math.round(Number(t) || 0))
                                        }))
                                      }}
                                    />
                                    <span className={styles.pricePopoverSuffix}>
                                      <CurrencySymbol code={currency} />
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={styles.pricePresetRow}>
                                {pricePresets.map(([a, b]) => (
                                  <button
                                    key={`${a}-${b}`}
                                    type='button'
                                    className={styles.pricePresetChip}
                                    onClick={() =>
                                      setPopoverEdit((prev) => ({
                                        ...(prev ?? {}),
                                        minPrice: a,
                                        maxPrice: b
                                      }))
                                    }
                                  >
                                    <FormattedPrice amount={a} currencyCode={currency} /> –{' '}
                                    <FormattedPrice amount={b} currencyCode={currency} />
                                  </button>
                                ))}
                              </div>
                              <PriceDualRangeSlider
                                ceil={ceil}
                                step={ceil > 5000 ? 100 : 50}
                                lo={sliderLo}
                                hi={sliderHi}
                                onValuesChange={(nextLo, nextHi) => {
                                  setPopoverEdit((prev) => ({
                                    ...(prev ?? {}),
                                    minPrice: nextLo === 0 ? '' : Math.round(nextLo),
                                    maxPrice: nextHi >= ceil ? '' : Math.round(nextHi)
                                  }))
                                }}
                              />
                              <div className={styles.priceSliderRow}>
                                <span className={styles.priceSliderLabel}>
                                  <FormattedPrice amount={sliderLo} currencyCode={currency} />
                                </span>
                                <span className={styles.priceSliderLabel}>
                                  <FormattedPrice amount={sliderHi} currencyCode={currency} />
                                </span>
                              </div>
                              <div className={styles.popoverFooter}>
                                <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                                  Clear
                                </button>
                              </div>
                            </div>
                          )
                        })()}
                    </div>
                  )}

                  {/* Yachts — body + length (same pill / popover pattern) */}
                  {filters.vehicleType === 'Yachts' && (
                    <>
                      <div className={styles.filterField} data-dropdown='yachtBody'>
                        <div
                          className={styles.pillTrigger}
                          data-open={openDropdown === 'yachtBody'}
                          role='button'
                          tabIndex={0}
                          onClick={() => {
                            if (openDropdown === 'yachtBody') {
                              closeAnyPopover()
                              return
                            }
                            setOpenDropdown('yachtBody')
                          }}
                        >
                          <span className={styles.pillLabel}>Yacht body</span>
                          <span className={styles.pillValue} data-muted={!filters.bodyTypeId}>
                            {selectedBodyTypeName || 'Any type'}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/down-arrow.svg')}
                            alt=''
                            className={styles.downArrow}
                            data-rotated={openDropdown === 'yachtBody'}
                          />
                        </div>
                        {openDropdown === 'yachtBody' && (
                          <div className={styles.filterPopover}>
                            <p className={styles.popoverKicker}>Yacht body type</p>
                            <ul className={styles.popoverList}>
                              {yachtBodyTypeOptions.length === 0 ? (
                                <li className={styles.popoverRowMuted}>No body types</li>
                              ) : (
                                <>
                                  <li
                                    role='button'
                                    tabIndex={0}
                                    className={styles.popoverRow}
                                    data-active={!filters.bodyTypeId}
                                    onClick={() => {
                                      setFilters((prev) => ({ ...prev, bodyTypeId: '', yachtLength: '' }))
                                      setPage(1)
                                      closeAnyPopover()
                                    }}
                                  >
                                    <span className={styles.popoverRowLabel}>Any type</span>
                                    <span className={styles.radioMark} data-on={!filters.bodyTypeId ? 'true' : undefined} aria-hidden />
                                  </li>
                                  {yachtBodyTypeOptions.map((b) => (
                                    <li
                                      key={b._id}
                                      role='button'
                                      tabIndex={0}
                                      className={styles.popoverRow}
                                      data-active={filters.bodyTypeId === b._id}
                                      onClick={() => {
                                        setFilters((prev) => ({
                                          ...prev,
                                          bodyTypeId: b._id ?? '',
                                          yachtLength: ''
                                        }))
                                        setPage(1)
                                        closeAnyPopover()
                                      }}
                                    >
                                      <span className={styles.popoverRowLabel}>{b.name}</span>
                                      <span
                                        className={styles.radioMark}
                                        data-on={filters.bodyTypeId === b._id ? 'true' : undefined}
                                        aria-hidden
                                      />
                                    </li>
                                  ))}
                                </>
                              )}
                            </ul>
                            <div className={styles.popoverFooter}>
                              <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.filterField} data-dropdown='yachtLength'>
                        <div
                          className={styles.pillTrigger}
                          data-open={openDropdown === 'yachtLength'}
                          role='button'
                          tabIndex={0}
                          onClick={() => {
                            if (openDropdown === 'yachtLength') {
                              closeAnyPopover()
                              return
                            }
                            setOpenDropdown('yachtLength')
                          }}
                        >
                          <span className={styles.pillLabel}>Length</span>
                          <span className={styles.pillValue} data-muted={!filters.yachtLength}>
                            {filters.yachtLength || 'Any length'}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl('images/icons/down-arrow.svg')}
                            alt=''
                            className={styles.downArrow}
                            data-rotated={openDropdown === 'yachtLength'}
                          />
                        </div>
                        {openDropdown === 'yachtLength' && (
                          <div className={styles.filterPopover}>
                            <p className={styles.popoverKicker}>Length</p>
                            <ul className={styles.popoverList}>
                              <li
                                role='button'
                                tabIndex={0}
                                className={styles.popoverRow}
                                data-active={!filters.yachtLength}
                                onClick={() => {
                                  setFilters((prev) => ({ ...prev, yachtLength: '' }))
                                  setPage(1)
                                  closeAnyPopover()
                                }}
                              >
                                <span className={styles.popoverRowLabel}>Any length</span>
                                <span className={styles.radioMark} data-on={!filters.yachtLength ? 'true' : undefined} aria-hidden />
                              </li>
                              {yachtLengthOptions.length === 0 ? (
                                <li className={styles.popoverRowMuted}>No lengths in current results</li>
                              ) : (
                                yachtLengthOptions.map((len) => (
                                  <li
                                    key={len}
                                    role='button'
                                    tabIndex={0}
                                    className={styles.popoverRow}
                                    data-active={filters.yachtLength === len}
                                    onClick={() => {
                                      setFilters((prev) => ({ ...prev, yachtLength: len }))
                                      setPage(1)
                                      closeAnyPopover()
                                    }}
                                  >
                                    <span className={styles.popoverRowLabel}>{len}</span>
                                    <span
                                      className={styles.radioMark}
                                      data-on={filters.yachtLength === len ? 'true' : undefined}
                                      aria-hidden
                                    />
                                  </li>
                                ))
                              )}
                            </ul>
                            <div className={styles.popoverFooter}>
                              <button type='button' className={styles.popoverClear} onClick={clearCurrentFilter}>
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className={`${styles.filterField} ${styles.dateRangeField}`} data-dropdown='dateRange'>
                    <SearchDateRangePicker
                      startValue={filters.startDate}
                      endValue={filters.endDate}
                      isOpen={openDropdown === 'dateRange'}
                      onRequestOpen={() => {
                        setPopoverEdit(null)
                        setOpenDropdown('dateRange')
                      }}
                      onRequestClose={() => setOpenDropdown(null)}
                      onApply={(start, end) => {
                        setFilters((prev) => ({ ...prev, startDate: start, endDate: end }))
                        setPage(1)
                      }}
                      onClear={() => {
                        setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }))
                        setPage(1)
                      }}
                    />
                  </div>

                  <button
                    type='button'
                    className={`${styles.filterSearchBtn} black-button size16 redhat-semibold text-capitalize`}
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

          {/* ──────────── Results ──────────── */}
          <section data-aos="fade-up" data-aos-delay="100" className={styles.resultsSection} ref={resultsTopRef}>
            <header className={styles.resultsHeader}>
              {/* "Showing X to Y of Z vehicles" — mirrors Angular's
                 `(currentPage - 1) * itemsPerPage + 1` … `Math.min(...)` label
                 rendered as a .size14.redhat-bold h3. */}
              {loading ? null : filteredVehicles.length > 0 ? (
                <h3 className={styles.resultsCount}>
                  <span>Showing</span> {showingFrom} <span>to</span> {showingTo} <span>of</span> {totalVehicles} <span>Vehicles</span>
                </h3>
              ) : (
                <h3 className={styles.resultsCountEmpty}>Arriving Soon</h3>
              )}

              <div className={styles.resultsHeaderRight}>
                {/* Sort dropdown — mirrors Angular's `.sort.cdrop` inline row
                    (search.component.html L825-L849): a single clickable text
                    node ("Sort by" placeholder or the selected label) plus a
                    rotating arrow, with an absolutely-positioned menu that
                    opens below. No outer <label> — the placeholder IS the
                    label until the user picks an option. A trailing "Reset"
                    row is appended so the menu doubles as Angular's
                    `resetFilter()` affordance. */}
                {!loading && filteredVehicles.length > 0 && (
                  <div className={styles.sortWrap} data-dropdown='sort'>
                    <div
                      className={styles.sortToggle}
                      role='button'
                      tabIndex={0}
                      onClick={() => {
                        setPopoverEdit(null)
                        setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setPopoverEdit(null)
                          setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
                        }
                      }}
                    >
                      <span>{filters.sort ? selectedSortLabel : 'Sort by'}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toAssetUrl('images/icons/down-arrow.svg')}
                        alt='Expand'
                        className={styles.sortArrow}
                        data-rotated={openDropdown === 'sort'}
                      />
                    </div>
                    {openDropdown === 'sort' && (
                      <ul className={styles.sortMenu}>
                        {SORT_OPTIONS.filter((o) => o.value).map((o) => (
                          <li
                            key={o.value}
                            className={styles.sortItem}
                            data-active={filters.sort === o.value}
                            onClick={() => {
                              updateFilter('sort', o.value)
                              setOpenDropdown(null)
                            }}
                          >
                            {o.label}
                          </li>
                        ))}
                        <li
                          className={styles.sortItem}
                          onClick={() => {
                            updateFilter('sort', '')
                            setOpenDropdown(null)
                          }}
                        >
                          Reset
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </header>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner} />
                <div>Loading {filters.vehicleType === 'Yachts' ? 'yachts' : 'cars'}…</div>
              </div>
            ) : filteredVehicles.length === 0 ? null : (
              <div className={styles.productsWrap}>
                <div className={styles.resultsGrid}>
                  {filters.vehicleType === 'Car' || filters.vehicleType === ''
                    ? carItems.map((car) => (
                        <div key={car.id || car.url_key} className={styles.resultsCell}>
                          <CarCard car={car} variant='list' />
                        </div>
                      ))
                    : yachtItems.map((yacht) => (
                        <div key={yacht.id || yacht.url_key} className={styles.resultsCell}>
                          <YachtCard yacht={yacht} />
                        </div>
                      ))}
                </div>

                {/* Pagination — ported from search.component.html L1061-L1087.
                    Prev/Next are circle buttons with lucide arrow icons; page
                    numbers are plain buttons. getPages() in Angular returns a
                    windowed list; we reproduce with the same reduce below. */}
                {showPagination && <ResultsPagination totalPages={totalPages} activePage={activePage} onPageChange={setPage} />}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  )
}
