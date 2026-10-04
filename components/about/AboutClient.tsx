'use client'

import Link from 'next/link'
import { BrandsMarquee, Faq, VipNumberPlate } from '@/components/home/HomeSections'
import type { BrandItem } from '@/components/home/mockData'
import { faqs } from '@/components/home/mockData'
import homeSectionStyles from '@/components/home/homeSections.module.css'
import type { AboutPageCms } from '@/lib/api/cmsAdapters'
import { useAboutCms } from '@/lib/api/useCmsPage'
import type { HeroBanner } from '@/lib/api/adapters'
import { resolveCmsBannerVideoSources, toAssetUrl } from '@/lib/config'
import { CmsBannerVideo } from '@/components/shared/CmsBannerVideo'
import { CmsRichText } from '@/components/shared/CmsRichText'
import { CmsImage } from '@/components/shared/CmsImage'
import { displayFeatureIconSrc } from '@/lib/cms/cmsMedia'
import styles from './aboutPage.module.css'

const FEATURE_ICON_FALLBACKS = [
  'images/icons/hire-luxury-cars-from-ghost-rentals-dubai.webp',
  'images/icons/trusted-car-rental-services-from-ghost-rentals.webp',
  'images/icons/247-black.svg',
  'images/icons/map-black.svg'
] as const

const CHAUFFEUR_WA_HREF = `https://wa.me/97180044678?text=${encodeURIComponent(
  `Hello Ghost Rentals!\n\nI'm interested in booking your Chauffeur Services\n\nCould you please help me with:\n - Is the pricing based on the number of hours or the kilometers driven?\n - What's included in the services?\n - Cars available for my dates?\n\nThank you!`
)}`

function bannerSource(banner: HeroBanner | null): {
  isVideo: boolean
  imageSrc: string
  primaryVideo: string
  fallbackVideo: string
} | null {
  if (!banner?.media_url) return null
  const isVideo = String(banner.file_type).toLowerCase() === 'video'
  const { primaryVideo, fallbackVideo } = resolveCmsBannerVideoSources(banner)
  return {
    isVideo,
    imageSrc: banner.media_url,
    primaryVideo,
    fallbackVideo
  }
}

export function AboutClient({
  initialCms,
  initialHeroBanner,
  brands
}: {
  initialCms?: AboutPageCms
  initialHeroBanner: HeroBanner | null
  brands: BrandItem[]
}) {
  const cms = useAboutCms(initialCms)
  const media = bannerSource(initialHeroBanner)
  const [carService, yachtService, chauffeurService] = cms.signature.services

  const fallbackImg = toAssetUrl('home/about-us-ghost-rentals-dubai.webp')
  const storyImg1 = cms.journey.image
  const storyImg2 = cms.journey.image
  const signatureBg = cms.signature.image

  const faqItems = cms.faq.items.length ? cms.faq.items : faqs

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label='About Ghost Rentals'>
        <div className={styles.heroInner}>
          {media ? (
            media.isVideo ? (
              <CmsBannerVideo
                className={styles.heroMedia}
                primarySrc={media.primaryVideo}
                fallbackSrc={media.fallbackVideo}
                poster={fallbackImg}
                ariaLabel='Ghost Rentals about banner video'
                preload='auto'
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.heroMedia}
                src={media.imageSrc}
                alt={initialHeroBanner?.alt || 'Ghost Rentals Dubai'}
                loading='eager'
                fetchPriority='high'
                decoding='async'
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackImg) e.currentTarget.src = fallbackImg
                }}
              />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.heroMedia}
              src={fallbackImg}
              alt='Ghost Rentals Dubai'
              loading='eager'
              fetchPriority='high'
              decoding='async'
            />
          )}

          <div className={styles.heroOverlay} aria-hidden />

          <div className={styles.heroContent}>
            <h1 data-aos='fade-up' className={`${styles.heroTitle} performa-light`}>
              {cms.hero.title}
            </h1>
            <CmsRichText
              data-aos='fade-up'
              data-aos-delay='100'
              as='p'
              value={cms.hero.description}
              className={`${styles.heroSub} redhat-regular`}
            />
          </div>
        </div>
      </section>

      <section className={styles.brands} aria-label='Top car rental brands'>
        <h2 data-aos='fade-up' className={`${styles.brandsHeading}`}>
          {cms.brands.title}
        </h2>
        <div data-aos='fade-up' className={`${styles.brandsInner}`}>
          <BrandsMarquee items={brands} title={null} />
        </div>
      </section>

      <section className={styles.journey} aria-label='Our journey'>
        <div className={styles.journeyInner}>
          <div className={styles.journeyGrid}>
            <div className={styles.journeyText}>
              <h2 data-aos='fade-up' className={`${styles.eyebrow}`}>
                {cms.journey.eyebrow}
              </h2>
              <h3 data-aos='fade-up' className={`${styles.journeyHeading}`}>
                {cms.journey.title}
              </h3>
              {cms.journey.paragraphs.map((paragraph) => (
                <CmsRichText
                  key={paragraph.slice(0, 48)}
                  data-aos='fade-up'
                  as='p'
                  value={paragraph}
                  className={`${styles.body}`}
                />
              ))}
            </div>

            <div data-aos='fade-up' className={`${styles.journeyMedia}`}>
              <CmsImage
                className={`${styles.journeyImg} ${styles.journeyImgDesktop}`}
                src={storyImg1}
                fallbackAsset='about/luxury-car-hire-in-dubai-ghost-rentals.webp'
                alt='Mercedes-Benz S class'
                title='Rent Mercedes-Benz S-Class in Dubai'
                width={1072}
                height={575}
                loading='eager'
              />
              <CmsImage
                className={`${styles.journeyImg} ${styles.journeyImgMobile}`}
                src={storyImg2}
                fallbackAsset='about/ghost-rentals-cars-on-rent-dubai.webp'
                alt='Mercedes-Benz S class'
                title='Rent Mercedes-Benz S-Class in Dubai'
                loading='eager'
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.difference} aria-label='Experience the difference'>
        <div className={styles.differenceInner}>
          <h2 data-aos='fade-up' className={`${styles.sectionTitle}`}>
            {cms.features.title}
          </h2>

          <div className={styles.diffGrid}>
            {cms.features.items.map((feature, index) => (
              <div key={feature.title} data-aos='fade-up' className={`${styles.diffCard}`}>
                <span className={styles.diffIcon} aria-hidden>
                  <CmsImage
                    src={displayFeatureIconSrc(
                      feature.image,
                      FEATURE_ICON_FALLBACKS[index] ?? FEATURE_ICON_FALLBACKS[0],
                      'light'
                    )}
                    fallbackAsset={FEATURE_ICON_FALLBACKS[index] ?? FEATURE_ICON_FALLBACKS[0]}
                    alt={feature.alt}
                  />
                </span>
                <h3 className={styles.diffTitle}>{feature.title}</h3>
                <CmsRichText as='p' value={feature.description} className={styles.diffText} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.signature} aria-label='Our signature services'>
        <div className={styles.signatureInner}>
          <div className={styles.signaturePanel} style={{ backgroundImage: `url(${signatureBg})` }}>
            <div className={styles.signatureBg} aria-hidden />

            <div className={styles.signatureGrid}>
              <div className={styles.signatureMain}>
                <div className={styles.signatureTopBand}>
                  <div data-aos='fade-up' className={`${styles.signatureTitleCell}`}>
                    <h2 className={`${styles.sigH1} performa-light text-capitalize white-color`}>{cms.signature.title}</h2>
                    <CmsRichText
                      as='p'
                      value={cms.signature.intro}
                      className={`${styles.sigBody} ${styles.sigIntroMobile} redhat-regular white-color line-height30`}
                    />
                  </div>
                  <div data-aos='fade-up' className={`${styles.signatureIntroCell}`}>
                    <CmsRichText
                      as='p'
                      value={cms.signature.intro}
                      className={`${styles.sigBody} redhat-regular white-color line-height30`}
                    />
                  </div>
                  {chauffeurService ? (
                    <div data-aos='fade-up' className={`${styles.signatureChauffeurMobile}`}>
                      <h3 className={`${styles.sigH2Stack} performa-light text-capitalize white-color`}>{chauffeurService.title}</h3>
                      <CmsRichText
                        as='p'
                        value={chauffeurService.description}
                        className={`${styles.sigBody} redhat-regular white-color line-height30 ${styles.sigStackBeforeBtn}`}
                      />
                      <a
                        className='white-button size18 redhat-bold text-decoration-none'
                        data-text={chauffeurService.buttonText}
                        href={CHAUFFEUR_WA_HREF}
                        target='_blank'
                        rel='noreferrer'
                      >
                        <span>{chauffeurService.buttonText}</span>
                      </a>
                    </div>
                  ) : null}
                </div>

                <div className={styles.signatureBottomBand}>
                  {carService ? (
                    <div data-aos='fade-up' className={`${styles.signatureCarCell}`}>
                      <div className={styles.sigColInner}>
                        <h3 className={`${styles.sigServiceTitle} redhat-semibold white-color text-capitalize`}>{carService.title}</h3>
                        <CmsRichText
                          as='p'
                          value={carService.description}
                          className={`${styles.sigBody} redhat-regular white-color line-height30 ${styles.sigColGrow}`}
                        />
                        <Link
                          className='white-button size18 redhat-bold text-decoration-none'
                          data-text={carService.buttonText}
                          href='/product/search?type=Car'
                        >
                          <span>{carService.buttonText}</span>
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {yachtService ? (
                    <div data-aos='fade-up' className={`${styles.signatureYachtCell}`}>
                      <div className={styles.sigColInner}>
                        <h3 className={`${styles.sigServiceTitle} redhat-semibold white-color text-capitalize`}>{yachtService.title}</h3>
                        <CmsRichText
                          as='p'
                          value={yachtService.description}
                          className={`${styles.sigBody} redhat-regular white-color line-height30 ${styles.sigColGrow}`}
                        />
                        <Link
                          className='white-button size18 redhat-bold text-decoration-none'
                          data-text={yachtService.buttonText}
                          href='/product/search?type=Yachts'
                        >
                          <span>{yachtService.buttonText}</span>
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {chauffeurService ? (
                <aside data-aos='fade-up' className={`${styles.signatureAside}`} aria-label='Luxury chauffeur services'>
                  <div className={styles.signatureAsideBody}>
                    <h3 className={`${styles.sigAsideTitle} performa-light text-capitalize white-color`}>{chauffeurService.title}</h3>
                    <CmsRichText
                      as='p'
                      value={chauffeurService.description}
                      className={`${styles.sigBody} redhat-regular white-color line-height30`}
                    />
                  </div>
                  <div className={styles.signatureAsideCta}>
                    <a
                      className='white-button size18 redhat-bold text-decoration-none gray-color'
                      data-text={chauffeurService.buttonText}
                      href={CHAUFFEUR_WA_HREF}
                      target='_blank'
                      rel='noreferrer'
                    >
                      <span>{chauffeurService.buttonText}</span>
                    </a>
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.vipWrap}>
        <VipNumberPlate
          className={homeSectionStyles.vipNumberPlateTightBelow}
          content={{
            title: cms.vip.title,
            subtitle: cms.vip.subtitle,
            description: cms.vip.description,
            buttonText: cms.vip.buttonText,
            image: cms.vip.image
          }}
        />
      </div>
      <Faq
        className={homeSectionStyles.faqSectionTightTop}
        content={{
          title: cms.faq.title,
          subtitle: cms.faq.subtitle,
          buttonText: cms.faq.buttonText,
          items: faqItems
        }}
      />
    </div>
  )
}
