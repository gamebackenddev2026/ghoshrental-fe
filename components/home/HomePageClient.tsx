'use client'

import { useEffect, useState } from 'react'
import { Hero } from './Hero'
import {
  AboutUs,
  BrandsMarquee,
  CarCollection,
  CarTypes,
  Faq,
  FollowOurJourney,
  GoogleReviews,
  OurPartners,
  Services,
  TrendingCars,
  VipNumberPlate,
  YachtCollection
} from './HomeSections'
import { RecentBlogSection } from '@/components/blog/RecentBlogSection'
import { PromotionalPopupGate } from '@/components/promo/PromotionalPopupGate'
import { toCarType, toHomeBanner, type ActivePromo, type HeroBanner } from '@/lib/api/adapters'
import type { BlogListItem } from '@/lib/api/blogAdapters'
import { loadRecentBlogs } from '@/lib/api/blogPage'
import { getAllBanner, getCarTypes } from '@/lib/api/home'
import type { CarType } from '@/components/home/mockData'
import { loadHomePageData, type HomePageData } from '@/lib/api/homePage'
import { getClientAuthToken } from '@/lib/authToken'
import type { HomePageCms } from '@/lib/api/cmsAdapters'
import { useHomeCms } from '@/lib/api/useCmsPage'
import { faqs } from '@/components/home/mockData'
import styles from './homeSections.module.css'

/**
 * 1:1 browser-side port of Angular's HomeComponent.ngOnInit:
 * all home-page endpoints fire in parallel on mount. Each `apiPost` calls
 * `${API_ORIGIN}/api/...` (from `NEXT_PUBLIC_API_BASE_URL` in `.env` / `.env.local`).
 *
 * The section components (CarCollection, BrandsMarquee, …) are already
 * defensive against `undefined` / empty slices, so the initial render
 * is identical to Angular's pre-fetch state.
 */
export function HomePageClient({
  initialBanner = null,
  initialCarTypes = [],
  initialPromo = null,
  initialCms
}: {
  initialBanner?: HeroBanner | null
  initialCarTypes?: CarType[]
  initialPromo?: ActivePromo | null
  initialCms?: HomePageCms
} = {}) {
  const cms = useHomeCms(initialCms)
  const [data, setData] = useState<HomePageData | null>(null)
  const [recentBlogs, setRecentBlogs] = useState<BlogListItem[] | null>(null)
  const [banner, setBanner] = useState<HeroBanner | null>(initialBanner ?? null)
  const [carTypes, setCarTypes] = useState<CarType[]>(initialCarTypes)

  // Banner loads immediately (hero LCP) — do not defer behind requestIdleCallback.
  useEffect(() => {
    let cancelled = false
    void getAllBanner({})
      .then((res) => {
        if (cancelled || res.code !== 200 || !Array.isArray(res.result)) return
        const next = toHomeBanner(res.result)
        if (next) setBanner(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Car types — load immediately so images use API `s3_url`, not mock `/public/cartype/`.
  useEffect(() => {
    let cancelled = false
    void getCarTypes({})
      .then((res) => {
        if (cancelled || res.code !== 200 || !Array.isArray(res.result)) return
        const next = res.result.map(toCarType).filter((c): c is CarType => c !== null)
        if (next.length) setCarTypes(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = () => {
      Promise.all([loadHomePageData(getClientAuthToken()), loadRecentBlogs(3)])
        .then(([result, blogs]) => {
          if (cancelled) return
          setData(result)
          setRecentBlogs(blogs)
          if (result.banner) setBanner(result.banner)
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.info('[home] API sources', result.sources)
          }
        })
        .catch((error) => {
          if (cancelled) return
          // eslint-disable-next-line no-console
          console.error('[home] loadHomePageData failed', error)
          setRecentBlogs([])
        })
    }

    // Let hero video / LCP assets start first — API fan-out competes for bandwidth.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2800 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }

    const timer = window.setTimeout(run, 900)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <PromotionalPopupGate initialPromo={initialPromo} />
      <Hero banner={banner} />
      <CarCollection items={data === null ? undefined : data.carCollection} />
      <YachtCollection items={data === null ? undefined : data.yachtCollection} />
      <CarTypes items={data?.carTypes?.length ? data.carTypes : carTypes} />
      <BrandsMarquee items={data?.brands} />
      <Services content={cms.services} />
      <VipNumberPlate
        className={styles.vipNumberPlateBeforePartners}
        content={{
          title: cms.vip.title,
          subtitle: cms.vip.subtitle,
          description: cms.vip.description,
          buttonText: cms.vip.buttonText,
          image: cms.vip.image
        }}
      />
      <OurPartners items={data === null ? undefined : data.partners} />
      <AboutUs
        features={cms.features.items}
        aboutContent={cms.about}
        featuresTitle={cms.features.title}
        className={styles.aboutSectionAfterPartners}
      />
      <TrendingCars items={data === null ? undefined : data.trendingCars} />
      <GoogleReviews reviews={data?.googleReviews} />
      <FollowOurJourney
        socialPosts={data === null ? undefined : data.socialPosts}
        youtubeChannelStats={data === null ? undefined : data.youtubeChannelStats}
        instagramProfileStats={data === null ? undefined : data.instagramProfileStats}
      />
      {recentBlogs && recentBlogs.length > 0 ? <RecentBlogSection blogs={recentBlogs} /> : null}
      <Faq
        content={{
          title: cms.faq.title,
          subtitle: cms.faq.subtitle,
          buttonText: cms.faq.buttonText,
          items: cms.faq.items.length ? cms.faq.items : faqs
        }}
      />
    </>
  )
}
