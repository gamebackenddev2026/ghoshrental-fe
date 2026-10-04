'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CarCard, CarTypes } from '@/components/home/HomeSections'
import type { CarType } from '@/components/home/mockData'
import { selectListPageBanner, toCarItem, toCarType } from '@/lib/api/adapters'
import { getAllBanner, getCarTypeByURL, getCarTypes, getFilteredVehicles } from '@/lib/api/home'
import type { ApiResponse } from '@/lib/api/client'
import type { RawCarType, RawMedia, RawVehicle, RawBanner } from '@/lib/api/types'
import { resolveBannerMediaUrl } from '@/lib/mediaUrl'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { IMAGE_SIZES } from '@/lib/imageOptimization'
import { useCurrencyService } from '@/lib/currency-service'
import styles from './productListClient.module.css'

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

const PAGE_LIMIT = 8

type ProductListClientProps = {
  urlKey: string
}

function toCarTypeRow(raw: unknown): RawCarType[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as RawCarType[]
  if (typeof raw === 'object') return [raw as RawCarType]
  return []
}

export function ProductListClient({ urlKey }: ProductListClientProps) {
  const { convertPricesInText } = useCurrencyService()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSort = searchParams.get('sort') ?? ''
  const initialPage = Math.max(1, Number(searchParams.get('page') || '1'))

  const [sort, setSort] = useState(initialSort)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [carTypeName, setCarTypeName] = useState('')
  const [carTypes, setCarTypes] = useState<CarType[]>([])
  const [cars, setCars] = useState<RawVehicle[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listBanner, setListBanner] = useState<RawBanner | null>(null)
  const lastLoadedBannerKeyRef = useRef<string | null>(null)
  const [mediaSettled, setMediaSettled] = useState(true)
  const mediaDoneRef = useRef(0)
  const mediaExpectedRef = useRef(0)
  const sortRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && !sortRef.current?.contains(target)) setIsSortOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (sort) params.set('sort', sort)
    if (currentPage > 1) params.set('page', String(currentPage))
    const query = params.toString()
    router.replace(query ? `/product/list/${encodeURIComponent(urlKey)}?${query}` : `/product/list/${encodeURIComponent(urlKey)}`, {
      scroll: false
    })
  }, [currentPage, router, sort, urlKey])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [carTypeRes, carTypeListRes] = await Promise.all([getCarTypeByURL({ url_key: urlKey }), getCarTypes({})])

        const selectedRows = carTypeRes.code === 200 ? toCarTypeRow(carTypeRes.result) : []
        const selected = selectedRows[0]
        const selectedId = selected?._id ?? ''
        const selectedName = selected?.name ?? ''
        const selectedType = selected ? toCarType(selected) : null

        const listRows = carTypeListRes.code === 200 && Array.isArray(carTypeListRes.result) ? (carTypeListRes.result as RawCarType[]) : []
        const listMapped = listRows.map((item) => toCarType(item)).filter((item): item is CarType => Boolean(item))

        const payload = {
          limit: PAGE_LIMIT,
          page: currentPage,
          availabilityStatus: 'available',
          vehicle_type: 'Car',
          car_type: selectedId ? [selectedId] : [],
          sort
        }
        const vehiclesRes = (await getFilteredVehicles(payload)) as ApiResponse<RawVehicle[]> & {
          count?: number
        }

        if (cancelled) return

        setCarTypeName(selectedName)
        setCarTypes(listMapped)
        if (vehiclesRes.code === 200 && Array.isArray(vehiclesRes.result)) {
          setCars(vehiclesRes.result)
          setTotalItems(typeof vehiclesRes.count === 'number' ? vehiclesRes.count : vehiclesRes.result.length)
        } else {
          setCars([])
          setTotalItems(0)
        }

        if (selectedType && !listMapped.some((item) => item.url_key === selectedType.url_key)) {
          setCarTypes((prev) => [selectedType, ...prev])
        }

        if (lastLoadedBannerKeyRef.current !== urlKey) {
          if (!cancelled) setListBanner(null)
          try {
            const bRes = await getAllBanner({})
            if (cancelled) return
            if (bRes.code === 200) {
              setListBanner(selectListPageBanner(bRes.result, selectedName, urlKey))
            } else {
              setListBanner(null)
            }
            lastLoadedBannerKeyRef.current = urlKey
          } catch {
            if (!cancelled) {
              setListBanner(null)
              lastLoadedBannerKeyRef.current = urlKey
            }
          }
        }
      } catch {
        if (cancelled) return
        setCars([])
        setTotalItems(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [currentPage, sort, urlKey])

  /* eslint-disable react-hooks/set-state-in-effect -- gate skeleton overlay from fetch + image load lifecycle */
  useEffect(() => {
    if (loading) {
      setMediaSettled(false)
      return
    }
    if (cars.length === 0) {
      setMediaSettled(true)
      mediaDoneRef.current = 0
      mediaExpectedRef.current = 0
      return
    }
    setMediaSettled(false)
    mediaDoneRef.current = 0
    mediaExpectedRef.current = cars.length
    const tid = window.setTimeout(() => setMediaSettled(true), 12_000)
    return () => window.clearTimeout(tid)
  }, [loading, cars.length, urlKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onVehicleImageDone = useCallback(() => {
    mediaDoneRef.current += 1
    if (mediaDoneRef.current >= mediaExpectedRef.current && mediaExpectedRef.current > 0) {
      setMediaSettled(true)
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT))
  const activePage = Math.min(currentPage, totalPages)
  const carItems = useMemo(() => cars.map((item) => toCarItem(item)), [cars])

  const listBannerImage = useMemo((): RawMedia | null => {
    if (!listBanner) return null
    const m = listBanner.media_data?.[0] ?? (listBanner.image && typeof listBanner.image === 'object' && !Array.isArray(listBanner.image) ? listBanner.image : null)
    if (!m || typeof m !== 'object') return null
    if (String(m.file_type ?? '').toLowerCase() === 'video') return null
    return resolveBannerMediaUrl(m) ? m : null
  }, [listBanner])

  const listBannerImageUrl = useMemo(
    () => (listBannerImage ? resolveBannerMediaUrl(listBannerImage) : ''),
    [listBannerImage]
  )

  const shortDesc = useMemo(
    () => convertPricesInText(typeof listBanner?.short_desc === 'string' ? listBanner.short_desc : ''),
    [convertPricesInText, listBanner]
  )
  const longDesc = useMemo(
    () => convertPricesInText(typeof listBanner?.description === 'string' ? listBanner.description : ''),
    [convertPricesInText, listBanner]
  )

  const showHero = Boolean(listBanner && listBannerImageUrl)
  const collectionTitle = carTypeName ? `Explore Our ${carTypeName} Car Collection` : 'Explore Our Luxury Car Collection'
  const useBelowHeroSpacing = loading || showHero

  return (
    <>
      {loading ? (
        <section className={styles.listHeroSection} aria-label='Loading collection' aria-busy='true'>
          <div className={styles.listHeroBannerPadding}>
            <div className={styles.listHeroSkeletonFrame}>
              <div className={styles.listHeroSkeletonMedia} aria-hidden />
              <div className={styles.listHeroSkeletonContent}>
                <div className={styles.listHeroSkeletonTitleLine} />
                <div className={styles.listHeroSkeletonTitleLineShort} />
                <div className={styles.listHeroSkeletonParaBlock}>
                  <div className={styles.listHeroSkeletonParaLine} />
                  <div className={styles.listHeroSkeletonParaLineShort} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : showHero && listBannerImage && listBannerImageUrl ? (
        <section data-aos="fade-up" className={styles.listHeroSection} aria-label='Collection banner'>
          <div className={styles.listHeroBannerPadding}>
            <div className={styles.listHeroFrame}>
              <div className={styles.listHeroOverlay} aria-hidden />
              <OptimizedImage
                src={listBannerImageUrl}
                alt={listBannerImage.alt || 'Collection'}
                title={listBannerImage.name || listBannerImage.file_name}
                className={styles.listHeroImage}
                fill
                sizes={IMAGE_SIZES.hero}
                priority
                loading='eager'
              />
              <div className={styles.listHeroContent}>
                {shortDesc ? (
                  <h1 className={`${styles.listHeroTitle} performa-light`} dangerouslySetInnerHTML={{ __html: shortDesc }} />
                ) : (
                  <h1 className={styles.srOnly}>{collectionTitle}</h1>
                )}
                {longDesc ? <p className={`${styles.listHeroPara} redhat-regular`} dangerouslySetInnerHTML={{ __html: longDesc }} /> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section data-aos="fade-up" data-aos-delay="100" className={`${styles.wrap} ${useBelowHeroSpacing ? styles.wrapBelowHero : styles.wrapNoBanner}`}>
        <div className={styles.inner}>
          {loading ? (
            <>
              <h1 className={styles.srOnly}>{collectionTitle}</h1>
              <div className={styles.headingSkeleton} aria-hidden />
            </>
          ) : showHero ? (
            <h2 data-aos="fade-up" className={styles.heading}>{collectionTitle}</h2>
          ) : (
            <h1 data-aos="fade-up" className={styles.heading}>{collectionTitle}</h1>
          )}

          {loading || totalItems > 0 ? (
            <div className={styles.topRow}>
              {loading ? (
                <h3 className={styles.results} aria-busy='true' aria-label='Loading results'>
                  <span className={styles.resultsSkeleton} />
                </h3>
              ) : (
                <h3 className={styles.results}>
                  Showing {(activePage - 1) * PAGE_LIMIT + 1} to {Math.min(activePage * PAGE_LIMIT, totalItems)} of {totalItems} Vehicles
                </h3>
              )}

              <div ref={sortRef} className={styles.sortWrap}>
                <button
                  type='button'
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  className={styles.sortBtn}
                  disabled={loading}
                  aria-expanded={isSortOpen}
                >
                  {sort === 'H-L' ? 'Price: High to Low' : sort === 'L-H' ? 'Price: Low to High' : 'Sort by'}
                  <ChevronDown className={`${styles.sortChevron} ${isSortOpen ? styles.rotate : ''}`} />
                </button>
                <div className={`${styles.sortMenu} ${isSortOpen ? styles.sortMenuOpen : ''}`}>
                  <button
                    type='button'
                    className={`${styles.sortOption} ${sort === 'H-L' ? styles.sortActive : ''}`}
                    onClick={() => { setSort('H-L'); setIsSortOpen(false) }}
                  >
                    Price: High to Low
                  </button>
                  <button
                    type='button'
                    className={`${styles.sortOption} ${sort === 'L-H' ? styles.sortActive : ''}`}
                    onClick={() => { setSort('L-H'); setIsSortOpen(false) }}
                  >
                    Price: Low to High
                  </button>
                  <button
                    type='button'
                    className={`${styles.sortOption} ${sort === '' ? styles.sortActive : ''}`}
                    onClick={() => { setSort(''); setIsSortOpen(false) }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && carItems.length === 0 ? (
            <p className={styles.empty}>Coming soon...</p>
          ) : (
            <div className={styles.gridShell}>
              {loading ? (
                <div className={styles.grid} aria-busy='true' aria-label='Loading vehicles'>
                  {Array.from({ length: PAGE_LIMIT }, (_, i) => (
                    <div key={`sk-api-${i}`} className={styles.cell}>
                      <div className={styles.cardSkeleton}>
                        <div className={styles.skeletonThumb} />
                        <div className={styles.skeletonBody}>
                          <div className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} />
                          <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
                          <div className={styles.skeletonSpecs}>
                            <div className={styles.skeletonPill} />
                            <div className={styles.skeletonPill} />
                            <div className={styles.skeletonPill} />
                          </div>
                        </div>
                        <div className={styles.skeletonFooter}>
                          <div className={styles.skeletonPrice} />
                          <div className={styles.skeletonActions} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className={`${styles.grid} ${!mediaSettled ? styles.gridFaded : ''}`.trim()}>
                    {carItems.map((car) => (
                      <div key={car.id || car.url_key} className={styles.cell}>
                        <CarCard car={car} variant='list' onMediaLoad={onVehicleImageDone} />
                      </div>
                    ))}
                  </div>
                  {!mediaSettled ? (
                    <div className={styles.skeletonOverlay} aria-busy='true' aria-label='Loading vehicle images'>
                      <div className={styles.grid}>
                        {Array.from({ length: carItems.length }, (_, i) => (
                          <div key={`sk-img-${i}`} className={styles.cell}>
                            <div className={styles.cardSkeleton}>
                              <div className={styles.skeletonThumb} />
                              <div className={styles.skeletonBody}>
                                <div className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} />
                                <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
                                <div className={styles.skeletonSpecs}>
                                  <div className={styles.skeletonPill} />
                                  <div className={styles.skeletonPill} />
                                  <div className={styles.skeletonPill} />
                                </div>
                              </div>
                              <div className={styles.skeletonFooter}>
                                <div className={styles.skeletonPrice} />
                                <div className={styles.skeletonActions} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {totalPages > 1 ? (
            <nav aria-label='Page navigation' className={styles.paginationNav}>
              <ul className={styles.pagination}>
                <li className={activePage === 1 ? styles.disabled : ''}>
                  <button
                    type='button'
                    aria-label='Previous Page'
                    className={`${styles.circleBtn} ${styles.filled}`}
                    disabled={activePage === 1}
                    onClick={() => { setCurrentPage(activePage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  >
                    ‹
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <li key={`page-${page}`}>
                    <button
                      type='button'
                      aria-label={`Page ${page}`}
                      className={`${styles.numberBtn} ${page === activePage ? styles.activePage : ''}`}
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={activePage === totalPages ? styles.disabled : ''}>
                  <button
                    type='button'
                    aria-label='Next Page'
                    className={`${styles.circleBtn} ${styles.filled}`}
                    disabled={activePage === totalPages}
                    onClick={() => { setCurrentPage(activePage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  >
                    ›
                  </button>
                </li>
              </ul>
            </nav>
          ) : null}

          {carTypes.length > 0 ? <CarTypes items={carTypes} heading='Browse by Car Type' activeUrlKey={urlKey} /> : null}
        </div>
      </section>
    </>
  )
}
