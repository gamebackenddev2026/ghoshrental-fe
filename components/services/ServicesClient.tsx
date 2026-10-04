'use client'

import { useEffect, useMemo } from 'react'
import { scrollToPageTop } from '@/components/layout/ScrollToTop'
import Link from 'next/link'
import { Faq, VipNumberPlate } from '@/components/home/HomeSections'
import homeSectionStyles from '@/components/home/homeSections.module.css'
import { faqs } from '@/components/home/mockData'
import type { HeroBanner } from '@/lib/api/adapters'
import type { ServicesPageCms } from '@/lib/api/cmsAdapters'
import { useServicesCms } from '@/lib/api/useCmsPage'
import { resolveCmsBannerVideoSources, toAssetUrl } from '@/lib/config'
import { CmsBannerVideo } from '@/components/shared/CmsBannerVideo'
import { CmsRichText } from '@/components/shared/CmsRichText'
import { CmsImage } from '@/components/shared/CmsImage'
import styles from './servicesPage.module.css'
const WA_PHONE = '97180044678'

const CHAUFFEUR_WA = `Hello Ghost Rentals!

I'm interested in booking your Chauffeur Services

Could you please help me with:
 - Is the pricing based on the number of hours or the kilometers driven?
 - What's included in the services?
 - Cars available for my dates?

Thank you!`

function buildWaUrl(): string {
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(CHAUFFEUR_WA)}`
}

function bannerSource(banner: HeroBanner | null): {
  isVideo: boolean
  imageSrc: string
  primaryVideo: string
  fallbackVideo: string
} | null {
  if (!banner?.media_url) return null
  const isVideo = banner.file_type === 'video'
  const { primaryVideo, fallbackVideo } = resolveCmsBannerVideoSources(banner)
  return {
    isVideo,
    imageSrc: banner.media_url,
    primaryVideo,
    fallbackVideo,
  }
}

export function ServicesClient({
  initialCms,
  initialHeroBanner,
}: {
  initialCms?: ServicesPageCms
  initialHeroBanner: HeroBanner | null
}) {
  const cms = useServicesCms(initialCms)
  const heroBanner = initialHeroBanner
  const media = useMemo(() => bannerSource(heroBanner), [heroBanner])
  const faqItems = cms.faq.items.length ? cms.faq.items : faqs

  useEffect(() => {
    scrollToPageTop()
  }, [])

  const heroPoster = toAssetUrl('loader-video/luxury-car-and-yacht-services.webp')
  const fallbackStaticImg = toAssetUrl('services/car-rental-services-in-dubai-banner.webp')

  return (
    <div className={`${styles.page} ${styles.servicesPage}`}>
      <section className={styles.hero} aria-label='Our services'>
        <div className={styles.heroInner}>
          {media ? (
            media.isVideo ? (
              <CmsBannerVideo
                className={styles.heroMedia}
                primarySrc={media.primaryVideo}
                fallbackSrc={media.fallbackVideo}
                poster={heroPoster}
                ariaLabel='Ghost Rentals services banner video'
                preload='metadata'
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.heroMedia}
                src={media.imageSrc}
                alt={heroBanner?.alt || 'Car rental services in Dubai'}
                loading='eager'
                fetchPriority='high'
                decoding='async'
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackStaticImg) {
                    e.currentTarget.src = fallbackStaticImg
                  }
                }}
              />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.heroMedia}
              src={fallbackStaticImg}
              alt='Car rental services in Dubai'
              loading='eager'
              fetchPriority='high'
              decoding='async'
            />
          )}
          <div className={styles.heroOverlay} aria-hidden />
          <div className={styles.heroContent}>
            <h1 data-aos="fade-up" className={styles.heroTitle}>{cms.hero.title}</h1>
            <CmsRichText data-aos="fade-up" data-aos-delay="100" as="p" value={cms.hero.subtitle} className={styles.heroSub} />
          </div>
        </div>
      </section>

      <section className={styles.intro} aria-label='About our services'>
        <p data-aos="fade-up" className={`${styles.introEyebrow}`}>{cms.intro.eyebrow}</p>
        <h2 data-aos="fade-up" className={`${styles.introText}`}>
          {cms.intro.title}
        </h2>
        <CmsRichText data-aos="fade-up" as="p" value={cms.intro.subtitle} className={`${styles.introSub}`} />
      </section>

      <section className={`${styles.serviceSection} ${styles.serviceRowBlack}`} id='car-service'>
        <div className={`${styles.serviceRow} ${styles.serviceRowBlack} ${styles.serviceRowRev}`}>
          <div className={styles.serviceText}>
            <p data-aos="fade-up" className={`${styles.eyebrow}`}>{cms.car.eyebrow}</p>
            <h2 data-aos="fade-up" className={`${styles.heading2}`}>{cms.car.title}</h2>
            <h3 data-aos="fade-up" className={`${styles.heading3}`}>{cms.car.subtitle}</h3>
            <CmsRichText data-aos="fade-up" as="p" value={cms.car.body} className={`${styles.body}`} />
            <ul data-aos="fade-up" className={`${styles.list}`}>
              {cms.car.bullets.map((bullet) => (
                <li key={bullet}>
                  - <CmsRichText as="span" value={bullet} />
                </li>
              ))}
            </ul>
            <Link data-aos="fade-up" href='/product/search?type=Car' className={`${styles.btn} ${styles.btnLight}`} data-text={cms.car.buttonText}>
              <span>{cms.car.buttonText}</span>
            </Link>
          </div>
          <figure data-aos="fade-up" className={`${styles.serviceFigure}`}>
            <CmsImage
              className={styles.serviceImg}
              src={cms.car.image}
              fallbackAsset='services/luxury-car-rental-services-in-dubai.webp'
              alt='Luxury car rental services in Dubai by Ghost Rentals'
              loading='lazy'
              decoding='async'
            />
          </figure>
        </div>
      </section>

      <section className={`${styles.serviceSection} ${styles.serviceRowWhite}`} id='yacht-service'>
        <div className={`${styles.serviceRow} ${styles.serviceRowWhite}`}>
          <figure data-aos="fade-up" className={`${styles.serviceFigure}`}>
            <CmsImage
              className={styles.serviceImg}
              src={cms.yacht.image}
              fallbackAsset='services/yacht-rental-services-in-dubai.webp'
              alt='Luxury Yacht Rentals in Dubai by Ghost Rentals'
              loading='lazy'
              decoding='async'
            />
          </figure>
          <div className={styles.serviceText}>
            <p data-aos="fade-up" className={`${styles.eyebrow}`}>{cms.yacht.eyebrow}</p>
            <h2 data-aos="fade-up" className={`${styles.heading2}`}>{cms.yacht.title}</h2>
            <h3 data-aos="fade-up" className={`${styles.heading3}`}>
              {cms.yacht.subtitle}
            </h3>
            <CmsRichText data-aos="fade-up" as="p" value={cms.yacht.body} className={`${styles.body}`} />
            <ul data-aos="fade-up" className={`${styles.list}`}>
              {cms.yacht.bullets.map((bullet) => (
                <li key={bullet}>
                  - <CmsRichText as="span" value={bullet} />
                </li>
              ))}
            </ul>
            <Link data-aos="fade-up" href='/product/search?type=Yachts' className={`${styles.btn}`} data-text={cms.yacht.buttonText}>
              <span>{cms.yacht.buttonText}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.serviceSection} ${styles.serviceRowBlack}`} id='chauffeur-service'>
        <div className={`${styles.serviceRow} ${styles.serviceRowBlack} ${styles.serviceRowRev}`}>
          <div className={styles.serviceText}>
            <p data-aos="fade-up" className={`${styles.eyebrow}`}>{cms.chauffeur.eyebrow}</p>
            <h2 data-aos="fade-up" className={`${styles.heading2}`}>{cms.chauffeur.title}</h2>
            <h3 data-aos="fade-up" className={`${styles.heading3}`}>
              {cms.chauffeur.subtitle}
            </h3>
            <CmsRichText data-aos="fade-up" as="p" value={cms.chauffeur.body} className={`${styles.body}`} />
            <ul data-aos="fade-up" className={`${styles.list}`}>
              {cms.chauffeur.bullets.map((bullet) => (
                <li key={bullet}>
                  - <CmsRichText as="span" value={bullet} />
                </li>
              ))}
            </ul>
            <a
              data-aos="fade-up"
              href={buildWaUrl()}
              className={`${styles.btn} ${styles.btnLight}`}
              data-text={cms.chauffeur.buttonText}
              target='_blank'
              rel='noreferrer'
            >
              <span>{cms.chauffeur.buttonText}</span>
            </a>
          </div>
          <figure data-aos="fade-up" className={`${styles.serviceFigure}`}>
            <CmsImage
              className={styles.serviceImg}
              src={cms.chauffeur.image}
              fallbackAsset='services/chauffeur-services-in-dubai-ghost-rentals.webp'
              alt='Luxury chauffeur services across Dubai'
              loading='lazy'
              decoding='async'
            />
          </figure>
        </div>
      </section>

      <VipNumberPlate
        className={homeSectionStyles.vipNumberPlateTightBelow}
        content={{
          title: cms.vip.title,
          subtitle: cms.vip.subtitle,
          description: cms.vip.description,
          buttonText: cms.vip.buttonText,
          image: cms.vip.image,
        }}
      />
      <Faq
        className={homeSectionStyles.faqSectionTightTop}
        content={{
          title: cms.faq.title,
          subtitle: cms.faq.subtitle,
          buttonText: cms.faq.buttonText,
          items: faqItems,
        }}
      />
    </div>
  )
}
